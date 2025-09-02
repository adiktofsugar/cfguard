import { Hono } from "hono";
import Logger from "js-logger";
import type { Env, UserData } from "../interfaces";
import { verifyPassword } from "../lib/crypto";
import { fetchAndInjectHTML } from "../lib/html-helper";

const authorize = new Hono<{ Bindings: Env }>();

authorize.get("/authorize", async (c) => {
    const clientId = c.req.query("client_id");
    const redirectUri = c.req.query("redirect_uri");
    const state = c.req.query("state");
    const responseType = c.req.query("response_type");

    Logger.debug("Authorization request", c.req.query());

    if (!clientId || !redirectUri || responseType !== "code") {
        Logger.error("Invalid authorization parameters", { clientId, redirectUri, responseType });
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
    const email = formData.email as string;
    const password = formData.password as string;
    const clientId = formData.client_id as string;
    const redirectUri = formData.redirect_uri as string;
    const state = formData.state as string;

    Logger.debug("Login attempt", formData);

    const userKey = `user:${email}`;
    Logger.debug("Looking up user", { email, userKey });
    const userDataObj = await c.env.LOGIN_STORAGE.get(userKey);

    let validLogin = false;
    let userData: UserData | null = null;

    if (userDataObj) {
        const parsedUserData: UserData = JSON.parse(await userDataObj.text());
        userData = parsedUserData;
        Logger.debug("User found, validating password", parsedUserData);
        validLogin = await verifyPassword(password, parsedUserData.passwordHash);
        Logger.debug("Password validation result", { validLogin });
    } else {
        Logger.warn("User not found", { email });
    }

    if (!validLogin || !userData) {
        Logger.warn("Login failed", { email, validLogin, userData });
        return c.text("Invalid credentials", 401);
    }

    Logger.info("Login successful", userData);

    const code = crypto.randomUUID();
    const codeData = {
        clientId,
        redirectUri,
        sub: userData.sub,
        email: userData.email,
        expires: Date.now() + 600000,
    };

    Logger.debug("Generated authorization code", { code, codeData });

    await c.env.LOGIN_STORAGE.put(`code:${code}`, JSON.stringify(codeData));

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (state) {
        redirectUrl.searchParams.set("state", state);
    }

    Logger.info("Redirecting with authorization code", {
        redirectUrl: redirectUrl.toString(),
        code,
        state,
    });

    return c.redirect(redirectUrl.toString(), 302);
});

export default authorize;
