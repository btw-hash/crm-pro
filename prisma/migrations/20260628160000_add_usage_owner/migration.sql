-- AlterTable: token usage breakdown by employee (#401). Additive, nullable.
ALTER TABLE "usage_records" ADD COLUMN "ownerId" TEXT;
