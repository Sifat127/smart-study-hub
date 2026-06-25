Deno.test("env probe", () => {
  const keys = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL"];
  for (const k of keys) console.log(k, "=", Deno.env.get(k) ? "SET" : "missing");
});
