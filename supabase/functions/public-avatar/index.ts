import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, if-none-match",
  "Access-Control-Expose-Headers": "ETag, Cache-Control, Content-Type",
};

const PATH_RE = /^[0-9a-fA-F-]{36}\/[A-Za-z0-9._-]{1,200}$/;

// 1x1 transparent PNG
const BLANK_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  ),
  (c) => c.charCodeAt(0),
);

// Long cache for actual images; short for blanks so a real upload appears quickly.
const IMAGE_CACHE = "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400, immutable";
const BLANK_CACHE = "public, max-age=60, s-maxage=60";

function blank() {
  return new Response(BLANK_PNG, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/png",
      "Cache-Control": BLANK_CACHE,
    },
  });
}

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "";
  if (!path || path.includes("..") || !PATH_RE.test(path)) return blank();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Get object metadata for a stable ETag before downloading bytes.
  const slash = path.indexOf("/");
  const dir = path.slice(0, slash);
  const file = path.slice(slash + 1);
  const { data: list } = await supabase.storage.from("avatars").list(dir, {
    search: file,
    limit: 1,
  });
  const meta = list?.find((f) => f.name === file);
  if (!meta) return blank();

  const etagSource = `${path}:${meta.updated_at ?? meta.created_at ?? ""}:${
    (meta.metadata as { size?: number } | null)?.size ?? ""
  }`;
  const etag = `"${await sha1Hex(etagSource)}"`;

  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...corsHeaders,
        ETag: etag,
        "Cache-Control": IMAGE_CACHE,
      },
    });
  }

  if (req.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        ETag: etag,
        "Cache-Control": IMAGE_CACHE,
        "Content-Type":
          (meta.metadata as { mimetype?: string } | null)?.mimetype ?? "image/jpeg",
      },
    });
  }

  const { data, error } = await supabase.storage.from("avatars").download(path);
  if (error || !data) return blank();

  const buf = await data.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": IMAGE_CACHE,
      ETag: etag,
    },
  });
});
