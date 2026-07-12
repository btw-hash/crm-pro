import { assertCleanForGlobalContour } from "./data-contour-guard";
import type {
  CompleteTextRequest,
  ExtractJsonRequest,
  LlmProvider,
  LlmResult,
} from "./llm/llm-provider";

/**
 * Decorator over a GLOBAL `LlmProvider` (Claude/OpenAI): before every call, checks the
 * outgoing payload and blocks it if it contains trade secrets/PII (prices/counterparties/
 * tax IDs) -- a machine-enforced data residency guard (#179). Applied INSIDE the
 * pseudonymizer so it sees the text actually being sent.
 */
export class ContourGuardLlmProvider implements LlmProvider {
  constructor(private readonly inner: LlmProvider) {}

  async extractJson(request: ExtractJsonRequest): Promise<unknown> {
    assertCleanForGlobalContour(`${request.system}\n${request.user}`);
    return this.inner.extractJson(request);
  }

  async completeText(request: CompleteTextRequest): Promise<string> {
    assertCleanForGlobalContour(`${request.system}\n${request.user}`);
    return this.inner.completeText(request);
  }

  async extractJsonWithUsage(request: ExtractJsonRequest): Promise<LlmResult<unknown>> {
    assertCleanForGlobalContour(`${request.system}\n${request.user}`);
    return this.inner.extractJsonWithUsage(request);
  }

  async completeTextWithUsage(request: CompleteTextRequest): Promise<LlmResult<string>> {
    assertCleanForGlobalContour(`${request.system}\n${request.user}`);
    return this.inner.completeTextWithUsage(request);
  }
}
