"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChangeset,
  type NodeChangeset,
} from "@xyflow/react";
import { applyEdgeChanges, applyNodeChanges } from "@xyflow/system";
import "@xyflow/react/dist/style.css";
import { Trash2 } from "lucide-react";
import { NODE_KIND_META, type NodeKind } from "@/lib/canvas/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { NodePalette } from "@/components/canvas/NodePalette";
import { SystemNode } from "@/components/canvas/SystemNode";
import { useInterviewStore, type SystemNode as SystemNodeType } from "@/store/useInterviewStore";
import type { Edge } from "@xyflow/react";

const nodeTypes = { system: SystemNode };

const defaultEdgeOptions = {
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 14,
    height: 14,
    color: "#52525b",
  },
  style: { strokeWidth: 1.25, stroke: "#52525b" },
  labelStyle: {
    fill: "#a1a1aa",
    fontSize: 10,
    fontFamily: "var(--font-geist-mono), monospace",
  },
  labelBgStyle: { fill: "#101014", stroke: "#27272a" },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 3,
};

function ArchitectureCanvasInner({ readOnly }: { readOnly?: boolean }) {
  const nodes = useInterviewStore((s) => s.nodes);
  const edges = useInterviewStore((s) => s.edges);
  const setGraph = useInterviewStore((s) => s.setGraph);
  const markCanvasEdit = useInterviewStore((s) => s.markCanvasEdit);
  const updateEdgeLabel = useInterviewStore((s) => s.updateEdgeLabel);
  const { screenToFlowPosition } = useReactFlow();

  const [editingEdge, setEditingEdge] = React.useState<{
    id: string;
    label: string;
  } | null>(null);
  const [clearOpen, setClearOpen] = React.useState(false);

  const onNodesChange = React.useCallback(
    (changes: NodeChangeset<SystemNodeType>) => {
      const next = applyNodeChanges(nodes, changes);
      setGraph(next, edges);
      const arr = changes.toArray();
      if (
        arr.some(
          (c) =>
            c.type === "position" || c.type === "add" || c.type === "remove",
        )
      ) {
        markCanvasEdit();
      }
    },
    [nodes, edges, setGraph, markCanvasEdit],
  );

  const onEdgesChange = React.useCallback(
    (changes: EdgeChangeset<Edge>) => {
      const removed = changes.toArray().filter((c) => c.type === "remove");
      const nextEdges = applyEdgeChanges(edges, changes);
      setGraph(nodes, nextEdges);
      if (removed.length) markCanvasEdit();
    },
    [nodes, edges, setGraph, markCanvasEdit],
  );

  const onConnect = React.useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return;
      const id = `e-${Math.random().toString(36).slice(2, 9)}`;
      const edge: Edge = {
        ...connection,
        id,
        type: "smoothstep",
        data: {},
        label: "",
        markerEnd: defaultEdgeOptions.markerEnd,
        style: defaultEdgeOptions.style,
      };
      setGraph(nodes, [...edges, edge]);
      markCanvasEdit();
    },
    [nodes, edges, setGraph, markCanvasEdit],
  );

  const addNode = React.useCallback(
    (kind: NodeKind, at?: { x: number; y: number }) => {
      const meta = NODE_KIND_META[kind];
      const position =
        at ??
        screenToFlowPosition({
          x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
          y: window.innerHeight / 2 + (Math.random() - 0.5) * 120,
        });
      const node = {
        id: `n-${Math.random().toString(36).slice(2, 9)}`,
        type: "system",
        position: { x: position.x - 86, y: position.y - 24 },
        data: {
          kind,
          label: meta.label,
          sublabel: meta.defaultSublabel,
        },
      };
      setGraph([...nodes, node], edges);
      markCanvasEdit();
    },
    [nodes, edges, setGraph, markCanvasEdit, screenToFlowPosition],
  );

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(
        "application/x-sd-node",
      ) as NodeKind;
      if (!kind || !NODE_KIND_META[kind]) return;
      addNode(
        kind,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      );
    },
    [addNode, screenToFlowPosition],
  );

  const onNodeDragStop = React.useCallback(() => {
    markCanvasEdit();
  }, [markCanvasEdit]);

  return (
    <div className="relative h-full w-full">
      {!readOnly ? <NodePalette onAdd={addNode} /> : null}

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        {readOnly ? (
          <span className="rounded border border-line bg-panel/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            View only
          </span>
        ) : (
          <Button
            variant="subtle"
            size="sm"
            onClick={() => setClearOpen(true)}
            disabled={nodes.length === 0}
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onNodeDragStop={onNodeDragStop}
        onEdgeDoubleClick={(_, edge) =>
          setEditingEdge({
            id: edge.id,
            label: (edge.data?.label as string) ?? edge.label?.toString() ?? "",
          })
        }
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
        minZoom={0.25}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        className="bg-[#0a0a0d]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="#232329"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bottom-3 !left-3"
        />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor="#2a2a31"
          maskColor="rgba(9,9,11,0.75)"
          className="!bottom-3 !right-3"
        />
      </ReactFlow>

      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="max-w-[320px] text-center font-mono text-[11px] leading-relaxed tracking-tight text-zinc-600">
            Drag a component from the palette onto the canvas, then connect
            nodes by dragging between their handles.
          </p>
        </div>
      ) : null}

      <Dialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear canvas?"
        description="This removes every node and edge from the diagram. It cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setGraph([], []);
                markCanvasEdit();
                setClearOpen(false);
              }}
            >
              Clear canvas
            </Button>
          </>
        }
      />

      <Dialog
        open={editingEdge !== null}
        onOpenChange={(open) => {
          if (!open) setEditingEdge(null);
        }}
        title="Edge label"
        description="Protocol or data-flow label, e.g. HTTP/3, gRPC, Async, HLS/DASH."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingEdge(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingEdge) {
                  updateEdgeLabel(editingEdge.id, editingEdge.label.trim());
                  markCanvasEdit();
                }
                setEditingEdge(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {editingEdge ? (
          <input
            autoFocus
            value={editingEdge.label}
            onChange={(e) =>
              setEditingEdge({ ...editingEdge, label: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateEdgeLabel(editingEdge.id, editingEdge.label.trim());
                markCanvasEdit();
                setEditingEdge(null);
              }
            }}
            placeholder="e.g. gRPC"
            className="h-9 w-full rounded border border-line-strong bg-[#0a0a0d] px-2.5 font-mono text-[12px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
          />
        ) : null}
      </Dialog>
    </div>
  );
}

export function ArchitectureCanvas({ readOnly }: { readOnly?: boolean }) {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvasInner readOnly={readOnly} />
    </ReactFlowProvider>
  );
}
