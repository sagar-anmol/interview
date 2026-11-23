"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AnnouncementBanner,
  PracticeHub,
  PracticeSidebar,
} from "@/components/practice/PracticeChrome";
import { PracticeSetupModal, type SetupResult } from "@/components/practice/PracticeSetupModal";
import { TrackPickerModal } from "@/components/practice/TrackPickerModal";
import { saveSession } from "@/lib/db";
import { getTrack, type PracticeTrack } from "@/lib/practice/types";
import { toPersisted, useInterviewStore } from "@/store/useInterviewStore";

export default function PracticePage() {
  const router = useRouter();
  const init = useInterviewStore((s) => s.init);

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [track, setTrack] = React.useState<PracticeTrack>("system-design");
  const [starting, setStarting] = React.useState(false);

  const start = async (result: SetupResult) => {
    if (starting) return;
    setStarting(true);
    try {
      const id = crypto.randomUUID();
      const meta = getTrack(result.track);
      init({
        id,
        mode: "ai",
        scenarioId: "netflix",
        durationSec: meta.durationSec,
        format: result.format === "record" ? "text" : "voice",
        practiceMeta: {
          track: result.track,
          focusArea: result.focusArea,
          targetRole: result.role,
        },
        createdAt: Date.now(),
      });
      const persisted = toPersisted(useInterviewStore.getState());
      if (persisted) await saveSession(persisted);
      router.push(`/practice/session/${result.track}/${id}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AnnouncementBanner />
      <div className="flex min-h-0 flex-1">
        <PracticeSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <PracticeHub onPractice={() => setPickerOpen(true)} />
        </main>
      </div>

      <TrackPickerModal
        open={pickerOpen && !setupOpen}
        selected={track}
        onSelect={setTrack}
        onClose={() => setPickerOpen(false)}
        onStart={() => {
          setPickerOpen(false);
          setSetupOpen(true);
        }}
      />

      <PracticeSetupModal
        key={track}
        open={setupOpen}
        track={getTrack(track)}
        onClose={() => {
          setSetupOpen(false);
          setPickerOpen(true);
        }}
        onStart={(result) => void start(result)}
      />
    </div>
  );
}
