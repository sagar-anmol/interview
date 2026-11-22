"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Terminal, Users } from "lucide-react";
import { listSessions, type StoredSession } from "@/lib/db";
import { getScenario } from "@/lib/interview/scenarios";
import { cn, formatClock } from "@/lib/utils";

export default function Home() {
  const [recent, setRecent] = React.useState<StoredSession[]>([]);

  React.useEffect(() => {
    listSessions(6)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);

  return (
    <main className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-line-strong bg-panel font-mono text-[10px] text-zinc-400">
              SD
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
              Interview Simulator
            </span>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600 sm:inline">
            Senior engineering · system design
          </span>
        </header>

        <section className="mt-16 max-w-2xl">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500">
            Voice-first · timed · no hints
          </p>
          <h1 className="mt-3 text-[34px] font-medium leading-[1.15] tracking-tight text-zinc-100">
            A system design interview
            <br />
            that doesn&apos;t go easy on you.
          </h1>
          <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-zinc-500">
            Forty-five minutes on a whiteboard. A senior interviewer who pushes
            on numbers, bottlenecks, and failure modes. Answers are spoken, the
            diagram is drawn, and every claim is evaluated against a rubric.
          </p>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            href="/new?mode=ai"
            className="group rounded-lg border border-line-strong bg-panel p-4 transition-colors hover:border-zinc-600 hover:bg-panel-2"
          >
            <div className="flex items-center justify-between">
              <Terminal className="h-4 w-4 text-zinc-500" />
              <ArrowRight className="h-3.5 w-3.5 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
            </div>
            <h2 className="mt-3 text-[14px] font-medium text-zinc-100">
              Start an AI interview
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              A senior voice interviewer runs the full session. Single seat,
              starts immediately.
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Voice · VAD · barge-in · live rubric
            </p>
          </Link>

          <Link
            href="/new?mode=peer"
            className="group rounded-lg border border-line-strong bg-panel p-4 transition-colors hover:border-zinc-600 hover:bg-panel-2"
          >
            <div className="flex items-center justify-between">
              <Users className="h-4 w-4 text-zinc-500" />
              <ArrowRight className="h-3.5 w-3.5 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
            </div>
            <h2 className="mt-3 text-[14px] font-medium text-zinc-100">
              Host a peer mock
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              A two-person room. The AI picks the question and writes the
              interviewer guide, then debriefs both sides.
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              PeerJS · shared canvas · AI debrief
            </p>
          </Link>
        </section>

        {recent.length > 0 ? (
          <section className="mt-10">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Recent sessions
              </span>
              <span className="font-mono text-[10px] text-zinc-700">
                local device
              </span>
            </div>
            <ul>
              {recent.map((row) => {
                const scenario = getScenario(row.payload.config.scenarioId);
                const isReport = row.payload.status === "completed";
                return (
                  <li key={row.id}>
                    <Link
                      href={
                        isReport
                          ? `/report/${row.id}`
                          : `/interview/${row.id}`
                      }
                      className="flex items-center justify-between gap-3 border-b border-line/70 px-1 py-2.5 text-[12px] hover:bg-zinc-900/40"
                    >
                      <span className="truncate text-zinc-300">
                        {scenario.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-3 font-mono text-[10px] text-zinc-600">
                        <span>{row.payload.config.mode.toUpperCase()}</span>
                        <span>{formatClock(row.payload.config.durationSec)}</span>
                        <span
                          className={cn(
                            isReport ? "text-emerald-500/80" : "text-zinc-500",
                          )}
                        >
                          {isReport ? "report" : "in progress"}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <footer className="mt-auto pt-12">
          <p className="font-mono text-[10px] leading-relaxed text-zinc-700">
            Groq Whisper · Gemini Flash · Piper TTS · React Flow
          </p>
        </footer>
      </div>
    </main>
  );
}
