# Smart Market Watchlist — Build Spec
## Agent-Ready Implementation Guide — Groww CODE 2026

Hand this file (alongside `SYSTEM_DESIGN.md` and `DESIGN_DECISIONS.md`) to your coding agent as the
main prompt. Tell it to read all three before writing code — `SYSTEM_DESIGN.md` has the "what",
`DESIGN_DECISIONS.md` has the "why" (so the agent doesn't quietly swap in something heavier), this
file has the "in what order and with what tests."

---

## Tech stack (final — one language throughout, deploy-friendly, no heavy infra)

- **Language**: TypeScript, frontend and backend both.
- **Backend**: Node.js + Express + Socket.io. Prisma as ORM.
- **DB**: PostgreSQL (Neon in production, local Postgres via Docker in dev).
- **Cache/pub-sub**: Redis (Upstash in production, local Redis via Docker in dev).
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + TanStack Query (server state) + Zustand
  (small bits of client-only UI state) + Recharts (sparklines) + socket.io-client.
- **Testing**: Vitest + Supertest (backend), React Testing Library (a few key frontend components).
- **Explicitly not used**: BullMQ/any job queue, a circuit-breaker library, multi-vendor data failover,
  microservices, Kafka, GraphQL, gRPC. See `DESIGN_DECISIONS.md` for why each was cut.

---

## Folder structure

```
smart-watchlist/
├── README.md
├── docker-compose.yml          # LOCAL DEV ONLY — Postgres + Redis
├── .env.example
├── package.json                # npm workspaces
├── packages/
│   ├── shared/
│   │   └── src/types/          # Stock, ChangeEvent, WebSocket message shapes — shared FE/BE
│   ├── server/
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       ├── index.ts
│   │       ├── config/{database.ts,redis.ts,env.ts}
│   │       ├── auth/{auth.routes.ts,auth.service.ts,jwt.ts}
│   │       ├── watchlist/{watchlist.routes.ts,watchlist.service.ts}
│   │       ├── market/
│   │       │   ├── adapter.ts            # MarketDataSource interface
│   │       │   ├── simulatedSource.ts
│   │       │   └── ingestion.ts          # computes signals, writes ticks, publishes to Redis
│   │       ├── intelligence/
│   │       │   ├── scorer.ts             # z-score, market-relative, volume, breakout/gap
│   │       │   ├── narrator.ts           # template-based narrative text
│   │       │   └── digest.ts             # "since last viewed" query logic
│   │       ├── resilience/
│   │       │   └── reconcile.ts          # source-priority + timestamp conflict resolution
│   │       ├── ws/gateway.ts             # per-symbol subscribe/refcount/broadcast
│   │       └── middleware/{auth.ts,errorHandler.ts}
│   │   └── tests/
│   │       ├── unit/{scorer.test.ts,digest.test.ts,reconcile.test.ts}
│   │       └── integration/{api.test.ts,ws.test.ts}
│   └── client/
│       └── src/
│           ├── main.tsx / App.tsx
│           ├── hooks/{useWatchlist.ts,useWatchlistSocket.ts}
│           ├── store/{auth.store.ts,ui.store.ts}          # Zustand, kept minimal
│           ├── components/
│           │   ├── watchlist/{WatchlistGrid.tsx,StockRow.tsx,AddStockModal.tsx}
│           │   ├── intelligence/{DigestPanel.tsx,ChangeBadge.tsx,NarrativeCard.tsx,ShowMathPanel.tsx}
│           │   └── market/{PriceDisplay.tsx,Sparkline.tsx,FreshnessBadge.tsx}
│           └── pages/{Dashboard.tsx,StockDetail.tsx,Login.tsx}
└── load/watchlist.js            # k6 script, optional stretch
```

---

## Testing discipline — non-negotiable

**Write and run tests at the end of EVERY phase below, not just at the end of the whole build.**
Do not move to the next phase until the current phase's tests pass. This is the actual instruction
to give your agent: "after finishing step N, write the tests listed for it, run them, show me the
output, and only then start step N+1." Concretely:

- After phase 1 (auth + CRUD) → run `api.test.ts`'s auth/watchlist-CRUD cases.
- After phase 3 (scoring engine) → run `scorer.test.ts` before writing the digest logic on top of it.
- After phase 4 (digest) → run `digest.test.ts` before wiring up the frontend to consume it.
- After phase 5 (real-time) → run `ws.test.ts` before building the frontend socket hook.
- After phase 6 (resilience) → run `reconcile.test.ts` + the manual stale/duplicate-tick checks.

This catches a broken foundation immediately instead of discovering on hour 60 that the scoring engine
was wrong the whole time and everything built on top of it (digest, UI, demo data) needs redoing.

---

## Build order (priority order, not day-locked — build with an agent, move fast)

1. **Foundation**: npm workspace, Prisma schema (§ data model in SYSTEM_DESIGN.md), Postgres via
   Docker locally, auth (register/login/JWT), basic watchlist CRUD.
2. **Simulated market feed**: `SimulatedMarketDataSource` generating ticks for ~30 symbols + a
   simulated index value (same engine, correlated — see SYSTEM_DESIGN.md §5); ingestion writes to
   `price_ticks`. Include the `/api/dev/inject-event` demo-control endpoint now, while you're already
   inside the simulator code — much cheaper than bolting it on later.
3. **Change Intelligence Engine**: scorer.ts (z-score + market-relative + volume + breakout/gap) →
   narrator.ts (template text) → persist `notable`+ events to `change_events`.
4. **Digest logic**: `GET /watchlists/:id/summary` returning current state + events since
   `last_viewed_at` per symbol; `POST .../ack` to update it.
5. **Real-time**: Socket.io gateway, per-symbol Redis pub/sub + refcounted subscriptions, broadcast
   ticks/events only to sockets actually watching that symbol.
6. **Resilience**: reconcile.ts (conflict handling), freshness badges, tests for stale/duplicate/
   out-of-order ticks.
7. **Frontend**: watchlist grid with live badges → stock detail with digest panel → "show the math"
   panel on each badge (renders the `signals` JSON from `/events/:id/breakdown` as plain labeled
   numbers, not a chart — clarity over polish here) → seen/acknowledged state on alerts → add/remove
   flow → freshness indicators → polish.
8. **Tests**: fill in the suite below.
9. **Deploy**: Neon + Upstash + Render/Railway (backend) + Vercel (frontend) — see
   `SYSTEM_DESIGN.md` §8. Do this *before* the deadline, not at the last hour — leave time to debug a
   deploy-only issue (env vars, CORS, WS through the host's proxy).
10. **README + 100-word pitch** (draft is in `DESIGN_DECISIONS.md`, refine it).

---

## Test suite

**Unit**
- `scorer.test.ts`: given a synthetic price/volume series, assert correct tier at each threshold
  boundary; assert market-relative signal changes the score when index direction differs from stock.
- `digest.test.ts`: given a set of `change_events` and a `last_viewed_at`, assert correct events
  returned; assert empty digest on first-ever view; assert digest empties right after `ack`.
- `reconcile.test.ts`: two conflicting ticks, out-of-order arrival but ordered `exchange_ts` — assert
  the correct one wins; assert a disagreement gets logged.

**Integration**
- `api.test.ts`: full watchlist lifecycle under auth (create → add symbol → get summary → remove).
- `ws.test.ts`: client subscribed to symbol A does **not** receive events for symbol B; a second
  client on the same symbol receives the same broadcast from a single publish (proves the fan-out
  design, not just that messages arrive).

**Resilience (can be scripted manually or as tests)**
- Kill/pause the simulated feed mid-stream → affected symbols show "stale" within threshold, recover
  cleanly on restart, no duplicate `change_events` (idempotent event IDs keyed off tick id + symbol).
- Symbol added while "market closed" → shows last close, not an error.

Put a one-command way to run all of this in the README (`npm test`) — a submission that "actually
works and can be checked" needs to be checkable in under a minute by someone who didn't build it.

---

## README template (fill in before submitting)

```markdown
# Smart Market Watchlist

## What it does
Doesn't just show prices — scores every move against the stock's own volatility AND the market's
mood that day, remembers exactly what you've seen per stock across devices, and is honest about
data freshness instead of pretending everything's live.

## Stack
TypeScript end-to-end: Node/Express/Socket.io + Prisma + Postgres + Redis (backend),
React/Vite/Tailwind (frontend).

## Run locally
1. cp .env.example .env
2. docker-compose up -d        # Postgres + Redis
3. npm install
4. npm run db:migrate
5. npm run dev                 # starts backend + frontend
6. open http://localhost:5173

## Live demo
[deployed URL here]

## Tests
npm test

## Design docs
See SYSTEM_DESIGN.md and DESIGN_DECISIONS.md for architecture and the reasoning behind every choice.
```
