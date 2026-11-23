"use client";

import * as React from "react";
import { ChevronDown, RotateCcw, Terminal } from "lucide-react";
import { AiOrb } from "@/components/practice/AiOrb";
import { SessionBottomBar } from "@/components/practice/SessionBottomBar";
import { IntegrationCheckScreen } from "@/components/ui/IntegrationCheckScreen";
import { Button } from "@/components/ui/button";
import { useInterviewSession } from "@/lib/hooks/useInterviewSession";
import { cn } from "@/lib/utils";

type Tab = "question" | "hints" | "solution" | "transcript";
type ConsoleTab = "output" | "tests";

const STARTER_CODE = `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def has_cycle(self, head: ListNode | None) -> bool:
        # debug your code below
        slow = head
        fast = head

        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                return True

        return False
`;

const HINTS = [
  "Start with the brute-force approach: store every node you visit in a set.",
  "What is the time and space complexity of that approach? Can you do better?",
  "Try two pointers moving at different speeds through the list.",
  "Visualise the pointers on the example diagrams before writing code.",
  "Check the edge cases: empty list, single node, and a cycle back to the head.",
  "Watch for off-by-one errors in the loop condition.",
];

const TEST_CASES = [
  "List with a cycle of length 2",
  "List with a cycle back to the head",
  "No cycle — three nodes",
  "Empty list",
  "Single node, no cycle",
  "Single node pointing to itself",
];

