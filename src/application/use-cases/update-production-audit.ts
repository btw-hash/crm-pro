import type { AuditRepository } from "@/application/ports/audit-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import {
  AuditNotFoundError,
  type ProductionAudit,
  type UpdateProductionAuditInput,
  updateProductionAudit,
} from "@/domain/audit/production-audit";
import type { AuditId } from "@/domain/audit/production-audit";
import { DealNotFoundError } from "./advance-deal-stage";

export interface UpdateProductionAuditUseCaseInput extends UpdateProductionAuditInput {
  readonly auditId: AuditId;
}

export type UpdateProductionAudit = (
  input: UpdateProductionAuditUseCaseInput,
) => Promise<ProductionAudit>;

/** Updates fields of an existing production audit. */
export function makeUpdateProductionAudit(deps: {
  audits: AuditRepository;
  deals: DealRepository;
}): UpdateProductionAudit {
  return async function updateProductionAuditUseCase(input) {
    const current = await deps.audits.findById(input.auditId);
    if (!current) {
      throw new AuditNotFoundError(input.auditId);
    }
    const deal = await deps.deals.findById(current.dealId);
    if (!deal) {
      throw new DealNotFoundError(current.dealId);
    }
    const updated = updateProductionAudit(current, input);
    await deps.audits.update(updated);
    return updated;
  };
}
