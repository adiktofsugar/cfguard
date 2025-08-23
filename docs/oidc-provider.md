# OIDC Provider Implementation for Cloudflare Access

## Goal

Implement a Cloudflare Worker as an OpenID Connect (OIDC) provider to enable custom authentication for R2 bucket access protected by Cloudflare Access. This approach allows:

- Custom login UI and authentication logic
- Cookie-based session management for R2 access
- Direct R2 access after initial authentication (no per-file presigned URLs)
- Seamless user experience with Instant Auth (bypasses Access's provider selection)

## Architecture Overview

```
User → R2 Domain → Cloudflare Access → Worker OIDC Provider → Back to Access → R2 Access Granted
                   (Instant Auth)       (Custom Auth)         (CF_Authorization cookie)
```

## Required Endpoints

Your Worker must implement the following endpoints to act as an OIDC provider:

### 1. Discovery Endpoint
**GET `/.well-known/openid-configuration`**

Returns OIDC provider metadata. Access uses this to discover your endpoints.

**Response (200 OK, application/json):**
```json
{
  "issuer": "https://auth.example.workers.dev",
  "authorization_endpoint": "https://auth.example.workers.dev/authorize",
  "token_endpoint": "https://auth.example.workers.dev/token",
  "userinfo_endpoint": "https://auth.example.workers.dev/userinfo",
  "jwks_uri": "https://auth.example.workers.dev/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "email", "profile"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
  "claims_supported": ["sub", "email", "email_verified", "name", "preferred_username", "nonce"]
}
```

### 2. JWKS Endpoint
**GET `/.well-known/jwks.json`**

Returns public keys for JWT signature verification.

**Response (200 OK, application/json):**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "key-1",
      "alg": "RS256",
      "n": "<base64url-encoded-modulus>",
      "e": "<base64url-encoded-exponent>"
    }
  ]
}
```

**Implementation Notes:**
- Generate an RSA key pair (store private key in Worker secret)
- The `kid` (key ID) must match the one used in JWT headers
- Use crypto.subtle.exportKey() to get public key components

### 3. Authorization Endpoint
**GET `/authorize`**

Handles user authentication and authorization code generation.

**Request Parameters (query string):**
- `response_type`: Always "code" for authorization code flow
- `client_id`: Cloudflare Access application ID
- `redirect_uri`: Always `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`
- `state`: Random value from Access (must be returned unchanged)
- `scope`: Space-separated scopes (must include "openid")
- `nonce`: Random value from Access (must be included in ID token)

**Implementation Flow:**
```javascript
async function handleAuthorize(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  // 1. Validate required parameters
  const requiredParams = ['response_type', 'client_id', 'redirect_uri', 'state', 'scope'];
  for (const param of requiredParams) {
    if (!params.get(param)) {
      return new Response('Missing ' + param, { status: 400 });
    }
  }
  
  // 2. Check if user has existing session
  const sessionCookie = getCookie(request, 'session_id');
  const session = sessionCookie ? await getSession(env, sessionCookie) : null;
  
  if (!session) {
    // 3. Show login form (preserve all parameters in form action)
    return new Response(generateLoginHTML(url.toString()), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // 4. Generate authorization code
  const code = crypto.randomUUID();
  const codeData = {
    user_id: session.user_id,
    client_id: params.get('client_id'),
    redirect_uri: params.get('redirect_uri'),
    nonce: params.get('nonce'),
    scope: params.get('scope')
  };
  
  await storeCode(env, code, codeData);
  
  // 5. Redirect back to Access
  const redirectUrl = new URL(params.get('redirect_uri'));
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', params.get('state'));
  
  return Response.redirect(redirectUrl.toString(), 302);
}
```

### 4. Login Handler
**POST `/login`**

Processes login form submission (called by your custom login page).

**Request Body (application/x-www-form-urlencoded):**
- `username`: User's username/email
- `password`: User's password
- `return_to`: Original authorize URL with all parameters

**Implementation:**
```javascript
async function handleLogin(request, env) {
  const formData = await request.formData();
  
  // 1. Validate credentials (implement your auth logic)
  const user = await validateCredentials(
    formData.get('username'),
    formData.get('password')
  );
  
  if (!user) {
    return new Response('Invalid credentials', { status: 401 });
  }
  
  // 2. Create session
  const sessionId = crypto.randomUUID();
  await storeSession(env, sessionId, {
    user_id: user.id,
    email: user.email,
    name: user.name
  });
  
  // 3. Redirect back to authorize endpoint with session cookie
  return Response.redirect(formData.get('return_to'), 302, {
    headers: {
      'Set-Cookie': `session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
    }
  });
}
```

### 5. Token Endpoint
**POST `/token`**

Exchanges authorization code for tokens.

**Request Headers:**
- `Content-Type`: application/x-www-form-urlencoded
- `Authorization`: Basic auth with client credentials (optional, can use body params)

**Request Body:**
- `grant_type`: Always "authorization_code"
- `code`: Authorization code from redirect
- `client_id`: Cloudflare Access application ID
- `client_secret`: Configured secret (if using confidential client)
- `redirect_uri`: Must match original redirect_uri

**Response (200 OK, application/json):**
```json
{
  "access_token": "<jwt-access-token>",
  "id_token": "<jwt-id-token>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Implementation:**
```javascript
async function handleToken(request, env) {
  const formData = await request.formData();
  
  // 1. Validate grant type
  if (formData.get('grant_type') !== 'authorization_code') {
    return jsonError('unsupported_grant_type');
  }
  
  // 2. Retrieve and validate code
  const code = formData.get('code');
  const codeData = await consumeCode(env, code);
  
  if (!codeData) {
    return jsonError('invalid_grant');
  }
  
  // 3. Validate client and redirect_uri
  if (formData.get('client_id') !== codeData.client_id ||
      formData.get('redirect_uri') !== codeData.redirect_uri) {
    return jsonError('invalid_grant');
  }
  
  // 4. Get user data
  const userData = await getUserData(codeData.user_id);
  
  // 5. Generate tokens
  const idToken = await generateIdToken({
    sub: codeData.user_id,
    email: userData.email,
    name: userData.name,
    nonce: codeData.nonce,
    aud: codeData.client_id,
    iss: 'https://auth.example.workers.dev',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  });
  
  const accessToken = await generateAccessToken({
    sub: codeData.user_id,
    scope: codeData.scope,
    aud: codeData.client_id,
    iss: 'https://auth.example.workers.dev',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  });
  
  return new Response(JSON.stringify({
    access_token: accessToken,
    id_token: idToken,
    token_type: 'Bearer',
    expires_in: 3600
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 6. UserInfo Endpoint
**GET `/userinfo`**

Returns user information for the access token.

**Request Headers:**
- `Authorization`: Bearer <access_token>

**Response (200 OK, application/json):**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "preferred_username": "username"
}
```

## JWT Token Generation

Both ID tokens and access tokens must be signed JWTs.

**Required JWT Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-1"
}
```

**ID Token Claims (required):**
- `iss`: Your issuer URL
- `sub`: User's unique identifier
- `aud`: Client ID from request
- `exp`: Expiration timestamp (Unix epoch)
- `iat`: Issued at timestamp
- `nonce`: Nonce from authorization request (REQUIRED for OIDC)

**Signing Implementation:**
```javascript
async function generateIdToken(claims) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: 'key-1'
  };
  
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(claims));
  const message = encodedHeader + '.' + encodedPayload;
  
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64ToArrayBuffer(env.RSA_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(message)
  );
  
  return message + '.' + base64url(signature);
}
```

## Storage Requirements

Use Cloudflare R2 bucket for storing session data and authorization codes. This avoids KV's eventual consistency delays and Durable Objects costs.

### R2 Storage Structure

1. **Sessions** (`sessions/<session_id>.json`):
   - User information
   - Expiration timestamp
   - Clean up expired sessions periodically

2. **Authorization Codes** (`codes/<code>.json`):
   - User ID
   - Client ID
   - Redirect URI
   - Nonce
   - Scope
   - Expiration timestamp (60 seconds)
   - Delete after use or expiration

3. **Access Tokens** (`tokens/<token>.json`) (optional):
   - User ID
   - Scope
   - Client ID
   - Expiration timestamp

### R2 Implementation Example

```javascript
// Bind R2 bucket in wrangler.toml
// [[r2_buckets]]
// binding = "AUTH_STORAGE"
// bucket_name = "auth-storage"

async function storeSession(env, sessionId, userData) {
  const sessionData = {
    ...userData,
    expires_at: Date.now() + 86400000 // 24 hours
  };
  
  await env.AUTH_STORAGE.put(
    `sessions/${sessionId}.json`,
    JSON.stringify(sessionData)
  );
}

async function getSession(env, sessionId) {
  const object = await env.AUTH_STORAGE.get(`sessions/${sessionId}.json`);
  if (!object) return null;
  
  const data = JSON.parse(await object.text());
  
  // Check expiration
  if (Date.now() > data.expires_at) {
    await env.AUTH_STORAGE.delete(`sessions/${sessionId}.json`);
    return null;
  }
  
  return data;
}

async function storeCode(env, code, codeData) {
  const data = {
    ...codeData,
    expires_at: Date.now() + 60000 // 60 seconds
  };
  
  await env.AUTH_STORAGE.put(
    `codes/${code}.json`,
    JSON.stringify(data)
  );
}

async function consumeCode(env, code) {
  const object = await env.AUTH_STORAGE.get(`codes/${code}.json`);
  if (!object) return null;
  
  const data = JSON.parse(await object.text());
  
  // Delete immediately (one-time use)
  await env.AUTH_STORAGE.delete(`codes/${code}.json`);
  
  // Check expiration
  if (Date.now() > data.expires_at) {
    return null;
  }
  
  return data;
}
```

### Cleanup Strategy

Since R2 doesn't have automatic TTL/expiration, implement a cleanup strategy:

1. **Lazy cleanup**: Check expiration when retrieving items
2. **Periodic cleanup**: Create a scheduled worker (cron trigger) to delete expired items
3. **Aggressive cleanup**: Delete authorization codes immediately after use

```javascript
// Scheduled cleanup (add to wrangler.toml)
// [triggers]
// crons = ["0 * * * *"] # Every hour

async function cleanupExpired(env) {
  const now = Date.now();
  
  // List and check all objects
  const listed = await env.AUTH_STORAGE.list({
    prefix: 'codes/'
  });
  
  for (const object of listed.objects) {
    const data = await env.AUTH_STORAGE.get(object.key);
    const parsed = JSON.parse(await data.text());
    
    if (now > parsed.expires_at) {
      await env.AUTH_STORAGE.delete(object.key);
    }
  }
}
```

## Security Considerations

1. **HTTPS Only**: All endpoints must use HTTPS
2. **State Parameter**: Always validate and return the state parameter unchanged
3. **Nonce Validation**: Include nonce in ID token to prevent replay attacks
4. **Code Expiration**: Authorization codes must expire within 1-10 minutes
5. **One-Time Codes**: Delete authorization codes after use
6. **Secure Cookies**: Use HttpOnly, Secure, and SameSite flags
7. **PKCE Support** (optional but recommended): Implement code_challenge validation
8. **Rate Limiting**: Implement rate limiting on login attempts
9. **Client Secret**: Store and validate client secrets securely

## Cloudflare Access Configuration

1. **Add Generic OIDC Provider**:
   - Go to Zero Trust → Settings → Authentication
   - Add Generic OpenID Connect
   - Auth URL: `https://auth.example.workers.dev/authorize`
   - Token URL: `https://auth.example.workers.dev/token`
   - Client ID: Generate a unique ID
   - Client Secret: Generate a secure secret

2. **Enable Instant Auth**:
   - In your Access application settings
   - Enable "Instant Auth" to skip provider selection
   - Users go directly to your Worker login

3. **Configure Access Policy**:
   - Create policy for R2 bucket domain
   - Use the OIDC provider as authentication method
   - Access will handle CF_Authorization cookie after successful auth

## Testing Checklist

1. [ ] Discovery endpoint returns valid JSON
2. [ ] JWKS endpoint returns public key
3. [ ] Authorization endpoint shows login form for unauthenticated users
4. [ ] Login creates session and redirects with code
5. [ ] Token endpoint exchanges code for valid JWT
6. [ ] ID token includes nonce from authorization request
7. [ ] JWT signatures validate with public key
8. [ ] Authorization codes expire and are single-use
9. [ ] State parameter is preserved through flow
10. [ ] Access successfully authenticates and issues CF_Authorization cookie