import { defineConfig } from "prisma/config";

// Prisma 7 requires connection URLs in prisma.config.ts (not in schema.prisma datasource block).
// DATABASE_URL is read from the environment at runtime and at migration time.
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
