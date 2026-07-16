import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PATH_RE = /^[0-9a-fA-F-]{36}\/[A-Za-z0-9._-]{1,200}$/;

// 1x1 transparent PNG
const BLANK_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  ),
  (c) => c.charCodeAt(0),
);

function blank() {
  return new Response(BLANK_PNG, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "";
  if (!path || path.includes("..") || !PATH_RE.test(path)) return blank();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase.storage.from("avatars").download(path);
  if (error || !data) return blank();

  const buf = await data.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
});
