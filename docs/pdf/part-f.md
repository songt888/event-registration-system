# Part F. Working Sprint 1 and evidence

Release: tag `v0.1.0-sprint1`, commit `12dcd3c` on `main` (the merge of release PR #79, 2026-11-08). Every program screenshot, build output and test count in this Part comes from that commit, run in a clean checkout with `npm ci`. Exception: the evidence files themselves and this PDF were added afterwards by PRs into `sprint-1-staging` (#82 and the 10.3 PR), because `main` stays frozen at the tag; they change no code.

## F1. Setup summary

Full steps are in the repository `README.md`. Dependencies: Node.js 20 or later, npm, Docker (PostgreSQL 16 runs in Docker Compose with three databases: dev, test and E2E).

| Step | Command |
|---|---|
| Clone | `git clone https://github.com/songt888/event-registration-system.git`, then `cd event-registration-system` |
| Configure | `cp .env.example server/.env` (placeholder values only; `SEED_PASSWORD` is a local value you choose) |
| Database | `docker compose up -d db` |
| Install | `npm install` (also generates the Prisma client) |
| Migrate and seed | `npm run migrate`, then `npm run seed` (synthetic accounts: organizer1, organizer2, participant1 to participant4 at example.com) |
| Run | `npm run dev` (API on port 3000, UI on port 5173) |
| Test | `npm test` (unit and API/DB integration on `DATABASE_URL_TEST`), `npm run test:e2e` (Playwright on `DATABASE_URL_E2E`) |

Environment variables (names only, values in `.env.example`): `DATABASE_URL`, `DATABASE_URL_TEST`, `DATABASE_URL_E2E`, `PORT`, `NODE_ENV`, `SESSION_TTL_MINUTES`, `COOKIE_SECURE`, `SEED_PASSWORD`. No real password, token or secret is in Git or in this PDF. The setup from a fresh clone takes 8 commands (NFR-08, verified by B on 2026-11-07).

## F2. Program demonstrations

{{DEMOS}}

## F3. Build and automated test results

{{BUILD_RESULTS}}

### AC to TEST to result table

Automated tests are labelled by level in the table (unit, API/DB integration, E2E); the only manual checks are the NFR rows in the next table. Result column: the full suite on the release commit (section 5 of the results file confirms every row again on `12dcd3c`).

{{AC_TABLE}}

### NFR checks

{{NFR_TABLE}}

## F4. Test excerpts and TDD evidence

Two excerpts of real automated tests, with their setup and assertions, and their red and green runs. The red run is the commit where the tests existed and the behavior did not; the green run is after the implementation.

{{EXCERPTS}}

## F5. Engineering workflow and history

The team worked in GitHub Issues and feature branches; every PR was reviewed by the other student and merged into `sprint-1-staging` with a merge commit; the release PR #79 merged staging into `main`. Two completed Issues, one authored by each student:

{{CHAINS}}

{{HISTORY}}

{{BOARD}}

## F6. Contributions

{{CONTRIB}}

## F7. AI-use declaration

{{AI_USE}}

## F8. Known limitations, incomplete work and failed or skipped tests

- **Failed or skipped tests:** none. On the release commit `npm test` runs 67 tests with 0 failed and 0 skipped, and `npm run test:e2e` runs 5 with 0 failed and 0 skipped. No test was weakened or removed to get green.
- **NFR-06** (data survives a restart) is checked locally only; the deployed check is Lab 5.
- **Server-side 500:** no automated test makes the server itself fail and checks the 500 error shape; the NFR-09 error state is forced in the browser. This is the one open row in the traceability gaps (Part B).
- **3D desktop layer** (D-16): three.js is loaded from a CDN at run time; without internet or a hardware GPU it is skipped and the page shows the plain sky. The screenshots in this Part were taken in headless Chromium, so they show the sky without the 3D objects.
- **Screenshots** are at 1280 x 800; the 375 px phone layout is in the repository under `docs/evidence/ui/`.
- **Not in Sprint 1** (by plan, Part D): cancellation, registration deadlines, check-in, attendance reports, waitlist, self-registration and password recovery.
