export interface Env {
  AUTH_STORAGE: R2Bucket;
  ISSUER: string;
}

async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
}

async function exportJWK(key: CryptoKey): Promise<JsonWebKey> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  jwk.kid = crypto.randomUUID();
  jwk.use = "sig";
  jwk.alg = "RS256";
  return jwk;
}

async function getOrCreateKeyPair(
  env: Env,
): Promise<{ privateKey: CryptoKey; publicJwk: JsonWebKey }> {
  const storedKey = await env.AUTH_STORAGE.get("signing-key.json");

  if (storedKey) {
    const keyData = JSON.parse(await storedKey.text());
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      keyData.privateJwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["sign"],
    );
    return { privateKey, publicJwk: keyData.publicJwk };
  }

  const keyPair = await generateRSAKeyPair();
  const privateJwk = await exportJWK(keyPair.privateKey);
  const publicJwk = await exportJWK(keyPair.publicKey);

  await env.AUTH_STORAGE.put(
    "signing-key.json",
    JSON.stringify({
      privateJwk,
      publicJwk,
    }),
  );

  return { privateKey: keyPair.privateKey, publicJwk };
}

function base64UrlEncode(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function signJWT(payload: any, privateKey: CryptoKey, kid: string): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid,
  };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));

  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(message),
  );

  return `${message}.${base64UrlEncode(signature)}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashString = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashString === storedHash;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // OIDC Discovery endpoint
    if (url.pathname === "/.well-known/openid-configuration") {
      return new Response(
        JSON.stringify({
          issuer: env.ISSUER,
          authorization_endpoint: `${env.ISSUER}/authorize`,
          token_endpoint: `${env.ISSUER}/token`,
          userinfo_endpoint: `${env.ISSUER}/userinfo`,
          jwks_uri: `${env.ISSUER}/.well-known/jwks.json`,
          response_types_supported: ["code"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
          scopes_supported: ["openid", "profile", "email"],
          token_endpoint_auth_methods_supported: ["client_secret_post"],
          claims_supported: ["sub", "name", "email", "email_verified", "preferred_username"],
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // JWKS endpoint
    if (url.pathname === "/.well-known/jwks.json") {
      const { publicJwk } = await getOrCreateKeyPair(env);
      return new Response(
        JSON.stringify({
          keys: [publicJwk],
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Authorization endpoint
    if (url.pathname === "/authorize" && request.method === "GET") {
      const clientId = url.searchParams.get("client_id");
      const redirectUri = url.searchParams.get("redirect_uri");
      const state = url.searchParams.get("state");
      const responseType = url.searchParams.get("response_type");

      if (!clientId || !redirectUri || responseType !== "code") {
        return new Response("Invalid request", { status: 400 });
      }

      // Return login form
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .login-container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
    }
    h1 {
      margin-top: 0;
      color: #333;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #5a67d8;
    }
    .client-info {
      margin-bottom: 1.5rem;
      padding: 0.75rem;
      background: #f7fafc;
      border-radius: 4px;
      font-size: 0.9rem;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>Sign In</h1>
    <div class="client-info">
      Signing in to <strong>${clientId}</strong>
    </div>
    <form method="POST" action="/login">
      <input type="hidden" name="client_id" value="${clientId}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="state" value="${state || ""}">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" required autofocus>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Login handler
    if (url.pathname === "/login" && request.method === "POST") {
      const formData = await request.formData();
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;
      const clientId = formData.get("client_id") as string;
      const redirectUri = formData.get("redirect_uri") as string;
      const state = formData.get("state") as string;

      // Check user credentials
      const userKey = `user:${username}`;
      const userDataObj = await env.AUTH_STORAGE.get(userKey);

      let validLogin = false;
      let userData: any = null;

      if (userDataObj) {
        userData = JSON.parse(await userDataObj.text());
        validLogin = await verifyPassword(password, userData.passwordHash);
      } else if (username === "admin" && password === "password") {
        // Default admin user - create on first login
        const passwordHash = await hashPassword(password);
        userData = {
          sub: crypto.randomUUID(),
          username: "admin",
          passwordHash,
          name: "Admin User",
          email: "admin@example.com",
          email_verified: true,
        };
        await env.AUTH_STORAGE.put(userKey, JSON.stringify(userData));
        validLogin = true;
      }

      if (!validLogin) {
        return new Response("Invalid credentials", { status: 401 });
      }

      // Generate authorization code
      const code = crypto.randomUUID();
      const codeData = {
        clientId,
        redirectUri,
        sub: userData.sub,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        email_verified: userData.email_verified,
        expires: Date.now() + 600000, // 10 minutes
      };

      await env.AUTH_STORAGE.put(`code:${code}`, JSON.stringify(codeData), {
        expirationTtl: 600,
      });

      // Redirect back to client
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set("code", code);
      if (state) {
        redirectUrl.searchParams.set("state", state);
      }

      return Response.redirect(redirectUrl.toString(), 302);
    }

    // Token endpoint
    if (url.pathname === "/token" && request.method === "POST") {
      const formData = await request.formData();
      const grantType = formData.get("grant_type");
      const code = formData.get("code") as string;
      const clientId = formData.get("client_id") as string;
      const clientSecret = formData.get("client_secret") as string;
      const redirectUri = formData.get("redirect_uri") as string;

      if (grantType !== "authorization_code") {
        return new Response(JSON.stringify({ error: "unsupported_grant_type" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify authorization code
      const codeDataObj = await env.AUTH_STORAGE.get(`code:${code}`);
      if (!codeDataObj) {
        return new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const codeData = JSON.parse(await codeDataObj.text());

      if (codeData.clientId !== clientId || codeData.redirectUri !== redirectUri) {
        return new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (codeData.expires < Date.now()) {
        return new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Delete used code
      await env.AUTH_STORAGE.delete(`code:${code}`);

      // Generate tokens
      const { privateKey, publicJwk } = await getOrCreateKeyPair(env);
      const now = Math.floor(Date.now() / 1000);

      const accessToken = crypto.randomUUID();
      const accessTokenData = {
        sub: codeData.sub,
        username: codeData.username,
        name: codeData.name,
        email: codeData.email,
        email_verified: codeData.email_verified,
        expires: Date.now() + 3600000, // 1 hour
      };

      await env.AUTH_STORAGE.put(`access_token:${accessToken}`, JSON.stringify(accessTokenData), {
        expirationTtl: 3600,
      });

      const idToken = await signJWT(
        {
          iss: env.ISSUER,
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
        publicJwk.kid!,
      );

      return new Response(
        JSON.stringify({
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 3600,
          id_token: idToken,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Userinfo endpoint
    if (url.pathname === "/userinfo" && request.method === "GET") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response("Unauthorized", { status: 401 });
      }

      const accessToken = authHeader.substring(7);
      const tokenDataObj = await env.AUTH_STORAGE.get(`access_token:${accessToken}`);

      if (!tokenDataObj) {
        return new Response("Unauthorized", { status: 401 });
      }

      const tokenData = JSON.parse(await tokenDataObj.text());

      if (tokenData.expires < Date.now()) {
        return new Response("Unauthorized", { status: 401 });
      }

      return new Response(
        JSON.stringify({
          sub: tokenData.sub,
          name: tokenData.name,
          email: tokenData.email,
          email_verified: tokenData.email_verified,
          preferred_username: tokenData.username,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Callback endpoint for testing - just return a simple success page
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      return new Response(
        `
<!DOCTYPE html>
<html>
<head>
  <title>Callback</title>
</head>
<body>
  <h1>Authorization Successful</h1>
  <p>Code: ${code}</p>
  <p>State: ${state}</p>
</body>
</html>`,
        {
          headers: { "Content-Type": "text/html" },
        },
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
