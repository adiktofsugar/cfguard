import { Hono } from "hono";
import Logger from "js-logger";
import type { Env, UserData } from "../interfaces";
import { verifyPassword } from "../lib/crypto";
import { fetchAndInjectHTML } from "../lib/html-helper";

const authorize = new Hono<{ Bindings: Env }>();

authorize.get("/authorize", async (c) => {
    const clientId = c.req.query("client_id");
    const redirectUri = c.req.query("redirect_uri");
    const _state = c.req.query("state");
    const responseType = c.req.query("response_type");

    Logger.debug("Authorization request", c.req.query());

    if (!clientId || !redirectUri || responseType !== "code") {
        Logger.error("Invalid authorization parameters", { clientId, redirectUri, responseType });
        return c.text("Invalid request", 400);
    }

    // Generate a unique session ID and redirect to /authorize/<id>
    const sessionId = crypto.randomUUID();
    const url = new URL(c.req.url);
    url.pathname = `/authorize/${sessionId}`;

    return c.redirect(url.toString(), 302);
});

authorize.get("/authorize/:id", async (c) => {
    const sessionId = c.req.param("id");
    const clientId = c.req.query("client_id");
    const redirectUri = c.req.query("redirect_uri");
    const state = c.req.query("state");
    const responseType = c.req.query("response_type");

    Logger.debug("Authorization session request", { sessionId, ...c.req.query() });

    if (!clientId || !redirectUri || responseType !== "code") {
        Logger.error("Invalid authorization parameters", { clientId, redirectUri, responseType });
        return c.text("Invalid request", 400);
    }

    const backendData = {
        sessionId,
        clientId,
        redirectUri,
        state,
        responseType,
        externalUrl: `${new URL(c.req.url).origin}/authorize/${sessionId}/external?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state || ""}`,
    };

    return fetchAndInjectHTML(c, "authorize", "Sign In - CFGuard", backendData);
});

// WebSocket endpoint for primary device
authorize.get("/authorize/:id/ws", async (c) => {
    const sessionId = c.req.param("id");
    const upgradeHeader = c.req.header("upgrade");

    if (upgradeHeader !== "websocket") {
        return c.text("Expected WebSocket", 400);
    }

    const id = c.env.AUTHORIZATION_SESSIONS.idFromName(sessionId);
    const stub = c.env.AUTHORIZATION_SESSIONS.get(id);

    return stub.fetch(c.req.raw);
});

// External device login page
authorize.get("/authorize/:id/external", async (c) => {
    const sessionId = c.req.param("id");
    const clientId = c.req.query("client_id");
    const redirectUri = c.req.query("redirect_uri");
    const state = c.req.query("state");

    Logger.debug("External device authorization", { sessionId, clientId, redirectUri, state });

    if (!clientId || !redirectUri) {
        return c.text("Invalid request", 400);
    }

    const backendData = {
        sessionId,
        clientId,
        redirectUri,
        state,
    };

    return fetchAndInjectHTML(
        c,
        "authorize-external",
        "External Device Login - CFGuard",
        backendData,
    );
});

// WebSocket endpoint for external device
authorize.get("/authorize/:id/external/ws", async (c) => {
    const sessionId = c.req.param("id");
    const upgradeHeader = c.req.header("upgrade");

    if (upgradeHeader !== "websocket") {
        return c.text("Expected WebSocket", 400);
    }

    const id = c.env.AUTHORIZATION_SESSIONS.idFromName(sessionId);
    const stub = c.env.AUTHORIZATION_SESSIONS.get(id);

    // The path includes /external so the Durable Object knows it's an external connection
    return stub.fetch(new Request(c.req.url.replace("/external/ws", "/external"), c.req.raw));
});

// External device login endpoint - returns JSON response
authorize.post("/authorize/:id/external/login", async (c) => {
    const sessionId = c.req.param("id");
    const formData = await c.req.parseBody();
    const email = formData.email as string;
    const password = formData.password as string;
    const clientId = formData.client_id as string;
    const redirectUri = formData.redirect_uri as string;
    const state = formData.state as string;

    Logger.debug("External device login attempt", { sessionId, ...formData });

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
        return c.json({ success: false, error: "Invalid credentials" }, 401);
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

    // Return success with the code - the frontend will send it via WebSocket
    return c.json({
        success: true,
        code,
        state,
        redirectUri,
    });
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
