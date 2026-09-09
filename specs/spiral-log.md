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
- **Open items:**
  - **Resolved 2026-09-03: Vercel does exempt `api/_lib/` from routing.**
    `specification.md` §3.1 places the single adapter at `api/_lib/call-model.ts`
    and relied on the underscore prefix to stop Vercel turning it into an
    endpoint — asserted, not confirmed, when this item was opened. Checked
    against the live preview deploy: a direct request to
    `<preview-url>/api/_lib/call-model` returned `404 NOT_FOUND`. No Vercel
    error ID was recorded for this check.
    N1's boundary — the adapter is unreachable from outside `api/generate.ts`
    and `api/evaluate.ts` — now rests on empirical confirmation against a real
    deployment rather than on the convention it was built against. Had the
    request instead reached the adapter, the result would have been an open
    proxy: any caller could spend the provider key directly, which is the
    exact failure N1 and the `api/` boundary exist to prevent.
- **Planned observation:** run the full cycle on a real HIT lecture deck, in Hebrew, and record what the extraction actually returns.
- **Real-deck observation, 2026-09-03 — the planned observation above could not
  run: a real PDF fails to upload on the live preview deploy at all**, before
  any Hebrew question of extraction quality could be reached. The UI showed
  "That file could not be opened as a PDF."
  Root cause, traced from `pdfjs-dist`'s own shipped source
  (`node_modules/pdfjs-dist/legacy/build/pdf.mjs`) rather than the browser
  console, which this session has no tool to open: `GlobalWorkerOptions.workerSrc`
  is never set in `src/lib/pdf-text.ts`. `PDFWorker`'s static initializer
  auto-sets it, but **only when `isNodeJS` is true**:
  `if (isNodeJS) { this.#isWorkerDisabled = true; GlobalWorkerOptions.workerSrc ||= "./pdf.worker.mjs"; }`.
  In a browser `isNodeJS` is false, nothing sets the value, the real-worker path
  fails, the fake-worker fallback needs the same unset value to dynamically
  import the worker module, and both attempts throw
  `No "GlobalWorkerOptions.workerSrc" specified.`. The traced rejection message
  is `Setting up fake worker failed: "No "GlobalWorkerOptions.workerSrc"
  specified.".`, which `pdf-text.ts` catches and reports as `unreadable` —
  exactly the message the deploy showed.
  **This is not a gap in the six `pdf-text` tests' design — it is structural.**
  Vitest's `jsdom` environment emulates `window` and `document`; it does not
  replace `process`, so `isNodeJS` evaluates true inside every test in this
  suite regardless of which vitest environment a file opts into. No test run by
  this tool, under any configuration, could have exercised the browser code
  path — only a real browser could, and only a real deploy surfaced it. This is
  the case CLAUDE.md §5's "the dev server started is not a signal" and this
  project's own repeated finding — a green suite proving less than it appears
  to — arrives in a new shape: not a mis-scoped test, but a code path no
  offline test in this stack can reach at all.
  **Fixed 2026-09-05 — build-confirmed, not run-confirmed.** `pdf-text.ts` now
  sets `GlobalWorkerOptions.workerSrc ||= new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()`.
  The first attempt used a plain `=` and broke all nine tests that touch
  extraction: pdfjs's own module-load initializer already sets `workerSrc`
  correctly under Node (`"./pdf.worker.mjs"`, resolved relative to `pdf.mjs`
  by its own internal `import()`), and the unconditional assignment overwrote
  that working value with one resolved relative to *this* file instead,
  breaking it. `||=` defers to pdfjs's own value when present and supplies
  ours only when it is not — which is only in a browser, where nothing else
  sets it. Verified two ways, both build-time: `vite build` emits
  `dist/assets/pdf.worker-<hash>.mjs`, and that hashed filename appears
  inside the built main bundle, confirming the reference was rewritten rather
  than left as the broken literal. `npm run verify` passes at 89/89 with the
  fix in place, which confirms the Node/test path was restored, not that the
  browser path works. **No browser is available in this environment. This fix
  has not been run in a browser and does not close this observation — the
  real-deck check does, once confirmed there.**
  **Run-confirmed 2026-09-06.** The worker fix was checked in an actual browser
  against the preview deploy, closing the piece build-confirmation could not:
  extraction now succeeds.
