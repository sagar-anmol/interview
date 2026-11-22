import type { MilestoneKey, MilestoneStatus, Scenario } from "./scenarios";

export type PhaseKey =
  | "REQUIREMENTS"
  | "HIGH_LEVEL_DESIGN"
  | "DEEP_DIVE"
  | "WRAP_UP";

export interface PhaseDef {
  key: PhaseKey;
  label: string;
  /** Fraction of the total interview where this phase begins. */
  start: number;
  end: number;
}

export const PHASES: PhaseDef[] = [
  { key: "REQUIREMENTS", label: "Requirements", start: 0, end: 8 / 45 },
  {
    key: "HIGH_LEVEL_DESIGN",
    label: "High-Level Design",
    start: 8 / 45,
    end: 20 / 45,
  },
  { key: "DEEP_DIVE", label: "Deep Dive", start: 20 / 45, end: 38 / 45 },
  { key: "WRAP_UP", label: "Wrap-Up", start: 38 / 45, end: 1 },
];

export const PHASE_LABEL: Record<PhaseKey, string> = {
  REQUIREMENTS: "Requirements",
  HIGH_LEVEL_DESIGN: "High-Level Design",
  DEEP_DIVE: "Deep Dive",
  WRAP_UP: "Wrap-Up",
};

export function phaseForElapsed(
  elapsedSec: number,
  durationSec: number,
): PhaseKey {
  if (durationSec <= 0) return "REQUIREMENTS";
  const frac = Math.min(1, Math.max(0, elapsedSec / durationSec));
  for (const phase of PHASES) {
    if (frac < phase.end) return phase.key;
  }
  return "WRAP_UP";
}

export function nextPhaseOf(phase: PhaseKey): PhaseKey {
  const idx = PHASES.findIndex((p) => p.key === phase);
  return PHASES[Math.min(PHASES.length - 1, idx + 1)].key;
}

export function phaseBudgetLabel(
  phase: PhaseKey,
  durationSec: number,
): string {
  const def = PHASES.find((p) => p.key === phase)!;
  const startMin = Math.round((def.start * durationSec) / 60);
  const endMin = Math.round((def.end * durationSec) / 60);
  return `${startMin}–${endMin} min`;
}

export interface FsmSnapshot {
  phase: PhaseKey;
  elapsedSec: number;
  durationSec: number;
  milestones: Record<MilestoneKey, MilestoneStatus>;
}

/** Compact structured control block injected before the latest user message. */
export function buildInterviewStateBlock(
  fsm: FsmSnapshot,
  scenario: Scenario,
  directive: string,
): string {
  const completed = scenario.milestones
    .filter((m) => fsm.milestones[m.key] === "completed")
    .map((m) => m.label);
  const remaining = scenario.milestones
    .filter((m) => fsm.milestones[m.key] !== "completed")
    .slice(0, 2)
    .map((m) => m.label);

  const elapsed = formatClock(fsm.elapsedSec);
  const total = formatClock(fsm.durationSec);

  return [
    "[INTERVIEW STATE]",
    `Elapsed: ${elapsed} / ${total} | Phase: ${fsm.phase}`,
    `Completed Milestones: ${completed.length ? completed.join(", ") : "none"}`,
    `Next Focus: ${remaining.length ? remaining.join(", ") : "wrap-up and candidate questions"}`,
    `Interviewer Directive: ${directive || "Open the interview and establish requirements."}`,
    "Constraints: Speak naturally in 2-3 short sentences max. NO markdown, NO bullet points, NO emojis, NO praise (\"Great point!\"). Challenge assumptions, ask sharp follow-ups, and do NOT give hints if the candidate is stuck—tell them to make an assumption and justify the trade-off.",
  ].join("\n");
}

export function formatClock(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
