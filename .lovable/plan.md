## Add a "Filter Chapters" section to the User Dashboard

Add a standalone filter + results section on `/dashboard` (between the Departments grid and Recent Downloads) styled like the screenshot.

### Filter bar (one card)

- Header row: funnel icon + "Filter Chapters" on the left; on the right, pill chips for each active filter (icon-tinted, one per Department / Course / Semester / Chapter) plus an "X Clear all N" button. Chips appear only when filters are active.
- Dropdowns row — 4 selects in a responsive grid (1 col mobile / 2 sm / 4 lg), each with a colored leading icon:
  1. **Department** (blue, GraduationCap) — from `mockData.departments`. Default "All departments".
  2. **Course** (green, BookOpen) — from `courses` table filtered by selected department. Disabled until department picked.
  3. **Semester** (purple, CalendarDays) — 1–12. Default "All semesters".
  4. **Chapter** (amber, FileText) — from `chapters` filtered by selected course. Disabled until course picked.
- Changing a parent filter clears its dependent children.

### Results list

Cards stacked vertically for each matching chapter:
- Chapter title (bold)
- Tag chips: department code (blue), course code (amber), semester (purple)
- Meta row: clock + uploaded date, file badges showing PDF / Notes availability
- Whole card links to `/departments/:dept/semester/:sem/course/:courseId?tab=materials`

States: loading skeletons; empty-with-filters "No chapters match these filters."; empty-no-filters shows latest ~10 chapters so the section isn't blank.

### Data

Single Supabase query on `chapters` joined to `courses(id, code, name, department, semester)`, filtered server-side by the active dropdowns, ordered by `uploaded_at desc`, limit 30. Re-runs whenever a filter changes.

### Files

- **Edit** `src/pages/UserDashboard.tsx` — add a `FilterChaptersSection` component in the same file and render it between the Departments grid and Recent Downloads.

No DB, routing, or backend changes. Uses existing RLS on `chapters` and `courses` (authenticated reads already allowed).
