# Architecture Diagram

Create a single Mermaid diagram (`/mnt/documents/Architecture_Diagram.mmd`) that visualizes how the DIU StudyBank stack fits together, then embed it as a `lov-artifact` so it renders inline in chat.

## What the diagram will show

Four grouped layers with directional arrows for real runtime flows:

1. **Client (Browser)** — React 18 + Vite SPA, React Router, TanStack Query, shadcn/ui, `@supabase/supabase-js` client
2. **Lovable Cloud — Supabase** — Auth, PostgREST + RLS, Postgres (`courses`, `chapters`, `student_uploads`, `profiles`, `user_roles`), Storage buckets (`pdfs`, `avatars`), `has_role()`
3. **Edge Functions (Deno)** — `upload-to-catbox` (admin-only), `download-file` (public CORS proxy), `send-contact-email`, reads `CATBOX_USERHASH`
4. **External** — Catbox upload API + `files.catbox.moe` CDN

## Arrows / flows to include

- Browser → Auth (sign in / session)
- Browser → PostgREST (anon reads catalog; authenticated reads `student_uploads`)
- Admin Browser → `upload-to-catbox` → Catbox API → URL stored on `chapters.pdf_url`
- Signed-in Browser → `download-file` proxy → `files.catbox.moe` → bytes streamed back
- Browser → `send-contact-email`

## Technical details

- File: `/mnt/documents/Architecture_Diagram.mmd`
- `graph LR` with `subgraph` per layer
- No emojis, no custom colors (theme handles light/dark)
- Embed in reply via:
  `<lov-artifact url="/__l5e/documents/Architecture_Diagram.mmd" mime_type="text/vnd.mermaid"></lov-artifact>`
- No app code changes

## Deliverable

One chat reply with a short intro, the embedded diagram artifact, and a brief legend covering the four layers and the admin-upload / signed-in-download flows.
