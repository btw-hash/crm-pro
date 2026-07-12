import type { AuditRepository } from "@/application/ports/audit-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import {
  type CreateProductionAuditInput,
  createProductionAudit,
  type ProductionAudit,
} from "@/domain/audit/production-audit";
import { DealNotFoundError } from "./advance-deal-stage";

export type SaveProductionAuditInput = CreateProductionAuditInput;

export type SaveProductionAudit = (input: SaveProductionAuditInput) => Promise<ProductionAudit>;

/** Saves a production audit after checking that the deal exists and the data is valid. */
export function makeSaveProductionAudit(deps: {
  audits: AuditRepository;
  deals: DealRepository;
}): SaveProductionAudit {
  return async function saveProductionAudit(input) {
    const deal = await deps.deals.findById(input.dealId);
    if (!deal) {
      throw new DealNotFoundError(input.dealId);
    }
    const audit = createProductionAudit(input);
    await deps.audits.save(audit);
    return audit;
  };
}
