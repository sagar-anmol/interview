"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  MonitorPlay,
  Mic,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { saveSession } from "@/lib/db";
import { NETFLIX, SCENARIO_POOL } from "@/lib/interview/scenarios";
import type { InterviewerGuide, InterviewMode } from "@/lib/interview/types";
import { toPersisted, useInterviewStore } from "@/store/useInterviewStore";
import { cn, shortId } from "@/lib/utils";

const DURATIONS = [30, 45, 60];

export function SetupForm({ initialMode }: { initialMode: InterviewMode }) {
  const router = useRouter();
  const init = useInterviewStore((s) => s.init);
  const setGuide = useInterviewStore((s) => s.setGuide);

  const [mode, setMode] = React.useState<InterviewMode>(initialMode);
  const [duration, setDuration] = React.useState(45);
  const [format, setFormat] = React.useState<"voice" | "text">("voice");
  const [starting, setStarting] = React.useState(false);

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
        format,
        roomCode: mode === "peer" ? shortId() : undefined,
        createdAt: Date.now(),
      });
      if (guide) setGuide(guide);

      const persisted = toPersisted(useInterviewStore.getState());
      if (persisted) await saveSession(persisted);

      router.push(`/interview/${id}`);
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
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>

        <h1 className="mt-6 text-[24px] font-medium tracking-tight text-zinc-100">
          New interview
        </h1>
        <p className="mt-1 text-[12.5px] text-zinc-500">
          Configure the session before the clock starts.
        </p>

        <section className="mt-7">
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

        {mode === "peer" ? (
          <section className="mt-6">
            <SectionLabel index="02" title="Question" />
            <div className="mt-2.5 rounded-md border border-line bg-panel p-3">
              <p className="text-[12.5px] text-zinc-200">
                The AI selects the question
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
                On start, Gemini picks a scenario from the system design pool
                and writes a private interviewer guide: focus areas, probe
                questions, red flags, and time markers.
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                Pool: {SCENARIO_POOL.map((s) => s.title.replace("Design ", "")).join(" · ")}
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-6">
            <SectionLabel index="02" title="Scenario" />
            <div className="mt-2.5 rounded-md border border-line-strong bg-panel p-3">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-medium text-zinc-100">
                  {NETFLIX.title}
                </p>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
                {NETFLIX.prompt}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                {NETFLIX.milestones.length} milestones · adaptive rubric
              </p>
            </div>
          </section>
        )}

        <section className="mt-6">
          <SectionLabel index="03" title="Duration" />
          <div className="mt-2.5 flex gap-2">
            {DURATIONS.map((min) => (
              <button
                key={min}
                onClick={() => setDuration(min)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2.5 text-left transition-colors",
                  duration === min
                    ? "border-zinc-500 bg-zinc-900"
                    : "border-line bg-panel hover:border-line-strong",
                )}
              >
                <span className="font-mono text-[13px] text-zinc-200">
                  {min} min
                </span>
                <span className="mt-0.5 block text-[10.5px] text-zinc-600">
                  {min === 45
                    ? "standard loop"
                    : min === 30
                      ? "short round"
                      : "extended"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <SectionLabel index="04" title="Format" />
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <SelectCard
              active={format === "voice"}
              onClick={() => setFormat("voice")}
              icon={<Mic className="h-4 w-4" />}
              title="Voice conversation"
              description="Hands-free VAD, barge-in, spoken interviewer."
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

        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <p className="max-w-[320px] font-mono text-[10px] leading-relaxed text-zinc-600">
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
    </main>
  );
}

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-zinc-700">{index}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </span>
      <span className="h-px flex-1 bg-line" />
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
        "rounded-md border p-3 text-left transition-colors",
        active
          ? "border-zinc-500 bg-zinc-900/80"
          : "border-line bg-panel hover:border-line-strong",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-zinc-500">{icon}</span>
        {active ? <Check className="h-3.5 w-3.5 text-zinc-300" /> : null}
      </div>
      <p className="mt-2 text-[12.5px] font-medium text-zinc-200">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
        {description}
      </p>
    </button>
  );
}
