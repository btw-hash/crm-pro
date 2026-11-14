# Turn on a real LLM (live) behind the `AiGateway` port

By default the AI layer runs on a **stub** (`AI_MODE=stub`) — the demo works with no
keys and no network. To show production behavior (free-form speech → AI-parsed
report), switch **live** on for one of the providers behind the `LlmProvider` port:

| Provider                      | When                                | Data policy                                                          |
| ----------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| **OpenAI** (`openai`)         | real/production customer data       | ✅ the approved compliant provider — safe for real PII               |
| **Claude** (`anthropic`)      | code / anonymized / synthetic data  | ⚠ a global model — non-PII only (see `docs/DATA_POLICY.md`)          |
| **OpenRouter** (`openrouter`) | the **public demo deployment** only | ⚠ a global model, same contour as Claude; hard-capped, budget-capped |

> For a demo, keep the data **synthetic/anonymized** regardless of provider — that's
> good practice independent of which LLM you point at.

---

## OpenAI (the approved provider) — step by step

Console: **<https://platform.openai.com>**.

**0. Billing.** The organization needs an active payment method or prepaid credits —
otherwise API calls fail with a billing error. Check under **Settings → Billing**.

**1. API key.** **Dashboard → API keys → Create new secret key** (name it anything,
e.g. `crm-llm`). ⚠ **The secret is shown once** — copy it immediately. This is
`AI_API_KEY`.

**2. (Optional) Scope to a project.** If the organization uses Projects, create the key
under a dedicated project so usage/billing for the demo is easy to isolate. Not required
for a single-project account.

**3. `.env`** (in the repo root, **do not commit**):

```dotenv
AI_MODE=live
AI_PROVIDER=openai
AI_API_KEY=<the secret key>
# AI_MODEL=gpt-4o          # default; cheaper -> gpt-4o-mini
```

**4. Restart `npm run dev`** — the container is cached (a singleton on `globalThis`);
a provider change is only picked up after a restart.

**5. Verify the key BEFORE the demo** (independent of the app):

```bash
curl -s https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","max_tokens":50,"messages":[{"role":"user","content":"Say hello"}]}'
```

Text comes back in `choices[0].message.content` → the key/model works, the app will
boot too.

### Server-side STT (speech recognition, OpenAI Whisper)

Uses the same key as the chat provider (`AI_PROVIDER=openai`) — OpenAI API keys aren't
scoped per capability, so no extra role/permission is needed.

Round-trip check (synthesize a reference clip with OpenAI TTS, then transcribe it with
Whisper — the same request shape the adapter uses):

```bash
# TTS: synthesize a reference clip
curl -s https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer $AI_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"tts-1","voice":"alloy","input":"Glaze quality test, batch 12"}' \
  -o /tmp/sample.mp3 && \
# STT: transcribe it back
curl -s https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $AI_API_KEY" \
  -F file=@/tmp/sample.mp3 -F model=whisper-1
```

Returns `{"text": "..."}` → STT is enabled. Without a valid key, STT in the app returns
an error, but the `AI_MODE=stub` demo STT always works (a deterministic transcript).

---

## Claude (for a demo on synthetic data) — quick version

```dotenv
AI_MODE=live
AI_PROVIDER=anthropic
AI_API_KEY=<your Anthropic key>
# AI_MODEL=claude-opus-4-8   # default; cheaper -> claude-haiku-4-5
```

Restart `npm run dev`. The endpoint and model are hardcoded in the adapter.

---

## OpenRouter (demo-safe, budget-capped) — for the public deployment

The public demo needs a _real_ LLM behind a _shared, unattended_ key — no billing
surprises, no crash if the key is ever removed. `AI_PROVIDER=openrouter` is built for
exactly that: a separate key from `AI_API_KEY`, a hard 1024-output-token cap on every
call (`OpenRouterLlmProvider`), and an in-memory 200-calls/UTC-day budget
(`BudgetCappedAiGateway`) that — once spent — serves the deterministic stub instead,
prefixed with an honest note ("Demo AI budget exhausted for today…") rather than
failing the request. If `OPENROUTER_API_KEY` isn't set at all, the app behaves exactly
like `AI_MODE=stub`, even with `AI_MODE=live` — it never crashes on a missing key.

**1. API key.** **<https://openrouter.ai/keys>** → Create key. This is `OPENROUTER_API_KEY`.

**2. `.env`:**

```dotenv
AI_MODE=live
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<your OpenRouter key>
# OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free   # default -- zero marginal cost
```

**3. Restart `npm run dev`** (or the container, in prod) — same singleton-caching
caveat as the other providers.

