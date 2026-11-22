import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
