import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => { vi.restoreAllMocks(); location.hash = ""; });

describe("authentication pages", () => {
  it("opens a dedicated login page and navigates to registration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    render(<App />);
    await screen.findByRole("heading", { name: "Welcome back" });
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Email"), "lina@example.com");
    await userEvent.click(screen.getByRole("button", { name: /create an account/i }));
    await screen.findByRole("heading", { name: "Create your account" });
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("lina@example.com");
    expect(location.hash).toBe("#/register");
  });

  it("restores a cookie session into the authentication checkpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: { id: "u1", name: "Lina Hart", email: "lina@example.com" } }), { status: 200, headers: { "Content-Type": "application/json" } })));
    render(<App />);
    await screen.findByRole("heading", { name: "Welcome, Lina Hart." });
    expect(screen.getByText("lina@example.com")).toBeInTheDocument();
    expect(screen.getByText(/next application step has intentionally not been built/i)).toBeInTheDocument();
  });
});
