import { DurableObject } from "cloudflare:workers";
import Logger from "js-logger";
import { setupLogger } from "../lib/logger";

interface SessionData {
    connectionType: "primary" | "external";
    connectionId: string;
}

class AuthorizationSession extends DurableObject<Env> {
    private authorizationCode: string | null = null;
    private externalDeviceConnected = false;
    private primaryDeviceConnected = false;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        setupLogger(env);
        Logger.debug("AuthorizationSession created");

        this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));

        // access websocket clients that are still connected (although potentially this object has hibernated)
        this.ctx.getWebSockets().forEach((ws) => {
            const data = ws.deserializeAttachment();
            if (isSessionData(data)) {
                if (data.connectionType === "external") {
                    this.externalDeviceConnected = true;
                }
                if (data.connectionType === "primary") {
                    this.primaryDeviceConnected = true;
                }
            }
        });
    }

    async fetch(request: Request) {
        const url = new URL(request.url);
        const path = url.pathname;

        if (request.headers.get("upgrade") === "websocket") {
            // Creates two ends of a WebSocket connection.
            const webSocketPair = new WebSocketPair();
            const [client, server] = Object.values(webSocketPair);

            // Calling `acceptWebSocket()` connects the WebSocket to the Durable Object, allowing the WebSocket to send and receive messages.
            // Unlike `ws.accept()`, `state.acceptWebSocket(ws)` allows the Durable Object to be hibernated
            // When the Durable Object receives a message during Hibernation, it will run the `constructor` to be re-initialized
            this.ctx.acceptWebSocket(server);

            const connectionType = path.includes("/external") ? "external" : "primary";
            const connectionId = crypto.randomUUID();

            const sessionData: SessionData = {
                connectionType,
                connectionId,
            };
            Logger.debug("Setting sessionData on socket", sessionData);
            server.serializeAttachment(sessionData);

            if (connectionType === "external") {
                this.externalDeviceConnected = true;
                this.broadcast({ type: "external_connected" }, connectionId);
            }
            if (connectionType === "primary") {
                this.primaryDeviceConnected = true;
                this.broadcast({ type: "primary_connected" }, connectionId);
            }
            server.send(
                JSON.stringify({
                    type: "status",
                    externalDeviceConnected: this.externalDeviceConnected,
                    primaryDeviceConnected: this.primaryDeviceConnected,
                    hasCode: !!this.authorizationCode,
                }),
            );

            return new Response(null, {
                status: 101,
                webSocket: client,
            });
        }

        return new Response("Expected WebSocket", { status: 400 });
    }

    async webSocketMessage(ws: WebSocket, message: string) {
        const data = ws.deserializeAttachment();
        if (!data) return;
        if (!isSessionData(data)) {
            Logger.warn("data is not session data in webSocketMessage", data);
            return;
        }

        Logger.debug(`${data.connectionType} device sent message`, message);
        try {
            const msg = JSON.parse(message);

            switch (msg.type) {
                case "request_params":
                    // External device requesting OIDC params - broadcast to primary device
                    if (data.connectionType === "external") {
                        Logger.debug("External device requesting OIDC params");
                        this.broadcastToPrimary({ type: "request_params" });
                    }
                    break;

                case "params_response":
                    // Primary device responding with OIDC params - send to external device
                    if (data.connectionType === "primary") {
                        Logger.debug("Primary device sending OIDC params", msg.params);
                        this.broadcastToExternal({
                            type: "params_response",
                            params: msg.params,
                        });
                    }
                    break;

                case "code_generated":
                    // External device sending auth code - broadcast to primary
                    if (data.connectionType === "external") {
                        this.authorizationCode = msg.code;
                        this.broadcastToPrimary({
                            type: "code_received",
                            code: msg.code,
                        });
                    }
                    break;

                default:
                    Logger.warn("Unknown msg type", msg.type);
            }
        } catch (error) {
            Logger.error("Error handling message:", error);
        }
    }

    async webSocketClose(ws: WebSocket, code: number) {
        const data = ws.deserializeAttachment();
        if (data) {
            if (isSessionData(data)) {
                Logger.debug(`Closing ${data.connectionId}`);

                if (data.connectionType === "external") {
                    Logger.info("disconnecting external websocket connection");
                    this.externalDeviceConnected = false;
                    this.broadcast({ type: "external_disconnected" }, data.connectionId);
                }
                if (data.connectionType === "primary") {
                    Logger.info("disconnecting primary websocket connection");
                    this.primaryDeviceConnected = false;
                    this.broadcast({ type: "primary_disconnected" }, data.connectionId);
                }
            } else {
                Logger.warn("data is not session data in webSocketClose", data);
            }
        }
        if (code === 1005) {
            // https://github.com/vert-x3/issues/issues/297
            // https://github.com/Luka967/websocket-close-codes
            Logger.debug(
                `code is ${code}, meaning the browser auto-closed it (probably), so we're changing to 1001`,
            );
            code = 1001;
        }
        // If the client closes the connection, the runtime will invoke the webSocketClose() handler.
        ws.close(code, "Durable Object is closing WebSocket");
    }

    async webSocketError(_ws: WebSocket, error: unknown) {
        Logger.error("WebSocket error:", error);
    }

    private broadcast(message: any, _excludeId?: string) {
        const messageStr = JSON.stringify(message);
        const sockets = this.ctx.getWebSockets();
        Logger.debug(`broadcasting ${messageStr} to ${sockets.length} sockets`);

        for (const ws of sockets) {
            const data = ws.deserializeAttachment();
            if (isSessionData(data)) {
                Logger.debug("sending to", data.connectionId);
                try {
                    ws.send(messageStr);
                } catch (error) {
                    Logger.error("Error sending to connection:", data.connectionId, error);
                }
            } else {
                Logger.warn("data on socket is not session data, it's", data);
            }
        }
    }

    private broadcastToPrimary(message: any) {
        const messageStr = JSON.stringify(message);
        const sockets = this.ctx.getWebSockets();

        for (const ws of sockets) {
            const data = ws.deserializeAttachment();
            if (isSessionData(data) && data.connectionType === "primary") {
                Logger.debug("Sending to primary device:", data.connectionId);
                try {
                    ws.send(messageStr);
                } catch (error) {
                    Logger.error("Error sending to primary:", error);
                }
            }
        }
    }

    private broadcastToExternal(message: any) {
        const messageStr = JSON.stringify(message);
        const sockets = this.ctx.getWebSockets();

        for (const ws of sockets) {
            const data = ws.deserializeAttachment();
            if (isSessionData(data) && data.connectionType === "external") {
                Logger.debug("Sending to external device:", data.connectionId);
                try {
                    ws.send(messageStr);
                } catch (error) {
                    Logger.error("Error sending to external:", error);
                }
            }
        }
    }
}

export default AuthorizationSession;

function isSessionData(data: unknown): data is SessionData {
    return Boolean(data && typeof data === "object" && "connectionId" in data);
}
