// Postgres seed: loads the same demo data from src/infrastructure/persistence/seed.ts
// into the database via idempotent upserts. Safe to run multiple times.
//
// Usage:  npm run db:seed
// Requires DATABASE_URL and PERSISTENCE_MODE=postgres (or a live DB connection).

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  seedActivities,
  seedAdditionalOrders,
  seedAudits,
  seedClients,
  seedContacts,
  seedDealEvents,
  seedDeals,
  seedDefectItems,
  seedNotifications,
  seedOnboardings,
  seedPackingRequests,
  seedProductDescriptions,
  seedProducts,
  seedQuotas,
  seedReferenceTechRequests,
  seedReturnClaims,
  seedSampleRequests,
  seedShipments,
  seedTechRequests,
  seedTestActs,
  seedUsers,
} from "../src/infrastructure/persistence/seed.js";
import { ScryptPasswordHasher } from "../src/infrastructure/auth/scrypt-password-hasher.js";

// Prisma 7 requires an explicit driver adapter (as in infrastructure/persistence/prisma-client.ts);
// a bare `new PrismaClient()` fails with PrismaClientInitializationError.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("db:seed requires DATABASE_URL (Postgres connection string).");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const hasher = new ScryptPasswordHasher();

async function main(): Promise<void> {
  console.log("Seeding clients…");
  for (const c of seedClients) {
    await prisma.client.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        name: c.name,
        type: c.type,
        category: c.category,
        responsibleManagerId: c.responsibleManagerId,
        ein: c.ein ?? null,
      },
      update: {
        name: c.name,
        type: c.type,
        category: c.category,
        responsibleManagerId: c.responsibleManagerId,
        ein: c.ein ?? null,
      },
    });
  }

  console.log("Seeding products…");
  for (const p of seedProducts) {
    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        barcode: p.barcode ?? null,
        // Shelf life — from the ERP catalog; for demo data we use the sales-kit value as a stand-in.
        shelfLife: p.shelfLife ?? p.kit?.shelfLife ?? null,
        packaging: p.packaging ?? null,
        // Sales Kit (price/margin/benefits) — CRM enrichment; empty for ERP-only items.
        kitCategory: p.kit?.category ?? null,
        kitBenefits: p.kit ? [...p.kit.benefits] : [],
        kitMarginPercent: p.kit?.marginPercent ?? null,
        kitRspMinor: p.kit?.rsp.amountMinor ?? null,
      },
      update: {
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        barcode: p.barcode ?? null,
        shelfLife: p.shelfLife ?? p.kit?.shelfLife ?? null,
        packaging: p.packaging ?? null,
        kitCategory: p.kit?.category ?? null,
        kitBenefits: p.kit ? [...p.kit.benefits] : [],
        kitMarginPercent: p.kit?.marginPercent ?? null,
        kitRspMinor: p.kit?.rsp.amountMinor ?? null,
      },
    });
  }

  console.log("Seeding product descriptions…");
  for (const d of seedProductDescriptions) {
    await prisma.productDescription.upsert({
      where: { productId: d.productId },
      create: { productId: d.productId, text: d.text, sourceUrl: d.sourceUrl ?? null },
      update: { text: d.text, sourceUrl: d.sourceUrl ?? null },
    });
  }

  console.log("Seeding deals…");
  for (const d of seedDeals) {
    await prisma.deal.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        clientId: d.clientId,
        title: d.title,
        stage: d.stage,
        // Outcome of a completed deal: without it win-rate/"Funnel conversion" = 0 on
        // the postgres demo (completed deals have outcome=NULL). seed/deals sets won/lost.
        outcome: d.outcome ?? null,
        responsibleManagerId: d.responsibleManagerId,
        goal: d.goal ?? null,
      },
      update: {
        title: d.title,
        stage: d.stage,
        outcome: d.outcome ?? null,
        responsibleManagerId: d.responsibleManagerId,
        goal: d.goal ?? null,
      },
    });
  }

  console.log("Seeding activities…");
  for (const a of seedActivities) {
    await prisma.activity.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        dealId: a.dealId,
        clientId: a.clientId,
        kind: a.kind,
        text: a.text,
        author: a.author,
        createdAt: new Date(a.createdAt),
        dueDate: a.dueDate,
        done: a.done,
      },
      update: {
        done: a.done,
        text: a.text,
        dueDate: a.dueDate,
      },
    });
  }

  console.log("Seeding deal events…");
  for (const e of seedDealEvents) {
    await prisma.dealEvent.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        dealId: e.dealId,
        type: e.type,
        summary: e.summary,
        actor: e.actor,
        createdAt: new Date(e.createdAt),
        fromStage: e.fromStage,
        toStage: e.toStage,
      },
      update: {
        summary: e.summary,
        fromStage: e.fromStage,
        toStage: e.toStage,
      },
    });
  }

  console.log("Seeding notifications…");
  for (const n of seedNotifications) {
    await prisma.notification.upsert({
      where: { id: n.id },
      create: {
        id: n.id,
        recipientId: n.recipientId,
        message: n.message,
        dealId: n.dealId,
        createdAt: new Date(n.createdAt),
        read: n.read,
        important: n.important,
      },
      update: {
        read: n.read,
        message: n.message,
        important: n.important,
      },
    });
  }

  console.log("Seeding contacts…");
  for (const c of seedContacts) {
    await prisma.contact.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        clientId: c.clientId,
        name: c.name,
        position: c.position,
        role: c.role,
        phone: c.phone ?? null,
        email: c.email ?? null,
      },
      update: {
        name: c.name,
        position: c.position,
        role: c.role,
        phone: c.phone ?? null,
        email: c.email ?? null,
      },
    });
  }

  console.log("Seeding quotas…");
  for (const q of seedQuotas) {
    await prisma.quota.upsert({
      where: { id: q.id },
      create: {
        id: q.id,
        mopId: q.mopId,
        productId: q.productId,
        periodYear: q.period.year,
        periodQuarter: q.period.quarter,
        plannedVolume: q.plannedVolume,
        reservedVolume: q.reservedVolume,
        soldVolume: q.soldVolume,
      },
      update: {
        plannedVolume: q.plannedVolume,
        reservedVolume: q.reservedVolume,
        soldVolume: q.soldVolume,
      },
    });
  }

  console.log("Seeding return claims…");
  for (const r of seedReturnClaims) {
    await prisma.returnClaim.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        clientId: r.clientId,
        dealId: r.dealId,
        productName: r.productName,
        quantity: r.quantity,
        unit: r.unit,
        reason: r.reason,
        comment: r.comment,
        status: r.status,
        createdBy: r.createdBy,
        createdAt: new Date(r.createdAt),
      },
      update: {
        status: r.status,
        comment: r.comment,
      },
    });
  }

  console.log("Seeding packing requests…");
  for (const p of seedPackingRequests) {
    await prisma.packingRequest.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        clientId: p.clientId,
        productName: p.productName,
        sourcePack: p.sourcePack,
        targetPack: p.targetPack,
        quantity: p.quantity,
        unit: p.unit,
        status: p.status,
        requestedBy: p.requestedBy,
        createdAt: new Date(p.createdAt),
        note: p.note,
      },
      update: {
        status: p.status,
        note: p.note,
      },
    });
  }

  console.log("Seeding defect items…");
  for (const d of seedDefectItems) {
    await prisma.defectItem.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        productName: d.productName,
        quantity: d.quantity,
        unit: d.unit,
        reason: d.reason,
        status: d.status,
        createdBy: d.createdBy,
        createdAt: new Date(d.createdAt),
        note: d.note,
      },
      update: {
        status: d.status,
        note: d.note,
      },
    });
  }

  console.log("Seeding onboardings…");
  for (const o of seedOnboardings) {
    await prisma.onboarding.upsert({
      where: { id: o.id },
      create: {
        id: o.id,
        clientName: o.clientName,
        ein: o.ein,
        status: o.status,
        documents: o.documents as unknown as object[],
        requestedBy: o.requestedBy,
        legalNote: o.legalNote,
        createdAt: new Date(o.createdAt),
      },
      update: {
        status: o.status,
        documents: o.documents as unknown as object[],
        legalNote: o.legalNote,
      },
    });
  }

  console.log("Seeding shipments…");
  for (const s of seedShipments) {
    await prisma.shipment.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        clientId: s.clientId,
        managerId: s.managerId,
        orderNumber: s.orderNumber,
        address: s.address,
        lines: s.lines as unknown as object[],
        driver: s.driver,
        scheduledDate: s.scheduledDate,
        status: s.status,
      },
      update: {
        status: s.status,
        driver: s.driver,
      },
    });
  }

  console.log("Seeding tech requests…");
  for (const t of [...seedTechRequests, ...seedReferenceTechRequests]) {
    await prisma.techRequest.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        dealId: t.dealId,
        clientId: t.clientId,
        productId: t.productId,
        kind: t.kind,
        note: t.note,
        status: t.status,
        requestedBy: t.requestedBy,
        assignedTo: t.assignedTo,
        createdAt: new Date(t.createdAt),
      },
      update: {
        status: t.status,
        assignedTo: t.assignedTo,
      },
    });
  }

  // Reference end-to-end deal artifacts (#305): audit/act/samples for completed
  // stages, so REF-deal cards show data on the cloud demo (postgres) too.
  console.log("Seeding production audits…");
  for (const a of seedAudits) {
    await prisma.productionAudit.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        dealId: a.dealId,
        clientId: a.clientId,
        equipment: [...a.equipment],
        painPoints: [...a.painPoints],
        decisionMakers: a.decisionMakers as object,
        notes: a.notes ?? null,
        createdBy: a.createdBy,
        createdAt: new Date(a.createdAt),
      },
      update: {
        equipment: [...a.equipment],
        painPoints: [...a.painPoints],
        decisionMakers: a.decisionMakers as object,
        notes: a.notes ?? null,
      },
    });
  }

  console.log("Seeding test acts…");
  for (const t of seedTestActs) {
    await prisma.testAct.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        dealId: t.dealId,
        clientName: t.clientName,
        equipment: t.equipment,
        productName: t.productName,
        dosage: t.dosage,
        processParams: t.processParams,
        result: t.result,
        comment: t.comment,
        confirmedBy: t.confirmedBy,
        confirmedAt: new Date(t.confirmedAt),
      },
      update: {
        result: t.result,
        comment: t.comment,
      },
    });
  }

  console.log("Seeding sample requests…");
  for (const s of seedSampleRequests) {
    await prisma.sampleRequest.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        dealId: s.dealId,
        productId: s.productId,
        quantity: s.quantity,
        unit: s.unit,
        requestedBy: s.requestedBy,
        assignedTechnologistId: s.assignedTechnologistId,
        requestedAt: new Date(s.requestedAt),
      },
      update: {
        quantity: s.quantity,
        assignedTechnologistId: s.assignedTechnologistId,
      },
    });
  }

  console.log("Seeding users…");
  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        username: u.username.toLowerCase(),
        name: u.name,
        role: u.role,
        // Hashed at seed time (the in-memory store does this on load). Hash goes only
        // in create: we don't overwrite on re-seed (scrypt salt is random → would churn otherwise).
        passwordHash: hasher.hash(u.password),
      },
      update: {
        username: u.username.toLowerCase(),
        name: u.name,
        role: u.role,
      },
    });
  }

  console.log("Seeding additional orders…");
  for (const o of seedAdditionalOrders) {
    await prisma.additionalOrder.upsert({
      where: { id: o.id },
      create: {
        id: o.id,
        clientId: o.clientId,
        parentOrderNumber: o.parentOrderNumber,
        lines: o.lines as unknown as object[],
        shipmentDate: o.shipmentDate,
        recordedBy: o.recordedBy,
        createdAt: new Date(o.createdAt),
        note: o.note ?? null,
      },
      update: {
        shipmentDate: o.shipmentDate,
        lines: o.lines as unknown as object[],
        note: o.note ?? null,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
