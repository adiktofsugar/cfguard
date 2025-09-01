import { Hono } from "hono";
import type { Env } from "../interfaces";
import { fetchAndInjectHTML } from "../lib/html-helper";

const main = new Hono<{ Bindings: Env }>();

main.get("/", async (c) => {
    const url = new URL(c.req.url);
    const isLocalR2 = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    const backendData = {
        message: "CFGuard Login Service",
        isLocalR2,
        r2BucketName: c.env.R2_BUCKET_NAME,
    };

    return fetchAndInjectHTML(c, "main", "CFGuard Login", backendData);
});

export default main;
