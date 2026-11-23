"use client";

import * as React from "react";
import { Mic, Square } from "lucide-react";
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

interface RecordWorkspaceProps {
  id: string;
  track: PracticeTrack;
  role?: string;
}

export function RecordWorkspace({ id, track, role }: RecordWorkspaceProps) {
  const s = useInterviewSession(id);
  const [answer, setAnswer] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const bank = VOICE_STAGE_QUESTION_BANK[track] ?? [
    VOICE_STAGE_QUESTIONS[track] ?? "Walk me through your approach.",
  ];
  const question = bank[0];

  if (s.loading || !s.config) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-[11px] text-zinc-500">
        Loading session…
      </div>
    );
  }

  const toggleRecording = () => {
    if (!s.begun) {
      s.begin();
      return;
    }
    if (recording) {
      s.engineRef.current?.endPTT();
      setRecording(false);
    } else {
      s.engineRef.current?.beginPTT();
      setRecording(true);
    }
  };

  const submitAnswer = () => {
    const text = answer.trim();
    if (!text) return;
    s.engineRef.current?.submitCandidateText(text);
    setAnswer("");
    setSubmitted(true);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-5">
        <span className="text-[14px] font-semibold tracking-tight text-zinc-100">CareerLoop</span>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-600">
          Recorded answer
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 py-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              Your question
            </p>
            <h1 className="mt-4 text-[24px] font-medium leading-snug tracking-tight text-zinc-100 md:text-[30px]">
              {question}
            </h1>
            {role ? (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                Target role · {role}
              </p>
            ) : null}

            <div className="mt-8 rounded-xl border border-line-strong bg-panel-2 p-5">
              <p className="text-[12px] font-medium text-zinc-300">Record your answer</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                Speak into your microphone or type your response below. You can submit more
                than one answer before ending the interview.
              </p>

              <div className="mt-5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={toggleRecording}
                  aria-label={recording ? "Stop recording" : "Start recording"}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border transition",
                    recording
                      ? "border-red-500/50 bg-red-500/15 text-red-400"
                      : "border-line-strong bg-zinc-900 text-zinc-300 hover:border-zinc-600",
                  )}
                >
                  {recording ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
                <div>
                  <p className="text-[12px] text-zinc-300">
                    {recording ? "Recording…" : "Ready to record"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                    {recording ? "Click square to stop" : "Click the mic to start"}
                  </p>
                </div>
                <div className="ml-auto">
                  <AiOrb active={s.begun} speaking={recording} level={s.micLevel} />
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="written-answer" className="text-[11.5px] text-zinc-400">
                  Or write your answer
                </label>
                <textarea
                  id="written-answer"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    setSubmitted(false);
                  }}
                  rows={7}
                  placeholder="Structure your answer: context, action, result…"
                  className="mt-2 w-full resize-none rounded-lg border border-line bg-panel px-3 py-2.5 text-[12px] leading-relaxed text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-zinc-600"
                />
                <div className="mt-3 flex items-center gap-3">
                  <Button onClick={submitAnswer} disabled={!answer.trim()}>
                    Submit answer
                  </Button>
                  {submitted ? (
                    <span className="font-mono text-[10px] text-emerald-400/80">
                      Answer sent to interviewer
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden w-[300px] shrink-0 flex-col border-l border-line bg-panel lg:flex">
          <div className="flex h-11 shrink-0 items-center border-b border-line px-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Transcript
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
                </p>
              </div>
            ))}
            {s.tentative ? (
              <p className="text-[11.5px] italic text-zinc-600">{s.tentative}</p>
            ) : null}
          </div>
        </aside>
      </div>

      <SessionBottomBar
        remainingSec={s.remaining || s.config.durationSec}
        onSubmit={() => void s.handleEnd()}
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
              Record a {s.config.durationSec / 60}-minute response and get structured feedback
              when you submit.
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
