// storage-download: authenticated signed-URL/proxy endpoint for files stored in R2.
// GET /storage-download?file_id=<uuid>[&disposition=attachment][&preview=1]
// Returns 302 redirect to a short-lived signed URL.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { readR2Config, r2GetObject, r2SignedGetUrl } from "../_shared/r2.ts";

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
    const preview = url.searchParams.get("preview") === "1";
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

    // Same-origin blob previews are more reliable than embedding a cross-origin R2 URL.
    // The client fetches this with auth, converts it to a blob URL, then renders the PDF iframe.
    if (preview) {
      const objectRes = await r2GetObject(cfg, file.object_key);
      const originalName = String(file.original_filename ?? "file.pdf").replace(/[\r\n"]/g, "_");
      const contentType = String(file.file_type ?? "");
      const isPdf = /\.pdf$/i.test(originalName) || contentType.toLowerCase().includes("pdf");

      return new Response(objectRes.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": isPdf ? "application/pdf" : contentType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${originalName}"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const originalName = String(file.original_filename ?? "file");
    const fileType = String(file.file_type ?? "");
    const isPdf = /\.pdf$/i.test(originalName) || fileType.toLowerCase().includes("pdf");
    const responseContentType = isPdf
      ? "application/pdf"
      : fileType || "application/octet-stream";

    const signed = await r2SignedGetUrl(cfg, file.object_key, {
      expiresInSeconds: 300,
      contentType: responseContentType,
      ...(disposition === "attachment"
        ? { downloadFileName: originalName }
        : { inlineFileName: originalName }),
    });

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
