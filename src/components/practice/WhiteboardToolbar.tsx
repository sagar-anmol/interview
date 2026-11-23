"use client";

import * as React from "react";
import {
  Focus,
  Hand,
  Lock,
  LockOpen,
  Minus,
  Redo2,
  Undo2,
} from "lucide-react";
import type { ReactFlowInstance } from "@xyflow/react";
import { cn } from "@/lib/utils";

interface WhiteboardToolbarProps {
  rf: ReactFlowInstance | null;
  zoom: number;
  locked: boolean;
  panMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToggleLock: () => void;
  onTogglePan: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function WhiteboardToolbar({
  rf,
  zoom,
  locked,
  panMode,
  canUndo,
  canRedo,
  onToggleLock,
  onTogglePan,
  onUndo,
  onRedo,
}: WhiteboardToolbarProps) {
  return (
    <>
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-col items-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-line-strong bg-panel-2/95 p-1 shadow-lg shadow-slate-900/10 backdrop-blur">
          <ToolbarButton
            label={locked ? "Unlock canvas" : "Lock canvas"}
            active={locked}
            onClick={onToggleLock}
            icon={
              locked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )
            }
          />
          <ToolbarButton
            label={panMode ? "Exit pan mode" : "Pan canvas"}
            active={panMode}
            onClick={onTogglePan}
            icon={<Hand className="h-3.5 w-3.5" />}
          />
          <span className="mx-1 h-5 w-px bg-line" />
          <ToolbarButton
            label="Fit diagram to view"
            onClick={() => rf?.fitView?.({ duration: 200, padding: 0.25 })}
            icon={<Focus className="h-3.5 w-3.5" />}
          />
        </div>
        <p className="mt-1.5 hidden font-mono text-[9px] text-muted lg:block">
          Drag from the palette to add components · drag between handles to connect
        </p>
      </div>

      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
        <div className="flex items-center overflow-hidden rounded-md border border-line-strong bg-panel-2/95 shadow-lg shadow-slate-900/10">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => rf?.zoomOut?.({ duration: 150 })}
            className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[46px] border-x border-line px-1 text-center font-mono text-[10px] tabular-nums text-slate-600">
            {zoom}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => rf?.zoomIn?.({ duration: 150 })}
            className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="text-[15px] leading-none">+</span>
          </button>
        </div>
        <div className="flex items-center overflow-hidden rounded-md border border-line-strong bg-panel-2/95 shadow-lg shadow-slate-900/10">
          <button
            type="button"
            aria-label="Undo"
            title="Undo"
            disabled={!canUndo}
            onClick={onUndo}
            className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <span className="h-5 w-px bg-line" />
          <button
            type="button"
            aria-label="Redo"
            title="Redo"
            disabled={!canRedo}
            onClick={onRedo}
            className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
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
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded transition",
        active
          ? "bg-slate-200 text-slate-900"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {icon}
    </button>
  );
}
