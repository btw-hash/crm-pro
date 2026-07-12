import type { DealId } from "@/domain/deal/deal";

export interface NotifyInput {
  readonly recipientId: string;
  readonly message: string;
  readonly dealId?: DealId | null;
}

/**
 * Notification delivery port. In Stage 1 — a stub (log + in-app feed);
 * real channels (Telegram/email/push) will plug into the same port later (#21).
 * A notification is informational, NOT data entry (passive-capture principle).
 */
export interface Notifier {
  notify(input: NotifyInput): Promise<void>;
}
