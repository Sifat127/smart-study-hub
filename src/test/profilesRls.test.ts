/**
 * Integration tests for `public.profiles` row-level security.
 *
 * Confirms that an authenticated user can write only their OWN profile row
 * and that the anon role cannot write profile data at all.
 *
 * Email confirmation is enabled on this project, so we can't obtain a real
 * second session on the client side. Instead, the database helper
 * `public._test_profiles_rls_scenarios()` provisions two real auth users,
 * impersonates each by switching to the `authenticated` / `anon` role with a
 * forged jwt.claims `sub`, runs the RLS attempts, and returns a JSON report.
 * The cases here assert on that report.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const hasEnv = Boolean(url && key);
const d = hasEnv ? describe : describe.skip;

type Report = {
  alice_id: string;
  bob_id: string;
  own_update_rows: number;
  own_bio_new: string;
  cross_update_rows: number;
  cross_insert_blocked: boolean;
  cross_insert_error: string | null;
  cross_delete_rows: number;
  cross_select_rows: number;
  anon_update_blocked: boolean;
  anon_update_rows: number;
  anon_update_error: string | null;
  bob_bio_after: string | null;
  bob_still_exists: boolean;
  attempted_cross_bio: string;
  attempted_anon_bio: string;
};

d("profiles RLS — authenticated users can only write their own row", () => {
  let report: Report;

  beforeAll(async () => {
    const supabase = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc(
      "_test_profiles_rls_scenarios" as never,
    );
    if (error) throw new Error(`RPC failed: ${error.message}`);
    report = data as unknown as Report;
  }, 30_000);

  it("lets an authenticated user UPDATE their own profile (1 row)", () => {
    expect(report.own_update_rows).toBe(1);
  });

  it("blocks an authenticated user from UPDATING another user's profile (0 rows)", () => {
    expect(report.cross_update_rows).toBe(0);
    expect(report.bob_bio_after ?? "").not.toBe(report.attempted_cross_bio);
  });

  it("blocks INSERT of a profile row for another user_id (WITH CHECK violation)", () => {
    expect(report.cross_insert_blocked).toBe(true);
    expect((report.cross_insert_error ?? "").toLowerCase()).toMatch(
      /row-level security|violates|permission|denied/,
    );
  });

  it("blocks DELETE of another user's profile (0 rows, target still exists)", () => {
    expect(report.cross_delete_rows).toBe(0);
    expect(report.bob_still_exists).toBe(true);
  });

  it("does not expose another user's profile via SELECT (0 rows)", () => {
    expect(report.cross_select_rows).toBe(0);
  });

  it("blocks the anon role from updating any profile row", () => {
    expect(report.anon_update_blocked).toBe(true);
    expect(report.anon_update_rows).toBe(0);
  });
});
