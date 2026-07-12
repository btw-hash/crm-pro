import type {
  ActivityDraft,
  AiGateway,
  AssistantDecision,
  AssistantStepInput,
  CrmSnapshot,
  DealMessageContext,
  NextStepContext,
  ProposalFacts,
  TestActDraft,
} from "@/application/ports/ai-gateway";
import type { WebSearchResult } from "@/application/ports/web-search-gateway";
import type { ActivityKind } from "@/domain/activity/activity";
import type { TestActResult } from "@/domain/test-act/test-act";
import { missingActFields } from "./missing-act-fields";
import { resolveRelativeDueDate } from "./relative-date";

/**
 * AI-gateway stub with deterministic transcript parsing. Mimics what an LLM will do
 * in production (function calling): breaks free text down into the test-act draft's
 * fields. Numbers are taken ONLY from the text (regex), nothing is invented; a human
 * always confirms the result. The real version: Whisper (STT) + an LLM, with the
 * provider abstracted (Claude / OpenAI / self-hosted). See the tech brief.
 */
export class StubAiGateway implements AiGateway {
  async parseVoiceToActDraft(input: { transcript: string }): Promise<TestActDraft> {
    // Numbers dictated as words ("one hundred eighty" -> 180) are converted to digits
    // so the regex extraction also works for voice input.
    const t = normalizeEnglishNumbers(input.transcript);

    const clientName = firstMatch(t, CLIENTS);
    const equipment = allMatches(t, EQUIPMENT);
    const productName = firstMatch(t, PRODUCTS);
    const dosage = extractDosage(t);
    const processParams = extractProcessParams(t);
    const result = extractResult(t);
    const comment = extractComment(t);

    const draft = { clientName, equipment, productName, dosage, processParams, result, comment };
    return { ...draft, missingFields: missingActFields(draft) };
  }

  // Deterministic parsing of a spoken call/meeting summary OR a dictated task: kind
  // by keyword, text = the transcript, next step by action markers, due date computed
  // deterministically from what was said (never invented). Production version: an
  // LLM (#93).
  async draftActivityFromVoice(input: { transcript: string }): Promise<ActivityDraft> {
    const t = input.transcript.toLowerCase();
    const kind: ActivityKind =
      /\b(?:meet|meeting|met|visit|visited|visiting|dropped by|drop by|stopped by|stop by|swung by|swing by|went to see|go see|going to see|negotiat\w*)\b/i.test(
        t,
      )
        ? "visit"
        : /\b(?:call|called|calling|phone|phoned|dial|dialed|dialing|rang|ring)\b/i.test(t)
          ? "call"
          : "note";
    // Intent/action markers: catch the "what to do" clause (with a time, if named).
    // The day/date isn't carried into the text — resolveRelativeDueDate provides that
    // separately.
    const m = input.transcript.match(
      /\b(?:call(?: back)?|get in touch|reach out|meet|go see|going to see|visit|drop(?:ped)? by|stop(?:ped)? by|send|mail|prepare|schedule|issue (?:an|the) invoice|invoice|confirm|agree(?:d)?|arrange|clarify|follow up|remind|discuss|need to|should|show)[^.!?]*/i,
    );
    const nextStepText = m ? capitalize(m[0].trim()) : null;
    const nextStepDueDate = nextStepText
      ? resolveRelativeDueDate(input.transcript, new Date())
      : null;
    return { kind, text: input.transcript.trim(), nextStepText, nextStepDueDate };
  }

  // Deterministic next step by stage (templates). Production version: an LLM (#97).
  async suggestNextStep(context: NextStepContext): Promise<{ suggestion: string }> {
    const stage = context.stage.toLowerCase();
    const suggestion = /qualif/.test(stage)
      ? "Call the decision maker, clarify the need, and schedule a production audit."
      : /audit/.test(stage)
        ? "Agree on a visit date to audit the equipment and the client's pain points on-site."
        : /request/.test(stage)
          ? "Check the sample status with the technologist and confirm the test date."
          : /testing/.test(stage)
            ? "Get the test results, draw up the test act, and review the outcome with the client."
            : /quote|proposal/.test(stage)
              ? "Call the decision maker, discuss the proposal, and confirm the first shipment."
              : `Reach out to "${context.clientName}" and figure out the next step for the deal.`;
    return { suggestion };
  }

