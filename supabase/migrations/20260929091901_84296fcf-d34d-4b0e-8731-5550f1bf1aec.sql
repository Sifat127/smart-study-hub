DROP POLICY IF EXISTS "Authenticated can read comments" ON public.chapter_comments;
CREATE POLICY "Signed-in users can read comments on existing chapters"
ON public.chapter_comments FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.chapters c WHERE c.id = chapter_comments.chapter_id));

DROP POLICY IF EXISTS "Authenticated users can read student uploads" ON public.student_uploads;
CREATE POLICY "Signed-in users can read uploads for existing courses"
ON public.student_uploads FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = student_uploads.course_id));