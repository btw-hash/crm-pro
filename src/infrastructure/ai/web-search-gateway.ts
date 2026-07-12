import type {
  WebSearchGateway,
  WebSearchResponse,
  WebSearchResult,
} from "@/application/ports/web-search-gateway";
import type { Logger } from "@/infrastructure/logging/logger";

export interface BraveSearchConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
}

/** How many results we hand to the assistant (port contract -- up to 5). */
const MAX_RESULTS = 5;

interface BraveResult {
  readonly title?: unknown;
  readonly description?: unknown;
  readonly url?: unknown;
}

/**
 * Adapter for general web search to the Brave Search API (`/res/v1/web/search`) via
 * `fetch`. The response is plain JSON -- `web.results[]` with `title`/`description`/`url`.
 *
 * Resilience: any failure (non-2xx, network, malformed JSON) is logged (provider+status
 * only, never the body -- it may contain the query text) and returns `{ query, results: [] }`.
 * We never throw -- the assistant gracefully says "nothing found" instead. The key is
 * server-only (called from composition-root) and never logged.
 */
export class BraveSearchGateway implements WebSearchGateway {
  constructor(
    private readonly config: BraveSearchConfig,
    private readonly logger: Logger,
  ) {}

  async search(query: string): Promise<WebSearchResponse> {
    let response: Response;
    try {
      response = await fetch(
        `${this.config.baseUrl}/res/v1/web/search?q=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: {
            "X-Subscription-Token": this.config.apiKey,
            accept: "application/json",
          },
        },
      );
    } catch (cause) {
      // Network unavailable -- no body (may contain the query text). Never throw.
      this.logger.warn("web_search.request_failed", {
        provider: "brave",
        reason: cause instanceof Error ? cause.name : "network",
      });
      return { query, results: [] };
    }

    if (!response.ok) {
      // Log only provider + status (the body may contain the query text).
      this.logger.warn("web_search.request_failed", {
        provider: "brave",
        status: response.status,
      });
      return { query, results: [] };
    }

    try {
      const data: unknown = await response.json();
      const results = extractResults(data);
      return { query, results: results.slice(0, MAX_RESULTS) };
    } catch {
      // Malformed JSON -- no body. Never throw.
      this.logger.warn("web_search.parse_failed", { provider: "brave", reason: "decode" });
      return { query, results: [] };
    }
  }
}

/** Brave response shape: { web: { results: [{ title, description, url }] } }. */
function extractResults(data: unknown): WebSearchResult[] {
  const web = prop(data, "web");
  const results = prop(web, "results");
  if (!Array.isArray(results)) {
    return [];
  }
  const out: WebSearchResult[] = [];
  for (const item of results) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as BraveResult;
    const url = typeof r.url === "string" ? r.url : "";
    const title = typeof r.title === "string" ? r.title : "";
    const snippet = typeof r.description === "string" ? r.description : "";
    if (url === "" && title === "") continue;
    out.push({ title, snippet, url });
  }
  return out;
}

function prop(value: unknown, key: string): unknown {
  if (typeof value === "object" && value !== null) {
    return (value as Record<string, unknown>)[key];
  }
  return undefined;
}
