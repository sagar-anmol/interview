"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  MonitorPlay,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import { PracticeModal } from "@/components/practice/PracticeModal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { saveSession } from "@/lib/db";
import { NETFLIX, SCENARIO_POOL } from "@/lib/interview/scenarios";
import type { InterviewerGuide, InterviewMode } from "@/lib/interview/types";
import { getTrack, TRACKS, type PracticeTrack } from "@/lib/practice/types";
import { toPersisted, useInterviewStore } from "@/store/useInterviewStore";
import { cn, shortId } from "@/lib/utils";

export function SetupForm({
  initialMode,
  initialTrack,
}: {
  initialMode: InterviewMode;
  initialTrack?: string;
}) {
  const router = useRouter();
  const init = useInterviewStore((s) => s.init);
  const setGuide = useInterviewStore((s) => s.setGuide);

  const [mode, setMode] = React.useState<InterviewMode>(initialMode);
  const [track, setTrack] = React.useState<PracticeTrack>(
    getTrack(initialTrack).id,
  );
  const [duration, setDuration] = React.useState(
    Math.round(getTrack(initialTrack).durationSec / 60),
  );
  const [format, setFormat] = React.useState<"voice" | "text">("voice");
  const [trackPickerOpen, setTrackPickerOpen] = React.useState(false);
  const [starting, setStarting] = React.useState(false);

  const selectedTrack = getTrack(track);
  const recommendedMinutes = Math.round(selectedTrack.durationSec / 60);
  const durationOptions = React.useMemo(
    () =>
      Array.from(new Set([recommendedMinutes, 30, 45, 60])).sort(
        (a, b) => a - b,
      ),
    [recommendedMinutes],
  );

  const start = async () => {
    setStarting(true);
    try {
      const id = crypto.randomUUID();
      let scenarioId = NETFLIX.id;
      let guide: InterviewerGuide | null = null;

      if (mode === "peer") {
        const res = await fetch("/api/interview/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            guide?: InterviewerGuide & { scenarioId?: string };
          };
          if (data.guide?.scenarioId) {
            scenarioId = data.guide.scenarioId;
            guide = {
              focusAreas: data.guide.focusAreas ?? [],
              probeQuestions: data.guide.probeQuestions ?? [],
              redFlags: data.guide.redFlags ?? [],
              timeline: data.guide.timeline ?? [],
            };
          }
        }
      }

      init({
        id,
        mode,
        scenarioId,
        durationSec: duration * 60,
        format: format === "text" ? "text" : "voice",
        roomCode: mode === "peer" ? shortId() : undefined,
        practiceMeta:
          mode === "ai"
            ? {
                track,
                targetRole: getTrack(track).title,
              }
            : undefined,
        createdAt: Date.now(),
      });
      if (guide) setGuide(guide);

      const persisted = toPersisted(useInterviewStore.getState());
      if (persisted) await saveSession(persisted);

      if (mode === "ai") {
        router.push(`/practice/session/${track}/${id}`);
      } else {
        router.push(`/interview/${id}`);
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "error",
        title: "Could not create the session",
        description: "Check the server logs and try again.",
      });
      setStarting(false);
    }
  };

  return (
    <main className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-7">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-muted hover:text-slate-700"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>

        <h1 className="md-enter mt-5 text-[24px] font-medium tracking-tight text-slate-900">
          New interview
        </h1>
        <p className="mt-1 text-[12.5px] text-muted">
          Configure the session before the clock starts.
        </p>

        <section className="mt-6">
          <SectionLabel index="01" title="Mode" />
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <SelectCard
              active={mode === "ai"}
              onClick={() => setMode("ai")}
              icon={<MonitorPlay className="h-4 w-4" />}
              title="AI interviewer"
              description="Solo session. Voice loop, live rubric, immediate debrief."
            />
            <SelectCard
              active={mode === "peer"}
              onClick={() => setMode("peer")}
              icon={<Users className="h-4 w-4" />}
              title="Peer mock"
              description="Two-person room. AI picks the question and debriefs both sides."
            />
          </div>
        </section>

        {mode === "ai" ? (
          <section className="md-card-in mt-5">
            <SectionLabel index="02" title="Interview type" />
            <button
              type="button"
              onClick={() => setTrackPickerOpen(true)}
              aria-label="Choose interview type"
              aria-haspopup="dialog"
              className="md-press glass-subtle backdrop-blur-lg backdrop-saturate-150 mt-2.5 flex w-full items-center gap-3 rounded-md p-3.5 text-left transition-[border-color,box-shadow,transform] hover:border-slate-400/70 hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/70 bg-white/70 text-slate-700">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-slate-900">
                  {selectedTrack.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                  {selectedTrack.description}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-muted">
                {recommendedMinutes} min
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </button>
          </section>
        ) : null}

        {mode === "peer" ? (
          <section className="mt-5">
            <SectionLabel index="03" title="Question" />
            <div className="glass-subtle backdrop-blur-lg backdrop-saturate-150 mt-2.5 rounded-md p-3">
              <p className="text-[12.5px] text-slate-900">
                The AI selects the question
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                On start, the interviewer picks a scenario from the system
                design pool and writes a private guide: focus areas, probe
                questions, red flags, and time markers.
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                Pool: {SCENARIO_POOL.map((s) => s.title.replace("Design ", "")).join(" · ")}
              </p>
            </div>
          </section>
        ) : track === "system-design" ? (
          <section className="mt-5">
            <SectionLabel index="03" title="Scenario" />
            <div className="glass-subtle backdrop-blur-lg backdrop-saturate-150 mt-2.5 rounded-md p-3">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-medium text-slate-900">
                  {NETFLIX.title}
                </p>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                {NETFLIX.prompt}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                {NETFLIX.milestones.length} milestones · adaptive rubric
              </p>
            </div>
          </section>
        ) : null}

        <section className="mt-5">
          <SectionLabel index="04" title="Duration" />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {durationOptions.map((min) => (
              <button
                key={min}
                onClick={() => setDuration(min)}
                className={cn(
                  "md-press min-w-[92px] flex-1 rounded-md border bg-white/50 px-3 py-2.5 text-left backdrop-blur transition-colors",
                  duration === min
                    ? "border-slate-300/80 bg-white/80 shadow-sm shadow-slate-900/10"
                    : "border-white/70 hover:border-slate-300 hover:bg-white/70",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[13px]",
                    duration === min ? "text-slate-800" : "text-slate-900",
                  )}
                >
                  {min} min
                </span>
                <span className="mt-0.5 block text-[10.5px] text-muted">
                  {min === recommendedMinutes
                    ? "recommended"
                    : min <= 20
                      ? "quick round"
                      : min === 30
                        ? "short round"
                        : min === 45
                          ? "standard loop"
                          : "extended"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <SectionLabel index="05" title="Format" />
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <SelectCard
              active={format === "voice"}
              onClick={() => setFormat("voice")}
              icon={<Mic className="h-4 w-4" />}
              title="Voice conversation"
              description="Speak naturally, interrupt anytime, hear the interviewer."
            />
            <SelectCard
              active={format === "text"}
              onClick={() => setFormat("text")}
              icon={<span className="font-mono text-[11px]">Aa</span>}
              title="Text only"
              description="Type answers. Useful for quiet environments."
            />
          </div>
        </section>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
          <p className="max-w-[320px] font-mono text-[10px] leading-relaxed text-muted">
            {mode === "peer"
              ? "You will get a room code to share. The candidate joins from another browser."
              : "Microphone permission is requested when the session begins."}
          </p>
          <Button
            size="lg"
            onClick={start}
            disabled={starting}
            className="min-w-[150px]"
          >
            {starting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Preparing…
              </>
            ) : (
              "Start interview"
            )}
          </Button>
        </div>
      </div>

      <PracticeModal
        open={trackPickerOpen && mode === "ai"}
        onClose={() => setTrackPickerOpen(false)}
        eyebrow="Session setup"
        title="Choose your interview type"
        width="lg"
        footer={
          <Button className="w-full" onClick={() => setTrackPickerOpen(false)}>
            Use this type
          </Button>
        }
      >
        <p className="text-[11.5px] leading-relaxed text-slate-600">
          Pick what you want to practise. We&apos;ll set the question style and
          suggested timing for you.
        </p>
        <div
          role="radiogroup"
          aria-label="Interview type"
          className="md-stagger mt-4 grid gap-2 sm:grid-cols-2"
        >
          {TRACKS.map((item) => {
            const active = track === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setTrack(item.id);
                  setDuration(Math.round(item.durationSec / 60));
                }}
                className={cn(
                  "md-press rounded-md border bg-white/50 p-3 text-left backdrop-blur transition-colors",
                  active
                    ? "border-slate-300/80 bg-white/80 shadow-sm shadow-slate-900/10"
                    : "border-white/70 hover:border-slate-300 hover:bg-white/70",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-[12.5px] font-medium",
                      active ? "text-slate-800" : "text-slate-900",
                    )}
                  >
                    {item.shortTitle}
                  </span>
                  {active ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-slate-700" />
                  ) : item.isNew ? (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  {item.title === item.shortTitle
                    ? item.description
                    : `${item.title} — ${item.description}`}
                </p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-muted">
                  {item.durationSec / 60} min
                </p>
              </button>
            );
          })}
        </div>
      </PracticeModal>
    </main>
  );
}

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted">{index}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {title}
      </span>
      <span className="h-px flex-1 bg-slate-300/80" />
    </div>
  );
}

function SelectCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "md-press rounded-md border bg-white/50 p-3 text-left backdrop-blur transition-colors",
        active
          ? "border-slate-300/80 bg-white/80 shadow-sm shadow-slate-900/10"
          : "border-white/70 hover:border-slate-300 hover:bg-white/70",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={active ? "text-slate-700" : "text-muted"}>{icon}</span>
        {active ? <Check className="h-3.5 w-3.5 text-slate-700" /> : null}
      </div>
      <p className="mt-2 text-[12.5px] font-medium text-slate-900">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
        {description}
      </p>
    </button>
  );
}
