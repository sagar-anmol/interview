import {
  REPORT_SCHEMA,
  isTrackInterview,
  reportSystemPrompt,
  trackReportPrompt,
} from "@/lib/interview/prompts";
import {
  errorResponse,
  generateWithFallback,
  getGenAI,
  parseJsonResponse,
} from "@/lib/server/genai";
import { getScenario } from "@/lib/interview/scenarios";
import type { Report } from "@/lib/interview/types";


interface ReportBody {
  scenarioId?: string;
  turns?: { speaker: string; text: string; interrupted?: boolean }[];
  canvasSummary?: string;
  decisionLog?: string;
  elapsedSec?: number;
  hireSignalHint?: string;
  track?: string;
}

export async function POST(req: Request) {
  let body: ReportBody;
  try {
    body = (await req.json()) as ReportBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scenario = getScenario(body.scenarioId ?? "netflix");
  const turns = body.turns ?? [];
  if (turns.length === 0) {
    return Response.json(
      { error: "Cannot evaluate an empty transcript" },
      { status: 400 },
    );
  }

  const transcript = turns
    .map(
      (t) =>
        `${t.speaker === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${t.text}${
          t.interrupted ? " [interrupted]" : ""
        }`,
    )
    .join("\n")
    .slice(0, 80_000);

  const elapsedMin = Math.round((body.elapsedSec ?? 0) / 60);

  const prompt = [
    `Interview length: ${elapsedMin} minutes.`,
    "",
    "[FULL TRANSCRIPT]",
    transcript,
    "",
    "[RUNNING DECISION LOG]",
    body.decisionLog?.trim() || "(empty)",
    "",
    "[FINAL ARCHITECTURE CANVAS]",
    body.canvasSummary?.trim() || "(empty)",
  ].join("\n");

  try {
    const ai = getGenAI();
    const response = await generateWithFallback((model) =>
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
        systemInstruction: isTrackInterview(body.track)
          ? trackReportPrompt(body.track as Parameters<typeof trackReportPrompt>[0])
          : reportSystemPrompt(scenario),
        temperature: 0.4,
        maxOutputTokens: 2600,
        responseMimeType: "application/json",
          responseSchema: REPORT_SCHEMA,
        },
      }),
    );

    const parsed = parseJsonResponse<Omit<Report, "generatedAt">>(response.text);

    const report: Report = {
      ...parsed,
      scores: (parsed.scores ?? []).map((s) => ({
        ...s,
        score: Math.max(1, Math.min(5, Math.round(s.score))),
      })),
      generatedAt: Date.now(),
    };

    return Response.json({ report });
  } catch (error) {
    return errorResponse(error);
  }
}
