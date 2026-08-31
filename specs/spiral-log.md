# Co-evolution Spiral Log

One entry per turn. Written **during** the turn, not reconstructed afterwards.
A backfilled entry is worse than a missing one: it makes the trail dishonest.

Each entry names the **module beat** it answers, so the trail reads as a paced
sequence of turns rather than a single compilation at the end.

**A turn in which no specification changed is not a turn.** Adding features in a
straight line is not co-evolution. Every turn must show something observed
against reality that the plan did not predict, and a commit that changes
`framing.md` or `specification.md` because of it. If a turn ends with every
document untouched, the honest entry says the turn failed to learn anything, and
the next turn is designed to look harder.

**Submission:** 2026-09-08 (also the final class). Work lands by 2026-09-07.

Each entry records what was locked, what was observed, and what that observation
changed. "Nothing changed" is a legitimate finding and must be stated as one.

---

## Turn 0 — Framing (closed 2026-08-31)

- **Date:** 2026-08-31
- **Module beat:** M6 (problem framing) · M11 (context engineering) · M16 (merge-readiness, as a template)
- **Goal:** Establish the problem, the boundaries, and the operating rules before any code exists.
- **Locked in this turn:**
  - `specs/framing.md` — problem statement, stakeholders, Turn 1 DoD, out-of-scope list, cognified/deterministic boundary
  - `CLAUDE.md` — commands, conventions, LLM boundary, verification rules, git and safety rules
  - `specs/spiral-log.md` — this file
  - `specs/lessons-learned.md` — rules earned, seeded with L1–L3
  - `.github/PULL_REQUEST_TEMPLATE.md` — the five Merge-Readiness pillars, so the check recurs on every PR instead of being remembered once
- **Commit range:** `d8d8aae..d84adcc` (the commit that records this range
  falls outside it by necessity). Convention: the range is written when the
  turn closes, not while it is open.
- **Decisions made and why:**
  - **Scope cut to a narrow core.** Upload → topics → 5-question quiz → weakness map. The staged study plan and worked-example explanations were deliberately deferred to Turns 2 and 3. Rationale: three half-finished capabilities with a tangled history score worse than one capability closed cleanly.
  - **Gemini, not OpenAI.** The free ChatGPT interface exposes no API, and the OpenAI API is billed per token with no free tier. Gemini's free tier is the only option that supports a multi-user deployment at zero cost. Wrapped behind a single `callModel` adapter so the provider can be swapped in one file.
  - **Vercel over Netlify.** Changed from the original course brief. Both host a Vite SPA equally well; Vercel was chosen because the account already existed, which removes a setup step. Recorded here so the change reads as a decision rather than drift.
  - **Model calls confined to Vercel Serverless Functions under `api/`.** A Vite client bundle cannot hold an API key; anything shipped to the browser is public. Vercel functions were chosen over Supabase Edge Functions to keep a single deploy pipeline and a single environment-variable dashboard — fewer moving parts, fewer ways for the key to end up in the wrong place. Supabase remains the Auth, Postgres and Storage layer.
- **Rejected alternatives:**
  - Direct provider calls from the React client — leaks the key.
  - Locking the full four-capability vision as the DoD — unmeasurable and unfinishable in the available turns.
- **Observed — and it changed the spec three times:**
  1. The chosen provider had no usable free API at all (L1). Provider changed to Gemini before a line of code existed.
  2. The current `AQ.`-format key works only through the `x-goog-api-key` header, not the `?key=` query form widely shown in examples (L5). Became criterion N9.
  3. **The measured quota inverted a written rule.** `gemini-3.5-flash` allows 20 requests per day for the entire deployment — two full cycles. `CLAUDE.md` had instructed the agent to parallelise independent calls for latency; under that ceiling, fanning out five question-generation calls spends a quarter of the daily budget to save seconds. The rule was reversed to batching, the per-cycle budget cut from 8 calls to 3 (N2), and the model pinned to `gemini-3.1-flash-lite` at 500 RPD — from 2 viable cycles per day to roughly 166 (L6).
- **Open at the end of this turn:** O1, O4, O5 in `specs/framing.md` §6. O2 and O3 resolved by measurement.

---

## Turn 1 — Build the narrow core _(planned 2026-09-01 → 2026-09-05)_

- **Module beat:** M10 (specification) · M9 (economics) · M13 (verification gates)
- **Goal:** A visitor uploads a deck and receives a ranked weakness map. every criterion in framing.md §3 green in CI.
- **To lock before acting:** `specs/specification.md` — Knuth's five criteria, the five required parts, the 3-call budget, and the prompting strategy for each of the three calls.
  - A CI grep gate enforcing L8: a figure that governs behaviour must appear
    once. Cannot exist before the scaffold, so it is locked here and built with
    the rest of the CI gates.
  - Identity model: Supabase anonymous sign-in rather than Google/GitHub OAuth.
    Decided 2026-08-31, before any auth code existed. Rejected: no auth at all,
    which would have silently taken N3 and N4 with it.
- **Planned observation:** run the full cycle on a real HIT lecture deck, in Hebrew, and record what the extraction actually returns.
- **Commit range:** _fill in as it happens_
- **Observed:**
- **Changed as a result:**

---

## Turn 2 — Confront the grader with reality _(planned 2026-09-06)_

- **Module beat:** M12 (safety and trajectory) · M13 (verification gates)
- **Goal:** Resolve **O5** — decide by evidence whether `gemini-3.1-flash-lite` can grade free-text answers, rather than by assumption.
- **To lock before acting:** a fixture set of real student answers per topic — correct, partially correct, confidently wrong, off-topic, and empty.
- **Planned observation:** does the model score a confidently-wrong answer as correct? That failure mode is invisible to a happy-path test and is the one that would make the whole product dishonest.
- **Decision rule set in advance:** if wrong answers are scored above 0.5 more than once in the fixture set, route only the evaluation call to `gemini-3.5-flash` and cut the per-user cap to match its 20 RPD. Record the trade-off either way.
- **Commit range:**
- **Observed:**
- **Changed as a result:**

---

## Turn 3 — Harden against the abnormal case _(planned 2026-09-07)_

- **Module beat:** M16 (merge-readiness) · M13 (verification gates)
- **Goal:** The system fails honestly under every condition it will actually meet, and the repository is merge-ready.
- **To lock before acting:** the list of abnormal cases to force — quota exhausted, model timeout, malformed JSON twice in a row, a deck with no extractable text, a 31-page deck, two users racing on the same quota row.
- **Planned observation:** every one of those paths reaches the user as a named, readable state. *(Lufthansa 2904: the specification that described only the normal landing.)*
- **Commit range:**
- **Observed:**
- **Changed as a result:**
