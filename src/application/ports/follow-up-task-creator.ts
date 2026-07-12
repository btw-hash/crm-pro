import type { DealId } from "@/domain/deal/deal";

export interface CreateFollowUpTaskInput {
  readonly dealId: DealId;
  /** Who the task is for (the responsible sales manager) — also the author in the feed. */
  readonly assignee: string;
  readonly text: string;
  readonly dueInDays: number;
}

/**
 * Creates a reminder task (Activity kind=task). Id, timestamp, and due date are set
 * by the implementation (infrastructure) — like `DealEventRecorder`/`StubNotifier`,
 * so the use-case doesn't have to generate ids/clocks.
 */
export interface FollowUpTaskCreator {
  create(input: CreateFollowUpTaskInput): Promise<void>;
}
