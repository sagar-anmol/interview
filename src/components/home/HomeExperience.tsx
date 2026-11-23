"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Terminal, Users } from "lucide-react";
import { listSessions, type StoredSession } from "@/lib/db";
import { getScenario } from "@/lib/interview/scenarios";
import { cn, formatClock } from "@/lib/utils";

const MODES = [
  {
    index: "01 / AI",
    href: "/new?mode=ai",
    icon: Terminal,
    title: "Start an AI interview",
    description:
      "A senior voice interviewer runs the full session. Single seat, starts immediately.",
    meta: "Voice · VAD · barge-in · live rubric",
  },
  {
    index: "02 / PEER",
    href: "/new?mode=peer",
    icon: Users,
    title: "Host a peer mock",
    description:
      "A two-person room. The AI picks the question and writes the interviewer guide, then debriefs both sides.",
    meta: "PeerJS · shared canvas · AI debrief",
  },
];

/** Ambient wire field — decorative only, driven entirely by CSS transforms. */
function AmbientField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="md-ambient-a absolute -left-[20%] -top-[26%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(113,113,140,0.17),transparent_66%)]" />
      <div className="md-ambient-b absolute -right-[16%] top-[4%] h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.075),transparent_66%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[length:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />

      <svg
        viewBox="0 0 620 420"
        fill="none"
        className="absolute -right-[6%] top-[16%] hidden h-[420px] w-[620px] opacity-60 lg:block"
      >
        <path
          d="M20 300 H150 L225 225 H370 L445 150 H600"
          stroke="#27272a"
          strokeWidth="1"
        />
        <path
          d="M20 300 H150 L225 225 H370 L445 150 H600"
          stroke="#a1a1aa"
          strokeWidth="1"
          className="md-wire"
          opacity="0.5"
        />
        <path d="M150 300 V360 H300 L360 300 H470" stroke="#1f1f24" strokeWidth="1" />
        {[
          [150, 300],
          [225, 225],
          [370, 225],
          [445, 150],
          [360, 300],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="#0b0b0e" stroke="#52525b" />
        ))}
        <circle cx="445" cy="150" r="6" fill="none" stroke="#3f3f46" className="animate-live" />
      </svg>
    </div>
  );
}

