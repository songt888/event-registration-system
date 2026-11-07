# AC to TEST results (Sprint 1 QA run, Issue #40)

Single results artifact named in [traceability](../traceability.md) section 8. Run on the `sprint-1-staging` head, commit `c1ee1ce273e9d8e2853d575a2af6300a41f98b4b`, 2026-11-07 22:22 (Asia/Bangkok), local machine, Node 20+, PostgreSQL 16 in Docker. Updated again after the release tag by Issue 10.1 (#41).

## 1. Commands and counts

| Command | Result |
|---|---|
| `npm run build` (server `prisma generate && tsc`, client `tsc -b && vite build`) | passed, no errors |
| `npm test` (Vitest, `DATABASE_URL_TEST`) | 12 files passed; 67 tests: 67 passed, 0 failed, 0 skipped (10 unit, 57 integration) |
| `npm run test:e2e` (Playwright, `DATABASE_URL_E2E`) | 5 tests: 5 passed, 0 failed, 0 skipped (TEST-11, TEST-22, TEST-23, TEST-24 and the smoke test) |
| `npm test -w server -- -t "TEST-15\|TEST-37"`, runs 1 to 5 | 5 of 5 runs passed; each run 2 passed (TEST-15 and TEST-37), 65 not selected by the name filter |

"Skipped" in the filtered runs means not selected by `-t`; no test was skipped or weakened in the full run.

## 2. AC to TEST to file and name to result

Server files are under `server/src/`. Every test name begins with its TEST and AC IDs. Result is from the full run above.

| AC | TEST | File and test name | Result |
|---|---|---|---|
| AC-01 | TEST-01 | `auth/auth.int.test.ts` logs in either role, sets the sid cookie, stores only the token hash with 60-minute expiry | pass |
| AC-02 | TEST-02 | `auth/auth.int.test.ts` same 401 INVALID_CREDENTIALS for wrong password and unknown email | pass |
| AC-03 | TEST-03 | `auth/auth.int.test.ts` GET /api/me without cookie returns 401 | pass |
| AC-04 | TEST-04 | `auth/auth.int.test.ts` logout deletes only the current session (2 tests) | pass |
| AC-05 | TEST-05 | `seed.int.test.ts` seeded passwords are bcrypt cost 12 hashes | pass |
| AC-06 | TEST-06 | `events.int.test.ts` creates a DRAFT with capacity 1 and 10000 (2 tests) | pass |
| AC-07 | TEST-07 | `events.service.unit.test.ts` (5 tests) and `events.int.test.ts` (5 tests) reject invalid capacity | pass |
| AC-08 | TEST-08 | `events.int.test.ts` participant create returns 403 | pass |
| AC-09 | TEST-09 | `events.int.test.ts` 401 on every F-02 route | pass |
| AC-10 | TEST-10 | `events.int.test.ts` lists only PUBLISHED with remaining places; empty list (2 tests) | pass |
| AC-11 | TEST-11 | `e2e/browse.spec.ts` Events screen shows the empty state | pass |
| AC-12 | TEST-12 | `registrations.int.test.ts` registers and lowers remainingPlaces by one | pass |
| AC-13 | TEST-13 | `registrations.int.test.ts` rejects registration when event is full | pass |
| AC-14 | TEST-14 | `registrations.int.test.ts` second registration rejected, DB refuses second ACTIVE row | pass |
| AC-15 | TEST-15 | `registrations.int.test.ts` last place goes to exactly one concurrent request | pass (5 extra runs, all pass) |
| AC-16 | TEST-16 | `registrations.int.test.ts` organizers get 403 | pass |
| AC-17 | TEST-17 | `my-registrations.int.test.ts` only own registrations, newest first, one by ID | pass |
| AC-18 | TEST-18 | `my-registrations.int.test.ts` 404 for another participant's registration | pass |
| AC-19 | TEST-19 | `event-registrations.int.test.ts` owned event registrations, oldest first, name and email only | pass |
| AC-20 | TEST-20 | `event-registrations.int.test.ts` 403 for another organizer on a PUBLISHED event | pass |
| AC-21 | TEST-21 | `event-registrations.int.test.ts` 403 for a participant on any event ID | pass |
| AC-22 | TEST-22 | `e2e/golden-journey.spec.ts` organizer publishes, participant registers and sees it, owner sees the registrant | pass |
| AC-23 | TEST-23 | `e2e/full-event.spec.ts` full event shows the full message and My registrations stays unchanged | pass |
| AC-24 | TEST-24 | `e2e/golden-journey.spec.ts` header shows name and role for each role; after logout a protected page opens login | pass |
| AC-25 | TEST-25 | `events.int.test.ts` publishes the owner DRAFT, persists PUBLISHED with publishedAt | pass |
| AC-26 | TEST-26 | `events.int.test.ts` 404 when another organizer publishes the DRAFT | pass |
| AC-27 | TEST-27 | `registrations.int.test.ts` 404 for DRAFT or unknown event | pass |
| AC-28 | TEST-28 | `registrations.service.unit.test.ts` and `registrations.int.test.ts` EVENT_STARTED (2 tests) | pass |
| AC-29 | TEST-29 | `events.service.unit.test.ts` and `events.int.test.ts` past startsAt rejected (2 tests) | pass |
| AC-30 | TEST-30 | `events.service.unit.test.ts` and `events.int.test.ts` publish with past or equal start rejected (2 tests) | pass |
| AC-31 | TEST-31 | `events.int.test.ts` owner DRAFT by ID | pass |
| AC-32 | TEST-32 | `events.int.test.ts` same 404 for a DRAFT and a missing ID | pass |
| AC-33 | TEST-33 | `events.int.test.ts` lists only the caller's events ordered by startsAt then id | pass |
| AC-34 | TEST-34 | `events.int.test.ts` participant My events returns 403 | pass |
| AC-35 | TEST-35 | `events.service.unit.test.ts` startsAt equal to now rejected on create | pass |
| AC-36 | TEST-36 | `events.int.test.ts` 409 on republish | pass |
| AC-37 | TEST-37 | `registrations.limits.int.test.ts` 20 participants, capacity 5, exactly 5 ACTIVE | pass (5 extra runs, all pass) |
| AC-38 | TEST-38 | `events.int.test.ts` 401 and no event data for bad sessions | pass |
| AC-39 | TEST-39 | `auth/auth.int.test.ts` GET /api/me returns exactly id, name, role | pass |
| AC-40 | TEST-40 | `auth/session.unit.test.ts` and `auth/auth.int.test.ts` expired sessions (2 tests) | pass |
| AC-41 | TEST-41 | `auth/auth.int.test.ts` invalid login requests return 400 | pass |
| AC-42 | TEST-42 | `auth/guards.int.test.ts` 401 before role, 403 wrong role, identity from session (3 tests) | pass |
| AC-43 | TEST-43 | `registrations.limits.int.test.ts` 401 for bad sessions, nothing stored | pass |
| AC-44 | TEST-44 | `registrations.limits.int.test.ts` participantId body and non-UUID rejected | pass |
| AC-45 | TEST-45 | `my-registrations.int.test.ts` 401 on both routes | pass |
| AC-46 | TEST-46 | `my-registrations.int.test.ts` 403 organizer, 404 unknown, 400 non-UUID | pass |
| AC-47 | TEST-47 | `event-registrations.int.test.ts` 401 for bad sessions | pass |
| AC-48 | TEST-48 | `event-registrations.int.test.ts` 404 foreign DRAFT or unknown, 400 non-UUID | pass |
| AC-49 | TEST-49 | `events.int.test.ts` PUBLISHED event to every role with remainingPlaces | pass |
| AC-50 | TEST-50 | `events.int.test.ts` role before lookup, ownership before state on publish | pass |
| AC-51 | TEST-51 | `events.int.test.ts` malformed create, publish and ID input rejected | pass |

Summary: 51 of 51 AC have a passing test on the staging head. Also in the full run, `foundation.int.test.ts` (2 tests, health and test-database isolation) has no AC.

## 3. NFR checks

| NFR | Check | Result |
|---|---|---|
| NFR-04 | TEST-37, five runs | pass 5 of 5 (section 1) |
| NFR-08 | `README.md` setup block has 8 commands (clone, cd, cp, docker compose, npm install, migrate, seed, dev); limit is 10 | counted from the README; a run from a fresh clone was not done in this QA run |
| NFR-06 | data survives a server restart | not run: this run could not call the API with `curl` to create data, stop the server and read it back |
| NFR-09 | loading, empty and error states on the five S1 screens | not run: manual browser checklist not done in this QA run |

## 4. Not covered by this run

- NFR-06, NFR-09 and the fresh-clone part of NFR-08 (section 3) are open. They are run by hand by B and recorded here before the release PR (10.4); there is no accepted gap.
- This file records the staging head only. Issue 10.1 (#41) repeats the run on the tagged release.
