import { Hono } from "hono";
import type { Env, UserData } from "../interfaces";
import { hashPassword, verifyPassword } from "../lib/crypto";
import { fetchAndInjectHTML } from "../lib/html-helper";

const authorize = new Hono<{ Bindings: Env }>();

authorize.get("/authorize", async (c) => {
    const clientId = c.req.query("client_id");
    const redirectUri = c.req.query("redirect_uri");
    const state = c.req.query("state");
    const responseType = c.req.query("response_type");

    if (!clientId || !redirectUri || responseType !== "code") {
        return c.text("Invalid request", 400);
    }

    const backendData = {
        clientId,
        redirectUri,
        state,
        responseType,
    };

    return fetchAndInjectHTML(c, "authorize", "Sign In - CFGuard", backendData);
});

authorize.post("/login", async (c) => {
    const formData = await c.req.parseBody();
    const username = formData["username"] as string;
    const password = formData["password"] as string;
    const clientId = formData["client_id"] as string;
    const redirectUri = formData["redirect_uri"] as string;
    const state = formData["state"] as string;

    const userKey = `user:${username}`;
    const userDataObj = await c.env.LOGIN_STORAGE.get(userKey);

    let validLogin = false;
    let userData: UserData | null = null;

    if (userDataObj) {
        const parsedUserData: UserData = JSON.parse(await userDataObj.text());
        userData = parsedUserData;
        validLogin = await verifyPassword(password, parsedUserData.passwordHash);
    } else if (username === "admin" && password === "password") {
        const passwordHash = await hashPassword(password);
        userData = {
            sub: crypto.randomUUID(),
            username: "admin",
            passwordHash,
            name: "Admin User",
            email: "admin@example.com",
            email_verified: true,
        };
        await c.env.LOGIN_STORAGE.put(userKey, JSON.stringify(userData));
        validLogin = true;
    }

    if (!validLogin || !userData) {
        return c.text("Invalid credentials", 401);
    }

    const code = crypto.randomUUID();
    const codeData = {
        clientId,
        redirectUri,
        sub: userData.sub,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        email_verified: userData.email_verified,
        expires: Date.now() + 600000,
    };

    await c.env.LOGIN_STORAGE.put(`code:${code}`, JSON.stringify(codeData));

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (state) {
        redirectUrl.searchParams.set("state", state);
    }

    return c.redirect(redirectUrl.toString(), 302);
});

export default authorize;
