"use client";

import Dexie, { type Table } from "dexie";
import type { PersistedSession } from "@/lib/interview/types";

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

export async function saveSession(payload: PersistedSession | null) {
  if (!payload) return;
  await db().sessions.put({
    id: payload.config.id,
    updatedAt: Date.now(),
    payload,
  });
}

export async function loadSession(
  id: string,
): Promise<PersistedSession | null> {
  const row = await db().sessions.get(id);
  return row?.payload ?? null;
}

export async function deleteSession(id: string) {
  await db().sessions.delete(id);
}

export async function listSessions(limit = 20): Promise<StoredSession[]> {
  return db()
    .sessions.orderBy("updatedAt")
    .reverse()
    .limit(limit)
    .toArray();
}
