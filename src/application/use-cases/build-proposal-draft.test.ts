import { describe, expect, it } from "vitest";
import type { Client, ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { Money } from "@/domain/pricing/money";
import type { Product, ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { ProposalValidationError } from "@/domain/proposal/proposal";
import { StubAiGateway } from "@/infrastructure/ai/stub-ai-gateway";
import { StubErpGateway } from "@/infrastructure/erp/stub-erp-gateway";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { InMemoryProductRepository } from "@/infrastructure/persistence/in-memory-product-repository";
import { makeBuildProposalDraft, ProductNotFoundError } from "./build-proposal-draft";

const clientId = makeId<"ClientId">("c1") as ClientId;
const productId1 = makeId<"ProductId">("p1") as ProductId;
const productId2 = makeId<"ProductId">("p2") as ProductId;
const dealId = makeId<"DealId">("d1");

const client: Client = {
  id: clientId,
  name: "Sweet World Confections",
  type: "confectioner",
  category: "A",
  responsibleManagerId: "m1",
};
const product1: Product = { id: productId1, sku: "CAR", name: "Coverlux Cover Glaze", unit: "kg" };
const product2: Product = { id: productId2, sku: "P500", name: "P500 Improver", unit: "kg" };
const product1WithRsp: Product = {
  id: productId1,
  sku: "CAR",
  name: "Coverlux Cover Glaze",
  unit: "kg",
  kit: {
    category: "Glazes",
    benefits: [],
    marginPercent: 38,
    shelfLife: "12 months",
    rsp: Money.dollars(5.75),
  },
};
const deal: Deal = {
  id: dealId,
  clientId,
  title: "Deal",
  stage: "quote",
  responsibleManagerId: "m1",
};

function buildUseCase(products: Product[] = [product1, product2]) {
  return makeBuildProposalDraft({
    deals: new InMemoryDealRepository([deal]),
    clients: new InMemoryClientRepository([client]),
    products: new InMemoryProductRepository(products),
    erp: new StubErpGateway(
      [
        { clientId, productId: productId1, price: Money.dollars(4.5) },
        { clientId, productId: productId2, price: Money.dollars(1.7) },
      ],
      [],
      [],
    ),
    ai: new StubAiGateway(),
  });
}

const baseEconomics = {
  monthlyOutput: Money.dollars(31_000),
  defectBeforePercent: 5,
  defectAfterPercent: 0.2,
};

describe("buildProposalDraft (multi-item)", () => {
  it("single line item: price from ERP, lineTotal and totalCost are correct", async () => {
    const draft = await buildUseCase()({
      dealId,
      items: [{ productId: productId1, quantity: 3000 }],
      ...baseEconomics,
    });

    expect(draft.lines).toHaveLength(1);
    const line = draft.lines[0]!;
    expect(line.productName).toBe("Coverlux Cover Glaze");
    expect(line.unitPrice?.amountMinor).toBe(450); // $4.50
    // 4.50 x 3000 = $13,500.00
    expect(line.lineTotal?.amountMinor).toBe(1_350_000);
    expect(draft.totalCost?.amountMinor).toBe(1_350_000);
    // Economics: $31,000 x 4.8% = $1,488.00/month
    expect(draft.economics.savingsPerMonth.amountMinor).toBe(148_800);
    expect(draft.prose).toContain("Sweet World");
  });

  it("two line items: lines contains both, totalCost = sum of lineTotals", async () => {
    const draft = await buildUseCase()({
      dealId,
      items: [
        { productId: productId1, quantity: 1000 },
        { productId: productId2, quantity: 500 },
      ],
      ...baseEconomics,
    });

    expect(draft.lines).toHaveLength(2);
    const [line0, line1] = draft.lines as [(typeof draft.lines)[0], (typeof draft.lines)[0]];
    // 4.50 x 1000 = $4,500.00
    expect(line0.lineTotal?.amountMinor).toBe(450_000);
    // 1.70 x 500 = $850.00 = 85,000 cents
    expect(line1.lineTotal?.amountMinor).toBe(85_000);
    // total = $4,500.00 + $850.00 = $5,350.00 = 535,000 cents
    expect(draft.totalCost?.amountMinor).toBe(535_000);
  });

  it("line item without an ERP price: lineTotal null, totalCost computed only from priced lines", async () => {
    const useCase = makeBuildProposalDraft({
      deals: new InMemoryDealRepository([deal]),
      clients: new InMemoryClientRepository([client]),
      products: new InMemoryProductRepository([product1, product2]),
      erp: new StubErpGateway(
        [{ clientId, productId: productId1, price: Money.dollars(4.5) }],
        [],
        [],
      ),
      ai: new StubAiGateway(),
    });

    const draft = await useCase({
      dealId,
      items: [
        { productId: productId1, quantity: 1000 },
        { productId: productId2, quantity: 500 },
      ],
      ...baseEconomics,
    });

    const [l0, l1] = draft.lines as [(typeof draft.lines)[0], (typeof draft.lines)[0]];
    expect(l0.lineTotal?.amountMinor).toBe(450_000);
    expect(l1.unitPrice).toBeNull();
    expect(l1.lineTotal).toBeNull();
    // totalCost = only the priced line item
    expect(draft.totalCost?.amountMinor).toBe(450_000);
  });

  it("all line items without a price: totalCost null", async () => {
    const useCase = makeBuildProposalDraft({
      deals: new InMemoryDealRepository([deal]),
      clients: new InMemoryClientRepository([client]),
      products: new InMemoryProductRepository([product1]),
      erp: new StubErpGateway([], [], []),
      ai: new StubAiGateway(),
    });

    const draft = await useCase({
      dealId,
      items: [{ productId: productId1, quantity: 100 }],
      ...baseEconomics,
    });

    expect(draft.lines[0]!.lineTotal).toBeNull();
    expect(draft.totalCost).toBeNull();
  });

  it("no individual price, RSP present -> RSP is used, total is computed", async () => {
    const useCase = makeBuildProposalDraft({
      deals: new InMemoryDealRepository([deal]),
      clients: new InMemoryClientRepository([client]),
      products: new InMemoryProductRepository([product1WithRsp]),
      erp: new StubErpGateway([], [], []),
      ai: new StubAiGateway(),
    });

    const draft = await useCase({
      dealId,
      items: [{ productId: productId1, quantity: 1000 }],
      ...baseEconomics,
    });

    const line = draft.lines[0]!;
    // RSP = $5.75 = 575 cents
    expect(line.unitPrice?.amountMinor).toBe(575);
    // 5.75 x 1000 = $5,750.00 = 575,000 cents
    expect(line.lineTotal?.amountMinor).toBe(575_000);
    expect(draft.totalCost?.amountMinor).toBe(575_000);
  });

  it("individual price and RSP present -> individual price is used", async () => {
    const useCase = makeBuildProposalDraft({
      deals: new InMemoryDealRepository([deal]),
      clients: new InMemoryClientRepository([client]),
      products: new InMemoryProductRepository([product1WithRsp]),
      erp: new StubErpGateway(
        [{ clientId, productId: productId1, price: Money.dollars(4.5) }],
        [],
        [],
      ),
      ai: new StubAiGateway(),
    });

    const draft = await useCase({
      dealId,
      items: [{ productId: productId1, quantity: 1000 }],
      ...baseEconomics,
    });

    const line = draft.lines[0]!;
    // Individual price = $4.50 = 450 cents, not RSP ($5.75)
    expect(line.unitPrice?.amountMinor).toBe(450);
    expect(line.lineTotal?.amountMinor).toBe(450_000);
  });

  it("empty items array -> ProposalValidationError", async () => {
    await expect(buildUseCase()({ dealId, items: [], ...baseEconomics })).rejects.toThrow(
      ProposalValidationError,
    );
  });

  it("quantity <= 0 -> ProposalValidationError", async () => {
    await expect(
      buildUseCase()({
        dealId,
        items: [{ productId: productId1, quantity: 0 }],
        ...baseEconomics,
      }),
    ).rejects.toThrow(ProposalValidationError);
  });

  it("nonexistent product -> ProductNotFoundError", async () => {
    const unknownId = makeId<"ProductId">("unknown") as ProductId;
    await expect(
      buildUseCase()({
        dealId,
        items: [{ productId: unknownId, quantity: 100 }],
        ...baseEconomics,
      }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("prose contains the client name, AI text is formed", async () => {
    const draft = await buildUseCase()({
      dealId,
      items: [
        { productId: productId1, quantity: 100 },
        { productId: productId2, quantity: 200 },
      ],
      ...baseEconomics,
    });
    expect(draft.prose).toContain("Sweet World");
  });
});
