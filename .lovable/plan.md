## Add Google Sign-In (Option A — DIU-only + post-signup roll number)

Going with Option A since it preserves the existing `@diu.edu.bd`-only policy and the roll-number requirement.

### Steps

1. **Enable managed Google OAuth** via the Lovable Cloud social auth configuration. This also installs `@lovable.dev/cloud-auth-js` and generates `src/integrations/lovable/`. Email/password stays enabled.

2. **DB migration — relax `handle_new_user` for OAuth users**
   - Still reject any email not matching `^[^@\s]+@diu\.edu\.bd$` (applies to Google too via `hd: "diu.edu.bd"` + server-side check).
   - If `raw_user_meta_data.roll_number` is missing (Google path), insert the profile row with `roll_number = NULL` instead of raising.
   - Keep the format check and unique-violation handling for when a roll number IS provided.
   - Still insert default `user` role.

3. **Add `GoogleAuthButton` component** (`src/components/GoogleAuthButton.tsx`)
   - Calls `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin, extraParams: { hd: "diu.edu.bd", prompt: "select_account" } })`.
   - Handles `result.error` with a destructive toast, returns on `result.redirected`.
   - Google "G" logo + "Continue with Google" label, full-width, matches existing button styling.

4. **Login + Signup pages**
   - Add `<GoogleAuthButton />` above the email field on both `src/pages/Login.tsx` and `src/pages/Signup.tsx`.
   - Add an "or continue with email" divider between the Google button and the existing form.

5. **Post-OAuth roll-number gate**
   - New route `/complete-profile` (`src/pages/CompleteProfile.tsx`) — protected, single field (roll number, same regex as signup), submits an `update` to `profiles` for `auth.uid()`.
   - In `AuthContext.fetchUserData`, after the profile loads, expose a `needsProfileCompletion` boolean (true when `profile.roll_number` is null).
   - New wrapper `RequireCompleteProfile` used inside `ProtectedRoute` (and on `/`) that redirects to `/complete-profile` when `needsProfileCompletion` is true; `/complete-profile` itself is exempt.

6. **Safety net for non-DIU Google accounts**
   - If a user somehow gets through with a non-DIU email (e.g. `hd` bypassed), the DB trigger still rejects them and the OAuth callback surfaces the error — `GoogleAuthButton` shows a toast: "Only @diu.edu.bd Google accounts are allowed."

### Technical notes

- No edits to `src/integrations/supabase/client.ts` or `src/integrations/lovable/*` — both auto-generated.
- Migration runs via the Supabase migration tool; `handle_new_user` is replaced with `CREATE OR REPLACE FUNCTION`.
- No new secrets — managed Google credentials are used.
- Existing email/password flow, verification, and admin gating are untouched.

### Files

- new: `src/components/GoogleAuthButton.tsx`, `src/pages/CompleteProfile.tsx`, `src/components/RequireCompleteProfile.tsx`
- edit: `src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/contexts/AuthContext.tsx`, `src/App.tsx`
- migration: replace `public.handle_new_user`
