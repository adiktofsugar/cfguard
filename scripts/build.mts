#!/usr/bin/env tsx
import * as esbuild from "esbuild";
import fs from "fs/promises";
import minimist from "minimist";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const usage = `
Usage: tsx scripts/build.mts [options]

Options:
  --dev       Run in development mode with watch and wrangler dev
  --help, -h  Show this help message
`;

const argv = minimist(process.argv.slice(2), {
    boolean: ["dev", "help"],
    alias: { h: "help" },
});

if (argv.help) {
    console.log(usage);
    process.exit(0);
}

const isDev = argv.dev;

async function build() {
    const entryPoints = {
        authorize: "./app/routes/authorize/main.tsx",
        callback: "./app/routes/callback/main.tsx",
        dev: "./app/routes/dev/main.tsx",
        main: "./app/routes/main/main.tsx",
    };

    const metafilePath = fileURLToPath(
        new URL("../worker/generated/metafile.json", import.meta.url),
    );
    const buildOptions: esbuild.BuildOptions = {
        entryPoints,
        bundle: true,
        outdir: "./dist/assets",
        publicPath: "/assets",
        format: "esm",
        splitting: true,
        minify: !isDev,
        sourcemap: true,
        metafile: true,
        define: {
            "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
        },
        entryNames: "[dir]/[name].[hash]",
        logLevel: "info",
        plugins: [
            {
                name: "metafile-writer",
                setup(build) {
                    build.onEnd(async (result) => {
                        if (!result.metafile) {
                            throw new Error(`No metafile somehow`);
                        }
                        await fs.mkdir(path.dirname(metafilePath), { recursive: true });
                        await fs.writeFile(metafilePath, JSON.stringify(result.metafile, null, 2));
                    });
                },
            },
        ],
    };

    if (isDev) {
        let wrangler: ChildProcess;

        // Build once initially
        await esbuild.build(buildOptions);
        console.log("Initial build complete");

        // Start esbuild in watch mode
        const ctx = await esbuild.context(buildOptions);
        ctx.watch();

        console.log("ESBuild watching for changes...");

        // Start wrangler dev with local environment
        wrangler = spawn("wrangler", ["dev"], {
            stdio: "inherit",
            shell: true,
        });

        // When wrangler exits, dispose the esbuild context and exit
        wrangler.on("exit", async (code) => {
            console.log("Wrangler exited, cleaning up...");
            await ctx.dispose();
            process.exit(code || 0);
        });

        // Handle cleanup on process termination
        let isCleaningUp = false;
        const cleanup = async () => {
            if (isCleaningUp) return;
            isCleaningUp = true;

            console.log("\nShutting down...");

            // First dispose esbuild context to stop watching
            await ctx.dispose();

            // Then kill wrangler
            if (wrangler && !wrangler.killed) {
                wrangler.kill();
            }

            process.exit(0);
        };

        process.on("SIGINT", () => {
            cleanup().catch(console.error);
        });

        process.on("SIGTERM", () => {
            cleanup().catch(console.error);
        });
    } else {
        await esbuild.build(buildOptions);
        console.log("Build complete. Metafile written to dist/metafile.json");
    }
}

build().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
