import Logger from "js-logger";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { WebSocketStatus } from "../interfaces";

export default function useWebSocketConnection<Data>({
    url,
    onMessage,
}: {
    url: string;
    onMessage?: (data: Data, ws: WebSocket) => unknown;
}) {
    const [status, setStatus] = useState<WebSocketStatus>({ type: "disconnected" });
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    const send = useCallback((message: string) => {
        if (!wsRef.current) throw new Error(`WebSocket not connected`);
        wsRef.current.send(message);
    }, []);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                // 1000 is normal close status
                wsRef.current.close(1000);
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    const connectWebSocket = () => {
        // Convert http/https URL to ws/wss URL
        let wsUrl = url;
        if (wsUrl.startsWith("https://")) {
            wsUrl = wsUrl.replace("https://", "wss://");
        } else if (wsUrl.startsWith("http://")) {
            wsUrl = wsUrl.replace("http://", "ws://");
        } else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
            // If no protocol, assume based on current page protocol
            const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
            wsUrl = protocol + wsUrl;
        }
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            Logger.debug("WebSocket connected");
            setStatus({ type: "connected" });
        };

        ws.onmessage = (event) => {
            Logger.debug("WebSocket message:", event.data);
            onMessage?.(event.data as Data, ws);
        };

        ws.onerror = (error) => {
            Logger.error("WebSocket error:", error);
            setStatus({ type: "disconnected" });
        };

        ws.onclose = (ev) => {
            Logger.debug(`WebSocket closed with code ${ev.code}`);
            setStatus({ type: "disconnected" });
            wsRef.current = null;
            if (ev.code !== 1000) {
                Logger.debug("WebSocket reconnecting...");
                reconnectTimeoutRef.current = window.setTimeout(() => {
                    connectWebSocket();
                }, 1000);
            }
        };
    };
    return { wsStatus: status, wsSend: send };
}
