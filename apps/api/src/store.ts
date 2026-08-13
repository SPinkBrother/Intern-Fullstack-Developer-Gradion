import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoreData } from "./types.js";

const EMPTY: StoreData = { users: [], sessions: [], projects: [] };

export class JsonStore {
  private readonly file: string;
  private tail: Promise<void> = Promise.resolve();

  constructor(readonly root: string, readonly booksRoot = join(root, "books"), readonly portraitsRoot = join(root, "portraits")) { this.file = join(root, "store.json"); }

  async init() {
    await mkdir(this.root, { recursive: true });
    try { await this.read(); }
    catch (error: any) {
      if (error?.code !== "ENOENT") throw new Error(`Store is invalid: ${error instanceof Error ? error.message : String(error)}`);
      await this.write(EMPTY);
    }
  }

  async read(): Promise<StoreData> {
    const data = JSON.parse(await readFile(this.file, "utf8"));
    if (!Array.isArray(data.users) || !Array.isArray(data.sessions)) throw new Error("Expected users and sessions arrays");
    return { users: data.users, sessions: data.sessions, projects: Array.isArray(data.projects) ? data.projects : [] };
  }

  async mutate<T>(change: (data: StoreData) => T | Promise<T>): Promise<T> {
    let result!: T;
    const operation = this.tail.then(async () => {
      const data = await this.read();
      result = await change(data);
      await this.write(data);
    });
    this.tail = operation.catch(() => undefined);
    await operation;
    return result;
  }

  async saveBook(projectId: string, content: string) {
    await mkdir(this.booksRoot, { recursive: true });
    await writeFile(join(this.booksRoot, `${projectId}.txt`), content, { encoding: "utf8", flag: "wx" });
  }

  async readBook(projectId: string) {
    return readFile(join(this.booksRoot, `${projectId}.txt`), "utf8");
  }

  async findPortrait(projectId: string, characterId: string) {
    for (const extension of ["jpg", "png"] as const) {
      const fileName = `${characterId}.${extension}`;
      try { await access(join(this.portraitsRoot, projectId, fileName)); return fileName; }
      catch (error: any) { if (error?.code !== "ENOENT") throw error; }
    }
    return undefined;
  }

  async savePortrait(projectId: string, characterId: string, data: Uint8Array, mimeType: string) {
    const directory = join(this.portraitsRoot, projectId);
    await mkdir(directory, { recursive: true });
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : undefined;
    if (!extension) throw new Error(`Unsupported portrait MIME type: ${mimeType}`);
    const fileName = `${characterId}.${extension}`;
    try { await writeFile(join(directory, fileName), data, { flag: "wx" }); }
    catch (error: any) { if (error?.code !== "EEXIST") throw error; }
    return fileName;
  }

  async readPortrait(projectId: string, fileName: string) {
    return readFile(join(this.portraitsRoot, projectId, fileName));
  }

  private async write(data: StoreData) {
    const temporary = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(temporary, this.file);
  }
}
