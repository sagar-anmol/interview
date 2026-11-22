"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
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
import { cn } from "@/lib/utils";
import type { SystemNode as SystemNodeType } from "@/store/useInterviewStore";
import { useInterviewStore } from "@/store/useInterviewStore";

const ICONS: Record<string, LucideIcon> = {
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

export function SystemNode({ id, data, selected }: NodeProps<SystemNodeType>) {
  const updateNodeData = useInterviewStore((s) => s.updateNodeData);
  const markCanvasEdit = useInterviewStore((s) => s.markCanvasEdit);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(data.label);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const Icon = ICONS[data.kind] ?? Boxes;

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const label = draft.trim() || data.label;
    if (label !== data.label) {
      updateNodeData(id, { label });
      markCanvasEdit();
    }
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative w-[172px] rounded-md border bg-[#0f0f13] px-3 py-2.5 shadow-lg shadow-black/40 transition-colors",
        selected
          ? "border-zinc-400/70 ring-1 ring-zinc-400/20"
          : "border-[#2a2a31] hover:border-[#3f3f47]",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-4px] !top-1/2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-4px] !top-1/2"
      />
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="!top-[-4px]"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!bottom-[-4px]"
      />

      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#26262c] bg-[#141419] text-zinc-500">
          <Icon className="h-3 w-3" />
        </span>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(data.label);
                setEditing(false);
              }
              e.stopPropagation();
            }}
            className="w-full bg-transparent text-[12.5px] font-medium text-zinc-100 outline-none"
          />
        ) : (
          <span
            className="truncate text-[12.5px] font-medium tracking-tight text-zinc-200"
            onDoubleClick={() => {
              setDraft(data.label);
              setEditing(true);
            }}
            title="Double-click to rename"
          >
            {data.label}
          </span>
        )}
      </div>

      {data.sublabel ? (
        <p className="mt-1 truncate pl-8 font-mono text-[10px] tracking-tight text-zinc-500">
          {data.sublabel}
        </p>
      ) : null}
    </div>
  );
}
