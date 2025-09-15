import "@picocss/pico/css/pico.min.css";
import "@picocss/pico/css/pico.colors.css";
import { render } from "preact";
import AuthorizeApp from "./AuthorizeApp";
import type { AuthorizeBackendData } from "../../interfaces";
import Logger from "js-logger";

declare global {
    interface Window {
        __BACKEND_DATA__: string;
    }
}

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("Could not find app element");
}
let backendData: AuthorizeBackendData;
try {
    backendData = JSON.parse(window.__BACKEND_DATA__);
} catch (_err) {
    throw new Error("Failed to parse backend data");
}
const defaultLogger = Logger.createDefaultHandler();
const debugEl = document.getElementById("debug-info");
if (!debugEl) {
    throw new Error(`No debug-info element`);
}
Logger.setLevel(Logger.INFO);
Logger.setHandler((messages, context) => {
    defaultLogger(messages, context);
    if (context.level.value >= Logger.WARN.value) {
        const line = document.createElement("pre");
        line.innerText = [context.level.name, new Date().toLocaleDateString(), ...messages].join(
            " ",
        );
        debugEl.appendChild(line);
    }
});
window.onerror = (err) => {
    Logger.error(err instanceof Error ? err.stack || err.message : String(err));
};
render(<AuthorizeApp backendData={backendData} />, appElement);