  // Deterministic message template from the context/intent. Production version: an LLM (#101).
  async draftClientMessage(input: {
    context: DealMessageContext;
    intent: string | null;
  }): Promise<{ subject: string; body: string }> {
    const c = input.context;
    const subject = input.intent ? `${c.dealTitle}: ${input.intent}` : `${c.dealTitle} — next step`;
    const purpose = input.intent
      ? `${input.intent}.`
      : "Wanted to check the status of our work together and suggest a next step.";
    const body =
      `Hello!\n\n` +
      `Writing about the "${c.dealTitle}" deal (stage: ${c.stage}). ${purpose}\n\n` +
      `We'd love to keep working together — let me know a good time to connect.\n\n` +
      `Best regards,\n${c.managerName}`;
    return { subject, body };
  }

  // Reference product description (stub — deterministic). sourceUrl is a search link
  // by name (a real search link, not an invented URL); a human replaces it with the
  // official site.
  async describeProduct(input: {
    name: string;
    category: string;
    benefits: readonly string[];
  }): Promise<{ text: string; sourceUrl: string | null }> {
    const benefits =
      input.benefits.length > 0 ? input.benefits.join("; ") : "a professional-grade ingredient";
    const text =
      `${input.name} is a ${input.category.toLowerCase()} for professional bakery and ` +
      `confectionery production. Key properties: ${benefits}. Used in recipes per the ` +
      `manufacturer's technology; before introducing it, run a technologist's test at the client's site.`;
    const sourceUrl = `https://www.google.com/search?q=${encodeURIComponent(`${input.name} manufacturer`)}`;
    return { text, sourceUrl };
  }

  // AI only drafts the prose. The client's economics are NOT disclosed in the message
  // (#462 §4.5 hides them in the presentation layer; computeEconomics stays in the domain).
  async draftProposalText(facts: ProposalFacts): Promise<string> {
    return (
      `Dear partner (${facts.clientName}),\n\n` +
      `Following our joint technologist's test, we've confirmed that ` +
      `"${facts.productName}" works well on your production line.\n\n` +
      `We'd like to agree on the first industrial-scale shipment and a schedule for regular ` +
      `deliveries. We're ready to provide technologist support at the start.`
    );
  }

  // Deterministic summary of web-search results without a network — so the demo stub
  // also produces a meaningful text (not a raw list). Production version: an
  // LLM synthesis (#281).
  async answerFromWebSearch(input: {
    question: string;
    results: readonly WebSearchResult[];
  }): Promise<{ answer: string }> {
    const { question, results } = input;
    if (results.length === 0) {
      return { answer: "No results found in open sources for this query." };
    }
    const keyTitles = results
      .slice(0, 3)
      .map((r) => `"${r.title}"`)
      .join(", ");
    const sources = results.map((r) => `- ${r.url}`).join("\n");
    const answer =
      `Found ${results.length} ${results.length === 1 ? "result" : "results"} for "${question}". ` +
      `Key ones: ${keyTitles}. Worth checking how relevant they are to us ` +
      `(food-ingredient distribution).\n\nSources:\n${sources}`;
    return { answer };
  }

  // Deterministic 2-step ReAct agent for the demo without a network/LLM. Step 1: pick
  // a tool by simple keywords (external-world words -> search_web, otherwise
  // query_crm). Step 2 (a result already exists in history): give the final answer —
  // a short summary of the last gathered result. Production version: an LLM (#281).
  async planAssistantStep(input: AssistantStepInput): Promise<AssistantDecision> {
    const last = input.history.at(-1);
    if (!last) {
      if (STUB_WEB_HINT_RE.test(input.question)) {
        return { kind: "tool", tool: "search_web", query: input.question };
      }
      return { kind: "tool", tool: "query_crm" };
    }
    // Something has already been gathered — answer with a summary of the last result
    // (its first non-empty line), no invention: only what the tool actually returned.
    const summary = firstLine(last.result);
    const lead = last.tool === "search_web" ? "From the web search" : "From the CRM data";
    return { kind: "answer", text: `${lead}: ${summary}` };
  }

