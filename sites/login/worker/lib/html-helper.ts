import type { Context } from "hono";
import type { Env } from "../interfaces";

/**
 * Fetches an HTML template from static assets and injects backend data
 * @param c - Hono context
 * @param routePath - Path to the HTML file in the client directory (e.g., "/app/routes/authorize/index.html")
 * @param backendData - Data to inject into the template
 * @returns HTML response with injected data
 */
export async function fetchAndInjectHTML(
    c: Context<{ Bindings: Env }>,
    routePath: string,
    backendData: unknown,
): Promise<Response> {
    // Build the URL for the static asset
    const url = new URL(c.req.url);
    url.pathname = `/client${routePath}`;
    
    // Fetch the HTML template from static assets
    const htmlResponse = await c.env.ASSETS.fetch(new Request(url));
    if (!htmlResponse.ok) {
        return c.text(`Template not found: ${routePath}`, 500);
    }
    
    // Replace the backend data placeholder
    let html = await htmlResponse.text();
    html = html.replace('"<!--BACKEND_DATA-->"', JSON.stringify(JSON.stringify(backendData)));
    
    return c.html(html);
}