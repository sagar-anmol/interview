"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Mic, ShieldCheck, Timer } from "lucide-react";
import { ArchitectureCanvas } from "@/components/canvas/ArchitectureCanvas";
import { TopControlBar } from "@/components/TopControlBar";
import { LeftProgressPanel } from "@/components/LeftProgressPanel";
import { InterviewerPanel } from "@/components/interviewer/InterviewerPanel";
import { PeerInterview } from "@/components/peer/PeerInterview";
import { IntegrationCheckScreen } from "@/components/ui/IntegrationCheckScreen";
import { Button } from "@/components/ui/button";
import { useInterviewSession } from "@/lib/hooks/useInterviewSession";
import { getScenario } from "@/lib/interview/scenarios";
import { useLocationId } from "@/lib/hooks/useLocationId";

export default function InterviewPage() {
  const id = useLocationId();
  const session = useInterviewSession(id);

  if (session.loading || !id) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading session…
        </span>
      </div>
    );
  }

  if (session.missing || !session.config) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-[13px] text-slate-600">
          This session was not found on this device.
        </p>
        <Link
          href="/new?mode=ai"
          className="inline-flex items-center py-2 text-[12px] text-slate-500 underline"
        >
          Start a new session
        </Link>
      </div>
    );
  }

  if (session.config.mode === "peer") {
    return <PeerInterview sessionId={id} />;
  }

  const scenario = getScenario(session.config.scenarioId);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopControlBar
        remainingSec={session.remaining || session.config.durationSec}
        phase={session.phase}
        status={session.status}
        ttfaMs={session.ttfaMs}
        roleLine={`${scenario.company} · ${scenario.role}`}
        onPause={session.pause}
        onResume={session.resume}
        onEnd={() => void session.handleEnd()}
      />

      <div className="flex min-h-0 flex-1">
        <LeftProgressPanel
          scenario={scenario}
          milestones={session.milestones}
          phase={session.phase}
          vadMode={session.vadMode}
          strictMode={session.strictMode}
          onVadModeChange={session.changeVadMode}
          format={session.config.format}
        />

        <div className="relative min-w-0 flex-1">
          <ArchitectureCanvas />
        </div>

        <InterviewerPanel
          turns={session.turns}
          tentative={session.tentative}
          speechState={session.speechState}
          micLevel={session.micLevel}
          vadMode={session.vadMode}
          muted={session.muted}
          format={session.config.format}
          disabled={session.status !== "live"}
          onToggleMute={session.toggleMute}
          onInterrupt={() => session.engineRef.current?.interrupt()}
          onPTTBegin={() => session.engineRef.current?.beginPTT()}
          onPTTEnd={() => void session.engineRef.current?.endPTT()}
          onSendText={(text) => session.engineRef.current?.submitCandidateText(text)}
        />
      </div>

      {!session.begun ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-fade-in rounded-lg border border-line-strong bg-panel-2 p-5 shadow-2xl shadow-slate-900/15">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Pre-flight
            </p>
            <h2 className="mt-2 text-[19px] font-medium tracking-tight text-slate-900">
              {scenario.title}
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
              {scenario.prompt}
            </p>

            <ul className="mt-4 space-y-2 border-t border-line pt-3">
              <li className="flex items-center gap-2 text-[11.5px] text-slate-600">
                <Timer className="h-3.5 w-3.5 text-slate-500" />
                {Math.round(session.config.durationSec / 60)} minute timed session
              </li>
              <li className="flex items-center gap-2 text-[11.5px] text-slate-600">
                <Mic className="h-3.5 w-3.5 text-slate-500" />
                {session.config.format === "voice"
                  ? "Microphone required — headphones recommended"
                  : "Text-only — no microphone used"}
              </li>
              <li className="flex items-center gap-2 text-[11.5px] text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                Strict mode — no hints, no coaching
              </li>
            </ul>

            <Button size="lg" className="mt-5 w-full" onClick={session.begin}>
              {session.config.format === "voice" ? "Enable mic & begin" : "Begin interview"}
            </Button>
            <p className="mt-2 text-center font-mono text-[9.5px] text-slate-500">
              The clock starts when you begin.
            </p>
          </div>
        </div>
      ) : null}

      {session.showCheck ? (
        <IntegrationCheckScreen onDone={() => session.setShowCheck(false)} />
      ) : null}
    </div>
  );
}
