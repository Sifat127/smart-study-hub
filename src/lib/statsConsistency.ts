import { toast } from "sonner";

/**
 * Cross-surface consistency checker for contribution totals.
 *
 * Each mounted <ContributionStats /> publishes its latest snapshot here,
 * tagged with the surface it lives on (e.g. "UserDashboard",
 * "ContributorProfile"). When two surfaces publish snapshots for the *same*
 * userId whose numeric fields diverge beyond `THRESHOLD`, we surface a single
 * toast warning and log the conflicting payloads for troubleshooting.
 *
 * The check is intentionally forgiving: small transient gaps happen while
 * one surface is mid-refresh, so we only fire when the delta exceeds the
 * threshold on any field.
 */

const THRESHOLD = 2;
const TOAST_COOLDOWN_MS = 15_000;

export interface StatsSnapshot {
  uploads: number;
  likes_received: number;
  views: number;
  rank: number | null;
}

interface StoredSnapshot extends StatsSnapshot {
  at: number;
}

const byUser = new Map<string, Map<string, StoredSnapshot>>();
const lastToastAt = new Map<string, number>();

function diverges(a: StatsSnapshot, b: StatsSnapshot) {
  const fields: Array<keyof StatsSnapshot> = ["uploads", "likes_received", "views"];
  for (const f of fields) {
    const av = Number(a[f] ?? 0);
    const bv = Number(b[f] ?? 0);
    if (Math.abs(av - bv) > THRESHOLD) return f;
  }
  return null;
}

export function publishStatsSnapshot(
  surface: string,
  userId: string,
  snap: StatsSnapshot,
) {
  if (!userId) return;
  const bucket = byUser.get(userId) ?? new Map<string, StoredSnapshot>();
  bucket.set(surface, { ...snap, at: Date.now() });
  byUser.set(userId, bucket);

  if (bucket.size < 2) return;

  const entries = Array.from(bucket.entries());
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [sa, a] = entries[i];
      const [sb, b] = entries[j];
      const field = diverges(a, b);
      if (!field) continue;

      const key = `${userId}:${sa}<>${sb}`;
      const now = Date.now();
      const last = lastToastAt.get(key) ?? 0;
      if (now - last < TOAST_COOLDOWN_MS) continue;
      lastToastAt.set(key, now);

      // eslint-disable-next-line no-console
      console.warn("[stats-consistency] divergent totals", {
        userId,
        field,
        [sa]: a,
        [sb]: b,
      });
      toast.warning("Contribution totals out of sync", {
        description: `${sa} and ${sb} disagree on ${field} (${a[field]} vs ${b[field]}). Check console for details.`,
      });
    }
  }
}

export function clearStatsSnapshot(surface: string, userId: string) {
  const bucket = byUser.get(userId);
  if (!bucket) return;
  bucket.delete(surface);
  if (bucket.size === 0) byUser.delete(userId);
}
