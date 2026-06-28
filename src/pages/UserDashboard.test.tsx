import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    profile: { full_name: "Test User", avatar_url: null },
    loading: false,
  }),
}));

// Chainable supabase query builder mock that resolves to empty data.
function makeQuery() {
  const result = Promise.resolve({ data: [], error: null });
  const q: any = {
    select: () => q,
    eq: () => q,
    in: () => q,
    or: () => q,
    order: () => q,
    limit: () => q,
    then: (onFulfilled: any, onRejected: any) => result.then(onFulfilled, onRejected),
  };
  return q;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeQuery(),
  },
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: () => (props: any) => {
        const { children, ...rest } = props ?? {};
        // strip framer-only props that React would warn about
        const safe: any = {};
        for (const k of Object.keys(rest)) {
          if (!/^(initial|animate|exit|transition|variants|whileHover|whileTap|whileInView|viewport|layout)/.test(k)) {
            safe[k] = rest[k];
          }
        }
        return <div {...safe}>{children}</div>;
      },
    },
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import UserDashboard from "./UserDashboard";

describe("UserDashboard smoke", () => {
  it("renders without throwing and mounts FilterChaptersSection", async () => {
    render(
      <MemoryRouter>
        <UserDashboard />
      </MemoryRouter>,
    );

    // FilterChaptersSection renders a "Filter Chapters" heading/label.
    await waitFor(() => {
      expect(screen.getByText(/filter chapters/i)).toBeInTheDocument();
    });
  });
});
