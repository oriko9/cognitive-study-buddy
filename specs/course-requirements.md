# Course Requirements — Traceability

Every stated requirement of the personal project, mapped to the artifact that
satisfies it. **Update a row in the same commit that satisfies it.** A matrix
filled in at the end proves only that a matrix was filled in at the end.

Course: LLM-Augmented Software Practice (vibe coding) · תשפו_ק_62121 · HIT ·
Mikael Gorsky · Submission **2026-09-08**.

Status: ✅ done · 🔄 in progress · ⬜ not started

---

## 1. Framing document (Module 6)

| # | Requirement | Where | Status |
| --- | --- | --- | --- |
| 1.1 | Problem statement describes the situation, not the solution | `specs/framing.md` §1 | ✅ |
| 1.2 | Stakeholder list — users, dependants, affected parties | `specs/framing.md` §2 | ✅ |
| 1.3 | Definition of Done, testable, not arguable | `specs/framing.md` §3 — every functional and non-functional criterion, each with a named verification | ✅ |
| 1.4 | Out-of-scope list naming what a reasonable person would expect | `specs/framing.md` §4 | ✅ |
| 1.5 | Identity model stated, with its accepted cost named rather than discovered | `specs/framing.md` §4 — there is no identity at all, and the accepted cost (nothing survives a reload, no server-side limit) is stated there | ✅ |

## 2. Specification (Module 10)

| # | Requirement | Where | Status |
| --- | --- | --- | --- |
| 2.1 | Part 1 — goal and its business/academic reason | `specs/specification.md` §1 | ✅ |
| 2.2 | Part 2 — testable success criteria, arithmetic and reference-based | `specs/specification.md` §2 — per criterion: owning module, what the test stubs, which fixture; rows with no test today say so | ✅ |
| 2.3 | Part 3 — architectural guidance and boundaries | `specs/specification.md` §3 — module table, both JSON contracts, prompt strategy, adapter contract, the N11 counter as untrusted input | ✅ |
| 2.4 | Part 4 — validation approach | `specs/specification.md` §4 — what is stubbed, what needs a real call by hand, the committed fixture list; no test calls the live API | ✅ |
| 2.5 | Part 5 — known pitfalls and edge cases | `specs/specification.md` §5 — nine cases, each a test, including the confidently-wrong answer (O5) that cannot be tested offline | ✅ |
| 2.6 | Knuth's five criteria: finiteness, definiteness, input, output, effectiveness | `specs/specification.md` §6 — all five addressed, each naming where a natural-language brief cannot reach the formal standard rather than claiming it does | ✅ |

## 3. Commit history and the spiral (Modules 10, 12)

| # | Requirement | Where | Status |
| --- | --- | --- | --- |
| 3.1 | At least three full co-evolution spiral turns | `specs/spiral-log.md` — Turns 1, 2, 3, each with a planned observation and a spec change | 🔄 Turn 0 closed |
| 3.2 | A turn shows problem and solution evolving together | Rule stated at the top of `specs/spiral-log.md`; Turn 0 records three spec changes forced by measurement | ✅ |
| 3.3 | Commit before invoking the agent | `CLAUDE.md` §6 | ✅ |
| 3.4 | Honest atomic commit messages explaining *why* | `CLAUDE.md` §6; enforced by review in the PR template | ✅ |
| 3.5 | History written in real time, never retrofitted | `CLAUDE.md` §6 forbids reordering and backfilling; dated turns in `specs/spiral-log.md` | 🔄 |

## 4. Context engineering (Module 11)

| # | Requirement | Where | Status |
| --- | --- | --- | --- |
| 4.1 | `CLAUDE.md` exists at the project root | `CLAUDE.md` | ✅ |
| 4.2 | Hand-written, not agent-generated | Written and revised by hand; the agent is forbidden to rewrite it | ✅ |
| 4.3 | Kept small to protect the attention budget | Hard cap stated in the file; currently well under 200 lines | ✅ |
| 4.4 | Contains build commands, test commands, style conventions, safety rules | `CLAUDE.md` §2, §3, §6, §7 | ✅ |
| 4.5 | Memory / lessons-learned documents maintained | `specs/lessons-learned.md` — every entry appended on the day it was earned | ✅ |

## 5. Verification gates (Module 13)

| # | Requirement | Where | Status |
| --- | --- | --- | --- |
| 5.1 | Explicit gates; agent output is a hypothesis until checked | `CLAUDE.md` §5; `npm run verify` | 🔄 |
| 5.2 | Gates catch real failures — no test theatre | `CLAUDE.md` §5 lists the risks each test must probe. The secrets gate was corrected twice before it shipped: it scanned only for the legacy `AIza` prefix and would have passed a bundle containing a current `AQ.` key, then scanned only `dist/` and would have passed the L11 near-miss. Proven against three planted failures rather than asserted | 🔄 remaining: the model-failure gates N5 (malformed JSON, one retry) and N6 (timeout) have nothing to test until the adapter exists |
| 5.5 | N1 has an executable gate, not a convention | `scripts/check-secrets.mjs` via `npm run check:secrets` — scans `dist/` and every git-tracked file for both key formats and for an assigned `GEMINI_API_KEY`; no allowlist | ✅ |
| 5.6 | N8 has an executable gate, not a convention | `scripts/check-pins.mjs` via `npm run check:pins` — fails on `-latest` in any tracked source file; proven against a planted alias | ✅ |
| 5.7 | Both gates run automatically, not only when someone remembers | `.github/workflows/verify.yml` — CI runs `verify`, then `check:pins`, then `check:secrets` on every push and pull request to `main`; green since b5a708b | ✅ |
| 5.3 | Tests, type checks, linters, review | `npm run verify` + CI + the PR template | 🔄 |
| 5.4 | Merge-ready at the end | `.github/PULL_REQUEST_TEMPLATE.md` — five pillars | 🔄 |

## 6. Economics of cognified software (Module 9)

| # | Requirement | Where | Status |
| --- | --- | --- | --- |
| 6.1 | Deterministic code for data and storage; the model only where reasoning is required | `specs/framing.md` §5 boundary table | ✅ |
| 6.2 | Economic blast radius — a hard cap on calls | Criteria N2 and N11 in `specs/framing.md`; the figures live there and are not repeated here | 🔄 remaining: both are specified, neither is implemented |
| 6.3 | Token budgeting and context re-use | `CLAUDE.md` §4.6 — corpus stored once, referenced, never re-sent per question | 🔄 |
| 6.4 | Parallelisation where it helps | Deliberately **rejected** after measurement: 15 RPM makes fan-out a budget cost, not a saving. Recorded in L6 and in `CLAUDE.md` §4.7 | ✅ |

## 7. Merge-readiness pack (Module 16)

| # | Pillar | Where | Status |
| --- | --- | --- | --- |
| 7.1 | Functional completeness | PR template §1 | 🔄 |
| 7.2 | Sound verification | PR template §2 | 🔄 |
| 7.3 | SE hygiene — static analysis, lint, strict types | PR template §3 | 🔄 |
| 7.4 | Rationale and communication | PR template §4; commit bodies | 🔄 |
| 7.5 | Full auditability | PR template §5; `specs/spiral-log.md` | 🔄 |

## 8. Logistics

| # | Requirement | Status |
| --- | --- | --- |
| 8.1 | Project idea registered in the class spreadsheet | ✅ 2026-08-31 |
| 8.2 | Repository is the single source of evidence — nothing outside it counts | ✅ by construction |
| 8.3 | Submitted to `mail+ase26003@mgorsky.net` | ⬜ |
| 8.4 | `mail@mgorsky.net` added to safe senders | ⬜ |
