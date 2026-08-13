import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
  const env = loadEnv(mode, workspaceRoot, "");
  return {
    envDir: workspaceRoot,
    define: { __GEMINI_MOCK_MODE__: JSON.stringify(env.GEMINI_MOCK_MODE === "true") },
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy: { "/api": "http://localhost:3001" } },
    test: { environment: "jsdom", setupFiles: "./src/test/setup.ts" },
  };
});
