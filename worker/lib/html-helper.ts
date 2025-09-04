import type { Metafile } from "esbuild";
import type { Context } from "hono";
import metaActual from "../generated/metafile.json";

// the json is too strongly typed to be useful
const meta = metaActual as unknown as Metafile;

/**
 * Gets the assets for a given entry point from the metafile
 */
function getAssetsForEntryPoint(entryName: string) {
    const js: string[] = [];
    const css: string[] = [];

    for (const [outputPath, output] of Object.entries(meta.outputs)) {
        if (output.entryPoint === entryName) {
            // The outputPath is like "dist/assets/authorize.js"
            // We need to serve it as "/assets/authorize.js"
            const jsPath = outputPath.replace("dist", "");
            js.push(jsPath);

            // Add CSS bundle if exists
            if (output.cssBundle) {
                const cssPath = output.cssBundle.replace("dist", "");
                css.push(cssPath);
            }
        }
    }

    return { js, css };
}

/**
 * Generates HTML with injected backend data and asset references
 * @param c - Hono context
 * @param entryName - Name of the entry point (e.g., "authorize", "callback")
 * @param title - Page title
 * @param backendData - Data to inject into the template
 * @returns HTML response with injected data and assets
 */
export async function fetchAndInjectHTML(
    c: Context<{ Bindings: Env }>,
    entryName: string,
    title: string,
    backendData: unknown,
): Promise<Response> {
    const { js, css } = getAssetsForEntryPoint(`app/pages/${entryName}/main.tsx`);

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${css.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n    ")}
    <script>
        window.__BACKEND_DATA__ = ${JSON.stringify(JSON.stringify(backendData))};
    </script>
</head>
<body>
    <div id="app"></div>
    ${js.map((src) => `<script type="module" src="${src}"></script>`).join("\n    ")}
</body>
</html>`;

    return c.html(html);
}
