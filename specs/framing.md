# Problem Framing — Cognitive Study Buddy

> Module 6 deliverable. This document defines the **problem**, not the solution.
> It is the contract every spiral turn is measured against. Changing it requires a
> commit that states what changed and why.

- **Status:** Locked for Spiral Turn 1
- **Owner:** Ori
- **Course:** LLM-Augmented Software Practice (vibe coding), HIT — Mikael Gorsky

---

## 1. Problem Statement

A student reads course material — lecture slides, handouts — and finishes with a
feeling of comprehension. That feeling is not evidence. Nothing in the current
workflow distinguishes "I recognise this slide" from "I can reconstruct this idea
under exam conditions." The gap between the two is invisible until the exam, at
which point it is too late to act on.

The student therefore allocates study time by intuition rather than by evidence,
and intuition is systematically biased toward material that is already familiar —
the material that feels comfortable to re-read. Weak areas stay weak precisely
because they are unpleasant to revisit, and nothing in the loop forces them to
the surface.

Generic chat assistants do not close this gap. A student can paste slides into a
chatbot and ask for questions, but the result is ephemeral: it is not anchored to
the student's own corpus, it is not scored, it accumulates no history, and it
produces no ranked account of where that specific student is weak. Each session
starts from zero. There is no measurement, so there is no signal to study by.

**The problem this project addresses: a student has no mechanism that converts
their own course material into evidence about what they have not yet understood.**

---

## 2. Stakeholders

| Stakeholder | Relationship | What they need from the system |
| --- | --- | --- |
| **The student (primary user)** | Uploads material, answers questions, reads the weakness map | Honest, specific feedback fast enough to act on in one sitting |
| **Other registered students** | Use the same deployment with their own private corpus | Strict data isolation — one student must never read another's material or results |
| **Course instructor (M. Gorsky)** | Evaluates the repository, not the running app | A legible intent-to-implementation trail: specs before code, atomic commits, real verification gates |
| **The LLM provider (Google Gemini)** | Runtime dependency, free tier | Bounded call volume; the app must degrade honestly when quota is exhausted, not loop |
| **The developer (Ori)** | Builds and defends the project | A scope small enough to finish cleanly across three spiral turns |

**Affected but not users:** course lecturers whose slide decks are uploaded. The
system stores their material on behalf of a student. Corpus files are private to
the uploading student and are never shared or used for training.

---

## 3. Definition of Done — Spiral Turn 1

Every criterion is countable or mechanically checkable. A criterion with no
corresponding automated check is not part of the DoD.

### Functional

| # | Criterion | How it is verified |
| --- | --- | --- |
| D1 | A visitor signs in with Google or GitHub and reaches the upload screen. No email/password path exists. | Integration test against Supabase Auth |
| D2 | A signed-in student uploads a PDF or PPTX of **≤ 30 pages / ≤ 10 MB** and the file is persisted to Supabase Storage under their user id. | Integration test: upload, then read back |
| D3 | Topic extraction returns **between 5 and 15 topics**. Each topic has a non-empty title and at least one source reference (page or slide number) into the uploaded file. | Schema assertion + count assertion |
| D4 | Quiz generation returns **exactly 5 questions**: 4 multiple-choice (exactly 4 options each, exactly one marked correct) and 1 open-ended. Each question carries the `topic_id` it probes. | Schema assertion on the parsed response |
| D5 | Multiple-choice answers are scored **without any model call**. | Unit test; assert the LLM adapter is not invoked |
| D6 | The open answer is evaluated by the model and returns structured JSON: a score in `0..1`, the topic id, and a one-sentence justification. | Schema assertion |
| D7 | The weakness map ranks every probed topic worst-first with a numeric score, and names at least one topic whenever the student answers anything incorrectly. | Unit test over fixed answer sets |
| D8 | From the post-login screen, upload → quiz → weakness map completes in **≤ 4 clicks**, excluding typing. | Manual click-count, recorded in the turn log |
| D9 | Source material in **Hebrew or English** produces topics and questions in the same language as the source. | Fixture test with one Hebrew and one English deck |

### Non-functional

