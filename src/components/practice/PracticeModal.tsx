"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PracticeModalProps {
  open: boolean;
  onClose?: () => void;
  onEscape?: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg";
}

export function PracticeModal({
  open,
  onClose,
  onEscape,
  title,
  eyebrow,
  children,
  footer,
  width = "md",
}: PracticeModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const dismiss = onEscape ?? onClose;
    if (!open || !dismiss) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onEscape]);

  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="md-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "md-modal-panel relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xl border border-line-strong bg-panel-2 shadow-2xl shadow-black/70 outline-none",
          width === "lg" ? "max-w-2xl" : "max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-500">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-1 text-[17px] font-medium tracking-tight text-zinc-100">
              {title}
            </h2>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-zinc-900 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-line px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
