import type { CanvasEdgeLike, CanvasGraph, CanvasNodeLike } from "./types";

/**
 * Pure, deterministic serializer for the architecture canvas.
 * Never send raw React Flow JSON to an LLM: this produces a compact
 * topological summary plus a diff against the previous turn's snapshot.
 */
export function serializeCanvasForLLM(
  graph: CanvasGraph,
  previous?: CanvasGraph | null,
): string {
  const lines: string[] = ["[ARCHITECTURE CANVAS]"];

  if (graph.nodes.length === 0) {
    lines.push("Nodes: (none)");
    lines.push("Edges: (none)");
    lines.push("Changes since last turn: canvas is empty");
    lines.push("Warnings: candidate has not drawn anything yet");
    return lines.join("\n");
  }

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const name = (id: string) => {
    const node = byId.get(id);
    if (!node) return id;
    const sub = node.sublabel?.trim();
    return sub ? `${node.label} (${sub})` : node.label;
  };

  lines.push(`Nodes: ${graph.nodes.map((n) => name(n.id)).join(", ")}`);
  lines.push(
    `Edges: ${
      graph.edges.length
        ? compressChains(graph, name).join("; ")
        : "(none)"
    }`,
  );

  const diff = previous ? diffGraphs(previous, graph) : null;
  if (!diff) {
    lines.push("Changes since last turn: baseline (first snapshot)");
  } else if (diff.length === 0) {
    lines.push("Changes since last turn: none");
  } else {
    lines.push(`Changes since last turn: ${diff.join(", ")}`);
  }

  const warnings = computeWarnings(graph);
  if (warnings.length) lines.push(`Warnings: ${warnings.join("; ")}`);

  return lines.join("\n");
}

