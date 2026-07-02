/**
 * Guards that a verified user with an incomplete profile is redirected to
 * /complete-profile and never lands on /dashboard prematurely, in every path
 * a user can enter the app:
 *
 *   1. Immediately after email verification (AuthCallback).
 *   2. By typing /dashboard directly (RequireCompleteProfile guard).
 *   3. Pure helper: isProfileComplete / missingProfileFields.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  isProfileComplete,
  missingProfileFields,
} from "@/lib/profileCompleteness";

// ---- Unit: pure helper -------------------------------------------------

describe("profile completeness helper", () => {
  it("treats a null profile as fully incomplete", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(missingProfileFields(null)).toEqual(["roll_number", "department", "batch"]);
  });

  it("flags empty strings and whitespace as missing", () => {
    expect(
      isProfileComplete({ roll_number: "  ", department: "CSE", batch: "60th" }),
    ).toBe(false);
    expect(
      missingProfileFields({ roll_number: "", department: null, batch: "60th" }),
    ).toEqual(["roll_number", "department"]);
  });

  it("requires roll_number + department + batch, ignores other fields", () => {
    expect(
      isProfileComplete({
        roll_number: "221-15-1234",
        department: "CSE",
        batch: "60th",
      }),
    ).toBe(true);
  });

  it("missing any single required field ⇒ incomplete", () => {
    expect(
      isProfileComplete({ roll_number: "R", department: "CSE", batch: null }),
    ).toBe(false);
    expect(
      isProfileComplete({ roll_number: null, department: "CSE", batch: "60" }),
    ).toBe(false);
    expect(
      isProfileComplete({ roll_number: "R", department: null, batch: "60" }),
    ).toBe(false);
  });
});

// ---- Integration: AuthCallback + RequireCompleteProfile ---------------

type Role = "admin" | "user";
interface ProfileRow {
  roll_number: string | null;
  department: string | null;
  batch: string | null;
}
const state: {
  role: Role;
  profile: ProfileRow | null;
  session: { access_token: string; refresh_token: string; user: { id: string; email: string } } | null;
} = { role: "user", profile: null, session: null };

const exchangeMock = vi.fn(async (code: string) => {
  state.session = {
    access_token: `at-${code}`,
    refresh_token: `rt-${code}`,
    user: { id: "user-1", email: "u@diu.edu.bd" },
  };
  return { data: { session: state.session }, error: null };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (c: string) => exchangeMock(c),
      getSession: async () => ({ data: { session: state.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (table: string) => {
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ role: state.role }], error: null }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: state.profile, error: null }),
          }),
        }),
      };
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

// A minimal auth context stub so we don't need real Supabase for the guard test.
type FakeAuth = {
  user: { id: string } | null;
  profile: ProfileRow | null;
  loading: boolean;
  isAdmin: boolean;
};
let fakeAuth: FakeAuth = {
  user: { id: "user-1" },
  profile: null,
  loading: false,
  isAdmin: false,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => fakeAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AuthCallback from "@/pages/AuthCallback";
import RequireCompleteProfile from "@/components/RequireCompleteProfile";

beforeEach(() => {
  exchangeMock.mockClear();
  state.role = "user";
  state.profile = null;
  state.session = null;
  window.history.replaceState({}, "", "/");
});

function renderCallback(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<div>Student Dashboard</div>} />
        <Route path="/complete-profile" element={<div>Complete Your Profile</div>} />
        <Route path="/admin" element={<div>Admin Console</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthCallback profile-completeness gating", () => {
  it("no profile row at all ⇒ /complete-profile (never /dashboard)", async () => {
    state.profile = null;
    renderCallback("/auth/callback?code=x1");
    await waitFor(() =>
      expect(screen.getByText("Complete Your Profile")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Student Dashboard")).not.toBeInTheDocument();
  });

  it("missing department ⇒ /complete-profile", async () => {
    state.profile = { roll_number: "221-1", department: null, batch: "60th" };
    renderCallback("/auth/callback?code=x2");
    await waitFor(() =>
      expect(screen.getByText("Complete Your Profile")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Student Dashboard")).not.toBeInTheDocument();
  });

  it("missing batch ⇒ /complete-profile", async () => {
    state.profile = { roll_number: "221-1", department: "CSE", batch: null };
    renderCallback("/auth/callback?code=x3");
    await waitFor(() =>
      expect(screen.getByText("Complete Your Profile")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Student Dashboard")).not.toBeInTheDocument();
  });

  it("blank-string department is treated as missing", async () => {
    state.profile = { roll_number: "221-1", department: "   ", batch: "60th" };
    renderCallback("/auth/callback?code=x4");
    await waitFor(() =>
      expect(screen.getByText("Complete Your Profile")).toBeInTheDocument(),
    );
  });

  it("all required fields present ⇒ /dashboard", async () => {
    state.profile = { roll_number: "221-1", department: "CSE", batch: "60th" };
    renderCallback("/auth/callback?code=x5");
    await waitFor(() =>
      expect(screen.getByText("Student Dashboard")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Complete Your Profile")).not.toBeInTheDocument();
  });
});

describe("RequireCompleteProfile guard — /dashboard cannot be reached directly", () => {
  function renderGuarded() {
    return render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <RequireCompleteProfile>
                <div>Student Dashboard</div>
              </RequireCompleteProfile>
            }
          />
          <Route path="/complete-profile" element={<div>Complete Your Profile</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("redirects when department is missing", () => {
    fakeAuth = {
      user: { id: "u" },
      profile: { roll_number: "R", department: null, batch: "60" },
      loading: false,
      isAdmin: false,
    };
    renderGuarded();
    expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
    expect(screen.queryByText("Student Dashboard")).not.toBeInTheDocument();
  });

  it("redirects when batch is missing", () => {
    fakeAuth = {
      user: { id: "u" },
      profile: { roll_number: "R", department: "CSE", batch: null },
      loading: false,
      isAdmin: false,
    };
    renderGuarded();
    expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
  });

  it("lets a fully-complete user through", () => {
    fakeAuth = {
      user: { id: "u" },
      profile: { roll_number: "R", department: "CSE", batch: "60" },
      loading: false,
      isAdmin: false,
    };
    renderGuarded();
    expect(screen.getByText("Student Dashboard")).toBeInTheDocument();
  });

  it("does NOT redirect while the profile is still loading (profile === null)", () => {
    fakeAuth = { user: { id: "u" }, profile: null, loading: false, isAdmin: false };
    renderGuarded();
    // Renders children pass-through; no premature bounce.
    expect(screen.getByText("Student Dashboard")).toBeInTheDocument();
  });

  it("admins bypass the completeness gate", () => {
    fakeAuth = {
      user: { id: "u" },
      profile: { roll_number: null, department: null, batch: null },
      loading: false,
      isAdmin: true,
    };
    renderGuarded();
    expect(screen.getByText("Student Dashboard")).toBeInTheDocument();
  });
});
