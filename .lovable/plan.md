

## Show Only CSE, EEE, SWE on Homepage

Filter the departments list on the homepage to only show CSE, EEE, and SWE.

### Change

**`src/pages/Index.tsx`** (line 242)
- Filter `departments` to only include `cse`, `eee`, `swe` before mapping:
  ```tsx
  {departments.filter(d => ["cse", "eee", "swe"].includes(d.id)).map((dept, i) => {
  ```
- Add a "View All Departments" button below the grid linking to `/departments`

