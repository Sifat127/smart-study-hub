/**
 * Single source of truth for "is this profile complete enough to use the app?"
 *
 * A verified user must have at least:
 *   - roll_number  (set at signup, but can be blank if metadata was missing)
 *   - department
 *   - batch
 *
 * Anything else (section, phone, bio, avatar) is optional.
 *
 * Consumers:
 *   - AuthCallback: decides whether to send a freshly verified user to
 *     /dashboard or /complete-profile.
 *   - RequireCompleteProfile: guards protected pages so users cannot
 *     bypass the completion step by typing a URL directly.
 */

export interface ProfileCompletenessInput {
  roll_number?: string | null;
  department?: string | null;
  batch?: string | null;
}

/** Fields that must be present + non-empty for the profile to be "complete". */
export const REQUIRED_PROFILE_FIELDS = ["roll_number", "department", "batch"] as const;
export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/** Which required fields are missing on this profile. Empty array = complete. */
export function missingProfileFields(
  profile: ProfileCompletenessInput | null | undefined,
): RequiredProfileField[] {
  if (!profile) return [...REQUIRED_PROFILE_FIELDS];
  return REQUIRED_PROFILE_FIELDS.filter((f) => isBlank(profile[f]));
}

/** True when every required field on the profile is filled in. */
export function isProfileComplete(
  profile: ProfileCompletenessInput | null | undefined,
): boolean {
  return missingProfileFields(profile).length === 0;
}
