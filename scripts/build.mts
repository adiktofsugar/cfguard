#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";
// @ts-expect-error - has no types
import esbuildHtmlLink from "esbuild-html-link";
import minimist from "minimist";
import { fileURLToPath } from "url";

const usage = `
Usage: tsx scripts/build.mts [options]

Build the worker bundle and Preact app using esbuild

Options:
  -h, --help     Show this help message
  --watch        Watch for changes and rebuild
  --minify       Minify the output
`;

const argv = minimist(process.argv.slice(2), {
  boolean: ["help", "watch", "minify"],
  alias: {
    h: "help",
  },
});

if (argv.help) {
  console.log(usage);
  process.exit(0);
}

const absWorkingDir = fileURLToPath(new URL("..", import.meta.url));
const workerOptions: esbuild.BuildOptions = {
  absWorkingDir,
  entryPoints: ["worker/src/index.*"],
  outdir: "worker/dist",
  bundle: true,
  minify: argv.minify,
  logLevel: "info",
  format: "esm",
};

const appOptions: esbuild.BuildOptions = {
  absWorkingDir,
  entryPoints: ["app/src/index.*"],
  outdir: "app/dist",
  bundle: true,
  minify: argv.minify,
  logLevel: "info",
  jsx: "automatic",
  jsxImportSource: "preact",
  format: "esm",
  loader: {
    ".html": "copy",
  },
  metafile: true,
  plugins: [
    {
      name: "esbuild-html-link",
      setup(build) {
        build.onEnd((result) => {
          const metafileRelpath = "app/dist/meta.json";
          fs.writeFileSync(
            path.resolve(absWorkingDir, metafileRelpath),
            JSON.stringify(result.metafile),
          );
          esbuildHtmlLink(absWorkingDir, {
            metafileRelpath,
          });
        });
      },
    },
  ],
};

if (argv.watch) {
  const workerContext = await esbuild.context(workerOptions);
  const appContext = await esbuild.context(appOptions);
  await Promise.all([workerContext.watch(), appContext.watch()]);
} else {
  await Promise.all([esbuild.build(workerOptions), esbuild.build(appOptions)]);
}
