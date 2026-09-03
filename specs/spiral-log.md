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
- **Goal:** A visitor selects a deck and receives one open question and a graded verdict, with every criterion in `framing.md` §3 green in CI.
- **To lock before acting:** `specs/specification.md` — Knuth's five criteria, the five required parts, the per-cycle call budget as criterion N2 defines it, and the prompting strategy for each call.
  - A CI grep gate enforcing L8: a figure that governs behaviour must appear
    once. Cannot exist before the scaffold, so it is locked here and built with
    the rest of the CI gates.
  - Identity model: Supabase anonymous sign-in rather than Google/GitHub OAuth.
    Decided 2026-08-31, before any auth code existed. Rejected: no auth at all,
    which would have silently taken N3 and N4 with it.
  - N10's verification as written is sequential and would pass against an
    implementation with a race: two requests can both read a count of 399 and
    both proceed. The global cap must be enforced atomically (a single
    conditional UPDATE or equivalent), and specification.md must specify that,
    not leave it to the implementation.
  - **Superseded 2026-09-01 by the scope cut — the two items above are closed,
    not outstanding.** Supabase anonymous sign-in is gone with the backend;
    there is no identity of any kind, and the out-of-scope list in
    `framing.md` §4 replaces the decision. N10 is withdrawn, so its atomicity
    requirement has nothing to apply to; N11 replaces it with a client-side
    counter whose stored value is user-writable by construction, which moves the
    concern from a database race to untrusted input — specified in
    `specs/specification.md` §3 rather than here. Both bullets are left in place
    as the record of what was locked and when; neither is a live commitment.
- **Accepted risks:**
  - The Gemini API key in use was exposed in a chat transcript and was later
    pasted into `.env.example` (tracked) instead of `.env.local` (ignored),
    where it sat one `git add` from a push. It was caught by review before any
    commit; no commit in the repository's history contains key material.
    Decision, 2026-08-31: the key is not rotated. The deployment is short-lived
    and exists for submission and grading, the free-tier quota bounds the
    financial exposure at zero, and the global cap in N10 bounds the volume.
    Accepted knowingly rather than overlooked.
- **Scope decision, 2026-08-31:** the Definition of Done was cut to upload →
  topic extraction → one open question → graded verdict. Forced by available
  effort, not by a technical finding. Rejected: keeping the full four-capability
  scope with zero schedule slack, which risked reaching submission without the
  third spiral turn — itself a course requirement.
- **Scope cut 2026-09-01:** Supabase is removed from the project entirely, and
  with it every criterion that depended on it — D1 (anonymous identity), the
  storage half of D2, N3 (per-user cap in the database), N4 (RLS isolation) and
  N10 (global cap in the database). The app becomes a single page that holds
  nothing: the PDF is read in the browser, the text never leaves the tab except
  as one model call, and no state survives a reload. N2 falls to exactly one
  call per cycle. N11 replaces N3 and N10 with a `localStorage` counter that
  bounds ordinary use and is trivially bypassed, which the criterion says in its
  own text rather than leaving to be discovered.
  Forced by schedule, not by a finding. Nothing about Supabase failed; there was
  no measurement, no broken integration, no technical discovery. There was not
  enough remaining effort to stand up auth, storage, a schema, RLS policies and
  two server-side counters *and* still run Turns 2 and 3.
  **Rejected:** keeping Supabase and reaching submission with one spiral turn
  instead of three. That trades three verification criteria for a course
  requirement, and the requirement is the larger loss — a project with real RLS
  and one turn demonstrates less than a smaller project that visibly learned
  three times.
  **Cost, named:** N3, N4 and N10 were among the strongest evidence here, and
  N4 in particular is gone with nothing replacing it — there is no isolation to
  test when there is no data and no user. This is a genuine reduction in what
  the repository proves, not a reorganisation.
- **Risk re-examined and closed 2026-09-02:** the key is rotated. The exposed
  key has been **deleted** in Google AI Studio — dead, not merely superseded. A
  new key was issued, set in Vercel across Production, Preview and Development,
  written to `.env.local`, and the deployment re-run. The new key has never
  appeared in a chat transcript and has never been written to `.env.example` or
  any other tracked file.
  The acceptance above rested on three supports: a short-lived deployment, a
  free tier bounding financial exposure at zero, and **the global cap in N10
  bounding the volume**. The scope cut of 2026-09-01 withdrew N10 along with the
  backend. What replaced it, N11, is a `localStorage` counter that resets when a
  browser is cleared, so it bounds nothing an attacker does. After the cut,
  nothing bounded the exposed key but the provider's own free-tier quota — which
  is a rate, not a control, and belongs to a third party.
  So the risk was **re-decided, not re-accepted**. The original decision was
  sound on the day it was made; it simply stopped being the same decision once
  one of its supports was removed. Rotating costs one dashboard visit, which is
  less than the argument would have cost to rebuild.
  **The rule it demonstrates:** an accepted risk is only as live as the
  reasoning underneath it, and a scope change can invalidate that reasoning
  without touching the risk itself. Nothing about the key changed on 2026-09-01.
  The argument protecting it disappeared, in a different document, in a commit
  that never mentioned the key. Recorded as L13.
- **Open items:** _non-blocking findings, swept when the turn closes_
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
