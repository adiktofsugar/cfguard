import { signal } from "@preact/signals";
import QRCodeDisplay from "../../components/QRCodeDisplay";
import useWebSocketConnection from "../../components/useWebSocketConnection";
import WebSocketStatus from "../../components/WebSocketStatus";
import type { AuthorizeBackendData } from "../../interfaces";
import LoginForm from "./LoginForm";

interface AuthorizeAppProps {
    backendData: AuthorizeBackendData;
}

const externalDeviceConnected = signal(false);

export default function AuthorizeApp({ backendData }: AuthorizeAppProps) {
    const { wsStatus } = useWebSocketConnection<string>({
        url: `${location.protocol}//${location.host}/authorize/${backendData.sessionId}/ws`,
        onMessage(raw, ws) {
            const data = JSON.parse(raw);
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
                case "request_params":
                    // External device is requesting OIDC params - respond with our params
                    ws.send(
                        JSON.stringify({
                            type: "params_response",
                            params: {
                                clientId: backendData.clientId,
                                redirectUri: backendData.redirectUri,
                                state: backendData.state,
                            },
                        }),
                    );
                    break;
                case "code_received": {
                    // Build redirect URL with query params using string manipulation
                    let redirectUrl = backendData.redirectUri;
                    const separator = redirectUrl.includes("?") ? "&" : "?";
                    redirectUrl += `${separator}code=${encodeURIComponent(data.code)}`;
                    if (backendData.state) {
                        redirectUrl += `&state=${encodeURIComponent(backendData.state)}`;
                    }
                    window.location.href = redirectUrl;
                    break;
                }
            }
        },
    });

    return (
        <div class="container">
            {externalDeviceConnected.value ? (
                <article>External device connected - waiting for login...</article>
            ) : (
                <div class="grid">
                    <div>
                        <WebSocketStatus wsStatus={wsStatus} />
                        <div>
                            <hgroup>
                                <h2>Sign in on another device</h2>
                                <p>By scanning this QR code</p>
                            </hgroup>
                            <QRCodeDisplay sessionId={backendData.sessionId} />
                        </div>
                        <hr />
                        <div>
                            <a href={backendData.externalUrl}>Or you can copy this link</a>
                        </div>
                    </div>
                    <div>
                        <hgroup>
                            <h2>Sign in on this device</h2>
                            <p>If you don't like QR codes</p>
                        </hgroup>
                        <LoginForm
                            clientId={backendData.clientId}
                            redirectUri={backendData.redirectUri}
                            state={backendData.state}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
