/**
 * Integration test for the post-email-verification flow.
 *
 * Simulates a user clicking the verification link that Supabase emails
 * out (which lands on `/auth/callback?code=<PKCE>`), and asserts that
 * `AuthCallback`:
 *
 *   1. exchanges the PKCE code for a session,
 *   2. surfaces that session via `supabase.auth.getSession()`,
 *   3. routes admins to `/admin`,
 *   4. routes normal users with a complete profile to `/dashboard`,
 *   5. routes normal users with an incomplete profile to `/complete-profile`,
 *   6. cleans the `?code=` out of the URL so it can't be replayed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ---- Configurable mock state -------------------------------------------

type Role = "admin" | "user";
interface ProfileRow {
  department: string | null;
  batch: string | null;
  section: string | null;
}

const state: {
  role: Role;
  profile: ProfileRow | null;
  session: { access_token: string; refresh_token: string; user: { id: string; email: string } } | null;
  exchangeError: { message: string } | null;
} = {
  role: "user",
  profile: { department: "CSE", batch: "60th", section: "A" },
  session: null,
  exchangeError: null,
};

const exchangeMock = vi.fn(async (code: string) => {
  if (state.exchangeError) return { data: null, error: state.exchangeError };
  // Emulate Supabase: successful exchange hydrates the session.
  state.session = {
    access_token: `at-${code}`,
    refresh_token: `rt-${code}`,
    user: { id: "user-42", email: "verified@diu.edu.bd" },
  };
  return { data: { session: state.session }, error: null };
});

const getSessionMock = vi.fn(async () => ({ data: { session: state.session } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (code: string) => exchangeMock(code),
      getSession: () => getSessionMock(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (table: string) => {
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ role: state.role }],
                error: null,
              }),
          }),
        };
      }
      // profiles
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: state.profile, error: null }),
          }),
        }),
      };
    },
  },
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

// Import AFTER mocks.
import AuthCallback from "@/pages/AuthCallback";

function renderCallback(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/admin" element={<div>Admin Console</div>} />
        <Route path="/dashboard" element={<div>Student Dashboard</div>} />
        <Route path="/complete-profile" element={<div>Complete Your Profile</div>} />
        <Route path="/reset-password" element={<div>Reset Password</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  exchangeMock.mockClear();
  getSessionMock.mockClear();
  toastMock.mockClear();
  state.role = "user";
  state.profile = { department: "CSE", batch: "60th", section: "A" };
  state.session = null;
  state.exchangeError = null;
  window.history.replaceState({}, "", "/");
});

describe("AuthCallback — email verification PKCE flow", () => {
  it("exchanges PKCE code, sets session, and routes admin users to /admin", async () => {
    state.role = "admin";
    renderCallback("/auth/callback?code=pkce-admin-token");

    await waitFor(() =>
      expect(exchangeMock).toHaveBeenCalledWith("pkce-admin-token"),
    );
    // Session hydrated as a side-effect of the exchange.
    await waitFor(() => expect(state.session?.user.id).toBe("user-42"));

    await waitFor(
      () => expect(screen.getByText("Admin Console")).toBeInTheDocument(),
      { timeout: 2000 },
    );

    // Never bounces to student surfaces.
    expect(screen.queryByText("Student Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Complete Your Profile")).not.toBeInTheDocument();
  });

  it("routes normal verified users with a complete profile to /dashboard", async () => {
    state.role = "user";
    state.profile = { department: "CSE", batch: "60th", section: "A" };
    renderCallback("/auth/callback?code=pkce-user-token");

    await waitFor(() =>
      expect(exchangeMock).toHaveBeenCalledWith("pkce-user-token"),
    );
    await waitFor(
      () => expect(screen.getByText("Student Dashboard")).toBeInTheDocument(),
      { timeout: 2000 },
    );
    expect(screen.queryByText("Admin Console")).not.toBeInTheDocument();
  });

  it("routes normal users with an incomplete profile to /complete-profile", async () => {
    state.role = "user";
    state.profile = { department: null, batch: null, section: null };
    renderCallback("/auth/callback?code=pkce-fresh-signup");

    await waitFor(
      () =>
        expect(screen.getByText("Complete Your Profile")).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it("strips the ?code= query from the URL after a successful exchange", async () => {
    state.role = "user";
    renderCallback("/auth/callback?code=should-be-cleaned");

    await waitFor(() =>
      expect(screen.getByText("Student Dashboard")).toBeInTheDocument(),
    );
    // AuthCallback.finish() calls history.replaceState to /auth/callback.
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe("/auth/callback");
  });

  it("recovery links route to /reset-password regardless of role", async () => {
    state.role = "admin";
    renderCallback("/auth/callback?code=recovery-code&type=recovery");

    await waitFor(
      () => expect(screen.getByText("Reset Password")).toBeInTheDocument(),
      { timeout: 2000 },
    );
    expect(screen.queryByText("Admin Console")).not.toBeInTheDocument();
  });

  it("falls back to /login when the exchange returns an error", async () => {
    state.exchangeError = { message: "Invalid or expired code" };
    renderCallback("/auth/callback?code=broken");

    await waitFor(
      () => expect(screen.getByText("Login Page")).toBeInTheDocument(),
      { timeout: 2500 },
    );
    // User is told what happened.
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });
});
