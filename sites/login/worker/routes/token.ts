import { Hono } from "hono";
import type { Env } from "../interfaces";
import { getOrCreateKeyPair } from "../lib/keys";
import { signJWT } from "../lib/jwt";

const token = new Hono<{ Bindings: Env }>();

token.post("/token", async (c) => {
    const formData = await c.req.parseBody();
    const grantType = formData["grant_type"];
    const code = formData["code"] as string;
    const clientId = formData["client_id"] as string;
    const _clientSecret = formData["client_secret"] as string;
    const redirectUri = formData["redirect_uri"] as string;

    if (grantType !== "authorization_code") {
        return c.json({ error: "unsupported_grant_type" }, 400);
    }

    const codeDataObj = await c.env.LOGIN_STORAGE.get(`code:${code}`);
    if (!codeDataObj) {
        return c.json({ error: "invalid_grant" }, 400);
    }

    const codeData = JSON.parse(await codeDataObj.text());

    if (codeData.clientId !== clientId || codeData.redirectUri !== redirectUri) {
        return c.json({ error: "invalid_grant" }, 400);
    }

    if (codeData.expires < Date.now()) {
        return c.json({ error: "invalid_grant" }, 400);
    }

    await c.env.LOGIN_STORAGE.delete(`code:${code}`);

    const { privateKey, publicJwk } = await getOrCreateKeyPair(c.env);
    const now = Math.floor(Date.now() / 1000);

    const accessToken = crypto.randomUUID();
    const accessTokenData = {
        sub: codeData.sub,
        username: codeData.username,
        name: codeData.name,
        email: codeData.email,
        email_verified: codeData.email_verified,
        expires: Date.now() + 3600000,
    };

    await c.env.LOGIN_STORAGE.put(
        `access_token:${accessToken}`,
        JSON.stringify(accessTokenData),
    );

    const protocol = c.req.header("X-Forwarded-Proto") || "https";
    const host = c.req.header("Host");
    const issuer = `${protocol}://${host}`;
    
    const idToken = await signJWT(
        {
            iss: issuer,
            sub: codeData.sub,
            aud: clientId,
            exp: now + 3600,
            iat: now,
            name: codeData.name,
            email: codeData.email,
            email_verified: codeData.email_verified,
            preferred_username: codeData.username,
        },
        privateKey,
        publicJwk.kid || "",
    );

    return c.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        id_token: idToken,
    });
});

export default token;