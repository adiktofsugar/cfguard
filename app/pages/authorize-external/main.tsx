import { render } from "preact";
import AuthorizeExternalApp from "./AuthorizeExternalApp";
import "@picocss/pico/css/pico.min.css";

interface BackendData {
    sessionId: string;
    clientId: string;
    redirectUri: string;
    state?: string;
}

declare global {
    interface Window {
        __BACKEND_DATA__: string;
    }
}

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("Could not find app element");
}

let backendData: BackendData;
try {
    backendData = JSON.parse(window.__BACKEND_DATA__);
} catch (_err) {
    throw new Error("Failed to parse backend data");
}

render(<AuthorizeExternalApp backendData={backendData} />, appElement);
