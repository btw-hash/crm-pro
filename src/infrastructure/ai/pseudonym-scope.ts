import { AsyncLocalStorage } from "node:async_hooks";
import type { KnownPii, PseudonymScope } from "@/application/ports/pseudonym-scope";

/**
 * `PseudonymScope` implementation on top of `AsyncLocalStorage`: the set of known PII
 * is bound to the async call context, so concurrent requests (different users) don't
 * see each other's PII. The global LLM pseudonymizer reads `current()` on every call.
 */
export class AsyncLocalStoragePseudonymScope implements PseudonymScope {
  private readonly storage = new AsyncLocalStorage<KnownPii>();

  run<T>(pii: KnownPii, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(pii, fn);
  }

  current(): KnownPii | null {
    return this.storage.getStore() ?? null;
  }
}
