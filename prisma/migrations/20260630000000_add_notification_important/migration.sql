-- Migration: add `important` column to notifications table (design §5.1)
-- Additive change: NOT NULL BOOLEAN with DEFAULT false, no data loss.
-- Importance is a dimension independent of read-state: important notifications get
-- a red "important" badge on top of the amber "new" badge.
ALTER TABLE "notifications" ADD COLUMN "important" BOOLEAN NOT NULL DEFAULT false;
