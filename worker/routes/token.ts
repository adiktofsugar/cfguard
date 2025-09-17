import { Hono } from "hono";
import Logger from "js-logger";
import type { ClientInfo, ValidationResult } from "../interfaces";
import { signJWT } from "../lib/jwt";
import { getOrCreateKeyPair } from "../lib/keys";

const token = new Hono<{ Bindings: Env }>();

async function getClientInfo(env: Env, clientId: string): Promise<ClientInfo | null> {
    const clientDataObj = await env.LOGIN_STORAGE.get(`clients/${clientId}.json`);
    if (!clientDataObj) {
        return null;
    }
    return JSON.parse(await clientDataObj.text());
}

function validateClientId(providedClientId: string | undefined, expectedClientId: string): boolean {
    // If no client_id was provided, that's fine (public client)
    if (!providedClientId) {
        return true;
    }
    // If one was provided, it must match the expected one
    return providedClientId === expectedClientId;
}

async function validateClientSecret(
    env: Env,
    clientId: string,
    providedSecret: string | undefined,
): Promise<ValidationResult> {
    // Client secret is required for all clients
    if (!providedSecret) {
        Logger.error("Client secret is required but not provided");
        return { valid: false, error: "Client authentication required" };
    }

    // Get client configuration
    const client = await getClientInfo(env, clientId);
    if (!client) {
        Logger.error("Client not found", { clientId });
        return { valid: false, error: "Client not found" };
    }

    Logger.debug("Client found", client);

    // Validate the provided secret
    if (client.client_secret !== providedSecret) {
        Logger.error("Invalid client secret", { clientId });
        return { valid: false, error: "Invalid client credentials" };
    }

    Logger.debug("Client credentials validated successfully");
    return { valid: true };
}

token.post("/token", async (c) => {
    const formData = await c.req.parseBody();

    Logger.debug("Token endpoint called", formData);
    const grantType = formData.grant_type;
    const code = formData.code as string;
    const clientId = formData.client_id as string | undefined;
    const clientSecret = formData.client_secret as string | undefined;
    const redirectUri = formData.redirect_uri as string;

    if (grantType !== "authorization_code") {
        Logger.warn("Invalid grant type", { grantType });
        return c.json({ error: "unsupported_grant_type" }, 400);
    }

    // Look up the authorization code first to get the actual client_id
    Logger.debug("Looking up authorization code", { code });
    const codeDataObj = await c.env.LOGIN_STORAGE.get(`codes/${code}.json`);
    if (!codeDataObj) {
        Logger.error("Authorization code not found", { code });
        return c.json({ error: "invalid_grant" }, 400);
    }

    const codeData = JSON.parse(await codeDataObj.text());
    Logger.debug("Authorization code found", codeData);

    // Use the client_id from the authorization code
    const effectiveClientId = codeData.clientId;

    // Validate client_id if provided
    if (!validateClientId(clientId, effectiveClientId)) {
        Logger.error("Client ID mismatch", { clientId, effectiveClientId });
        return c.json({ error: "invalid_grant" }, 400);
    }

    // Validate client_secret if provided
    if (clientSecret) {
        const secretValidation = await validateClientSecret(c.env, effectiveClientId, clientSecret);
        if (!secretValidation.valid) {
            return c.json(
                { error: "invalid_client", error_description: secretValidation.error },
                401,
            );
        }
    }

    // Verify redirect URI matches
    if (codeData.redirectUri !== redirectUri) {
        Logger.error("Redirect URI mismatch", { codeData, redirectUri });
        return c.json({ error: "invalid_grant" }, 400);
    }

    if (codeData.expires < Date.now()) {
        Logger.error("Authorization code expired", codeData);
        return c.json({ error: "invalid_grant" }, 400);
    }

    Logger.debug("Deleting used authorization code");
    await c.env.LOGIN_STORAGE.delete(`codes/${code}.json`);

    Logger.debug("Getting RSA key pair for JWT signing");
    const { privateKey, publicJwk } = await getOrCreateKeyPair(c.env);
    const now = Math.floor(Date.now() / 1000);
    Logger.debug("Key pair obtained", { kid: publicJwk.kid });

    const accessToken = crypto.randomUUID();
    const accessTokenData = {
        sub: codeData.sub,
        email: codeData.email,
        expires: Date.now() + 3600000,
    };

    await c.env.LOGIN_STORAGE.put(
        `access_tokens/${accessToken}.json`,
        JSON.stringify(accessTokenData),
    );

    const protocol = c.req.header("X-Forwarded-Proto") || "https";
    const host = c.req.header("Host");
    const issuer = `${protocol}://${host}`;

    const idToken = await signJWT(
        {
            iss: issuer,
            sub: codeData.sub,
            aud: effectiveClientId,
            exp: now + 3600,
            iat: now,
            email: codeData.email,
        },
        privateKey,
        publicJwk.kid || "",
    );

    const response = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        id_token: idToken,
        scope: "openid profile email",
    };

    Logger.info("Token exchange successful", { effectiveClientId, codeData });

    Logger.debug("Token response details", response);

    return c.json(response);
});

export default token;
