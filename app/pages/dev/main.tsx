import { render } from "preact";
import DevApp from "./DevApp";
import "@picocss/pico/css/pico.min.css";
import "@picocss/pico/css/pico.colors.css";

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("App element not found");
}

render(<DevApp />, appElement);
