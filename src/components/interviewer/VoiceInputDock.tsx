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
              ? "border-line-strong bg-slate-100 text-slate-500"
              : "border-slate-300 bg-slate-200/80 text-slate-900",
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
            className="h-9 w-full rounded-md border border-line bg-panel pl-2.5 pr-9 text-[12.5px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={!value.trim() || disabled}
            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
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
              ? "border-red-500/30 bg-red-600/10 text-red-600 hover:bg-red-600/20"
              : "border-line bg-transparent text-slate-500",
          )}
          aria-label="Interrupt interviewer"
          title="Interrupt (Esc)"
        >
          <Square className="h-3 w-3" fill="currentColor" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-0.5">
        <p className="font-mono text-[9.5px] tracking-tight text-slate-400">
          {disabled
            ? "Session ended"
            : vadMode === "ptt"
              ? "Hold Space to talk · Esc to interrupt"
              : "Speak to interrupt · Esc to interrupt"}
        </p>
        {micLevel > 0.02 && !muted ? (
          <span className="font-mono text-[9.5px] text-slate-400">
            MIC {Math.round(micLevel * 100)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
