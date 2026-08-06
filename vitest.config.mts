import { defineConfig } from "vitest/config";
import path from "node:path";

/** Unit/integration test discovery, path aliases, runtime, and coverage settings. */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    environment: "node",
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: { reporter: ["text", "html"] },
  },
});
