# Turn on a real LLM (live) behind the `AiGateway` port

By default the AI layer runs on a **stub** (`AI_MODE=stub`) — the demo works with no
keys and no network. To show production behavior (free-form speech → AI-parsed
report), switch **live** on for one of the providers behind the `LlmProvider` port:

| Provider                 | When                               | Data policy                                                 |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------- |
| **OpenAI** (`openai`)    | real/production customer data      | ✅ the approved compliant provider — safe for real PII      |
| **Claude** (`anthropic`) | code / anonymized / synthetic data | ⚠ a global model — non-PII only (see `docs/DATA_POLICY.md`) |

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
