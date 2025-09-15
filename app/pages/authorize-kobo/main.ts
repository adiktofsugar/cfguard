import "@picocss/pico/css/pico.min.css";
import "@picocss/pico/css/pico.colors.css";
import type { AuthorizeBackendData } from "../../interfaces";
import Socket from "./Socket";

// Get backend data
const backendData: AuthorizeBackendData = JSON.parse((window as any).__BACKEND_DATA__);

function writeErrorToBody(message: string) {
    document.body.innerHTML += `<div style="color: red; padding: 1rem; border: 2px solid red; margin: 1rem;">${message}</div>`;
}

function assertElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id) as T;
    if (!el) {
        const error = `Element with id "${id}" not found`;
        writeErrorToBody(error);
        throw new Error(error);
    }
    return el;
}

function showError(message: string) {
    const errorEl = assertElement("error-message");
    errorEl.textContent = message;
    addDebugInfo(`ERROR: ${message}`);
}

function showStatus(message: string) {
    const statusEl = assertElement("status-message");
    statusEl.textContent = message;
    addDebugInfo(`STATUS: ${message}`);
}

function addDebugInfo(message: string) {
    const debugEl = assertElement("debug-info");
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    debugEl.innerHTML += `[${timestamp}] ${message}<br>`;
    // Keep only last 20 lines
    const lines = debugEl.innerHTML.split("<br>");
    if (lines.length > 20) {
        debugEl.innerHTML = lines.slice(-20).join("<br>");
    }
}

function updateStatus({
    socket,
    externalConnected,
}: {
    socket: Socket<any>;
    externalConnected: boolean;
}) {
    showStatus(`socket: ${socket.status.type} / external connected: ${externalConnected}`);

    // Update QR status
    const qrStatusEl = assertElement("qr-status");
    if (externalConnected) {
        qrStatusEl.textContent = "Mobile device connected";
        qrStatusEl.style.color = "green";
    } else if (socket.status.type === "connected") {
        qrStatusEl.textContent = "Waiting for mobile device...";
        qrStatusEl.style.color = "";
    } else {
        qrStatusEl.textContent = "Connecting...";
        qrStatusEl.style.color = "orange";
    }
}

async function init() {
    try {
        addDebugInfo("Initializing authorize-kobo page");
        addDebugInfo(`Backend data present: ${!!backendData}`);

        if (!backendData) {
            showError("No backend data found");
            return;
        }
        addDebugInfo(`Backend data: ${JSON.stringify(backendData, null, 2)}`);

        // Display QR code
        const qrCodeEl = assertElement("qr-code");

        qrCodeEl.innerHTML = `<img src="/qrcode/${backendData.sessionId}" alt="QR Code for external device login" />`;

        let externalConnected = false;
        const socket = new Socket<string>({
            url: new URL(`/authorize/${backendData.sessionId}/ws`, location.href),
            onStatus() {
                updateStatus({ socket, externalConnected });
            },
            onMessage(raw, ws) {
                const data = JSON.parse(raw);
                addDebugInfo(`message received: ${JSON.stringify(data, null, 2)}`);
                switch (data.type) {
                    case "status":
                        externalConnected = data.externalDeviceConnected;
                        break;
                    case "external_connected":
                        externalConnected = true;
                        break;
                    case "external_disconnected":
                        externalConnected = false;
                        break;
                    case "request_params": {
                        // External device is requesting OIDC params - respond with our params
                        const message = {
                            type: "params_response",
                            params: {
                                clientId: backendData.clientId,
                                redirectUri: backendData.redirectUri,
                                state: backendData.state,
                            },
                        };
                        addDebugInfo(`sending params: ${JSON.stringify(message, null, 2)}`);
                        ws.send(JSON.stringify(message));
                        break;
                    }
                    case "code_received": {
                        const redirectUrl = new URL(backendData.redirectUri);
                        redirectUrl.searchParams.set("code", data.code);
                        if (backendData.state) {
                            redirectUrl.searchParams.set("state", backendData.state);
                        }
                        window.location.href = redirectUrl.toString();
                        break;
                    }
                }
                updateStatus({ socket: socket, externalConnected });
            },
        });
        socket.connect();
    } catch (error) {
        showError(`Initialization failed: ${error}`);
        addDebugInfo(`Init error: ${error}`);
    }
}

// Start when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
