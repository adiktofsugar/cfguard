import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [preact(), cloudflare()],
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "index.html"),
                authorize: path.resolve(__dirname, "app/routes/authorize/index.html"),
                callback: path.resolve(__dirname, "app/routes/callback/index.html"),
                dev: path.resolve(__dirname, "dev/index.html"),
            },
        },
    },
});
