import type { AuditRepository } from "@/application/ports/audit-repository";
import type { AuditId, ProductionAudit } from "@/domain/audit/production-audit";
import type { DealId } from "@/domain/deal/deal";

export class InMemoryAuditRepository implements AuditRepository {
  private readonly audits = new Map<AuditId, ProductionAudit>();

  constructor(seed: readonly ProductionAudit[] = []) {
    for (const audit of seed) {
      this.audits.set(audit.id, audit);
    }
  }

  async save(audit: ProductionAudit): Promise<void> {
    this.audits.set(audit.id, audit);
  }

  async update(audit: ProductionAudit): Promise<void> {
    this.audits.set(audit.id, audit);
  }

  async findById(id: AuditId): Promise<ProductionAudit | null> {
    return this.audits.get(id) ?? null;
  }

  async findByDealId(dealId: DealId): Promise<ProductionAudit | null> {
    for (const audit of this.audits.values()) {
      if (audit.dealId === dealId) {
        return audit;
      }
    }
    return null;
  }
}
