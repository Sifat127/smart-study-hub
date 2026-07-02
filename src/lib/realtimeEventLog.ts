/**
 * Tiny in-memory event bus for realtime payloads so the debug panel on any
 * page (student or admin dashboard, contributor profile) can display the
 * incoming user_id / file_id / action for every postgres_changes event and
 * confirm it was applied to the UI.
 */
export interface RealtimeLogEntry {
  id: number;
  at: number;
  surface: string;
  table: string;
  event: string; // INSERT | UPDATE | DELETE
  fileId?: string | null;
  userId?: string | null;
  applied: boolean;
  extra?: string;
}

type Listener = (entries: RealtimeLogEntry[]) => void;

const MAX = 40;
let entries: RealtimeLogEntry[] = [];
let seq = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(entries);
}

export function logRealtimeEvent(
  surface: string,
  table: string,
  payload: any,
  opts: { applied?: boolean; extra?: string } = {},
) {
  const row = payload?.new ?? payload?.old ?? {};
  const entry: RealtimeLogEntry = {
    id: ++seq,
    at: Date.now(),
    surface,
    table,
    event: String(payload?.eventType ?? payload?.event ?? "?").toUpperCase(),
    fileId: row?.file_id ?? row?.id ?? null,
    userId: row?.user_id ?? row?.uploader_id ?? row?.viewer_id ?? row?.uploaded_by ?? null,
    applied: opts.applied ?? true,
    extra: opts.extra,
  };
  // eslint-disable-next-line no-console
  console.debug("[realtime]", surface, table, entry.event, {
    file_id: entry.fileId,
    user_id: entry.userId,
    applied: entry.applied,
    payload,
  });
  entries = [entry, ...entries].slice(0, MAX);
  emit();
}

export function subscribeRealtimeLog(listener: Listener) {
  listeners.add(listener);
  listener(entries);
  return () => {
    listeners.delete(listener);
  };
}

export function clearRealtimeLog() {
  entries = [];
  emit();
}
