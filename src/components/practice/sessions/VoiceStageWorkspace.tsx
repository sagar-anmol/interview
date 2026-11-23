"use client";

import * as React from "react";
import { FileText, X } from "lucide-react";
import { AiOrb } from "@/components/practice/AiOrb";
import { SessionBottomBar } from "@/components/practice/SessionBottomBar";
import { IntegrationCheckScreen } from "@/components/ui/IntegrationCheckScreen";
import { Button } from "@/components/ui/button";
import { useInterviewSession } from "@/lib/hooks/useInterviewSession";
import {
  VOICE_STAGE_QUESTION_BANK,
  VOICE_STAGE_QUESTIONS,
  type PracticeTrack,
} from "@/lib/practice/types";
import { cn } from "@/lib/utils";

interface VoiceStageWorkspaceProps {
  id: string;
  track: PracticeTrack;
  role?: string;
}

export function VoiceStageWorkspace({ id, track, role }: VoiceStageWorkspaceProps) {
  const s = useInterviewSession(id);
  const [transcriptOpen, setTranscriptOpen] = React.useState(false);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [overrideQuestion, setOverrideQuestion] = React.useState<string | null>(null);
  const bank = VOICE_STAGE_QUESTION_BANK[track] ?? [
    VOICE_STAGE_QUESTIONS[track] ?? "Walk me through your approach.",
  ];

  const interviewerTurns = s.turns.filter((t) => t.speaker === "interviewer");
  const latest = interviewerTurns[interviewerTurns.length - 1];
  const question =
    overrideQuestion ||
    latest?.spokenText ||
    latest?.text ||
    VOICE_STAGE_QUESTIONS[track] ||
    bank[0];

  const nextQuestion = () => {
    const next = (questionIndex + 1) % bank.length;
    setQuestionIndex(next);
    setOverrideQuestion(bank[next]);
    s.engineRef.current?.interrupt();
  };

  if (s.loading || !s.config) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-[11px] text-zinc-500">
        Loading session…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-5">
        <span className="text-[14px] font-semibold tracking-tight text-zinc-100">CareerLoop</span>
        <button
          type="button"
          className="rounded-full border border-line px-3 py-1.5 text-[11px] text-zinc-500 transition hover:border-line-strong hover:text-zinc-200"
        >
          Send feedback
        </button>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="relative z-10 flex flex-col items-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            The interviewer asks…
          </p>
          <h1 className="mt-5 max-w-2xl text-[28px] font-medium leading-tight tracking-tight text-zinc-100 md:text-[38px]">
            {question}
          </h1>
          {role ? (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Target role · {role}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (!s.begun) {
                s.begin();
                return;
              }
              if (s.speechState === "listening") s.engineRef.current?.interrupt();
              else s.engineRef.current?.beginPTT();
            }}
            aria-label="Speak answer"
            className="mt-10 rounded-full outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
          >
            <AiOrb
              active={s.begun}
              speaking={s.speechState === "speaking" || s.speechState === "listening"}
              level={s.micLevel}
              size="hero"
            />
          </button>
          <p className="mt-5 font-mono text-[10px] text-zinc-600">
            {!s.begun
              ? "Click the mic to enable your microphone and begin"
              : s.speechState === "listening"
                ? "Listening — click to stop"
                : s.speechState === "speaking"
                  ? "Interviewer speaking — click to interrupt"
                  : "Click to answer"}
          </p>
          {s.tentative ? (
            <p className="mt-4 max-w-xl text-[12px] italic text-zinc-500">{s.tentative}</p>
          ) : null}
        </div>

        {transcriptOpen ? (
          <aside className="absolute inset-y-3 right-3 z-20 flex w-[320px] flex-col rounded-lg border border-line-strong bg-panel-2/95 shadow-2xl shadow-black/60 backdrop-blur">
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                Transcript
              </p>
              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                aria-label="Close transcript"
                className="rounded p-1 text-zinc-600 hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
              {s.turns.length === 0 ? (
                <p className="text-[11px] text-zinc-600">The conversation will appear here.</p>
              ) : null}
              {s.turns.map((turn) => (
                <div key={turn.id}>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                    {turn.speaker}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">
                    {turn.spokenText || turn.text}
                    {turn.interrupted ? (
                      <span className="ml-1 text-zinc-600">[interrupted]</span>
                    ) : null}
                  </p>
                </div>
              ))}
              {s.tentative ? (
                <p className="text-[11.5px] italic text-zinc-600">{s.tentative}</p>
              ) : null}
            </div>
          </aside>
        ) : null}
      </main>

      <SessionBottomBar
        remainingSec={s.remaining || s.config.durationSec}
        onSubmit={() => void s.handleEnd()}
        variant="voice"
        showSubmit={false}
        center={
          <>
            <button
              type="button"
              onClick={nextQuestion}
              className="rounded-full border border-line px-3 py-1.5 text-[11px] text-zinc-500 transition hover:border-line-strong hover:text-zinc-200"
            >
              Try a different question
            </button>
            <Button variant="subtle" size="sm" onClick={() => void s.handleEnd()}>
              Submit interview
            </Button>
          </>
        }
        right={
          <button
            type="button"
            onClick={() => setTranscriptOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition",
              transcriptOpen
                ? "border-zinc-600 text-zinc-200"
                : "border-line text-zinc-500 hover:border-line-strong hover:text-zinc-200",
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Transcript
          </button>
        }
      />

      {!s.begun ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-line-strong bg-panel-2 p-5 text-center shadow-2xl shadow-black/70">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Practice with AI
            </p>
            <h2 className="mt-2 text-[18px] font-medium tracking-tight text-zinc-100">
              {question}
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
              A {s.config.durationSec / 60}-minute voice conversation. Speak naturally; the
              interviewer will follow up and provide feedback when you submit.
            </p>
            <Button size="lg" className="mt-5 w-full" onClick={s.begin}>
              Enable mic &amp; begin
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
