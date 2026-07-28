"use client";
import { useCallback, useEffect, useState } from "react";

// Client access to account-scoped state persisted in Supabase via /api/state.
// Keys follow the `cl-*` convention (cl-athlete, cl-schools, cl-tasks,
// cl-outreach, cl-chat, cl-note-<school-id>).
//
// A session-scoped in-memory cache makes navigating back to a page instant
// instead of showing a spinner every time, and dedups concurrent reads of the
// same key. The cache is cleared on logout (clearAccountCache) so a different
// account signing in on the same tab never sees stale data.

const mem = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

export function clearAccountCache() {
  mem.clear();
  inflight.clear();
}

function fetchState<T>(key: string): Promise<T | undefined> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T | undefined>;
  const p = (async () => {
    try {
      const res = await fetch(`/api/state?key=${encodeURIComponent(key)}`);
      if (!res.ok) return undefined;
      const json = await res.json();
      const value = json.found ? (json.value as T) : undefined;
      if (value !== undefined) mem.set(key, value);
      return value;
    } catch {
      return undefined;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p as Promise<T | undefined>;
}

// Warm the cache for keys the user is likely to open next (called from the app
// shell on mount) so the first navigation to a page is already populated.
export function prefetchAccountState(keys: string[]) {
  for (const key of keys) if (!mem.has(key)) void fetchState(key);
}

export function useAccountState<T>(key: string, fallback: T) {
  const hasCache = mem.has(key);
  const [data, setData] = useState<T>(hasCache ? (mem.get(key) as T) : fallback);
  const [loading, setLoading] = useState(!hasCache);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    if (mem.has(key)) {
      // Show cached value instantly, then revalidate in the background.
      setData(mem.get(key) as T);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetchState<T>(key)
      .then((value) => {
        if (!alive) return;
        if (value !== undefined) setData(value);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [key]);

  const save = useCallback(
    async (next: T) => {
      setData(next);
      mem.set(key, next);
      setSaving(true);
      try {
        await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: next }),
        });
      } catch {
        /* keep optimistic value; re-syncs on next save */
      } finally {
        setSaving(false);
      }
    },
    [key],
  );

  return { data, setData, save, loading, saving };
}
