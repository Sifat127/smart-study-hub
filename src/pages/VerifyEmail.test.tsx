import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const verifyOtpMock = vi.fn();
const resendMock = vi.fn();
const signOutMock = vi.fn();
const getUserMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const navigateMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
      resend: (...args: unknown[]) => resendMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
      getUser: (...args: unknown[]) => getUserMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
    },
  },
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

import VerifyEmail from "./VerifyEmail";

const renderPage = (email = "student@diu.edu.bd") =>
  render(
    <MemoryRouter initialEntries={[`/verify-email?email=${encodeURIComponent(email)}`]}>
      <VerifyEmail />
    </MemoryRouter>,
  );

describe("VerifyEmail page", () => {
  beforeEach(() => {
    verifyOtpMock.mockReset();
    resendMock.mockReset();
    signOutMock.mockReset().mockResolvedValue(undefined);
    getUserMock.mockReset().mockResolvedValue({ data: { user: null } });
    onAuthStateChangeMock
      .mockReset()
      .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    navigateMock.mockReset();
    toastMock.mockReset();
  });

  it("verifies a valid 6-digit code, signs out, and navigates to /login", async () => {
    verifyOtpMock.mockResolvedValueOnce({ error: null });
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/6-digit verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify account/i }));

    await waitFor(() =>
      expect(verifyOtpMock).toHaveBeenCalledWith({
        email: "student@diu.edu.bd",
        token: "123456",
        type: "email",
      }),
    );
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login"));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/email verified/i) }),
    );
  });

  it("shows a destructive toast and stays on the page when the code is wrong", async () => {
    verifyOtpMock.mockResolvedValueOnce({ error: { message: "Token has expired or is invalid" } });
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/6-digit verification code/i), "000000");
    await user.click(screen.getByRole("button", { name: /verify account/i }));

    await waitFor(() => expect(verifyOtpMock).toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/verification failed/i),
        variant: "destructive",
      }),
    );
  });

  it("disables the resend button during the cooldown countdown", async () => {
    renderPage();
    const resendBtn = await screen.findByRole("button", { name: /resend in \d+s/i });
    expect(resendBtn).toBeDisabled();
    expect(resendMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when the user is already verified on mount", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { email: "student@diu.edu.bd", email_confirmed_at: "2026-01-01T00:00:00Z" } },
    });
    renderPage();

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login"));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/email verified/i),
        description: expect.stringMatching(/already verified/i),
      }),
    );
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("does not redirect when the user has no confirmed email yet", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { email: "student@diu.edu.bd", email_confirmed_at: null } },
    });
    renderPage();

    // Wait a tick for the getUser promise to resolve, then assert no navigation.
    await waitFor(() => expect(getUserMock).toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("redirects when a SIGNED_IN event arrives with a confirmed email (link clicked elsewhere)", async () => {
    let authCallback:
      | ((event: string, session: unknown) => void)
      | undefined;
    onAuthStateChangeMock.mockImplementationOnce((cb: typeof authCallback) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    renderPage();

    await waitFor(() => expect(authCallback).toBeDefined());
    authCallback!("SIGNED_IN", {
      user: { email: "student@diu.edu.bd", email_confirmed_at: "2026-01-01T00:00:00Z" },
    });

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login"));
  });

  it("resends a fresh code and shows a success toast", async () => {
    resendMock.mockResolvedValueOnce({ error: null });
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await vi.advanceTimersByTimeAsync(31_000);
    vi.useRealTimers();

    const btn = await screen.findByRole("button", { name: /resend code/i });
    await user.click(btn);

    await waitFor(() =>
      expect(resendMock).toHaveBeenCalledWith({ type: "signup", email: "student@diu.edu.bd" }),
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/code resent/i) }),
    );
  });

  it("shows a destructive toast when resend fails", async () => {
    resendMock.mockResolvedValueOnce({ error: { message: "rate limit exceeded" } });
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await vi.advanceTimersByTimeAsync(31_000);
    vi.useRealTimers();

    const btn = await screen.findByRole("button", { name: /resend code/i });
    await user.click(btn);

    await waitFor(() => expect(resendMock).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/couldn't resend/i),
        variant: "destructive",
      }),
    );
  });
});
