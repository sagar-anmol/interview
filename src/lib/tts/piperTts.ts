"use client";

/**
 * Browser-side Piper TTS.
 *
 * Weights are fetched once from Hugging Face and then live permanently in the
 * browser's Origin Private File System (OPFS) — no server, no API key, no
 * per-request cost. The ONNX runtime and the espeak-ng phonemizer are served
 * from our own origin (`/vad` and `/piper`) so no third-party CDN is on the
 * critical path.
 *
 * Library: @mintplex-labs/piper-tts-web (Piper compiled to wasm + a worker).
 * The module-level `predict()` helper does not let us choose wasm locations,
 * so we drive `TtsSession` directly.
 */

import type { TtsSession } from "@mintplex-labs/piper-tts-web";
import { voiceBytes } from "./voices";

type PiperModule = typeof import("@mintplex-labs/piper-tts-web");

export type PiperStatus =
  | "unsupported"
  | "idle"
  | "downloading"
  | "warming"
  | "ready"
  | "error";

export interface PiperSnapshot {
  status: PiperStatus;
  voiceId: string;
  loaded: number;
  total: number;
  error?: string;
}

const listeners = new Set<() => void>();

let snapshot: PiperSnapshot = {
  status: "idle",
  voiceId: "",
  loaded: 0,
  total: 0,
};

let modulePromise: Promise<PiperModule> | null = null;
let session: TtsSession | null = null;
let warming: Promise<boolean> | null = null;
let ortConfigured = false;

/** espeak-ng phonemizer: 18MB data blob + ~0.6MB wasm. */
const PHONEMIZER_BYTES = 18_077_249 + 635_212;

/** TRT WebAssembly we ship ourselves. */
const ONNX_WASM_BASE = "/vad/";

const PHONEMIZER = {
  data: "/piper/piper_phonemize.data",
  wasm: "/piper/piper_phonemize.wasm",
};

function emit() {
  for (const fn of listeners) fn();
}

function patch(next: Partial<PiperSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

export function getPiperSnapshot(): PiperSnapshot {
  return snapshot;
}

export function subscribePiper(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** OPFS needs a secure context; Safari below 16 has no `navigator.storage`. */
export function isPiperSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "storage" in navigator &&
    typeof navigator.storage?.getDirectory === "function" &&
    typeof WebAssembly !== "undefined" &&
    typeof Worker !== "undefined"
  );
}

/**
 * onnxruntime-web is a singleton module: the library imports the same copy we
 * do, so configuring it here applies to its sessions too.
 */
async function configureOrt() {
  if (ortConfigured) return;
  ortConfigured = true;
  try {
    const mod = await import("onnxruntime-web/wasm");
    const ort = ((mod as { default?: unknown }).default ?? mod) as {
      env?: { wasm?: Record<string, unknown>; allowLocalModels?: boolean };
    };
    if (!ort?.env?.wasm) return;
    // Multi-threaded ORT needs SharedArrayBuffer, which is only available
    // cross-origin-isolated. Falling back to one thread keeps us working.
    const threads =
      typeof SharedArrayBuffer !== "undefined" && self.crossOriginIsolated
        ? Math.min(4, navigator.hardwareConcurrency || 1)
        : 1;
    ort.env.wasm.wasmPaths = ONNX_WASM_BASE;
    ort.env.wasm.numThreads = threads;
    ort.env.wasm.simd = true;
    if ("allowLocalModels" in ort.env) ort.env.allowLocalModels = false;
  } catch (error) {
    console.warn("[piper] ort config skipped", error);
  }
}

async function loadModule(): Promise<PiperModule> {
  if (!modulePromise) {
    modulePromise = import("@mintplex-labs/piper-tts-web");
  }
  return modulePromise;
}

/** Voices whose weights are already in OPFS. */
export async function listStoredVoices(): Promise<string[]> {
  if (!isPiperSupported()) return [];
  try {
    const mod = await loadModule();
    return await mod.stored();
  } catch {
    return [];
  }
}

export async function removeVoice(voiceId: string) {
  const mod = await loadModule();
  await mod.remove(voiceId);
}

export async function flushVoices() {
  const mod = await loadModule();
  await mod.flush();
}

/**
 * Pulls the phonemizer into the HTTP cache first so the wasm loader that
 * `TtsSession` performs later is served from cache. Reports real bytes.
 */
async function prefetchPhonemizer(
  onBytes: (bytes: number) => void,
): Promise<void> {
  await Promise.all(
    Object.values(PHONEMIZER).map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          onBytes(value.byteLength);
        }
      } catch {
        /* the worker fetches it directly anyway */
      }
    }),
  );
}

/**
 * Downloads the voice weights and builds the inference session so the first
 * spoken sentence has no start-up cost. Resolves false when TTS cannot be
 * used, in which case the caller falls back to Web Speech.
 */
export async function warmUpPiper(
  voiceId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<boolean> {
  if (!isPiperSupported()) {
    patch({ status: "unsupported", voiceId });
    return false;
  }
  if (session) {
    patch({ status: "ready", voiceId, loaded: 1, total: 1 });
    return true;
  }
  if (warming) return warming;

  const total = voiceBytes(voiceId) + PHONEMIZER_BYTES;
  patch({ status: "downloading", voiceId, loaded: 0, total });

  const run = async (): Promise<boolean> => {
    try {
      const mod = await loadModule();
      await configureOrt();

      let cached = 0;
      await prefetchPhonemizer((chunk) => {
        cached += chunk;
        onProgress?.(cached, total);
      });

      patch({ status: "warming", loaded: cached, total });
      const created = await mod.TtsSession.create({
        voiceId,
        wasmPaths: {
          onnxWasm: ONNX_WASM_BASE,
          piperData: PHONEMIZER.data,
          piperWasm: PHONEMIZER.wasm,
        },
        logger: (text: string) => console.debug("[piper]", text),
        progress: (p) => {
          if (p.url.endsWith(".onnx")) {
            const loaded = PHONEMIZER_BYTES + p.loaded;
            patch({ loaded: Math.min(loaded, total), total });
            onProgress?.(loaded, total);
          }
        },
      });
      session = created;
      patch({ status: "ready", loaded: total, total });
      return true;
    } catch (error) {
      console.error("[piper] warm-up failed", error);
      patch({
        status: "error",
        error: error instanceof Error ? error.message : "Piper warm-up failed",
      });
      return false;
    }
  };

  const promise = run();
  warming = promise;
  try {
    return await promise;
  } finally {
    warming = null;
  }
}

export function isPiperReady(): boolean {
  return session !== null;
}

/** Returns a WAV ArrayBuffer, or null when Piper is unavailable. */
export async function synthesizeSpeech(
  text: string,
): Promise<ArrayBuffer | null> {
  const current = session ?? (await warmUpPiper(snapshot.voiceId) ? session : null);
  if (!current) return null;
  try {
    const blob = await current.predict(text);
    if (!blob || blob.size < 200) return null;
    return await blob.arrayBuffer();
  } catch (error) {
    console.warn("[piper] synthesis failed", error);
    return null;
  }
}

export function resetPiper() {
  session = null;
  patch({ status: "idle", loaded: 0, total: 0 });
}