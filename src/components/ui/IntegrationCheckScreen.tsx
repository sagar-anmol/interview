"use client";

import * as React from "react";
import {
  getIntegrationState,
  onIntegrationChange,
  type IntegrationState,
} from "@/lib/integration/integrationManager";
import { cn } from "@/lib/utils";

const MB = 1_048_576;

/**
 * Pre-flight screen shown before an interview starts. Everything it displays
 * is real: the bytes below came off the network and stay cached in this
 * browser after the first visit.
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
      label: "Speech detection",
      detail: `${(state.vadLoaded / MB).toFixed(1)} / ${(state.vadTotal / MB).toFixed(1)} MB`,
      complete: state.vadLoaded >= state.vadTotal && state.phase !== "vad",
      size: state.vadTotal,
    },
    {
      id: "voice",
      label: "Voice model",
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
      label: "Ready to use",
      detail: state.phase === "ready" ? "cached in this browser" : state.phase === "voice" ? "held until setup finishes" : "Queued",
      complete: state.done,
    },
  ];

  return (
    <div className="md-modal-backdrop fixed inset-0 z-60 flex items-center justify-center bg-slate-800/25 p-4 backdrop-blur-md">
      <div className="md-modal-panel md-pop glass-panel backdrop-blur-xl backdrop-saturate-150 flex max-w-lg flex-col gap-5 rounded-xl p-7">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              state.done ? "bg-slate-700 animate-live" : "bg-slate-400 animate-pulse",
            )}
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-700">
            Voice check
          </span>
        </div>

        <h2 className="text-[19px] font-medium tracking-tight text-slate-900">
          {state.done ? "You’re ready." : "Getting things ready…"}
        </h2>

        <div className="relative h-3 w-full overflow-hidden rounded-full border border-white/70 bg-white/70">
          <div
            className={cn(
              "absolute top-0 left-0 h-full rounded-full transition-[width] duration-200",
              state.done ? "bg-slate-700" : "bg-slate-500",
            )}
            style={{ width: `${Math.max(percent, state.done ? 100 : 1)}%` }}
          />
          <div className="absolute top-0 right-0 flex h-full items-center px-2 font-mono text-[10px] text-slate-700">
            {percent}%
          </div>
        </div>

        <p className="font-mono text-[11px] text-muted">
          {`${(phaseLoaded / MB).toFixed(1)} of ${(phaseTotal / MB).toFixed(1)} MB`}
          {state.phase === "voice" && !state.done ? " · voice model" : ""}
          {!state.done ? ` · ${seconds}s` : ""}
        </p>

        <div className="flex flex-col gap-2.5">
          {stages.map((stage) => (
            <div key={stage.id} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  stage.complete
                    ? "bg-slate-700"
                    : stage.id === state.phase && state.phase !== "ready"
                      ? "bg-slate-400 animate-pulse"
                      : "bg-slate-200",
                )}
              />
              <span
                className={cn(
                  "text-[12.5px]",
                  stage.complete ? "text-slate-900" : "text-muted",
                )}
              >
                {stage.label}
              </span>
              <span className="ml-auto font-mono text-[10.5px] text-muted">
                {stage.detail}
              </span>
            </div>
          ))}
        </div>

        {state.supported === false ? (
          <p className="font-mono text-[10.5px] leading-relaxed text-slate-700">
            {state.error}
          </p>
        ) : null}

        <p className="text-[11.5px] leading-relaxed text-muted">
          {state.done
            ? "Everything is cached in this browser, so your next interview starts right away."
            : "First visit prepares the speech models in the background. You can carry on — the interview will start right away."}
        </p>

        <button
          onClick={finish}
          className="md-press self-start rounded border border-slate-300/80 bg-white/70 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-slate-700 backdrop-blur transition-colors hover:border-slate-400 hover:bg-white/85"
        >
          {state.done ? "Continue" : "Skip and continue"}
        </button>
      </div>
    </div>
  );
}