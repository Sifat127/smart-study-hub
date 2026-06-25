import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const verifyOtpMock = vi.fn();
const resendMock = vi.fn();
const signOutMock = vi.fn();
const navigateMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
      resend: (...args: unknown[]) => resendMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
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
});
