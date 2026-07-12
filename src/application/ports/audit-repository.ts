import type { AuditId, ProductionAudit } from "@/domain/audit/production-audit";
import type { DealId } from "@/domain/deal/deal";

export interface AuditRepository {
  save(audit: ProductionAudit): Promise<void>;
  update(audit: ProductionAudit): Promise<void>;
  findById(id: AuditId): Promise<ProductionAudit | null>;
  findByDealId(dealId: DealId): Promise<ProductionAudit | null>;
}
