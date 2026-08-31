# Lessons Learned

Rules earned the hard way. One entry per lesson, appended **when it happens** —
a backfilled entry teaches nothing and reads as decoration.

An entry belongs here when a mistake, a wrong assumption, or a failed agent run
changed how we work. Not a changelog: a changelog records what happened, this
records what we now do differently. When a lesson hardens into a rule, it moves
into `CLAUDE.md` and the entry here says so.

Format: **what happened → what it cost → the rule now.**

---

## L1 — A free consumer product is not a free API

**When:** Turn 0, before any code.

**What happened:** The provider for the runtime model was chosen as "free
ChatGPT" on the strength of everyday use. The free ChatGPT interface exposes no
API at all, and the OpenAI API is a separate, metered product requiring billing.
Had this reached the specification, it would have surfaced only at deployment.

**What it cost:** Nothing — caught during framing. Had it survived into Turn 1,
it would have invalidated the architecture section and a day of work.

**The rule now:** Provider access is verified against the provider's own console
before it enters a spec — an issued key and an observed quota, not a
recollection. Assumptions about cost and access are load-bearing and get checked
like any other load-bearing claim.

---

## L2 — Two deploy pipelines mean two places a key can leak

**When:** Turn 0, when hosting moved from Netlify to Vercel.

**What happened:** The initial design put the model proxy in Supabase Edge
Functions while the frontend deployed to Vercel. That is two dashboards, two
secret stores, two deploy paths, and two mental models — for one HTTP call.

**What it cost:** Nothing yet. The cost would have been a recurring tax on every
future change, and a second place to misconfigure a secret.

**The rule now:** The model proxy lives in `api/` on Vercel, alongside the app it
serves. Supabase keeps Auth, Postgres and Storage. One deploy pipeline, one
environment-variable surface. Fewer moving parts is a security property, not
only a convenience.

---

## L3 — A decision that is not written down reads as drift

**When:** Turn 0, at the Netlify → Vercel change.

**What happened:** The course brief named Netlify; Vercel was chosen instead
because the account already existed. A reader of the repository would see the
brief say one thing and the code say another, with no way to tell a reasoned
choice from carelessness.

**What it cost:** Nothing, once recorded. Unrecorded, it looks exactly like the
retrofitted history the grading explicitly penalises.

**The rule now:** Any deviation from the brief is recorded in
`specs/spiral-log.md` with the reason and the rejected alternative, in the turn
where it happens. The trail must let a reader reconstruct the judgment, not just
the outcome.

---

## L4 — A secret inside a command is a secret you will paste somewhere

**When:** Turn 0, during provider setup.

**What happened:** A provider key was pasted into a chat while asking for help,
then regenerated, then the replacement was pasted into the same chat inside a
shell command that had failed. The command needed sharing; the key came along
with it. Two keys had to be revoked in one afternoon.

**What it cost:** Two rotations and the time to notice. Nothing reached the
repository, and nothing reached production — but only because no code existed
yet to reach.

**The rule now:** A secret never appears inside a command anyone might copy. It
goes into an environment variable first, and the command references the
variable. Debugging then means sharing a command that reads `%GKEY%` and output
that contains no key at all. "Be careful" is not a control; making the mistake
impossible to make is.

---

## L5 — Verify the transport before designing around the provider

**When:** Turn 0, before the adapter existed.

**What happened:** Public reports said the current `AQ.`-format Gemini keys fail
against the REST endpoint, which looked like grounds to change provider. A
five-minute call showed the key works — but only when sent as an
`x-goog-api-key` **header**. The `?key=` query-parameter form, which most older
examples use, is what stopped working.

**What it cost:** Five minutes. Had the adapter been written first against the
query-parameter form, it would have cost a day of debugging in the middle of the
build, and possibly an unnecessary provider migration.

**The rule now:** Before an external dependency enters the architecture, make
one real call against it and read the actual response. Reports of breakage
describe *someone's* configuration, not necessarily ours. The smoke call is the
cheapest experiment available and it runs first.

---

## L6 — Measure the budget before optimising for speed

**When:** Turn 0, on reading the real quota dashboard.

**What happened:** `CLAUDE.md` instructed the agent to parallelise independent
model calls, and the quiz design generated each question in its own call — a
sound instinct for latency. The measured free-tier quota then showed 15 requests
per minute, and 20 per day on the model originally chosen. Under that ceiling,
fanning out five calls buys a few seconds of wall-clock and spends a quarter of
the daily budget. The rule was inverted: batch all five questions into one call.
Cost per cycle fell from 8 calls to 3, and switching to
`gemini-3.1-flash-lite` (500 RPD) turned two viable cycles per day into
roughly 166.

**What it cost:** Nothing, because it was measured before code. Discovered in
week two, it would have meant reworking the adapter, the tests and the spec at
once.

