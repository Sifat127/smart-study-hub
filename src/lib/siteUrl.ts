/**
 * Site URL resolution for auth email redirects (signup verification,
 * password reset, magic links). Order of precedence:
 *
 *   1. `VITE_SITE_URL` — set per environment in `.env` / hosting build vars.
 *      Use this for staging deploys (e.g. https://staging.diu-study-bank.vercel.app).
 *   2. When the browser is already running on an allow-listed host,
 *      reuse `window.location.origin` so preview / staging users bounce
 *      back to the same deploy they signed up from.
 *   3. Hard-coded production fallback (`PRODUCTION_SITE_URL`).
 *
 * Never point at localhost from a deployed build — Supabase would email
 * a link the recipient can't open.
 */

export const PRODUCTION_SITE_URL = "https://diu-study-bank.vercel.app";

/** Hosts the app is *allowed* to redirect back to when detected at runtime. */
const ALLOWED_ORIGIN_HOSTS: readonly string[] = [
  "diu-study-bank.vercel.app",
  "diu-study-bank.lovable.app",
];

function readEnvSiteUrl(): string | null {
  const raw = (import.meta.env?.VITE_SITE_URL as string | undefined)?.trim();
  if (!raw) return null;
  try {
    // Normalize: no trailing slash, valid URL.
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function readRuntimeOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const { origin, hostname } = window.location;
  if (!origin || !hostname) return null;
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  if (
    ALLOWED_ORIGIN_HOSTS.includes(hostname) ||
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".vercel.app")
  ) {
    return origin;
  }
  return null;
}

/**
 * Origin to use for auth email redirects. Resolved fresh on each call so
 * tests and hot reloads pick up env changes.
 */
export function getAuthRedirectOrigin(): string {
  return readEnvSiteUrl() ?? readRuntimeOrigin() ?? PRODUCTION_SITE_URL;
}

/** Build a full absolute auth-callback URL for the current environment. */
export function buildAuthCallbackUrl(
  path = "/auth/callback",
  params?: Record<string, string>,
): string {
  const base = getAuthRedirectOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const qs = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";
  return `${base}${normalized}${qs}`;
}
