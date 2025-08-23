import crypto from "node:crypto";
import { expect, test } from "@playwright/test";

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, "base64").toString();
}

function parseJWT(token: string) {
  const parts = token.split(".");
  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    payload: JSON.parse(base64UrlDecode(parts[1])),
    signature: parts[2],
  };
}

test.describe("OIDC Provider Flow", () => {
  const clientId = "test-client";
  const redirectUri = "https://example.com/callback";
  const state = crypto.randomBytes(16).toString("hex");

  test("should expose discovery endpoint", async ({ request }) => {
    const response = await request.get("/.well-known/openid-configuration");
    expect(response.ok()).toBeTruthy();

    const config = await response.json();
    expect(config.issuer).toBe("https://auth.sackof.rocks");
    expect(config.authorization_endpoint).toBe("https://auth.sackof.rocks/authorize");
    expect(config.token_endpoint).toBe("https://auth.sackof.rocks/token");
    expect(config.userinfo_endpoint).toBe("https://auth.sackof.rocks/userinfo");
    expect(config.jwks_uri).toBe("https://auth.sackof.rocks/.well-known/jwks.json");
    expect(config.response_types_supported).toContain("code");
    expect(config.id_token_signing_alg_values_supported).toContain("RS256");
  });

  test("should expose JWKS endpoint", async ({ request }) => {
    const response = await request.get("/.well-known/jwks.json");
    expect(response.ok()).toBeTruthy();

    const jwks = await response.json();
    expect(jwks.keys).toBeInstanceOf(Array);
    expect(jwks.keys.length).toBeGreaterThan(0);

    const key = jwks.keys[0];
    expect(key.kty).toBe("RSA");
    expect(key.use).toBe("sig");
    expect(key.alg).toBe("RS256");
    expect(key.kid).toBeTruthy();
    expect(key.n).toBeTruthy();
    expect(key.e).toBeTruthy();
  });

  test("should show login form on authorization request", async ({ page }) => {
    await page.goto(
      `/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`,
    );

    await expect(page.locator("h1")).toContainText("Sign In");
    await expect(page.locator(".client-info")).toContainText(clientId);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should reject invalid authorization parameters", async ({ request }) => {
    const response = await request.get("/authorize?client_id=test&response_type=invalid");
    expect(response.status()).toBe(400);
  });

  test("should complete full authorization code flow", async ({ page, request, context }) => {
    // Use localhost redirect URI for testing
    const testRedirectUri = "http://localhost:8787/callback";

    // 1. Start authorization
    await page.goto(
      `/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(testRedirectUri)}&response_type=code&state=${state}`,
    );

    // 2. Fill and submit login form
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "password");

    // Submit form and wait for redirect
    await Promise.all([
      page.waitForURL((url) => url.href.includes("/callback"), { timeout: 5000 }),
      page.click('button[type="submit"]'),
    ]);

    // Extract code from URL
    const url = new URL(page.url());
    const authCode = url.searchParams.get("code");
    const capturedState = url.searchParams.get("state");

    expect(authCode).toBeTruthy();
    expect(capturedState).toBe(state);

    // 3. Exchange code for tokens
    const tokenResponse = await request.post("/token", {
      form: {
        grant_type: "authorization_code",
        code: authCode!,
        client_id: clientId,
        client_secret: "test-secret",
        redirect_uri: testRedirectUri,
      },
    });

    expect(tokenResponse.ok()).toBeTruthy();
    const tokens = await tokenResponse.json();

    expect(tokens.access_token).toBeTruthy();
    expect(tokens.token_type).toBe("Bearer");
    expect(tokens.expires_in).toBe(3600);
    expect(tokens.id_token).toBeTruthy();

    // 4. Verify ID token structure
    const idToken = parseJWT(tokens.id_token);
    expect(idToken.header.alg).toBe("RS256");
    expect(idToken.header.typ).toBe("JWT");
    expect(idToken.payload.iss).toBe("https://auth.sackof.rocks");
    expect(idToken.payload.aud).toBe(clientId);
    expect(idToken.payload.sub).toBeTruthy();
    expect(idToken.payload.name).toBe("Admin User");
    expect(idToken.payload.email).toBe("admin@example.com");

    // 5. Test userinfo endpoint
    const userinfoResponse = await request.get("/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    expect(userinfoResponse.ok()).toBeTruthy();
    const userinfo = await userinfoResponse.json();

    expect(userinfo.sub).toBe(idToken.payload.sub);
    expect(userinfo.name).toBe("Admin User");
    expect(userinfo.email).toBe("admin@example.com");
    expect(userinfo.email_verified).toBe(true);
    expect(userinfo.preferred_username).toBe("admin");
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.goto(
      `/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`,
    );

    await page.fill('input[name="username"]', "invalid");
    await page.fill('input[name="password"]', "wrong");
    await page.click('button[type="submit"]');

    await expect(page.locator("body")).toContainText("Invalid credentials");
  });

  test("should reject invalid authorization code", async ({ request }) => {
    const response = await request.post("/token", {
      form: {
        grant_type: "authorization_code",
        code: "invalid-code",
        client_id: clientId,
        client_secret: "test-secret",
        redirect_uri: redirectUri,
      },
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toBe("invalid_grant");
  });

  test("should reject unauthorized userinfo request", async ({ request }) => {
    const response = await request.get("/userinfo", {
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("should reject unsupported grant type", async ({ request }) => {
    const response = await request.post("/token", {
      form: {
        grant_type: "password",
        username: "admin",
        password: "password",
      },
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toBe("unsupported_grant_type");
  });
});
