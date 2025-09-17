import { render } from "preact";
import App from "./App";
import "@picocss/pico/css/pico.min.css";
import "@picocss/pico/css/pico.colors.min.css";
import "./index.css";
import Logger from "js-logger";
import type { MainBackendData } from "../../interfaces";

declare global {
    interface Window {
        __BACKEND_DATA__: string;
    }
}

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("Could not find app element");
}

let backendData: MainBackendData;
try {
    backendData = JSON.parse(window.__BACKEND_DATA__);
} catch (_err) {
    throw new Error("Failed to parse backend data");
}

Logger.useDefaults();
render(<App backendData={backendData} />, appElement);
