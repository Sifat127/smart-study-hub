import { useCallback, useEffect, useState } from "react";

/**
 * "Reduce motion" preference, persisted to localStorage and synced with the
 * OS-level `prefers-reduced-motion` media query.
 *
 * When enabled, a `reduce-motion` class is added to <html>; global CSS in
 * `src/index.css` disables transitions and decorative animations under that
 * class (spinners and toast progress remain so loading state is still visible).
 *
 * The hook also listens for `storage` events so toggling the setting in one
 * tab is reflected in others immediately.
 */
const STORAGE_KEY = "diu-reduce-motion";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "1") return true;
  if (raw === "0") return false;
  // No explicit choice yet — respect the OS preference.
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function applyClass(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", enabled);
}

export function useReducedMotion() {
  const [enabled, setEnabled] = useState<boolean>(readInitial);

  // Apply the class on mount + whenever the preference changes.
  useEffect(() => {
    applyClass(enabled);
  }, [enabled]);

  // Sync across tabs via the storage event.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setEnabled(readInitial());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    setEnabled(next);
  }, []);

  const toggle = useCallback(() => {
    setPreference(!enabled);
  }, [enabled, setPreference]);

  return { reduceMotion: enabled, setReduceMotion: setPreference, toggleReduceMotion: toggle };
}

/**
 * One-shot bootstrap so the class is applied before React mounts, preventing
 * a flash of animation on the very first paint.
 */
export function bootstrapReducedMotion() {
  applyClass(readInitial());
}
