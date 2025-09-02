import { render } from "preact";
import AuthorizeApp from "./AuthorizeApp";
import "@picocss/pico/css/pico.min.css";

declare global {
    interface Window {
        __BACKEND_DATA__: string;
    }
}

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("App element not found");
}

let backendData;
try {
    backendData = JSON.parse(window.__BACKEND_DATA__);
} catch (_err) {
    throw new Error("Failed to parse backend data");
}

render(<AuthorizeApp data={backendData} />, appElement);
