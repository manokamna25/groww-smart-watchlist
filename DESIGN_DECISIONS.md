# Design Decisions & Tradeoffs — Final
## Groww CODE 2026

This is the answer bank for the live Q&A ("we're going to ask you why"). Every choice below was made
against one filter: **does this earn points on the judged criteria (engineering depth, problem
interpretation, edge cases, code quality/simplicity, originality) more than it costs in build-time
risk for a solo 72-hour build that also has to deploy and demo live?**

---

## 1. Change scoring: volatility-normalized + market-relative (not flat %, not ML)

**Chosen**: score = f(z-score vs the stock's own rolling volatility, move vs a simulated Nifty proxy,
volume anomaly, breakout/gap).

**Why not flat % thresholds**: treats a sleepy blue-chip and a wild small-cap identically — either
spams on volatile names or misses real signal on quiet ones.

**Why not ML**: no time to collect/train/validate data in 72h, and a black box can't be defended live
("why was this flagged?" -> "the model said so" is a weak answer). A rule you wrote, with config-file
thresholds you can point to, is a stronger answer than a model you can't fully explain.

**Why market-relative was added** (this is the one idea worth stealing from anywhere): a 2% move
means something different on a day the whole market is flat vs a day it's swinging 3%. This one line
of comparison is cheap to build and is the single biggest "we understood the problem beyond the
obvious brief" signal in the whole system.

---

## 2. Narrative text: templates, not an LLM call

**Chosen**: deterministic string templates built from the same signals used for scoring
("RELIANCE fell 2.1% on 2.8x volume, while the market was flat").

**Why not an LLM**: an API call per event adds latency, cost, a network dependency that can fail
mid-demo, and non-determinism (two runs could describe the same event differently) -- none of which
help you here. Templates are instant, free, work with no internet during the live round, and every
word is traceable to a specific number, which is exactly what "defend your choices" rewards.

---

## 3. One backend process, no message queue, no circuit-breaker library

**Chosen**: a single Express + Socket.io process; conflict/staleness handling as plain, tested
functions.

**Rejected**: BullMQ (job queue), a circuit-breaker library (e.g. opossum) with a formal
CLOSED/OPEN/HALF-OPEN state machine, multi-vendor failover with reliability-weighted consensus.

**Why**: those are real, correct patterns -- **for a system with actual independent producers and
genuine third-party outage risk**. Here, the data source is a simulated feed you control, so a formal
circuit breaker is solving a problem you invented rather than one you have. Building it "for show" is
exactly the over-engineering the brief's own evaluation criteria warns against
("Code Quality & Simplicity -- maintainability without unnecessary over-engineering"), and it's extra
surface area that can break right before the demo. The staleness/reconciliation logic still exists and
is still tested -- it's just three plain functions instead of a state-machine library, which is also
easier to explain line-by-line if asked.

**If asked "how would you make this production-grade?"**: that's exactly where you say "circuit
breaker with real multi-vendor failover" -- as the answer to a hypothetical, not as something you built
and can't fully defend.

---

## 4. Real-time delivery: per-symbol pub/sub fan-out, not per-user rooms

**Chosen**: one Redis publish per symbol event; the WebSocket gateway keeps a channel open only while
at least one client is watching that symbol (refcounted), and delivers to every subscribed socket from
that single publish.

**Why not per-user rooms**: broadcasting by pushing into each user's own room means the fan-out cost
still scales with number of *users*, not number of *symbols* -- if 500 users watch Reliance, you're
still doing work proportional to 500. Per-symbol fan-out means that cost is proportional to how many
*distinct symbols* are being watched, which is the actual lever for "how does this scale to more
users" -- more users watching the *same* stocks costs almost nothing extra.

**Tradeoff accepted**: slightly more bookkeeping (refcounts per symbol) than "just broadcast to a
user's room." Worth it because it's the more honest answer to the scaling question, and it's not
significantly more code.

---

## 5. Stack: full TypeScript, not split Python/TS

