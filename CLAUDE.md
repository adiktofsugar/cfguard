# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

cfguard is a Cloudflare Workers-based authentication system that serves static sites with OpenID Connect (OIDC) authentication. It implements a complete OIDC provider that integrates with Cloudflare Access.

## Common Development Commands

### Development
```bash
npm run dev:login      # Start login site dev server
npm run dev:hello      # Start hello-world site dev server
```

### Build & Deploy
```bash
npm run build          # Build all sites with Turbo
npm run deploy         # Deploy all sites to Cloudflare
```

### Testing & Quality
```bash
npm run test           # Run Playwright E2E tests
npm run lint           # Run Biome linter and TypeScript checks
npm run fix            # Auto-fix linting issues
npm test -- --ui      # Run tests with UI
npm test -- tests/login.spec.mts  # Run specific test file
```

### Workspace-specific commands (run from root)
```bash
npm run build -w sites/login       # Build specific workspace
npm run dev -w sites/hello-world   # Run dev server for specific site
```

## Architecture

### Monorepo Structure
- **sites/**: Individual Cloudflare Workers sites (npm workspaces)
  - **login/**: OIDC provider implementation
  - **hello-world/**: Example site with Preact + MobX

### Site Architecture Pattern
Each site follows this structure:
- **worker/**: Hono-based backend API routes
  - **routes/**: Individual route handlers
  - **index.mts**: Main worker entry point
- **app/**: Frontend Preact applications
  - **routes/**: Frontend route components
  - Multiple HTML entry points (index.html, authorize.html, etc.)
- **public/**: Static assets served directly
- **scripts/build.mts**: Custom build script (for login site)

### OIDC Implementation (sites/login)
Key endpoints:
- `/.well-known/openid-configuration`: Discovery endpoint
- `/.well-known/jwks.json`: Public key endpoint
- `/authorize`: Authorization endpoint
- `/token`: Token exchange endpoint
- `/userinfo`: User information endpoint

### Frontend Build System
- Vite with multiple HTML entry points
- Preact for lightweight React alternative
- MobX for state management (hello-world)
- Preact Signals for reactive state

### TypeScript Configuration
- Project references for incremental builds
- Strict type checking enabled
- Interfaces in separate `interfaces.ts` files

## Important Conventions

- Use minimist to parse argv