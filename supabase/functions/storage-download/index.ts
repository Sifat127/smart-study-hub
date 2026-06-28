// storage-download: authenticated signed-URL generator for files stored in R2.
// GET /storage-download?file_id=<uuid>[&disposition=attachment]
// Returns 302 redirect to a short-lived signed URL.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { readR2Config, r2SignedGetUrl } from "../_shared/r2.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("file_id");
    const disposition = url.searchParams.get("disposition"); // "attachment" forces download
    if (!fileId) return json({ error: "Missing file_id" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: file, error: fErr } = await admin
      .from("files")
      .select("*")
      .eq("id", fileId)
      .maybeSingle();
    if (fErr || !file) return json({ error: "File not found" }, 404);

    // Auth gate based on visibility.
    if (file.visibility !== "public") {
      if (!authHeader) return json({ error: "Authentication required" }, 401);
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
      if (file.visibility === "private") {
        const { data: isAdmin } = await admin.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        if (file.uploader_id !== userData.user.id && !isAdmin) {
          return json({ error: "Forbidden" }, 403);
        }
      }
    }

    const cfg = readR2Config();
    const signed = await r2SignedGetUrl(
      cfg,
      file.object_key,
      300,
      disposition === "attachment" ? file.original_filename : undefined,
    );

    // Increment download count (best effort).
    void admin
      .from("files")
      .update({ download_count: (file.download_count ?? 0) + 1 })
      .eq("id", file.id);

    // When called from JS (fetch), browsers can't follow cross-origin redirects to R2
    // while preserving our Authorization header AND surfacing the final URL. Return the
    // signed URL as JSON when the client asks for it; otherwise 302 for direct navigation.
    if (url.searchParams.get("json") === "1") {
      return json({ url: signed, filename: file.original_filename });
    }
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: signed, "Cache-Control": "no-store" },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
