import { render } from "preact";
import DevApp from "./DevApp";
import "@picocss/pico/css/pico.min.css";
import "@picocss/pico/css/pico.colors.css";
import Logger from "js-logger";

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("App element not found");
}
Logger.useDefaults();
render(<DevApp />, appElement);
