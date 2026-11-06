# AGENTS.md — Event Registration and Attendance System

CPE 334 group project (Semester 1/2026), Theme 3. Team of two students, one repo, one application.
Master plan: `deliverable1-plan.md`. Current target: Deliverable 1 (Sprint 1 + baseline docs).

## What we are building
Organizers publish events with limited capacity. Participants register. Organizers view registrations; later they check people in and report attendance.
Roles: `PARTICIPANT`, `ORGANIZER` (one role per account, seeded accounts only in Sprint 1).

Sprint 1 scope (F-01..F-06): login/logout/me, organizer publishes event, browse events, participant registers, participant views own registrations, organizer views registrations of own event.
Out of scope in Sprint 1: cancellation, deadlines, check-in, attendance reports, waitlist, self-registration, password recovery.

## Stack (change only with a recorded decision)
- UI: React + TypeScript + Vite
- API: Node 20 + Express + TypeScript, zod validation
- DB: PostgreSQL 16 + Prisma migrations + seed script (docker-compose for local DB)
- Auth: bcrypt password hashes; server-side session (opaque token in httpOnly cookie, hash stored in a `Session` table, 1h expiry); logout deletes the session row (D-08)
- Tests: Vitest (unit), Supertest (API + real DB integration), Playwright (few E2E journeys)
- Layout: `client/`, `server/`, `docs/`, `e2e/`

## Non-negotiable rules
1. **Business rules live in the backend service layer** and, where possible, DB constraints. Never only in React.
2. **Authorization is enforced on the backend** from the session. Never trust a client-supplied user ID or role. Every protected route checks authentication, role, and ownership.
3. **Ownership:** a participant reads only their own registrations; an organizer manages and views only events they own.
4. **Capacity and duplicates:** never exceed capacity, even for concurrent requests for the last place (one transaction: lock the event row with `SELECT ... FOR UPDATE` first, then check duplicate, count ACTIVE, insert; D-10). One ACTIVE registration per participant per event (partial unique index plus service check). Prisma schema cannot declare a partial index, so it is added with raw SQL in a migration; check in Issue 3 that `prisma migrate dev` reports no drift and does not drop it.
5. **No plaintext passwords.** Never return `passwordHash`. No real secrets in Git, docs, screenshots, or PDF. Only `.env.example`; `.env` is gitignored. Demo data is synthetic.
6. **Errors** use one JSON shape: `{ "error": { "code": "...", "message": "..." } }`. Codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 rule conflict. No stack traces to clients.
7. **Do not weaken, skip, or delete tests to get green.** Report failed and skipped tests honestly.
8. Do not claim "all tests pass" without running the command. Evidence = command + output + tested commit hash.

## Workflow (the course requires this order, and the history is graded)
Work one bounded GitHub Issue at a time, in the order of `docs/sprints/sprint-1/issue-plan.md`.
Kanban: Backlog → Specified → Started → PR Review → Fixing → Done. Never commit on `main`. Branch names: `feature/s1-NN-topic`.
1. Read the feature contract in `docs/sprints/sprint-1/` (feature SDS, AC, STS). If it is missing or wrong, **update the contract first** and commit it alone (`docs: ...`).
2. Branch from `sprint-1-staging`: `feature/s1-NN-topic`, where NN is the Issue number (docs: `docs/s1-NN-topic`, fixes: `fix/s1-NN-topic`).
3. **TDD:** commit failing tests (red) → commit implementation (green) → refactor. Test names must contain the TEST ID, e.g. `TEST-13 AC-13 rejects registration when event is full`.
4. Run the full test suite, inspect the diff, update docs/README.
5. Open a PR into `sprint-1-staging`, linked to the Issue (FR/BR/F/AC IDs in the description). **The teammate reviews with a specific check or finding. Authors never approve their own PR.**
6. After integration and acceptance checks, open a reviewed release PR `sprint-1-staging` → `main`, then tag `v0.1.0-sprint1`. **No commits to `main` after the tag** before submission.
7. Keep contract revisions visible; record justified scope changes instead of silently shrinking scope.

Commit style: short imperative subject with IDs, e.g. `test(F-04): add failing capacity tests (AC-13, AC-15)`.

## ID conventions (must match across docs, code, tests, PDF)
`FR-xx`, `BR-xx`, `NFR-xx`, `D-xx` (decisions), `F-xx` (features), `AC-xx`, `TEST-xx`, `S1/S2/S3`. Never renumber; add new IDs.
Docs: `docs/srs.md`, `docs/features.md`, `docs/traceability.md`, `docs/system-sds.md`, `docs/sprints/plan.md`, `docs/sprints/sprint-1/`, `docs/evidence/`.

## Commands (fill in as they are created; keep README identical)
```bash
docker compose up -d db          # PostgreSQL
cd server && npm install && npx prisma migrate dev && npm run seed
npm run dev                      # server and client
npm test                         # unit + API/DB integration (uses DATABASE_URL_TEST, a separate test database, never the dev one)
npm run test:e2e                 # Playwright
```

## Definition of Done
Behavior implemented · planned tests executed and meaningful · no required test skipped · teammate-reviewed PR merged to staging · integration run · README and docs current · incomplete work disclosed · evidence recorded.

## For AI agents
- Both students must understand every change. Keep diffs small and tied to one Issue; explain what you changed and why.
- Read the contract and existing tests before coding. Do not invent endpoints or fields that the contract does not list.
- Never commit, push, merge, or tag without being asked. Never approve PRs.
- Prefer the simplest implementation that satisfies the AC. No extra features, options, or abstractions.
- Record AI use for the declaration in the PDF (tool + task), no transcripts needed.
- Deliverable 1 does not need Docker packaging, CI/CD, GCP, or a demo video (Lab 5 / final).
