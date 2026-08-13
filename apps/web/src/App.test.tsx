import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { ProjectDetailPage } from "./ProjectDetailPage";

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

  it("renders a saved project and opens the New project form", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "u1", name: "Lina Hart", email: "lina@example.com" } }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ projects: [{ id: "p1", title: "The Wind in the Willows", createdAt: "2026-08-12T00:00:00.000Z", status: "draft" }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    render(<App />);
    expect(await screen.findByText("The Wind in the Willows")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /new project/i }));
    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    expect(location.hash).toBe("#/projects/new");
  });

  it("validates and creates a project from pasted text, then opens its detail view", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ user: { id: "u1", name: "Lina Hart", email: "lina@example.com" } }))
      .mockResolvedValueOnce(json({ projects: [] }))
      .mockResolvedValueOnce(json({ project: { id: "p-new", title: "My Book", createdAt: "2026-08-12T00:00:00.000Z", status: "draft" } }, 201))
      .mockResolvedValueOnce(json({ bookContent: "Once upon a time" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /new project/i }));
    await userEvent.click(screen.getByRole("button", { name: /create project/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/project title/i);

    await userEvent.type(screen.getByLabelText("Project title"), "My Book");
    await userEvent.type(screen.getByLabelText("Book content"), "Once upon a time");
    await userEvent.click(screen.getByRole("button", { name: /create project/i }));

    expect(await screen.findByRole("heading", { name: "My Book" })).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(location.hash).toBe("#/projects/p-new");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ title: "My Book", bookContent: "Once upon a time" });
  });

  it("loads book content from an uploaded txt file", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json({ user: { id: "u1", name: "Lina Hart", email: "lina@example.com" } }))
      .mockResolvedValueOnce(json({ projects: [] })));
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /new project/i }));

    const file = new File(["Uploaded chapter text"], "novel.txt", { type: "text/plain" });
    await userEvent.upload(screen.getByLabelText(/upload a .txt file/i), file);
    await waitFor(() => expect(screen.getByLabelText("Book content")).toHaveValue("Uploaded chapter text"));
    expect(screen.getByText("novel.txt")).toBeInTheDocument();
  });

  it("previews a project's saved book and opens the full text without navigating", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ bookContent: "Chapter One\n" + "A long story. ".repeat(40) })));
    render(<ProjectDetailPage project={{ id: "p1", title: "The Cat", createdAt: "2026-08-12T00:00:00.000Z", status: "draft" }} loading={false} error="" authorName="Mira Hassan" onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "The Cat" })).toBeInTheDocument();
    expect(screen.getByText(/created .* by mira hassan/i)).toBeInTheDocument();
    expect(await screen.findByText(/chapter one/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /read full book/i }));
    expect(screen.getByRole("dialog", { name: "The Cat" })).toBeInTheDocument();
    expect(location.hash).toBe("");
    await userEvent.click(screen.getByRole("button", { name: /close book/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("saves an optional manual art style and explains the blank behavior", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ bookContent: "A quiet story" }))
      .mockResolvedValueOnce(json({ project: { id: "p1", title: "The Cat", createdAt: "2026-08-12T00:00:00.000Z", status: "draft", artStyle: "Soft watercolor" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProjectDetailPage project={{ id: "p1", title: "The Cat", createdAt: "2026-08-12T00:00:00.000Z", status: "draft" }} loading={false} error="" authorName="Mira Hassan" onBack={vi.fn()} />);

    expect(screen.getByLabelText("Style current step")).toBeInTheDocument();
    expect(screen.getByLabelText("Characters not started")).toBeInTheDocument();
    expect(screen.getByText(/leave this blank and the style will be based on the book text later/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Art style"), "Soft watercolor");
    await userEvent.click(screen.getByRole("button", { name: /save art style/i }));

    expect(await screen.findByText("Art style saved.")).toBeInTheDocument();
    expect(screen.getByLabelText("Style complete")).toBeInTheDocument();
    expect(screen.getByLabelText("Characters current step")).toBeInTheDocument();
    expect(screen.getByText(/ready for the next stage: characters/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/projects/p1/style", expect.objectContaining({ method: "PATCH" }));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ artStyle: "Soft watercolor" });
  });

  it("generates an art style from the saved book and advances the stage", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ bookContent: "A quiet story" }))
      .mockResolvedValueOnce(json({ project: { id: "p1", title: "The Cat", createdAt: "2026-08-12T00:00:00.000Z", status: "draft", artStyle: "Moonlit watercolor", styleState: "completed" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProjectDetailPage project={{ id: "p1", title: "The Cat", createdAt: "2026-08-12T00:00:00.000Z", status: "draft", styleState: "idle" }} loading={false} error="" authorName="Mira Hassan" onBack={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate style from book" }));
    expect(await screen.findByText("Art style generated from the book.")).toBeInTheDocument();
    expect(screen.getByLabelText("Style complete")).toBeInTheDocument();
    expect(screen.getByLabelText("Characters current step")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/projects/p1/style/generate", expect.objectContaining({ method: "POST" }));
  });

  it("generates adult characters before portraits and advances to Chapters", async () => {
    const base = { id: "p1", title: "The Cat", createdAt: "2026-08-12T00:00:00.000Z", status: "in_progress" as const, artStyle: "Watercolor" };
    const characters = [
      { id: "c1", name: "Mira", age: 34, description: "The protagonist", visualPrompt: "dark curls" },
      { id: "c2", name: "Jon", age: 41, description: "Her companion", visualPrompt: "silver glasses" },
    ];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ bookContent: "A quiet story" }))
      .mockResolvedValueOnce(json({ project: { ...base, characters, characterState: "completed" } }))
      .mockResolvedValueOnce(json({ project: { ...base, characters: characters.map((character) => ({ ...character, portraitFile: `${character.id}.png` })), portraitState: "completed" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProjectDetailPage project={base} loading={false} error="" authorName="Mira Hassan" onBack={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /generate characters/i }));
    expect(await screen.findByRole("heading", { name: "Characters (2)" })).toBeInTheDocument();
    expect(screen.getByLabelText("Portraits current step")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /generate portraits/i }));
    expect(await screen.findByAltText("Portrait of Mira")).toBeInTheDocument();
    expect(screen.getByLabelText("Chapters current step")).toBeInTheDocument();
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
