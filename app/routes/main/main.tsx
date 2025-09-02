import { render } from "preact";
import App from "./App";
import "@picocss/pico/css/pico.min.css";
import "./index.css";

declare global {
    interface Window {
        __BACKEND_DATA__: string;
    }
}

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("Could not find app element");
}

let backendData;
try {
    backendData = JSON.parse(window.__BACKEND_DATA__);
} catch (_err) {
    throw new Error("Failed to parse backend data");
}

render(<App backendData={backendData} />, appElement);