- **Real-deck observation, 2026-09-06 — a second, distinct deployment-only bug
  surfaced immediately behind the first.** With extraction fixed, `/api/generate`
  returned `500`, which the client surfaced only as "model could not be
  reached." The Vercel function log gave the actual cause:
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/src/lib/contracts'
  imported from /var/task/api/generate.js`.
  Diagnosed by reproduction, not by inspecting the deploy further: two throwaway
  files in a `"type": "module"` package, one importing the other without a file
  extension, fail under plain `node` with the identical error shape. Every
  relative import in this repository — in `src/`, `api/`, and `api/_lib/` alike
  — was written without an extension (`from './contracts'`, `from
  '../src/lib/schema'`). That is legal under `tsc`'s `moduleResolution:
  "bundler"` and under Vite/Vitest's own resolver, both of which special-case
  extensionless specifiers; it is not legal under Node's native ESM loader,
  which is what actually executes a Vercel Node function once
  `package.json` declares `"type": "module"`, and which refuses to resolve a
  relative specifier without an extension regardless of whether the file is
  present. Vercel's builder transpiles each file individually rather than
  bundling, so the extensionless specifier survived unchanged into the deployed
  `.js` and failed at the first runtime import — `../src/lib/contracts`, the
  first non-type-only import in `generate.ts`'s source order.
  Vercel's tracing of files outside `api/` was never the defect — `api/_lib/`
  already imported two directories up before this fix, and nothing about that
  changed.
  **Fixed 2026-09-06.** Added the missing `.js` extension to every relative
  import across `src/` and `api/` (the standard TypeScript-for-native-ESM
  idiom: write `./contracts.js` against a `contracts.ts` source; Vite and
  Vitest already resolve that pattern), and switched `tsconfig.json` from
  `moduleResolution: "bundler"` to `"nodenext"` (paired with `module:
  "nodenext"`, plus `esModuleInterop` and `with { type: 'json' }` on the
  fixture imports nodenext requires). The tsconfig change is the part that
  answers this project's repeated question — twice now (the worker, and this)
  — of whether anything can gate a deployment-only failure short of a real
  deploy: `nodenext` makes an extensionless relative import a `tsc` error, so
  `npm run typecheck`, already inside `verify` and CI, now refuses to compile a
  future regression of this exact bug rather than merely failing to catch it.
  Verified offline, close to the real execution path rather than through
  Vite's bundler resolution: `npx tsx` — which loads TypeScript under real
  Node module resolution — imports `api/generate.ts`, `api/evaluate.ts`, and
  all three `api/_lib/` modules cleanly. `npm run verify` passes at 89/89 with
  the tightened config. **Not confirmed against an actual Vercel deploy — that
  check belongs to whoever has the preview URL.**
- **Commit range:** `c3e64df..aa0826e` (the commit that records this range
  falls outside it by necessity, per the convention Turn 0 set).
- **Observed (2026-09-03):** the specification did not survive contact with the
  implementation, in five places. Four were contracts that were reasonable
  statements about a system that did not exist yet and were falsified by the
  first artifact obliged to honour them: a response validator required to bound
  a page number by a page count its endpoint never received; a size-and-page
  check specified to happen "before any work" when page count is only knowable
  after parsing; committed binary PDF fixtures nobody could review; and a
  DOM-free test asserted as a property when the test environment is `jsdom` by
  default and the file has to opt out.

  The fifth is different in kind. **N2 and N5 contradicted each other.** N2 said
  a cycle costs exactly one model call, enforced by a counter; N5 said malformed
  JSON triggers exactly one retry. Both are DoD criteria, both sit in the same
  table eleven lines apart, both had been read many times, and each is correct
  alone — one is about cost, the other about failure handling. They cannot both
  hold, and nothing surfaced it until a single artifact, the call counter in the
  adapter, had to obey both at once. No further re-reading would have found it.

  A sixth arrived from running the tests rather than reading anything, and it
  was self-inflicted: §4 listed a Hebrew deck among the generated fixtures, and
  no such deck can be generated. The standard PDF fonts are WinAnsi-encoded and
  cannot represent Hebrew codepoints, so the generator refuses before a file
  exists. The generated-fixtures decision, taken two commits earlier to keep
  binaries out of the repository, created a case it could not express — and only
  half of that trade was visible when it was made. Extraction of Hebrew from a
  real PDF is now untested offline, and the specification says so.

  Also observed, from the environment rather than the documents:
  `pdfjs-dist@6` cannot be loaded at all on the Node version this project pins,
  because it calls `Uint8Array.prototype.toHex`, which Node 24.13.0 does not
  implement. Found by running it (L5), not by reading release notes.

- **Changed as a result:** N2 rewritten to state the success path and the retry
  path separately, cap the total, and name the retry as the only permitted
  second call — `f1c43dc`. Four contracts in `specification.md` corrected —
  `5825f56`. `pdfjs-dist` pinned to a major that loads on the pinned Node,
  rather than polyfilled into apparent health — `98afd34`. The client env module
  the backend cut had orphaned was deleted rather than kept alive by inventing a
  variable — `c2ef2a5`.

  What this turn demonstrates, and the reason the spec was written before the
  code rather than after: a specification that lands first can be contradicted
  by the build, and this one was, five times in an afternoon. Written afterwards
  it would have described whatever the implementation happened to do, and the
  contradiction between two Definition-of-Done criteria would have been resolved
  silently by whichever one the author implemented first.

- **Real-deck observation, 2026-09-06 — the planned observation, closed.** A
  real HIT course deck (נוסחאון הסתברות — a probability formula sheet, in
  Hebrew) ran the full cycle on the live preview by hand. Extraction returned
  intact Hebrew text; the topics returned were in Hebrew and relevant to the
  source (probability concepts); the single question returned was in Hebrew and
  genuinely hard — a real probability question, not answerable from
  recognition alone. **D9 is confirmed by a real deck, in a human's eyes,**
  which `specification.md` §4 always named as the only check that would count,
  the committed fixtures being unable to reach Hebrew at all (recorded earlier
  in this turn).
  The answer given was "לא יודע" — I don't know. The model returned, in Hebrew,
  that no answer had been provided and it could therefore not assess
  understanding. It declined to invent a score against nothing. That is the
  honest failure behaviour N5 and CLAUDE.md §3 ask for ("never substitute a
  plausible-looking fallback"), observed against the live model rather than
  asserted against a stub.
  **Carried to Turn 2 as an open question, not a bug:** whether a non-answer
  should score `0` explicitly or return a distinct "cannot assess" state, and
  whether the verdict shown to the student carried a score alongside the
  explanation or only the explanation. Turn 2 exists to examine exactly this —
  the quality and behaviour of the grading call, O5 — and re-deciding it now,
  on one observation, would be the same mistake N2 vs N5 already taught this
  project not to make.

**Turn 1 closed 2026-09-06.** It opened with framing and a Definition of Done
for a system that did not exist; it closes with that system working, deployed,
and confirmed end to end on a real Hebrew deck by a human — across a
documented spiral of six specification contradictions and two deployment-only
failures that no offline gate in this stack could have caught unaided, and in
one case (the worker bug) structurally could not catch at all. Both deploy
bugs are now fixed and, in the second case, gated at typecheck time against
recurrence. Open going into Turn 2: O5 (grading quality) and the non-answer
scoring question just raised.

---

## Turn 2 — Confront the grader with reality _(closed 2026-09-08)_

- **Module beat:** M12 (safety and trajectory) · M13 (verification gates)
- **Goal:** Resolve **O5** — decide by evidence whether `gemini-3.1-flash-lite` can grade free-text answers, rather than by assumption.
- **To lock before acting:** a fixture set of real student answers per topic — correct, partially correct, confidently wrong, off-topic, and empty.
- **Locked in this turn:** `src/fixtures/o5-answers-he.md`, committed before any run (`3967d88`) — the real question the live deploy generated in Turn 1 (memorylessness of the geometric distribution), five hand-written Hebrew answers each labelled with an expected score band set in advance, and the note that answer 3 deliberately reuses the correct answer's own formula while drawing the opposite false conclusion — the case that decides whether the grader reads for meaning or pattern-matches the formula's presence.
- **Planned observation:** does the model score a confidently-wrong answer as correct? That failure mode is invisible to a happy-path test and is the one that would make the whole product dishonest.
- **Decision rule set in advance:** if wrong answers are scored above 0.5 more than once in the fixture set, route only the evaluation call to `gemini-3.5-flash` and cut the per-user cap to match its 20 RPD. Record the trade-off either way.
- **Commit range:** `3967d88` — the single commit this turn adds before its close (the fixture). The commit that records this range and closes the turn falls outside it by necessity, per the convention Turn 0 set.
- **Observed (2026-09-08):** all five answers run by hand through the live deploy against the one real question. Correct scored 1.0, partial scored 0.7 — above its predicted 0.4–0.6 band, a miss on the number but not on direction, since it still landed well below correct and well above the wrong cluster — and the three low cases (confidently wrong, off-topic, empty) all scored exactly 0. **The key case held:** answer 3 reused the correct answer's own formula, `P(X > k+n | X > k) = P(X > n)`, and attached the opposite, false conclusion to it. A grader pattern-matching formula presence would have scored this high; the live model scored it 0 — direct evidence the model graded what the answer claimed, not what symbols it contained. This is the exact failure `specification.md` §5 item 9 named as untestable offline, because a stub returns the score it is given, and it is the first evidence in this project observed against the live model rather than asserted against one.
- **Changed as a result:** the decision rule fired and returned **no change** — a real outcome, recorded as one rather than treated as a non-event. Zero of the three wrong-answer cases cleared 0.5, so `models/gemini-3.1-flash-lite` stays and the per-user cap is unchanged; no escalation to `gemini-3.5-flash`. **O5 moves from open to resolved** in `specs/framing.md` §6, recorded there with the same scores and the same honest limit stated here: this is one question with one answer per label — evidence, not proof. A single confidently-wrong answer scoring 0 does not rule out the same model scoring a different confidently-wrong answer, on a different topic, above 0.5. Nothing in `specs/specification.md` or the adapter contract changed — the rule was written precisely so that a small labelled set could decide the model choice without a full study, and it did.

**Turn 2 closed 2026-09-08.** It opened with O5 stated as open by design — flash-lite untested against real judgment — and closes with one real run against the case built to catch the specific dishonest failure (a confident, formula-citing, wrong answer scored as correct), which did not occur. The model stays pinned, the cap stays as specified. Open going into Turn 3: the abnormal-case hardening list Turn 3 already names, and the honest caveat that O5's resolution rests on one observation.

---

## Turn 3 — Harden against the abnormal case _(closed 2026-09-09)_

- **Module beat:** M16 (merge-readiness) · M13 (verification gates)
- **Goal:** The system fails honestly under every condition it will actually meet, and the repository is merge-ready.
- **To lock before acting:** the list of abnormal cases to force — quota exhausted, model timeout, malformed JSON twice in a row, a deck with no extractable text, a 31-page deck, two users racing on the same quota row.
- **Planned observation:** every one of those paths reaches the user as a named, readable state. *(Lufthansa 2904: the specification that described only the normal landing.)*
- **Real-deck observation, 2026-09-09.** A deck over 30 pages was uploaded to
  the live deploy by hand. The system showed a named error stating the
  document exceeds 30 pages and refused it cleanly — no crash, no silent
  proceed. This is the too-many-pages path (**D2** / `ExtractionFailure`),
  **run-confirmed against the real deploy**, not merely stub-confirmed
  against `pdf-text.test.ts`. It is this turn's first real-deck observation,
  in the same class as Turn 1's worker and ESM bugs: a case only a real
  browser against a real deploy can settle.
- **Commit range:** `7b7cadb` — the single commit this turn adds before its
  close (the four new tests). The commit that records this range and closes
  the turn falls outside it by necessity, per the convention Turn 0 set.
- **Observed (2026-09-09) — the audit.** Every abnormal case in this turn's
  "to lock" list and `specification.md` §5 was checked against the actual
  test suite and the real-deck run above, distinguishing three levels of
  proof: whether the underlying function returns the right failure kind,
  whether a test proves the named message actually renders to `role=alert`
  on screen (`App.tsx` wires each phase — `deck-failed`, `model-failed` — to
  its message function through **one generic switch**, so a render test for
  one kind in a phase does not prove any other kind in that phase renders),
  and whether a real deploy confirmed it.

  **Six of nine were already fully covered at both levels**, built
  failure-first during Turn 1's construction rather than retrofitted here:
  quota exhausted (N11), model timeout (N6), malformed-twice (N5), no
  extractable text, and misconfigured server all have both a function-level
  test and an `App.test.tsx` test asserting the specific message on screen.
  **Too-many-pages** had the function-level boundary test but no render
  test; the real-deck run above closes it instead, with stronger evidence
  — an actual browser, not `jsdom`.

  **The audit found three real gaps, stated plainly rather than
  rubber-stamped:** the failure-first convention held for 6 of 9 cases, not
  9 of 9. Too-large and unreadable each had the failure kind proven in
  `pdf-text.test.ts` but no test proving the message reaches the screen.
  Refused/4xx was the deepest gap: proven only at the adapter layer
  (`call-model.test.ts`), with nothing at the handler layer or the screen —
  compounding with the pre-existing gap that `api/evaluate.ts` has no test
  file at all.
- **Changed as a result:** four tests added, closing the "does the user see
  it" question for all three — `7b7cadb`. Three in `src/App.test.tsx`
  (too-large, unreadable, refused), each asserting the specific message
  text on `role=alert`, following the same render-and-assert pattern as the
  five failure-state tests already there. One in `api/generate.test.ts`,
  proving the handler forwards a refused provider response as `{kind:
  'refused', status}` rather than retrying or leaking it — added because it
  was one mock away from an existing test, not as an attempt to close the
  larger `api/evaluate.ts` gap. `npm run verify`: 89 → 93 tests, all green.
  **Named, not fixed:** `api/evaluate.ts` still has no dedicated test file.
  This turn closed the render-reaches-the-user question for three failure
  kinds; it did not rebuild the endpoint test surface that gap belongs to.
  That stays in Known gaps for whoever picks it up.

**Turn 3 closed 2026-09-09.** It opened with a hardening goal against a list
of abnormal cases and closed having found that the goal was mostly already
met — six of nine cases were failure-first by construction in Turn 1 — and
having found three cases where it was not: the failure kind was proven but
the message reaching the user was assumed, not tested. Closing that gap,
plus the real-deck confirmation of the one case a unit test cannot fully
settle (too-many-pages, run-confirmed against the live deploy), is what this
turn changed. An audit that finds real holes rather than confirming existing
work is the more honest spiral outcome, and it is recorded as such rather
than as a formality.
