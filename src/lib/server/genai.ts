import { GoogleGenAI } from "@google/genai";

export const FOREGROUND_MODEL = "gemini-2.5-flash";

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
  return new GoogleGenAI({ apiKey });
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
  console.error("[api] unexpected error", error);
  return Response.json(
    { error: "Unexpected server error", code: "internal_error" },
    { status: 500 },
  );
}
