/**
 * Integration tests for `public.profiles` row-level security.
 *
 * Confirms that an authenticated user can write only their OWN profile row
 * and that the anon role cannot write profile data at all.
 *
 * Each test provisions two real auth users with `rls_test_*@diu.edu.bd`
 * addresses. Email confirmation is on for this project, so we call a
 * restricted helper (`public._test_confirm_rls_user`) that only accepts the
 * `rls_test_` email pattern to mark the test emails as confirmed before
 * signing in. Both clients then hit the actual Data API, so the assertions
 * exercise the real RLS pipeline end-to-end.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const hasEnv = Boolean(url && key);
const d = hasEnv ? describe : describe.skip;

const rand = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const testEmail = () => `rls_test_${rand()}@diu.edu.bd`;
const testRoll = () =>
  `RLS-${Date.now().toString(36).slice(-6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
const password = () => `P${rand()}Aa1!`;

const makeClient = (): SupabaseClient =>
  createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

type TestUser = {
  client: SupabaseClient;
  userId: string;
  email: string;
};

async function provisionUser(label: string): Promise<TestUser> {
  const client = makeClient();
  const email = testEmail();
  const pw = password();
  const { data: signUpData, error: signUpErr } = await client.auth.signUp({
    email,
    password: pw,
    options: { data: { full_name: `RLS ${label}`, roll_number: testRoll() } },
  });
  if (signUpErr) throw new Error(`signUp ${label}: ${signUpErr.message}`);
  if (!signUpData.user) throw new Error(`signUp ${label}: no user returned`);

  // Bypass the email-confirmation gate for this test account only.
  const { error: confirmErr } = await client.rpc(
    "_test_confirm_rls_user" as never,
    { _email: email } as never,
  );
  if (confirmErr) {
    throw new Error(`confirm ${label}: ${confirmErr.message}`);
  }

  const { error: signInErr } = await client.auth.signInWithPassword({
    email,
    password: pw,
  });
  if (signInErr) throw new Error(`signIn ${label}: ${signInErr.message}`);

  return { client, userId: signUpData.user.id, email };
}

async function deleteUser(email: string) {
  const anon = makeClient();
  await anon.rpc("_test_delete_rls_user" as never, {
    _email: email,
  } as never);
}

d("profiles RLS — authenticated users can only write their own row", () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([
      provisionUser("Alice"),
      provisionUser("Bob"),
    ]);
  }, 60_000);

  afterAll(async () => {
    await Promise.allSettled([
      alice && deleteUser(alice.email),
      bob && deleteUser(bob.email),
    ]);
  });

  it("lets a user UPDATE their own profile", async () => {
    const newBio = `own-update-${rand()}`;
    const { data, error } = await alice.client
      .from("profiles")
      .update({ bio: newBio })
      .eq("user_id", alice.userId)
      .select("user_id, bio");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.user_id).toBe(alice.userId);
    expect(data?.[0]?.bio).toBe(newBio);
  }, 20_000);

  it("affects zero rows when a user UPDATEs another user's profile", async () => {
    const attemptedBio = `cross-write-${rand()}`;
    const { data, error } = await alice.client
      .from("profiles")
      .update({ bio: attemptedBio })
      .eq("user_id", bob.userId)
      .select("user_id, bio");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    // Confirm Bob's row was NOT modified, read back as Bob.
    const { data: bobRow, error: bobErr } = await bob.client
      .from("profiles")
      .select("user_id, bio")
      .eq("user_id", bob.userId)
      .single();
    expect(bobErr).toBeNull();
    expect(bobRow?.bio ?? "").not.toBe(attemptedBio);
  }, 20_000);

  it("blocks INSERT of a profile row for another user_id (WITH CHECK)", async () => {
    const { data, error } = await alice.client
      .from("profiles")
      .insert({
        user_id: bob.userId,
        full_name: "Hijack Attempt",
        roll_number: testRoll(),
      })
      .select();

    expect(error).not.toBeNull();
    expect((error?.message || "").toLowerCase()).toMatch(
      /row-level security|violates|permission/,
    );
    expect(data).toBeFalsy();
  }, 20_000);

  it("affects zero rows when a user DELETEs another user's profile", async () => {
    const { data, error } = await alice.client
      .from("profiles")
      .delete()
      .eq("user_id", bob.userId)
      .select("user_id");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: stillThere, error: readErr } = await bob.client
      .from("profiles")
      .select("user_id")
      .eq("user_id", bob.userId)
      .maybeSingle();
    expect(readErr).toBeNull();
    expect(stillThere?.user_id).toBe(bob.userId);
  }, 20_000);

  it("does not return another user's profile via SELECT", async () => {
    const { data, error } = await alice.client
      .from("profiles")
      .select("user_id")
      .eq("user_id", bob.userId);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  }, 20_000);

  it("blocks an UNAUTHENTICATED client from updating any profile", async () => {
    const anon = makeClient();
    const { data, error } = await anon
      .from("profiles")
      .update({ bio: `anon-${rand()}` })
      .eq("user_id", alice.userId)
      .select();

    if (error) {
      expect((error.message || "").toLowerCase()).toMatch(
        /permission|row-level security|denied/,
      );
    } else {
      expect(data ?? []).toHaveLength(0);
    }
  }, 20_000);
});
