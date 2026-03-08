

## Problem Analysis

Two issues are causing chapters/PDFs to not work:

1. **RLS Policy Issue**: All RLS policies on the `chapters` table (and `courses`) were created as **RESTRICTIVE** (`Permissive: No`). In PostgreSQL, if there are only restrictive policies and no permissive policies, access is denied by default. The SELECT policy "Anyone can read chapters" needs to be **PERMISSIVE** to allow reads.

2. **Cross-Origin Download Issue**: The `download` attribute on `<a>` tags doesn't work for cross-origin URLs (Supabase storage is on a different domain). The browser navigates to the file instead of downloading it. Need to use `createSignedUrl` + programmatic download via `fetch` + `Blob`.

## Plan

### 1. Fix RLS policies (database migration)

Drop and recreate the chapter policies as PERMISSIVE:

```sql
-- Drop restrictive policies
DROP POLICY "Anyone can read chapters" ON public.chapters;
DROP POLICY "Admins can insert chapters" ON public.chapters;
DROP POLICY "Admins can update chapters" ON public.chapters;
DROP POLICY "Admins can delete chapters" ON public.chapters;

-- Recreate as PERMISSIVE
CREATE POLICY "Anyone can read chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Admins can insert chapters" ON public.chapters FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update chapters" ON public.chapters FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete chapters" ON public.chapters FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

Also fix the same issue on `courses` table to prevent future problems.

### 2. Fix PDF download in CourseDetail.tsx

Replace the simple `<a href download>` approach with a programmatic download function:

```typescript
const handleDownload = async (path: string, fileName: string) => {
  const { data } = await supabase.storage.from("pdfs").createSignedUrl(path, 3600);
  if (data?.signedUrl) {
    const response = await fetch(data.signedUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
};
```

Keep the "View PDF" button using `getPublicUrl` with `target="_blank"` (this works fine for viewing).

### Files to change
- **New SQL migration**: Fix RLS policies on `chapters` and `courses` tables
- **`src/pages/CourseDetail.tsx`**: Add programmatic download handler

