import type { FsmSnapshot, PhaseKey } from "@/lib/interview/fsm";
import {
  EVALUATE_SCHEMA,
  evaluatorSystemPrompt,
} from "@/lib/interview/prompts";
import {
  getScenario,
  type MilestoneKey,
  type MilestoneStatus,
} from "@/lib/interview/scenarios";
import {
  errorResponse,
  generateWithFallback,
  getGenAI,
  parseJsonResponse,
} from "@/lib/server/genai";


interface EvaluateBody {
  scenarioId?: string;
  recentMessages?: { role: "interviewer" | "candidate"; text: string }[];
  runningDecisionLog?: string;
  fsmState?: FsmSnapshot;
  canvasSummary?: string;
}

interface EvaluateResult {
  milestones: { key: MilestoneKey; status: MilestoneStatus }[];
  nextPhase: PhaseKey;
  updatedDecisionLog: string;
  nextDirective: string;
}

const PHASES = new Set<PhaseKey>([
  "REQUIREMENTS",
  "HIGH_LEVEL_DESIGN",
  "DEEP_DIVE",
  "WRAP_UP",
]);

export async function POST(req: Request) {
  let body: EvaluateBody;
  try {
    body = (await req.json()) as EvaluateBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.fsmState) {
    return Response.json({ error: "fsmState is required" }, { status: 400 });
  }

  const scenario = getScenario(body.scenarioId ?? "netflix");
  const transcript = (body.recentMessages ?? [])
    .slice(-12)
    .map((m) => `${m.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${m.text}`)
    .join("\n");

  const prompt = [
    "[TRANSCRIPT SO FAR]",
    transcript || "(interview has not started)",
    "",
    "[RUNNING DECISION LOG]",
    body.runningDecisionLog?.trim() || "(empty)",
    "",
    body.canvasSummary?.trim() || "[ARCHITECTURE CANVAS]\n(empty)",
    "",
    "[FSM STATE]",
    JSON.stringify({
      elapsedSec: Math.round(body.fsmState.elapsedSec),
      durationSec: Math.round(body.fsmState.durationSec),
      phase: body.fsmState.phase,
      milestones: body.fsmState.milestones,
    }),
  ].join("\n");

  try {
    const ai = getGenAI();
    const response = await generateWithFallback((model) =>
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: evaluatorSystemPrompt(scenario),
          temperature: 0.2,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
          responseSchema: EVALUATE_SCHEMA,
          abortSignal: req.signal,
        },
      }),
    );

    const parsed = parseJsonResponse<EvaluateResult>(response.text);

    const validKeys = new Set(scenario.milestones.map((m) => m.key));
    const milestones = (parsed.milestones ?? []).filter((m) =>
      validKeys.has(m.key),
    );

    return Response.json({
      milestones,
      nextPhase: PHASES.has(parsed.nextPhase)
        ? parsed.nextPhase
        : body.fsmState.phase,
      updatedDecisionLog: (parsed.updatedDecisionLog ?? "").slice(0, 2400),
      nextDirective: (parsed.nextDirective ?? "").slice(0, 400),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
