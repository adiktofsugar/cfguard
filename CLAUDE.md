# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

cfguard is a Cloudflare Workers-based OpenID Connect (OIDC) provider that serves as a complete authentication system. It implements standard OIDC endpoints and integrates with Cloudflare Access, using R2 for storage and Hono for routing.

## Common Development Commands

```bash
npm run dev            # Start development server with watch mode
npm run build          # Production build
npm run deploy         # Build and deploy to Cloudflare
npm run test           # Run Playwright E2E tests  
npm run lint           # Run Biome linter and TypeScript checks
npm run fix            # Auto-fix linting issues
npm run types          # Generate Cloudflare Workers types
npm test -- --ui      # Run tests with UI
npm test -- __tests__/oidc-flow.spec.ts  # Run specific test file
```

## Architecture

### Project Structure
- **worker/**: Hono-based backend API
  - **routes/**: OIDC endpoint handlers (authorize, token, userinfo, discovery, callback)
  - **lib/**: Utilities (crypto, jwt, keys, html-helper)
  - **interfaces.ts**: TypeScript type definitions
- **app/**: Frontend Preact applications with multiple entry points
  - **routes/**: Separate apps (main, authorize, callback, dev)
  - **components/**: Shared Preact components
- **scripts/build.mts**: Custom esbuild script with watch mode
- **__tests__/**: Playwright E2E tests for OIDC flows

### OIDC Implementation
Standard endpoints:
- `/.well-known/openid-configuration`: Discovery endpoint
- `/.well-known/jwks.json`: Public key endpoint  
- `/authorize`: Authorization endpoint with login form
- `/token`: Token exchange endpoint
- `/userinfo`: User information endpoint

### Storage Strategy
Uses Cloudflare R2 bucket (`LOGIN_STORAGE` binding):
- User data: `user:username` keys
- Authorization codes: `code:uuid` keys (10-minute expiry)
- Client configurations: `clients/client-id.json` files
- RSA key pairs for JWT signing

### Build System
- Custom esbuild script with multiple entry points (authorize, callback, dev, main)
- Frontend data injection pattern: `<!--BACKEND_DATA-->` placeholder
- Code splitting with hash-based filenames
- Vite for additional frontend tooling

### Testing Approach
Comprehensive E2E testing of OIDC flows:
- Discovery and JWKS endpoint validation
- Full authorization flow (login → code → token)
- JWT structure and signature validation
- Protected resource access testing
- Error handling for invalid credentials/codes

## Important Conventions

- Use minimist to parse argv in scripts
- All interfaces in separate `interfaces.ts` files
- 4-space indentation (configured in Biome)
- No TypeScript `any` types or `as` assertions
- Use `path.method()` instead of destructured imports
- Frontend-backend data injection via window.__BACKEND_DATA__
- Default admin user: `admin/password` for initial setup