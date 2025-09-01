import { Hono } from "hono";
import type { Env } from "../interfaces";

const clientCheck = new Hono<{ Bindings: Env }>();

clientCheck.get("/api/client-check/:clientId", async (c) => {
    const clientId = c.req.param("clientId");

    if (!clientId) {
        return c.json({ error: "Client ID is required" }, 400);
    }
    const clientData = await c.env.LOGIN_STORAGE.get(`clients/${clientId}.json`);
    return c.json({
        exists: !!clientData,
        clientId,
    });
});

export default clientCheck;