**4. Verify the key BEFORE the demo** (independent of the app):

```bash
curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"meta-llama/llama-3.3-70b-instruct:free","max_tokens":50,"messages":[{"role":"user","content":"Say hello"}]}'
```

Text comes back in `choices[0].message.content` → the key/model works, the app will
boot too.

### 3 scripted demo scenarios

Each exercises a different call shape (`extractJson` = structured tool call,
`completeText` = free text) and a different page:

1. **Voice-to-act extraction** (`extractJson`) — open any deal → the test-act composer
   already has a sample transcript loaded (Sweet World Confections, a Miwe oven, Coverlux
   Cover glaze, 12% dosage, 180°C/15min) → **"AI recognize → draft report"**. The model
   should fill in client/equipment/product/dosage/process-params/result from the
   transcript, nothing invented.
2. **Head-of-sales assistant** (`extractJson` for tool routing + `completeText` for the
   answer) — log in as the head of sales (`a.peterson` / `demo1234`) → `/assistant` →
   ask _"Which deals are stalled?"_ or _"Who is over their credit limit?"_. The model
   routes to the deterministic CRM snapshot (never invents numbers) and phrases the
   answer.
3. **Draft client follow-up** (`extractJson`, `{subject, body}`) — on a deal card →
   "Draft client message" → the model writes a follow-up email from the deal's stage
   and recent activity; a human edits and sends it, nothing is auto-sent.

**Verification status of this section** (live smoke against the public deployment,
headless Chromium, real `OPENROUTER_API_KEY`, 2026-07-13):

- **Scenario-1-class flows work live.** Voice transcript → `extractJson` draft
  (the "Dictate a task (AI)" composer on a deal page) round-trips through the real
  OpenRouter API and fills the draft — verified twice on
  `OPENROUTER_MODEL=openai/gpt-oss-120b:free`.
- **Scenarios 2 and 3 cannot run on the OpenRouter contour — by design.** Their
  prompts embed ERP data (the assistant's CRM snapshot carries prices; the client
  email draft carries the counterparty), and the ADR-0007 runtime data-contour guard
  (`ContourGuardLlmProvider`) blocks prices/counterparties/PII from reaching any
  global model **regardless of `ALLOW_GLOBAL_LLM`** (that flag only clears the
  startup gate). To demo those two flows, point the deploy at the compliant provider
  (`AI_PROVIDER=openai`). The guard firing on the public demo is itself the
  data-residency story working as specified.
- **Free-model reality.** `:free` variants rate-limit upstream (429 on
  `meta-llama/llama-3.3-70b-instruct:free` and `qwen/qwen3-next-80b-a3b-instruct:free`
  during the smoke), and free hosts inconsistently honor `tool_choice` — the
  assistant's web-search routing (`extractJson` tool call) failed on a host that
  ignored it. `OPENROUTER_MODEL` is deploy-time configurable; pick a tools-capable
  model and expect occasional upstream throttling.

---

## How to demo it

Open a deal → **"🎤 Record"** → describe the outcome **in your own words, not from a
script** (out of order, with hesitations) → **"AI recognize → draft report"** → the
model fills in the fields → the technologist reviews it in ~30 seconds and
**confirms**. That's the production "speak it — confirm it" flow.

---

## Gotchas (verified against the docs)

- **`Bearer`, not `Api-Key`.** OpenAI's API expects `Authorization: Bearer <key>`.
- **Billing required.** Without an active payment method or credits, paid API calls
  fail.
- **The secret is shown once.** Lost it — you can only revoke and create a new one.
- **Response shape is OpenAI-native** (`choices[0].message.content`), not the
  Anthropic shape (`content[0].text`). Our adapter already matches the provider it
  targets.
- **Security:** the key is server-only (`.env`/secrets only — never in git, never sent
  to the client). Only the provider name and status are logged, never the request/response
  body.
- Actual per-token pricing changes — check the current pricing page rather than hardcoding it.
- **OpenRouter free models can 503/rotate.** `:free`-suffixed models (like the default
  `meta-llama/llama-3.3-70b-instruct:free`) are shared, best-effort capacity — an
  occasional 503 surfaces as `LlmError`, same as any other provider outage. `OPENROUTER_MODEL`
  can point at any paid OpenRouter model instead if reliability matters more than $0 cost.
- **OpenRouter's own free-tier limit is 200 requests/day per account** (independent of
  our app-level `BudgetCappedAiGateway`, which caps the same number for a different
  reason: protecting a shared demo key from ever running up a real bill on a paid model).
