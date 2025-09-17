import { render } from "preact";
import AuthorizeExternalApp from "./AuthorizeExternalApp";
import "@picocss/pico/css/pico.min.css";
import "@picocss/pico/css/pico.colors.css";
import Logger from "js-logger";
import type { AuthorizeExternalBackendData } from "../../interfaces";

declare global {
    interface Window {
        __BACKEND_DATA__: string;
    }
}

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("Could not find app element");
}

let backendData: AuthorizeExternalBackendData;
try {
    backendData = JSON.parse(window.__BACKEND_DATA__);
} catch (_err) {
    throw new Error("Failed to parse backend data");
}
Logger.useDefaults();
render(<AuthorizeExternalApp backendData={backendData} />, appElement);
