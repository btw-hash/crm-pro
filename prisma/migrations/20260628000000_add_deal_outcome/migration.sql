-- Migration: add outcome column to deals table
-- Additive change: nullable TEXT column, no data loss, no default needed.
-- Existing rows retain outcome = NULL (no outcome set).
ALTER TABLE "deals" ADD COLUMN "outcome" TEXT;
