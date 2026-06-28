// storage-delete: authenticated delete of a file (R2 object + DB row).
// POST { file_id: string }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { readR2Config, r2Delete } from "../_shared/r2.ts";

const Body = z.object({ file_id: z.string().uuid() });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    const { data: file, error: fErr } = await admin
      .from("files")
      .select("*")
      .eq("id", parsed.data.file_id)
      .maybeSingle();
    if (fErr || !file) return json({ error: "File not found" }, 404);

    if (file.uploader_id !== userData.user.id && !isAdmin)
      return json({ error: "Forbidden" }, 403);

    // Delete DB row first (transactional intent: never leave a dangling DB row).
    const { error: delErr } = await admin.from("files").delete().eq("id", file.id);
    if (delErr) return json({ error: `DB delete failed: ${delErr.message}` }, 500);

    // Then delete the object. If this fails, queue for retry.
    try {
      const cfg = readR2Config();
      await r2Delete(cfg, file.object_key);
    } catch (err) {
      await admin.from("file_deletion_failures").insert({
        object_key: file.object_key,
        bucket_name: file.bucket_name,
        storage_provider: file.storage_provider,
        reason: (err as Error).message,
      });
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
