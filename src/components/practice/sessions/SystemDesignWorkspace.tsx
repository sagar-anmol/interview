"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import type { ReactFlowInstance } from "@xyflow/react";
import { ArchitectureCanvas } from "@/components/canvas/ArchitectureCanvas";
import { AiOrb } from "@/components/practice/AiOrb";
import { SessionBottomBar } from "@/components/practice/SessionBottomBar";
import { WhiteboardToolbar } from "@/components/practice/WhiteboardToolbar";
import { IntegrationCheckScreen } from "@/components/ui/IntegrationCheckScreen";
import { Button } from "@/components/ui/button";
import { useInterviewSession } from "@/lib/hooks/useInterviewSession";
import { getScenario } from "@/lib/interview/scenarios";
import { cn } from "@/lib/utils";

type Tab = "question" | "solution" | "transcript";

export function SystemDesignWorkspace({ id }: { id: string }) {
  const s = useInterviewSession(id);
  const [tab, setTab] = React.useState<Tab>("question");
  const [rf, setRf] = React.useState<ReactFlowInstance | null>(null);
  const [zoom, setZoom] = React.useState(100);

  const scenario = getScenario(s.config?.scenarioId ?? "netflix");

  if (s.loading || !s.config) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-[11px] text-zinc-500">
        Loading workspace…
      </div>
    );
  }

  const interviewerTurns = s.turns.filter((t) => t.speaker === "interviewer");
  const latestQuestion =
    interviewerTurns[interviewerTurns.length - 1]?.spokenText ||
    interviewerTurns[interviewerTurns.length - 1]?.text ||
    scenario.prompt;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1">
        <section className="flex w-[32%] min-w-[280px] max-w-[420px] shrink-0 flex-col border-r border-line bg-panel">
          <div className="flex h-11 shrink-0 items-center gap-4 border-b border-line px-4">
            {(["question", "solution", "transcript"] as Tab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "relative h-11 text-[11.5px] capitalize transition",
                  tab === key ? "text-zinc-100" : "text-muted hover:text-zinc-300",
                )}
              >
                {key}
                {tab === key ? (
                  <span className="absolute inset-x-0 bottom-0 h-px bg-zinc-300" />
                ) : null}
              </button>
            ))}
            <button
              type="button"
              aria-label="Reset view"
              className="ml-auto rounded p-1 text-muted hover:text-zinc-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {tab === "question" ? (
              <QuestionPane title={scenario.title} prompt={scenario.prompt} />
            ) : null}
            {tab === "solution" ? (
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
                  Working notes
                </p>
                <h2 className="mt-2 text-[17px] font-medium text-zinc-100">
                  Interviewer decision log
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-400">
                  {s.decisionLog.trim() ||
                    "Your architecture notes and the interviewer's running assessment appear here as the session progresses."}
                </p>
              </div>
            ) : null}
            {tab === "transcript" ? (
              <div className="space-y-4">
                {s.turns.length === 0 ? (
                  <p className="text-[12px] text-muted">
                    The conversation will appear here.
                  </p>
                ) : null}
                {s.turns.map((turn) => (
                  <div key={turn.id}>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
                      {turn.speaker}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
                      {turn.spokenText || turn.text}
                      {turn.interrupted ? (
                        <span className="ml-1 text-muted">[interrupted]</span>
                      ) : null}
                    </p>
                  </div>
                ))}
                {s.tentative ? (
                  <p className="text-[12px] italic text-muted">{s.tentative}</p>
                ) : null}
                {latestQuestion ? null : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="relative min-w-0 flex-1 bg-[#0a0a0d]">
          <ArchitectureCanvas
            showControls={false}
            onInstance={(instance) => setRf(instance)}
            onViewportChange={(value) => setZoom(Math.round(value * 100))}
          />
          <WhiteboardToolbar rf={rf} zoom={zoom} />

          <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
            <div className="pointer-events-auto flex h-[86px] w-[160px] items-center justify-center rounded-xl border border-line-strong bg-panel-2/95 shadow-xl shadow-black/50 backdrop-blur">
              <AiOrb
                active={s.begun}
                speaking={s.speechState === "speaking"}
                level={s.micLevel}
              />
            </div>
          </div>
        </section>
      </div>

      <SessionBottomBar
        remainingSec={s.remaining || s.config.durationSec}
        onSubmit={() => void s.handleEnd()}
        center={
          !s.begun ? (
            <span className="font-mono text-[10px] text-muted">
              Waiting to begin
            </span>
          ) : null
        }
      />

      {!s.begun ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-line-strong bg-panel-2 p-5 shadow-2xl shadow-black/70">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Practice with AI
            </p>
            <h2 className="mt-2 text-[19px] font-medium tracking-tight text-zinc-100">
              {scenario.title}
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
              {scenario.prompt}
            </p>
            <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] text-muted">
              20 MIN · {s.config.format === "voice" ? "VOICE" : "TEXT"} · STRICT
            </p>
            <Button size="lg" className="mt-4 w-full" onClick={s.begin}>
              {s.config.format === "voice" ? "Enable mic & begin" : "Begin interview"}
            </Button>
          </div>
        </div>
      ) : null}

      {s.showCheck ? (
        <IntegrationCheckScreen onDone={() => s.setShowCheck(false)} />
      ) : null}
    </div>
  );
}

function QuestionPane({ title, prompt }: { title: string; prompt: string }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
        20 minute architecture design
      </p>
      <h2 className="mt-2 text-[18px] font-medium leading-snug tracking-tight text-zinc-100">
        {title}
      </h2>
      <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">{prompt}</p>

      <div className="mt-6 space-y-5 border-t border-line pt-5">
        <Guidance title="Start with clarifying requirements.">
          Ask about users, scale, latency, availability, and what is explicitly
          out of scope before proposing components.
        </Guidance>
        <Guidance title="Think in layers and start simple.">
          Sketch the client, edge, service, and storage layers first. Add
          caching, queues, and replication only where the requirements demand
          them.
        </Guidance>
        <Guidance title="Address bottlenecks systematically.">
          For each hotspot, name the failure mode, the mitigation, and the
          trade-off it introduces.
        </Guidance>
      </div>
    </div>
  );
}

function Guidance({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-zinc-300">{title}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}
