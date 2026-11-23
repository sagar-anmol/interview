import type { CanvasGraph } from "@/lib/canvas/types";
import type {
  PhaseKey,
} from "./fsm";
import type {
  MilestoneKey,
  MilestoneStatus,
} from "./scenarios";

export type Speaker = "interviewer" | "candidate" | "system";
export type InterviewMode = "ai" | "peer";
export type SessionStatus = "live" | "paused" | "completed";
export type SpeechState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking";

export interface Turn {
  id: string;
  speaker: Speaker;
  text: string;
  /** What was actually spoken before a barge-in, if truncated. */
  spokenText?: string;
  interrupted?: boolean;
  ts: number;
  pending?: boolean;
}

export interface InterviewerGuide {
  focusAreas: string[];
  probeQuestions: string[];
  redFlags: string[];
  timeline: string[];
}

export interface SessionConfig {
  id: string;
  mode: InterviewMode;
  scenarioId: string;
  durationSec: number;
  format: "voice" | "text";
  role?: "interviewer" | "candidate";
  roomCode?: string;
  practiceMeta?: {
    track?: string;
    focusArea?: string;
    targetRole?: string;
  };
  createdAt: number;
}

export interface ScoreRow {
  key:
    | "requirements"
    | "highLevel"
    | "scalability"
    | "dataModeling"
    | "communication";
  score: number;
  rationale: string;
}

export interface Report {
  hireSignal:
    | "Strong No Hire"
    | "No Hire"
    | "Lean Hire"
    | "Hire"
    | "Strong Hire";
  summary: string;
  scores: ScoreRow[];
  strengths: { point: string; evidence: string }[];
  weaknesses: { point: string; evidence: string }[];
  architectureCritique: {
    summary: string;
    missingComponents: string[];
    risks: string[];
  };
  generatedAt: number;
}

export interface PersistedSession {
  config: SessionConfig;
  status: SessionStatus;
  startedAt: number | null;
  pausedElapsedSec: number;
  phase: PhaseKey;
  milestones: Record<MilestoneKey, MilestoneStatus>;
  decisionLog: string;
  directive: string;
  turns: Turn[];
  graph: CanvasGraph;
  interviewerGuide?: InterviewerGuide;
  report?: Report;
  updatedAt: number;
}

export const SCORE_LABELS: Record<ScoreRow["key"], string> = {
  requirements: "Requirements & Scope",
  highLevel: "High-Level Architecture",
  scalability: "Scalability & Bottlenecks",
  dataModeling: "Data Modeling & Storage",
  communication: "Communication & Trade-offs",
};
