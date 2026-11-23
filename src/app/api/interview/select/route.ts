import {
  SELECT_SCHEMA,
  selectQuestionPrompt,
} from "@/lib/interview/prompts";
import { SCENARIO_POOL } from "@/lib/interview/scenarios";
import {
  ApiError,
  generateWithFallback,
  getGenAI,
  parseJsonResponse,
} from "@/lib/server/genai";
import type { InterviewerGuide } from "@/lib/interview/types";

export const maxDuration = 45;

interface SelectResult extends InterviewerGuide {
  scenarioId: string;
}

function fallback(scenarioId: string): SelectResult {
  const scenario =
    SCENARIO_POOL.find((s) => s.id === scenarioId) ?? SCENARIO_POOL[0];
  return {
    scenarioId: scenario.id,
    focusAreas: scenario.milestones.map((m) => m.label),
    probeQuestions: [
      "What scale numbers should we design for, and how did you derive them?",
      "Walk me through the write path end to end.",
      "Where does this break first under load, and what fails over?",
      "What is the single biggest risk in this design?",
    ],
    redFlags: [
      "Hand-waving scale numbers without arithmetic",
      "One database serving all traffic with no plan for growth",
      "No discussion of failure or degraded mode",
    ],
    timeline: [
      "Minutes 0-8: requirements, scope, scale math",
      "Minutes 8-20: high-level architecture and data flow",
      "Minutes 20-38: deep dive on bottlenecks and failure modes",
      "Minutes 38-45: risks and wrap-up",
    ],
  };
}

export async function POST(req: Request) {
  let body: { exclude?: string } = {};
  try {
    body = (await req.json()) as { exclude?: string };
  } catch {
    /* optional body */
  }

  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ guide: fallback(body.exclude ?? "netflix"), generated: false });
  }

  try {
    const ai = getGenAI();
    const response = await generateWithFallback((model) =>
      ai.models.generateContent({
        model,
        contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "Pick a scenario for the next peer mock interview.",
                `Allowed scenario ids: ${SCENARIO_POOL.map((s) => `${s.id} (${s.title})`).join(", ")}.`,
                body.exclude ? `Avoid ${body.exclude}.` : "",
                "Write the guide for a human interviewer. Max 5 focus areas, 6 probe questions, 4 red flags, 4 timeline entries.",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        },
      ],
        config: {
          systemInstruction: selectQuestionPrompt(),
          temperature: 0.9,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
          responseSchema: SELECT_SCHEMA,
          abortSignal: req.signal,
        },
      }),
    );

    const parsed = parseJsonResponse<SelectResult>(response.text);
    const allowed = new Set(SCENARIO_POOL.map((s) => s.id));
    const scenarioId = allowed.has(parsed.scenarioId) ? parsed.scenarioId : "netflix";
    return Response.json({
      guide: {
        scenarioId,
        focusAreas: parsed.focusAreas ?? [],
        probeQuestions: parsed.probeQuestions ?? [],
        redFlags: parsed.redFlags ?? [],
        timeline: parsed.timeline ?? [],
      },
      generated: true,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      return Response.json({ guide: fallback("netflix"), generated: false });
    }
    console.error("[select] failed", error);
    return Response.json({ guide: fallback("netflix"), generated: false });
  }
}
