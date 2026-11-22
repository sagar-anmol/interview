
export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: "GROQ_API_KEY is not configured. Add it to .env.local.",
        code: "missing_groq_key",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "Missing audio file" }, { status: 400 });
  }
  if (audio.size < 600) {
    return Response.json({ text: "", durationMs: 0 });
  }
  if (audio.size > 25 * 1024 * 1024) {
    return Response.json({ error: "Audio too large" }, { status: 413 });
  }

  const startedAt = Date.now();
  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "utterance.wav");
  upstream.append("model", "whisper-large-v3-turbo");
  upstream.append("language", "en");
  upstream.append("response_format", "json");
  upstream.append("temperature", "0");

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: upstream,
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[stt] groq error", response.status, detail.slice(0, 400));
      return Response.json(
        {
          error:
            response.status === 401
              ? "Groq rejected the API key."
              : "Speech-to-text request failed.",
          code: "stt_upstream_error",
        },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { text?: string };
    return Response.json({
      text: (data.text ?? "").trim(),
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[stt] failed", error);
    return Response.json(
      { error: "Speech-to-text service unreachable.", code: "stt_unreachable" },
      { status: 502 },
    );
  }
}
