import { Hono } from "hono";
import type { Env } from "../interfaces";
import { fetchAndInjectHTML } from "../lib/html-helper";

const main = new Hono<{ Bindings: Env }>();

main.get("/", async (c) => {
    const backendData = {
        message: "CFGuard Login Service"
    };

    return fetchAndInjectHTML(c, "main", "CFGuard Login", backendData);
});

export default main;