"use client";

import * as React from "react";
import {
  ArrowUp,
  Hand,
  Mic,
  MicOff,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpeechState } from "@/lib/interview/types";

export function VoiceInputDock({
  speechState,
  micLevel,
  vadMode,
  muted,
  disabled,
  onToggleMute,
  onInterrupt,
  onPTTBegin,
  onPTTEnd,
  onSendText,
}: {
  speechState: SpeechState;
  micLevel: number;
  vadMode: "auto" | "ptt";
  muted: boolean;
  disabled?: boolean;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onPTTBegin: () => void;
  onPTTEnd: () => void;
  onSendText: (text: string) => void;
}) {
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const canInterrupt =
    speechState === "speaking" || speechState === "thinking";

  const send = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSendText(text);
    setValue("");
    inputRef.current?.focus();
  };

  const ringScale = 1 + Math.min(0.55, micLevel * 0.9);

  return (
    <div className="border-t border-line bg-panel px-3 py-3">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={disabled}
          onClick={vadMode === "auto" ? onToggleMute : undefined}
          onPointerDown={
            vadMode === "ptt"
              ? (e) => {
                  e.preventDefault();
                  onPTTBegin();
                }
              : undefined
          }
          onPointerUp={
            vadMode === "ptt"
              ? () => {
                  onPTTEnd();
                }
              : undefined
          }
          onPointerLeave={
            vadMode === "ptt"
              ? () => {
                  onPTTEnd();
                }
              : undefined
          }
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
            muted
              ? "border-line-strong bg-zinc-900 text-zinc-500"
              : "border-zinc-600 bg-zinc-800/80 text-zinc-100",
            speechState === "listening" && !muted && "border-red-500/50",
            disabled && "opacity-40",
          )}
          aria-label={
            vadMode === "ptt"
              ? "Hold to talk"
              : muted
                ? "Unmute microphone"
                : "Mute microphone"
          }
          title={
            vadMode === "ptt" ? "Hold to talk (Space)" : "Click to mute/unmute"
          }
        >
          {!muted && speechState === "listening" ? (
            <span
              className="pointer-events-none absolute inset-[-5px] rounded-full border border-red-500/30 transition-transform duration-100"
              style={{ transform: `scale(${ringScale})` }}
            />
          ) : null}
          {muted ? (
            <MicOff className="h-4 w-4" />
          ) : vadMode === "ptt" ? (
            <Hand className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>

        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Speak your answer or type here…"
            className="h-9 w-full rounded-md border border-line bg-[#0a0a0d] pl-2.5 pr-9 text-[12.5px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={!value.trim() || disabled}
            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
            aria-label="Send message"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onInterrupt}
          disabled={!canInterrupt || disabled}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
            canInterrupt
              ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              : "border-line bg-transparent text-zinc-600",
          )}
          aria-label="Interrupt interviewer"
          title="Interrupt (Esc)"
        >
          <Square className="h-3 w-3" fill="currentColor" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-0.5">
        <p className="font-mono text-[9.5px] tracking-tight text-zinc-700">
          {disabled
            ? "Session ended"
            : vadMode === "ptt"
              ? "Hold Space to talk · Esc to interrupt"
              : "Speak to interrupt · Esc to interrupt"}
        </p>
        {micLevel > 0.02 && !muted ? (
          <span className="font-mono text-[9.5px] text-zinc-700">
            MIC {Math.round(micLevel * 100)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
