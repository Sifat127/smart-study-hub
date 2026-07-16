/**
 * Resolve a profile.avatar_url value (a storage path in the private `avatars`
 * bucket) to a public HTTP URL served by the `public-avatar` edge function.
 * Legacy absolute URLs are returned unchanged.
 */
export function avatarPublicUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  const v = pathOrUrl.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return null;
  return `${base}/functions/v1/public-avatar?path=${encodeURIComponent(v)}`;
}
