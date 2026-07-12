import type { ActivityDraft, AiGateway } from "@/application/ports/ai-gateway";

export type DraftActivityFromVoice = (transcript: string) => Promise<ActivityDraft>;

/**
 * Drafts an activity (call/meeting) from a voice transcript. The AI extracts
 * the type, the gist, and the next step; the result is a draft that a human
 * edits and confirms (saving is a separate step via recordActivity). The AI
 * never fabricates numbers/dates.
 */
export function makeDraftActivityFromVoice(deps: { ai: AiGateway }): DraftActivityFromVoice {
  return (transcript) => deps.ai.draftActivityFromVoice({ transcript });
}
