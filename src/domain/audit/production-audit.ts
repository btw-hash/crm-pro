import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { Id } from "@/domain/shared/id";

export type AuditId = Id<"AuditId">;

export interface DecisionMaker {
  readonly name: string;
  readonly role: string;
  readonly contact?: string;
}

/** "Production audit" checklist: equipment, client pain points, decision makers. */
export interface ProductionAudit {
  readonly id: AuditId;
  readonly dealId: DealId;
  readonly clientId: ClientId;
  readonly equipment: readonly string[];
  readonly painPoints: readonly string[];
  readonly decisionMakers: readonly DecisionMaker[];
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface CreateProductionAuditInput {
  readonly id: AuditId;
  readonly dealId: DealId;
  readonly clientId: ClientId;
  readonly equipment?: readonly string[];
  readonly painPoints?: readonly string[];
  readonly decisionMakers?: readonly DecisionMaker[];
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface UpdateProductionAuditInput {
  readonly equipment?: readonly string[];
  readonly painPoints?: readonly string[];
  readonly decisionMakers?: readonly DecisionMaker[];
  readonly notes?: string;
}

export class ProductionAuditValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionAuditValidationError";
  }
}

export class AuditNotFoundError extends Error {
  constructor(id: AuditId) {
    super(`Audit ${id} not found`);
    this.name = "AuditNotFoundError";
  }
}

/**
 * Applies a patch to an audit. A pure function; validates the resulting state
 * (an empty audit is not allowed even after a partial update).
 */
export function updateProductionAudit(
  current: ProductionAudit,
  patch: UpdateProductionAuditInput,
): ProductionAudit {
  const equipment = patch.equipment ?? current.equipment;
  const painPoints = patch.painPoints ?? current.painPoints;
  if (equipment.length === 0 && painPoints.length === 0) {
    throw new ProductionAuditValidationError(
      "Specify at least one piece of equipment or one client pain point",
    );
  }
  return {
    ...current,
    equipment,
    painPoints,
    decisionMakers: patch.decisionMakers ?? current.decisionMakers,
    ...(patch.notes !== undefined ? { notes: patch.notes } : { notes: current.notes }),
  };
}

/**
 * Creates an audit checklist with minimal validation. A pure function, no
 * side effects: id and createdAt are supplied by the calling layer
 * (use-case/presentation).
 */
export function createProductionAudit(input: CreateProductionAuditInput): ProductionAudit {
  const equipment = input.equipment ?? [];
  const painPoints = input.painPoints ?? [];

  if (input.dealId.trim() === "") {
    throw new ProductionAuditValidationError("An audit must be linked to a deal");
  }
  if (equipment.length === 0 && painPoints.length === 0) {
    throw new ProductionAuditValidationError(
      "Specify at least one piece of equipment or one client pain point",
    );
  }

  return {
    id: input.id,
    dealId: input.dealId,
    clientId: input.clientId,
    equipment,
    painPoints,
    decisionMakers: input.decisionMakers ?? [],
    notes: input.notes,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
  };
}
