import { createClient } from "@supabase/supabase-js";

/**
 * Supabase is used for persistence only (Dexie/IndexedDB remains the fast local
 * cache). It is optional: if the env vars are absent the app stays fully local.
 *
 * A single client is shared to avoid multiple GoTrueClient instances fighting
 * over the same storage key. Per-session RLS scoping is done with a
 * `x-share-token` header set on individual queries (see `scopedQuery`).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_LEGACY_ANON_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

/** Attach a session's share token so anon RLS policies allow the query. */
export function scopedQuery<T extends { setHeader: (name: string, value: string) => T }>(
  query: T,
  token: string,
): T {
  return query.setHeader("x-share-token", token);
}
