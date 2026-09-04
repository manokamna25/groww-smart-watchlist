# Smart Market Watchlist — System Design
## Groww CODE 2026 — Final Build

This is the finalized architecture. It merges the volatility-normalized scoring + lean-infra
philosophy of the original design with the market-context and narrative-text ideas from a second
draft — while deliberately cutting anything that adds ops weight without adding judged value
(no BullMQ, no circuit-breaker library, no multi-vendor failover theater). Optimized to be:
buildable solo in 72h with an AI coding agent, fully demoable, and easy to deploy for the live round.

---

## 1. Problem interpretation

A basic watchlist shows prices. This one answers: **"What actually deserves my attention, and what
happened while I was away?"**

Three ideas make that real:
1. **Change is relative, not absolute.** A move only counts as meaningful if it's unusual *for that
   stock* (vs its own volatility) AND *for the market that day* (vs Nifty/sector). A 2% stock move on
   a flat market day means more than the same 2% on a day the whole market moved 3%.
2. **State lives on the server, not the device.** "Since you last checked" must look identical on
   phone and laptop — so what the user has and hasn't seen yet is tracked centrally.
3. **Data is never blindly trusted.** Every price shown carries an honest freshness label; conflicting
   or delayed data is handled explicitly, not silently.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│   Watchlist view · Stock detail · "What changed" digest      │
│   TanStack Query (server state) · Socket.io-client            │
└───────────────────────────┬─────────────────────────────────┘
                             │ HTTPS + WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│                    Node.js + Express (TS)                     │
│  ┌───────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │  Auth      │ │  Watchlist    │ │  Change Engine            │ │
│  │  (JWT)     │ │  CRUD + Sync  │ │  (scoring + narration)    │ │
│  └───────────┘ └──────────────┘ └──────────────────────────┘ │
│  ┌────────────────────────┐  ┌───────────────────────────┐  │
│  │  Market Data Adapter     │  │  Socket.io Gateway          │  │
│  │  (pluggable, simulated)  │  │  (per-symbol subscriptions) │  │
│  └────────────────────────┘  └───────────────────────────┘  │
└───────────┬─────────────────────────────┬─────────────────────┘
            │                             │
┌───────────▼───────────┐     ┌───────────▼──────────────┐
│   PostgreSQL (Neon)     │    │   Redis (Upstash)          │
│  users, watchlists,     │    │  pub/sub: tick:{symbol}    │
│  instruments, price_    │    │  cache: latest quote        │
│  ticks, change_events,  │    │  refcount: who's watching   │
│  user_symbol_state      │    │  what, right now             │
└─────────────────────────┘    └───────────────────────────┘
```

**One backend process, no message queue, no service mesh.** The "scaling" story lives in *how*
the WebSocket gateway and Redis are used (§6), not in how many services exist. That's the right level
of complexity for a single-instance demo deploy that still has a real answer to "how would this scale."

---

## 3. Change Intelligence Engine — the core differentiator

Computed per symbol on every ingested tick, using a rolling window (last ~20 ticks):

**Signal 1 — Volatility-normalized move**
`z = (price − rolling_mean) / rolling_std` — a move scored against *that stock's own* typical
behavior, not a flat % rule.

**Signal 2 — Market-relative move**
`relative = stock_change_pct − index_change_pct` (index = simulated Nifty proxy). Same stock move
means more on a flat market day than a day the whole market is moving.

**Signal 3 — Volume anomaly**
`volume_ratio = current_volume / rolling_avg_volume`, flagged if `> 2.0`.

**Signal 4 — Range breakout / gap**
Price crosses prior-day high/low, or opens beyond `k × ATR` from previous close.

**Combine into a score → tier:**
```
score = w1*|z| + w2*|relative| + w3*volume_ratio + w4*breakout_flag + w5*gap_flag
tier = "quiet" | "notable" | "meaningful" | "critical"   (thresholds in config, not hardcoded)
```

**Narrative (template-based, not LLM-generated — deterministic and explainable):**
```
"{SYMBOL} {direction} {price_pct}% on {volume_ratio}x volume"
+ optional clause: ", while the market was {index_direction} {index_pct}%"
+ optional clause: ", crossing its {N}-day high"
```
e.g. *"RELIANCE fell 2.1% on 2.8x volume, while the market was flat — unusual weakness."*

This is why templates beat an LLM call here: it's instant, free, works offline in the demo, and every
word traces back to a number you can point to live. Persist every `notable`+ event to `change_events`,
including the raw `signals` (z, relative, volume_ratio, breakout, gap) as JSONB.

**"Show the math" panel.** Because every event already stores its raw signals, exposing them costs
almost nothing extra: clicking a change badge opens a small panel showing the exact numbers behind the
score ("z = 2.3, volume = 2.8x avg, +1.8% vs Nifty"). This is worth building — it's the single best
answer to "prove this isn't a black box," and it's nearly free since the data's already there.

---

## 4. Data model

```sql
users (id, email, password_hash, created_at)
watchlists (id, user_id, name, created_at)
watchlist_items (id, watchlist_id, symbol, added_at)
instruments (symbol PK, name, exchange, sector)

-- append-only tick stream
price_ticks (id, symbol, price, volume, exchange_ts, ingested_at, source)

-- append-only, one row per notable+ event — this is what makes "since last checked" cheap
change_events (
  id, symbol, ts, tier, score,
  narrative TEXT,
  signals JSONB,   -- {z, relative_to_index, volume_ratio, breakout, gap}
  created_at
)

-- one row per (user, symbol) — what the user has actually seen
user_symbol_state (user_id, symbol, last_viewed_at, last_viewed_price, PRIMARY KEY(user_id, symbol))

