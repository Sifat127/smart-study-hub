## Context
`/profile` already lets a signed-in user edit and save: full name, roll number, phone, section, **department**, batch, bio, avatar, password — all verified working (last turn).

Two things are missing from your ask:
1. A dedicated **Account Settings** route (`/settings`) — today everything lives under `/profile`.
2. A **semester** field on the profile (does not exist in the `profiles` table or form).

## Plan

### 1. Add `current_semester` to profiles
Migration: `ALTER TABLE public.profiles ADD COLUMN current_semester text;` (nullable, free-text matching existing `batch`/`section` style). No RLS change — existing policies already cover all columns.

### 2. New `/settings` route — Account Settings page
- New file `src/pages/Settings.tsx` rendered inside `Layout`, gated by `ProtectedRoute`.
- Tabbed layout (shadcn `Tabs`):
  - **Profile** — full name, roll number, phone, department (Select from `useDepartments`), **semester** (Select from `useSemesters`, free-text fallback), section, batch, bio, avatar upload.
  - **Security** — change password (reuse logic from current Profile page).
- Zod validation, identical save pattern as `Profile.tsx` (`supabase.from("profiles").update(...).eq("user_id", user.id)`), success/error toasts.
- Add route in `src/App.tsx`: `/settings` → `<Settings />`.
- Add "Account settings" link in Navbar user menu (desktop + mobile), keep existing "Profile" link.

### 3. Keep `/profile` as-is
`/profile` stays as the read-friendly profile view+editor. The new `/settings` is the canonical edit surface and adds the semester field. No data migration needed.

### 4. Verify
After build: open `/settings`, change name + department + semester, save, reload, confirm persistence via Playwright using the existing session restore pattern.

### Out of scope
No admin/role changes, no schema beyond the one nullable column, no redesign of `/profile`.