| # | Criterion | How it is verified |
| --- | --- | --- |
| N1 | The Gemini API key exists **only** as a server-side Vercel environment variable (`GEMINI_API_KEY`, no `VITE_` prefix). No key, and no direct provider call, appears in any client bundle. | `npm run check:secrets` scans `dist/` for **both** key formats — legacy `AIza` and current `AQ.` — plus the literal `GEMINI_API_KEY`; fails the build on a match |
| N2 | One full cycle (upload → map) costs **≤ 3 model calls**: one topic extraction, one batched generation of all 5 questions, one open-answer evaluation. Enforced in code, not by convention. | Counter assertion in the integration test |
| N3 | A per-user cap of **10 cycles per day** is stored in the database and enforced server-side before any call. Exceeding it returns a typed refusal rendered as a plain "daily limit reached" state — never a blank screen or a generic error. | Integration test that exhausts the quota |
| N4 | Row Level Security prevents student A from reading student B's corpus, quizzes, or results. | Integration test with two distinct users |
| N5 | Malformed model JSON triggers **exactly one** retry; a second failure surfaces a visible, typed error. The app never renders invented content on a failed call. *(Norman's Gulf of Evaluation: failure must look like failure, never a blank or default verdict.)* | Test with a stubbed adapter returning garbage |
| N6 | A model timeout is bounded and surfaces as a typed error. *(Lufthansa 2904: a specification written only for the normal case fails in the storm. The abnormal path is specified, not assumed.)* | Test with a stubbed adapter that hangs |
| N7 | `npm run verify` passes: typecheck, lint, and the full test suite. | CI on every push |
| N8 | The model is pinned to the explicit version `models/gemini-3.1-flash-lite`. No moving alias (`-latest`) appears anywhere in the codebase. | Grep gate in CI; fails on `-latest` |
| N9 | The provider key is sent in the `x-goog-api-key` **header**. The `?key=` query-parameter form appears nowhere. | Unit test on the adapter's request builder |

### Turn 1 is done when

All of D1–D9 and N1–N9 pass in CI on `main`, the app is deployed to Vercel, and
the turn is recorded in `specs/spiral-log.md` with the commit range it covers.

---

## 4. Out of Scope

Named explicitly to protect the token budget and the schedule. Anything here that
becomes desirable is deferred to a later turn by a commit that amends this file —
never by quietly building it.

**Deferred to later turns**

- Staged personal study plan (Turn 2)
- Explanation of weak topics through simple worked examples (Turn 3)
- Progress history and trend across multiple quiz sessions (Turn 2)

**Not built in this project at all**

- OCR of scanned or photographed material — text-layer PDFs and PPTX only
- Any mobile application; the deployment is a responsive web app
- Sharing material or results between students; collaboration; classroom or instructor dashboards
- Spaced-repetition scheduling and notifications
- Corpora larger than 30 pages, and multi-file corpora in a single quiz
- Video or audio input
- Payment, subscription, or per-user billing
- Email/password authentication and password recovery flows
- Internationalisation of the UI beyond a single chosen interface language

---

## 5. Cognified / Deterministic Boundary

The model is a runtime component, invoked only where human-like reasoning is
strictly required. Everything else is ordinary TypeScript. Any proposal to move a
row upward across this line must be justified in a commit message.

| Concern | Where it runs | Why |
| --- | --- | --- |
| Extracting topics from source text | **LLM** | Requires judgment about what constitutes a distinct idea |
| Writing questions that probe a topic | **LLM** | Requires pedagogical judgment |
| Grading a free-text answer | **LLM** | The only genuinely irreducible case: meaning, not string matching |
| Scoring multiple-choice answers | Deterministic | Comparison against a stored key |
| Ranking topics into a weakness map | Deterministic | Arithmetic over stored scores |
| Validating model output against a schema | Deterministic | Never ask a model to check a model |
| Auth, storage, persistence, RLS | Deterministic | Supabase |
| Quota accounting and call caps | Deterministic | Must be tamper-proof and cheap |
| File parsing (PDF/PPTX → text) | Deterministic | Libraries do this correctly and for free |

---

## 6. Open Decisions

Tracked here until resolved; each resolution lands as its own commit.

| # | Decision | Status |
| --- | --- | --- |
| O1 | Interface language of the app (Hebrew, English, or both) | **Open** |
| O2 | Model id and free-tier quota | **Resolved 2026-08-31.** `models/gemini-3.1-flash-lite` — 15 RPM, 250K TPM, **500 RPD**. Chosen over `gemini-3.5-flash`, whose 20 RPD allows roughly two cycles per day for the entire deployment. Measured in the account's own AI Studio dashboard, not assumed. |
| O3 | Whether topic extraction chunks large decks | **Resolved provisionally.** No chunking in Turn 1: the 30-page cap (D2) keeps a deck inside the 250K TPM window. Revisit if a real deck exceeds it — that observation would itself open a spiral turn. |
| O4 | Weakness score formula: raw proportion correct, or weighted by question type | **Open** — resolve in `specs/specification.md` |
| O5 | Whether `gemini-3.1-flash-lite` grades free-text answers reliably enough | **Open by design.** Flash-lite is the weakest tier, and open-answer grading is the one task needing real judgment. Tested against real answers in Turn 2. If it fails, only the evaluation call escalates to `gemini-3.5-flash` and the per-user cap drops accordingly. |

---

## 7. Traceability

`specs/course-requirements.md` maps every stated course requirement to the file
and commit that satisfies it. Update it in the same commit that satisfies a row —
never in a sweep at the end.

## 8. Non-Goals of This Document

This document does not specify architecture, data model, prompts, or API
contracts. Those belong to `specs/specification.md` (Module 10). If a reader
needs to know *how*, this document has been written incorrectly.
