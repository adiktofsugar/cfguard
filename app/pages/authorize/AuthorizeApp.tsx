import { signal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import LoginForm from "./LoginForm";
import QRCodeDisplay from "../../components/QRCodeDisplay";
import useWebSocketConnection from "../../components/useWebSocketConnection";
import WebSocketStatus from "../../components/WebSocketStatus";

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
    const { wsStatus } = useWebSocketConnection<string>({
        url: new URL(`/authorize/${backendData.sessionId}/ws`, location.href),
        onMessage(raw) {
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
        },
    });

    return (
        <div class="container">
            {externalDeviceConnected.value ? (
                <article class="pico-background-green-500">
                    External device connected - waiting for login...
                </article>
            ) : (
                <div class="grid">
                    <div>
                        <WebSocketStatus wsStatus={wsStatus} />
                        <div>
                            <hgroup>
                                <h2>Sign in on another device</h2>
                                <p>By scanning this QR code</p>
                            </hgroup>
                            <QRCodeDisplay url={backendData.externalUrl} />
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