  // Deterministic answer for the demo without an LLM: keyword routing over the
  // snapshot. Numbers come from the snapshot (computed by code), nothing is invented.
  // Production version: an LLM (#75).
  async answerManagerQuestion(input: {
    question: string;
    snapshot: CrmSnapshot;
  }): Promise<{ answer: string }> {
    const q = input.question.toLowerCase();
    const { deals, clientsWithDebt, managers, funnel, pendingTests } = input.snapshot;

    if (/stall|stuck|next step|no step|hung up/.test(q)) {
      const stalled = deals.filter((d) => d.stalled);
      return {
        answer: stalled.length
          ? `Stalled (no next step): ${stalled
              .map((d) => `"${d.title}" — ${d.managerName}`)
              .join("; ")}.`
          : "No stalled deals — every active deal has a planned next step.",
      };
    }
    if (/limit|receivable|debt|credit/.test(q)) {
      const over = clientsWithDebt.filter((c) => c.overLimit);
      return {
        answer: over.length
          ? `Over the credit limit: ${over
              .map((c) => `${c.clientName} (balance ${c.debt} against a limit of ${c.creditLimit})`)
              .join("; ")}.`
          : "No clients are over their credit limit.",
      };
    }
    if (/manager|workload|portfolio|busy|who.*more/.test(q)) {
      return {
        answer: `Manager workload: ${managers
          .map(
            (m) =>
              `${m.managerName} — ${m.activeDeals} active, ${m.stalledDeals} stalled, ${m.openTasks} tasks`,
          )
          .join("; ")}.`,
      };
    }
    if (/test|sample|result/.test(q)) {
      return {
        answer: pendingTests.length
          ? `Waiting on test results for: ${pendingTests
              .map((p) => `"${p.dealTitle}" (${p.clientName}, technologist ${p.technologistName})`)
              .join("; ")}.`
          : "No deals are waiting on a test result.",
      };
    }
    if (/funnel|pipeline|won|lost|stage|conversion|win/.test(q)) {
      return {
        answer:
          `Pipeline: ${funnel.total} total, ${funnel.active} active, ${funnel.won} won, ` +
          `${funnel.lost} lost, win rate ${funnel.winRatePercent}%. By stage: ${funnel.byStage
            .map((b) => `${b.label} — ${b.count}`)
            .join(", ")}.`,
      };
    }
    return {
      answer:
        `Summary: ${deals.length} deals total, ${
          deals.filter((d) => d.stalled).length
        } of them stalled; ${clientsWithDebt.length} clients with a balance. ` +
        "You can ask about stalled deals, credit limits, manager workload, the pipeline, or test status.",
    };
  }
}

/**
 * Stub hint: a question about the OUTSIDE world (search/suppliers/market/new
 * companies). Only for the deterministic stub — in production the route is chosen by
 * the LLM (`planAssistantStep` in `LlmAiGateway`); there's no more regex routing in
 * the use-case.
 */
const STUB_WEB_HINT_RE =
  /\bfind\b|\bsearch\b|\bgoogle\b|\bonline\b|on the internet|on the web|on the market|supplier|manufacturer|competitor|compan(?:y|ies)/i;

