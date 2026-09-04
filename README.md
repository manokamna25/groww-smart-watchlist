# Smart Market Watchlist

## What it does
Doesn't just show prices — scores every move against the stock's own volatility AND the market's
mood that day, remembers exactly what you've seen per stock across devices, and is honest about
data freshness instead of pretending everything's live.

## Stack
TypeScript end-to-end: Node/Express/Socket.io + Prisma + Postgres + Redis (backend),
React/Vite/Tailwind (frontend).

## Run locally
1. `cp .env.example .env`
2. `docker-compose up -d`        # Postgres + Redis
3. `npm install`
4. `npm run db:migrate`
5. `npm run dev:all`             # starts backend (3001) + frontend (5173)
6. open http://localhost:5173

## Live demo
*(To be deployed)*

## Tests
Run the entire backend test suite (unit + integration):
`npm test`

## Design docs
See `SYSTEM_DESIGN.md` and `DESIGN_DECISIONS.md` for architecture and the reasoning behind every choice.
