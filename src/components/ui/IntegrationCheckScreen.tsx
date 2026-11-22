"use client";

import * as React from "react";
import {
  getIntegrationState,
  onIntegrationChange,
  type IntegrationState,
} from "@/lib/integration/integrationManager";
import { cn } from "@/lib/utils";

const STEPS: { id: string; label: string; holdMs: number }[] = [
  { id: "load", label: "Loading integration runtime", holdMs: 900 },
  { id: "check", label: "Verifying ORT WebAssembly support", holdMs: 900 },
  { id: "ready", label: "Integration ready", holdMs: 700 },
];

const ASSETS_TOTAL = 11;

export function IntegrationCheckScreen({ onDone }: { onDone: () => void }) {
  const [state, setState] = React.useState<IntegrationState>(getIntegrationState);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [autoProgress, setAutoProgress] = React.useState(0);
  const [closed, setClosed] = React.useState(false);

  React.useEffect(() => {
    const unsub = onIntegrationChange(() => setState(getIntegrationState()));
    return unsub;
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setState(getIntegrationState());
      setElapsedMs((e) => e + 120);
      setAutoProgress((p) => Math.min(1, p + 0.004));
    }, 120);
    return () => clearInterval(timer);
  }, []);

  const stepIndex = autoProgress >= 1.0 || state.done ? STEPS.length - 1 : Math.min(2, Math.floor(autoProgress * 3));
  const currentStep = STEPS[stepIndex];
  const stepDoneCount = stepIndex + 1;

  React.useEffect(() => {
    if (state.done && autoProgress >= 0.6) {
      const t = setTimeout(() => {
        setClosed(true);
        onDone();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [state.done, autoProgress, onDone]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setClosed(true);
        onDone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  if (closed) return null;

  const percent = state.done
    ? 100
    : Math.max(
        Math.min(
          state.total > 0 ? Math.round((state.loaded / state.total) * 100) : autoProgress * 100,
          100,
        ),
        1,
      );
  const statusColor = state.done ? "text-emerald-400" : "text-amber-400";
  const barColor = state.done
    ? "bg-emerald-400"
    : state.loaded > 0
      ? "bg-amber-400"
      : "bg-zinc-600 animate-pulse";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-[2px]">
      <div className="flex max-w-lg flex-col gap-5 p-7">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-live" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
            Integration check
          </span>
        </div>

        <h2 className="text-[19px] font-medium tracking-tight text-zinc-100">
          {state.done && autoProgress >= 1 ? "Integration complete." : "Downloading runtime assets…"}
        </h2>

        <div className="relative h-3 w-full overflow-hidden rounded-full border border-line-strong bg-zinc-950">
          <div
            className={cn("absolute top-0 left-0 h-full rounded-full", barColor)}
            style={{ width: `${Math.max(percent, 0)}%` }}
          />
          <div className="absolute top-0 right-0 flex h-full items-center px-2 font-mono text-[10px] text-zinc-500">
            {Math.round(percent)}%
          </div>
        </div>

        <p className="font-mono text-[11px] text-zinc-500">
          {state.total > 0
            ? `${state.loaded} of ${state.total} KB`
            : `${Math.round(elapsedMs / 1000)}s · step ${stepDoneCount}: ${currentStep.label}`}
        </p>

        <div className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <div
              key={step.id}
              className="flex items-center gap-2"
              data-done={i <= stepIndex}
            >              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line",
                  i < stepIndex
                    ? "border-zinc-600"
                    : i === stepIndex
                      ? "border-emerald-400/60 bg-emerald-400/10"
                      : "",
                )}
              >
                {i < stepIndex ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                )}
              </span>
              <span
                className={cn(
                  "text-[12.5px]",
                  i < stepIndex ? "text-zinc-600" : "text-zinc-200",
                  i === stepIndex ? statusColor : "",
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
          {state.done && autoProgress >= 1 ? (
            <div className="mt-1 font-mono text-[10.5px] text-zinc-600">
              All {ASSETS_TOTAL} integration assets verified.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
