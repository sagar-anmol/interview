"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PHASE_LABEL, type PhaseKey } from "@/lib/interview/fsm";
import type {
  MilestoneKey,
  MilestoneStatus,
  Scenario,
} from "@/lib/interview/scenarios";
import { cn } from "@/lib/utils";

export function LeftProgressPanel({
  scenario,
  milestones,
  phase,
  vadMode,
  strictMode,
  onVadModeChange,
  format,
}: {
  scenario: Scenario;
  milestones: Record<MilestoneKey, MilestoneStatus>;
  phase: PhaseKey;
  vadMode: "auto" | "ptt";
  strictMode: boolean;
  onVadModeChange: (mode: "auto" | "ptt") => void;
  format: "voice" | "text";
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const completed = scenario.milestones.filter(
    (m) => milestones[m.key] === "completed",
  ).length;

  if (collapsed) {
    return (
      <aside className="flex h-full w-10 shrink-0 flex-col items-center border-r border-line bg-panel py-2">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          aria-label="Expand scenario panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 [writing-mode:vertical-rl]">
          Scenario
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          Scenario & Progress
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"
          aria-label="Collapse scenario panel"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-line p-3">
          <h1 className="text-[15px] font-medium tracking-tight text-zinc-100">
            {scenario.title}
          </h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
            {scenario.prompt}
          </p>
          <div className="mt-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            <span>{scenario.durationMin} min</span>
            <span className="text-zinc-700">/</span>
            <span>{format === "voice" ? "Voice" : "Text"}</span>
            <span className="text-zinc-700">/</span>
            <span>{PHASE_LABEL[phase]}</span>
          </div>
        </div>

        <div className="border-b border-line p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Interview progress
            </span>
            <span className="font-mono text-[10px] text-zinc-600">
              {completed}/{scenario.milestones.length}
            </span>
          </div>
          <ul className="mt-2.5 space-y-2">
            {scenario.milestones.map((m) => {
              const status = milestones[m.key];
              return (
                <li key={m.key} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-[3px] flex h-3 w-3 shrink-0 items-center justify-center rounded-full border",
                      status === "completed" &&
                        "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
                      status === "active" && "border-zinc-400",
                      status === "pending" && "border-zinc-700",
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="h-2 w-2" strokeWidth={3} />
                    ) : null}
                    {status === "active" ? (
                      <span className="h-1 w-1 rounded-full bg-zinc-300 animate-live" />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[12px] leading-snug",
                        status === "completed"
                          ? "text-zinc-400"
                          : status === "active"
                            ? "text-zinc-200"
                            : "text-zinc-500",
                      )}
                    >
                      {m.label}
                    </p>
                    {status === "active" ? (
                      <p className="mt-0.5 text-[10.5px] leading-snug text-zinc-600">
                        {m.hint}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Session controls
          </span>

          <div className="mt-2.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] text-zinc-300">
                  {vadMode === "auto" ? "Auto-VAD" : "Push-to-talk"}
                </p>
                <p className="text-[10.5px] text-zinc-600">
                  {vadMode === "auto"
                    ? "Hands-free speech detection"
                    : "Hold Space to speak"}
                </p>
              </div>
              <Switch
                checked={vadMode === "auto"}
                onCheckedChange={(checked) =>
                  onVadModeChange(checked ? "auto" : "ptt")
                }
                disabled={format === "text"}
                aria-label="Toggle auto VAD"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] text-zinc-300">Strict mode</p>
                <p className="text-[10.5px] text-zinc-600">
                  No hints or coaching
                </p>
              </div>
              <Switch
                checked={strictMode}
                disabled
                aria-label="Strict mode locked on"
              />
            </div>
          </div>

          <p className="mt-4 text-[10.5px] leading-relaxed text-zinc-600">
            Requirements are tracked live by the evaluator. Milestones complete
            only when you commit to a concrete decision with numbers or
            trade-offs.
          </p>
        </div>
      </div>
    </aside>
  );
}
