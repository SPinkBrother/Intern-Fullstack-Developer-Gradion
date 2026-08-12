import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { JsonStore } from "./store.js";

describe("authentication API", () => {
  let root: string;
  let store: JsonStore;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "gradion-auth-"));
    store = new JsonStore(root);
    await store.init();
  });

  it("registers, hashes the password, and restores the cookie session", async () => {
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
    await request(app).post("/api/auth").send({ email: "bad", password: "x" }).expect(400);
  });
});
