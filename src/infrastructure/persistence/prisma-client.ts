import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Singleton on globalThis: Next.js dev mode re-imports modules on each HMR cycle,
// which would otherwise create a new PrismaClient (and a new connection pool) per import.
// Same pattern as the AppContainer singleton in composition-root.ts.
const globalForPrisma = globalThis as unknown as { __prismaClient?: PrismaClient };

function build(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Loud failure: postgres mode was selected but no connection string is configured.
    throw new Error(
      "PERSISTENCE_MODE=postgres requires DATABASE_URL. Set it in .env (see .env.example).",
    );
  }
  // Prisma 7 needs an explicit driver adapter — the schema datasource block carries no url.
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  const existing = globalForPrisma.__prismaClient;
  if (existing) return existing;
  const client = build();
  // Cache in ALL environments. The lazy proxy below calls getClient() on EVERY property
  // access; without caching in production each access builds a new PrismaClient + pg pool,
  // exhausting Postgres connections (P2037 TooManyConnections). The dev-only guard used to
  // exist to avoid HMR leaks, but it left production with no singleton at all.
  globalForPrisma.__prismaClient = client;
  return client;
}

// Lazy proxy: the PrismaClient (and its DB connection) is constructed only on first
// real property access — i.e. when PERSISTENCE_MODE=postgres and a repository runs a
// query. Importing this module, which composition-root does unconditionally, must NOT
// construct the client; otherwise memory mode and the Next build (static page-data
// collection, no DB available) would fail.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
