import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => { cleanup(); vi.restoreAllMocks(); location.hash = ""; });

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
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "u1", name: "Lina Hart", email: "lina@example.com" } }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ projects: [] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    render(<App />);
    await screen.findByRole("heading", { name: "Your projects" });
    expect(screen.getByText("Lina Hart")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No projects yet" })).toBeInTheDocument();
  });

  it("renders project rows with progress and routes New project to the prepared next checkpoint", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "u1", name: "Lina Hart", email: "lina@example.com" } }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ projects: [{ id: "p1", title: "The Wind in the Willows", createdAt: "2026-08-12T00:00:00.000Z", status: "in_progress", completedSteps: 2 }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    render(<App />);
    expect(await screen.findByText("The Wind in the Willows")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByLabelText("2 of 5 steps complete")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /new project/i }));
    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    expect(location.hash).toBe("#/projects/new");
  });
});
