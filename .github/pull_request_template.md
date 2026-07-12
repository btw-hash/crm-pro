## What and why

<!-- Briefly: what this PR changes and what problem it solves. Link to the task/ADR if any. -->

## How to verify

<!-- Steps for the reviewer: what to run, what to click, what result to expect. -->

## Author checklist

- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors
- [ ] `npm test` — green
- [ ] Affected logic covered by tests (domain/use-cases)
- [ ] Clean-architecture boundaries intact (domain doesn't know about Next/ERP/AI)
- [ ] No secrets/keys/personal data in the code or in `.env`
- [ ] Ran the AI review locally (Claude Code: `/review` on the branch diff) and addressed the notes

## Screenshots / notes

<!-- For UI — before/after. For a designer — what to show. -->
