import { z } from "zod";

const EnvSchema = z.object({
  PERSISTENCE_MODE: z.enum(["memory", "postgres"]).default("memory"),
  ERP_MODE: z.enum(["stub", "odata"]).default("stub"),
  ERP_BASE_URL: z.string().optional(),
  ERP_USERNAME: z.string().optional(),
  ERP_PASSWORD: z.string().optional(),
  /**
   * ERP window URL (orders/reservations from the CRM) -- an external link from
   * contextual places (deal/client card). Not set -- the "Open in ERP" button isn't
   * rendered. It used to sit in the layout header (on every screen), which was
   * irrelevant; now it's contextual. See ErpLink.
   */
  ERP_UI_URL: z.string().optional(),
  AI_MODE: z.enum(["stub", "live"]).default("stub"),
  AI_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  /** Web search for the assistant: stub -- deterministic placeholder (default); live -- real API. */
  WEB_SEARCH_MODE: z.enum(["stub", "live"]).default("stub"),
  WEB_SEARCH_PROVIDER: z.enum(["brave"]).default("brave"),
  /** Brave Search API key (server-only). Required when WEB_SEARCH_MODE=live. */
  WEB_SEARCH_API_KEY: z.string().optional(),
  /** Explicitly allow the global LLM (Claude) in production -- only for synthetic/anonymized data. */
  ALLOW_GLOBAL_LLM: z.string().optional(),
  /**
   * Temporary: login is optional in dev (without a session, act as the demo user), so
   * the team doesn't hit the login wall. In production login is ALWAYS required -- this
   * flag is ignored there. Disable in dev: AUTH_OPTIONAL=false.
   */
  AUTH_OPTIONAL: z.string().optional(),
  /** LLM token usage tracking (#216): on -- attach the tracking decorator; off -- zero overhead. */
  USAGE_TRACKING: z.enum(["on", "off"]).default("on"),
  /** Usage journal retention window, days (memory: aggregate window; postgres: raw retention). */
  USAGE_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  /** Capacity of the in-memory detail ring buffer (anti-OOM on small demo VMs). */
  USAGE_MEMORY_MAX_ROWS: z.coerce.number().int().positive().default(1000),
});

export type Env = z.infer<typeof EnvSchema>;

/** Validates environment variables; fails with a clear error on a typo. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  // An empty string in .env (e.g. `AI_BASE_URL=` from the template) means "not set":
  // otherwise `.default()` and `?? fallback` won't kick in and the value stays empty
  // (a broken relative URL, an empty model in modelUri, etc.).
  const v = (value: string | undefined): string | undefined =>
    value === undefined || value.trim() === "" ? undefined : value;
  return EnvSchema.parse({
    PERSISTENCE_MODE: v(source.PERSISTENCE_MODE),
    ERP_MODE: v(source.ERP_MODE),
    ERP_BASE_URL: v(source.ERP_BASE_URL),
    ERP_USERNAME: v(source.ERP_USERNAME),
    ERP_PASSWORD: v(source.ERP_PASSWORD),
    ERP_UI_URL: v(source.ERP_UI_URL),
    AI_MODE: v(source.AI_MODE),
    AI_PROVIDER: v(source.AI_PROVIDER),
    AI_API_KEY: v(source.AI_API_KEY),
    AI_MODEL: v(source.AI_MODEL),
    AI_BASE_URL: v(source.AI_BASE_URL),
    WEB_SEARCH_MODE: v(source.WEB_SEARCH_MODE),
    WEB_SEARCH_PROVIDER: v(source.WEB_SEARCH_PROVIDER),
    WEB_SEARCH_API_KEY: v(source.WEB_SEARCH_API_KEY),
    ALLOW_GLOBAL_LLM: v(source.ALLOW_GLOBAL_LLM),
    AUTH_OPTIONAL: v(source.AUTH_OPTIONAL),
    USAGE_TRACKING: v(source.USAGE_TRACKING),
    USAGE_RETENTION_DAYS: v(source.USAGE_RETENTION_DAYS),
    USAGE_MEMORY_MAX_ROWS: v(source.USAGE_MEMORY_MAX_ROWS),
  });
}
