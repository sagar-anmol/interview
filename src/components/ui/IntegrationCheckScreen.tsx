"use client";

import * as React from "react";
import {
  getIntegrationState,
  onIntegrationChange,
  type IntegrationState,
} from "@/lib/integration/integrationManager";
import { isPiperReady } from "@/lib/tts/piperTts";
import { DEFAULT_VOICE_ID } from "@/lib/tts/voices";
import { cn } from "@/lib/utils";

const MB = 1_048_576;

/**
 * Pre-flight screen shown before an interview starts. Everything it displays
 * is real: the bytes below came off the network, and the Piper weights stay
 * in the browser (OPFS) after the first visit.
 */
export function IntegrationCheckScreen({ onDone }: { onDone: () => void }) {
  const [state, setState] = React.useState<IntegrationState>(getIntegrationState);
  const [seconds, setSeconds] = React.useState(0);
  const [closing, setClosing] = React.useState(false);

  React.useEffect(() => {
    const unsub = onIntegrationChange(() => setState(getIntegrationState()));
    return unsub;
  }, []);

  React.useEffect(() => {
    if (state.done) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [state.done]);

  const finish = React.useCallback(() => {
    setClosing(true);
    onDone();
  }, [onDone]);

  // Auto-dismiss once both stages are warm. Cached visits finish almost
  // instantly; the first visit keeps the screen up for a moment so the
  // numbers are readable rather than flashing past.
  React.useEffect(() => {
    if (!state.done || closing) return;
    const t = setTimeout(finish, state.vadTotal + state.voiceTotal > 0 ? 350 : 700);
    return () => clearTimeout(t);
  }, [state.done, closing, finish, state.vadTotal, state.voiceTotal]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  if (closing) return null;

  const phaseTotal = state.phase === "ready" ? state.voiceTotal : state.total;
  const phaseLoaded = state.phase === "ready" ? state.voiceLoaded : state.loaded;
  const percent = phaseTotal > 0 ? Math.min(100, Math.round((phaseLoaded / phaseTotal) * 100)) : 0;

  const stages = [
    {
      id: "vad",
      label: "Silero VAD + ONNX runtime",
      detail: `${(state.vadLoaded / MB).toFixed(1)} / ${(state.vadTotal / MB).toFixed(1)} MB`,
      complete: state.vadLoaded >= state.vadTotal && state.phase !== "vad",
      size: state.vadTotal,
    },
    {
      id: "voice",
      label: `Piper voice · ${DEFAULT_VOICE_ID}`,
      detail:
        state.voiceLoaded > 0
          ? `${(state.voiceLoaded / MB).toFixed(1)} / ${(state.voiceTotal / MB).toFixed(1)} MB`
          : state.phase === "voice"
            ? "starting…"
            : "pending",
      complete: state.done,
      size: state.voiceTotal,
    },
    {
      id: "session",
      label: "Inference session warm",
      detail: state.phase === "ready" ? "cached in this browser" : state.phase === "voice" ? "held until download finishes" : "Queued",
      complete: state.done,
    },
  ];

  const piperReady = isPiperReady();
  const cached = state.done && piperReady;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-[2px]">
      <div className="flex max-w-lg flex-col gap-5 p-7">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              state.done ? "bg-emerald-500 animate-live" : "bg-amber-400 animate-pulse",
            )}
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
            Integration check
          </span>
        </div>

        <h2 className="text-[19px] font-medium tracking-tight text-zinc-100">
          {state.done
            ? cached
              ? "Runtime ready."
              : "Ready — Web Speech will be used."
            : "Warming up models…"}
        </h2>

        <div className="relative h-3 w-full overflow-hidden rounded-full border border-line-strong bg-zinc-950">
          <div
            className={cn(
              "absolute top-0 left-0 h-full rounded-full transition-[width] duration-200",
              state.done ? "bg-emerald-400" : "bg-amber-400",
            )}
            style={{ width: `${Math.max(percent, state.done ? 100 : 1)}%` }}
          />
          <div className="absolute top-0 right-0 flex h-full items-center px-2 font-mono text-[10px] text-zinc-400">
            {percent}%
          </div>
        </div>

        <p className="font-mono text-[11px] text-zinc-500">
          {`${(phaseLoaded / MB).toFixed(1)} of ${(phaseTotal / MB).toFixed(1)} MB`}
          {state.phase === "voice" && !state.done ? " · voice weights" : ""}
          {!state.done ? ` · ${seconds}s` : ""}
        </p>

        <div className="flex flex-col gap-2.5">
          {stages.map((stage) => (
            <div key={stage.id} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  stage.complete
                    ? "bg-emerald-400"
                    : stage.id === state.phase && state.phase !== "ready"
                      ? "bg-amber-400 animate-pulse"
                      : "bg-zinc-700",
                )}
              />
              <span
                className={cn(
                  "text-[12.5px]",
                  stage.complete ? "text-zinc-200" : "text-zinc-400",
                )}
              >
                {stage.label}
              </span>
              <span className="ml-auto font-mono text-[10.5px] text-zinc-600">
                {stage.detail}
              </span>
            </div>
          ))}
        </div>

        {state.supported === false ? (
          <p className="font-mono text-[10.5px] leading-relaxed text-amber-400/80">
            {state.error}
          </p>
        ) : null}

        <p className="text-[11.5px] leading-relaxed text-zinc-600">
          {state.done
            ? "Weights are cached in this browser's private storage, so the next interview starts immediately."
            : "First visit downloads the speech models in the background. You can carry on — the interview will use Web Speech until the weights are warm."}
        </p>

        <button
          onClick={finish}
          className="self-start rounded border border-line-strong px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        >
          {state.done ? "Continue" : "Skip and use Web Speech"}
        </button>
      </div>
    </div>
  );
}