-- Migration: add deal_qualifications table for Qualification stage workspace
-- Additive: new table with nullable text fields, no changes to existing tables.
CREATE TABLE "deal_qualifications" (
    "id"               TEXT NOT NULL,
    "dealId"           TEXT NOT NULL,
    "segment"          TEXT,
    "productionScale"  TEXT,
    "needTask"         TEXT,
    "targetProduct"    TEXT,
    "volumeHint"       TEXT,
    "urgency"          TEXT,
    "decisionMaker"    TEXT,
    "contactPerson"    TEXT,
    "volumePerMonth"   TEXT,
    "revenuePotential" TEXT,
    "paymentTerms"     TEXT,
    "creditLimitHint"  TEXT,
    "savedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_qualifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_qualifications_dealId_key" ON "deal_qualifications"("dealId");

ALTER TABLE "deal_qualifications"
    ADD CONSTRAINT "deal_qualifications_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "deals"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
