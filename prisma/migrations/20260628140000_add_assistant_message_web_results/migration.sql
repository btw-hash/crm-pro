-- Additive: web sources for the assistant's answer (JSON [{title,url}]) — so clickable
-- links don't disappear when reopening a conversation from history (#15). Nullable →
-- existing rows/databases aren't broken.
ALTER TABLE "assistant_messages" ADD COLUMN "webResults" TEXT;
