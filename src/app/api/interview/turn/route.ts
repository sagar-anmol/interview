import type { Content } from "@google/genai";
import { buildInterviewStateBlock, type FsmSnapshot } from "@/lib/interview/fsm";
import { interviewerSystemPrompt } from "@/lib/interview/prompts";
import { getScenario } from "@/lib/interview/scenarios";
import {
  ApiError,
  FOREGROUND_MODEL,
  errorResponse,
  getGenAI,
} from "@/lib/server/genai";


interface TurnBody {
  scenarioId?: string;
  recentMessages?: { role: "interviewer" | "candidate"; text: string }[];
  runningDecisionLog?: string;
  fsmState?: FsmSnapshot;
  canvasSummary?: string;
  directive?: string;
  userMessage?: string;
}

export async function POST(req: Request) {
  let body: TurnBody;
  try {
    body = (await req.json()) as TurnBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scenario = getScenario(body.scenarioId ?? "netflix");
  const recent = (body.recentMessages ?? []).slice(-8);
  const userMessage = (body.userMessage ?? "").trim();

  if (!body.fsmState) {
    return Response.json({ error: "fsmState is required" }, { status: 400 });
  }

  let ai;
  try {
    ai = getGenAI();
  } catch (error) {
    return errorResponse(error);
  }

  const stateBlock = buildInterviewStateBlock(
    body.fsmState,
    scenario,
    body.directive ?? "",
  );

  const contents: Content[] = recent
    .filter((m) => m.text?.trim())
    .map((m) => ({
      role: m.role === "interviewer" ? "model" : "user",
      parts: [{ text: m.text.trim() }],
    }));

  const decisionLog = body.runningDecisionLog?.trim()
    ? `[RUNNING DECISION LOG]\n${body.runningDecisionLog.trim()}`
    : "[RUNNING DECISION LOG]\n(empty)";

  const canvas = body.canvasSummary?.trim() || "[ARCHITECTURE CANVAS]\n(empty)";

  const injectionParts = [
    stateBlock,
    decisionLog,
    canvas,
    userMessage
      ? `[CANDIDATE SAID]\n${userMessage}`
      : "[SYSTEM]\nThe interview is starting. Open with a short greeting and your first requirements question.",
  ];

  const injection = injectionParts.join("\n\n");

  const last = contents[contents.length - 1];
  if (last && last.role === "user") {
    last.parts = [{ text: `${last.parts?.[0]?.text ?? ""}\n\n${injection}` }];
  } else {
    contents.push({ role: "user", parts: [{ text: injection }] });
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      try {
        const response = await ai.models.generateContentStream({
          model: FOREGROUND_MODEL,
          contents,
          config: {
            systemInstruction: interviewerSystemPrompt(scenario),
            temperature: 0.85,
            topP: 0.9,
            maxOutputTokens: 300,
            thinkingConfig: { thinkingBudget: 0 },
            abortSignal: req.signal,
          },
        });

        let first = true;
        let full = "";
        for await (const chunk of response) {
          if (req.signal.aborted) break;
          const text = chunk.text;
          if (!text) continue;
          if (first) {
            first = false;
            send({ type: "start", ttftMs: Date.now() - startedAt });
          }
          full += text;
          send({ type: "delta", text });
        }
        send({ type: "done", chars: full.length });
      } catch (error) {
        if (!req.signal.aborted) {
          const message =
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Upstream model error";
          send({ type: "error", message });
        }
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
