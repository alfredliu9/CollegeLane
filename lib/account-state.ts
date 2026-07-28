"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Client hook for account-scoped state persisted in Supabase via /api/state.
// Keys follow the `cl-*` convention (cl-athlete, cl-schools, cl-tasks,
// cl-outreach, cl-chat, cl-note-<school-id>). Loads once on mount; `save`
// updates local state optimistically and writes through to the server.
export function useAccountState<T>(key: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/state?key=${encodeURIComponent(key)}`);
        if (res.ok) {
          const json = await res.json();
          if (alive && json.found) setData(json.value as T);
        }
      } catch {
        /* offline / not signed in — keep fallback */
      } finally {
        if (alive) {
          setLoading(false);
          mounted.current = true;
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  const save = useCallback(
    async (next: T) => {
      setData(next);
      setSaving(true);
      try {
        await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: next }),
        });
      } catch {
        /* keep optimistic value; will re-sync on next save */
      } finally {
        setSaving(false);
      }
    },
    [key],
  );

  return { data, setData, save, loading, saving };
}
