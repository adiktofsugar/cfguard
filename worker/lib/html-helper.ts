import type { Context } from "hono";

// Static fallback HTML
const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CFGuard</title>
</head>
<body>
    <div id="app"></div>
    <!--BACKEND_DATA-->
</body>
</html>`;

/**
 * Generates HTML with injected backend data
 * @param c - Hono context
 * @param entryName - Name of the entry point (e.g., "authorize", "callback")
 * @param title - Page title (not used with Vite-generated HTML)
 * @param backendData - Data to inject into the template
 * @returns HTML response with injected data
 */
export async function fetchAndInjectHTML(
    c: Context<{ Bindings: Env }>,
    entryName: string,
    title: string,
    backendData: unknown,
): Promise<Response> {
    // Create the script tag with backend data
    const backendDataScript = `<script>
        window.__BACKEND_DATA__ = ${JSON.stringify(JSON.stringify(backendData))};
    </script>`;
    
    try {
        // Map entry names to HTML file paths
        // Vite outputs HTML files to dist/client/app/pages/{entryName}/index.html
        // The ASSETS binding serves from dist/client directory
        const htmlPath = `/app/pages/${entryName}/index.html`;
        
        // Create a proper URL for the ASSETS fetch
        // We need to use the full URL with the correct path
        const assetUrl = new URL(c.req.url);
        assetUrl.pathname = htmlPath;
        
        // Fetch HTML from ASSETS binding
        const assetResponse = await c.env.ASSETS.fetch(
            new Request(assetUrl.toString())
        );
        
        if (!assetResponse.ok) {
            throw new Error(`Failed to fetch HTML for ${entryName}: ${assetResponse.status} ${assetResponse.statusText}`);
        }
        
        const template = await assetResponse.text();
        
        // Replace the placeholder with the actual data
        const html = template.replace("<!--BACKEND_DATA-->", backendDataScript);
        
        return c.html(html);
    } catch (error) {
        console.error(`Failed to fetch HTML for ${entryName}:`, error);
        // Use fallback HTML
        const html = FALLBACK_HTML.replace("<!--BACKEND_DATA-->", backendDataScript);
        return c.html(html);
    }
}