import { Hono } from "hono";

const userinfo = new Hono<{ Bindings: Env }>();

userinfo.get("/userinfo", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.text("Unauthorized", 401);
    }

    const accessToken = authHeader.substring(7);
    const tokenDataObj = await c.env.LOGIN_STORAGE.get(`access_tokens/${accessToken}.json`);

    if (!tokenDataObj) {
        return c.text("Unauthorized", 401);
    }

    const tokenData = JSON.parse(await tokenDataObj.text());

    if (tokenData.expires < Date.now()) {
        return c.text("Unauthorized", 401);
    }

    return c.json({
        sub: tokenData.sub,
        email: tokenData.email,
    });
});

export default userinfo;
