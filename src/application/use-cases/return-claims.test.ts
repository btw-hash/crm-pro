import { describe, expect, it } from "vitest";
import type { Client, ClientId } from "@/domain/client/client";
import { ReturnClaimError } from "@/domain/return-claim/return-claim";
import { makeId } from "@/domain/shared/id";
import type { Viewer } from "@/domain/shared/viewer";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryReturnClaimRepository } from "@/infrastructure/persistence/in-memory-return-claim-repository";
import { makeFileReturnClaim } from "./file-return-claim";
import { makeAdvanceReturnClaim, makeRejectReturnClaim } from "./progress-return-claim";

const clientId = makeId<"ClientId">("c1") as ClientId;
const client: Client = {
  id: clientId,
  name: "Client",
  type: "industry",
  category: "A",
  responsibleManagerId: "m1",
};

const owner: Viewer = { id: "m1", role: "mop" };
const otherMop: Viewer = { id: "m2", role: "mop" };
const head: Viewer = { id: "boss", role: "head" };

function build() {
  const clients = new InMemoryClientRepository([client]);
  const returns = new InMemoryReturnClaimRepository();
  return {
    returns,
    file: makeFileReturnClaim({ clients, returns }),
    advance: makeAdvanceReturnClaim({ clients, returns }),
    reject: makeRejectReturnClaim({ clients, returns }),
  };
}

const fileInput = (viewer: Viewer) => ({
  viewer,
  id: makeId<"ReturnClaimId">(`r-${viewer.id}`),
  clientId,
  productName: "Chocolate",
  quantity: 10,
  reason: "defect" as const,
  createdAt: "2026-06-24T00:00:00.000Z",
});

describe("fileReturnClaim", () => {
  it('the owning manager files a return for their own client (status "requested")', async () => {
    const { file } = build();
    const claim = await file(fileInput(owner));
    expect(claim.status).toBe("requested");
    expect(claim.createdBy).toBe("m1");
  });

  it("a different manager cannot file a return for a client that isn't theirs", async () => {
    const { file } = build();
    await expect(file(fileInput(otherMop))).rejects.toBeInstanceOf(ReturnClaimError);
  });

  it("a head of sales can file a return for any client", async () => {
    const { file } = build();
    const claim = await file(fileInput(head));
    expect(claim.status).toBe("requested");
  });
});

describe("advance/reject return", () => {
  it("moves the return through the process and saves it", async () => {
    const ctx = build();
    const created = await ctx.file(fileInput(owner));
    const advanced = await ctx.advance({ viewer: owner, id: created.id });
    expect(advanced.status).toBe("invoice_issued");
    expect((await ctx.returns.findById(created.id))?.status).toBe("invoice_issued");
  });

  it("a different manager cannot advance someone else's return", async () => {
    const ctx = build();
    const created = await ctx.file(fileInput(owner));
    await expect(ctx.advance({ viewer: otherMop, id: created.id })).rejects.toBeInstanceOf(
      ReturnClaimError,
    );
  });

  it("rejects a return claim", async () => {
    const ctx = build();
    const created = await ctx.file(fileInput(owner));
    const rejected = await ctx.reject({ viewer: owner, id: created.id });
    expect(rejected.status).toBe("rejected");
  });
});
