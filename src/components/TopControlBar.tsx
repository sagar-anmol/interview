"use client";

import * as React from "react";
import { CircleStop, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PHASE_LABEL, type PhaseKey } from "@/lib/interview/fsm";
import { formatClock } from "@/lib/utils";
import type { SessionStatus } from "@/lib/interview/types";

export function TopControlBar({
  remainingSec,
  phase,
  status,
  ttfaMs,
  roleLine,
  onPause,
  onResume,
  onEnd,
}: {
  remainingSec: number;
  phase: PhaseKey;
  status: SessionStatus;
  ttfaMs: number | null;
  roleLine: string;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const live = status === "live";
  const warning = remainingSec <= 300;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-panel px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Badge
          className={
            live
              ? "border-red-500/30 text-red-600"
              : "border-line text-slate-500"
          }
        >
          <span
            className={
              live
                ? "h-1.5 w-1.5 rounded-full bg-red-600 animate-live"
                : "h-1.5 w-1.5 rounded-full bg-slate-400"
            }
          />
          {live ? "Live" : status === "paused" ? "Paused" : "Ended"}
        </Badge>
        <span className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-slate-700">
          System Design Interview
        </span>
        <span className="hidden truncate text-[11px] text-slate-500 lg:inline">
          {roleLine}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`font-mono text-[15px] tabular-nums tracking-tight ${
            warning ? "text-amber-600" : "text-slate-900"
          }`}
        >
          {formatClock(remainingSec)}
        </span>
        <span className="rounded border border-line bg-panel px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-600">
          {PHASE_LABEL[phase]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden rounded border border-line bg-panel px-2 py-0.5 font-mono text-[10px] tracking-tight text-slate-500 xl:inline">
          TTFA: {ttfaMs ? `${ttfaMs}ms` : "—"}
        </span>
        {status === "paused" ? (
          <Button variant="subtle" size="sm" onClick={onResume}>
            <Play className="h-3 w-3" />
            Resume
          </Button>
        ) : (
          <Button
            variant="subtle"
            size="sm"
            onClick={onPause}
            disabled={!live}
          >
            <Pause className="h-3 w-3" />
            Pause
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          <CircleStop className="h-3 w-3" />
          End interview
        </Button>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="End the interview?"
        description="The session will stop, the transcript is sealed, and the evaluator will generate a debrief report. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Keep going
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onEnd();
              }}
            >
              End & evaluate
            </Button>
          </>
        }
      />
    </header>
  );
}
