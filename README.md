# Event Registration and Attendance System

CPE 334 group project (Semester 1/2026), Theme 3. Organizers publish events with limited capacity, participants register, and organizers see who registered.
Stack: React + Vite (`client/`), Express + TypeScript (`server/`), PostgreSQL 16 + Prisma. Design: [docs/system-sds.md](docs/system-sds.md).

## Requirements
Node 22.9 or newer (the npm scripts use `--env-file-if-exists`, D-19), npm, Docker Desktop (for PostgreSQL), Git.

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
Command count (NFR-08, at most 10): each line in the block above is one command, so setup and run take 8 commands. The tools under Requirements are installed beforehand and not counted. `npx playwright install chromium` is a one-time test step and not part of setup.

`npm run seed` empties every table first, so use it only on local, test and E2E databases. For a deployed database use `npm run seed:demo`, which only adds missing demo accounts and events and never deletes or changes data (Lab 5, D-20).

Seeded accounts: `organizer1@example.com`, `organizer2@example.com`, `participant1@example.com` .. `participant4@example.com`.

## Run the whole app in Docker (Lab 5, R-01, R-02)
```bash
git clone https://github.com/songt888/event-registration-system.git
cd event-registration-system
cp .env.example .env             # root .env for Compose; set SEED_PASSWORD
docker compose up --build        # db, migrate + seed:demo, then the app on http://localhost:3000
```
One image serves the UI and the API (D-18). The `migrate` service runs `prisma migrate deploy` and `npm run seed:demo`, so existing data is never reset. Stop with `docker compose down` (add `-v` to delete the database volume). Sign in with a seeded account and the `SEED_PASSWORD` you set.

## Deploy to the course cloud (Lab 5, #90)
```bash
bash deploy/deploy.sh                # dry run (default): prints the gcloud and docker commands only
DRY_RUN=0 bash deploy/deploy.sh --demo  # on an up-to-date main, gcloud signed in: build, push, migrate + demo seed, update the service
bash deploy/tests/test_deploy_stub.sh   # TEST-54, offline test of the script (no network)
bash deploy/tests/test_release_stub.sh  # TEST-55, offline test of release.sh and smoke_test.py (fake gcloud, localhost stub)
```
Later releases run `.github/workflows/deploy.yml` (the course portal's workflow) on every push to `main`: build and push the image tagged with the commit SHA, the migration job with `MIGRATE_COMMAND`, then `gcloud run deploy`. Check a deploy with `python3 deploy/smoke_test.py <URL>` (read-only). Environment `demo` variables: `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` (from the portal), `APP_PORT=3000`, `MIGRATE_COMMAND=npm run migrate -w server && npm run seed:demo -w server`. `deploy/release.sh` is the manual release and rollback tool from Cloud Shell.
Details: `docs/labs/lab-05/deployment.md` (D-25).

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
