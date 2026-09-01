## What and why

<!-- One paragraph. What changed, and what problem it solves. The diff shows
     what; this explains why, and what alternative was rejected. -->

**Spec reference:** <!-- DoD criterion (e.g. D4, N2) or spec section this serves -->

---

## Merge-Readiness Pack

A feature enters `main` only when all five pillars hold. Unchecked boxes are
fine on a draft; a merge-ready PR has no unchecked box and no box checked out of
politeness. Replace each italic hint with the actual evidence.

### 1. Functional completeness
- [ ] The end-to-end result works, not merely the tests
- [ ] Empty, degenerate and failure states behave correctly, and failure looks like failure

*Evidence:*

### 2. Sound verification
- [ ] Tests probe real edge cases, not the happy path
- [ ] Model-failure paths covered: malformed JSON, empty response, timeout
- [ ] `npm run verify` passes locally **and** in CI

*Test output / CI run:*

### 3. SE hygiene
- [ ] TypeScript strict, no `any`, no new `@ts-ignore`
- [ ] Lint clean — no rule disabled to reach green
- [ ] No secret in the diff; `npm run check:secrets` passes
- [ ] Model calls only inside `api/`, behind the single adapter

*Notes:*

### 4. Rationale and communication
- [ ] Trade-offs stated, including what was rejected and why
- [ ] Anything on the out-of-scope list stayed out
- [ ] Any lesson earned here was appended to `specs/lessons-learned.md`

*Trade-offs:*

### 5. Full auditability
- [ ] Commits are atomic and each message explains *why*
- [ ] The spec commit precedes the code commit implementing it
- [ ] No history rewritten, reordered or backfilled
- [ ] `specs/spiral-log.md` updated if this closes or opens a turn

*Commit range:*

---

## Cost

- Model calls per full cycle after this change: <!-- must satisfy criterion N2 in specs/framing.md; do not copy the number here -->
- Anything here that could loop, retry unboundedly, or re-send the corpus?