-- one row per (user, event) — finer-grained than user_symbol_state: tracks whether
-- THIS specific alert has been dismissed, so a re-opened app doesn't re-surface
-- something you already looked at, but a genuinely NEW event still shows up.
change_acknowledgments (
  user_id, change_event_id,
  status,   -- 'seen' | 'acknowledged'
  updated_at,
  PRIMARY KEY (user_id, change_event_id)
)
```

**Why both tables, not just one**: `user_symbol_state` answers "what's the last price this user saw
for this stock" (cheap, one row per symbol). `change_acknowledgments` answers "has this *specific*
alert been dismissed" (one row per event actually shown to the user, not per tick) — e.g. so a HIGH
alert on RELIANCE that you already clicked through doesn't reappear as "new" just because you reopened
the app, but a *second, later* alert on RELIANCE still does.

---

## 5. Market data — simulated, pluggable

```ts
interface MarketDataSource {
  stream(): AsyncIterable<Tick>;  // { symbol, price, volume, exchangeTs }
}
```

Ship `SimulatedMarketDataSource`: ~30–40 NSE symbols, each with a configured volatility profile
(geometric Brownian motion is enough — realistic without being complicated), **plus a simulated index
series generated by the same engine** (not fetched from anywhere real — the index is just one more
synthetic walk, with stocks loosely correlated to it so "this stock ignored the market" is meaningful
when it happens). Give 5–8 symbols distinct "personalities" (one calm blue-chip, one wild small-cap,
one that'll diverge from the index) so the demo has visible variety instead of 30 flat random walks.
Also deliberately inject delays/dropouts/duplicate ticks so the staleness and conflict-handling logic
has something real to react to. State clearly in the README that this is a design choice (no legal/
rate-limit access to real exchange data in 72h), not a shortcut — and that the adapter interface is
real, so a live source is a config swap, not a rewrite.

**Demo control (build this — it removes luck from your live demo).** A dev-only endpoint,
`POST /api/dev/inject-event { symbol, type: 'spike'|'gap'|'volume_anomaly' }`, that forces a specific
symbol to generate a dramatic move on the next tick. Gate it behind a `DEV_MODE=true` env var so it's
obviously not part of the "real" product. On stage: click a button, watch the badge/narrative/show-the-
math panel all react live — instead of hoping the random walk does something interesting during your
exact 5-minute slot.

**Conflict/staleness handling** (plain functions, no library):
- Reconcile by `(source priority, exchange_ts)` — never blind last-write-wins by arrival time.
- Freshness badge from `now() − exchange_ts`: `<5s` live, `5–30s` delayed, `>30s`/market-closed → stale
  (show last close).
- Log any disagreement between sources to a simple `reconciliation_log` table/console log — visible,
  not silently dropped.

---

## 6. Real-time delivery & scaling

**Per-symbol fan-out, not per-user fan-out.** When a tick or event happens for RELIANCE, it's
published **once** to a `tick:RELIANCE` Redis channel. The gateway keeps that channel open only while
at least one connected client is watching RELIANCE (a Redis-backed refcount), and delivers to every
subscribed socket from that single publish. This means 500 users watching the same stock cost the
ingestion layer exactly the same as 1 user watching it — the thing that actually answers "how does
this scale to more users," which a per-user-room design doesn't get you as directly.

- Gateway is stateless: subscription state lives in Redis, so any backend instance could serve any
  client (matters if you ever run more than one instance).
- `price_ticks` schema is Timescale-hypertable-ready (partition by time) even if you don't enable the
  extension for the demo — no schema change needed later.

---

## 7. API

```
POST /api/auth/register | /api/auth/login

GET    /api/watchlists
POST   /api/watchlists
GET    /api/watchlists/:id/summary        → current state + per-symbol digest since last view
POST   /api/watchlists/:id/items
DELETE /api/watchlists/:id/items/:symbol
POST   /api/watchlists/:id/items/:symbol/ack   → marks last_viewed_at = now

GET  /api/intelligence/events/:id/breakdown    → raw signals for the "show the math" panel
POST /api/intelligence/events/:id/ack          → seen → acknowledged transition for one event

GET /api/market/:symbol/history?period=1D|1W

WS  /socket.io  → client emits subscribe:{symbol}/unsubscribe:{symbol}
                → server emits tick, change_event
```

---

## 8. Deployment plan (demo-ready, no heavy ops)

Everything below has a generous free tier and supports WebSockets — chosen specifically because you
need a live, working URL for the presentation round, not just local `docker-compose`.

| Component | Where | Why |
|---|---|---|
| Backend (Express + Socket.io) | **Render** or **Railway** | Persistent process, WebSocket-capable (Vercel serverless functions are not good for long-lived sockets) |
| Frontend (React/Vite) | **Vercel** | Trivial static/edge deploy, fast |
| Postgres | **Neon** (serverless Postgres, free tier) | No server to manage, generous free tier, branching for safety |
| Redis | **Upstash** (serverless Redis, free tier) | Works over REST/TCP from a serverless-friendly host, no Redis server to run yourself |

Keep `docker-compose.yml` for **local dev only** (spin up Postgres+Redis locally while building); it
is not the deploy target.

---

## 9. Resilience & edge cases (what to actually test)

| Scenario | Expected behavior |
|---|---|
| Primary data feed pauses mid-stream | Affected symbols flip to "stale" within the threshold; no crash |
| Two ticks arrive out of order | Reconciled by `exchange_ts`, not arrival order |
| Symbol added while "market closed" | Shows last close + "market closed" label, not an error/fake-stale |
| User views same symbol on 2 devices | Both show identical last-viewed state (server-side truth) |
| Watchlist grows to 100+ symbols | Gateway only maintains channels for symbols someone's actually watching |
| Duplicate tick delivered twice | Idempotent event IDs — no duplicate `change_events` row |
