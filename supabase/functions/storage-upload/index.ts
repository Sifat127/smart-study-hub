// storage-upload: authenticated multipart upload -> Cloudflare R2 -> public.files row.
// Body: multipart/form-data with field `file` (required) and optional metadata fields:
//   title, subject, department, semester, course_code, course_id, year,
//   tags (comma-separated), visibility (public|authenticated|private),
//   require_admin ("true" to reject non-admins).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { readR2Config, r2Upload, r2Delete, r2PublicUrl } from "../_shared/r2.ts";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const MetaSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  subject: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  semester: z.string().max(20).optional(),
  course_code: z.string().max(50).optional(),
  course_id: z.string().uuid().optional(),
  year: z.string().max(10).optional(),
  tags: z.string().max(500).optional(),
  visibility: z.enum(["public", "authenticated", "private"]).optional(),
  require_admin: z.string().optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeFilename(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 200);
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
    const user = userData.user;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "No file provided" }, 400);
    if (file.size === 0) return json({ error: "File is empty" }, 400);
    if (file.size > MAX_SIZE)
      return json({ error: `File exceeds ${MAX_SIZE / 1024 / 1024}MB limit` }, 413);

    const metaRaw: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (k !== "file" && typeof v === "string") metaRaw[k] = v;
    }
    const parsed = MetaSchema.safeParse(metaRaw);
    if (!parsed.success)
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const meta = parsed.data;

    if (meta.require_admin === "true" && !isAdmin)
      return json({ error: "Admin only" }, 403);

    const cfg = readR2Config();

    // Read + hash for deduplication.
    const buf = new Uint8Array(await file.arrayBuffer());
    const sha = await sha256Hex(buf);

    // Dedupe: if a file with this hash exists, return it instead of re-uploading.
    const { data: existing } = await admin
      .from("files")
      .select("*")
      .eq("sha256", sha)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return json({ file: existing, deduplicated: true }, 200);
    }

    const ext = (file.name.match(/\.[A-Za-z0-9]{1,8}$/)?.[0] ?? "").toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const now = new Date();
    const datePrefix = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const folder = meta.department && meta.semester
      ? `${meta.department}/${meta.semester}`
      : "misc";
    const objectKey = `${datePrefix}/${folder}/${uniqueName}`;
    const contentType = file.type || "application/octet-stream";

    await r2Upload(cfg, objectKey, buf, contentType);

    const visibility = meta.visibility ?? "authenticated";
    const publicUrl = visibility === "public" ? r2PublicUrl(cfg, objectKey) : null;
    const tagsArr = meta.tags
      ? meta.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const row = {
      title: meta.title ?? file.name,
      original_filename: file.name,
      unique_filename: uniqueName,
      object_key: objectKey,
      storage_provider: "r2",
      bucket_name: cfg.bucket,
      file_size: file.size,
      file_type: contentType,
      sha256: sha,
      uploader_id: user.id,
      subject: meta.subject ?? null,
      department: meta.department ?? null,
      semester: meta.semester ?? null,
      course_code: meta.course_code ?? null,
      course_id: meta.course_id ?? null,
      year: meta.year ?? null,
      tags: tagsArr,
      visibility,
      public_url: publicUrl,
    };

    const { data: inserted, error: insertErr } = await admin
      .from("files")
      .insert(row)
      .select("*")
      .single();

    if (insertErr) {
      // Roll back the object so we don't leak storage on DB failure.
      try {
        await r2Delete(cfg, objectKey);
      } catch (_) { /* swallow; janitor would handle it via failures table */ }
      return json({ error: `DB insert failed: ${insertErr.message}` }, 500);
    }

    return json({ file: inserted }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
