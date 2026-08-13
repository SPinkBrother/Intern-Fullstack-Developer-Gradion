import { resolve } from "node:path";
import { createApp } from "./app.js";
import { JsonStore } from "./store.js";
import { MockGeminiService } from "./mock-gemini.js";

for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  try { process.loadEnvFile(candidate); break; } catch { /* The shell may provide environment variables. */ }
}

const store = new JsonStore(
  resolve(process.env.DATA_DIR || "data"),
  resolve(process.env.BOOKS_DIR || "storage/books"),
  resolve(process.env.PORTRAITS_DIR || "storage/portraits"),
  resolve(process.env.ILLUSTRATIONS_DIR || "storage/illustrations"),
);
await store.init();
const port = Number(process.env.PORT || 3001);
const demoMode = process.env.GEMINI_MOCK_MODE === "true";
createApp({ store, gemini: demoMode ? new MockGeminiService() : undefined }).listen(port, () => {
  console.log(`Gradion API listening on http://localhost:${port}${demoMode ? " (DEMO MODE: Gemini calls are mocked)" : ""}`);
});
