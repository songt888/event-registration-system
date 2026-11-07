# Event Registration and Attendance System

CPE 334 group project (Semester 1/2026), Theme 3. Organizers publish events with limited capacity, participants register, and organizers see who registered.
Stack: React + Vite (`client/`), Express + TypeScript (`server/`), PostgreSQL 16 + Prisma. Design: [docs/system-sds.md](docs/system-sds.md).

## Requirements
Node 20 or newer, npm, Docker Desktop (for PostgreSQL), Git.

## Setup and run (from a fresh clone)
```bash
git clone https://github.com/songt888/event-registration-system.git
cd event-registration-system
cp .env.example server/.env      # local placeholder values; change SEED_PASSWORD
docker compose up -d db          # PostgreSQL with dev, test and E2E databases
npm install
npm run migrate                  # apply migrations to the dev database
npm run seed                     # synthetic demo data (password = SEED_PASSWORD)
npm run dev                      # API http://localhost:3000, UI http://localhost:5173
```
Seeded accounts: `organizer1@example.com`, `organizer2@example.com`, `participant1@example.com` .. `participant4@example.com`.

## Tests
```bash
npm test                         # unit + API/DB integration on DATABASE_URL_TEST (never the dev database)
npx playwright install chromium  # once, before the first E2E run
npm run test:e2e                 # Playwright on DATABASE_URL_E2E, reset and seeded before each run; stop `npm run dev` first
```
- Unit tests: `server/src/**/*.unit.test.ts`, run in parallel.
- Integration tests: `server/src/**/*.int.test.ts`, one file at a time, every table emptied before each test (D-14).
- E2E tests: `e2e/*.spec.ts`.
- Test names start with their IDs, for example `TEST-13 AC-13 rejects registration when event is full`.

## Project layout
`client/` UI, `server/` API, Prisma schema and seed, `e2e/` Playwright, `docs/` requirements, design, sprint contracts and evidence.
Team rules: [AGENTS.md](AGENTS.md). Workflow: [docs/team-workflow.md](docs/team-workflow.md).
