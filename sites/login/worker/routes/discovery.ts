import { Hono } from "hono";
import type { Env } from "../interfaces";
import { getOrCreateKeyPair } from "../lib/keys";

const discovery = new Hono<{ Bindings: Env }>();

discovery.get("/.well-known/openid-configuration", async (c) => {
    const protocol = c.req.header("X-Forwarded-Proto") || "https";
    const host = c.req.header("Host");
    const issuer = `${protocol}://${host}`;
    
    return c.json({
        issuer: issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
        jwks_uri: `${issuer}/.well-known/jwks.json`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        scopes_supported: ["openid", "profile", "email"],
        token_endpoint_auth_methods_supported: ["client_secret_post"],
        claims_supported: [
            "sub",
            "name",
            "email",
            "email_verified",
            "preferred_username",
        ],
    });
});

discovery.get("/.well-known/jwks.json", async (c) => {
    const { publicJwk } = await getOrCreateKeyPair(c.env);
    return c.json({
        keys: [publicJwk],
    });
});

export default discovery;