import { DurableObject, type DurableObjectState } from "cloudflare:workers";

interface SessionData {
    connectionType: "primary" | "external";
    connectionId: string;
}

class AuthorizationSession extends DurableObject {
    private authorizationCode: string | null = null;
    private externalDeviceConnected = false;

    constructor(state: DurableObjectState, env: any) {
        super(state, env);

        this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));

        this.ctx.getWebSockets().forEach((ws) => {
            const data = ws.deserializeAttachment() as SessionData | undefined;
            if (data?.connectionType === "external") {
                this.externalDeviceConnected = true;
            }
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        if (request.headers.get("upgrade") === "websocket") {
            const [client, server] = Object.values(new WebSocketPair());

            const connectionType = path.includes("/external") ? "external" : "primary";
            const connectionId = crypto.randomUUID();

            const sessionData: SessionData = {
                connectionType,
                connectionId,
            };

            this.ctx.acceptWebSocket(server, undefined, sessionData);

            if (connectionType === "external") {
                this.externalDeviceConnected = true;
                this.broadcast({ type: "external_connected" }, connectionId);
                server.send(JSON.stringify({ type: "connected" }));
            } else {
                server.send(
                    JSON.stringify({
                        type: "status",
                        externalDeviceConnected: this.externalDeviceConnected,
                        hasCode: !!this.authorizationCode,
                    }),
                );
            }

            return new Response(null, {
                status: 101,
                webSocket: client,
            });
        }

        return new Response("Expected WebSocket", { status: 400 });
    }

    async webSocketMessage(ws: WebSocket, message: string) {
        const data = ws.deserializeAttachment() as SessionData;

        try {
            const msg = JSON.parse(message);

            switch (msg.type) {
                case "code_generated":
                    if (data.connectionType === "external") {
                        this.authorizationCode = msg.code;
                        this.broadcast(
                            {
                                type: "code_received",
                                code: msg.code,
                                state: msg.state,
                                redirect_uri: msg.redirect_uri,
                            },
                            data.connectionId,
                        );
                    }
                    break;
            }
        } catch (error) {
            console.error("Error handling message:", error);
        }
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean) {
        const data = ws.deserializeAttachment() as SessionData;

        if (data.connectionType === "external") {
            this.externalDeviceConnected = false;
            this.broadcast({ type: "external_disconnected" }, data.connectionId);
        }

        ws.close(code, reason);
    }

    async webSocketError(ws: WebSocket, error: any) {
        console.error("WebSocket error:", error);
        ws.close(1011, "Internal server error");
    }

    private broadcast(message: any, excludeId?: string) {
        const messageStr = JSON.stringify(message);
        const sockets = this.ctx.getWebSockets();

        for (const ws of sockets) {
            const data = ws.deserializeAttachment() as SessionData;
            if (data.connectionId !== excludeId) {
                try {
                    ws.send(messageStr);
                } catch (error) {
                    console.error("Error sending to connection:", data.connectionId, error);
                }
            }
        }
    }
}

export default AuthorizationSession;
