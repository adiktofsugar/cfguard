# Pages

I want to use preact for my pages, vite to build them, and workers for my backend. What's weird about this setup is getting the backend data into the html. My basic idea is to just serve the built html from the worker, with some backend data injected into `window.__backend_data__` which then goes into the component as a "backendData" prop. This system lets my treat my pages as components, so I _should_ be able to see them in a storybook-like view.

A big issue with this is how things get served, and how vite / workers don't really want to make a multi-page app, especially with the cloudflare plugin.

## storybook-like system

If it was just JS, I could just have a sidebar and a "main" area that rendered the component, but because of CSS, I somehow need to point at whatever my dependent CSS is.

One option is to require it in every component.

Another option is to make an HOC, like `homePage`, `basePage`, etc., that just pulls in CSS.

Another option is to magically detect it.

## implementation: current

currently the implementation is to have the frontend portion in `app/pages/<page>/index.html`. I can set up my vite config easily using `fs.readdirSync` this way.

The main problem is that it doesn't work with the cloudflare vite plugin, so I need to run vite and wrangler at the same time.

A secondary problem is that it's odd sharing interfaces since you'd kind of want a home page scoped "BackendData" but you may need to share things like a "Client".

## implementation: SPA + react-router

I _could_ do this normally and use react-router or something instead. Getting the backend data would need to happen via api call, though. If I go this route, the simplest way to pass info from the backend is probably through query parameters.

## implementation: SSR SPA

This is how cloudflare supports this kind of setup, apparently. There's experimental support for the vite plugin. I think that this _basically_ just always calls the worker rather than using a combination.
