"use client";

import { create } from "zustand";
import type { Edge, Node } from "@xyflow/react";
import type {
  CanvasGraph,
} from "@/lib/canvas/types";
import { graphFromReactFlow } from "@/lib/canvas/serializeCanvas";
import type { PhaseKey } from "@/lib/interview/fsm";
import {
  DEFAULT_MILESTONES,
  getScenario,
  type MilestoneKey,
  type MilestoneStatus,
} from "@/lib/interview/scenarios";
import type {
  InterviewerGuide,
  PersistedSession,
  Report,
  SessionConfig,
  SessionStatus,
  SpeechState,
  Turn,
} from "@/lib/interview/types";

export interface SystemNodeData {
  kind: string;
  label: string;
  sublabel?: string;
  [key: string]: unknown;
}

export type SystemNode = Node<SystemNodeData>;

interface PeerState {
  role: "interviewer" | "candidate" | null;
  roomCode: string | null;
  connected: boolean;
  waiting: boolean;
  error: string | null;
}

export type { Edge };

export interface InterviewState {  config: SessionConfig | null;
  status: SessionStatus;
  startedAt: number | null;
  pausedElapsedSec: number;
  phase: PhaseKey;
  milestones: Record<MilestoneKey, MilestoneStatus>;
  decisionLog: string;
  directive: string;
  turns: Turn[];
  nodes: SystemNode[];
  edges: Edge[];
  prevGraph: CanvasGraph | null;
  lastCanvasEditAt: number;
  speechState: SpeechState;
  vadMode: "auto" | "ptt";
  strictMode: boolean;
  micLevel: number;
  ttfaMs: number | null;
  report: Report | null;
  interviewerGuide: InterviewerGuide | null;
  peer: PeerState;
  hydrated: boolean;

  init: (config: SessionConfig, startedAt?: number) => void;
  hydrate: (payload: PersistedSession) => void;
  setStatus: (status: SessionStatus) => void;
  pause: () => void;
  resume: () => void;
  addTurn: (turn: Turn) => void;
  updateTurn: (id: string, patch: Partial<Turn>) => void;
  truncateLastInterviewer: (spokenText: string, interrupted: boolean) => void;
  setPhase: (phase: PhaseKey) => void;
  applyEvaluation: (payload: {
    milestones: { key: MilestoneKey; status: MilestoneStatus }[];
    nextPhase?: PhaseKey;
    updatedDecisionLog?: string;
    nextDirective?: string;
  }) => void;
  setDirective: (directive: string) => void;
  setGraph: (nodes: SystemNode[], edges: Edge[]) => void;
  updateNodeData: (id: string, patch: Partial<SystemNodeData>) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  setPrevGraph: (graph: CanvasGraph) => void;
  markCanvasEdit: () => void;
  setSpeechState: (state: SpeechState) => void;
  setMicLevel: (level: number) => void;
  setVadMode: (mode: "auto" | "ptt") => void;
  setStrictMode: (strict: boolean) => void;
  setTtfa: (ms: number | null) => void;
  setReport: (report: Report) => void;
  setGuide: (guide: InterviewerGuide | null) => void;
  setPeer: (patch: Partial<PeerState>) => void;
  markHydrated: () => void;
}

const initialPeer: PeerState = {
  role: null,
  roomCode: null,
  connected: false,
  waiting: false,
  error: null,
};