/** Capitalize the first letter (for a tidy next-step text). */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** First non-empty line of a text (for a short summary of the agent's step result). */
function firstLine(text: string): string {
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return line ?? text.trim();
}

interface Lexeme {
  readonly match: RegExp;
  readonly value: string;
}

// Maps professional jargon to canonical names (the way an LLM would, using the ERP's
// nomenclature/contacts directory).
const CLIENTS: readonly Lexeme[] = [
  { match: /sweet world/i, value: "Sweet World Confections" },
  { match: /sunrise bakery|bakery plant/i, value: "Sunrise Bakery Co." },
  { match: /foster/i, value: "M. Foster LLC" },
  { match: /warm loaf|warm bread/i, value: "Warm Loaf Bakery" },
  { match: /taste restaurant|restaurant group/i, value: "Taste Restaurant Group" },
  { match: /meringue/i, value: "Meringue Confectionery" },
  { match: /croissant/i, value: "Croissant & Co Bakery" },
  { match: /bread industries|breadprom/i, value: "Bread Industries Co." },
];

const PRODUCTS: readonly Lexeme[] = [
  { match: /carat|glaze/i, value: "Carat Cover Glaze" },
  { match: /belcolade|chocolate/i, value: "Belcolade Noir Selection Chocolate" },
  { match: /topfil|filling/i, value: "Topfil Lingonberry Filling" },
  { match: /sapore|sourdough|starter/i, value: "Sapore Lievito Sourdough Starter" },
  { match: /s\s?500|improver/i, value: "S500 Dough Improver" },
  { match: /mimetic|margarine/i, value: "Mimetic Puff Pastry Margarine" },
  { match: /tegral|muffin/i, value: "Tegral Muffin Mix" },
];

const EQUIPMENT: readonly Lexeme[] = [
  { match: /miwe/i, value: "Miwe Rotary Oven" },
  { match: /diosna/i, value: "Diosna Dough Mixer" },
];

function firstMatch(text: string, lexemes: readonly Lexeme[]): string | null {
  return lexemes.find((l) => l.match.test(text))?.value ?? null;
}

function allMatches(text: string, lexemes: readonly Lexeme[]): string | null {
  const found = lexemes.filter((l) => l.match.test(text)).map((l) => l.value);
  return found.length > 0 ? found.join(", ") : null;
}

function extractDosage(text: string): string | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:%|percent)/i);
  return m ? `${m[1]}%` : null;
}

// English number words -> digits. "hundred" is a multiplier (e.g. "one hundred
// eighty" = 180), unlike some languages where a hundred is a single word.
const ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const NUMBER_WORDS = new Set([...Object.keys(ONES), ...Object.keys(TENS), "hundred"]);

/** Turns a run of number words ("one hundred eighty") into its numeric value (180). */
function wordsToNumber(words: readonly string[]): number {
  let current = 0;
  for (const w of words) {
    if (w === "hundred") {
      current = (current || 1) * 100;
    } else if (TENS[w] !== undefined) {
      current += TENS[w];
    } else if (ONES[w] !== undefined) {
      current += ONES[w];
    }
  }
  return current;
}

function normalizeEnglishNumbers(text: string): string {
  const words = [...NUMBER_WORDS].join("|");
  // A run of consecutive number words ("one hundred eighty") between non-letters.
  const run = new RegExp(`(?<!\\p{L})(?:${words})(?:\\s+(?:${words}))*(?!\\p{L})`, "giu");
  return text.replace(run, (match) => String(wordsToNumber(match.toLowerCase().split(/\s+/))));
}

function extractProcessParams(text: string): string | null {
  const parts: string[] = [];
  // "180°", "180 °C", "180 degrees" — the "C" after the degree sign is optional.
  const temp = text.match(/(\d+)\s*(?:°\s*c?|degrees?)/i);
  if (temp) parts.push(`${temp[1]} °C`);
  const mins = [...text.matchAll(/(\d+)\s*min(?:ute)?s?/gi)].map((m) => m[1]);
  const hasKnead = /knead/i.test(text);
  mins.forEach((value, index) => {
    parts.push(index === 0 && hasKnead ? `knead ${value} min` : `bake ${value} min`);
  });
  return parts.length > 0 ? parts.join(", ") : null;
}

function extractResult(text: string): TestActResult {
  const success =
    /didn't run|did not run|didn't leak|did not leak|didn't scorch|did not scorch|succeeded|successful|satisfied|excellent|worked out|improved|reduced|decreased/i.test(
      text,
    );
  const failure =
    /failed|unsuccessful|ruined|spoiled|didn't work|did not work|defects? (?:went up|increased|rose)|got worse/i.test(
      text,
    );
  if (failure && !success) return "failure";
  if (success) return "success";
  return "unknown";
}

function extractComment(text: string): string | null {
  // The technologist's remark is usually at the end. Take from the keyword to the
  // end of the sentence or the text — voice input has no punctuation.
  const m = text.match(/technologist|satisfied|signed off|signed the act/i);
  if (!m || m.index === undefined) {
    return null;
  }
  let tail = text.slice(m.index);
  const end = tail.search(/[.!?]/);
  if (end >= 0) {
    tail = tail.slice(0, end + 1);
  }
  tail = tail.trim();
  return tail.length > 0 ? tail : null;
}
