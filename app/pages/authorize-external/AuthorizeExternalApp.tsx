import { signal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import useWebSocketConnection from "../../components/useWebSocketConnection";
import Logger from "js-logger";
import WebSocketStatus from "../../components/WebSocketStatus";

interface BackendData {
    sessionId: string;
    clientId: string;
    redirectUri: string;
    state?: string;
}

interface AuthorizeExternalAppProps {
    backendData: BackendData;
}

interface LoginResult {
    success: boolean;
    code?: string;
    state?: string;
    redirectUri?: string;
    error?: string;
}

const email = signal("");
const password = signal("");
const error = signal("");
const loading = signal(false);
const loginResult = signal<LoginResult | null>(null);
const codeSent = signal(false);

export default function AuthorizeExternalApp({ backendData }: AuthorizeExternalAppProps) {
    const { ws, wsStatus } = useWebSocketConnection<string>({
        url: new URL(`/authorize/${backendData.sessionId}/external/ws`, location.href),
    });

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

            if (!response.ok) {
                throw new Error(`Login request failed: status ${response.status}`);
            }
            const result: LoginResult = await response.json();
            if (result.success) {
                loginResult.value = result;
            } else {
                error.value = result.error || "Login failed";
            }
        } catch (err) {
            Logger.error("Login error:", err);
            error.value = "An error occurred during login";
        } finally {
            loading.value = false;
        }
    };

    useEffect(() => {
        if (!loginResult.value) return;
        if (codeSent.value) return;
        if (!ws) return;
        if (wsStatus.type !== "connected") return;
        const { code, state, redirectUri } = loginResult.value;
        // Send the code to the primary device via WebSocket
        ws.send(
            JSON.stringify({
                type: "code_generated",
                code,
                state,
                redirect_uri: redirectUri,
            }),
        );
        codeSent.value = true;
    }, [loginResult.value]);

    if (loading.value) {
        return <progress />;
    }

    if (error.value) {
        return <article class="pico-background-red-100">Error: ${error.value}</article>;
    }

    if (codeSent.value) {
        return (
            <main class="container">
                <article>
                    <h2>Login Successful!</h2>
                    <p>You can now return to the original device to continue.</p>
                </article>
            </main>
        );
    }

    return (
        <div class="container">
            <hgroup>
                <h2>External Device Login</h2>
                <p>Sign in here to get your other device logged in</p>
            </hgroup>
            <WebSocketStatus wsStatus={wsStatus} />
            <form onSubmit={handleSubmit}>
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
                    />
                </div>
                <button type="submit" disabled={wsStatus.type !== "connected"}>
                    Sign in
                </button>
            </form>
        </div>
    );
}
