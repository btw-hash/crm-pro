-- AlterTable: link a shipment to the sales process (#397). Additive, nullable.
ALTER TABLE "shipments" ADD COLUMN "dealId" TEXT;
CREATE INDEX "shipments_dealId_idx" ON "shipments"("dealId");
