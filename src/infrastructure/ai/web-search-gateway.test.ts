import { afterEach, describe, expect, it, vi } from "vitest";
import { BraveSearchGateway } from "./web-search-gateway";

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const config = { apiKey: "key-secret-123", baseUrl: "https://api.search.brave.com" };

function braveResponse(results: readonly { url: string; title: string; description: string }[]) {
  return { web: { results } };
}

function mockSearchFetch(body: unknown, opts?: { ok?: boolean; status?: number }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: opts?.ok ?? true,
    status: opts?.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("BraveSearchGateway", () => {
  it("maps title/snippet/url and sends q + auth header", async () => {
    const fetchMock = mockSearchFetch(
      braveResponse([
        {
          url: "https://supplier-a.example",
          title: "Supplier A -- ingredients wholesale",
          description: "Cocoa powder and chocolate. Nationwide delivery.",
        },
      ]),
    );
    const gw = new BraveSearchGateway(config, logger);

    const res = await gw.search("ingredient suppliers");

    expect(res.query).toBe("ingredient suppliers");
    expect(res.results).toEqual([
      {
        title: "Supplier A -- ingredients wholesale",
        snippet: "Cocoa powder and chocolate. Nationwide delivery.",
        url: "https://supplier-a.example",
      },
    ]);

    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch was not called");
    const [url, init] = call as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://api.search.brave.com/res/v1/web/search?q=ingredient%20suppliers");
    expect(init.headers["X-Subscription-Token"]).toBe("key-secret-123");
  });

  it("caps results at 5", async () => {
    const results = Array.from({ length: 8 }, (_, i) => ({
      url: `https://r${i}.example`,
      title: `Result ${i}`,
      description: `snippet ${i}`,
    }));
    mockSearchFetch(braveResponse(results));
    const gw = new BraveSearchGateway(config, logger);

    const res = await gw.search("many results");

    expect(res.results).toHaveLength(5);
    expect(res.results[0]?.url).toBe("https://r0.example");
    expect(res.results[4]?.url).toBe("https://r4.example");
  });

  it("non-200 -> empty list, does not throw, key never logged", async () => {
    mockSearchFetch({}, { ok: false, status: 403 });
    const gw = new BraveSearchGateway(config, logger);

    const res = await gw.search("query");

    expect(res).toEqual({ query: "query", results: [] });
    expect(logger.warn).toHaveBeenCalledWith("web_search.request_failed", {
      provider: "brave",
      status: 403,
    });
    assertNoKeyInLogs();
  });

  it("fetch throws (network) -> empty list, does not throw", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);
    const gw = new BraveSearchGateway(config, logger);

    const res = await gw.search("query");

    expect(res).toEqual({ query: "query", results: [] });
    expect(logger.warn).toHaveBeenCalledWith(
      "web_search.request_failed",
      expect.objectContaining({ provider: "brave" }),
    );
    assertNoKeyInLogs();
  });

  it("malformed JSON body -> empty list, does not throw", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);
    const gw = new BraveSearchGateway(config, logger);

    const res = await gw.search("query");

    expect(res.results).toEqual([]);
    assertNoKeyInLogs();
  });

  it("no web.results field in response -> empty list, does not throw", async () => {
    mockSearchFetch({ somethingElse: 1 });
    const gw = new BraveSearchGateway(config, logger);

    const res = await gw.search("query");

    expect(res.results).toEqual([]);
  });
});

/** Asserts the API key never lands in a logger call. */
function assertNoKeyInLogs() {
  const all = [
    ...logger.warn.mock.calls,
    ...logger.info.mock.calls,
    ...logger.error.mock.calls,
    ...logger.debug.mock.calls,
  ];
  const serialized = JSON.stringify(all);
  expect(serialized).not.toContain("key-secret-123");
}
