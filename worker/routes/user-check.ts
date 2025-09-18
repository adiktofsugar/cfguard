import { Hono } from "hono";
import type { UserData } from "../interfaces";

const userCheck = new Hono<{ Bindings: Env }>();

userCheck.get("/api/users", async (c) => {
    const list = await c.env.LOGIN_STORAGE.list({ prefix: "users/" });
    const users = [];

    for (const item of list.objects) {
        const userData = await c.env.LOGIN_STORAGE.get(item.key);
        if (userData) {
            try {
                const user: UserData = JSON.parse(await userData.text());
                users.push({
                    email: user.email,
                    created_at: item.uploaded.toISOString(),
                });
            } catch (e) {
                console.error(`Failed to parse user ${item.key}:`, e);
            }
        }
    }

    return c.json({ users });
});

export default userCheck;
