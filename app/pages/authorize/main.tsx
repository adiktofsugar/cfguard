// import { render } from "preact";
// import AuthorizeApp from "./AuthorizeApp";
// import "@picocss/pico/css/pico.min.css";
// import "@picocss/pico/css/pico.colors.css";
// import type { AuthorizeBackendData } from "../../interfaces";
// import Logger from "js-logger";

// declare global {
//     interface Window {
//         __BACKEND_DATA__: string;
//     }
// }

// const appElement = document.getElementById("app");
// if (!appElement) {
//     throw new Error("Could not find app element");
// }
// let backendData: AuthorizeBackendData;
// try {
//     backendData = JSON.parse(window.__BACKEND_DATA__);
// } catch (_err) {
//     throw new Error("Failed to parse backend data");
// }
// Logger.useDefaults();
// render(<AuthorizeApp backendData={backendData} />, appElement);

document.write("hey there");
