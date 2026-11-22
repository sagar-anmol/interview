"use client";

import * as React from "react";

export interface IntegrationState {
  done: boolean;
  loaded: number;
  total: number;
}

const ASSETS: { url: string; sizeKb: number }[] = [
  { url: "/vad/silero_vad_v5.onnx", sizeKb: 900 },
  { url: "/vad/silero_vad_v6.onnx", sizeKb: 900 },
  { url: "/vad/silero_vad_legacy.onnx", sizeKb: 800 },
  { url: "/vad/vad.worklet.bundle.min.js", sizeKb: 12 },
  { url: "/vad/ort-wasm-simd-threaded.mjs", sizeKb: 60 },
  { url: "/vad/ort-wasm-simd-threaded.wasm", sizeKb: 5200 },
  { url: "/vad/ort-wasm-simd-threaded.jsep.mjs", sizeKb: 80 },
  { url: "/vad/ort-wasm-simd-threaded.jsep.wasm", sizeKb: 5200 },
  { url: "/vad/ort-wasm-simd-threaded.jspi.mjs", sizeKb: 90 },
  { url: "/vad/ort-wasm-simd-threaded.jspi.wasm", sizeKb: 5100 },
  { url: "/vad/ort-wasm-simd-threaded.asyncify.mjs", sizeKb: 90 },
  { url: "/vad/ort-wasm-simd-threaded.asyncify.wasm", sizeKb: 5100 },
];

const listeners = new Set<() => void>();
const emit = () => {
  for (const fn of listeners) fn();
};

export function onIntegrationChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let state: IntegrationState = { done: false, loaded: 0, total: 0 };
let started = false;

/**
 * Downloads the runtime assets (Silero VAD + ORT WebAssembly) in the
 * background right after the website loads, so that when the user reaches
 * the integration check screen they are already (mostly) done.
 * Runs at most once per browser session.
 */
export function startBackgroundDownload() {
  if (started || typeof window === "undefined") return;
  if (sessionStorage.getItem("sd-integration-started") === "1") {
    state = { done: true, loaded: 1, total: 1 };
    emit();
    return;
  }
  sessionStorage.setItem("sd-integration-started", "1");
  started = true;
  void runDownloads();
}

export function isIntegrationDone() {
  return state.done;
}

export function getIntegrationState(): IntegrationState {
  return state;
}

async function runDownloads() {
  for (const item of ASSETS) {
    let loadedNow = 0;
    try {
      const res = await fetch(item.url);
      if (!res.ok) throw new Error(`${item.url} -> ${res.status}`);
      const body = res.body;
      if (body) {
        const reader = body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          loadedNow += value.byteLength;
        }
      }
      const header = Number(res.headers.get("content-length"));
      state = {
        done: state.done,
        loaded: state.loaded + Math.min(loadedNow, item.sizeKb * 1024),
        total: state.total + Math.max(header || item.sizeKb * 1024, loadedNow),
      };
    } catch (error) {
      console.warn("[integration] download failed", item.url, error);
    }
    emit();
    if (state.loaded >= state.total && state.total > 0) break;
  }
  state = { done: true, loaded: state.total > 0 ? state.total : 1, total: state.total || 1 };
  emit();
}

void React;
