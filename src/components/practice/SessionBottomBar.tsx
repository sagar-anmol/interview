"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SessionBottomBarProps {
  remainingSec: number;
  onSubmit: () => void;
  right?: React.ReactNode;
  center?: React.ReactNode;
  variant?: "workspace" | "voice";
  showSubmit?: boolean;
}

function formatClock(total: number) {
  const sec = Math.max(0, Math.floor(total));
  const mm = Math.floor(sec / 60).toString().padStart(2, "0");
  const ss = (sec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function SessionBottomBar({
  remainingSec,
  onSubmit,
  right,
  center,
  variant = "workspace",
  showSubmit = true,
}: SessionBottomBarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-t border-line bg-panel",
        variant === "voice" ? "px-5 py-3.5" : "px-4 py-2.5",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {showSubmit ? (
          <Button variant="subtle" size="sm" onClick={onSubmit}>
            Submit interview
          </Button>
        ) : null}
        <span className="flex items-center gap-1.5 font-mono text-[12px] tabular-nums text-zinc-400">
          <Clock className="h-3.5 w-3.5 text-zinc-600" />
          {formatClock(remainingSec)}
        </span>
      </div>

      {center ? <div className="flex items-center gap-2">{center}</div> : null}

      <div className="flex min-w-0 items-center gap-2">{right}</div>
    </div>
  );
}
