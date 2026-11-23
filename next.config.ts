import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    // The Piper phonemizer (@diffusionstudio/piper-wasm) is an Emscripten build
    // whose Node branches still `require("fs")` / `require("path")`. They never
    // execute in the worker it runs in, but the bundler must be able to resolve
    // them, so alias both to browser stubs.
    resolveAlias: {
      fs: { browser: "./src/lib/tts/nodeShims/fs.js" },
      path: { browser: "./src/lib/tts/nodeShims/path.js" },
    },
  },
  // Same guard for webpack builds (e.g. when someone builds with --no-turbopack).
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

export default nextConfig;
