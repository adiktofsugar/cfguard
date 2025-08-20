# cfguard

The goal of this project is to have a simple way to deploy a static site, but with authentication.

To that end, we want to deploy a cloudflare worker with a provided "static" folder. So, this would be used like so:

```bash
cfguard ./site
```

The "site" directory should have a "public" top level folder where all your assets (that don't need auth) live. This is important if you care about staying under the 100k daily request limit.

The worker that gets deployed will serve everything from "public", but all other requests will go through the worker and be served only if authenticated.

## Authentication
Authentication is done by...