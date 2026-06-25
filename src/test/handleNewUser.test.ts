/**
 * Integration tests for the `handle_new_user` database trigger.
 *
 * Verifies that sign-ups are restricted to @diu.edu.bd email addresses
 * and that the roll number is required, validated, and unique.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const hasEnv = Boolean(url && key);
const d = hasEnv ? describe : describe.skip;

const makeClient = () =>
  createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const randomLocal = () =>
  `test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const randomRoll = () =>
  `TST-${Date.now().toString(36).slice(-6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

d("handle_new_user trigger — DIU email gate", () => {
  it("rejects sign-ups from non-@diu.edu.bd domains", async () => {
    const supabase = makeClient();
    const email = `${randomLocal()}@gmail.com`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Str0ngPass!23",
      options: { data: { full_name: "Test User", roll_number: randomRoll() } },
    });

    expect(error).not.toBeNull();
    expect(data?.user).toBeFalsy();
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
      options: { data: { full_name: "Test User", roll_number: randomRoll() } },
    });

    expect(error).not.toBeNull();
    expect(data?.user).toBeFalsy();
  }, 20_000);

  it("rejects DIU sign-ups missing a roll number", async () => {
    const supabase = makeClient();
    const email = `${randomLocal()}@diu.edu.bd`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Str0ngPass!23",
      options: { data: { full_name: "Test User" } },
    });

    expect(error).not.toBeNull();
    expect(data?.user).toBeFalsy();
  }, 20_000);

  it("rejects DIU sign-ups with an invalid roll number format", async () => {
    const supabase = makeClient();
    const email = `${randomLocal()}@diu.edu.bd`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Str0ngPass!23",
      options: { data: { full_name: "Test User", roll_number: "ab" } },
    });

    expect(error).not.toBeNull();
    expect(data?.user).toBeFalsy();
  }, 20_000);

  it("allows sign-ups from @diu.edu.bd with a valid roll number", async () => {
    const supabase = makeClient();
    const email = `${randomLocal()}@diu.edu.bd`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Str0ngPass!23",
      options: { data: { full_name: "Test User", roll_number: randomRoll() } },
    });

    expect(error).toBeNull();
    expect(data?.user).toBeTruthy();
    expect(data?.user?.email?.toLowerCase()).toBe(email.toLowerCase());
  }, 20_000);

  it("rejects a duplicate roll number on a second sign-up", async () => {
    const supabase = makeClient();
    const sharedRoll = randomRoll();

    const first = await supabase.auth.signUp({
      email: `${randomLocal()}@diu.edu.bd`,
      password: "Str0ngPass!23",
      options: { data: { full_name: "First", roll_number: sharedRoll } },
    });
    expect(first.error).toBeNull();

    const second = await supabase.auth.signUp({
      email: `${randomLocal()}@diu.edu.bd`,
      password: "Str0ngPass!23",
      options: { data: { full_name: "Second", roll_number: sharedRoll } },
    });
    expect(second.error).not.toBeNull();
    expect(second.data?.user).toBeFalsy();
  }, 30_000);
});