export function CodingWorkspace({ id }: { id: string }) {
  const s = useInterviewSession(id);
  const [tab, setTab] = React.useState<Tab>("question");
  const [code, setCode] = React.useState(STARTER_CODE);
  const [consoleOpen, setConsoleOpen] = React.useState(true);
  const [consoleTab, setConsoleTab] = React.useState<ConsoleTab>("output");
  const [output, setOutput] = React.useState("");
  const [running, setRunning] = React.useState(false);

  if (s.loading || !s.config) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-[11px] text-zinc-500">
        Loading workspace…
      </div>
    );
  }

  const runCode = () => {
    setRunning(true);
    setConsoleOpen(true);
    setConsoleTab("output");
    setOutput("$ python solution.py\nProgram finished with exit code 0.");
    setRunning(false);
  };

  const runTests = () => {
    setRunning(true);
    setConsoleOpen(true);
    setConsoleTab("tests");
    setOutput("");
    setRunning(false);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1">
        <section className="flex w-[34%] min-w-[290px] max-w-[460px] shrink-0 flex-col border-r border-line bg-panel">
          <div className="flex h-11 shrink-0 items-center gap-4 border-b border-line px-4">
            {(["question", "hints", "solution", "transcript"] as Tab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "relative h-11 text-[11px] capitalize transition",
                  tab === key ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-300",
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
              aria-label="Reset question"
              className="ml-auto rounded p-1 text-zinc-600 hover:text-zinc-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {tab === "question" ? (
              <div>
                <h2 className="text-[18px] font-medium tracking-tight text-zinc-100">
                  Linked List Cycle
                </h2>
                <p className="mt-3 text-[12px] leading-relaxed text-zinc-400">
                  Given <Code>head</Code>, the head of a linked list, determine if the linked
                  list has a cycle in it. Return <Code>true</Code> if there is a cycle in the
                  list, otherwise return <Code>false</Code>.
                </p>
                <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
                  A node is considered cyclic if there is some node in the list that can be
                  reached again by continuously following the <Code>next</Code> pointer.
                </p>

                <p className="mt-7 font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-600">
                  Example
                </p>
                <div className="mt-3 space-y-3">
                  <CycleDiagram label="Has cycle" cyclic />
                  <CycleDiagram label="No cycle" />
                </div>
              </div>
            ) : null}

            {tab === "hints" ? (
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-600">
                  Progressive hints
                </p>
                <ol className="mt-3 space-y-3">
                  {HINTS.map((hint, index) => (
                    <li key={hint} className="flex gap-2.5 text-[12px] leading-relaxed text-zinc-400">
                      <span className="font-mono text-[10px] text-zinc-600">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {tab === "solution" ? (
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-600">
                  Interviewer notes
                </p>
                <p className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-400">
                  {s.decisionLog.trim() ||
                    "The interviewer's running assessment will appear here as you work through the problem."}
                </p>
              </div>
            ) : null}

            {tab === "transcript" ? (
              <div className="space-y-4">
                {s.turns.length === 0 ? (
                  <p className="text-[12px] text-zinc-600">The conversation will appear here.</p>
                ) : null}
                {s.turns.map((turn) => (
                  <div key={turn.id}>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                      {turn.speaker}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
                      {turn.spokenText || turn.text}
                    </p>
                  </div>
                ))}
                {s.tentative ? (
                  <p className="text-[12px] italic text-zinc-600">{s.tentative}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="relative flex min-w-0 flex-1 flex-col bg-[#0a0a0d]">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[11px] text-zinc-400 hover:border-line-strong"
            >
              Python <ChevronDown className="h-3 w-3 text-zinc-600" />
            </button>
            <button
              type="button"
              onClick={() => setCode(STARTER_CODE)}
              className="text-[11px] text-zinc-600 transition hover:text-zinc-300"
            >
              Reset
            </button>
          </div>

          <div className="flex min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-[1.65]">
            <div className="sticky left-0 z-10 w-11 shrink-0 select-none border-r border-line/60 bg-[#0a0a0d] py-3 text-right">
              {code.split("\n").map((_, i) => (
                <div key={i} className="pr-2.5 text-zinc-700">
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              aria-label="Code editor"
              className="min-h-full min-w-full flex-1 resize-none bg-transparent py-3 pl-3 pr-6 text-zinc-300 outline-none"
            />
          </div>

          {consoleOpen ? (
            <div className="h-[32%] min-h-[150px] shrink-0 border-t border-line bg-panel">
              <div className="flex h-9 items-center gap-4 border-b border-line px-3">
                {(["output", "tests"] as ConsoleTab[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setConsoleTab(key)}
                    className={cn(
                      "relative h-9 text-[11px] capitalize transition",
                      consoleTab === key ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-300",
                    )}
                  >
                    {key === "output" ? "Output" : "Test Results"}
                    {consoleTab === key ? (
                      <span className="absolute inset-x-0 bottom-0 h-px bg-zinc-300" />
                    ) : null}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setConsoleOpen(false)}
                  className="ml-auto text-[10.5px] text-zinc-600 hover:text-zinc-300"
                >
                  Hide console
                </button>
              </div>
              <div className="h-[calc(100%-36px)] overflow-auto px-3 py-2 font-mono text-[11px]">
                {consoleTab === "output" ? (
                  <pre className="whitespace-pre-wrap text-zinc-500">
                    {output || "No output yet. Run your code to see results."}
                  </pre>
                ) : (
                  <div>
                    <p className="text-zinc-500">Run time: 58 ms</p>
                    <div className="mt-2 space-y-1">
                      {TEST_CASES.map((test, index) => (
                        <div
                          key={test}
                          className="flex items-center gap-2 rounded px-2 py-1 text-zinc-500 hover:bg-zinc-900/60"
                        >
                          <span className="text-zinc-700">›</span>
                          <span className="text-amber-500/80">●</span>
                          <span>
                            Test case {index + 1}: {test}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConsoleOpen(true)}
              className="flex h-8 shrink-0 items-center justify-center gap-1.5 border-t border-line bg-panel text-[10.5px] text-zinc-600 hover:text-zinc-300"
            >
              <Terminal className="h-3 w-3" /> Show console
            </button>
          )}

          <div className="pointer-events-none absolute right-3 top-14 z-20 flex flex-col items-end gap-2">
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
        right={
          <>
            <Button variant="subtle" size="sm" onClick={runCode} disabled={running}>
              Run code
            </Button>
            <Button variant="subtle" size="sm" onClick={runTests} disabled={running}>
              Run tests
            </Button>
          </>
        }
      />

      {!s.begun ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-line-strong bg-panel-2 p-5 shadow-2xl shadow-black/70">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Practice with AI
            </p>
            <h2 className="mt-2 text-[19px] font-medium tracking-tight text-zinc-100">
              Data Structures &amp; Algorithms
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
              A 20-minute coding interview. The AI interviewer will ask follow-ups and provide
              feedback when you submit.
            </p>
            <Button size="lg" className="mt-5 w-full" onClick={s.begin}>
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

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-[11px] text-zinc-300">
      {children}
    </code>
  );
}

function CycleDiagram({ label, cyclic }: { label: string; cyclic?: boolean }) {
  const values = ["1", "2", "3", "4", "5"];
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">{label}</p>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {values.map((value, index) => (
          <React.Fragment key={value}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 font-mono text-[10px] text-zinc-300">
              {value}
            </span>
            {index < values.length - 1 ? (
              <span className="text-[10px] text-zinc-700">→</span>
            ) : null}
          </React.Fragment>
        ))}
      </div>
      {cyclic ? (
        <svg viewBox="0 0 200 24" className="mx-auto mt-1 h-5 w-[200px]" aria-hidden>
          <path
            d="M156 2 C156 18, 52 18, 52 10"
            fill="none"
            stroke="#3f3f46"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
          />
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#3f3f46" />
            </marker>
          </defs>
        </svg>
      ) : (
        <div className="mt-1 flex items-center gap-1 pl-[70px] font-mono text-[11px] text-zinc-700">
          → <span className="text-zinc-600">None</span>
        </div>
      )}
    </div>
  );
}
