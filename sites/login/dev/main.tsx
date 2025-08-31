import { render } from "preact";
import DevApp from "./DevApp";

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("App element not found");
}

render(<DevApp />, appElement);