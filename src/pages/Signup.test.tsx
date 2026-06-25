import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const signUpMock = vi.fn();
const navigateMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signUp: signUpMock }),
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

import Signup from "./Signup";

const renderSignup = () =>
  render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>,
  );

const fillForm = async (email: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/full name/i), "Test User");
  const emailInput = screen.getByLabelText(/email/i);
  await user.type(emailInput, email);
  await user.type(screen.getByLabelText(/password/i), "Str0ngPass!23");
  await user.click(screen.getByRole("button", { name: /create account/i }));
};

describe("Signup page — DIU email gate", () => {
  beforeEach(() => {
    signUpMock.mockReset();
    navigateMock.mockReset();
    toastMock.mockReset();
  });

  it("rejects a non-@diu.edu.bd email without calling signUp", async () => {
    renderSignup();
    await fillForm("student@gmail.com");

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(signUpMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/diu email required/i),
        variant: "destructive",
      }),
    );
  });

  it("rejects look-alike domains like diu.edu.bd.evil.com", async () => {
    renderSignup();
    await fillForm("student@diu.edu.bd.evil.com");

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("accepts @diu.edu.bd, calls signUp, and navigates to /login on success", async () => {
    signUpMock.mockResolvedValueOnce({ error: null });
    renderSignup();
    await fillForm("student@diu.edu.bd");

    await waitFor(() =>
      expect(signUpMock).toHaveBeenCalledWith(
        "student@diu.edu.bd",
        "Str0ngPass!23",
        "Test User",
      ),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login"));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/account created/i) }),
    );
  });

  it("normalizes uppercase DIU emails to lowercase before signUp", async () => {
    signUpMock.mockResolvedValueOnce({ error: null });
    renderSignup();
    await fillForm("Student@DIU.EDU.BD");

    await waitFor(() =>
      expect(signUpMock).toHaveBeenCalledWith(
        "student@diu.edu.bd",
        "Str0ngPass!23",
        "Test User",
      ),
    );
  });

  it("surfaces a destructive toast when signUp returns an error", async () => {
    signUpMock.mockResolvedValueOnce({ error: "User already registered" });
    renderSignup();
    await fillForm("student@diu.edu.bd");

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/sign up failed/i),
          description: "User already registered",
          variant: "destructive",
        }),
      ),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
