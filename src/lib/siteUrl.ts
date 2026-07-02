// Production site users should always land on after email actions
// (verification, password reset). Falls back to the current origin only
// when running the production host itself (in case it ever changes).
export const PRODUCTION_SITE_URL = "https://diu-study-bank.vercel.app";

/**
 * Origin to use for auth email redirects. We always send users to the
 * live production site after they click a link in their inbox, regardless
 * of whether they signed up from a preview / localhost build.
 */
export function getAuthRedirectOrigin(): string {
  return PRODUCTION_SITE_URL;
}
