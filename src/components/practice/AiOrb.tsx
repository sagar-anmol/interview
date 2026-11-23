"use client";

import { cn } from "@/lib/utils";

interface AiOrbProps {
  active?: boolean;
  speaking?: boolean;
  level?: number;
  size?: "widget" | "hero";
  className?: string;
}

/** Floating interviewer presence — idle disc or pulsing voice halo. */
export function AiOrb({
  active = false,
  speaking = false,
  level = 0,
  size = "widget",
  className,
}: AiOrbProps) {
  const hero = size === "hero";
  const scale = Math.min(1, Math.max(0, level));
  const inner = hero ? "h-24 w-24" : "h-9 w-9";
  const halo = hero ? "h-44 w-44" : "h-[68px] w-[68px]";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full",
        hero ? "h-52 w-52" : "h-[86px] w-[86px]",
        className,
      )}
      aria-label={active ? "Interviewer speaking" : "Interviewer idle"}
    >
      {active ? (
        <>
          <span
            className={cn(
              "absolute rounded-full border border-slate-300/40",
              halo,
              speaking && "animate-live",
            )}
            style={{ transform: `scale(${1 + scale * 0.08})` }}
          />
          <span
            className={cn(
              "absolute rounded-full border border-slate-300/30",
              hero ? "h-36 w-36" : "h-[54px] w-[54px]",
            )}
          />
        </>
      ) : null}
      <span
        className={cn(
          "relative rounded-full border",
          inner,
          active
            ? "border-slate-300/60 bg-slate-100 shadow-[0_0_28px_rgba(228,228,231,0.12)]"
            : "border-slate-300 bg-slate-200",
        )}
      />
    </div>
  );
}
