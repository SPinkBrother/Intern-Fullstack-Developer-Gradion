import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { JsonStore } from "./store.js";
import type { GeminiService } from "./gemini.js";
import { MockGeminiService } from "./mock-gemini.js";

describe("Gradion API", () => {
  let root: string;
  let store: JsonStore;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "gradion-"));
    store = new JsonStore(root);
    await store.init();
  });

  it("registers, hashes the password, and restores the session", async () => {
    const agent = request.agent(createApp({ store }));
    await agent.post("/api/auth/register").send({ name: "Lina Hart", email: "LINA@example.com", password: "simple" }).expect(201);
    const disk = await readFile(join(root, "store.json"), "utf8");
    expect(disk).not.toContain("simple");
    expect(JSON.parse(disk).users[0].emailNormalized).toBe("lina@example.com");
    await agent.get("/api/auth").expect(200);
  });

  it("logs in and signs out", async () => {
    const app = createApp({ store });
    await request(app).post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const agent = request.agent(app);
    await agent.post("/api/auth").send({ email: "LINA@example.com", password: "x" }).expect(200);
    await agent.delete("/api/auth").expect(204);
    await agent.get("/api/auth").expect(401);
  });

  it("returns useful account and credential errors", async () => {
    const app = createApp({ store });
    await request(app).post("/api/auth").send({ email: "none@example.com", password: "x" }).expect(404);
    await request(app).post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    await request(app).post("/api/auth/register").send({ name: "Other", email: "LINA@example.com", password: "x" }).expect(409);
    await request(app).post("/api/auth").send({ email: "lina@example.com", password: "wrong" }).expect(401);
  });

  it("lists only projects owned by the signed-in user", async () => {
    const app = createApp({ store });
    const lina = request.agent(app); const other = request.agent(app);
    const linaUser = (await lina.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" })).body.user;
    const otherUser = (await other.post("/api/auth/register").send({ name: "Other", email: "other@example.com", password: "x" })).body.user;
    await store.mutate((data) => { data.projects.push(
      { id: "p1", userId: linaUser.id, title: "The Wind in the Willows", createdAt: "2026-08-12T02:00:00.000Z", updatedAt: "2026-08-12T02:00:00.000Z", status: "draft" },
      { id: "p2", userId: otherUser.id, title: "Private", createdAt: "2026-08-12T03:00:00.000Z", updatedAt: "2026-08-12T03:00:00.000Z", status: "draft" },
    ); });
    const response = await lina.get("/api/projects").expect(200);
    expect(response.body.projects).toHaveLength(1);
    expect(response.body.projects[0]).toMatchObject({ id: "p1", title: "The Wind in the Willows" });
    await request(app).get("/api/projects").expect(401);
  });

  it("creates a draft project and stores its book text", async () => {
    const agent = request.agent(createApp({ store }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const response = await agent.post("/api/projects").send({ title: "  The Secret Garden  ", bookContent: "Chapter One" }).expect(201);
    expect(response.body.project).toMatchObject({ title: "The Secret Garden", status: "draft" });
    expect(await readFile(join(root, "books", `${response.body.project.id}.txt`), "utf8")).toBe("Chapter One");
    expect((await agent.get(`/api/projects/${response.body.project.id}`)).body.project.id).toBe(response.body.project.id);
  });

  it("returns a saved book only to the project owner", async () => {
    const app = createApp({ store });
    const owner = request.agent(app);
    const other = request.agent(app);
    await owner.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    await other.post("/api/auth/register").send({ name: "Other", email: "other@example.com", password: "x" }).expect(201);

    const created = await owner.post("/api/projects").send({ title: "The Cat", bookContent: "Chapter One\nA quiet beginning." }).expect(201);
    const projectId = created.body.project.id;

    await owner.get(`/api/projects/${projectId}/book`).expect(200, { bookContent: "Chapter One\nA quiet beginning." });
    await other.get(`/api/projects/${projectId}/book`).expect(404);
    await request(app).get(`/api/projects/${projectId}/book`).expect(401);
  });

  it("saves or clears an optional manual art style for the project owner", async () => {
    const app = createApp({ store });
    const owner = request.agent(app);
    const other = request.agent(app);
    await owner.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    await other.post("/api/auth/register").send({ name: "Other", email: "other@example.com", password: "x" }).expect(201);
    const created = await owner.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    const projectId = created.body.project.id;

    const saved = await owner.patch(`/api/projects/${projectId}/style`).send({ artStyle: "  Soft watercolor and ink  " }).expect(200);
    expect(saved.body.project.artStyle).toBe("Soft watercolor and ink");
    expect((await store.read()).projects.find((project) => project.id === projectId)?.artStyle).toBe("Soft watercolor and ink");

    await other.patch(`/api/projects/${projectId}/style`).send({ artStyle: "Oil paint" }).expect(404);
    const cleared = await owner.patch(`/api/projects/${projectId}/style`).send({ artStyle: "   " }).expect(200);
    expect(cleared.body.project).not.toHaveProperty("artStyle");
  });

  it("uploads the book once and generates a style with Gemini", async () => {
    const gemini: GeminiService = {
      uploadBook: vi.fn().mockResolvedValue({ name: "files/book-1", uri: "https://files/book-1", expirationTime: "2026-08-15T00:00:00.000Z" }),
      generateStyle: vi.fn().mockResolvedValue("Warm storybook watercolor"),
    };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "A cat crossed the moonlit garden." }).expect(201);

    const generated = await agent.post(`/api/projects/${created.body.project.id}/style/generate`).expect(200);
    expect(generated.body.project).toMatchObject({ artStyle: "Warm storybook watercolor", styleState: "completed", geminiFileName: "files/book-1" });
    expect(gemini.uploadBook).toHaveBeenCalledTimes(1);
    expect(gemini.generateStyle).toHaveBeenCalledWith("https://files/book-1");
  });

  it("does not call Gemini when a manual style exists", async () => {
    const gemini: GeminiService = { uploadBook: vi.fn(), generateStyle: vi.fn() };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    await agent.patch(`/api/projects/${created.body.project.id}/style`).send({ artStyle: "Ink drawing" }).expect(200);

    await agent.post(`/api/projects/${created.body.project.id}/style/generate`).expect(200);
    expect(gemini.uploadBook).not.toHaveBeenCalled();
    expect(gemini.generateStyle).not.toHaveBeenCalled();
  });

  it("rejects a duplicate style request while Gemini is running", async () => {
    let finishUpload!: (value: { name: string; uri: string }) => void;
    const upload = new Promise<{ name: string; uri: string }>((resolve) => { finishUpload = resolve; });
    const gemini: GeminiService = {
      uploadBook: vi.fn().mockReturnValue(upload),
      generateStyle: vi.fn().mockResolvedValue("Watercolor"),
    };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    const path = `/api/projects/${created.body.project.id}/style/generate`;

    const first = agent.post(path).expect(200);
    const firstPromise = first.then((response) => response);
    await vi.waitFor(() => expect(gemini.uploadBook).toHaveBeenCalledTimes(1));
    const duplicate = await agent.post(path).expect(409);
    expect(duplicate.body.code).toBe("STEP_RUNNING");
    finishUpload({ name: "files/book-1", uri: "https://files/book-1" });
    await firstPromise;
    expect(gemini.generateStyle).toHaveBeenCalledTimes(1);
  });

  it("generates at most two adult characters and their portraits sequentially", async () => {
    const gemini: GeminiService = {
      uploadBook: vi.fn().mockResolvedValue({ name: "files/book-1", uri: "https://files/book-1" }),
      generateStyle: vi.fn(),
      generateCharacters: vi.fn().mockResolvedValue([
        { name: "Child", age: 12, description: "A child", visualPrompt: "young child" },
        { name: "Mira", age: 34, description: "The protagonist", visualPrompt: "adult woman with dark curls" },
        { name: "Jon", age: 41, description: "Her companion", visualPrompt: "adult man with silver glasses" },
      ]),
      generatePortrait: vi.fn().mockResolvedValue({ data: new Uint8Array([137, 80, 78, 71]), mimeType: "image/png" }),
    };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    const projectId = created.body.project.id;
    await agent.patch(`/api/projects/${projectId}/style`).send({ artStyle: "Watercolor" }).expect(200);

    const characters = await agent.post(`/api/projects/${projectId}/characters/generate`).expect(200);
    expect(characters.body.project.characters).toHaveLength(2);
    expect(characters.body.project.characters.map((item: { name: string }) => item.name)).toEqual(["Mira", "Jon"]);

    const portraits = await agent.post(`/api/projects/${projectId}/portraits/generate`).expect(200);
    expect(portraits.body.project.portraitState).toBe("completed");
    expect(gemini.generatePortrait).toHaveBeenCalledTimes(2);
    await agent.get(`/api/projects/${projectId}/portraits/${portraits.body.project.characters[0].id}`).expect(200).expect("Content-Type", /png/);
  });

  it("links an existing portrait file during recovery without calling Gemini again", async () => {
    const gemini: GeminiService = {
      uploadBook: vi.fn(), generateStyle: vi.fn(), generatePortrait: vi.fn(),
    };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    const projectId = created.body.project.id;
    await store.mutate((data) => {
      const project = data.projects.find((item) => item.id === projectId)!;
      project.artStyle = "Watercolor";
      project.characters = [{ id: "c1", name: "Mira", age: 34, description: "Hero", visualPrompt: "dark curls" }];
    });
    await mkdir(join(store.portraitsRoot, projectId), { recursive: true });
    await writeFile(join(store.portraitsRoot, projectId, "c1.jpg"), new Uint8Array([255, 216, 255]));

    const response = await agent.post(`/api/projects/${projectId}/portraits/generate`).expect(200);
    expect(response.body.project.characters[0].portraitFile).toBe("c1.jpg");
    expect(gemini.generatePortrait).not.toHaveBeenCalled();
    await agent.get(`/api/projects/${projectId}/portraits/c1`).expect(200).expect("Content-Type", /jpeg/);
  });

  it("generates and saves one meaningful chapter prompt after portraits", async () => {
    const gemini: GeminiService = {
      uploadBook: vi.fn(),
      generateStyle: vi.fn(),
      generateChapter: vi.fn().mockResolvedValue({
        title: "The Lantern at the River",
        scenePrompt: "Mira and Jon discover the lantern beside the flooded river at dusk.",
      }),
    };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    const projectId = created.body.project.id;
    await store.mutate((data) => {
      const project = data.projects.find((item) => item.id === projectId)!;
      project.artStyle = "Watercolor";
      project.geminiFileUri = "https://files/book-1";
      project.characters = [
        { id: "c1", name: "Mira", age: 34, description: "Hero", visualPrompt: "dark curls", portraitFile: "c1.png" },
        { id: "c2", name: "Jon", age: 41, description: "Friend", visualPrompt: "silver glasses", portraitFile: "c2.png" },
      ];
      project.portraitState = "completed";
    });

    const generated = await agent.post(`/api/projects/${projectId}/chapters/generate`).expect(200);
    expect(generated.body.project.chapters).toEqual([{ title: "The Lantern at the River", scenePrompt: "Mira and Jon discover the lantern beside the flooded river at dusk." }]);
    expect(generated.body.project.chapterState).toBe("completed");
    expect(gemini.generateChapter).toHaveBeenCalledTimes(1);

    const saved = await agent.patch(`/api/projects/${projectId}/chapter`).send({ title: "River Light", scenePrompt: "Mira raises the lantern while Jon watches the water." }).expect(200);
    expect(saved.body.project.chapters).toEqual([{ title: "River Light", scenePrompt: "Mira raises the lantern while Jon watches the water." }]);
    await agent.patch(`/api/projects/${projectId}/chapter`).send({ title: "", scenePrompt: "Scene" }).expect(400);
  });

  it("persists the illustration attempt before Gemini and completes with the reused book URI", async () => {
    let observedRunningState: unknown;
    const gemini: GeminiService = {
      uploadBook: vi.fn(), generateStyle: vi.fn(),
      generateIllustration: vi.fn().mockImplementation(async () => {
        observedRunningState = (await store.read()).projects[0].stepState?.illustrations;
        return { data: new Uint8Array([137, 80, 78, 71]), mimeType: "image/png" };
      }),
    };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    const projectId = created.body.project.id;
    await prepareIllustrationProject(store, projectId);

    const response = await agent.post(`/api/projects/${projectId}/illustrations/generate`).expect(200);

    expect(observedRunningState).toMatchObject({ state: "running", attemptId: expect.any(String), lastHeartbeatAt: expect.any(String), error: null });
    expect(gemini.uploadBook).not.toHaveBeenCalled();
    expect(gemini.generateIllustration).toHaveBeenCalledTimes(1);
    expect(vi.mocked(gemini.generateIllustration!)).toHaveBeenCalledWith("https://files/book-1", expect.stringContaining("Watercolor"), expect.any(Array));
    expect(response.body.project.status).toBe("completed");
    expect(response.body.project.stepState.illustrations.state).toBe("completed");
    expect(response.body.project.chapters[0].illustrationFile).toBe("chapter-1.png");
    await agent.get(`/api/projects/${projectId}/illustrations/chapter-1`).expect(200).expect("Content-Type", /png/);
  });

  it("rejects duplicate illustration generation through the project lock", async () => {
    let finish!: (image: { data: Uint8Array; mimeType: "image/jpeg" }) => void;
    const pending = new Promise<{ data: Uint8Array; mimeType: "image/jpeg" }>((resolve) => { finish = resolve; });
    const gemini: GeminiService = { uploadBook: vi.fn(), generateStyle: vi.fn(), generateIllustration: vi.fn().mockReturnValue(pending) };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    const projectId = created.body.project.id;
    await prepareIllustrationProject(store, projectId);
    const path = `/api/projects/${projectId}/illustrations/generate`;

    const firstPromise = agent.post(path).expect(200).then((response) => response);
    await vi.waitFor(() => expect(gemini.generateIllustration).toHaveBeenCalledTimes(1));
    const duplicate = await agent.post(path).expect(409);
    expect(duplicate.body.code).toBe("STEP_RUNNING");
    finish({ data: new Uint8Array([255, 216, 255]), mimeType: "image/jpeg" });
    await firstPromise;
  });

  it("recovers an existing illustration only during POST and skips Gemini", async () => {
    const gemini: GeminiService = { uploadBook: vi.fn(), generateStyle: vi.fn(), generateIllustration: vi.fn() };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    const projectId = created.body.project.id;
    await prepareIllustrationProject(store, projectId);
    await mkdir(join(store.illustrationsRoot, projectId), { recursive: true });
    await writeFile(join(store.illustrationsRoot, projectId, "chapter-1.jpg"), new Uint8Array([255, 216, 255]));

    await agent.get(`/api/projects/${projectId}/illustrations/chapter-1`).expect(404);
    expect((await store.read()).projects[0].chapters![0].illustrationFile).toBeUndefined();

    const recovered = await agent.post(`/api/projects/${projectId}/illustrations/generate`).expect(200);
    expect(recovered.body.project.chapters[0].illustrationFile).toBe("chapter-1.jpg");
    expect(recovered.body.project.status).toBe("completed");
    expect(gemini.generateIllustration).not.toHaveBeenCalled();
    await agent.get(`/api/projects/${projectId}/illustrations/chapter-1`).expect(200).expect("Content-Type", /jpeg/);
  });

  it("persists illustration failures in stepState", async () => {
    const gemini: GeminiService = {
      uploadBook: vi.fn(), generateStyle: vi.fn(),
      generateIllustration: vi.fn().mockRejectedValue(new Error("Out of quota.")),
    };
    const agent = request.agent(createApp({ store, gemini }));
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Cat", bookContent: "Book text" }).expect(201);
    const projectId = created.body.project.id;
    await prepareIllustrationProject(store, projectId);

    await agent.post(`/api/projects/${projectId}/illustrations/generate`).expect(502);
    const project = (await store.read()).projects[0];
    expect(project.status).toBe("failed");
    expect(project.stepState?.illustrations).toMatchObject({ state: "failed", attemptId: expect.any(String), lastHeartbeatAt: expect.any(String), error: "Out of quota." });
  });

  it("runs all five pipeline stages end to end in demo mode", async () => {
    const agent = request.agent(createApp({ store, gemini: new MockGeminiService() }));
    await agent.post("/api/auth/register").send({ name: "Demo Reader", email: "demo@example.com", password: "demo" }).expect(201);
    const created = await agent.post("/api/projects").send({ title: "The Lantern", bookContent: "Mira found a lantern beside the river at dusk." }).expect(201);
    const projectId = created.body.project.id;

    await agent.post(`/api/projects/${projectId}/style/generate`).expect(200);
    const characters = await agent.post(`/api/projects/${projectId}/characters/generate`).expect(200);
    expect(characters.body.project.characters).toHaveLength(2);
    await agent.post(`/api/projects/${projectId}/portraits/generate`).expect(200);
    await agent.post(`/api/projects/${projectId}/chapters/generate`).expect(200);
    const completed = await agent.post(`/api/projects/${projectId}/illustrations/generate`).expect(200);

    expect(completed.body.project.status).toBe("completed");
    expect(completed.body.project.chapters[0].illustrationFile).toBe("chapter-1.png");
    await agent.get(`/api/projects/${projectId}/illustrations/chapter-1`).expect(200).expect("Content-Type", /png/);
  });

  it("validates project creation and authentication", async () => {
    const app = createApp({ store });
    await request(app).post("/api/projects").send({ title: "Book", bookContent: "Text" }).expect(401);
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ name: "Lina", email: "lina@example.com", password: "x" }).expect(201);
    await agent.post("/api/projects").send({ title: "", bookContent: "Text" }).expect(400);
    await agent.post("/api/projects").send({ title: "Book", bookContent: "   " }).expect(400);
  });
});

async function prepareIllustrationProject(store: JsonStore, projectId: string) {
  await store.mutate((data) => {
    const project = data.projects.find((item) => item.id === projectId)!;
    project.artStyle = "Watercolor";
    project.geminiFileName = "files/book-1";
    project.geminiFileUri = "https://files/book-1";
    project.geminiFileExpiresAt = "2099-01-01T00:00:00.000Z";
    project.characters = [{ id: "c1", name: "Mira", age: 34, description: "Hero", visualPrompt: "adult woman with dark curls", portraitFile: "c1.jpg" }];
    project.chapters = [{ title: "River Light", scenePrompt: "Mira raises a lantern beside the flooded river." }];
    project.chapterState = "completed";
  });
  await mkdir(join(store.portraitsRoot, projectId), { recursive: true });
  await writeFile(join(store.portraitsRoot, projectId, "c1.jpg"), new Uint8Array([255, 216, 255]));
}
