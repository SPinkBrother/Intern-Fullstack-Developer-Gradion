import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { cookieOptions, hashPassword, newSessionToken, SESSION_COOKIE, sessionExpiry, tokenHash, verifyPassword } from "./auth.js";
import { JsonStore } from "./store.js";
import { RestGeminiService, type GeminiService } from "./gemini.js";
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
const characterOutputSchema = z.array(z.object({
  name: z.string().trim().min(1).max(120), age: z.number().int().min(0).max(150),
  description: z.string().trim().min(1).max(2000), visualPrompt: z.string().trim().min(1).max(4000),
}));

export function createApp({ store, gemini = new RestGeminiService() }: { store: JsonStore; gemini?: GeminiService }) {
  const app = express();
  const runningStyleProjects = new Set<string>();
  const runningCharacterProjects = new Set<string>();
  const runningPortraitProjects = new Set<string>();
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
      styleState: "idle",
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
      if (ownedProject.characters?.length) throw new ApiError(409, "STYLE_LOCKED", "Art style cannot change after characters are generated.");
      if (parsed.data.artStyle) {
        ownedProject.artStyle = parsed.data.artStyle;
        ownedProject.styleState = "completed";
        ownedProject.status = "in_progress";
      } else {
        delete ownedProject.artStyle;
        ownedProject.styleState = "idle";
        ownedProject.status = "draft";
      }
      delete ownedProject.styleError;
      delete ownedProject.styleStartedAt;
      ownedProject.updatedAt = new Date().toISOString();
      return ownedProject;
    });
    res.json({ project });
  }));

  app.post("/api/projects/:projectId/style/generate", requireAuth, asyncRoute(async (req, res) => {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    if (!projectId) throw new ApiError(400, "VALIDATION_ERROR", "Project ID is required.");
    const existing = (await store.read()).projects.find((item) => item.id === projectId && item.userId === req.currentUser!.id);
    if (!existing) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    if (existing.artStyle) return res.json({ project: existing });
    if (runningStyleProjects.has(projectId)) throw new ApiError(409, "STEP_RUNNING", "Style generation is already running.");

    runningStyleProjects.add(projectId);
    await store.mutate((data) => {
      const project = data.projects.find((item) => item.id === projectId)!;
      project.styleState = "running";
      project.status = "in_progress";
      project.styleStartedAt = new Date().toISOString();
      delete project.styleError;
    });

    try {
      let current = (await store.read()).projects.find((item) => item.id === projectId)!;
      const fileStillValid = current.geminiFileUri && (!current.geminiFileExpiresAt || Date.parse(current.geminiFileExpiresAt) > Date.now());
      if (!fileStillValid) {
        const file = await gemini.uploadBook(current.title, await store.readBook(projectId));
        current = await store.mutate((data) => {
          const project = data.projects.find((item) => item.id === projectId)!;
          project.geminiFileName = file.name;
          project.geminiFileUri = file.uri;
          project.geminiFileExpiresAt = file.expirationTime;
          return project;
        });
      }
      const style = await gemini.generateStyle(current.geminiFileUri!);
      const completed = await store.mutate((data) => {
        const project = data.projects.find((item) => item.id === projectId)!;
        project.artStyle = style;
        project.styleState = "completed";
        project.status = "in_progress";
        project.updatedAt = new Date().toISOString();
        delete project.styleStartedAt;
        delete project.styleError;
        return project;
      });
      res.json({ project: completed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gemini could not generate the style.";
      await store.mutate((data) => {
        const project = data.projects.find((item) => item.id === projectId)!;
        project.styleState = "failed";
        project.status = "failed";
        project.styleError = message;
        delete project.styleStartedAt;
      });
      throw new ApiError(502, "GEMINI_ERROR", message);
    } finally {
      runningStyleProjects.delete(projectId);
    }
  }));

  app.post("/api/projects/:projectId/characters/generate", requireAuth, asyncRoute(async (req, res) => {
    const projectId = singleParam(req.params.projectId);
    const existing = (await store.read()).projects.find((item) => item.id === projectId && item.userId === req.currentUser!.id);
    if (!existing) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    if (!existing.artStyle) throw new ApiError(409, "STYLE_REQUIRED", "Complete the Style stage first.");
    if (existing.characters?.length) return res.json({ project: existing });
    if (runningCharacterProjects.has(projectId)) throw new ApiError(409, "STEP_RUNNING", "Character generation is already running.");
    if (!gemini.generateCharacters) throw new ApiError(503, "GEMINI_NOT_CONFIGURED", "Character generation is unavailable.");

    runningCharacterProjects.add(projectId);
    await store.mutate((data) => { const project = data.projects.find((item) => item.id === projectId)!; project.characterState = "running"; delete project.characterError; });
    try {
      let current = (await store.read()).projects.find((item) => item.id === projectId)!;
      if (!validGeminiFile(current)) {
        const file = await gemini.uploadBook(current.title, await store.readBook(projectId));
        current = await store.mutate((data) => { const project = data.projects.find((item) => item.id === projectId)!; saveGeminiFile(project, file); return project; });
      }
      const parsed = characterOutputSchema.safeParse(await gemini.generateCharacters(current.geminiFileUri!, current.artStyle!));
      if (!parsed.success) throw new Error("Gemini returned invalid character data.");
      const adults = parsed.data.filter((character) => character.age >= 18).slice(0, 2);
      if (!adults.length) throw new Error("Gemini did not identify an adult main character.");
      const completed = await store.mutate((data) => {
        const project = data.projects.find((item) => item.id === projectId)!;
        project.characters = adults.map((character) => ({ id: randomUUID(), ...character }));
        project.characterState = "completed";
        project.portraitState = "idle";
        project.status = "in_progress";
        project.updatedAt = new Date().toISOString();
        delete project.characterError;
        return project;
      });
      res.json({ project: completed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gemini could not generate characters.";
      await store.mutate((data) => { const project = data.projects.find((item) => item.id === projectId)!; project.characterState = "failed"; project.characterError = message; project.status = "failed"; });
      throw new ApiError(502, "GEMINI_ERROR", message);
    } finally { runningCharacterProjects.delete(projectId); }
  }));

  app.post("/api/projects/:projectId/portraits/generate", requireAuth, asyncRoute(async (req, res) => {
    const projectId = singleParam(req.params.projectId);
    const existing = (await store.read()).projects.find((item) => item.id === projectId && item.userId === req.currentUser!.id);
    if (!existing) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    if (!existing.artStyle || !existing.characters?.length) throw new ApiError(409, "CHARACTERS_REQUIRED", "Complete the Characters stage first.");
    if (existing.characters.every((character) => character.portraitFile)) return res.json({ project: existing });
    if (runningPortraitProjects.has(projectId)) throw new ApiError(409, "STEP_RUNNING", "Portrait generation is already running.");
    if (!gemini.generatePortrait) throw new ApiError(503, "GEMINI_NOT_CONFIGURED", "Portrait generation is unavailable.");

    runningPortraitProjects.add(projectId);
    await store.mutate((data) => { const project = data.projects.find((item) => item.id === projectId)!; project.portraitState = "running"; delete project.portraitError; });
    try {
      let current = (await store.read()).projects.find((item) => item.id === projectId)!;
      for (const character of current.characters!) {
        if (character.portraitFile) continue;
        const recoveredFile = await store.findPortrait(projectId, character.id);
        if (recoveredFile) {
          current = await store.mutate((data) => {
            const project = data.projects.find((item) => item.id === projectId)!;
            project.characters!.find((item) => item.id === character.id)!.portraitFile = recoveredFile;
            return project;
          });
          continue;
        }
        const image = await gemini.generatePortrait(`Create one 3:4 character portrait with no text. Art style: ${current.artStyle}. Character: ${character.visualPrompt}. The character is an adult age ${character.age}. Neutral simple background, consistent storybook concept art.`);
        const portraitFile = await store.savePortrait(projectId, character.id, image.data, image.mimeType);
        current = await store.mutate((data) => {
          const project = data.projects.find((item) => item.id === projectId)!;
          project.characters!.find((item) => item.id === character.id)!.portraitFile = portraitFile;
          return project;
        });
      }
      const completed = await store.mutate((data) => { const project = data.projects.find((item) => item.id === projectId)!; project.portraitState = "completed"; project.status = "in_progress"; project.updatedAt = new Date().toISOString(); delete project.portraitError; return project; });
      res.json({ project: completed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gemini could not generate portraits.";
      await store.mutate((data) => { const project = data.projects.find((item) => item.id === projectId)!; project.portraitState = "failed"; project.portraitError = message; project.status = "failed"; });
      throw new ApiError(502, "GEMINI_ERROR", message);
    } finally { runningPortraitProjects.delete(projectId); }
  }));

  app.get("/api/projects/:projectId/portraits/:characterId", requireAuth, asyncRoute(async (req, res) => {
    const projectId = singleParam(req.params.projectId);
    const characterId = singleParam(req.params.characterId);
    const project = (await store.read()).projects.find((item) => item.id === projectId && item.userId === req.currentUser!.id);
    const character = project?.characters?.find((item) => item.id === characterId && item.portraitFile);
    if (!character?.portraitFile) throw new ApiError(404, "PORTRAIT_NOT_FOUND", "Portrait not found.");
    res.type(character.portraitFile).send(await store.readPortrait(projectId, character.portraitFile));
  }));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) return res.status(error.status).json({ code: error.code, message: error.message });
    res.status(500).json({ code: "INTERNAL_ERROR", message: "The server could not complete the request." });
  });
  return app;
}

function singleParam(value: string | string[] | undefined) {
  const result = Array.isArray(value) ? value[0] : value;
  if (!result) throw new ApiError(400, "VALIDATION_ERROR", "A required ID is missing.");
  return result;
}

function validGeminiFile(project: ProjectRecord) {
  return Boolean(project.geminiFileUri && (!project.geminiFileExpiresAt || Date.parse(project.geminiFileExpiresAt) > Date.now()));
}

function saveGeminiFile(project: ProjectRecord, file: { name: string; uri: string; expirationTime?: string }) {
  project.geminiFileName = file.name; project.geminiFileUri = file.uri; project.geminiFileExpiresAt = file.expirationTime;
}