**Chosen**: TypeScript end-to-end (Node/Express backend, React frontend), Prisma for the DB layer.

**Why**: this project is being built with an AI coding agent doing most of the typing -- one language
across the whole stack means the agent (and you, reviewing its output) aren't context-switching
between Python idioms and TS idioms, and shared types (`packages/shared`) can be reused directly
between frontend and backend without duplicating interfaces. The statistical scoring logic (z-scores,
ratios) is a handful of lines either way -- it's not a reason to pay for a second language.

---

## 6. Database & cache: Postgres + Redis, both hosted serverless (Neon + Upstash)

**Chosen**: PostgreSQL (relational -- watchlists/users/items/events genuinely have foreign-key
relationships) + Redis (pub/sub + latest-quote cache only, not a source of truth).

**Why not MongoDB**: no benefit here -- the data is relational, and Postgres's JSONB columns already
cover the semi-structured bits (`signals`, `details`) without needing a document store.

**Why hosted/serverless (Neon, Upstash) over self-run**: the brief requires a **live, deployable**
demo, not just a local one. Free-tier serverless Postgres/Redis means zero server ops (no patching, no
uptime babysitting) and both integrate cleanly with a Node backend on Render/Railway -- this directly
serves the "I have to deploy this" constraint, not just the architecture diagram.

---

## 7. Deployment target: Render/Railway + Vercel, not Docker-only

**Chosen**: backend (needs a persistent process for WebSockets) on Render or Railway; frontend on
Vercel; `docker-compose.yml` kept for local dev only.

**Why not serverless functions for the backend**: WebSocket connections need a long-lived process --
serverless function platforms (plain Vercel functions, AWS Lambda) aren't a good fit and add real risk
of the live socket connection breaking mid-demo. Render/Railway run a normal persistent Node process,
which is the simplest thing that reliably keeps a WebSocket alive.

---

## 8. Draft 100-word pitch (refine before submitting)

> Most watchlists show numbers; this one shows what matters. Every move is scored against the stock's
> own volatility and against how the broader market moved that day -- a quiet blue-chip's small move
> can outrank a volatile stock's big one. Come back later and a server-tracked digest shows exactly
> what happened since your last visit, in plain language, consistent across every device. Every price
> carries an honest freshness label instead of pretending to always be live. The market feed is
> simulated but swappable by design -- the architecture, and the judgment behind it, is the submission.

---

## 9. What we adopted from a competing concept ("PULSE"), and what we didn't

A second concept pitch (project name "PULSE") was reviewed for comparison. Its core mechanism (a
per-stock statistical baseline to judge what's "normal") is the same idea already in this design — not
a reason to change anything structural. Two things from it were genuinely worth taking:

**Adopted — "show the math" transparency panel.** Exposing the raw signal breakdown behind every
score costs almost nothing here since `change_events.signals` already stores it as JSONB — it's a
UI panel, not new backend logic. Directly serves "defend your choices" in the live round.

**Adopted — finer-grained per-alert acknowledgment (seen → acknowledged), not just per-symbol
last-viewed.** Prevents an already-dismissed alert from resurfacing as "new" on every app open, while
still surfacing genuinely new alerts on the same stock. Cheap addition: one join table.

**Not adopted — a 0–100 "Attention Score" framing instead of tiers.** A single number invites the
question "why 73 and not 74," which is harder to defend than a tier threshold you set deliberately in
a config file. Tiers (quiet/notable/meaningful/critical) keep the same UX benefit (rank what deserves
attention) without pretending to a precision the underlying signals don't actually have.

**Not adopted — market-relative context is not mentioned in that concept at all** (it scores per-stock
volatility only, not stock-vs-market). That comparison is already in this design and is arguably its
strongest single idea — worth keeping without any changes.

Net: no architecture change, two cheap high-value UI additions folded into `SYSTEM_DESIGN.md` §3–4 and
`BUILD_SPEC.md`'s frontend step.
