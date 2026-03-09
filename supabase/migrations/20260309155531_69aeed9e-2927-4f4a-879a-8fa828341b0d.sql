-- Fix: Convert restrictive SELECT policies to permissive ones for public access

-- courses
DROP POLICY "Anyone can read courses" ON public.courses;
CREATE POLICY "Anyone can read courses" ON public.courses FOR SELECT TO public USING (true);

-- chapters
DROP POLICY "Anyone can read chapters" ON public.chapters;
CREATE POLICY "Anyone can read chapters" ON public.chapters FOR SELECT TO public USING (true);