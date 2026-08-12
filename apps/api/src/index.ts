import { resolve } from "node:path";
import { createApp } from "./app.js";
import { JsonStore } from "./store.js";

for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  try { process.loadEnvFile(candidate); break; } catch { /* The shell may provide environment variables. */ }
}

const store = new JsonStore(resolve(process.env.DATA_DIR || "data"));
await store.init();
const port = Number(process.env.PORT || 3001);
createApp({ store }).listen(port, () => console.log(`Gradion auth API listening on http://localhost:${port}`));
