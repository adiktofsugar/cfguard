#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Log, LogLevel, Miniflare } from "miniflare";
import minimist from "minimist";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usage = `
Usage: scripts/dev-server.mts [OPTIONS]

Run a local development server simulating Cloudflare Workers environment

Options:
  -p, --port PORT      Port to run the server on (default: 8787)
  -v, --verbose        Enable verbose logging
  -h, --help           Show this help message
`;

const argv = minimist(process.argv.slice(2), {
  alias: {
    p: "port",
    w: "worker",
    v: "verbose",
    h: "help",
  },
  default: {
    port: 8787,
  },
  boolean: ["verbose", "help"],
});

if (argv.help) {
  console.log(usage);
  process.exit(0);
}

const port = parseInt(argv.port, 10);
if (Number.isNaN(port)) {
  console.error("Error: Invalid port number");
  process.exit(1);
}

const workerPath = fileURLToPath(new URL("../worker/dist/index.js", import.meta.url));
const logLevel = argv.verbose ? LogLevel.DEBUG : LogLevel.INFO;

async function waitForFile(filepath: string, maxWaitMs = 60000): Promise<void> {
  const startTime = Date.now();

  while (!fs.existsSync(filepath)) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Timeout waiting for file: ${filepath}`);
    }

    console.log(`⏳ Waiting for worker file to be built: ${filepath}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

if (!fs.existsSync(workerPath)) {
  console.log(`Worker file not found at ${workerPath}`);
  console.log("Waiting for the build to complete...");

  try {
    await waitForFile(workerPath);
    console.log("✅ Worker file found!");
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    console.error("Please ensure the build is running");
    process.exit(1);
  }
}

console.log(`Starting Cloudflare Worker dev server...`);
console.log(`Worker file: ${workerPath}`);
console.log(`Port: ${port}`);

let mf: Miniflare | null = null;

async function startMiniflare() {
  if (mf) {
    await mf.dispose();
  }

  mf = new Miniflare({
    modules: true,
    scriptPath: workerPath,
    port,
    log: new Log(logLevel),

    compatibilityFlags: ["nodejs_compat"],

    bindings: {
      ENVIRONMENT: "development",
    },

    cache: true,
    cacheWarnUsage: true,
  });

  await mf.ready;
  return mf;
}

await startMiniflare();

console.log(`\n✨ Worker running at http://localhost:${port}`);
console.log(`Watching for changes to ${workerPath}...`);
console.log("Press Ctrl+C to stop\n");

let debounceTimer: NodeJS.Timeout | null = null;

fs.watchFile(workerPath, { interval: 1000 }, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      console.log(`\n🔄 Worker file changed, restarting server...`);
      try {
        await startMiniflare();
        console.log(`✨ Server restarted successfully\n`);
      } catch (error) {
        console.error(`❌ Failed to restart server:`, error);
      }
    }, 100);
  }
});

process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  fs.unwatchFile(workerPath);
  if (mf) {
    await mf.dispose();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  fs.unwatchFile(workerPath);
  if (mf) {
    await mf.dispose();
  }
  process.exit(0);
});
