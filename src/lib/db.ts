"use client";

import Dexie, { type Table } from "dexie";
import type { PersistedSession } from "@/lib/interview/types";
import { scopedQuery, supabase } from "@/lib/supabase/client";

export interface StoredSession {
  id: string;
  updatedAt: number;
  payload: PersistedSession;
}

class InterviewDB extends Dexie {
  sessions!: Table<StoredSession, string>;

  constructor() {
    super("system-design-interview");
    this.version(1).stores({
      sessions: "id, updatedAt",
    });
  }
}

let instance: InterviewDB | null = null;

function db(): InterviewDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!instance) instance = new InterviewDB();
  return instance;
}

/* ------------------------------------------------------------------ *
 * Share tokens — anon RLS is scoped by this secret, never by user id.
 * ------------------------------------------------------------------ */

const TOKEN_PREFIX = "sd_share_token:";

export function setShareToken(id: string, token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${TOKEN_PREFIX}${id}`, token);
}

export function getShareToken(id: string): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(`${TOKEN_PREFIX}${id}`);
  if (stored) return stored;

  // Allow opening a shared session via ?token=<uuid>.
  const fromUrl = new URLSearchParams(window.location.search).get("token");
  if (fromUrl) {
    setShareToken(id, fromUrl);
    return fromUrl;
  }
  return null;
}

function ensureShareToken(id: string): string {
  const existing = getShareToken(id);
  if (existing) return existing;
  const token = crypto.randomUUID();
  setShareToken(id, token);
  return token;
}

/* ------------------------------------------------------------------ *
 * Local store
 * ------------------------------------------------------------------ */

export async function saveSession(payload: PersistedSession | null) {
  if (!payload) return;
  await db().sessions.put({
    id: payload.config.id,
    updatedAt: Date.now(),
    payload,
  });
  void syncSessionToCloud(payload);
}

export async function loadSession(
  id: string,
): Promise<PersistedSession | null> {
  const local = await db().sessions.get(id);
  if (local?.payload) return local.payload;

  // Cold load / shared link: fall back to Supabase.
  const token = getShareToken(id);
  if (!supabase || !token) return null;

  const { data, error } = await scopedQuery(
    supabase.from("sd_sessions").select("payload").eq("id", id),
    token,
  ).maybeSingle();
  if (error || !data) return null;

  const payload = data.payload as PersistedSession;
  await db().sessions.put({ id, updatedAt: Date.now(), payload });
  return payload;
}

export async function deleteSession(id: string) {
  await db().sessions.delete(id);
  window.localStorage.removeItem(`${TOKEN_PREFIX}${id}`);
  // Cloud rows are kept intentionally so a share link remains valid.
}

export async function listSessions(limit = 20): Promise<StoredSession[]> {
  return db()
    .sessions.orderBy("updatedAt")
    .reverse()
    .limit(limit)
    .toArray();
}

/* ------------------------------------------------------------------ *
 * Cloud mirror (best effort — never blocks the interview)
 * ------------------------------------------------------------------ */

async function syncSessionToCloud(payload: PersistedSession) {
  const id = payload.config.id;
  const token = ensureShareToken(id);
  if (!supabase) return;

  try {
    const { error } = await supabase.from("sd_sessions").upsert(
      {
        id,
        share_token: token,
        mode: payload.config.mode,
        scenario_id: payload.config.scenarioId,
        payload: payload as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    ).setHeader("x-share-token", token);
    if (error) {
      console.warn("[supabase] session sync failed", error.message);
      return;
    }

    // Turns are mirrored separately so they can be queried without the blob.
    if (payload.turns.length > 0) {
      const rows = payload.turns.map((turn, seq) => ({
        session_id: id,
        seq,
        speaker: turn.speaker,
        text: turn.text ?? "",
        interrupted: Boolean(turn.interrupted),
      }));
      const turnResult = await supabase
        .from("sd_turns")
        .upsert(rows, { onConflict: "session_id,seq" })
        .setHeader("x-share-token", token);
      if (turnResult.error) {
        console.warn("[supabase] turn sync failed", turnResult.error.message);
      }
    }

    if (payload.report) {
      const reportResult = await supabase
        .from("sd_reports")
        .upsert({
          session_id: id,
          report: payload.report as unknown as Record<string, unknown>,
          created_at: new Date().toISOString(),
        })
        .setHeader("x-share-token", token);
      if (reportResult.error) {
        console.warn("[supabase] report sync failed", reportResult.error.message);
      }
    }
  } catch (error) {
    console.warn("[supabase] sync unavailable", error);
  }
}

export function getShareUrl(id: string): string | null {
  const token = getShareToken(id);
  if (!token || typeof window === "undefined") return null;
  const url = new URL(`/interview/${id}`, window.location.origin);
  url.searchParams.set("token", token);
  return url.toString();
}
