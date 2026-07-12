/**
 * Pseudonymizes PII before sending it to the LLM (data-minimization principle):
 * replaces phone numbers and known full names with placeholders, and restores the
 * originals in the model's response. So the final data has the real value, but raw
 * PII never reaches the LLM.
 *
 * Phone numbers are caught with a regex (reliable). Reliably detecting full names in
 * free text without NER isn't possible — so names are supplied as a LIST from
 * structured data (ERP contacts). We mask not only an exact match of the full string,
 * but individual components (last/first/middle name) accounting for common English
 * possessive/plural endings — so "Marina's" or "with Petrov's" doesn't leak (#282).
 *
 * A 10-digit tax ID / internal ID is structurally indistinguishable from a phone
 * number's body and, unprotected, gets falsely masked by the phone regex (which
 * confuses the model — #296). Known tax IDs are supplied as the `knownTaxIds` list and
 * are excluded from phone detection (like knownContacts).
 */

export interface Pseudonymized {
  /** Text with placeholders instead of PII. */
  readonly text: string;
  /** Puts the originals back in place of the placeholders (for the model's response). */
  readonly restore: (value: string) => string;
}

/** Minimum length of a name component to mask separately (filters out "Al", "Jo"). */
const MIN_NAME_TOKEN_LEN = 3;

/**
 * English possessive/plural endings for names — a CLOSED set of allowed suffixes when
 * matching a stem: "Marina" catches "Marina's", but NOT unrelated word formation.
 * Order (longest first) matters so the regex alternation doesn't stop at a shorter match.
 */
const NAME_ENDINGS = ["'s", "s'", "s"] as const;

/** A letter of the alphabet — for "word" boundaries around a name component. */
const LETTER = "[\\p{L}]";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** Full-name components (words of length >= MIN_NAME_TOKEN_LEN), unique. */
function nameTokens(fullName: string): readonly string[] {
  const tokens = fullName
    .split(/\s+/u)
    .map((w) => w.trim())
    .filter((w) => w.length >= MIN_NAME_TOKEN_LEN);
  return [...new Set(tokens)];
}

export function pseudonymize(
  input: string,
  knownContacts: readonly string[] = [],
  knownTaxIds: readonly string[] = [],
): Pseudonymized {
  const map = new Map<string, string>(); // placeholder -> original
  let text = input;

  // 0) Known tax IDs (10/12 digits from the ERP): pulled out from under the phone
  //    regex. Swapped for a sentinel BEFORE the phone pass and restored AFTER — so the
  //    text sent to the model carries the real tax ID, not [PHONE_N] (#296). Longest
  //    first (so nested values aren't clipped).
  const taxSentinels = new Map<string, string>(); // sentinel -> original tax ID
  [...new Set(knownTaxIds)]
    .filter((s) => s.trim() !== "")
    .sort((a, b) => b.length - a.length)
    .forEach((taxId, index) => {
      if (text.includes(taxId)) {
        const sentinel = ` TAXID${index} `;
        text = text.split(taxId).join(sentinel);
        taxSentinels.set(sentinel, taxId);
      }
    });

  // 1) Known contacts/full names. First an exact match of the full string (longest
  //    first, so it isn't clipped by a shorter one), then individual components with
  //    possessive/plural endings, so "Marina's" / "with Foster's" don't leak (#282).
  let contactCount = 0;
  const maskContact = (original: string): string => {
    const existing = [...map].find(([, v]) => v === original);
    if (existing) {
      return existing[0];
    }
    contactCount += 1;
    const placeholder = `[CONTACT_${contactCount}]`;
    map.set(placeholder, original);
    return placeholder;
  };

  const sortedContacts = [...new Set(knownContacts)]
    .filter((s) => s.trim() !== "")
    .sort((a, b) => b.length - a.length);

  // 1a) Exact match of the full contact string.
  sortedContacts.forEach((original) => {
    if (text.includes(original)) {
      const placeholder = maskContact(original);
      text = text.split(original).join(placeholder);
    }
  });

  // 1b) Individual name components + an optional possessive/plural ending. Letter
  //     boundaries so "Marina" doesn't catch "Marinade", and short tokens ("Al", "Jo")
  //     don't participate at all.
  const tokenSet = new Set<string>();
  sortedContacts.forEach((original) => {
    nameTokens(original).forEach((s) => tokenSet.add(s));
  });
  // Longest tokens first — stable behavior on overlaps.
  [...tokenSet]
    .sort((a, b) => b.length - a.length)
    .forEach((s) => {
      // token + a CLOSED set of possessive/plural endings (or none), at non-letter
      // boundaries: "Marina" -> Marina/Marina's, but not "Marinade" (not a valid ending).
      const ending = `(?:${NAME_ENDINGS.join("|")})?`;
      const re = new RegExp(`(?<!${LETTER})${escapeRegExp(s)}${ending}(?!${LETTER})`, "giu");
      text = text.replace(re, (match) => maskContact(match));
    });

  // 2) US phone numbers: optional country code (+1) + 10-digit body grouped 3-3-4 with
  //    single separators. The structure is BOUNDED (exactly 10 digits) — two adjacent
  //    numbers separated by a space don't merge into one run and both get masked.
  //    Boundaries (?<!\d)/(?!\d) keep it from grabbing part of a longer number (a
  //    barcode, a 12-digit personal tax ID). Known tax IDs were already pulled out via
  //    sentinels in step 0.
  let phoneCount = 0;
  const phoneRe = /(?<!\d)(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;
  text = text.replace(phoneRe, (match) => {
    phoneCount += 1;
    const placeholder = `[PHONE_${phoneCount}]`;
    map.set(placeholder, match);
    return placeholder;
  });

  // 3) Put known tax IDs back in place of the sentinels: the real tax ID goes to the model.
  for (const [sentinel, taxId] of taxSentinels) {
    text = text.split(sentinel).join(taxId);
  }

  const restore = (value: string): string => {
    let out = value;
    for (const [placeholder, original] of map) {
      out = out.split(placeholder).join(original);
    }
    return out;
  };

  return { text, restore };
}
