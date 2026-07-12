import type { OnboardingRepository } from "@/application/ports/onboarding-repository";
import type {
  Onboarding,
  OnboardingDoc,
  OnboardingId,
  OnboardingStatus,
} from "@/domain/onboarding/onboarding";
import { prisma } from "./prisma-client";

function toOnboarding(row: {
  id: string;
  clientName: string;
  ein: string | null;
  status: string;
  documents: unknown;
  requestedBy: string;
  legalNote: string | null;
  createdAt: Date;
}): Onboarding {
  return {
    id: row.id as OnboardingId,
    clientName: row.clientName,
    ein: row.ein,
    status: row.status as OnboardingStatus,
    documents: row.documents as readonly OnboardingDoc[],
    requestedBy: row.requestedBy,
    legalNote: row.legalNote,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PrismaOnboardingRepository implements OnboardingRepository {
  async save(onboarding: Onboarding): Promise<void> {
    await prisma.onboarding.upsert({
      where: { id: onboarding.id },
      create: {
        id: onboarding.id,
        clientName: onboarding.clientName,
        ein: onboarding.ein,
        status: onboarding.status,
        documents: onboarding.documents as unknown as object[],
        requestedBy: onboarding.requestedBy,
        legalNote: onboarding.legalNote,
        createdAt: new Date(onboarding.createdAt),
      },
      update: {
        status: onboarding.status,
        documents: onboarding.documents as unknown as object[],
        legalNote: onboarding.legalNote,
      },
    });
  }

  async findById(id: OnboardingId): Promise<Onboarding | null> {
    const row = await prisma.onboarding.findUnique({ where: { id } });
    return row ? toOnboarding(row) : null;
  }

  async list(): Promise<readonly Onboarding[]> {
    const rows = await prisma.onboarding.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toOnboarding);
  }
}
