import { Hono } from "hono";
import type { ClientInfo } from "../interfaces";

const clientCheck = new Hono<{ Bindings: Env }>();

clientCheck.get("/api/clients", async (c) => {
    const list = await c.env.LOGIN_STORAGE.list({ prefix: "clients/" });
    const clients = [];

    for (const item of list.objects) {
        const clientData = await c.env.LOGIN_STORAGE.get(item.key);
        if (clientData) {
            try {
                const client: ClientInfo = JSON.parse(await clientData.text());
                clients.push({
                    client_id: client.client_id,
                    redirect_uris: client.redirect_uris,
                    created_at: client.created_at || item.uploaded.toISOString(),
                });
            } catch (e) {
                console.error(`Failed to parse client ${item.key}:`, e);
            }
        }
    }

    return c.json({ clients });
});

export default clientCheck;
