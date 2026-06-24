## Goal

New chapter PDFs and notes are uploaded to **Catbox.moe** via a secure edge function. The returned permanent URL is stored on the chapter and used as the View / Download link. Old chapters (already in Supabase storage) keep working.

## What's already done

- `CATBOX_USERHASH` secret saved.
- Migration applied: `chapters` table now has `pdf_url` and `notes_url` (nullable text). Old `pdf_path` / `notes_path` columns stay for backward compatibility.

## Still to build (needs build mode)

### 1. Edge function `upload-to-catbox`
- Accepts a multipart `file` upload.
- Validates the caller's JWT and confirms `has_role(uid, 'admin')` — only admins can upload.
- Forwards the file to `https://catbox.moe/user/api.php` with `reqtype=fileupload`, `userhash=<CATBOX_USERHASH>`, `fileToUpload=<file>`.
- Returns `{ url, name }` or a clear error.

### 2. `src/pages/AdminUploadPdf.tsx`
- Replace `supabase.storage.from('pdfs').upload(...)` with `supabase.functions.invoke('upload-to-catbox', { body: formData })` for both the chapter PDF and the optional notes file.
- Insert the chapter row with `pdf_url` and `notes_url` (no `pdf_path` / `notes_path` for new rows).
- Keep the existing UI, validation, and toasts.

### 3. `src/pages/CourseDetail.tsx`
- Extend the chapter query/interface to include `pdf_url` and `notes_url`.
- Resolver picks the external URL first, falling back to Supabase storage publicUrl for legacy rows.
- "View" opens the resolved URL in a new tab.
- "Download" tries `fetch` + Blob (so the file saves with the original name); falls back to opening the URL in a new tab if CORS blocks fetch (Catbox usually allows it).
- The existing login-required gate stays unchanged.

## Notes

- Catbox limit: 200 MB per file, any type — fine for PDFs and future docs.
- The userhash never leaves the edge function.
- Bulk-migrating old Supabase-hosted files to Catbox is intentionally out of scope.

Switch to build mode and I'll ship it.
