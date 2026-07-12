/**
 * Data-residency guardrail (#179, GDPR-style data-protection policy): a machine check
 * that prices, the counterparty list and PII never reach a GLOBAL LLM (Claude) contour.
 * The detector is a pure function; it's applied by the `ContourGuardLlmProvider` wrapper
 * at the global LLM boundary (two-contour policy -- see docs/adr/ and docs/DATA_POLICY.md).
 * Numbers for analytics come from the ERP deterministically -- AI never receives them
 * for the "general" contour.
 */

export interface DataPolicyViolation {
  /** Category: price/counterparty/tax ID. */
  readonly kind: "price" | "counterparty" | "tax_id";
  /** Evidence fragment (for the error message). */
  readonly sample: string;
}

// A dollar amount: "$742.50", "$1,180,000.00", "$189,000", "$1,250".
const PRICE_RE = /\$\s?\d[\d,]*(?:\.\d{2})?/g;
// US legal entity forms -- counterparty list / trade secret. `\b` works fine for Latin
// script (unlike Cyrillic), so a plain word-boundary alternation is enough.
const COUNTERPARTY_RE = /\b(?:LLC|LLP|L\.P\.|LP|Inc|Corp|Ltd|Co)\b\.?/g;
// EIN (US tax ID): two digits, dash, seven digits (e.g. "39-0645511").
const TAX_ID_RE = /\b\d{2}-\d{7}\b/g;

function collect(
  text: string,
  re: RegExp,
  kind: DataPolicyViolation["kind"],
): DataPolicyViolation[] {
  const out: DataPolicyViolation[] = [];
  for (const match of text.matchAll(re)) {
    out.push({ kind, sample: match[0].trim().slice(0, 60) });
  }
  return out;
}

/** Finds trade-secret/PII markers in the text (prices, counterparties, tax IDs). */
export function findDataPolicyViolations(text: string): readonly DataPolicyViolation[] {
  return [
    ...collect(text, PRICE_RE, "price"),
    ...collect(text, COUNTERPARTY_RE, "counterparty"),
    ...collect(text, TAX_ID_RE, "tax_id"),
  ];
}

export class DataContourViolationError extends Error {
  constructor(readonly violations: readonly DataPolicyViolation[]) {
    const samples = violations
      .slice(0, 3)
      .map((v) => `${v.kind}: "${v.sample}"`)
      .join("; ");
    super(
      `Blocked a leak: the global LLM contour would receive a trade secret/PII ` +
        `(${violations.length} match(es): ${samples}). Under the data-residency policy, prices/` +
        `counterparties/PII may only go to the approved compliant provider (AI_PROVIDER=openai). ` +
        `Analytics built on the ERP must not send raw data outward.`,
    );
    this.name = "DataContourViolationError";
  }
}

/** Throws `DataContourViolationError` if the text contains a trade secret/PII. */
export function assertCleanForGlobalContour(text: string): void {
  const violations = findDataPolicyViolations(text);
  if (violations.length > 0) {
    throw new DataContourViolationError(violations);
  }
}
