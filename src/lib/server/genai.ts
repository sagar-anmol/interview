import { GoogleGenAI } from "@google/genai";

// gemini-2.5-flash / 2.5-flash-lite are retired for new projects (404).
// 3.5-flash-lite is the cheapest currently-available Flash model and needs no
// thinkingConfig — newer models reject thinkingBudget: 0 with 400.
export const FOREGROUND_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";

/** Cheapest-first fallbacks for transient 429/503 from the Gemini API. */
export const FALLBACK_MODELS = [
  FOREGROUND_MODEL,
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
].filter((model, index, all) => all.indexOf(model) === index);

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 429 || status === 500 || status === 502 || status === 503;
}

export async function generateWithFallback<T>(
  call: (model: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (const model of FALLBACK_MODELS) {
    try {
      return await call(model);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
    }
  }
  throw lastError;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      503,
      "missing_gemini_key",
      "GEMINI_API_KEY is not configured. Add it to .env.local.",
    );
  }
  // The SDK defaults to v1, but several current aliases (for example
  // `gemini-flash-lite-latest`) are only served from v1beta. ListModels and
  // generateContent both work on v1beta for the whole fallback chain.
  return new GoogleGenAI({ apiKey, apiVersion: "v1beta" });
}

export function parseJsonResponse<T>(text: string | undefined): T {
  if (!text) throw new ApiError(502, "empty_llm_response", "The model returned an empty response.");
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new ApiError(
      502,
      "invalid_llm_json",
      "The model returned malformed JSON.",
    );
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  // @google/genai throws its own ApiError class with a numeric `status`.
  const status = (error as { status?: number } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 600) {
    const message =
      error instanceof Error ? error.message : "Upstream model error";
    return Response.json(
      { error: message, code: "upstream_model_error" },
      { status },
    );
  }
  console.error("[api] unexpected error", error);
  return Response.json(
    { error: "Unexpected server error", code: "internal_error" },
    { status: 500 },
  );
}
