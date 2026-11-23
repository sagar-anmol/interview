"use client";

import * as React from "react";
import type { Turn } from "@/lib/interview/types";
import { formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function TranscriptFeed({
  turns,
  tentative,
}: {
  turns: Turn[];
  tentative?: string;
}) {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns.length, tentative]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      {turns.length === 0 ? (
        <p className="mt-6 text-center font-mono text-[11px] leading-relaxed text-slate-500">
          The interviewer will open the session.
          <br />
          Answer aloud or type below.
        </p>
      ) : null}

      <div className="space-y-3.5">
        {turns.map((turn) => {
          const isInterviewer = turn.speaker === "interviewer";
          const body =
            isInterviewer && turn.interrupted
              ? turn.spokenText ?? ""
              : turn.text;
          return (
            <div key={turn.id} className="animate-fade-in">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "font-mono text-[9.5px] uppercase tracking-[0.14em]",
                    isInterviewer ? "text-slate-500" : "text-slate-600",
                  )}
                >
                  {isInterviewer ? "Interviewer" : "You"}
                </span>
                <span className="font-mono text-[9.5px] text-slate-400">
                  {formatTimestamp(turn.ts)}
                </span>
              </div>
              <p
                className={cn(
                  "whitespace-pre-wrap text-[12.5px] leading-relaxed",
                  isInterviewer ? "text-slate-700" : "text-slate-900",
                )}
              >
                {body || (turn.pending ? "" : "…")}
                {turn.pending && !body ? (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <span className="h-1 w-1 animate-live rounded-full bg-slate-300" />
                    <span
                      className="h-1 w-1 animate-live rounded-full bg-slate-300"
                      style={{ animationDelay: "160ms" }}
                    />
                    <span
                      className="h-1 w-1 animate-live rounded-full bg-slate-300"
                      style={{ animationDelay: "320ms" }}
                    />
                  </span>
                ) : null}
                {isInterviewer && turn.interrupted ? (
                  <span className="ml-1.5 font-mono text-[10px] italic text-slate-500">
                    [interrupted]
                  </span>
                ) : null}
              </p>
            </div>
          );
        })}

        {tentative?.trim() ? (
          <div className="animate-fade-in">
            <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-500">
              You · live
            </div>
            <p className="text-[12.5px] italic leading-relaxed text-slate-500">
              {tentative}
            </p>
          </div>
        ) : null}
      </div>
      <div ref={endRef} />
    </div>
  );
}
