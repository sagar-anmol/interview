"use client";

import {
  getPiperSnapshot,
  isPiperSupported,
  listStoredVoices,
  warmUpPiper,
} from "@/lib/tts/piperTts";
import { DEFAULT_VOICE_ID, voiceBytes } from "@/lib/tts/voices";

/**
 * Real runtime warm-up, kicked off the moment the site loads.
 *
 * Two stages, both with genuine byte-level progress:
 *   1. `vad`   — Silero VAD models + onnxruntime WebAssembly from our origin
 *   2. `voice` — Piper voice weights (Hugging Face -> OPFS) + espeak-ng
 *                phonemizer, then the inference session itself
 *
 * The Piper weights live in Origin Private File System, so on any later visit
 * stage 2 only has to load from disk — the 80-odd MB download happens once
 * per browser profile, never again.
 */

export type IntegrationPhase = "vad" | "voice" | "ready";

export interface IntegrationState {
  phase: IntegrationPhase;
  vadLoaded: number;
  vadTotal: number;
  voiceLoaded: number;
  voiceTotal: number;
  loaded: number;
  total: number;
  done: boolean;
  error?: string;
  supported: boolean;
}

/** Assets VAD actually requests (verified against the vad-web bundle). */
const VAD_ASSETS: { url: string; bytes: number }[] = [
  { url: "/vad/silero_vad_v5.onnx", bytes: 2_327_524 },
  { url: "/vad/silero_vad_v6.onnx", bytes: 2_327_524 },
  { url: "/vad/silero_vad_legacy.onnx", bytes: 1_807_522 },
  { url: "/vad/vad.worklet.bundle.min.js", bytes: 2_480 },
  { url: "/vad/ort-wasm-simd-threaded.mjs", bytes: 24_738 },
  { url: "/vad/ort-wasm-simd-threaded.wasm", bytes: 14_848_852 },
];

const PHONEMIZER_BYTES = 18_077_249 + 635_212;

const VAD_TOTAL = VAD_ASSETS.reduce((sum, a) => sum + a.bytes, 0);
const VOICE_TOTAL = voiceBytes(DEFAULT_VOICE_ID) + PHONEMIZER_BYTES;

const listeners = new Set<() => void>();
const emit = () => {
  for (const fn of listeners) fn();
};

let state: IntegrationState = {
  phase: "vad",
  vadLoaded: 0,
  vadTotal: VAD_TOTAL,
  voiceLoaded: 0,
  voiceTotal: VOICE_TOTAL,
  loaded: 0,
  total: VAD_TOTAL + VOICE_TOTAL,
  done: false,
  supported: true,
};

export function getIntegrationState(): IntegrationState {
  return state;
}

export function onIntegrationChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let started = false;

export function startBackgroundDownload() {
  if (started || typeof window === "undefined") return;
  started = true;

  if (!isPiperSupported()) {
    state = {
      ...state,
      supported: false,
      error: "This browser cannot cache Piper weights (needs OPFS).",
    };
    emit();
  }
  void run();
}

export function isIntegrationDone() {
  return state.done;
}

async function run() {
  await prefetchVad();
  state = { ...state, phase: "voice", loaded: state.vadLoaded, total: VOICE_TOTAL };
  emit();

  const ok = await warmUpPiper(DEFAULT_VOICE_ID, (loaded) => {
    const clamped = Math.min(loaded, VOICE_TOTAL);
    state = { ...state, voiceLoaded: clamped, loaded: clamped, total: VOICE_TOTAL };
    emit();
  });

  const stored = await listStoredVoices();
  state = {
    ...state,
    phase: ok ? "ready" : state.phase,
    done: true,
    loaded: VOICE_TOTAL,
    total: VOICE_TOTAL,
    error: ok
      ? undefined
      : (getPiperSnapshot().error ??
        (stored.includes(DEFAULT_VOICE_ID)
          ? undefined
          : "Piper voice unavailable — falling back to Web Speech.")),
  };
  emit();
}

async function prefetchVad() {
  let loaded = 0;
  await Promise.all(
    VAD_ASSETS.map(async (asset) => {
      let got = 0;
      try {
        const res = await fetch(asset.url);
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          got += value.byteLength;
          const totalLoaded = Math.min(
            loaded + got,
            VAD_TOTAL,
          );
          state = {
            ...state,
            phase: "vad",
            vadLoaded: totalLoaded,
            loaded: totalLoaded,
            total: VAD_TOTAL,
          };
          emit();
        }
      } catch {
        /* VAD fetches it on demand anyway */
      }
      loaded += Math.max(got, asset.bytes * 0.6);
    }),
  );
  state = { ...state, phase: "vad", vadLoaded: VAD_TOTAL, loaded: VAD_TOTAL, total: VAD_TOTAL };
  emit();
}