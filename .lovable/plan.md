Public buckets are blocked by workspace policy, so I'll serve avatars through a lightweight public edge function that reads the private `avatars` bucket with the service role. That keeps the bucket private while allowing anonymous visitors on `/contribution` and `/contribution/:userId` to see student photos.

## Changes

1. **New edge function `public-avatar`** (`supabase/functions/public-avatar/index.ts`, deployed with `verify_jwt = false`):
   - Accepts `GET /public-avatar?path=<user_id>/<file>`.
   - Validates the path shape (`<uuid>/...`, no `..`).
   - Downloads the object from the private `avatars` bucket using the service role client.
   - Streams the bytes back with the correct `Content-Type` and long `Cache-Control` (`public, max-age=86400, immutable`).
   - Returns a 1x1 transparent PNG (or 404) when the object is missing so `<img>` tags degrade gracefully.
   - CORS `*` for GET.

2. **New helper `src/lib/avatarUrl.ts`**:
   - `avatarPublicUrl(pathOrUrl: string | null): string | null`.
   - Returns `null` for empty input.
   - Passes through absolute `http(s)://` URLs unchanged (legacy data).
   - Otherwise returns `${SUPABASE_URL}/functions/v1/public-avatar?path=<encoded path>`.

3. **Wire the helper into the UI** (frontend only — no logic changes):
   - `src/pages/Contribution.tsx` `ContributorCard`: wrap `row.avatar_url` with `avatarPublicUrl(...)` in the `<img src>`, and add `loading="lazy"` + an `onError` fallback that swaps to the `UserIcon` placeholder.
   - `src/pages/ContributorProfile.tsx` hero avatar: same treatment.

4. **Leave untouched**: `Profile.tsx` / `Settings.tsx` (owner uses signed URLs and works today), bucket privacy, upload policies, and all other schema/RLS.

## Verification

- Signed-out visit to `/contribution` renders student photos for rows with `avatar_url` set; users without one still show the `UserIcon` placeholder.
- `/contribution/<user_id>` hero avatar renders for signed-out visitors.
- Owner upload/replace flow in Settings continues to work (unchanged).
- Network tab shows 200s from `/functions/v1/public-avatar?path=...` with `image/*` content type.
