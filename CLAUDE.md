# CLAUDE.md — Cognitive Study Buddy

Read this before touching anything. It is the operating manual for this repo.
When it conflicts with your instincts, this file wins. When it conflicts with
reality, stop and say so — do not silently work around it.

Hard limit: this file stays under 200 lines. Hand-curated context helps; bloated
auto-generated context costs attention and tokens. Earn every line.

## 1. Project

A web app that turns a student's own course material into evidence about what
they have not yet understood: select a deck → extracted topics → one open
question → a graded verdict with its reason shown.

This is **cognified software**: the LLM is a runtime reasoning component, not a
substitute for deterministic code and not a substitute for tests.

Read `specs/framing.md` before proposing any change — it holds the Definition of
Done and the out-of-scope list. `specs/specification.md` holds architecture and
contracts once written. Append to `specs/lessons-learned.md` whenever a mistake
teaches a rule.

**Stack:** React + Vite + TypeScript (strict) · Tailwind · Google Gemini behind
one adapter · Vercel (hosting + `api/` serverless functions). No database, no
backend, no identity — see `specs/framing.md` §4 for what that costs.

**Pinned model:** `models/gemini-3.1-flash-lite` — 15 RPM, 250K TPM, 500 RPD on
the free tier. These numbers are the budget; they are measured, not assumed.

## 2. Commands

> **The scaffold must update this section in the same turn.** A stale command
> list here is a defect.

```bash
npm install
npm run dev            # local dev server
npm run build          # production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run test           # vitest run
npm run verify         # typecheck && lint && test — THE GATE
npm run check:secrets  # build, then fail if a provider key reached dist/
npm run check:pins     # fail if a moving model alias reached any source file
```

**Not available yet.** The Vercel CLI is not installed. This block shrinks as
each command becomes real.

```bash
vercel dev             # app + api/ functions together
```

`npm run verify` is the only signal that counts. "It looks right" is not a
signal. "The dev server started" is not a signal.

## 3. Conventions

**TypeScript** — `strict: true`. No `any`; use `unknown` and narrow. No `!` on
values from the network, the database, or the model. Every function crossing a
boundary returns `{ ok: true, data } | { ok: false, error }` rather than throwing.

**Layout**
- `src/lib/` — pure logic, no React, no I/O. Scoring, ranking, validation. Most tests live here.
- `src/components/` — presentational. No fetching inside a component body.
- `src/hooks/` — data access and state.
- `api/` — Vercel serverless functions. All model calls live here and nowhere else.

**Naming** — files `kebab-case.ts`, components `PascalCase.tsx`, types
`PascalCase` with no `I` prefix, booleans read as assertions (`hasQuota`).

**Errors** — every user-visible failure says what failed and what to do next.
Never render model output that failed validation, and never substitute a
plausible-looking fallback. *(Norman's Gulf of Evaluation: failure must look like
failure. Lufthansa 2904 is the cost of a spec that only described the normal
case.)*

## 4. The LLM boundary — non-negotiable

1. **Model calls only inside `api/`.** Never in the browser, never in a hook.
   The key is a server-side Vercel env var named `GEMINI_API_KEY` — never
   `VITE_GEMINI_API_KEY`, because Vite inlines every `VITE_` variable into the
   client bundle.
2. **One adapter.** All provider traffic goes through a single `callModel(...)`
   module, so the provider can be swapped in one file.
   - The key travels in the **`x-goog-api-key` header**. The `?key=` query form
     is dead for current `AQ.`-format keys and must appear nowhere.
   - The model id is **pinned to an explicit version**. Never `-latest` or any
     other moving alias: a spec whose meaning drifts cannot be reproduced, and a
     bug that cannot be reproduced cannot be fixed.
3. **Every response is schema-validated** by deterministic code before use.
   Never ask a model to validate a model.
4. **Malformed output: retry exactly once, then fail visibly.** No third attempt,
   no repair loop, no invented substitute.
