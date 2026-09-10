import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "modules/**/*.test.ts",
      "lib/**/*.test.ts",
      "tests/unit/**/*.test.ts",
    ],
    coverage: {
      reporter: ["text", "json-summary"],
    },
  },
});
