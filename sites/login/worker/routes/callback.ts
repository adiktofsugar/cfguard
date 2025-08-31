import { Hono } from "hono";
import type { Env } from "../interfaces";
import { fetchAndInjectHTML } from "../lib/html-helper";

const callback = new Hono<{ Bindings: Env }>();

callback.get("/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    
    const backendData = {
        code,
        state,
    };

    return fetchAndInjectHTML(c, "/app/routes/callback/index.html", backendData);
});

export default callback;