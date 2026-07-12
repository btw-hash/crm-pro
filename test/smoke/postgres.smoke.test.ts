import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type AppContainer, getContainer } from "@/infrastructure/composition-root";
import { prisma } from "@/infrastructure/persistence/prisma-client";
import { PrismaShipmentRepository } from "@/infrastructure/persistence/prisma-shipment-repository";
import { PrismaTechRequestRepository } from "@/infrastructure/persistence/prisma-tech-request-repository";
import { clientIds } from "@/infrastructure/persistence/seed/refs";
import { makeId } from "@/domain/shared/id";
import type { Shipment } from "@/domain/shipment/shipment";
import { createTechRequest } from "@/domain/tech-request/tech-request";

// A smoke round-trip of the ENTIRE postgres path (wave A+B adapters) against a REAL
// Postgres. Closes a risk: these Prisma repositories and the postgres branch of the
// composition-root had never run against a live DB (no Docker locally). The CI job
// `postgres-smoke` spins up Postgres, applies the schema (`prisma db push`), seeds it
// (`db:seed`), and runs this suite.
//
// The assertions focus on three mapping risk zones that memory-mode tests don't cover:
//   • Json round-trip       — lines (additional-order), documents (onboarding);
//   • nullable "X | null"   — dealId/note/legalNote come back as null, not undefined;
//   • DateTime <-> ISO string — createdAt is written as new Date(), read via .toISOString().

let app: AppContainer;

beforeAll(() => {
  // Guard: this smoke test only makes sense against a real Postgres. If the env vars
  // are missing, fail loudly (rather than silently falling back to memory mode and
  // pretending the postgres path was verified).
  if (process.env.PERSISTENCE_MODE !== "postgres" || !process.env.DATABASE_URL) {
    throw new Error(
      "postgres-smoke requires PERSISTENCE_MODE=postgres and DATABASE_URL (a real Postgres). " +
        "Run it via the postgres-smoke CI job, or locally against a running container.",
    );
  }
  // The call itself verifies that the composition-root wires the Prisma branches in
  // postgres mode.
  app = getContainer();
});

afterAll(async () => {
  // Close the pool so Vitest doesn't hang on an open connection.
  await prisma.$disconnect();
});

describe("postgres smoke — reading seed data through the Prisma adapters", () => {
  it("listClients reads seed data from the DB", async () => {
    // The head-of-sales viewer isn't owner-scoped -> sees all clients.
    const clients = await app.listClients({ id: "smoke-head", role: "head" });
    expect(clients.length).toBeGreaterThan(0);
    expect(clients.some((c) => c.id === clientIds.hlebozavod)).toBe(true);
  });

  it("listClientReturns: nullable FK (dealId=null) + non-null comment + DateTime<->ISO", async () => {
    const returns = await app.listClientReturns(clientIds.hlebozavod);
    const ret = returns.find((r) => r.id === "ret-1");
    expect(ret).toBeDefined();
    expect(ret!.dealId).toBeNull(); // nullable FK comes back as null, not undefined
    expect(ret!.comment).not.toBeNull(); // non-null text is preserved
    expect(ret!.quantity).toBe(25); // Float
    expect(ret!.reason).toBe("defect"); // String -> union
    expect(typeof ret!.createdAt).toBe("string");
    expect(ret!.createdAt).toMatch(/T.*Z$/); // .toISOString() applied
  });

  it("listOnboardings: Json documents round-trip (nested boolean stays a boolean) + nullable legalNote", async () => {
    const items = await app.listOnboardings();
    expect(items.length).toBeGreaterThan(0);

    const collecting = items.find((o) => o.status === "collecting");
    expect(collecting).toBeDefined();
    expect(Array.isArray(collecting!.documents)).toBe(true);
    expect(collecting!.documents.length).toBeGreaterThan(0);
    // The OnboardingDoc shape survives the Json round-trip: name=string, collected=boolean.
    expect(collecting!.documents[0]).toMatchObject({
      name: expect.any(String),
      collected: expect.any(Boolean),
    });
    expect(collecting!.legalNote).toBeNull(); // still collecting docs -> no legal resolution yet -> null

    const rejected = items.find((o) => o.status === "rejected");
    expect(rejected).toBeDefined();
    expect(typeof rejected!.legalNote).toBe("string"); // the non-null side of the nullable field
  });

  it("listQuotas: Int period + Float volumes", async () => {
    const quotas = await app.listQuotas();
    expect(quotas.length).toBeGreaterThan(0);
    const q = quotas[0]!;
    expect(Number.isInteger(q.period.year)).toBe(true);
    expect([1, 2, 3, 4]).toContain(q.period.quarter);
    expect(typeof q.plannedVolume).toBe("number");
  });
});

