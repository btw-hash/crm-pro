import { afterEach, describe, expect, it, vi } from "vitest";
import { ErpWriteError } from "@/application/ports/erp-gateway";
import type { ClientId } from "@/domain/client/client";
import type { ProductId } from "@/domain/product/product";
import type { Logger } from "@/infrastructure/logging/logger";
import { makeId } from "@/domain/shared/id";
import { ODataErpGateway } from "./odata-erp-gateway";

const logger: Logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
const config = { baseUrl: "http://erp.test", username: "u", password: "p" };
const clientId = makeId<"ClientId">("client-bakery-plant-1") as ClientId;
const productId = makeId<"ProductId">("product-noirelle-nv") as ProductId;

function odataRes(value: unknown[], status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ "odata.metadata": "...", value }),
  } as unknown as Response;
}

function jsonRes(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function mockFetch(): ReturnType<typeof vi.fn> {
  const fn = vi.fn();
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ODataErpGateway reads", () => {
  it("getIndividualPrice: maps Price to Money and sends Basic auth + $filter", async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValueOnce(odataRes([{ Price: 742.5 }]));
    const erp = new ODataErpGateway(config, logger);

    const price = await erp.getIndividualPrice(clientId, productId);

    expect(price?.price.amountMinor).toBe(74250);
    expect(price?.clientId).toBe(clientId);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(String(url)).toContain("InformationRegister_");
    expect(String(url)).toContain("$format=json");
    expect(decodeURIComponent(String(url))).toContain("Client_Key eq 'client-bakery-plant-1'");
    // A space is encoded as %20, not `+` (OData ERP requirement).
    expect(String(url)).not.toContain("+eq+");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Basic dTpw" });
  });

  it("getIndividualPrice: empty value → null", async () => {
    mockFetch().mockResolvedValueOnce(odataRes([]));
    const erp = new ODataErpGateway(config, logger);
    expect(await erp.getIndividualPrice(clientId, productId)).toBeNull();
  });

  it("getStockLevel: maps the free balance and unit", async () => {
    mockFetch().mockResolvedValueOnce(
      odataRes([{ Product_Key: "product-noirelle-nv", FreeBalance: 150, Unit: "kg" }]),
    );
    const erp = new ODataErpGateway(config, logger);
    const stock = await erp.getStockLevel(productId);
    expect(stock).toEqual({ productId, freeQuantity: 150, unit: "kg" });
  });

  it("getClientBalance: maps debt and credit limit to Money", async () => {
    mockFetch().mockResolvedValueOnce(odataRes([{ Debt: 320000, CreditLimit: 1000000 }]));
    const erp = new ODataErpGateway(config, logger);
    const bal = await erp.getClientBalance(clientId);
    expect(bal?.debt.amountMinor).toBe(32_000_000);
    expect(bal?.creditLimit.amountMinor).toBe(100_000_000);
  });

  it("getSalesHistory: a sales document → SalesOrder with lines", async () => {
    mockFetch().mockResolvedValueOnce(
      odataRes([
        {
          Ref_Key: "rtu-0001",
          Client_Key: "client-bakery-plant-1",
          Manager: "manager-owens",
          DocumentTotal: 150000,
          Date: "2026-01-15T00:00:00",
          Lines: [{ Product_Key: "product-noirelle-nv", Quantity: 214, Amount: 150000 }],
        },
      ]),
    );
    const erp = new ODataErpGateway(config, logger);
    const orders = await erp.getSalesHistory({ clientId });
    expect(orders).toHaveLength(1);
    expect(orders[0]!.total.amountMinor).toBe(15_000_000);
    expect(orders[0]!.lines[0]!.quantity).toBe(214);
    expect(orders[0]!.managerId).toBe("manager-owens");
  });
});

describe("ODataErpGateway.reserveStock", () => {
  it("success → ok with the remaining balance after the reservation", async () => {
    mockFetch().mockResolvedValueOnce(
      jsonRes({ ok: true, Reserved: 50, FreeBalance: 150, Unit: "kg" }, 201),
    );
    const erp = new ODataErpGateway(config, logger);
    const res = await erp.reserveStock(productId, 50);
    expect(res).toEqual({ ok: true, reservedQuantity: 50, remainingFree: 150, unit: "kg" });
  });

  it("shortage → ok:false with the available quantity", async () => {
    mockFetch().mockResolvedValueOnce(jsonRes({ ok: false, Available: 10, Unit: "kg" }));
    const erp = new ODataErpGateway(config, logger);
    const res = await erp.reserveStock(productId, 50);
    expect(res).toEqual({ ok: false, available: 10, unit: "kg" });
  });
});

describe("ODataErpGateway.createCustomerOrder", () => {
  const draft = {
    clientId,
    lines: [{ productId, quantity: 200 }],
    shipmentDate: "2026-07-01",
    idempotencyKey: "order:deal-6",
  };

  it("new key: GET empty → POST → number, idempotent=false", async () => {
    const fetchFn = mockFetch();
    fetchFn
      .mockResolvedValueOnce(odataRes([])) // GET by key
      .mockResolvedValueOnce(jsonRes({ Number: "CO-2026-0030" }, 201)); // POST
    const erp = new ODataErpGateway(config, logger);

    const res = await erp.createCustomerOrder(draft);

    expect(res).toEqual({ orderNumber: "CO-2026-0030", idempotent: false });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const postInit = fetchFn.mock.calls[1]![1] as RequestInit;
    expect(postInit.method).toBe("POST");
    expect(JSON.parse(String(postInit.body))).toMatchObject({ ShipmentDate: "2026-07-01" });
  });

  it("retry: GET finds the document → same number, idempotent=true, no POST", async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValueOnce(odataRes([{ Number: "CO-2026-0030" }]));
    const erp = new ODataErpGateway(config, logger);

    const res = await erp.createCustomerOrder(draft);

    expect(res).toEqual({ orderNumber: "CO-2026-0030", idempotent: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("ERP rejected it with no date → ErpWriteError(missing_required_field)", async () => {
    const fetchFn = mockFetch();
    fetchFn
      .mockResolvedValueOnce(odataRes([]))
      .mockResolvedValueOnce(jsonRes({ "odata.error": { code: "MISSING_REQUIRED_FIELD" } }, 400));
    const erp = new ODataErpGateway(config, logger);

    await expect(erp.createCustomerOrder({ ...draft, shipmentDate: "" })).rejects.toMatchObject({
      name: "ErpWriteError",
      reason: "missing_required_field",
    });
  });

  it("network down on write → ErpWriteError(unavailable)", async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValueOnce(odataRes([])).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const erp = new ODataErpGateway(config, logger);

    const err = await erp.createCustomerOrder(draft).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ErpWriteError);
    expect((err as ErpWriteError).reason).toBe("unavailable");
  });
});
