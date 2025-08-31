import { render } from "preact";
import App from "./App";
import "./index.css";

const appElement = document.getElementById("app");
if (!appElement) {
    throw new Error("Could not find app element");
}
render(<App />, appElement);
