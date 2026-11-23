"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  MoreHorizontal,
  Search,
  Sparkles,
  Target,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Courses", icon: GraduationCap, chevron: true },
  { label: "Questions", icon: CircleHelp, chevron: true },
  { label: "Practice", icon: Target, active: true },
  { label: "Coaching", icon: MessageSquareText, chevron: true },
  { label: "Company Guides", icon: BookOpen },
  { label: "Experiences", icon: FileText },
  { label: "Resumes", icon: BriefcaseBusiness },
  { label: "AI Chat", icon: Sparkles },
  { label: "My Jobs", icon: CalendarDays, chevron: true },
  { label: "More", icon: MoreHorizontal, chevron: true },
];

export function AnnouncementBanner() {
  const [visible, setVisible] = React.useState(true);
  if (!visible) return null;
  return (
    <div className="flex h-9 shrink-0 items-center justify-center gap-3 border-b border-line bg-panel px-4 text-center">
      <p className="text-[11.5px] text-zinc-400 sm:truncate">
        <span className="hidden text-zinc-200 sm:inline">Just launched:</span>
        <span className="sm:hidden">New:</span> Our 2027 system design course —
        AI systems, 40+ videos.
      </p>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => setVisible(false)}
        className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-zinc-900 hover:text-zinc-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function PracticeSidebar() {
  return (
    <aside className="hidden w-[218px] shrink-0 flex-col border-r border-line bg-panel md:flex">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-line-strong bg-zinc-900 font-mono text-[9px] font-semibold tracking-tight text-zinc-100">
          CL
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-[14px] font-semibold tracking-tight text-zinc-100">
            CareerLoop
          </p>
          <p className="font-mono text-[9px] text-muted">Interview Simulator</p>
        </div>
        <button
          type="button"
          aria-label="Collapse sidebar"
          className="ml-auto rounded p-1 text-muted hover:text-zinc-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <div className="flex h-8 items-center gap-2 rounded-md border border-line bg-panel-2 px-2.5">
          <Search className="h-3.5 w-3.5 text-muted" />
          <span className="flex-1 text-[11.5px] text-muted">Search</span>
          <kbd className="rounded border border-line px-1 font-mono text-[9px] text-muted">
            ⌘K
          </kbd>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12px] transition",
                item.active
                  ? "border border-line-strong bg-zinc-900 text-zinc-100"
                  : "border border-transparent text-muted hover:bg-zinc-900/60 hover:text-zinc-300",
              )}
            >
              <Icon className={cn("h-4 w-4", item.active ? "text-zinc-300" : "text-muted")} />
              <span className="flex-1">{item.label}</span>
              {item.chevron ? <ChevronRight className="h-3 w-3 text-zinc-500" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <Button variant="outline" size="sm" className="w-full justify-center">
          <Upload className="h-3.5 w-3.5" />
          Upgrade
        </Button>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-zinc-800 text-[10px] text-zinc-300">
            SK
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[11.5px] text-zinc-300">Sagar K.</p>
            <p className="font-mono text-[9px] text-muted">Basic · 0 pts</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </div>
      </div>
    </aside>
  );
}

const PEER_CARDS = [
  { label: "Product Management", joined: 53, when: "Today", icon: Target },
  { label: "Algorithms", joined: 78, when: "Today", icon: BookOpen },
  { label: "System Design", joined: 68, when: "Tomorrow", icon: LayoutDashboard },
  { label: "Behavioral", joined: 40, when: "This week", icon: Users },
];

export function PracticeHub({ onPractice }: { onPractice: () => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <section className="relative overflow-hidden border-b border-line px-6 py-12 lg:px-12 lg:py-16">
        <div className="relative z-10 max-w-xl">
          <p className="md-enter font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Practice
          </p>
          <h1 className="md-enter md-delay-1 mt-3 text-[30px] font-medium leading-[1.15] tracking-tight text-zinc-100 lg:text-[40px]">
            Practice mock interviews with peers and AI
          </h1>
          <p className="md-enter md-delay-2 mt-4 max-w-md text-[13px] leading-relaxed text-muted">
            Run a realistic, timed interview with an AI interviewer or a peer.
            Whiteboard for system design, IDE for coding, and voice-first
            conversational practice.
          </p>
          <div className="md-enter md-delay-3 mt-6 flex flex-wrap items-center gap-2.5">
            <Button size="lg" onClick={onPractice}>
              Schedule a session
            </Button>
            <Link
              href="/new?mode=peer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Practice with a peer
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute right-8 top-1/2 hidden w-[350px] -translate-y-1/2 rotate-2 rounded-xl border border-line-strong bg-panel-2/80 p-4 lg:block">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="h-2 w-3/4 rounded bg-zinc-800" />
            <div className="h-2 w-1/2 rounded bg-zinc-800" />
            <div className="mt-4 flex gap-2">
              <div className="h-14 flex-1 rounded border border-line bg-panel" />
              <div className="h-14 flex-1 rounded border border-line bg-panel" />
            </div>
          </div>
          <div className="absolute -left-5 top-8 rounded-full border border-line-strong bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-400">
            You
          </div>
          <div className="absolute -bottom-3 right-8 rounded-full border border-line-strong bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-400">
            Interviewer
          </div>
        </div>
      </section>

      <section className="px-6 py-8 lg:px-12">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-medium tracking-tight text-zinc-200">
            Join a peer session
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous"
              className="rounded-full border border-line p-1.5 text-zinc-500 hover:text-zinc-200"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next"
              className="rounded-full border border-line p-1.5 text-zinc-500 hover:text-zinc-200"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="md-stagger mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PEER_CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-line bg-panel-2 p-4 transition hover:border-line-strong"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                Next session
              </p>
              <p className="mt-2 text-[13px] font-medium text-zinc-200">{card.label}</p>
              <p className="mt-1 text-[11px] text-muted">{card.when} · +XX more times this week</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-panel-2 bg-zinc-800 text-[9px] text-zinc-400"
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                  ))}
                  <span className="flex h-6 items-center justify-center rounded-full border border-panel-2 bg-zinc-900 px-1 text-[9px] text-muted">
                    +{card.joined}
                  </span>
                </div>
                <span className="font-mono text-[9px] text-muted">{card.joined} joined</span>
              </div>
              <Link
                href="/new?mode=peer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-4 w-full",
                )}
              >
                Schedule now →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
