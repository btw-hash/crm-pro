import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// A dedicated config for postgres-smoke: a round-trip of the Prisma adapters against
// a REAL Postgres (the `postgres-smoke` CI job). Intentionally isolated from the
// regular `npm test`: here include = test/smoke/** (OUTSIDE src/), while the main
// vitest.config.ts only looks inside src/**, so these files never end up in a
// regular run.
// Run: `npm run test:smoke` (requires PERSISTENCE_MODE=postgres + DATABASE_URL).
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/smoke/**/*.smoke.test.ts"],
    // Sequential: a single connection pool to Postgres, round-trip steps run in order.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      // composition-root and the use-cases import via `@/...`.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `import "server-only"` throws outside the RSC graph (its exports have no
      // node condition — the default resolves to a throwing index.js). Mocked to a
      // no-op empty.js so composition-root can be imported in a Node test and the
      // real postgres wiring can be verified.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
});
