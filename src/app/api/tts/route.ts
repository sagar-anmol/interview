
export async function POST(req: Request) {
  const piperUrl = process.env.PIPER_TTS_URL;

  if (!piperUrl) {
    return Response.json(
      { fallback: "web-speech", error: "PIPER_TTS_URL is not configured." },
      { status: 503 },
    );
  }

  let body: { text?: string };
  try {
    body = (await req.json()) as { text?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(piperUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 1200) }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok || !upstream.body) {
      return Response.json(
        { fallback: "web-speech", error: "Piper TTS returned an error." },
        { status: 503 },
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[tts] piper unreachable", error);
    return Response.json(
      { fallback: "web-speech", error: "Piper TTS is unreachable." },
      { status: 503 },
    );
  }
}
