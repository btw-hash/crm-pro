-- Migration: add deletedAt column to deals table (soft-delete, #397 item 23)
-- Additive change: nullable TEXT column, no data loss. Existing deals stay
-- active (deletedAt = NULL). Soft delete preserves the record and its history.
ALTER TABLE "deals" ADD COLUMN "deletedAt" TEXT;
