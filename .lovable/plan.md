

## Problem

All RLS policies on `chapters` and `courses` tables are RESTRICTIVE. In PostgreSQL, when only restrictive policies exist with no permissive ones, access is denied by default — even the `SELECT` policy with `USING (true)` won't work.

## Fix

Create a new database migration that:
1. Drops all existing RESTRICTIVE policies on `chapters` and `courses`
2. Recreates them as PERMISSIVE (the default)

```sql
-- chapters
DROP POLICY IF EXISTS "Anyone can read chapters" ON public.chapters;
DROP POLICY IF EXISTS "Admins can insert chapters" ON public.chapters;
DROP POLICY IF EXISTS "Admins can update chapters" ON public.chapters;
DROP POLICY IF EXISTS "Admins can delete chapters" ON public.chapters;

CREATE POLICY "Anyone can read chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Admins can insert chapters" ON public.chapters FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update chapters" ON public.chapters FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete chapters" ON public.chapters FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- courses
DROP POLICY IF EXISTS "Anyone can read courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;

CREATE POLICY "Anyone can read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

No frontend code changes needed — `CourseDetail.tsx` already has the correct `handleDownload` logic.

