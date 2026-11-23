"use client";

import * as React from "react";
import { AudioQueue } from "@/lib/audio/audioQueue";
import {
  getPiperSnapshot,
  isPiperReady,
  isPiperSupported,
  listStoredVoices,
  removeVoice,
  subscribePiper,
  synthesizeSpeech,
  warmUpPiper,
  type PiperSnapshot,
} from "@/lib/tts/piperTts";
import { DEFAULT_VOICE_ID, VOICES, voiceBytes } from "@/lib/tts/voices";

const MB = 1_048_576;

export function TtsPlayground() {
  const [snapshot, setSnapshot] = React.useState<PiperSnapshot>(getPiperSnapshot);
  const [voiceId, setVoiceId] = React.useState(DEFAULT_VOICE_ID);
  const [stored, setStored] = React.useState<string[]>([]);
  const [text, setText] = React.useState(
    "Walk me through how a write request travels through your architecture, end to end.",
  );
  const [busy, setBusy] = React.useState(false);
  const [log, setLog] = React.useState<string[]>([]);
  const [synthMs, setSynthMs] = React.useState<number | null>(null);
  const [wavKb, setWavKb] = React.useState<number | null>(null);

  const queueRef = React.useRef<AudioQueue | null>(null);
  const append = (line: string) =>
    setLog((prev) => [
      `${new Date().toISOString().slice(11, 19)}  ${line}`,
      ...prev.slice(0, 40),
    ]);

  React.useEffect(() => {
    const unsub = subscribePiper(() => setSnapshot(getPiperSnapshot()));
    void listStoredVoices().then(setStored);
    return unsub;
  }, []);

  const supported = isPiperSupported();
  const warm = isPiperReady();

  React.useEffect(() => {
    if (!queueRef.current) queueRef.current = new AudioQueue();
    return () => {
      queueRef.current?.destroy();
      queueRef.current = null;
    };
  }, []);

  const handleWarmUp = async () => {
    setBusy(true);
    append(`warm-up ${voiceId}`);
    const ok = await warmUpPiper(voiceId, (loaded, total) => {
      if (loaded === total || loaded % 8 < 1) {
        append(`  ${(loaded / MB).toFixed(1)} / ${(total / MB).toFixed(1)} MB`);
      }
    });
    append(ok ? "warm-up ok" : "warm-up FAILED");
    setStored(await listStoredVoices());
    setBusy(false);
  };

  const handleSpeak = async () => {
    const queue = queueRef.current;
    if (!queue) return;
    setBusy(true);
    await queue.resume();
    const started = performance.now();
    const wav = await synthesizeSpeech(text);
    const elapsed = Math.round(performance.now() - started);
    setSynthMs(elapsed);
    if (!wav) {
      append("synthesis returned null");
      setBusy(false);
      return;
    }
    setWavKb(Math.round(wav.byteLength / 1024));
    append(`synthesized ${Math.round(wav.byteLength / 1024)} KB in ${elapsed} ms`);
    await queue.enqueueAudio("preview", text, wav);
    setBusy(false);
  };

  const handleRemove = async (id: string) => {
    setBusy(true);
    await removeVoice(id);
    setStored(await listStoredVoices());
    append(`removed ${id}`);
    setBusy(false);
  };

  const percent =
    snapshot.total > 0
      ? Math.min(100, Math.round((snapshot.loaded / snapshot.total) * 100))
      : 0;

  return (
    <main className="h-screen overflow-y-auto bg-background p-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-7">
        <header className="flex flex-col gap-1.5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-500">
            Dev tool
          </span>
          <h1 className="text-[19px] font-medium text-slate-900">
            Voice playground
          </h1>
          <p className="text-[12px] text-slate-500">
            Verifies the browser speech pipeline: audio files download into
            local storage, the voice warms, and synthesis returns real audio.
          </p>
        </header>

        <section className="flex flex-col gap-2.5 rounded-lg border border-line bg-panel p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Runtime
            </span>
            <span className="font-mono text-[10.5px] text-slate-600">
              {supported ? "Local storage supported" : "Local storage unavailable"}
              {warm ? " · warm" : ""}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full border border-line-strong bg-white">
            <div
              className="absolute inset-y-0 left-0 bg-amber-400 transition-[width]"
              style={{ width: `${snapshot.status === "ready" ? 100 : percent}%` }}
            />
          </div>
          <div className="font-mono text-[10.5px] text-slate-500">
            {snapshot.status} · {(snapshot.loaded / MB).toFixed(1)} /{" "}
            {(snapshot.total / MB).toFixed(1)} MB
            {snapshot.error ? ` · ${snapshot.error}` : ""}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Voice
            </span>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="rounded border border-line-strong bg-white px-2.5 py-1.5 font-mono text-[11.5px] text-slate-900"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.label} ({(voiceBytes(v.id) / MB).toFixed(0)} MB
                  {stored.includes(v.id) ? ", cached" : ""})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Text
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="resize-none rounded border border-line-strong bg-white px-2.5 py-2 text-[12.5px] text-slate-900"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void handleWarmUp()}
              disabled={busy || !supported}
              className="rounded border border-line-strong px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Download + warm
            </button>
            <button
              onClick={() => void handleSpeak()}
              disabled={busy || !text.trim()}
              className="rounded border border-emerald-500/40 bg-emerald-600/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-emerald-600 hover:bg-emerald-600/20 disabled:opacity-40"
            >
              Speak
            </button>
          </div>

          {synthMs !== null ? (
            <div className="font-mono text-[10.5px] text-slate-500">
              last synthesis: {synthMs} ms · {wavKb} KB wav
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            Cached in this browser ({stored.length})
          </span>
          {stored.length === 0 ? (
            <span className="text-[12px] text-slate-500">nothing cached yet</span>
          ) : (
            stored.map((id) => (
              <div key={id} className="flex items-center gap-2">
                <span className="font-mono text-[11.5px] text-slate-700">{id}</span>
                <button
                  onClick={() => void handleRemove(id)}
                  disabled={busy}
                  className="ml-auto rounded border border-line px-2 py-0.5 font-mono text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  delete
                </button>
              </div>
            ))
          )}
        </section>

        <section className="flex flex-col gap-1 rounded-lg border border-line bg-panel p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            Log
          </span>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed text-slate-500">
            {log.length ? log.join("\n") : "—"}
          </pre>
        </section>
      </div>
    </main>
  );
}