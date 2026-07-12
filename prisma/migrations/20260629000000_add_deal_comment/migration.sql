-- Migration: add comment column to deals table
-- Additive change: nullable TEXT column, no data loss, no default needed.
-- Existing rows retain comment = NULL (no comment set).
ALTER TABLE "deals" ADD COLUMN "comment" TEXT;
