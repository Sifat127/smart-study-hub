
-- Fix chapters RLS: drop restrictive, recreate as permissive
DROP POLICY "Anyone can read chapters" ON public.chapters;
DROP POLICY "Admins can insert chapters" ON public.chapters;
DROP POLICY "Admins can update chapters" ON public.chapters;
DROP POLICY "Admins can delete chapters" ON public.chapters;

CREATE POLICY "Anyone can read chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Admins can insert chapters" ON public.chapters FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update chapters" ON public.chapters FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete chapters" ON public.chapters FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix courses RLS: drop restrictive, recreate as permissive
DROP POLICY "Anyone can read courses" ON public.courses;
DROP POLICY "Admins can insert courses" ON public.courses;
DROP POLICY "Admins can update courses" ON public.courses;
DROP POLICY "Admins can delete courses" ON public.courses;

CREATE POLICY "Anyone can read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
