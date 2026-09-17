import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Vite 8 uses the oxc transformer; override Next's tsconfig jsx:"preserve"
  // so test runs get a real JSX runtime transform.
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  } as never,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
  },
});
