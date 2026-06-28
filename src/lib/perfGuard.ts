/**
 * perfGuard — lightweight client check that detects environments prone to
 * paint / paste / framebuffer artifacts (the "glitch stripes" seen on some
 * mobile Chrome GPUs) and disables risky optimizations for the session.
 *
 * Mechanism: adds `perf-safe-mode` class to <html>. CSS in index.css strips
 * backdrop-filter, content-visibility, will-change, and heavy filters under
 * that class so the rest of the app code stays untouched.
 *
 * Decision is cached in sessionStorage so the probe runs once per tab.
 */

const STORAGE_KEY = "perf-safe-mode-v1";
const CLASS_NAME = "perf-safe-mode";

type Reason =
  | "user-forced"
  | "reduced-motion"
  | "save-data"
  | "low-memory"
  | "low-cores"
  | "risky-gpu"
  | "small-mobile"
  | "paint-probe-failed";

function getGpuRenderer(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return null;
    return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
  } catch {
    return null;
  }
}

function isRiskyGpu(renderer: string | null): boolean {
  if (!renderer) return false;
  const r = renderer.toLowerCase();
  // GPUs historically reported with paint glitches / framebuffer reuse bugs
  // on Chrome Android. Conservative list — only known-flaky families.
  return /mali-?[3-6]\d{2}|adreno \(?(3\d{2}|4\d{2}|5[0-2]\d)\)?|powervr ge?8/.test(r);
}

function probeReasons(): Reason[] {
  const reasons: Reason[] = [];

  // 1. User opt-in via URL flag (?safe=1) or prior session pin
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("safe") === "1") reasons.push("user-forced");
  } catch {}

  // 2. OS reduced-motion
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reasons.push("reduced-motion");
    }
  } catch {}

  // 3. Save-Data / slow connection
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData) reasons.push("save-data");
  if (conn?.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType)) reasons.push("save-data");

  // 4. Low device memory (GB)
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem <= 2) reasons.push("low-memory");

  // 5. Low logical cores
  if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2) {
    reasons.push("low-cores");
  }

  // 6. Small mobile + coarse pointer + Chromium on Android (the glitch hotspot)
  const ua = navigator.userAgent || "";
  const isAndroidChrome = /Android/.test(ua) && /Chrome\/\d+/.test(ua);
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  if (isAndroidChrome && coarse && window.innerWidth <= 480) reasons.push("small-mobile");

  // 7. Known risky GPU
  if (isRiskyGpu(getGpuRenderer())) reasons.push("risky-gpu");

  return reasons;
}

/**
 * Synchronous paint-probe: draws a tiny element with content-visibility:auto
 * + backdrop-filter and reads its bounding box. If the layout engine reports
 * a zero/NaN size where it shouldn't, the rendering pipeline is unhappy and
 * we fall back to safe mode.
 */
function paintProbeFailed(): boolean {
  try {
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;width:32px;height:32px;contain:strict;content-visibility:auto;contain-intrinsic-size:32px 32px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);";
    document.documentElement.appendChild(el);
    const rect = el.getBoundingClientRect();
    el.remove();
    if (!rect) return true;
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return true;
    if (rect.width < 1 || rect.height < 1) return true;
    return false;
  } catch {
    return true;
  }
}

function applySafeMode(reasons: Reason[]) {
  document.documentElement.classList.add(CLASS_NAME);
  document.documentElement.dataset.safeReason = reasons.join(",");
}

export function initPerfGuard(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Honor explicit user override stored across reloads in the same tab.
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached === "on") {
      applySafeMode(["user-forced"]);
      return;
    }
    if (cached === "off") return;
  } catch {}

  const reasons = probeReasons();
  if (paintProbeFailed()) reasons.push("paint-probe-failed");

  if (reasons.length > 0) {
    applySafeMode(reasons);
    try {
      sessionStorage.setItem(STORAGE_KEY, "on");
    } catch {}
  }
}

/** Manual controls — surfaced from the QA checklist page. */
export const perfGuard = {
  isOn(): boolean {
    return document.documentElement.classList.contains(CLASS_NAME);
  },
  reasons(): string[] {
    const raw = document.documentElement.dataset.safeReason || "";
    return raw ? raw.split(",") : [];
  },
  enable(): void {
    applySafeMode(["user-forced"]);
    try {
      sessionStorage.setItem(STORAGE_KEY, "on");
    } catch {}
  },
  disable(): void {
    document.documentElement.classList.remove(CLASS_NAME);
    delete document.documentElement.dataset.safeReason;
    try {
      sessionStorage.setItem(STORAGE_KEY, "off");
    } catch {}
  },
  clear(): void {
    document.documentElement.classList.remove(CLASS_NAME);
    delete document.documentElement.dataset.safeReason;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
};
