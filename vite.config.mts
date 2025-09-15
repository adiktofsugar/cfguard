import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import legacy from "@vitejs/plugin-legacy";
import path from "node:path";

export default defineConfig({
    plugins: [
        preact(),
        legacy({
            targets: ["safari 5", "chrome 30"], // Very old WebKit versions            additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
            renderLegacyChunks: true,
            renderModernChunks: false,
            polyfills: true,
        }),
    ],
    build: {
        rollupOptions: {
            input: {
                authorize: path.resolve("app/pages/authorize/index.html"),
                callback: path.resolve("app/pages/callback/index.html"),
                dev: path.resolve("app/pages/dev/index.html"),
                main: path.resolve("app/pages/main/index.html"),
                "authorize-external": path.resolve("app/pages/authorize-external/index.html"),
            },
        },
        modulePreload: false,
    },
});
