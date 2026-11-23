"use client";

import {
  BriefcaseBusiness,
  Code2,
  Database,
  Layers3,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PracticeModal } from "@/components/practice/PracticeModal";
import { TRACKS, type PracticeTrack, type TrackMeta } from "@/lib/practice/types";
import { cn } from "@/lib/utils";

const ICONS = {
  layers: Layers3,
  code: Code2,
  message: Sparkles,
  users: Users,
  database: Database,
  briefcase: BriefcaseBusiness,
};

interface TrackPickerModalProps {
  open: boolean;
  selected: PracticeTrack;
  onSelect: (track: PracticeTrack) => void;
  onClose: () => void;
  onStart: () => void;
}

export function TrackPickerModal({
  open,
  selected,
  onSelect,
  onClose,
  onStart,
}: TrackPickerModalProps) {
  return (
    <PracticeModal
      open={open}
      onClose={onClose}
      title="Select your AI interviewer"
      eyebrow="Practice"
      width="lg"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
          <Button onClick={onStart} className="w-full">
            Start
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-3 py-2.5">
        <p className="text-[11.5px] text-zinc-400">
          Want to unlock unlimited AI interviewing?
        </p>
        <Button variant="outline" size="sm">Upgrade</Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {TRACKS.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            active={selected === track.id}
            onClick={() => onSelect(track.id)}
          />
        ))}
      </div>
    </PracticeModal>
  );
}

function TrackCard({
  track,
  active,
  onClick,
}: {
  track: TrackMeta;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = ICONS[track.icon];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-[92px] gap-3 rounded-lg border p-3 text-left transition",
        active
          ? "border-zinc-400 bg-zinc-900/70"
          : "border-line bg-panel hover:border-line-strong",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
          active
            ? "border-zinc-500 bg-zinc-800 text-zinc-100"
            : "border-line bg-panel-2 text-zinc-500",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-zinc-200">
          {track.title}
        </span>
        <span className="mt-1 block text-[11px] leading-relaxed text-zinc-500">
          {track.description}
        </span>
      </span>
      {track.isNew ? (
        <span className="absolute right-2 top-2 rounded border border-line-strong bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-zinc-400">
          New
        </span>
      ) : null}
    </button>
  );
}
