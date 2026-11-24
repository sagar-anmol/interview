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
import { useInterviewStore } from "@/store/useInterviewStore";

type Tab = "question" | "solution" | "transcript";

export function SystemDesignWorkspace({ id }: { id: string }) {
  const s = useInterviewSession(id);
  const [tab, setTab] = React.useState<Tab>("question");
  const [rf, setRf] = React.useState<ReactFlowInstance | null>(null);
  const [zoom, setZoom] = React.useState(100);
  const [locked, setLocked] = React.useState(false);
  const [panMode, setPanMode] = React.useState(false);

  const nodes = useInterviewStore((st) => st.nodes);
  const edges = useInterviewStore((st) => st.edges);
  const setGraph = useInterviewStore((st) => st.setGraph);
  const history = React.useRef<
    { nodes: typeof nodes; edges: typeof edges; key: string }[]
  >([]);
  const historyIndex = React.useRef(-1);
  const [historyState, setHistoryState] = React.useState({ index: -1, length: 0 });
  const graphKey = React.useMemo(
    () =>
      JSON.stringify({
        n: nodes.map((n) => ({ id: n.id, p: n.position, d: n.data })),
        e: edges.map((e) => ({ id: e.id, s: e.source, t: e.target, l: e.label })),
      }),
    [nodes, edges],
  );

  React.useEffect(() => {
    if (history.current[historyIndex.current]?.key === graphKey) return;
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push({ nodes, edges, key: graphKey });
    historyIndex.current = history.current.length - 1;
    setHistoryState({ index: historyIndex.current, length: history.current.length });
  }, [graphKey, nodes, edges]);

  const undo = () => {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    const entry = history.current[historyIndex.current];
    setGraph(entry.nodes, entry.edges);
    setHistoryState({ index: historyIndex.current, length: history.current.length });
  };
  const redo = () => {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current += 1;
    const entry = history.current[historyIndex.current];
    setGraph(entry.nodes, entry.edges);
    setHistoryState({ index: historyIndex.current, length: history.current.length });
  };
  const resetView = () => {
    setTab("question");
    setLocked(false);
    setPanMode(false);
    setZoom(100);
    rf?.fitView?.({ duration: 200, padding: 0.25 });
  };

  const scenario = getScenario(s.config?.scenarioId ?? "netflix");

  if (s.loading || !s.config) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-[11px] text-slate-500">
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
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="flex h-[36vh] w-full shrink-0 flex-col overflow-hidden border-b border-line bg-panel md:h-auto md:w-[32%] md:min-w-[280px] md:max-w-[420px] md:border-b-0 md:border-r">
          <div className="flex h-11 shrink-0 items-center gap-4 border-b border-line px-4">
            {(["question", "solution", "transcript"] as Tab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "relative h-11 text-[11.5px] capitalize transition",
                  tab === key ? "text-slate-900" : "text-muted hover:text-slate-700",
                )}
              >
                {key}
                {tab === key ? (
                  <span className="absolute inset-x-0 bottom-0 h-px bg-slate-200" />
                ) : null}
              </button>
            ))}
            <button
              type="button"
              aria-label="Reset view"
              title="Reset view"
              onClick={resetView}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded p-1 text-muted hover:bg-slate-100 hover:text-slate-700"
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
                <h2 className="mt-2 text-[17px] font-medium text-slate-900">
                  Interviewer decision log
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600">
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
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
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

        <section className="relative min-h-0 min-w-0 flex-1 bg-panel-2">
          <ArchitectureCanvas
            showControls={false}
            locked={locked}
            panMode={panMode}
            onInstance={(instance) => setRf(instance)}
            onViewportChange={(value) => setZoom(Math.round(value * 100))}
          />
          <WhiteboardToolbar
            rf={rf}
            zoom={zoom}
            locked={locked}
            panMode={panMode}
            canUndo={historyState.index > 0}
            canRedo={historyState.index < historyState.length - 1}
            onToggleLock={() => setLocked((v) => !v)}
            onTogglePan={() => setPanMode((v) => !v)}
            onUndo={undo}
            onRedo={redo}
          />

          <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
            <div className="pointer-events-auto flex h-[86px] w-[160px] items-center justify-center rounded-xl border border-line-strong bg-panel-2/95 shadow-xl shadow-slate-900/10 backdrop-blur">
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-line-strong bg-panel-2 p-5 shadow-2xl shadow-slate-900/15">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Practice with AI
            </p>
            <h2 className="mt-2 text-[19px] font-medium tracking-tight text-slate-900">
              {scenario.title}
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
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
      <h2 className="mt-2 text-[18px] font-medium leading-snug tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-3 text-[12px] leading-relaxed text-slate-500">{prompt}</p>

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
      <p className="text-[12px] font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}
