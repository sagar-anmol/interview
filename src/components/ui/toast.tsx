"use client";

import * as React from "react";
import { create } from "zustand";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "error" | "warning" | "success" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastStore {
  items: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  items: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set({ items: [...get().items, { ...t, id }] });
    setTimeout(() => get().dismiss(id), 6000);
  },
  dismiss: (id) =>
    set({ items: get().items.filter((item) => item.id !== id) }),
}));

export function toast(t: Omit<ToastItem, "id">) {
  useToastStore.getState().push(t);
}

const icons: Record<ToastVariant, React.ReactNode> = {
  error: <AlertTriangle className="h-3.5 w-3.5 text-red-400" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  info: <Info className="h-3.5 w-3.5 text-zinc-400" />,
};

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[340px] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-panel-2 px-3 py-2.5 shadow-xl shadow-black/50 animate-fade-in",
            item.variant === "error" && "border-red-500/30",
            item.variant === "warning" && "border-amber-500/25",
            item.variant === "success" && "border-emerald-500/25",
            item.variant === "info" && "border-line-strong",
          )}
        >
          <span className="mt-0.5">{icons[item.variant]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-zinc-200">
              {item.title}
            </p>
            {item.description ? (
              <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">
                {item.description}
              </p>
            ) : null}
          </div>
          <button
            onClick={() => dismiss(item.id)}
            className="mt-0.5 rounded p-0.5 text-zinc-600 hover:text-zinc-300"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
