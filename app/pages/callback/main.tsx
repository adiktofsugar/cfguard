import { render } from "preact";
import CallbackApp from "./CallbackApp";
import "@picocss/pico/css/pico.min.css";
import "@picocss/pico/css/pico.colors.css";
import Logger from "js-logger";
import type { CallbackBackendData } from "../../interfaces";

declare global {
    interface Window {
        __BACKEND_DATA__: string;
    }
}

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("App element not found");
}

let backendData: CallbackBackendData;
try {
    backendData = JSON.parse(window.__BACKEND_DATA__);
} catch (_err) {
    throw new Error("Failed to parse backend data");
}
Logger.useDefaults();
render(<CallbackApp data={backendData} />, appElement);
