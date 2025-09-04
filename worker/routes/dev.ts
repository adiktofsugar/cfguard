import { Hono } from "hono";
import { fetchAndInjectHTML } from "../lib/html-helper";

const dev = new Hono<{ Bindings: Env }>();

dev.get("/dev", async (c) => {
    const backendData = {
        routes: [
            { path: "/authorize", name: "Authorize" },
            { path: "/callback", name: "Callback" },
            { path: "/", name: "Main" },
        ],
    };

    return fetchAndInjectHTML(c, "dev", "Dev Tools - CFGuard", backendData);
});

export default dev;
