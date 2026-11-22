"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { SpeechState, Turn } from "@/lib/interview/types";
import { TranscriptFeed } from "./TranscriptFeed";
import { VoiceInputDock } from "./VoiceInputDock";

const STATUS_LABEL: Record<SpeechState, string> = {
  idle: "Idle",
  listening: "Listening…",
  transcribing: "Transcribing…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

const STATUS_COLOR: Record<SpeechState, string> = {
  idle: "bg-zinc-600",
  listening: "bg-red-500 animate-live",
  transcribing: "bg-amber-400 animate-live",
  thinking: "bg-amber-400 animate-live",
  speaking: "bg-emerald-400",
};

function Waveform({
  speechState,
  level,
}: {
  speechState: SpeechState;
  level: number;
}) {
  void level;
  const active =
    speechState === "speaking" ||
    speechState === "listening" ||
    speechState === "transcribing";
  const base = [0.35, 0.7, 1, 0.55, 0.9, 0.45, 0.65];
  const energy = active ? 1 : 0.12;

  return (
    <div className="flex h-4 items-center gap-[3px]" aria-hidden>
      {base.map((b, i) => (
        <span
          key={i}
          className={cn(
            "w-[2px] rounded-full transition-all duration-200",
            active ? "bg-zinc-400" : "bg-zinc-700",
            active && "animate-waw",
          )}
          style={{
            height: `${Math.max(3, b * energy * 16)}px`,
            animationDelay: `${i * 0.08}s`,
            opacity: active ? 0.9 : 0.6,
          }}
        />
      ))}
    </div>
  );
}

export function InterviewerPanel({
  turns,
  tentative,
  speechState,
  micLevel,
  vadMode,
  muted,
  format,
  disabled,
  onToggleMute,
  onInterrupt,
  onPTTBegin,
  onPTTEnd,
  onSendText,
}: {
  turns: Turn[];
  tentative?: string;
  speechState: SpeechState;
  micLevel: number;
  vadMode: "auto" | "ptt";
  muted: boolean;
  format: "voice" | "text";
  disabled?: boolean;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onPTTBegin: () => void;
  onPTTEnd: () => void;
  onSendText: (text: string) => void;
}) {
  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              STATUS_COLOR[speechState],
            )}
          />
          <span className="text-[12px] font-medium text-zinc-200">
            AI Interviewer
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {speechState === "idle" ? "" : STATUS_LABEL[speechState]}
          </span>
        </div>
        <Waveform speechState={speechState} level={micLevel} />
      </div>

      <TranscriptFeed turns={turns} tentative={tentative} />

      {format === "voice" ? (
        <VoiceInputDock
          speechState={speechState}
          micLevel={micLevel}
          vadMode={vadMode}
          muted={muted}
          disabled={disabled}
          onToggleMute={onToggleMute}
          onInterrupt={onInterrupt}
          onPTTBegin={onPTTBegin}
          onPTTEnd={onPTTEnd}
          onSendText={onSendText}
        />
      ) : (
        <div className="border-t border-line bg-panel px-3 py-3">
          <TextDock disabled={disabled} onSendText={onSendText} />
          <p className="mt-1.5 font-mono text-[9.5px] tracking-tight text-zinc-700">
            Text-only session — press Enter to send.
          </p>
        </div>
      )}
    </aside>
  );
}

function TextDock({
  disabled,
  onSendText,
}: {
  disabled?: boolean;
  onSendText: (text: string) => void;
}) {
  const [value, setValue] = React.useState("");
  return (
    <input
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const text = value.trim();
          if (!text) return;
          onSendText(text);
          setValue("");
        }
      }}
      placeholder="Type your answer…"
      className="h-9 w-full rounded-md border border-line bg-[#0a0a0d] px-2.5 text-[12.5px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
    />
  );
}
