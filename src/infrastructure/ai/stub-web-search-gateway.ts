import type { WebSearchGateway, WebSearchResponse } from "@/application/ports/web-search-gateway";

/**
 * Deterministic web-search stub. Returns fixed results keyed off the query's
 * keywords — no network, no API key. Used when WEB_SEARCH_MODE != "live" (the
 * default). A real provider (e.g. Tavily, Google Custom Search) plugs into the same
 * port via env.
 */
export class StubWebSearchGateway implements WebSearchGateway {
  async search(query: string): Promise<WebSearchResponse> {
    const q = query.toLowerCase();
    if (/confection|bakery|bakeries/.test(q)) {
      return {
        query,
        results: [
          {
            title: "Sweet World Confections — custom cakes and pastries",
            snippet:
              "Professional confectionery production. Cakes, pastries, and eclairs made to order for B2B clients.",
            url: "https://example-confectioner.com",
          },
          {
            title: "Sunrise Bakery Co. — wholesale baked goods",
            snippet: "Wholesale bread and pastries for cafes, restaurants, and grocery stores.",
            url: "https://example-bakery.com",
          },
        ],
      };
    }
    if (/supplier|manufacturer|ingredient/.test(q)) {
      return {
        query,
        results: [
          {
            title: "US food ingredient market — a supplier overview",
            snippet: "Key food-ingredient suppliers: Puratos, Barry Callebaut, Zeelandia.",
            url: "https://example-market.com/ingredients",
          },
        ],
      };
    }
    return {
      query,
      results: [
        {
          title: `Search results: "${query}" (stub)`,
          snippet:
            "This is a deterministic search stub. Connect a real provider (WEB_SEARCH_MODE=live).",
          url: "https://example.com/stub",
        },
      ],
    };
  }
}
