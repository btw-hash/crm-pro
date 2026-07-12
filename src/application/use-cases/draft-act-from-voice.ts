import type { AiGateway, TestActDraft } from "@/application/ports/ai-gateway";

export type DraftActFromVoice = (transcript: string) => Promise<TestActDraft>;

/**
 * Drafts a "test act" from a voice-report transcript. The AI extracts and
 * formats it; the result is a draft that a human edits and confirms
 * (saving is a separate step via recordTestAct).
 */
export function makeDraftActFromVoice(deps: { ai: AiGateway }): DraftActFromVoice {
  return (transcript) => deps.ai.parseVoiceToActDraft({ transcript });
}
