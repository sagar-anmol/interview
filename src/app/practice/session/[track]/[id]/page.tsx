"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { CodingWorkspace } from "@/components/practice/sessions/CodingWorkspace";
import { RecordWorkspace } from "@/components/practice/sessions/RecordWorkspace";
import { SystemDesignWorkspace } from "@/components/practice/sessions/SystemDesignWorkspace";
import { VoiceStageWorkspace } from "@/components/practice/sessions/VoiceStageWorkspace";
import { getTrack } from "@/lib/practice/types";
import { useInterviewStore } from "@/store/useInterviewStore";

function PracticeSession() {
  const params = useParams<{ track: string; id: string }>();
  const id = params.id;
  const format = useInterviewStore((s) => s.config?.format ?? "voice");
  const targetRole = useInterviewStore((s) => s.config?.practiceMeta?.targetRole);

  const track = getTrack(params.track);

  if (track.id === "system-design") return <SystemDesignWorkspace id={id} />;
  if (track.id === "dsa") return <CodingWorkspace id={id} />;
  if (format === "text") {
    return <RecordWorkspace id={id} track={track.id} role={targetRole} />;
  }
  return <VoiceStageWorkspace id={id} track={track.id} role={targetRole} />;
}

export default function PracticeSessionPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen items-center justify-center font-mono text-[11px] text-zinc-500">
          Loading session…
        </div>
      }
    >
      <PracticeSession />
    </React.Suspense>
  );
}
