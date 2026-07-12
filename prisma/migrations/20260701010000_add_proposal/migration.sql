-- Migration: add proposals table for a saved proposal per deal
-- Additive: new table (one row per deal, @unique dealId), no changes to existing tables.
-- lines is JSONB (array of {productId, productName, unit, quantity, unitPriceUsd}), like shipments.lines.
CREATE TABLE "proposals" (
    "id"       TEXT NOT NULL,
    "dealId"   TEXT NOT NULL,
    "clientId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "lines"    JSONB NOT NULL,
    "prose"    TEXT NOT NULL,
    "status"   TEXT NOT NULL,
    "savedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proposals_dealId_key" ON "proposals"("dealId");

ALTER TABLE "proposals"
    ADD CONSTRAINT "proposals_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "deals"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
