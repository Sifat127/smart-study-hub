import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
Deno.test("db url role probe", async () => {
  const c = new Client(Deno.env.get("SUPABASE_DB_URL"));
  await c.connect();
  const r = await c.queryObject<{ u: string; s: string }>`SELECT current_user::text as u, session_user::text as s`;
  console.log("role:", r.rows[0]);
  await c.end();
});
