"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  Cloud,
  Code2,
  Database,
  FileText,
  Layers3,
  Monitor,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";
import { listSessions, type StoredSession } from "@/lib/db";
import { getScenario } from "@/lib/interview/scenarios";
import { TRACKS, type TrackMeta } from "@/lib/practice/types";
import { cn, formatClock } from "@/lib/utils";

const TRACK_ICONS = {
  layers: Layers3,
  code: Code2,
  message: Sparkles,
  users: Users,
  database: Database,
  briefcase: BriefcaseBusiness,
  sparkles: Sparkles,
  monitor: Monitor,
  activity: Activity,
  cloud: Cloud,
};

const MODES = [
  {
    index: "01 / AI",
    href: "/new?mode=ai",
    icon: Terminal,
    title: "Practice with AI",
    description:
      "A voice interviewer asks follow-ups, challenges your answers, and scores the session against a rubric.",
    meta: "Speak freely · interrupt anytime · instant debrief",
  },
  {
    index: "02 / PEER",
    href: "/new?mode=peer",
    icon: Users,
    title: "Host a peer mock",
    description:
      "Two browsers, one room. AI picks the question and writes the interviewer guide, then debriefs both sides.",
    meta: "Two browsers · shared canvas · AI debrief",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Pick a track",
    body: "System design, DSA, SQL, behavioral, ML, frontend and more.",
  },
  {
    n: "02",
    title: "Run the session",
    body: "Speak your answers, draw on the whiteboard, or write code.",
  },
  {
    n: "03",
    title: "Read the debrief",
    body: "Scored dimensions, quoted evidence, and concrete next steps.",
  },
];

/** Ambient field — decorative only, GPU-composited CSS transforms. */
function AmbientField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="md-ambient-a absolute -left-[20%] -top-[26%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(100,116,139,0.20),transparent_66%)]" />
      <div className="md-ambient-b absolute -right-[16%] top-[4%] h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.22),transparent_66%)]" />
      <div className="md-ambient-a absolute -bottom-[24%] left-[28%] h-[52vh] w-[52vh] rounded-full bg-[radial-gradient(circle,rgba(71,85,105,0.14),transparent_68%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(71,85,105,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(71,85,105,0.10)_1px,transparent_1px)] bg-[length:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
    </div>
  );
}

function TrackCard({ track }: { track: TrackMeta }) {
  const Icon = TRACK_ICONS[track.icon];
  return (
    <Link
      href={`/new?mode=ai&track=${track.id}`}
      className="md-lift glass-subtle backdrop-blur-lg backdrop-saturate-150 group flex min-h-[132px] flex-col rounded-xl p-4 transition-colors hover:border-slate-300/80"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/70 bg-white/70 text-slate-700 transition-colors duration-300 group-hover:border-slate-300/80 group-hover:bg-slate-800 group-hover:text-white">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowUpRight className="md-arrow h-3.5 w-3.5 text-muted group-hover:text-slate-700" />
      </div>
      <div className="mt-auto pt-4">
        <p className="text-[13px] font-medium text-slate-900">{track.title}</p>
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
          {track.description}
        </p>
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-muted">
          <Clock className="h-3 w-3" />
          {track.durationSec / 60} min
          {track.isNew ? <span className="text-emerald-700">· new</span> : null}
        </p>
      </div>
    </Link>
  );
}

