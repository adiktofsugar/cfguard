import { signal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import LoginForm from "./LoginForm";
import QRCodeDisplay from "./QRCodeDisplay";

interface BackendData {
    sessionId: string;
    clientId: string;
    redirectUri: string;
    state?: string;
    responseType: string;
    externalUrl: string;
}

interface AuthorizeAppProps {
    backendData: BackendData;
}

const externalDeviceConnected = signal(false);
const wsConnected = signal(false);

export default function AuthorizeApp({ backendData }: AuthorizeAppProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close(1000);
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    const connectWebSocket = () => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/authorize/${backendData.sessionId}/ws`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket connected");
            wsConnected.value = true;
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    console.debug("[ws] Ping");
                    ws.send(JSON.stringify({ type: "ping" }));
                } else {
                    clearInterval(pingInterval);
                }
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("WebSocket message:", data);

                switch (data.type) {
                    case "status":
                        externalDeviceConnected.value = data.externalDeviceConnected;
                        break;
                    case "external_connected":
                        externalDeviceConnected.value = true;
                        break;
                    case "external_disconnected":
                        externalDeviceConnected.value = false;
                        break;
                    case "code_received": {
                        const redirectUrl = new URL(data.redirect_uri);
                        redirectUrl.searchParams.set("code", data.code);
                        if (data.state) {
                            redirectUrl.searchParams.set("state", data.state);
                        }
                        window.location.href = redirectUrl.toString();
                        break;
                    }
                }
            } catch (err) {
                console.error("Failed to parse WebSocket message:", err);
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            wsConnected.value = false;
        };

        ws.onclose = (ev) => {
            console.log(`WebSocket closed with code ${ev.code}`);
            wsConnected.value = false;
            wsRef.current = null;
            if (ev.code !== 1000) {
                console.log("reconnecting...");
                reconnectTimeoutRef.current = window.setTimeout(() => {
                    connectWebSocket();
                }, 1000);
            }
        };
    };

    return (
        <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6">
            <div class="mx-auto w-full max-w-md">
                <h2 class="mt-6 text-center text-3xl font-bold">Sign in to continue</h2>
                {!wsConnected.value && (
                    <div class="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p class="text-center">Connecting...</p>
                    </div>
                )}
                {externalDeviceConnected.value && (
                    <div class="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
                        <p class="text-center">External device connected - waiting for login...</p>
                    </div>
                )}
            </div>

            <div class="mt-8 mx-auto w-full max-w-md">
                <div class="bg-white py-8 px-10 shadow rounded-lg">
                    {!externalDeviceConnected.value && (
                        <QRCodeDisplay url={backendData.externalUrl} />
                    )}
                    <LoginForm
                        clientId={backendData.clientId}
                        redirectUri={backendData.redirectUri}
                        state={backendData.state}
                        disabled={externalDeviceConnected.value}
                    />
                </div>
            </div>
        </div>
    );
}
