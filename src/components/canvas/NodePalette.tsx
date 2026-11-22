"use client";

import * as React from "react";
import {
  Boxes,
  Cpu,
  Database,
  Globe,
  HardDrive,
  ListOrdered,
  MonitorSmartphone,
  Network,
  Scale,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { NODE_KIND_META, type NodeKind } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

const ICONS: Record<NodeKind, LucideIcon> = {
  client: MonitorSmartphone,
  loadbalancer: Scale,
  gateway: Network,
  service: Boxes,
  database: Database,
  cache: Zap,
  queue: ListOrdered,
  storage: HardDrive,
  cdn: Globe,
  worker: Cpu,
};

const KIND_ORDER: NodeKind[] = [
  "client",
  "loadbalancer",
  "gateway",
  "service",
  "database",
  "cache",
  "queue",
  "storage",
  "cdn",
  "worker",
];

export function NodePalette({
  onAdd,
  disabled,
}: {
  onAdd: (kind: NodeKind) => void;
  disabled?: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-10 w-[248px] rounded-md border border-line bg-[#0b0b0e]/95 backdrop-blur">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between border-b border-line px-2.5 py-1.5 text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          Components
        </span>
        <span className="font-mono text-[10px] text-zinc-600">
          {collapsed ? "+" : "−"}
        </span>
      </button>
      {collapsed ? null : (
        <div className="grid grid-cols-2 gap-1 p-1.5">
          {KIND_ORDER.map((kind) => {
            const Icon = ICONS[kind];
            const meta = NODE_KIND_META[kind];
            return (
              <button
                key={kind}
                disabled={disabled}
                draggable={!disabled}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-sd-node", kind);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => onAdd(kind)}
                title={`Drag onto canvas, or click to add ${meta.hint}`}
                className={cn(
                  "flex items-center gap-1.5 rounded border border-transparent px-1.5 py-1.5 text-left transition-colors",
                  disabled
                    ? "cursor-not-allowed opacity-40"
                    : "hover:border-line-strong hover:bg-zinc-900/70",
                )}
              >
                <Icon className="h-3 w-3 shrink-0 text-zinc-500" />
                <span className="truncate text-[11px] text-zinc-400">
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
