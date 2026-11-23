"use client";

import { loadSession, saveSession } from "@/lib/db";
import { elapsedSeconds, toPersisted, useInterviewStore } from "@/store/useInterviewStore";
import type { Report } from "@/lib/interview/types";

export async function fetchStoredReport(sessionId: string) {
  const session = await loadSession(sessionId);
  return session?.report ?? null;
}

/**
 * Generate the debrief report for a session directly from the local
 * transcript + final canvas. Returns null when there is no session or the
 * API call fails.
 */
export async function generateReportFromSession(
  sessionId: string,
): Promise<Report | null> {
  const state = useInterviewStore.getState();
  const payload = toPersisted(state);
  if (!payload) return null;

  const turns = state.turns
    .filter((t) => t.text.trim())
    .map((t) => ({
      speaker: t.speaker,
      text: t.interrupted ? (t.spokenText ?? t.text) : t.text,
      interrupted: t.interrupted,
    }));

  try {
    const res = await fetch("/api/interview/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId: payload.config.scenarioId,
        turns,
        decisionLog: payload.decisionLog,
        elapsedSec: elapsedSeconds(state),
        track: payload.config.practiceMeta?.track,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Report generation failed");
    }
    const data = (await res.json()) as { report: Report };
    const report = data.report;
    useInterviewStore.getState().setReport(report);
    await saveSession(toPersisted(useInterviewStore.getState()));
    return report;
  } catch (error) {
    console.warn("[peer] report failed for session", sessionId, error);
    return null;
  }
}
