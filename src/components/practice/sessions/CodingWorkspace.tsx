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

const STARTER_CODE = {
  javascript: `// Linked list node: { val, next }
function hasCycle(head) {
  // debug your code below
  let slow = head;
  let fast = head;

  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
`,
  python: `class ListNode:
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
`,
};

type Language = keyof typeof STARTER_CODE;
type TestResult = { name: string; pass: boolean | null; detail: string };

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
  const [language, setLanguage] = React.useState<Language>("javascript");
  const [code, setCode] = React.useState(STARTER_CODE.javascript);
  const [consoleOpen, setConsoleOpen] = React.useState(true);
  const [consoleTab, setConsoleTab] = React.useState<ConsoleTab>("output");
  const [output, setOutput] = React.useState("");
  const [testResults, setTestResults] = React.useState<TestResult[]>([]);
  const [testNotice, setTestNotice] = React.useState("");

  if (s.loading || !s.config) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-[11px] text-slate-500">
        Loading workspace…
      </div>
    );
  }

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    setCode(STARTER_CODE[next]);
    setOutput("");
    setTestResults([]);
    setTestNotice("");
  };

  const resetEverything = () => {
    setTab("question");
    setCode(STARTER_CODE[language]);
    setOutput("");
    setTestResults([]);
    setTestNotice("");
  };

  const runCode = () => {
    setConsoleOpen(true);
    setConsoleTab("output");
    if (language === "python") {
      const opens = (code.match(/[([{]/g) ?? []).length;
      const closes = (code.match(/[)\]}]/g) ?? []).length;
      setOutput(
        opens === closes
          ? "Python is reviewed statically in this browser (no Python runtime bundled).\nStatic check passed: brackets balanced. Switch to JavaScript to execute code."
          : `Static check failed: ${opens} opening vs ${closes} closing brackets.`,
      );
      return;
    }
    const logs: string[] = [];
    try {
      const fakeConsole = {
        log: (...args: unknown[]) =>
          logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")),
        error: (...args: unknown[]) =>
          logs.push(`ERROR ${args.map(String).join(" ")}`),
      };
      new Function("console", `"use strict";\n${code}`)(fakeConsole);
      setOutput(
        logs.length
          ? logs.join("\n")
          : "Program finished with no console output. Use console.log(...) to inspect values.",
      );
    } catch (error) {
      setOutput(`Runtime error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const runTests = () => {
    setConsoleOpen(true);
    setConsoleTab("tests");
    if (language === "python") {
      setTestResults([]);
      setTestNotice("Python tests need a local Python runtime. Switch to JavaScript to execute the test suite in the browser.");
      return;
    }
    setTestNotice("");
    try {
      const resolve = new Function(
        `${code}\n;return typeof hasCycle === "function" ? hasCycle : null;`,
      ) as () => ((head: { val: number; next?: unknown } | null) => boolean) | null;
      const hasCycle = resolve();
      if (!hasCycle) {
        setTestNotice("Define a function named hasCycle(head) to run the test suite.");
        setTestResults([]);
        return;
      }
      const makeList = (
        values: number[],
        cycleIndex = -1,
      ): { val: number; next: unknown } | null => {
        const nodes = values.map((val) => ({ val, next: undefined as unknown }));
        nodes.forEach((node, i) => {
          (node as { next?: unknown }).next = nodes[i + 1] ?? null;
        });
        if (cycleIndex >= 0) {
          (nodes[nodes.length - 1] as { next?: unknown }).next = nodes[cycleIndex];
        }
        return nodes[0] ?? null;
      };
      const cases: { name: string; head: ReturnType<typeof makeList>; expected: boolean }[] = [
        { name: TEST_CASES[0], head: makeList([3, 2, 0, -4], 1), expected: true },
        { name: TEST_CASES[1], head: makeList([1, 2, 3], 0), expected: true },
        { name: TEST_CASES[2], head: makeList([1, 2, 3]), expected: false },
        { name: TEST_CASES[3], head: null, expected: false },
        { name: TEST_CASES[4], head: makeList([1]), expected: false },
        { name: TEST_CASES[5], head: makeList([1], 0), expected: true },
      ];
      const results = cases.map((c) => {
        let actual = false;
        let error = "";
        try {
          actual = Boolean(hasCycle(c.head as never));
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        }
        return {
          name: c.name,
          pass: error ? null : actual === c.expected,
          detail: error || `expected ${c.expected}, got ${actual}`,
        };
      });
      setTestResults(results);
    } catch (error) {
      setTestNotice(`Could not run tests: ${error instanceof Error ? error.message : String(error)}`);
      setTestResults([]);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="flex h-[34vh] w-full shrink-0 flex-col overflow-hidden border-b border-line bg-panel md:h-auto md:w-[34%] md:min-w-[290px] md:max-w-[460px] md:border-b-0 md:border-r">
          <div className="flex h-11 shrink-0 items-center gap-4 border-b border-line px-4">
            {(["question", "hints", "solution", "transcript"] as Tab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "relative h-11 text-[11px] capitalize transition",
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
              aria-label="Reset question"
              title="Reset question and code"
              onClick={resetEverything}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded p-1 text-muted hover:bg-slate-100 hover:text-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {tab === "question" ? (
              <div>
                <h2 className="text-[18px] font-medium tracking-tight text-slate-900">
                  Linked List Cycle
                </h2>
                <p className="mt-3 text-[12px] leading-relaxed text-slate-600">
                  Given <Code>head</Code>, the head of a linked list, determine if the linked
                  list has a cycle in it. Return <Code>true</Code> if there is a cycle in the
                  list, otherwise return <Code>false</Code>.
                </p>
                <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
                  A node is considered cyclic if there is some node in the list that can be
                  reached again by continuously following the <Code>next</Code> pointer.
                </p>

                <p className="mt-7 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
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
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
                  Progressive hints
                </p>
                <ol className="mt-3 space-y-3">
                  {HINTS.map((hint, index) => (
                    <li key={hint} className="flex gap-2.5 text-[12px] leading-relaxed text-slate-600">
                      <span className="font-mono text-[10px] text-muted">
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
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
                  Interviewer notes
                </p>
                <p className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600">
                  {s.decisionLog.trim() ||
                    "The interviewer's running assessment will appear here as you work through the problem."}
                </p>
              </div>
            ) : null}

            {tab === "transcript" ? (
              <div className="space-y-4">
                {s.turns.length === 0 ? (
                  <p className="text-[12px] text-muted">The conversation will appear here.</p>
                ) : null}
                {s.turns.map((turn) => (
                  <div key={turn.id}>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
                      {turn.speaker}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                      {turn.spokenText || turn.text}
                    </p>
                  </div>
                ))}
                {s.tentative ? (
                  <p className="text-[12px] italic text-muted">{s.tentative}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="relative flex min-w-0 flex-1 flex-col bg-panel">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
            <label className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[11px] text-slate-600">
              <span className="sr-only">Language</span>
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value as Language)}
                className="min-h-[26px] bg-transparent text-slate-700 outline-none"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
              </select>
              <ChevronDown className="h-3 w-3 text-muted" />
            </label>
            <button
              type="button"
              onClick={() => setCode(STARTER_CODE[language])}
              className="min-h-[26px] px-1.5 text-[11px] text-muted transition hover:text-slate-700"
            >
              Reset
            </button>
          </div>

          <div className="flex min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-[1.65]">
            <div className="sticky left-0 z-10 w-11 shrink-0 select-none border-r border-line/60 bg-panel-2 py-3 text-right">
              {code.split("\n").map((_, i) => (
                <div key={i} className="pr-2.5 text-slate-500">
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              aria-label="Code editor"
              className="min-h-full min-w-0 flex-1 resize-none bg-transparent py-3 pl-3 pr-6 text-slate-900 outline-none"
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
                      consoleTab === key ? "text-slate-900" : "text-muted hover:text-slate-700",
                    )}
                  >
                    {key === "output" ? "Output" : "Test Results"}
                    {consoleTab === key ? (
                      <span className="absolute inset-x-0 bottom-0 h-px bg-slate-200" />
                    ) : null}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setConsoleOpen(false)}
                  className="ml-auto min-h-[26px] px-1.5 text-[10.5px] text-muted hover:text-slate-700"
                >
                  Hide console
                </button>
              </div>
              <div className="h-[calc(100%-36px)] overflow-auto px-3 py-2 font-mono text-[11px]">
                {consoleTab === "output" ? (
                  <pre className="whitespace-pre-wrap text-slate-500">
                    {output || "No output yet. Run your code to see results."}
                  </pre>
                ) : (
                  <div>
                    {testNotice ? (
                      <p className="mb-2 text-amber-700">{testNotice}</p>
                    ) : null}
                    {testResults.length === 0 && !testNotice ? (
                      <p className="text-slate-500">
                        Run the test suite to see results for each case.
                      </p>
                    ) : null}
                    <div className="mt-2 space-y-1">
                      {testResults.map((result) => (
                        <div
                          key={result.name}
                          className="flex items-start gap-2 rounded px-2 py-1 text-slate-600 hover:bg-slate-100/60"
                        >
                          <span
                            className={
                              result.pass === true
                                ? "text-emerald-700"
                                : result.pass === false
                                  ? "text-red-600"
                                  : "text-amber-600"
                            }
                          >
                            {result.pass === true ? "✓" : result.pass === false ? "✕" : "●"}
                          </span>
                          <span className="flex-1">{result.name}</span>
                          <span className="text-slate-400">{result.detail}</span>
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
              className="flex h-8 shrink-0 items-center justify-center gap-1.5 border-t border-line bg-panel text-[10.5px] text-muted hover:text-slate-700"
            >
              <Terminal className="h-3 w-3" /> Show console
            </button>
          )}

          <div className="pointer-events-none absolute right-3 top-14 z-20 flex flex-col items-end gap-2">
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
        right={
          <>
            <Button variant="subtle" size="sm" onClick={runCode}>
              Run code
            </Button>
            <Button variant="subtle" size="sm" onClick={runTests}>
              Run tests
            </Button>
          </>
        }
      />

      {!s.begun ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-line-strong bg-panel-2 p-5 shadow-2xl shadow-slate-900/15">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Practice with AI
            </p>
            <h2 className="mt-2 text-[19px] font-medium tracking-tight text-slate-900">
              Data Structures &amp; Algorithms
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
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
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
      {children}
    </code>
  );
}

function CycleDiagram({ label, cyclic }: { label: string; cyclic?: boolean }) {
  const values = ["1", "2", "3", "4", "5"];
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted">{label}</p>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {values.map((value, index) => (
          <React.Fragment key={value}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-slate-100 font-mono text-[10px] text-slate-700">
              {value}
            </span>
            {index < values.length - 1 ? (
              <span className="text-[10px] text-slate-500">→</span>
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
        <div className="mt-1 flex items-center gap-1 pl-[70px] font-mono text-[11px] text-slate-500">
          → <span className="text-muted">None</span>
        </div>
      )}
    </div>
  );
}
