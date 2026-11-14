import { describe, expect, it } from "vitest";
import type { NotifyInput } from "@/application/ports/notifier";
import { makeId } from "@/domain/shared/id";
import { TechRequestError } from "@/domain/tech-request/tech-request";
import { InMemoryTechRequestRepository } from "@/infrastructure/persistence/in-memory-tech-request-repository";
import { makeCreateTechRequest, type CreateTechRequestInput } from "./create-tech-request";

function buildDeps() {
  const techRequests = new InMemoryTechRequestRepository();
  const sent: NotifyInput[] = [];
  const notifier = {
    notify: async (n: NotifyInput) => {
      sent.push(n);
    },
  };
  return { techRequests, notifier, sent };
}

function input(overrides: Partial<CreateTechRequestInput> = {}): CreateTechRequestInput {
  return {
    id: makeId<"TechRequestId">("tr1"),
    dealId: makeId<"DealId">("d1"),
    clientId: makeId<"ClientId">("c1"),
    kind: "consult",
    note: "Question about dosage",
    requestedBy: "manager-owens",
    createdAt: "2026-06-24T10:00:00Z",
    dealTitle: "Noirelle deal",
    technologistIds: ["tech-kent", "tech-derek"],
    ...overrides,
  };
}

describe("createTechRequest use-case", () => {
  it("saves the request in the repository with status open", async () => {
    const { techRequests, notifier } = buildDeps();
    const useCase = makeCreateTechRequest({ techRequests, notifier });

    const req = await useCase(input());

    expect(req.status).toBe("open");
    expect(await techRequests.findById(req.id)).not.toBeNull();
  });

  it("notifies all technologists in the list", async () => {
    const { techRequests, notifier, sent } = buildDeps();
    const useCase = makeCreateTechRequest({ techRequests, notifier });

    await useCase(input());

    expect(sent).toHaveLength(2);
    expect(sent[0]?.recipientId).toBe("tech-kent");
    expect(sent[1]?.recipientId).toBe("tech-derek");
    expect(sent[0]?.message).toContain("Noirelle");
  });

  it("the notification contains the request kind and the note", async () => {
    const { techRequests, notifier, sent } = buildDeps();
    const useCase = makeCreateTechRequest({ techRequests, notifier });

    await useCase(input({ kind: "onsite", note: "Visit for a demo" }));

    expect(sent[0]?.message).toContain("Plant visit");
    expect(sent[0]?.message).toContain("Visit for a demo");
  });

  it("does not create a request for an empty note", async () => {
    const { techRequests, notifier } = buildDeps();
    const useCase = makeCreateTechRequest({ techRequests, notifier });

    await expect(useCase(input({ note: "  " }))).rejects.toThrow(TechRequestError);
    expect(await techRequests.listOpen()).toHaveLength(0);
  });
});
