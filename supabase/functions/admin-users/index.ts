// admin-users: server-side admin user listing + role updates.
// GET returns admin_list_users(). PATCH { user_id, role } changes another user's role.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const RoleUpdate = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "user"]),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "PATCH") {
    return json({ error: "Method not allowed" }, 405);
  }

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

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    if (req.method === "GET") {
      const { data, error } = await admin.rpc("admin_list_users");
      if (error) return json({ error: error.message }, 500);
      return json({ users: data ?? [] });
    }

    const parsed = RoleUpdate.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const { user_id, role } = parsed.data;
    if (user_id === userData.user.id) {
      return json({ error: "Admins cannot change their own role." }, 400);
    }

    const { error: deleteErr } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id)
      .neq("role", role);
    if (deleteErr) return json({ error: deleteErr.message }, 500);

    const { error: upsertErr } = await admin
      .from("user_roles")
      .upsert({ user_id, role }, { onConflict: "user_id,role" });
    if (upsertErr) return json({ error: upsertErr.message }, 500);

    return json({ ok: true, role });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});