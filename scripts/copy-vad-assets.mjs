#!/usr/bin/env node
/**
 * Copies browser-only assets for @ricky0123/vad-web and onnxruntime-web to
 * ./public/vad so they can be served by the dev server / deployed hosting.
 */
import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/vad");
mkdirSync(outDir, { recursive: true });

const files = [
  ["@ricky0123/vad-web/dist/vad.worklet.bundle.min.js", "vad.worklet.bundle.min.js"],
  ["@ricky0123/vad-web/dist/vad.worklet.bundle.dev.js", "vad.worklet.bundle.dev.js"],
  ["@ricky0123/vad-web/dist/silero_vad_v5.onnx", "silero_vad_v5.onnx"],
  ["@ricky0123/vad-web/dist/silero_vad_legacy.onnx", "silero_vad_legacy.onnx"],
  ["@ricky0123/vad-web/dist/silero_vad_v6.onnx", "silero_vad_v6.onnx"],
];

for (const [from, to] of files) {
  try {
    cpSync(resolve(root, "node_modules", from), resolve(outDir, to), { force: true });
  } catch {
    // Missing model variants are fine if unused.
  }
}

// onnxruntime-web wasm files (matching the vad-web ^1.17 range).
const ortDir = resolve(root, "node_modules/onnxruntime-web/dist");
try {
  const all = await import("node:fs").then((fs) =>
    fs.readdirSync(ortDir).filter((f) => /^ort-wasm.*\.(mjs|wasm)$/.test(f)),
  );
  for (const f of all) cpSync(resolve(ortDir, f), resolve(outDir, f), { force: true });
} catch {
  /* not critical */
}

console.log("VAD assets copied to ./public/vad");
