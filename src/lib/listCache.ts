// Lightweight sessionStorage cache for list payloads (chapters, uploads, etc).
// Keeps already-fetched metadata around so re-opening a course shows content
// instantly while a fresh fetch revalidates in the background (stale-while-revalidate).

const PREFIX = "diu_cache_v1::";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

type Entry<T> = { t: number; v: T };

export function readCache<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (!parsed || typeof parsed.t !== "number") return null;
    if (Date.now() - parsed.t > ttlMs) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    const entry: Entry<T> = { t: Date.now(), v: value };
    sessionStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Quota or serialization errors are non-fatal — caching is best-effort.
  }
}
