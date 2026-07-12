import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { Id } from "@/domain/shared/id";

export type ActivityId = Id<"ActivityId">;

/** Activity kind: call, visit, note, task (with a deadline). */
export const ACTIVITY_KINDS = ["call", "visit", "note", "task"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** A narrow check that a string is a valid activity kind (for the server-action boundary). */
export function isActivityKind(value: unknown): value is ActivityKind {
  return typeof value === "string" && (ACTIVITY_KINDS as readonly string[]).includes(value);
}

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  call: "Call",
  visit: "Visit",
  note: "Note",
  task: "Task",
};

/**
 * An activity on a client/deal: records the manager's work (calls, visits,
 * notes, tasks). The activity feed turns a deal into a "living commercial
 * object". Passive-capture principle: entered and confirmed by a human.
 */
export interface Activity {
  readonly id: ActivityId;
  readonly dealId: DealId | null;
  readonly clientId: ClientId | null;
  readonly kind: ActivityKind;
  readonly text: string;
  readonly author: string;
  readonly createdAt: string;
  /** Due date — for tasks only; otherwise null. */
  readonly dueDate: string | null;
  /** Whether the task is done (always false for non-tasks). */
  readonly done: boolean;
}

export interface CreateActivityInput {
  readonly id: ActivityId;
  readonly dealId?: DealId | null;
  readonly clientId?: ClientId | null;
  readonly kind: ActivityKind;
  readonly text: string;
  readonly author: string;
  readonly createdAt: string;
  readonly dueDate?: string | null;
}

export class ActivityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActivityValidationError";
  }
}

/** Creates an activity with minimal validation. A pure function, no side effects. */
export function createActivity(input: CreateActivityInput): Activity {
  if (input.text.trim() === "") {
    throw new ActivityValidationError("Task text must not be empty");
  }
  if (!input.dealId && !input.clientId) {
    throw new ActivityValidationError("A task must be linked to a deal or a client");
  }
  return {
    id: input.id,
    dealId: input.dealId ?? null,
    clientId: input.clientId ?? null,
    kind: input.kind,
    text: input.text.trim(),
    author: input.author,
    createdAt: input.createdAt,
    // A due date only makes sense for a task.
    dueDate: input.kind === "task" ? (input.dueDate ?? null) : null,
    done: false,
  };
}

/** Marks a task as done (immutably). */
export function markDone(activity: Activity): Activity {
  return { ...activity, done: true };
}

function compareByDue(a: Activity, b: Activity): number {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1; // has a due date - comes before one without
  if (b.dueDate) return 1;
  return 0;
}

/**
 * The "next step" across a set of activities: the open (not done) task with
 * the nearest due date. null if there are no open tasks.
 */
export function nextStep(activities: readonly Activity[]): Activity | null {
  const openTasks = activities.filter((a) => a.kind === "task" && !a.done);
  return [...openTasks].sort(compareByDue)[0] ?? null;
}