**The rule now:** The economic constraint is read from the provider's own
dashboard before any performance decision, and the numbers go into the spec as
figures, not adjectives. Latency optimisation that ignores the request budget is
not optimisation. When a measurement contradicts a written rule, the rule
changes and the reversal is recorded — that reversal is the evidence of a
spiral, not an embarrassment to hide.

---

## L7 — An interface that mixes modes invites the bypass

**When:** Turn 0, at the first commit.

**What happened:** The setup runbook ran five consecutive terminal steps and
then, at the commit step, expected a switch into the agent to paste a prompt
demanding seven atomic commits. The agent was started, read the prompt, prepared
the tree and correctly paused for approval. The human, carried by the momentum of
five terminal steps, finished the job by hand with a single `git add .` and a
generic "Initial commit" — destroying the intent-to-implementation trail the
prompt existed to create. The history was then rewritten to restore it, in
knowing violation of the repository's own rule against rewriting pushed history.

**What it cost:** One rewrite of a private, minutes-old, single-author branch,
plus the honesty tax of recording the exception here rather than hiding it.

**The rule now:** Two rules, one from each half.
Process: a procedure that changes tool mid-way must say so at the seam and say
why. An instruction that has to fight the reader's momentum will lose.
Git: rewriting pushed history is still forbidden. This exception was bounded
(private repo, no collaborators, no third party had pulled) and it is written
down. An exception that is documented is a decision; an exception that is silent
is the thing the rule was written to prevent.

---

## L8 — A number repeated in two files is a number that will drift

**When:** Turn 0, immediately after the first seven commits landed.

**What happened:** The measured quota cut the per-cycle model budget from eight
calls to three. Criterion N2 and `CLAUDE.md` were updated; the pull-request
template was not. The gate whose whole purpose is to hold the budget was
therefore checking every future change against the number the measurement had
already overturned - and it would have passed a change that tripled the real
cost. The same shape of error occurred twice more the same day: a key-format
string corrected in one place and left stale in another, and a step list updated
in the runbook while its own summary still named the old file count.

**What it cost:** Nothing this time, because a review caught it before any code
depended on it. The cost of the general pattern is a gate that reports green
while enforcing a retired rule, which is worse than no gate at all.

**The rule now:** A figure that governs behaviour lives in exactly one place -
here, criterion N2 in `specs/framing.md`. Every other mention cites the
criterion by name instead of restating the number, so a reader who finds a
number without a citation knows it is unverified. Updating a value means
updating one line, not remembering every place it was copied to.

**Amended 2026-08-31, same day.** The rule as written was not enough. Adding
criterion N10 invalidated three enumerated ranges reading `N1–N9`, one of them
the "Turn 1 is done when" clause - so a criterion added to close a security hole
was, for two commits, outside the Definition of Done. The rule said a governing
figure lives in one place; it did not say what to do when the figure is a
*range* that summarises a set. Correcting the three copies would have worked
until the eleventh criterion. The stronger rule: do not restate a set by
enumerating it. Refer to the set. A reference cannot fall out of date, and a
lesson that has to be re-applied by hand every time is a lesson that has not yet
been learned.

---

## L9 — A pipe throws away the exit code you needed

**When:** Turn 1, during the scaffold install.

**What happened:** The dependency install was run as `npm install ... | tail -5`
to keep the output short. The install failed on a peer-dependency conflict, but
the pipeline reported exit 0, because a shell pipeline returns the status of its
last command and `tail` had succeeded at printing the failure. The step was
briefly believed to have worked. Re-running without the pipe showed an ERESOLVE
error that had been there all along.

**What it cost:** One re-run, because it was noticed immediately. Left
unnoticed, the next command would have failed against a half-installed tree, and
the visible error would have pointed somewhere unrelated to the real cause.

**The rule now:** Never pipe a command whose exit status matters. Redirect its
full output to a file and read the file, or check the status explicitly. A
truncating filter is for output a human is reading, never for a step something
else depends on - and a step that reports success because a filter succeeded is
the same defect class as a test that asserts nothing.

---

## L10 — Before cutting a requirement, list what depends on it

**When:** Turn 1, deciding whether to keep sign-in.

**What happened:** Social sign-in looked like pure setup cost - two OAuth
applications, a consent screen, redirect URLs - for an app that only needs to
run for grading. The instinct was to remove authentication entirely. Listing the
dependents first showed that two criteria unrelated to login rode on it: N3, the
per-user daily cap, has no "per user" without an identity, and N4, the row-level
isolation test, has nothing to isolate. Removing sign-in would have deleted two
verification gates as a side effect, neither of them mentioned in the decision.
Anonymous sign-in issues a real user id, so the setup cost was removed while
both gates survived untouched.

**What it cost:** Nothing, because the dependency check happened before the cut.
The cost of skipping it would have been two gates disappearing silently, and a
provider key sitting behind an unauthenticated endpoint.

**The rule now:** A requirement is never removed on its own description. First
list every criterion, gate and test that names it or depends on it, and decide
about that whole set. A cut that quietly takes verification with it is the most
expensive kind, because what is lost is exactly the thing that would have
noticed.