/** Decorative room preview — balances the hero on wide screens, no interaction. */
function SessionPreview() {
  const bars = [0.42, 0.68, 0.94, 0.58, 0.8, 0.5, 0.88, 0.63, 1, 0.55, 0.74, 0.38];
  return (
    <div aria-hidden className="md-enter md-delay-4 hidden lg:block">
      <div className="rounded-xl border border-line-strong bg-panel/70 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Interview room
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-emerald-400">
            <span className="md-dot h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            Ready
          </span>
        </div>

        <div className="mt-4 flex h-[68px] items-center justify-center gap-1 rounded-lg border border-line bg-panel-2/70 px-4">
          {bars.map((h, i) => (
            <span
              key={i}
              className="animate-waw w-[3px] rounded-full bg-zinc-600"
              style={{ height: `${Math.round(h * 38)}px`, animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-panel-2/50 px-3 py-2">
          <svg viewBox="0 0 180 52" fill="none" className="h-[52px] w-[180px]">
            <path d="M8 40 H52 L78 18 H126 L150 8 H172" stroke="#3f3f46" strokeWidth="1" />
            <path
              d="M8 40 H52 L78 18 H126 L150 8 H172"
              stroke="#a1a1aa"
              strokeWidth="1"
              opacity="0.55"
              className="md-wire"
            />
            {[
              [52, 40],
              [78, 18],
              [126, 18],
              [150, 8],
            ].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" fill="#0b0b0e" stroke="#71717a" />
            ))}
          </svg>
          <span className="font-mono text-[10px] text-muted">00:00</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
          {["Voice", "Canvas", "Rubric"].map((label) => (
            <span
              key={label}
              className="rounded border border-line bg-panel px-2 py-1.5 text-center font-mono text-[9px] uppercase tracking-wider text-zinc-400"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <header className="md-enter flex items-center justify-between gap-4">
      <Link href="/" className="group flex items-center gap-2.5">
        <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-line-strong bg-panel-2 font-mono text-[10px] font-semibold tracking-tight text-zinc-200">
          CL
          <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,rgba(228,228,231,0.18)_50%,transparent_65%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 md-sheen" />
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold tracking-tight text-zinc-100">
            CareerLoop
          </span>
          <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Interview Simulator
          </span>
        </span>
      </Link>

      <div className="flex items-center gap-2.5">
        <span className="hidden items-center gap-2 rounded-full border border-line bg-panel/70 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted lg:flex">
          <span className="md-dot h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          Senior engineering · system design
        </span>
        <Link
          href="/practice"
          className="group flex items-center gap-1.5 rounded-md border border-line bg-panel/70 px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-400 transition-colors duration-200 hover:border-line-strong hover:text-zinc-100"
        >
          Practice hub
          <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}

function ModeCard({ mode }: { mode: (typeof MODES)[number] }) {
  const Icon = mode.icon;
  return (
    <Link
      href={mode.href}
      className="md-lift md-sheen group relative flex min-h-[188px] flex-col rounded-xl border border-line-strong bg-panel/85 p-5 backdrop-blur-sm hover:border-zinc-600 hover:bg-panel-2"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel-2 text-zinc-400 transition-colors duration-300 group-hover:border-zinc-600 group-hover:text-zinc-200">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="h-4 w-4 text-zinc-500 transition-transform duration-300 ease-[var(--md-ease-standard)] group-hover:translate-x-1 group-hover:text-zinc-300" />
      </div>

      <div className="mt-auto pt-6">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          {mode.index}
        </p>
        <h2 className="mt-2 text-[15px] font-medium text-zinc-100">{mode.title}</h2>
        <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-muted">
          {mode.description}
        </p>
        <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-wider text-muted">
          {mode.meta}
        </p>
      </div>
    </Link>
  );
}

export function HomeExperience() {
  const [recent, setRecent] = React.useState<StoredSession[]>([]);

  React.useEffect(() => {
    listSessions(6)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);

  return (
    <main className="relative h-full overflow-y-auto">
      <AmbientField />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-8 lg:px-8">
        <BrandHeader />

        <section className="mt-14 grid gap-10 md:mt-20 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-12">
          <div className="max-w-xl">
            <p className="md-enter md-delay-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
              <span className="md-dot h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              Voice-first · timed · no hints
            </p>
            <h1 className="mt-5 text-[34px] font-medium leading-[1.14] tracking-tight text-zinc-100 md:text-[46px] xl:text-[50px]">
              <span className="md-enter md-delay-2 block">
                A system design interview
              </span>
              <span className="md-enter md-delay-3 block">
                that <span className="relative whitespace-nowrap">doesn&apos;t go easy on you.
                  <span className="md-underline absolute -bottom-1 left-0 h-px w-full bg-zinc-600/80" />
                </span>
              </span>
            </h1>
            <p className="md-enter md-delay-4 mt-6 max-w-xl text-[13px] leading-relaxed text-zinc-400">
              Forty-five minutes on a whiteboard. A senior interviewer who pushes
              on numbers, bottlenecks, and failure modes. Answers are spoken, the
              diagram is drawn, and every claim is evaluated against a rubric.
            </p>
          </div>
          <SessionPreview />
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          {MODES.map((mode, index) => (
            <div
              key={mode.href}
              className={index === 0 ? "md-enter md-delay-3" : "md-enter md-delay-4"}
            >
              <ModeCard mode={mode} />
            </div>
          ))}
        </section>

        {recent.length > 0 ? (
          <section className="md-enter md-delay-5 mt-12">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Recent sessions
              </span>
              <span className="font-mono text-[10px] text-muted">local device</span>
            </div>
            <ul className="md-stagger">
              {recent.map((row) => {
                const scenario = getScenario(row.payload.config.scenarioId);
                const isReport = row.payload.status === "completed";
                return (
                  <li key={row.id}>
                    <Link
                      href={isReport ? `/report/${row.id}` : `/interview/${row.id}`}
                      className="group flex items-center justify-between gap-3 border-b border-line/70 px-1 py-2.5 text-[12px] transition-colors duration-200 hover:bg-zinc-900/40"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-700 transition-colors duration-200 group-hover:bg-zinc-400" />
                        <span className="truncate text-zinc-300">{scenario.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3 font-mono text-[10px] text-muted">
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

        <footer className="mt-auto pt-14">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-5">
            <p className="font-mono text-[10px] leading-relaxed text-muted">
              CareerLoop · Interview Simulator
            </p>
            <p className="font-mono text-[10px] leading-relaxed text-zinc-400">
              Groq Whisper · Gemini Flash · Piper TTS · React Flow
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