5. **Bounded cost.** The per-cycle model-call budget is criterion **N2** in
   `specs/framing.md`; the rate limit is **N11**. Read the number there — it is
   not repeated here, because a figure restated in two files drifts (L8, L12).
   Both are enforced in code, not by convention, and exhaustion renders as a
   named "daily limit reached" state, never a blank screen.
6. **Re-use context, don't re-send it.** Extracted corpus text is stored once and
   referenced across question generation. Re-sending the deck per question is a
   budget bug.
7. **Do not parallelise to save latency.** An earlier version of this file said
   the opposite. With 15 RPM on the free tier, fanning out per-question calls
   burns the request budget for a few seconds of wall-clock. Batch instead: the
   topics and the question come back from a single call, per N2. Parallelise
   only when the requests are genuinely independent *and* the budget has room.
8. Check the boundary table in `specs/framing.md` §5 before moving any concern to
   the model. Reaching for the LLM where deterministic code suffices is the most
   common failure mode in this project.

## 5. Verification

**Do not write empty tests.** A test asserting a function returns something
truthy is worse than no test: it manufactures false confidence.

Every test probes a real risk:
- **Degenerate input** — zero-page file, deck with no extractable text, zero answers submitted.
- **Boundaries** — exactly 30 pages, exactly 10 MB, exactly 5 topics, exactly 15 topics.
- **Model failure** — malformed JSON, empty string, schema-valid but empty response, timeout.
- **Cost** — call counter asserted against the cap.

Rules: stub the adapter, never call the live API from tests. Fixtures are
committed; tests are deterministic and offline. **When a test fails, show the
failure verbatim** — do not summarise it, do not call it minor, do not move on.
Never weaken an assertion, add `skip`, or widen a type to reach green; if a test
is wrong, say so and explain why before changing it.

## 6. Git

- **Atomic commits.** One logical change each. A migration, a gate, and a UI
  change are three commits.
- **Messages explain *why*.** The diff shows what. Imperative subject, blank
  line, then the reasoning and the rejected alternative.
- **Never `--force` to `main`.** Never rewrite published history. Never
  `git add -A` blindly.
- **Before a large turn, tell the human to commit the clean state first.** A turn
  that starts from a dirty tree destroys the audit trail, and the trail is the
  graded artifact. Git is the safety layer — not tool-native snapshots, which
  have silently deleted uncommitted work before.
- `.env*` files are gitignored. If you see a secret staged, stop and say so.
- Intent precedes implementation: the spec commit lands before the code commit
  that implements it. Never reorder or backfill commits to look tidier.

## 7. Safety and drift

- **Never bypass a gate.** No disabled lint rule, no `@ts-ignore`, no skipped
  test to reach green. If the gate is wrong, say so and wait.
- **Ask before destructive actions:** dropping tables, resetting the database,
  deleting files, and rewriting any spec criterion.
- **Never claim something works without having run it.** If you did not run
  `npm run verify`, say that you did not run it.
- **Scope discipline.** If a task needs something on the out-of-scope list, stop
  and say so. Do not build it because it seemed necessary.
- **State uncertainty plainly.** A guess labelled as a guess is useful; a guess
  presented as fact corrupts the trail.
- **Self-check for drift** — if you notice yourself writing long explanations
  instead of changes, touching files unrelated to the task, or acting on a rule
  nobody stated, stop and say so. Expect the context to be reset.

## 8. Working agreement

Before a multi-file change, state in three lines: what you will do, how it fits
the existing structure, and whether the output is low, medium or high token cost.
Then wait for explicit approval.

After a change, report what changed, whether `npm run verify` passed, and what
remains. The human supplies judgment and accountability; you supply the explicit
work. Accountability never transfers.

Report findings; do not stop for approval on each one. If something does not
block the current task, is not a security problem, and does not make a
document state something false, append it to "Open items" in the current turn
of `specs/spiral-log.md` and carry on.
