DROP POLICY IF EXISTS "Anyone can read student uploads" ON public.student_uploads;

CREATE POLICY "Authenticated users can read student uploads"
ON public.student_uploads
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.student_uploads FROM anon;