import { signal } from "@preact/signals";
import Logger from "js-logger";
import { useEffect } from "preact/hooks";
import useWebSocketConnection from "../../components/useWebSocketConnection";
import WebSocketStatus from "../../components/WebSocketStatus";
import type { AuthorizeExternalBackendData, LoginResult, OIDCParams } from "../../interfaces";

interface AuthorizeExternalAppProps {
    backendData: AuthorizeExternalBackendData;
}

const email = signal("");
const password = signal("");
const error = signal<string | null>(null);
const loading = signal(false);
const requestPending = signal(false);
const result = signal<LoginResult | null>(null);
const codeSent = signal(false);
const oidcParams = signal<OIDCParams | null>(null);
const primaryDeviceConnected = signal(false);

export default function AuthorizeExternalApp({ backendData }: AuthorizeExternalAppProps) {
    const { wsSend, wsStatus } = useWebSocketConnection<string>({
        url: `${location.protocol}//${location.host}/authorize/${backendData.sessionId}/external/ws`,
        onMessage(raw) {
            const data = JSON.parse(raw);
            switch (data.type) {
                case "status":
                    primaryDeviceConnected.value = data.primaryDeviceConnected;
                    break;
                case "primary_connected":
                    primaryDeviceConnected.value = true;
                    break;
                case "primary_disconnected":
                    primaryDeviceConnected.value = false;
                    break;
                case "params_response":
                    // Received OIDC params from primary device
                    oidcParams.value = data.params;
                    Logger.debug("Received OIDC params", data.params);
                    break;
            }
        },
    });

    const makeRequest = async (formData: FormData) => {
        try {
            loading.value = true;
            const response = await fetch(`/authorize/${backendData.sessionId}/external/login`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Login request failed: status ${response.status}`);
            }
            const data: LoginResult = await response.json();
            if (data.success) {
                result.value = data;
            } else {
                error.value = data.error || "Login failed";
            }
        } catch (err) {
            Logger.error("Login error:", err);
            error.value = "An error occurred during login";
        } finally {
            loading.value = false;
        }
    };

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        error.value = null;
        loading.value = true;
        oidcParams.value = null;
        requestPending.value = true;
    };

    // once we've submitted the form, we get the params
    useEffect(() => {
        if (
            requestPending.value &&
            !oidcParams.value &&
            primaryDeviceConnected.value &&
            wsStatus.type === "connected"
        ) {
            Logger.debug("Requesting OIDC params from primary device");
            wsSend(JSON.stringify({ type: "request_params" }));
        }
    }, [wsStatus.type, requestPending.value, oidcParams.value, primaryDeviceConnected.value]);

    // once we have the params, we can make the request
    useEffect(() => {
        if (requestPending.value && oidcParams.value) {
            requestPending.value = false;
            const formData = new FormData();
            formData.append("email", email.value);
            formData.append("password", password.value);
            formData.append("client_id", oidcParams.value.clientId);
            formData.append("redirect_uri", oidcParams.value.redirectUri);
            if (oidcParams.value.state) {
                formData.append("state", oidcParams.value.state);
            }
            makeRequest(formData);
        }
    }, [requestPending.value, oidcParams.value]);

    // once we've got a successful result, we're good!
    useEffect(() => {
        if (result.value && !codeSent.value && wsStatus.type === "connected") {
            const { code } = result.value;
            // Send the code to the primary device via WebSocket
            wsSend(
                JSON.stringify({
                    type: "code_generated",
                    code,
                }),
            );
            codeSent.value = true;
        }
    }, [result.value]);

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
            {loading.value ? (
                <progress />
            ) : (
                <>
                    {error.value && (
                        <article class="pico-background-red-100">Error: {error.value}</article>
                    )}
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
                </>
            )}
        </div>
    );
}
