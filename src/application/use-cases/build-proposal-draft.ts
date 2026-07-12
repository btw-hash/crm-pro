import type { AiGateway } from "@/application/ports/ai-gateway";
import type { ClientRepository } from "@/application/ports/client-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { ProposalDraft, ProposalLineDraft } from "@/application/dto/proposal-draft";
import type { DealId } from "@/domain/deal/deal";
import type { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import {
  computeEconomics,
  computeProposalTotal,
  ProposalValidationError,
} from "@/domain/proposal/proposal";
import { ClientNotFoundError } from "./get-client-card";
import { DealNotFoundError } from "./advance-deal-stage";

export class ProductNotFoundError extends Error {
  constructor(readonly productId: ProductId) {
    super(`Product not found: ${productId}`);
    this.name = "ProductNotFoundError";
  }
}

export interface BuildProposalItemInput {
  readonly productId: ProductId;
  readonly quantity: number;
}

export interface BuildProposalInput {
  readonly dealId: DealId;
  /** One or more line items (at least 1). */
  readonly items: readonly BuildProposalItemInput[];
  /** Client's monthly output of finished goods, in money. */
  readonly monthlyOutput: Money;
  readonly defectBeforePercent: number;
  readonly defectAfterPercent: number;
}

export type BuildProposalDraft = (input: BuildProposalInput) => Promise<ProposalDraft>;

export interface BuildProposalDeps {
  readonly deals: DealRepository;
  readonly clients: ClientRepository;
  readonly products: ProductRepository;
  readonly erp: ErpGateway;
  readonly ai: AiGateway;
}

/**
 * Builds a proposal draft: prices from the ERP for each line item, economics
 * computed deterministically (computeEconomics), the AI drafts the accompanying
 * text. Numbers are never invented by the AI; a human confirms the result.
 */
export function makeBuildProposalDraft(deps: BuildProposalDeps): BuildProposalDraft {
  return async function buildProposalDraft(input) {
    if (input.items.length === 0) {
      throw new ProposalValidationError("A proposal must contain at least one line item.");
    }
    for (const item of input.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new ProposalValidationError("Quantity for each line item must be greater than zero.");
      }
    }

    const deal = await deps.deals.findById(input.dealId);
    if (!deal) {
      throw new DealNotFoundError(input.dealId);
    }

    const client = await deps.clients.findById(deal.clientId);
    if (!client) {
      throw new ClientNotFoundError(deal.clientId);
    }

    const lines: ProposalLineDraft[] = await Promise.all(
      input.items.map(async (item) => {
        const product = await deps.products.findById(item.productId);
        if (!product) {
          throw new ProductNotFoundError(item.productId);
        }
        const individualPrice = await deps.erp.getIndividualPrice(deal.clientId, item.productId);
        const unitPrice = individualPrice?.price ?? product.kit?.rsp ?? null;
        const lineTotal = unitPrice ? unitPrice.multiply(item.quantity) : null;
        return {
          productId: String(item.productId),
          productName: product.name,
          unit: product.unit,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        };
      }),
    );

    const totalCost = computeProposalTotal(lines);

    const economics = computeEconomics({
      monthlyOutput: input.monthlyOutput,
      defectBeforePercent: input.defectBeforePercent,
      defectAfterPercent: input.defectAfterPercent,
    });

    // Build a name summary for the AI text; don't change the AiGateway signature.
    const names = lines.map((l) => l.productName);
    const productNameSummary =
      names.length <= 2
        ? names.join(", ")
        : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more item(s)`;

    const prose = await deps.ai.draftProposalText({
      clientName: client.name,
      productName: productNameSummary,
      savingsPerMonth: economics.savingsPerMonth.format(),
      defectReductionPercent: economics.defectReductionPercent,
    });

    return {
      client,
      lines,
      totalCost,
      economics,
      prose,
    };
  };
}
