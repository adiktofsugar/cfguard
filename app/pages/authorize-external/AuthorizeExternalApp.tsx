import { signal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

interface BackendData {
    sessionId: string;
    clientId: string;
    redirectUri: string;
    state?: string;
}

interface AuthorizeExternalAppProps {
    backendData: BackendData;
}

const email = signal("");
const password = signal("");
const error = signal("");
const loading = signal(false);
const wsConnected = signal(false);
const loginSuccess = signal(false);

export default function AuthorizeExternalApp({ backendData }: AuthorizeExternalAppProps) {
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
        const wsUrl = `${protocol}//${window.location.host}/authorize/${backendData.sessionId}/external/ws`;

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

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        error.value = "";
        loading.value = true;

        const formData = new FormData();
        formData.append("email", email.value);
        formData.append("password", password.value);
        formData.append("client_id", backendData.clientId);
        formData.append("redirect_uri", backendData.redirectUri);
        if (backendData.state) {
            formData.append("state", backendData.state);
        }

        try {
            const response = await fetch(`/authorize/${backendData.sessionId}/external/login`, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const result: {
                    success: boolean;
                    code?: string;
                    state?: string;
                    redirectUri?: string;
                    error?: string;
                } = await response.json();
                if (result.success) {
                    // Send the code to the primary device via WebSocket
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(
                            JSON.stringify({
                                type: "code_generated",
                                code: result.code,
                                state: result.state,
                                redirect_uri: result.redirectUri,
                            }),
                        );
                        loginSuccess.value = true;
                    } else {
                        error.value = "Connection to primary device lost";
                    }
                } else {
                    error.value = result.error || "Login failed";
                }
            } else {
                const text = await response.text();
                error.value = text || "Login failed";
            }
        } catch (err) {
            console.error("Login error:", err);
            error.value = "An error occurred during login";
        } finally {
            loading.value = false;
        }
    };

    if (loginSuccess.value) {
        return (
            <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6">
                <div class="mx-auto w-full max-w-md">
                    <div class="bg-white py-8 px-10 shadow rounded-lg text-center">
                        <div class="mb-4">
                            <i class="fas fa-check-circle fa-3x text-green-600"></i>
                        </div>
                        <h2 class="text-2xl font-bold mb-4">Login Successful!</h2>
                        <p>You can now return to the original device to continue.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6">
            <div class="mx-auto w-full max-w-md">
                <h2 class="mt-6 text-center text-3xl font-bold">External Device Login</h2>
                {!wsConnected.value && (
                    <div class="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p class="text-center">Connecting to primary device...</p>
                    </div>
                )}
            </div>

            <div class="mt-8 mx-auto w-full max-w-md">
                <div class="bg-white py-8 px-10 shadow rounded-lg">
                    <form onSubmit={handleSubmit} class="space-y-6">
                        <div>
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                required
                                value={email}
                                onInput={(e) => {
                                    email.value = (e.target as HTMLInputElement).value;
                                }}
                                class="mt-1 block w-full px-3 py-2 border rounded-md"
                                disabled={!wsConnected.value}
                            />
                        </div>

                        <div>
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onInput={(e) => {
                                    password.value = (e.target as HTMLInputElement).value;
                                }}
                                class="mt-1 block w-full px-3 py-2 border rounded-md"
                                disabled={!wsConnected.value}
                            />
                        </div>

                        {error.value && (
                            <div class="bg-red-50 p-4 rounded-md">
                                <p class="text-red-800">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading.value || !wsConnected.value}
                            class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading.value ? "Signing in..." : "Sign in"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
