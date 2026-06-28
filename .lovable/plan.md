## Mobile redesign — DepartmentDetail semester grid

Apply the selected "Neon glass grid (big index)" direction to the mobile view of `/departments/:deptId` only. Desktop view (`md:` and up) stays exactly as it is today.

### Scope
- File: `src/pages/DepartmentDetail.tsx` only
- Target: the 12-card semester grid section
- Viewport: mobile (< `md` breakpoint)
- No backend, route, data, or desktop changes

### Visual changes (mobile)
Each semester card becomes:
- Rounded `rounded-[1.75rem]`, translucent glass surface using existing tokens (`bg-card/40`, `border-border/40`, `backdrop-blur-xl`)
- Large ghosted index number (`1`–`12`) absolutely positioned top-right, `text-6xl font-extrabold text-foreground/[0.04]`, non-selectable, behind content
- Centered stack: 48px rounded icon tile (graduation cap, primary-tinted with primary/20 border) → "Semester N" title (`text-sm font-bold`) → "N COURSES" caption (`text-[10px] uppercase tracking-widest text-muted-foreground`)
- Subtle active-press scale (`active:scale-[0.98]`)

Grid:
- Mobile: `grid-cols-2 gap-3` with slightly tighter outer padding
- Desktop: keep current `md:` classes untouched (still 4-col layout)

### Implementation notes
- Keep all dynamic data (`semester`, `count`) and `<Link>` routing intact
- Use semantic tokens (`primary`, `card`, `border`, `muted-foreground`, `foreground`) — no hardcoded hex
- Keep skeleton-in-place for course-count loading (already fixed)
- No new fonts; continue using project Raleway
- No new dependencies

### Verification
After implementing, run a quick mobile Playwright check at 390×844 to confirm:
- All 12 cards render with ghost numbers 1–12
- Counts populate without layout shift
- Desktop view at 1280px is visually unchanged