describe("postgres smoke — WRITE round-trip (additional-order, no seed data)", () => {
  // A fixed id + upsert in the adapter -> idempotent (safe on a fresh CI DB and on reruns).
  const orderId = makeId<"AdditionalOrderId">("smoke-ao-1");
  const shipmentDate = "2026-06-27";
  const parentOrderNumber = "SMOKE-PARENT-1";
  const createdAt = "2026-06-27T08:00:00.000Z";

  it("createAdditionalOrder -> listByDate: Json lines round-trip + note=null + DateTime", async () => {
    const created = await app.createAdditionalOrder({
      id: orderId,
      clientId: clientIds.hlebozavod,
      parentOrderNumber,
      lines: [
        { productName: "Belcolade Chocolate", quantity: 12.5, unit: "kg" },
        { productName: "Carat Glaze", quantity: 3, unit: "kg" },
      ],
      shipmentDate,
      recordedBy: "smoke",
      createdAt,
      note: null, // explicit null — verifies nullable write/read
    });
    expect(created.id).toBe(orderId);

    const byDate = await app.listAdditionalOrdersByDate(shipmentDate);
    const found = byDate.find((o) => o.id === orderId);
    expect(found).toBeDefined();
    // ── Json round-trip: lines come back as an array of objects with numbers (Float didn't become a string) ──
    expect(found!.lines).toHaveLength(2);
    expect(found!.lines[0]).toEqual({
      productName: "Belcolade Chocolate",
      quantity: 12.5,
      unit: "kg",
    });
    expect(found!.note).toBeNull(); // nullable field written and read back as null
    expect(found!.createdAt).toBe(createdAt); // DateTime round-trip with no precision loss
  });

  it("listAdditionalOrdersByParent: a second index/read path returns the same record", async () => {
    const byParent = await app.listAdditionalOrdersByParent(parentOrderNumber);
    expect(byParent.some((o) => o.id === orderId)).toBe(true);
  });
});

describe("postgres smoke — auth (user + session round-trip through use-cases)", () => {
  it("login -> authenticate -> logout: both adapters + scrypt hash via Postgres", async () => {
    // login: findByUsername(lowercase) + hasher.verify(hash from the DB) + sessions.create
    const { token } = await app.login({ username: "alexander", password: "demo1234" });
    expect(token).toBeTruthy();

    // authenticate: sessions.findValid (expiry check) + users.findById -> Viewer
    const viewer = await app.authenticate(token);
    expect(viewer).not.toBeNull();
    expect(viewer!.id).toBe("head-alexander"); // seed user read back by id
    expect(viewer!.role).toBe("head");

    // logout: sessions.delete (deleteMany — idempotent)
    await app.logout(token);
    expect(await app.authenticate(token)).toBeNull(); // session removed from the DB
  });

  it("login with a wrong password is rejected (scrypt-verify against the DB hash)", async () => {
    await expect(app.login({ username: "alexander", password: "wrong" })).rejects.toThrow();
  });
});

describe("postgres smoke — wave C: shipment (Json lines + nullable driver)", () => {
  const shipments = new PrismaShipmentRepository();

  it("listByStatus reads seed data; driver=null comes back as null", async () => {
    const placed = await shipments.listByStatus("placed");
    expect(placed.length).toBeGreaterThan(0);
    // shp-4 in the seed data has no assigned driver (driver: null)
    const noDriver = placed.find((s) => s.id === "shp-4");
    expect(noDriver).toBeDefined();
    expect(noDriver!.driver).toBeNull();
  });

  it("save -> findById: Json lines round-trip (weightKg as a number) + driver=null", async () => {
    const shipment: Shipment = {
      id: makeId<"ShipmentId">("smoke-shp-1"),
      clientId: clientIds.hlebozavod,
      managerId: "smoke-mgr",
      orderNumber: "SMOKE-SHP-1",
      address: "Denver, test",
      lines: [{ productName: "Belcolade Chocolate", quantity: 10, unit: "kg", weightKg: 10 }],
      driver: null,
      scheduledDate: "2026-06-27",
      status: "placed",
      dealId: null,
    };
    await shipments.save(shipment);

    const found = await shipments.findById(shipment.id);
    expect(found).not.toBeNull();
    expect(found!.lines).toEqual([
      { productName: "Belcolade Chocolate", quantity: 10, unit: "kg", weightKg: 10 },
    ]);
    expect(found!.driver).toBeNull(); // nullable field written and read back as null
    expect(found!.status).toBe("placed");
  });
});

describe("postgres smoke — wave C: tech-request (FIFO queue, nullable, DateTime)", () => {
  const techRequests = new PrismaTechRequestRepository();

  it("listOpen: FIFO (oldest first) + open status only", async () => {
    const open = await techRequests.listOpen();
    expect(open.length).toBeGreaterThan(0);
    expect(open.every((r) => r.status === "open")).toBe(true);
    // ASC by createdAt: each next item is no earlier than the previous one (FIFO queue)
    for (let i = 1; i < open.length; i++) {
      expect(open[i - 1]!.createdAt <= open[i]!.createdAt).toBe(true);
    }
  });

  it("save -> findById: nullable productId/assignedTo + DateTime round-trip", async () => {
    const req = createTechRequest({
      id: makeId<"TechRequestId">("smoke-tr-1"),
      dealId: makeId<"DealId">("deal-1"),
      clientId: clientIds.hlebozavod,
      kind: "consult",
      note: "smoke",
      requestedBy: "smoke",
      createdAt: "2026-06-27T08:00:00.000Z",
    });
    await techRequests.save(req);

    const found = await techRequests.findById(req.id);
    expect(found).not.toBeNull();
    expect(found!.productId).toBeNull(); // not set -> null
    expect(found!.assignedTo).toBeNull(); // created as open -> no assignee yet
    expect(found!.status).toBe("open");
    expect(found!.createdAt).toBe("2026-06-27T08:00:00.000Z"); // DateTime round-trip

    // listByDeal — a second read path (DESC); our record is present
    const byDeal = await techRequests.listByDeal(makeId<"DealId">("deal-1"));
    expect(byDeal.some((r) => r.id === req.id)).toBe(true);
  });
});
