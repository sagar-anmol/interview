"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Dices,
  MessageSquareText,
  Mic,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PracticeModal } from "@/components/practice/PracticeModal";
import {
  PM_FOCUS_AREAS,
  TARGET_ROLES,
  type InterviewFormat,
  type PracticeTrack,
  type TrackMeta,
} from "@/lib/practice/types";
import { cn } from "@/lib/utils";

export interface SetupResult {
  track: PracticeTrack;
  focusArea?: string;
  format: InterviewFormat;
  role?: string;
}

interface PracticeSetupModalProps {
  open: boolean;
  track: TrackMeta;
  onClose: () => void;
  onStart: (result: SetupResult) => void;
}

const COPY: Record<string, string> = {
  "system-design":
    "In this 20 minute System Design session, the AI interviewer will ask questions, react to your architecture, and provide detailed feedback when you submit.",
  dsa: "In this 20 minute Data Structures & Algorithms session, the AI interviewer will provide questions, assistance, and detailed feedback when you submit.",
  "product-management":
    "In this 20 minute Product Management session, the AI interviewer will ask product sense questions and give feedback when you submit.",
  behavioral:
    "In this 10 minute Behavioral session, you'll discuss a question about your work experience and submit it for structured feedback.",
  sql: "In this 20 minute SQL session, the AI interviewer will ask query-writing questions and give feedback when you submit.",
  "investment-banking":
    "In this 20 minute Investment Banking session, the AI interviewer will ask technical finance questions and give feedback when you submit.",
};

export function PracticeSetupModal({
  open,
  track,
  onClose,
  onStart,
}: PracticeSetupModalProps) {
  const [focusArea, setFocusArea] = React.useState<string | null>(null);
  const [focusOpen, setFocusOpen] = React.useState(false);
  const [format, setFormat] = React.useState<InterviewFormat | null>(null);
  const [role, setRole] = React.useState("");

  const needsFocus = track.id === "product-management";
  const needsRole = track.id === "behavioral";
  const needsFormat = needsFocus || needsRole || track.id === "sql" || track.id === "investment-banking";
  const ready =
    (!needsFocus || Boolean(focusArea)) &&
    (!needsRole || Boolean(role)) &&
    (!needsFormat || Boolean(format));

  const start = () => {
    if (!ready) return;
    onStart({
      track: track.id,
      focusArea: focusArea ?? undefined,
      format: format ?? "conversation",
      role: role || undefined,
    });
  };

  return (
    <PracticeModal
      open={open}
      onEscape={onClose}
      title="Practice with AI"
      eyebrow={track.shortTitle}
      footer={
        <Button size="lg" className="w-full" disabled={!ready} onClick={start}>
          Start interview
        </Button>
      }
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line-strong bg-zinc-900 text-zinc-300">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <p className="text-[12.5px] leading-relaxed text-zinc-400">
          {COPY[track.id] ?? COPY["system-design"]}
        </p>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[11.5px] font-medium text-zinc-300">
          To ensure the best experience:
        </p>
        <ul className="mt-2 space-y-1.5">
          <li className="flex items-center gap-2 text-[11.5px] text-zinc-500">
            <Check className="h-3 w-3 text-muted" />
            Minimize background noise
          </li>
          <li className="flex items-center gap-2 text-[11.5px] text-zinc-500">
            <Check className="h-3 w-3 text-muted" />
            Maintain a stable internet connection
          </li>
        </ul>
      </div>

      {needsFocus ? (
        <div className="mt-5 border-t border-line pt-4">
          <label className="text-[11.5px] font-medium text-zinc-300">
            Choose focus area
          </label>
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setFocusOpen((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-md border border-line-strong bg-panel px-3 py-2.5 text-left hover:border-zinc-600"
            >
              <Dices className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] text-zinc-200">
                  {focusArea
                    ? PM_FOCUS_AREAS.find((a) => a.id === focusArea)?.title
                    : "Pick a question for me"}
                </span>
                <span className="block truncate text-[10.5px] text-muted">
                  {focusArea
                    ? PM_FOCUS_AREAS.find((a) => a.id === focusArea)?.description
                    : "Surprise me with a random PM question"}
                </span>
              </span>
              {focusOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              )}
            </button>
            {focusOpen ? (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-line-strong bg-panel-2 p-1 shadow-xl shadow-black/60">
                {PM_FOCUS_AREAS.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      setFocusArea(area.id);
                      setFocusOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 rounded px-2.5 py-2 text-left text-[11.5px] hover:bg-zinc-900",
                      focusArea === area.id ? "bg-zinc-900" : "",
                    )}
                  >
                    <span className="mt-0.5 min-w-0 flex-1">
                      <span className="block text-zinc-200">{area.title}</span>
                      <span className="mt-0.5 block text-[10px] text-muted">
                        {area.description}
                      </span>
                    </span>
                    {focusArea === area.id ? (
                      <Check className="mt-0.5 h-3 w-3 text-zinc-300" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {needsRole ? (
        <div className="mt-5 border-t border-line pt-4">
          <label htmlFor="target-role" className="text-[11.5px] font-medium text-zinc-300">
            Your target role
          </label>
          <div className="relative mt-2">
            <select
              id="target-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 w-full appearance-none rounded-md border border-line-strong bg-panel px-3 pr-8 text-[12px] text-zinc-200 outline-none focus:border-zinc-500"
            >
              <option value="">Select your role...</option>
              {TARGET_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted" />
          </div>
        </div>
      ) : null}

      {needsFormat ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[11.5px] font-medium text-zinc-300">Interview format</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <FormatCard
              active={format === "conversation"}
              onClick={() => setFormat("conversation")}
              icon={<MessageSquareText className="h-4 w-4" />}
              title="Conversation"
              description="Simulate a realistic interview"
            />
            <FormatCard
              active={format === "record"}
              onClick={() => setFormat("record")}
              icon={<Mic className="h-4 w-4" />}
              title="Record"
              description="Record an answer and get feedback"
            />
          </div>
        </div>
      ) : null}
    </PracticeModal>
  );
}

function FormatCard({
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
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-4 text-center transition",
        active
          ? "border-zinc-400 bg-zinc-900/70"
          : "border-line bg-panel hover:border-line-strong",
      )}
    >
      <span className={cn("mb-1", active ? "text-zinc-200" : "text-zinc-500")}>{icon}</span>
      <span className="text-[12px] font-medium text-zinc-200">{title}</span>
      <span className="text-[10px] leading-snug text-muted">{description}</span>
    </button>
  );
}
