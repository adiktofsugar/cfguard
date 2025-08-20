#!/usr/bin/env tsx

import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import httpProxy from "http-proxy";
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

async function getAvailablePort(startPort = 10000, endPort = 60000): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    const isAvailable = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "127.0.0.1");
    });
    
    if (isAvailable) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${endPort}`);
}

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

let mf: Miniflare | null = null;
let miniflarePort: number;
let proxy: httpProxy | null = null;
let server: http.Server | null = null;

async function startMiniflare() {
  if (mf) {
    await mf.dispose();
  }

  miniflarePort = await getAvailablePort();
  
  mf = new Miniflare({
    modules: true,
    scriptPath: workerPath,
    port: miniflarePort,
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

async function startProxyServer() {
  if (proxy) {
    proxy.close();
  }
  
  proxy = httpProxy.createProxyServer({});
  
  proxy.on("error", (err, req, res) => {
    console.error("Proxy error:", err);
    if (res && !res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Proxy error");
    }
  });

  if (server) {
    server.close();
  }

  const app = express();
  
  // Serve static files from app/dist at /cfguard
  const appDistPath = fileURLToPath(new URL("../app/dist", import.meta.url));
  app.use("/cfguard", express.static(appDistPath));
  
  // Serve static files from site/public at /public
  const publicPath = fileURLToPath(new URL("../site/public", import.meta.url));
  app.use("/public", express.static(publicPath));
  
  // Proxy all other requests to Miniflare
  app.use((req, res) => {
    proxy.web(req, res, { target: `http://localhost:${miniflarePort}` });
  });

  server = http.createServer(app);
  server.listen(port);
}

await startMiniflare();
await startProxyServer();

console.log(`\n✨ Dev server running at http://localhost:${port}`);
console.log(`   - /cfguard/* → app/dist/`);
console.log(`   - /public/* → site/public/`);
console.log(`   - All other requests → Miniflare worker (port ${miniflarePort})`);
console.log(`\nWatching for changes to ${workerPath}...`);
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
        await startProxyServer();
        console.log(`✨ Server restarted successfully on port ${port} (Miniflare on ${miniflarePort})\n`);
      } catch (error) {
        console.error(`❌ Failed to restart server:`, error);
      }
    }, 100);
  }
});

process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  fs.unwatchFile(workerPath);
  if (server) {
    server.close();
  }
  if (proxy) {
    proxy.close();
  }
  if (mf) {
    await mf.dispose();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  fs.unwatchFile(workerPath);
  if (server) {
    server.close();
  }
  if (proxy) {
    proxy.close();
  }
  if (mf) {
    await mf.dispose();
  }
  process.exit(0);
});
