/**
 * Integration tests for the `handle_new_user` database trigger.
 *
 * Verifies that sign-ups are restricted to @diu.edu.bd email addresses.
 * Hits the real Lovable Cloud auth endpoint, so it requires
 * VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to be set.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const hasEnv = Boolean(url && key);
const d = hasEnv ? describe : describe.skip;

// Each test uses a fresh client with no persisted session.
const makeClient = () =>
  createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const randomLocal = () =>
  `test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

d("handle_new_user trigger — DIU email gate", () => {
  it("rejects sign-ups from non-@diu.edu.bd domains", async () => {
    const supabase = makeClient();
    const email = `${randomLocal()}@gmail.com`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Str0ngPass!23",
      options: { data: { full_name: "Test User" } },
    });

    expect(error).not.toBeNull();
    expect(data?.user).toBeFalsy();
    // Trigger raises with the explicit message; surface as 500/Database error.
    expect((error?.message || "").toLowerCase()).toMatch(
      /diu\.edu\.bd|database error|only/,
    );
  }, 20_000);

  it("rejects look-alike domains (e.g. diu.edu.bd.evil.com)", async () => {
    const supabase = makeClient();
    const email = `${randomLocal()}@diu.edu.bd.evil.com`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Str0ngPass!23",
      options: { data: { full_name: "Test User" } },
    });

    expect(error).not.toBeNull();
    expect(data?.user).toBeFalsy();
  }, 20_000);

  it("allows sign-ups from @diu.edu.bd", async () => {
    const supabase = makeClient();
    const email = `${randomLocal()}@diu.edu.bd`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Str0ngPass!23",
      options: { data: { full_name: "Test User" } },
    });

    expect(error).toBeNull();
    expect(data?.user).toBeTruthy();
    expect(data?.user?.email?.toLowerCase()).toBe(email.toLowerCase());
  }, 20_000);

  it("accepts uppercase variants (case-insensitive domain match)", async () => {
    const supabase = makeClient();
    const email = `${randomLocal()}@DIU.EDU.BD`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Str0ngPass!23",
      options: { data: { full_name: "Test User" } },
    });

    expect(error).toBeNull();
    expect(data?.user).toBeTruthy();
  }, 20_000);
});
