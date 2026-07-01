import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const signInMock = vi.fn();
const navigateMock = vi.fn();
const toastMock = vi.fn();
const getUserMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signIn: signInMock, isAdmin: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import Login from "./Login";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

const fillAndSubmit = async (email: string, password = "Str0ngPass!23") => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole("button", { name: /^log in$/i }));
};

describe("Login page", () => {
  beforeEach(() => {
    signInMock.mockReset();
    navigateMock.mockReset();
    toastMock.mockReset();
    getUserMock.mockReset();
    fromMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    fromMock.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: [] }) }),
    });
  });

  it("does not render a Google sign-in button", () => {
    renderLogin();
    expect(screen.queryByRole("button", { name: /google/i })).toBeNull();
    expect(screen.queryByText(/continue with google/i)).toBeNull();
  });

  it("requires both email and password", async () => {
    renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/fill in all fields/i),
          variant: "destructive",
        }),
      ),
    );
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("signs in with normalized email and navigates home on success", async () => {
    signInMock.mockResolvedValueOnce({ error: null });
    renderLogin();
    await fillAndSubmit("Student@DIU.EDU.BD");

    await waitFor(() =>
      expect(signInMock).toHaveBeenCalledWith(
        "student@diu.edu.bd",
        "Str0ngPass!23",
      ),
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/welcome back/i) }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
  });

  it("routes admin users to /admin after login", async () => {
    signInMock.mockResolvedValueOnce({ error: null });
    fromMock.mockReturnValueOnce({
      select: () => ({
        eq: () => Promise.resolve({ data: [{ role: "admin" }] }),
      }),
    });
    renderLogin();
    await fillAndSubmit("admin@diu.edu.bd");

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/admin"));
  });

  it("redirects to /verify-email when email is not confirmed", async () => {
    signInMock.mockResolvedValueOnce({ error: "Email not confirmed" });
    renderLogin();
    await fillAndSubmit("student@diu.edu.bd");

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        "/verify-email?email=student%40diu.edu.bd",
      ),
    );
  });

  it("shows a destructive toast on login failure", async () => {
    signInMock.mockResolvedValueOnce({ error: "Invalid login credentials" });
    renderLogin();
    await fillAndSubmit("student@diu.edu.bd", "wrongpass");

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/login failed/i),
          description: "Invalid login credentials",
          variant: "destructive",
        }),
      ),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
