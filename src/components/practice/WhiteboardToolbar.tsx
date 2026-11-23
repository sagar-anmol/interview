"use client";

import * as React from "react";
import {
  ArrowRight,
  Circle,
  Diamond,
  Hand,
  Lock,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Type,
  Eraser,
  Redo2,
  Undo2,
} from "lucide-react";
import type { ReactFlowInstance } from "@xyflow/react";
import { cn } from "@/lib/utils";

const TOOLS = [
  { id: "select", label: "Select", key: "1", icon: MousePointer2 },
  { id: "square", label: "Rectangle", key: "2", icon: Square },
  { id: "diamond", label: "Diamond", key: "3", icon: Diamond },
  { id: "circle", label: "Circle", key: "4", icon: Circle },
  { id: "arrow", label: "Arrow", key: "5", icon: ArrowRight },
  { id: "line", label: "Line", key: "6", icon: Minus },
  { id: "pen", label: "Draw", key: "7", icon: Pencil },
  { id: "text", label: "Text", key: "8", icon: Type },
  { id: "eraser", label: "Eraser", key: "0", icon: Eraser },
];

interface WhiteboardToolbarProps {
  rf: ReactFlowInstance | null;
  zoom: number;
}

export function WhiteboardToolbar({ rf, zoom }: WhiteboardToolbarProps) {
  const [tool, setTool] = React.useState("select");
  const [locked, setLocked] = React.useState(false);

  return (
    <>
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-col items-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-line-strong bg-panel-2/95 p-1 shadow-lg shadow-black/50 backdrop-blur">
          <ToolbarButton
            label={locked ? "Unlock canvas" : "Lock canvas"}
            active={locked}
            onClick={() => setLocked((v) => !v)}
            icon={<Lock className="h-3.5 w-3.5" />}
          />
          <ToolbarButton
            label="Pan canvas"
            icon={<Hand className="h-3.5 w-3.5" />}
          />
          <span className="mx-1 h-5 w-px bg-line" />
          {TOOLS.map((item) => (
            <ToolbarButton
              key={item.id}
              label={item.label}
              shortcut={item.key}
              active={tool === item.id}
              onClick={() => setTool(item.id)}
              icon={<item.icon className="h-3.5 w-3.5" />}
            />
          ))}
        </div>
        <p className="mt-1.5 hidden font-mono text-[9px] text-zinc-600 lg:block">
          To move canvas, hold mouse wheel or spacebar while dragging, or use the
          hand tool
        </p>
      </div>

      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
        <div className="flex items-center overflow-hidden rounded-md border border-line-strong bg-panel-2/95 shadow-lg shadow-black/40">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => rf?.zoomOut?.({ duration: 150 })}
            className="px-2.5 py-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[46px] border-x border-line px-1 text-center font-mono text-[10px] tabular-nums text-zinc-400">
            {zoom}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => rf?.zoomIn?.({ duration: 150 })}
            className="px-2.5 py-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            <span className="text-[15px] leading-none">+</span>
          </button>
        </div>
        <div className="flex items-center overflow-hidden rounded-md border border-line-strong bg-panel-2/95 shadow-lg shadow-black/40">
          <button
            type="button"
            aria-label="Undo"
            className="px-2 py-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <span className="h-5 w-px bg-line" />
          <button
            type="button"
            aria-label="Redo"
            className="px-2 py-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

function ToolbarButton({
  label,
  shortcut,
  icon,
  active,
  onClick,
}: {
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative flex h-7 w-7 items-center justify-center rounded transition",
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
      )}
    >
      {icon}
      {shortcut ? (
        <span className="absolute -bottom-0.5 right-0.5 font-mono text-[7px] text-zinc-600">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}
