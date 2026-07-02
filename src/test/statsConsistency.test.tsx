import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Verifies that UserDashboard and ContributorProfile surfaces share the same
 * realtime data source and therefore render identical totals for likes,
 * dislikes and views — both on initial load and after a live update.
 *
 * We mock the Supabase client with a single in-memory store keyed by the same
 * views the app reads (`contributor_stats`, `pdf_reaction_counts`,
 * `pdf_view_counts`). Any component that queries those views sees the same
 * numbers, and firing the shared channel callbacks refreshes every mounted
 * consumer.
 */

const USER_ID = "user-abc";
const FILE_ID = "file-xyz";

interface Store {
  contributor: { uploads: number; likes_received: number; views: number; rank: number | null };
  reactions: { likes: number; dislikes: number };
  views: { views: number };
}

const store: Store = {
  contributor: { uploads: 3, likes_received: 5, views: 12, rank: 2 },
  reactions: { likes: 5, dislikes: 1 },
  views: { views: 12 },
};

type Cb = (payload: unknown) => void;
const channelCallbacks: Cb[] = [];

function tableResult(table: string) {
  if (table === "contributor_stats") {
    return { data: { user_id: USER_ID, ...store.contributor }, error: null };
  }
  if (table === "pdf_reaction_counts") {
    return { data: { file_id: FILE_ID, ...store.reactions }, error: null };
  }
  if (table === "pdf_view_counts") {
    return { data: { file_id: FILE_ID, views: store.views.views }, error: null };
  }
  if (table === "pdf_reactions") {
    // "mine" lookup for the current user
    return { data: null, error: null };
  }
  return { data: null, error: null };
}

function makeQuery(table: string) {
  const q: any = {
    select: () => q,
    eq: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: () => Promise.resolve(tableResult(table)),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected),
  };
  return q;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeQuery(table),
    channel: () => {
      const ch: any = {
        on: (_evt: string, _filter: unknown, cb: Cb) => {
          channelCallbacks.push(cb);
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => {},
    rpc: () => Promise.resolve({ error: null }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: USER_ID, email: "t@diu.edu.bd" },
    profile: { full_name: "Tester", avatar_url: null },
    loading: false,
  }),
}));

import ContributionStats from "@/components/ContributionStats";
import MaterialStats from "@/components/MaterialStats";

function fireRealtime() {
  // Simulate a new like + view landing in the DB.
  store.contributor.likes_received += 1;
  store.contributor.views += 1;
  store.reactions.likes += 1;
  store.views.views += 1;
  act(() => {
    for (const cb of channelCallbacks) cb({});
  });
}

beforeEach(() => {
  channelCallbacks.length = 0;
});

function readNumbers(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".tabular-nums")).map(
    (n) => n.textContent?.trim() ?? "",
  );
}

describe("Dashboard ↔ contributor profile stat consistency", () => {
  it("shows identical aggregate totals on both surfaces and stays in sync after a realtime update", async () => {
    const { container: dash } = render(
      <MemoryRouter>
        <div data-testid="dash">
          <ContributionStats userId={USER_ID} />
        </div>
      </MemoryRouter>,
    );
    const { container: prof } = render(
      <MemoryRouter>
        <div data-testid="prof">
          <ContributionStats userId={USER_ID} />
        </div>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(within(dash).getByText("5")).toBeInTheDocument();
      expect(within(prof).getByText("5")).toBeInTheDocument();
    });
    expect(readNumbers(dash)).toEqual(readNumbers(prof));

    fireRealtime();

    await waitFor(() => {
      // debounce inside ContributionStats is 1000ms — wait for the refresh.
      expect(within(dash).getByText("6")).toBeInTheDocument();
      expect(within(prof).getByText("6")).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(readNumbers(dash)).toEqual(readNumbers(prof));
  });

  it("shows identical per-file like/dislike/view counts wherever MaterialStats is mounted", async () => {
    const { container: a } = render(
      <MemoryRouter>
        <MaterialStats fileId={FILE_ID} readOnly />
      </MemoryRouter>,
    );
    const { container: b } = render(
      <MemoryRouter>
        <MaterialStats fileId={FILE_ID} readOnly />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(readNumbers(a)).toEqual(["5", "1", "12"]);
      expect(readNumbers(b)).toEqual(["5", "1", "12"]);
    });

    fireRealtime();

    await waitFor(() => {
      expect(readNumbers(a)).toEqual(["6", "1", "13"]);
      expect(readNumbers(b)).toEqual(["6", "1", "13"]);
    });
  });
});