function compressChains(
  graph: CanvasGraph,
  name: (id: string) => string,
): string[] {
  const out = new Map<string, CanvasEdgeLike[]>();
  const indeg = new Map<string, number>();
  for (const n of graph.nodes) {
    out.set(n.id, []);
    indeg.set(n.id, 0);
  }
  for (const e of graph.edges) {
    if (!out.has(e.source) || !indeg.has(e.target)) continue;
    out.get(e.source)!.push(e);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  const visitedEdges = new Set<string>();
  const chains: string[] = [];

  const edgeToken = (e: CanvasEdgeLike) =>
    e.label ? ` -[${e.label}]-> ` : " -> ";

  // Start from roots (no incoming) then any remaining edge (cycles/disconnected).
  const starts = graph.nodes
    .filter((n) => (indeg.get(n.id) ?? 0) === 0)
    .map((n) => n.id);

  const walk = (startId: string) => {
    let current = startId;
    let chain = name(current);
    let steps = 0;
    while (steps < 10) {
      const outs = (out.get(current) ?? []).filter(
        (e) => !visitedEdges.has(e.id),
      );
      if (outs.length !== 1) break;
      const edge = outs[0];
      if (indeg.get(edge.target) !== 1) {
        visitedEdges.add(edge.id);
        chain += edgeToken(edge) + name(edge.target);
        break;
      }
      visitedEdges.add(edge.id);
      chain += edgeToken(edge) + name(edge.target);
      current = edge.target;
      steps += 1;
    }
    chains.push(chain);
  };

  for (const start of starts) {
    if ((out.get(start) ?? []).some((e) => !visitedEdges.has(e.id))) {
      walk(start);
    }
  }

  for (const e of graph.edges) {
    if (!visitedEdges.has(e.id)) {
      visitedEdges.add(e.id);
      chains.push(`${name(e.source)}${edgeToken(e)}${name(e.target)}`);
    }
  }

  return chains.sort();
}

function diffGraphs(prev: CanvasGraph, next: CanvasGraph): string[] {
  const changes: string[] = [];
  const prevNodes = new Map(prev.nodes.map((n) => [n.id, n]));
  const nextNodes = new Map(next.nodes.map((n) => [n.id, n]));

  for (const node of next.nodes) {
    const before = prevNodes.get(node.id);
    if (!before) changes.push(`+Node(${node.label})`);
    else if (before.label !== node.label || before.kind !== node.kind)
      changes.push(`~Node(${node.label})`);
  }
  for (const node of prev.nodes) {
    if (!nextNodes.has(node.id)) changes.push(`-Node(${node.label})`);
  }

  const key = (e: CanvasEdgeLike) => `${e.source}->${e.target}`;
  const prevEdges = new Map(prev.edges.map((e) => [key(e), e]));
  const nextEdges = new Map(next.edges.map((e) => [key(e), e]));

  for (const edge of next.edges) {
    const label = (id: string) =>
      nextNodes.get(id)?.label ?? prevNodes.get(id)?.label ?? id;
    const k = key(edge);
    if (!prevEdges.has(k))
      changes.push(`+Edge(${label(edge.source)} -> ${label(edge.target)})`);
    else if (
      edge.label?.trim() &&
      prevEdges.get(k)?.label?.trim() !== edge.label?.trim()
    ) {
      changes.push(`~Edge(${label(edge.source)} -> ${label(edge.target)} label)`);
    }
  }
  for (const edge of prev.edges) {
    if (!nextEdges.has(key(edge))) {
      const label = (id: string) =>
        nextNodes.get(id)?.label ?? prevNodes.get(id)?.label ?? id;
      changes.push(`-Edge(${label(edge.source)} -> ${label(edge.target)})`);
    }
  }

  const MAX = 8;
  if (changes.length > MAX) {
    const extra = changes.length - MAX;
    return [...changes.slice(0, MAX), `+${extra} more changes`];
  }
  return changes;
}

function computeWarnings(graph: CanvasGraph): string[] {
  if (graph.nodes.length === 0) return ["canvas is empty"];

  const degree = new Map<string, number>();
  for (const n of graph.nodes) degree.set(n.id, 0);
  for (const e of graph.edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const warnings: string[] = [];
  const unconnected = graph.nodes
    .filter((n) => (degree.get(n.id) ?? 0) === 0)
    .map((n) => n.label);
  if (unconnected.length)
    warnings.push(`Unconnected nodes: ${unconnected.join(", ")}`);

  // Count weakly connected components.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    while (p !== (parent.get(p) ?? p)) p = parent.get(p) ?? p;
    parent.set(x, p);
    return p;
  };
  for (const n of graph.nodes) parent.set(n.id, n.id);
  for (const e of graph.edges) {
    const a = find(e.source);
    const b = find(e.target);
    if (a !== b) parent.set(a, b);
  }
  const roots = new Set(graph.nodes.map((n) => find(n.id)));
  if (roots.size > 1 && warnings.length < 2)
    warnings.push(`${roots.size} disconnected components`);

  return warnings;
}

export function graphFromReactFlow(nodes: unknown[], edges: unknown[]): CanvasGraph {
  const graphNodes: CanvasNodeLike[] = nodes.map((raw) => {
    const n = raw as {
      id: string;
      type?: string;
      position?: { x?: number; y?: number };
      data?: { kind?: string; label?: string; sublabel?: string };
    };
    return {
      id: n.id,
      kind: (n.data?.kind ?? n.type ?? "service") as CanvasNodeLike["kind"],
      label: n.data?.label ?? "Untitled",
      sublabel: n.data?.sublabel,
      x: n.position?.x,
      y: n.position?.y,
    };
  });
  const graphEdges: CanvasEdgeLike[] = edges.map((raw) => {
    const e = raw as {
      id: string;
      source: string;
      target: string;
      label?: string;
      data?: { label?: string };
    };
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.data?.label ?? (typeof e.label === "string" ? e.label : undefined),
    };
  });
  return { nodes: graphNodes, edges: graphEdges };
}