function ModeCard({ mode }: { mode: (typeof MODES)[number] }) {
  const Icon = mode.icon;
  return (
    <Link
      href={mode.href}
      className="md-lift glass-subtle backdrop-blur-lg backdrop-saturate-150 group flex min-h-[168px] flex-col rounded-xl p-5 transition-colors hover:border-slate-300/80"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/70 bg-white/70 text-slate-700 transition-colors duration-300 group-hover:bg-slate-800 group-hover:text-white">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="md-arrow h-4 w-4 text-muted group-hover:text-slate-700" />
      </div>
      <div className="mt-auto pt-6">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          {mode.index}
        </p>
        <h3 className="mt-2 text-[15px] font-medium text-slate-900">
          {mode.title}
        </h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
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
    <main className="relative h-full overflow-y-auto bg-background">
      <AmbientField />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
        <header className="md-enter flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="md-pop relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-slate-800 font-mono text-[10px] font-semibold tracking-tight text-white shadow-sm shadow-slate-900/25">
              CL
            </span>
            <span className="leading-tight">
              <span className="block text-[14px] font-semibold tracking-tight text-slate-900">
                CareerLoop
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                Interview practice
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1.5">
            <Link
              href="/new?mode=ai"
              className="rounded-md px-3 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-white/70 hover:text-slate-800"
            >
              Practice with AI
            </Link>
            <Link
              href="/reports"
              className="rounded-md px-3 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-white/70 hover:text-slate-800"
            >
              Reports
            </Link>
            <Link
              href="/new?mode=peer"
              className="md-press glass-subtle backdrop-blur-lg backdrop-saturate-150 ml-1 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-800 transition-colors hover:border-slate-400/70"
            >
              Peer interview
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </nav>
        </header>

        <section className="mt-16 grid gap-10 lg:mt-24 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="max-w-2xl">
            <p className="md-enter md-delay-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-700">
              <span className="md-dot h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Voice-first · 10 tracks · AI or peer
            </p>
            <h1 className="mt-5 text-[38px] font-medium leading-[1.08] tracking-tight text-slate-900 md:text-[56px]">
              <span className="md-enter md-delay-2 block">
                Interview practice
              </span>
              <span className="md-enter md-delay-3 block text-slate-500">
                that talks back.
              </span>
            </h1>
            <p className="md-enter md-delay-4 mt-6 max-w-xl text-[14px] leading-relaxed text-slate-600">
              Timed mocks for system design, DSA, SQL, behavioral, product, ML,
              frontend and more. Speak your answers, draw the architecture or
              write the code — then get a scored, evidence-backed debrief.
            </p>
            <div className="md-enter md-delay-4 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/new?mode=ai"
                className="md-press inline-flex h-10 items-center gap-2 rounded-lg bg-slate-800 px-5 text-[13px] font-medium text-white shadow-sm shadow-slate-900/25 transition-[background-color,box-shadow,transform] hover:bg-slate-700 hover:shadow-md hover:shadow-slate-900/30"
              >
                Practice with AI
                <ArrowRight className="md-arrow h-4 w-4" />
              </Link>
              <Link
                href="/new?mode=peer"
                className="md-press glass-subtle backdrop-blur-lg backdrop-saturate-150 inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[13px] font-medium text-slate-800 transition-colors hover:border-slate-400/70"
              >
                Peer interview
              </Link>
            </div>
          </div>

          <div aria-hidden className="md-enter md-delay-4 hidden lg:block">
            <div className="glass-panel backdrop-blur-xl backdrop-saturate-150 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                  Session preview
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-emerald-700">
                  <span className="md-dot h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Ready
                </span>
              </div>
              <div className="glass-inset backdrop-blur-md mt-4 flex h-[72px] items-center justify-center gap-1 rounded-xl px-4">
                {[0.4, 0.7, 1, 0.55, 0.85, 0.5, 0.9, 0.62, 0.75, 0.45].map(
                  (h, i) => (
                    <span
                      key={i}
                      className={cn(
                        "animate-waw w-[3px] rounded-full",
                        i % 2 === 0 ? "bg-slate-700" : "bg-slate-400",
                      )}
                      style={{
                        height: `${Math.round(h * 40)}px`,
                        animationDelay: `${i * 70}ms`,
                      }}
                    />
                  ),
                )}
              </div>
              <div className="mt-4 space-y-2">
                {TRACKS.slice(0, 4).map((track) => {
                  const Icon = TRACK_ICONS[track.icon];
                  return (
                    <div
                      key={track.id}
                      className="glass-inset backdrop-blur-md flex items-center gap-2.5 rounded-lg px-3 py-2"
                    >
                      <Icon className="h-3.5 w-3.5 text-slate-700" />
                      <span className="text-[11.5px] text-slate-700">
                        {track.shortTitle}
                      </span>
                      <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted">
                        ready
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 flex items-center gap-2 border-t border-line pt-3 font-mono text-[9.5px] uppercase tracking-wider text-muted">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                Rubric-backed evaluation
              </p>
            </div>
          </div>
        </section>

        <section id="tracks" className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Choose your interview
              </p>
              <h2 className="mt-2 text-[26px] font-medium tracking-tight text-slate-900 md:text-[32px]">
                One platform, every interview
              </h2>
            </div>
          </div>
          <div className="md-stagger mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {TRACKS.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>

        <section className="glass-panel backdrop-blur-xl backdrop-saturate-150 mt-20 grid gap-6 rounded-2xl p-6 md:grid-cols-3 md:p-8">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-3">
              <span className="font-mono text-[11px] text-slate-700">
                {step.n}
              </span>
              <div>
                <h3 className="text-[14px] font-medium text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-12 grid gap-3 sm:grid-cols-2">
          {MODES.map((mode, index) => (
            <div
              key={mode.href}
              className={index === 0 ? "md-card-in" : "md-card-in md-delay-1"}
            >
              <ModeCard mode={mode} />
            </div>
          ))}
        </section>

        {recent.length > 0 ? (
          <section className="mt-16">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Recent sessions
              </span>
              <Link
                href="/reports"
                className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-600 hover:text-slate-800"
              >
                All reports
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="md-stagger">
              {recent.map((row) => {
                const scenario = getScenario(row.payload.config.scenarioId);
                const isReport = row.payload.status === "completed";
                return (
                  <li key={row.id}>
                    <Link
                      href={isReport ? `/report/${row.id}` : `/interview/${row.id}`}
                      className="group flex items-center justify-between gap-3 border-b border-line/70 px-1 py-2.5 text-[12px] transition-colors hover:bg-white/60"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <span className="truncate text-slate-700">
                          {scenario.title}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3 font-mono text-[10px] text-muted">
                        <span>{row.payload.config.mode.toUpperCase()}</span>
                        <span>{formatClock(row.payload.config.durationSec)}</span>
                        <span
                          className={cn(
                            isReport ? "text-emerald-700" : "text-muted",
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

        <footer className="mt-20 border-t border-line pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[10px] leading-relaxed text-muted">
              CareerLoop · Interview practice
            </p>
            <p className="font-mono text-[10px] leading-relaxed text-muted">
              Timed sessions · Role-specific questions · Actionable feedback
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
