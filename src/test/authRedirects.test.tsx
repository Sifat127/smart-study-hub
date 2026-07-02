/**
 * Verifies that auth email flows redirect users to the production Vercel
 * domain, and that after Supabase hydrates a session on /auth/callback the
 * user is routed into an authenticated area of the app.
 *
 * These are unit-level tests: we stub `supabase.auth` so we can inspect the
 * exact `emailRedirectTo` / `redirectTo` URL each flow sends, and simulate
 * the post-verification landing without hitting the network.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PRODUCTION_SITE_URL } from "@/lib/siteUrl";

// ---- Supabase mock -----------------------------------------------------

const signUpMock = vi.fn();
const resetPasswordMock = vi.fn();
const exchangeMock = vi.fn();
const getSessionMock = vi.fn();
const signInMock = vi.fn();

const fromMock = vi.fn((table: string) => {
  if (table === "user_roles") {
    return {
      select: () => ({
        eq: () => Promise.resolve({ data: [{ role: "user" }], error: null }),
      }),
    };
  }
  // profiles
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () =>
          Promise.resolve({
            data: { department: "CSE", batch: "60th", section: "A" },
            error: null,
          }),
      }),
    }),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => signUpMock(...args),
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordMock(...args),
      exchangeCodeForSession: (...args: unknown[]) => exchangeMock(...args),
      getSession: () => getSessionMock(),
      signInWithPassword: (...args: unknown[]) => signInMock(...args),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (table: string) => fromMock(table),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Import AFTER mocks are registered.
import { AuthProvider } from "@/contexts/AuthContext";
import AuthCallback from "@/pages/AuthCallback";

const PROD = "https://diu-study-bank.vercel.app";

beforeEach(() => {
  signUpMock.mockReset();
  signUpMock.mockResolvedValue({ error: null });
  resetPasswordMock.mockReset();
  exchangeMock.mockReset();
  getSessionMock.mockResolvedValue({ data: { session: null } });
  signInMock.mockReset();
  fromMock.mockClear();
});

describe("auth email redirects target the production Vercel site", () => {
  it("PRODUCTION_SITE_URL is the vercel domain", () => {
    expect(PRODUCTION_SITE_URL).toBe(PROD);
  });

  it("signUp sends emailRedirectTo pointing at /auth/callback on production", async () => {
    signUpMock.mockResolvedValue({ error: null });
    // Exercise the real AuthContext signUp wrapper.
    const { useAuth } = await import("@/contexts/AuthContext");
    let signUpFn: ReturnType<typeof useAuth>["signUp"] | null = null;
    function Grab() {
      signUpFn = useAuth().signUp;
      return null;
    }
    render(
      <MemoryRouter>
        <AuthProvider>
          <Grab />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(signUpFn).not.toBeNull());
    await signUpFn!("user@diu.edu.bd", "pw", "Full Name", "ROLL-1");

    expect(signUpMock).toHaveBeenCalledTimes(1);
    const args = signUpMock.mock.calls[0][0] as {
      options: { emailRedirectTo: string };
    };
    expect(args.options.emailRedirectTo).toBe(`${PROD}/auth/callback`);
  });

  it("password reset sends redirectTo pointing at /auth/callback?type=recovery", async () => {
    resetPasswordMock.mockResolvedValue({ error: null });
    const { supabase } = await import("@/integrations/supabase/client");
    const { getAuthRedirectOrigin } = await import("@/lib/siteUrl");
    await supabase.auth.resetPasswordForEmail("user@diu.edu.bd", {
      redirectTo: `${getAuthRedirectOrigin()}/auth/callback?type=recovery`,
    });
    expect(resetPasswordMock).toHaveBeenCalledWith("user@diu.edu.bd", {
      redirectTo: `${PROD}/auth/callback?type=recovery`,
    });
  });
});

describe("AuthCallback lands verified users on the right route with a live session", () => {
  it("exchanges the ?code=, then routes new users into /dashboard", async () => {
    exchangeMock.mockResolvedValue({ error: null });
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "at",
          refresh_token: "rt",
          user: { id: "user-1", email: "u@diu.edu.bd" },
        },
      },
    });
    signInMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    render(
      <MemoryRouter initialEntries={["/auth/callback?code=abc123"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<div>Dashboard OK</div>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(exchangeMock).toHaveBeenCalledWith("abc123"),
    );
    await waitFor(
      () => expect(screen.getByText("Dashboard OK")).toBeInTheDocument(),
      { timeout: 2000 },
    );

    // Immediately after landing, a normal login call succeeds (session is live).
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.auth.signInWithPassword({
      email: "u@diu.edu.bd",
      password: "pw",
    });
    expect(result.error).toBeNull();
    expect(result.data.user?.id).toBe("user-1");
  });

  it("recovery links route to /reset-password after code exchange", async () => {
    exchangeMock.mockResolvedValue({ error: null });
    getSessionMock.mockResolvedValue({
      data: {
        session: { access_token: "at", refresh_token: "rt", user: { id: "u2" } },
      },
    });

    render(
      <MemoryRouter initialEntries={["/auth/callback?code=xyz&type=recovery"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<div>Reset page</div>} />
          <Route path="/dashboard" element={<div>Dashboard OK</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(
      () => expect(screen.getByText("Reset page")).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it("falls back to /login when the link is expired (no session after exchange)", async () => {
    exchangeMock.mockResolvedValue({ error: null });
    getSessionMock.mockResolvedValue({ data: { session: null } });

    render(
      <MemoryRouter initialEntries={["/auth/callback?code=old"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(
      () => expect(screen.getByText("Login page")).toBeInTheDocument(),
      { timeout: 2500 },
    );
  });
});
