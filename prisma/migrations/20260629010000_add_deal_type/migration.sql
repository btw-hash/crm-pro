-- AlterTable: process type (new client / test / defect / packing, #0055).
-- Additive, nullable — existing deals stay NULL (treated as "new client").
ALTER TABLE "deals" ADD COLUMN "type" TEXT;
