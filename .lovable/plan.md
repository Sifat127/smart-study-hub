

## Fix: Allow Public Access to Courses/Chapters, Require Login for PDF Download

### Root Cause
The RLS policies on `courses` and `chapters` tables are **restrictive** (not permissive). In PostgreSQL, if only restrictive policies exist with no permissive policies, access is denied by default. This blocks unauthenticated users from viewing courses and chapters.

### Plan

**1. Fix RLS policies (database migration)**
- Drop the existing restrictive SELECT policies on `courses` and `chapters`
- Re-create them as **permissive** SELECT policies so anyone (including unauthenticated users) can read courses and chapters

```sql
-- courses
DROP POLICY "Anyone can read courses" ON public.courses;
CREATE POLICY "Anyone can read courses" ON public.courses FOR SELECT USING (true);

-- chapters  
DROP POLICY "Anyone can read chapters" ON public.chapters;
CREATE POLICY "Anyone can read chapters" ON public.chapters FOR SELECT USING (true);
```

**2. Add login gate for PDF download/view in `CourseDetail.tsx`**
- Import `useAuth` from AuthContext
- Before download: check if user is logged in, if not show a toast message "Please login to download PDFs" and optionally redirect to `/login`
- For the "View" button: same check — if not logged in, show login prompt instead of opening the PDF
- Hide or disable Download/View buttons for unauthenticated users, or show a "Login to access" prompt

### Files to Change
- **Database**: Migration to fix RLS policies (permissive SELECT)
- **`src/pages/CourseDetail.tsx`**: Add auth check for PDF download/view actions