export const useInterviewStore = create<InterviewState>((set, get) => ({
  config: null,
  status: "live",
  startedAt: null,
  pausedElapsedSec: 0,
  phase: "REQUIREMENTS",
  milestones: { ...DEFAULT_MILESTONES },
  decisionLog: "",
  directive: "",
  turns: [],
  nodes: [],
  edges: [],
  prevGraph: null,
  lastCanvasEditAt: 0,
  speechState: "idle",
  vadMode: "auto",
  strictMode: true,
  micLevel: 0,
  ttfaMs: null,
  report: null,
  interviewerGuide: null,
  peer: { ...initialPeer },
  hydrated: false,

  init: (config, startedAt = Date.now()) =>
    set({
      config,
      status: "live",
      startedAt,
      pausedElapsedSec: 0,
      phase: "REQUIREMENTS",
      milestones: { ...DEFAULT_MILESTONES },
      decisionLog: "",
      directive: "",
      turns: [],
      nodes: [],
      edges: [],
      prevGraph: null,
      lastCanvasEditAt: 0,
      speechState: "idle",
      ttfaMs: null,
      report: null,
      hydrated: true,
    }),

  hydrate: (payload) =>
    set({
      config: payload.config,
      status: payload.status,
      startedAt: payload.startedAt,
      pausedElapsedSec: payload.pausedElapsedSec,
      phase: payload.phase,
      milestones: payload.milestones,
      decisionLog: payload.decisionLog,
      directive: payload.directive,
      turns: payload.turns,
      nodes: payload.graph.nodes.map((n) => ({
        id: n.id,
        type: "system",
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: {
          kind: n.kind,
          label: n.label,
          sublabel: n.sublabel,
        },
      })),
      edges: payload.graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        data: { label: e.label },
        label: e.label,
      })),
      prevGraph: payload.graph,
      report: payload.report ?? null,
      interviewerGuide: payload.interviewerGuide ?? null,
      speechState: "idle",
      hydrated: true,
    }),

  setStatus: (status) => set({ status }),

  pause: () => {
    const { startedAt, status } = get();
    if (status !== "live" || !startedAt) return;
    set({
      status: "paused",
      pausedElapsedSec: (Date.now() - startedAt) / 1000,
    });
  },

  resume: () => {
    const { pausedElapsedSec, status } = get();
    if (status !== "paused") return;
    set({
      status: "live",
      startedAt: Date.now() - pausedElapsedSec * 1000,
    });
  },

  addTurn: (turn) => set({ turns: [...get().turns, turn] }),

  updateTurn: (id, patch) =>
    set({
      turns: get().turns.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }),

  truncateLastInterviewer: (spokenText, interrupted) => {
    const turns = [...get().turns];
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].speaker === "interviewer") {
        turns[i] = {
          ...turns[i],
          spokenText,
          interrupted,
          pending: false,
        };
        break;
      }
    }
    set({ turns });
  },

  setPhase: (phase) => set({ phase }),

  applyEvaluation: ({
    milestones,
    nextPhase,
    updatedDecisionLog,
    nextDirective,
  }) => {
    const merged = { ...get().milestones };
    for (const m of milestones) merged[m.key] = m.status;
    set({
      milestones: merged,
      phase: nextPhase ?? get().phase,
      decisionLog: updatedDecisionLog ?? get().decisionLog,
      directive: nextDirective ?? get().directive,
    });
  },

  setDirective: (directive) => set({ directive }),

  setGraph: (nodes, edges) => set({ nodes, edges }),

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    }),

  updateEdgeLabel: (id, label) =>
    set({
      edges: get().edges.map((e) =>
        e.id === id
          ? { ...e, label, data: { ...(e.data ?? {}), label } }
          : e,
      ),
    }),

  setPrevGraph: (graph) => set({ prevGraph: graph }),

  markCanvasEdit: () => set({ lastCanvasEditAt: Date.now() }),

  setSpeechState: (speechState) => set({ speechState }),

  setMicLevel: (micLevel) => set({ micLevel }),

  setVadMode: (vadMode) => set({ vadMode }),

  setStrictMode: (strictMode) => set({ strictMode }),

  setTtfa: (ttfaMs) => set({ ttfaMs }),

  setReport: (report) => set({ report }),

  setGuide: (interviewerGuide) => set({ interviewerGuide }),

  setPeer: (patch) => set({ peer: { ...get().peer, ...patch } }),

  markHydrated: () => set({ hydrated: true }),
}));

export function elapsedSeconds(state: InterviewState) {
  if (!state.startedAt) return 0;
  if (state.status === "paused") return state.pausedElapsedSec;
  return Math.max(0, (Date.now() - state.startedAt) / 1000);
}

export function scenarioOf(state: InterviewState) {
  return getScenario(state.config?.scenarioId ?? "netflix");
}

export function toPersisted(state: InterviewState): PersistedSession | null {
  if (!state.config) return null;
  return {
    config: state.config,
    status: state.status,
    startedAt: state.startedAt,
    pausedElapsedSec: state.pausedElapsedSec,
    phase: state.phase,
    milestones: state.milestones,
    decisionLog: state.decisionLog,
    directive: state.directive,
    turns: state.turns,
    graph: graphFromReactFlow(
      state.nodes as unknown[],
      state.edges as unknown[],
    ),
    interviewerGuide: state.interviewerGuide ?? undefined,
    report: state.report ?? undefined,
    updatedAt: Date.now(),
  };
}
