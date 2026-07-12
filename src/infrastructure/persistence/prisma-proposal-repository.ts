import type { ProposalRepository } from "@/application/ports/proposal-repository";
import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import {
  isProposalStatus,
  type SavedProposal,
  type SavedProposalId,
  type SavedProposalLine,
} from "@/domain/proposal/saved-proposal";
import { prisma } from "./prisma-client";

/** Proposal lines are stored in a Json column (like lines on Shipment/AdditionalOrder). */
function toLines(raw: unknown): SavedProposalLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const line = item as Record<string, unknown>;
    return {
      productId: String(line.productId ?? "") as ProductId,
      productName: String(line.productName ?? ""),
      unit: String(line.unit ?? "kg"),
      quantity: Number(line.quantity ?? 0),
      unitPriceUsd: Number(line.unitPriceUsd ?? 0),
    };
  });
}

function toProposal(row: {
  id: string;
  dealId: string;
  clientId: string | null;
  revision: number;
  lines: unknown;
  prose: string;
  status: string;
  savedAt: Date;
}): SavedProposal {
  return {
    id: row.id as SavedProposalId,
    dealId: row.dealId as DealId,
    clientId: row.clientId ? (row.clientId as ClientId) : null,
    revision: row.revision,
    lines: toLines(row.lines),
    prose: row.prose,
    status: isProposalStatus(row.status) ? row.status : "draft",
    savedAt: row.savedAt.toISOString(),
  };
}

export class PrismaProposalRepository implements ProposalRepository {
  async save(proposal: SavedProposal): Promise<void> {
    const lines = proposal.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      unit: line.unit,
      quantity: line.quantity,
      unitPriceUsd: line.unitPriceUsd,
    }));
    const common = {
      clientId: proposal.clientId,
      revision: proposal.revision,
      lines,
      prose: proposal.prose,
      status: proposal.status,
      savedAt: new Date(proposal.savedAt),
    };
    await prisma.proposal.upsert({
      where: { dealId: proposal.dealId },
      create: { id: proposal.id, dealId: proposal.dealId, ...common },
      update: common,
    });
  }

  async findByDealId(dealId: DealId): Promise<SavedProposal | null> {
    const row = await prisma.proposal.findUnique({ where: { dealId } });
    return row ? toProposal(row) : null;
  }
}
