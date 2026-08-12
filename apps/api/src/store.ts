import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoreData } from "./types.js";

const EMPTY: StoreData = { users: [], sessions: [] };

export class JsonStore {
  private readonly file: string;
  private tail: Promise<void> = Promise.resolve();

  constructor(readonly root: string) { this.file = join(root, "store.json"); }

  async init() {
    await mkdir(this.root, { recursive: true });
    try { await this.read(); }
    catch (error: any) {
      if (error?.code !== "ENOENT") throw new Error(`Authentication store is invalid: ${error instanceof Error ? error.message : String(error)}`);
      await this.write(EMPTY);
    }
  }

  async read(): Promise<StoreData> {
    const parsed = JSON.parse(await readFile(this.file, "utf8"));
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.sessions)) throw new Error("Expected users and sessions arrays");
    return { users: parsed.users, sessions: parsed.sessions };
  }

  async mutate<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
    let result!: T;
    const operation = this.tail.then(async () => {
      const data = await this.read();
      result = await fn(data);
      await this.write(data);
    });
    this.tail = operation.catch(() => undefined);
    await operation;
    return result;
  }

  private async write(data: StoreData) {
    const temporary = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(temporary, this.file);
  }
}
