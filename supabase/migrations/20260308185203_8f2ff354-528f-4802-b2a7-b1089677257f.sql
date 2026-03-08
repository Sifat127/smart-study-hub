-- Create the pdfs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs');

-- Allow anyone to read/download PDFs
CREATE POLICY "Anyone can read PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pdfs');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() = owner);
