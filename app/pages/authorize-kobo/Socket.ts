import Logger from "js-logger";
import type { WebSocketStatus } from "../../interfaces";

export default class Socket<Data> {
    private url;
    private onMessage;
    private onStatus;
    private ws: WebSocket | null = null;
    private reconnectTimeout: number | null = null;
    status: WebSocketStatus = { type: "disconnected" };
    constructor({
        url,
        onMessage,
        onStatus,
    }: {
        url: URL;
        onMessage?: (data: Data, ws: WebSocket) => unknown;
        onStatus?: (status: WebSocketStatus) => unknown;
    }) {
        this.url = url;
        this.onMessage = onMessage;
        this.onStatus = onStatus;
    }

    send(message: string) {
        const { ws } = this;
        if (!ws) throw new Error(`WebSocket not connected`);
        ws.send(message);
    }

    destroy() {
        const { ws, reconnectTimeout: reconnectTimeoutRef } = this;
        if (ws) {
            // 1000 is normal close status
            ws.close(1000);
        }
        if (reconnectTimeoutRef) {
            clearTimeout(reconnectTimeoutRef);
        }
    }

    setStatus(status: WebSocketStatus) {
        this.status = status;
        this.onStatus?.(status);
    }

    setWs(ws: WebSocket | null) {
        this.ws = ws;
    }

    reconnect() {
        Logger.debug("WebSocket reconnecting...");
        this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
        }, 1000);
    }

    connect() {
        const url = new URL(this.url);
        if (url.protocol === "https") url.protocol = "wss";
        if (url.protocol === "http") url.protocol = "ws";
        const ws = new WebSocket(url);
        this.setWs(ws);

        ws.onopen = () => {
            Logger.debug("WebSocket connected");
            this.setStatus({ type: "connected" });
        };

        ws.onmessage = (event) => {
            Logger.debug("WebSocket message:", event.data);
            this.onMessage?.(event.data as Data, ws);
        };

        ws.onerror = (error) => {
            Logger.error("WebSocket error:", error);
            this.setStatus({ type: "disconnected" });
        };

        ws.onclose = (ev) => {
            Logger.debug(`WebSocket closed with code ${ev.code}`);
            this.setStatus({ type: "disconnected" });
            this.setWs(null);
            if (ev.code !== 1000) {
                this.reconnect();
            }
        };
    }
}
