import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { cookieOptions, hashPassword, newSessionToken, SESSION_COOKIE, sessionExpiry, tokenHash, verifyPassword } from "./auth.js";
import { JsonStore } from "./store.js";
import { publicUser, type ProjectRecord, type UserRecord } from "./types.js";

declare global { namespace Express { interface Request { currentUser?: UserRecord; sessionHash?: string } } }

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

const email = z.string().trim().email().transform((value) => value.toLowerCase());
const password = z.string().min(1).max(128);
const loginSchema = z.object({ email, password }).strict();
const registerSchema = z.object({ name: z.string().trim().min(1).max(80), email, password }).strict();
const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(160),
  bookContent: z.string().refine((value) => value.trim().length > 0).refine((value) => Buffer.byteLength(value, "utf8") <= 10 * 1024 * 1024),
}).strict();
const artStyleSchema = z.object({ artStyle: z.string().max(1000).transform((value) => value.trim()) }).strict();

export function createApp({ store }: { store: JsonStore }) {
  const app = express();
  app.use(express.json({ limit: "11mb" }));
  app.use(cookieParser());

  const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };

  async function startSession(res: Response, userId: string) {
    const token = newSessionToken();
    const now = new Date().toISOString();
    await store.mutate((data) => {
      data.sessions = data.sessions.filter((session) => Date.parse(session.expiresAt) > Date.now());
      data.sessions.push({ tokenHash: tokenHash(token), userId, createdAt: now, expiresAt: sessionExpiry() });
    });
    res.cookie(SESSION_COOKIE, token, cookieOptions());
  }

  const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
    Promise.resolve().then(async () => {
      const token = req.cookies?.[SESSION_COOKIE];
      if (!token) throw new ApiError(401, "UNAUTHORIZED", "Sign in is required.");
      const hash = tokenHash(token);
      const data = await store.read();
      const session = data.sessions.find((item) => item.tokenHash === hash && Date.parse(item.expiresAt) > Date.now());
      const user = session && data.users.find((item) => item.id === session.userId);
      if (!user) throw new ApiError(401, "UNAUTHORIZED", "The session is invalid or expired.");
      req.currentUser = user; req.sessionHash = hash; next();
    }).catch(next);
  };

  app.post("/api/auth", asyncRoute(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Enter a valid email and a non-empty password.");
    const user = (await store.read()).users.find((item) => item.emailNormalized === parsed.data.email);
    if (!user) return res.status(404).json({ code: "ACCOUNT_NOT_FOUND", message: "No account uses that email." });
    if (!(await verifyPassword(parsed.data.password, user.passwordSalt, user.passwordHash))) throw new ApiError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
    await startSession(res, user.id);
    res.json({ user: publicUser(user) });
  }));

  app.post("/api/auth/register", asyncRoute(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Enter a name, valid email, and non-empty password.");
    const credentials = await hashPassword(parsed.data.password);
    const now = new Date().toISOString();
    const user: UserRecord = { id: randomUUID(), name: parsed.data.name, emailNormalized: parsed.data.email, ...credentials, createdAt: now, updatedAt: now };
    await store.mutate((data) => {
      if (data.users.some((item) => item.emailNormalized === user.emailNormalized)) throw new ApiError(409, "ACCOUNT_EXISTS", "An account already uses that email.");
      data.users.push(user);
    });
    await startSession(res, user.id);
    res.status(201).json({ user: publicUser(user) });
  }));

  app.get("/api/auth", requireAuth, (req, res) => { res.json({ user: publicUser(req.currentUser!) }); });
  app.delete("/api/auth", requireAuth, asyncRoute(async (req, res) => {
    await store.mutate((data) => { data.sessions = data.sessions.filter((item) => item.tokenHash !== req.sessionHash); });
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.status(204).end();
  }));

  app.get("/api/projects", requireAuth, asyncRoute(async (req, res) => {
    const projects = (await store.read()).projects
      .filter((project) => project.userId === req.currentUser!.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    res.json({ projects });
  }));

  app.post("/api/projects", requireAuth, asyncRoute(async (req, res) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Provide a project title and book content no larger than 10 MB.");

    const id = randomUUID();
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id,
      userId: req.currentUser!.id,
      title: parsed.data.title,
      createdAt: now,
      updatedAt: now,
      status: "draft",
    };
    await store.saveBook(id, parsed.data.bookContent);
    await store.mutate((data) => { data.projects.push(project); });
    res.status(201).json({ project });
  }));

  app.get("/api/projects/:projectId", requireAuth, asyncRoute(async (req, res) => {
    const project = (await store.read()).projects.find((item) => item.id === req.params.projectId && item.userId === req.currentUser!.id);
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    res.json({ project });
  }));

  app.get("/api/projects/:projectId/book", requireAuth, asyncRoute(async (req, res) => {
    const project = (await store.read()).projects.find((item) => item.id === req.params.projectId && item.userId === req.currentUser!.id);
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    try {
      res.json({ bookContent: await store.readBook(project.id) });
    } catch (error: any) {
      if (error?.code === "ENOENT") throw new ApiError(404, "BOOK_NOT_FOUND", "The saved book could not be found.");
      throw error;
    }
  }));

  app.patch("/api/projects/:projectId/style", requireAuth, asyncRoute(async (req, res) => {
    const parsed = artStyleSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Art style must be no longer than 1,000 characters.");
    const project = await store.mutate((data) => {
      const ownedProject = data.projects.find((item) => item.id === req.params.projectId && item.userId === req.currentUser!.id);
      if (!ownedProject) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
      if (parsed.data.artStyle) ownedProject.artStyle = parsed.data.artStyle;
      else delete ownedProject.artStyle;
      ownedProject.updatedAt = new Date().toISOString();
      return ownedProject;
    });
    res.json({ project });
  }));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) return res.status(error.status).json({ code: error.code, message: error.message });
    res.status(500).json({ code: "INTERNAL_ERROR", message: "The server could not complete the request." });
  });
  return app;
}
