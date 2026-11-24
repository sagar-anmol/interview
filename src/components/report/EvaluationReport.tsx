"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  type ScoreRow,
  type Report,
  SCORE_LABELS,
} from "@/lib/interview/types";
import {
  fetchStoredReport,
  generateReportFromSession,
} from "@/lib/interview/report";
import { useInterviewStore } from "@/store/useInterviewStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function HireSignal({ signal }: { signal: Report["hireSignal"] }) {
  const color =
    signal.includes("No Hire")
      ? "text-red-600"
      : signal.includes("Hire") && signal !== "No Hire"
        ? signal.startsWith("Strong")
          ? "text-emerald-600"
          : "text-amber-600"
        : "text-slate-500";
  return (
    <div className="rounded-md border border-line p-3.5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        Hire signal
      </p>
      <p className={`mt-1.5 text-[15px] font-semibold ${color}`}>{signal}</p>
    </div>
  );
}

function ScoreTable({ scores }: { scores: ScoreRow[] }) {
  const label = (s: ScoreRow) =>
    (s.key === "requirements"
      ? SCORE_LABELS.requirements
      : s.key === "highLevel"
        ? SCORE_LABELS.highLevel
        : s.key === "scalability"
          ? SCORE_LABELS.scalability
          : s.key === "dataModeling"
            ? SCORE_LABELS.dataModeling
            : SCORE_LABELS.communication);
  return (
    <div className="mt-2 rounded-md border border-line">
      <div className="hidden grid-cols-[1fr_64px_2fr] gap-3 border-b border-line bg-slate-50 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500 sm:grid">
        <span>Area</span>
        <span className="text-right">Score (1–5)</span>
        <span>Rationale</span>
      </div>
      {scores.map((s) => (
        <div
          key={s.key}
          className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-line/70 px-3 py-2.5 last:border-b-0 sm:grid-cols-[1fr_64px_2fr] sm:gap-y-0"
        >
          <span className="text-[12.5px] text-slate-700">{label(s)}</span>
          <span className="text-right font-mono text-[12.5px] text-slate-500">
            {s.score}
          </span>
          <span className="col-span-2 text-[12.5px] leading-relaxed text-slate-600 sm:col-span-1">
            {s.rationale}
          </span>
        </div>
      ))}
    </div>
  );
}

function Bullets({
  items,
  empty,
}: {
  items: { point: string; evidence?: string }[];
  empty: string;
}) {
  if (!items.length) {
    return <p className="text-[12px] text-slate-500">{empty}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-[12px] leading-relaxed text-slate-700">
          <span className="text-slate-500">—</span>{" "}
          {item.point}
          {item.evidence ? (
            <span className="text-[11.5px] italic text-slate-500">
              {" "}
              — “{item.evidence}”
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function EvaluationReportView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await fetchStoredReport(sessionId);
      const fromStore = useInterviewStore.getState().report;
      const value = stored ?? fromStore ?? null;
      if (!cancelled) {
        setReport(value);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const session = useInterviewStore.getState();
  void session;

  const generate = async () => {
    setGenerating(true);
    const result = await generateReportFromSession(sessionId);
    setGenerating(false);
    if (result) setReport(result);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-[11px] text-slate-500">
          Loading report…
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-8">
      <header className="flex items-center justify-between border-b border-line pb-4">
        <h1 className="text-[22px] font-medium tracking-tight text-slate-900">
          Evaluation Report
        </h1>
        <Badge className="border-slate-300 text-slate-600">
          {session.status === "completed" ? "Completed" : session.status}
        </Badge>
      </header>

      {!report ? (
        <div className="mt-6 rounded-md border border-line bg-panel p-4">
          <p className="text-[13px] text-slate-600">
            No debrief available yet. The evaluator generates one after a
            completed session; you can request it again if needed.
          </p>
          <Button size="sm" className="mt-3" onClick={generate} disabled={generating}>
            Generate report
          </Button>
        </div>
      ) : (
        <>
          <section className="mt-5">
            <HireSignal signal={report.hireSignal} />
            {report.summary ? (
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-slate-600">
                {report.summary}
              </p>
            ) : null}
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Scores
              </span>
            </div>
            <ScoreTable scores={report.scores} />
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-line bg-panel p-3.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-600/70">
                Strengths
              </span>
              <Bullets
                items={report.strengths}
                empty="No standout strengths were noted."
              />
            </div>
            <div className="rounded-md border border-line bg-panel p-3.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-red-600/70">
                Weaknesses
              </span>
              <Bullets
                items={report.weaknesses}
                empty="No clear weaknesses were noted."
              />
            </div>
          </section>

          <section className="mt-6 rounded-md border border-line bg-panel p-3.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Architecture critique
            </span>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
              {report.architectureCritique.summary}
            </p>
            {report.architectureCritique.missingComponents.length ? (
              <>
                <p className="mt-2.5 font-mono text-[10.5px] uppercase tracking-wider text-red-600/70">
                  Missing components
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {report.architectureCritique.missingComponents.map(
                    (c, i) => (
                      <li key={i} className="text-[12px] text-slate-500">
                        • {c}
                      </li>
                    ),
                  )}
                </ul>
              </>
            ) : null}
            {report.architectureCritique.risks.length ? (
              <>
                <p className="mt-3 font-mono text-[10.5px] uppercase tracking-wider text-amber-600/70">
                  Risks
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {report.architectureCritique.risks.map((r, i) => (
                    <li key={i} className="text-[12px] text-slate-500">
                      • {r}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </>
      )}

      <section className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <Button
          variant="outline"
          size="sm"
          disabled={generating}
          onClick={() => download("interview-report.json", JSON.stringify(report, null, 2), "application/json")}
        >
          Export JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => download("interview-report.md", report ? reportToMarkdown(report) : "", "text/markdown")}
        >
          Export Markdown
        </Button>
        <Button size="sm" onClick={() => router.push("/")}>
          Start a new interview
        </Button>
      </section>
    </div>
  );
}

export function reportToMarkdown(report: Report): string {
  const L = ["# Evaluation Report", "", `**Signal:** ${report.hireSignal}`, ""];
  L.push("## Summary", "", report.summary, "");
  L.push("## Scores", "");
  for (const s of report.scores) {
    L.push(`- **${SCORE_LABELS[s.key]}**: ${s.score}/5 — ${s.rationale}`);
  }
  L.push("");
  L.push("## Strengths", "");
  for (const x of report.strengths) L.push(`- ${x.point}${x.evidence ? ` — "${x.evidence}"` : ""}`);
  L.push("");
  L.push("## Weaknesses", "");
  for (const x of report.weaknesses) L.push(`- ${x.point}${x.evidence ? ` — "${x.evidence}"` : ""}`);
  L.push("");
  L.push("## Architecture critique", "", report.architectureCritique.summary, "");
  for (const c of report.architectureCritique.missingComponents) L.push(`- Missing: ${c}`);
  for (const r of report.architectureCritique.risks) L.push(`- Risk: ${r}`);
  return L.join("\n");
}
