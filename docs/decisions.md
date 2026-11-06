# Step 0 — Kickoff Decisions

These become the decision table in `docs/srs.md` (Issue 1).

| ID | Question | Decision | Status |
|----|----|----|----|
| D-01 | Context | University campus events (seminars, workshops, activities); synthetic data | Confirmed (user) |
| D-02 | Duplicate registration | One ACTIVE registration per participant per event; DB partial unique index + service check | Confirmed (partner review) |
| D-03 | Capacity | Integer 1..10,000, counted against ACTIVE registrations; capacity change after publish is Sprint 2 | Confirmed (partner review) |
| D-04 | Registration deadline | Sprint 1: registration allowed while event is PUBLISHED and has not started; deadline field and rules in Sprint 2 | Confirmed (partner review) |
| D-05 | Waitlist | Out of scope (explicit exclusion) | Confirmed (partner review) |
| D-06 | Who sees registrations | Participant: own only. Organizer: registrations of events they own only | Confirmed (partner review) |
| D-07 | Event lifecycle | ~~DRAFT -> PUBLISHED in Sprint 1 (create + publish); CLOSED/CANCELLED in Sprint 2~~ **Revised:** Sprint 1 has a real DRAFT state. `POST /api/events` creates a DRAFT owned by the organizer; a separate publish action (`POST /api/events/:id/publish`) moves DRAFT -> PUBLISHED, owner only. Only PUBLISHED events are listed and can be registered for. **Reading drafts:** `GET /api/events/:id` returns a DRAFT only to its owner (404 `EVENT_NOT_FOUND` for everyone else); `GET /api/events/mine` (ORGANIZER only, 403 for participants) lists the caller's own events in every status, for picking one to publish or to open in F-06. CLOSED/CANCELLED in Sprint 2. Reason: the old wording allowed "create = publish", which left no DRAFT rows, so AC-10 ("only PUBLISHED listed") could not be tested, and it gives Sprint 1 a real state transition. | Revised (docs/s1-00-plan-fixes, pending partner review) |
| D-08 | Auth and logout | Email + password, bcrypt (cost >= 10). **Server-side session:** a random opaque token in an httpOnly, SameSite=Lax cookie; only its SHA-256 hash is stored in a `Session` table (userId, expiresAt = 1h). Logout deletes the row, so a copied cookie stops working immediately; expired rows are rejected. No JWT. | Confirmed (partner review, revised) |
| D-09 | Roles | PARTICIPANT, ORGANIZER; one role per account; seeded accounts only | Confirmed (partner review) |
| D-10 | Last-place concurrency | In ONE transaction: (1) lock the event row first with `SELECT ... FROM "Event" WHERE id = $1 FOR UPDATE` (Prisma `$queryRaw` inside `$transaction`); (2) still inside it, check for an existing ACTIVE registration and count ACTIVE registrations; (3) reject with 409 if count >= capacity, otherwise insert. Commit releases the lock. The partial unique index on (eventId, participantId) WHERE status = 'ACTIVE' is only a backstop for duplicates; it does not protect capacity. "Atomic conditional insert" is NOT used. | Confirmed (partner review, revised) |
| D-11 | Stack | React + TypeScript + Vite, Express + TypeScript + zod, Prisma + PostgreSQL 16, Vitest/Supertest/Playwright. Written from scratch for this project; no code copied from the individual TokTickIT labs. | Confirmed (user, both students) |
| D-12 | Event start time | `startsAt` must be in the future when an event is created and again when it is published; otherwise 400 `INVALID_START_TIME` and nothing changes (new BR-09). Reason: without it an organizer can publish an event nobody can ever register for (BR-04). **Testing time:** service functions take `now: Date` as an argument (routes pass `new Date()`), so unit tests use a fixed time; API tests for AC-28 and AC-30 insert fixture events with a past `startsAt` directly in the database, so they need no fake clock. | Proposed (docs/s1-00-plan-fixes, pending partner review) |
| D-13 | Error codes for rejected registrations and foreign records | Organizer tries to register: 403 `FORBIDDEN`. Event is DRAFT or does not exist: 404 `EVENT_NOT_FOUND` (a participant cannot tell a draft from a missing event). Event already started: 409 `EVENT_STARTED`. Another participant's registration: 404 `NOT_FOUND`, so its existence is not revealed. Another organizer's event registrations: 403 `FORBIDDEN`. **Event rule:** a DRAFT is private, so a non-owner gets 404 `EVENT_NOT_FOUND` for every operation on it (read, publish, view registrations); a PUBLISHED event is public, so a non-owner gets 403 `FORBIDDEN` on owner-only operations. Organizer B publishing organizer A's DRAFT is therefore 404 (AC-26), so the draft's existence is not revealed. Reason: each test needs one exact expected code; the plan said "409/404" and "403/404". | Proposed (docs/s1-00-plan-fixes, pending partner review) |
| D-14 | Test database | Integration and concurrency tests run against a separate PostgreSQL database (`DATABASE_URL_TEST`), never the dev database. **Isolation:** integration test files run one at a time (Vitest `fileParallelism: false` for the integration project; unit tests stay parallel), and every table is truncated in `beforeEach`. TEST-15 makes its parallel requests inside one test, so no other file touches the database while it runs. | Proposed (docs/s1-00-plan-fixes, pending partner review) |

## Partner review notes (resolved)
- D-08: partner's condition was that logout deleting the cookie does not revoke a copied JWT. Resolution: replace JWT with a server-side session so logout revokes the token. TEST-04 replays the old cookie after logout and expects 401.
- D-10: partner required locking before the count and insert, and a precise method instead of "atomic conditional insert". Resolution: row lock with `FOR UPDATE` first, as written above. TEST-15 sends parallel requests for the last place and expects exactly one success.

## Team checklist
- [x] Student A: Kirakit Kingkaew, 67070503460
- [x] Student B: Nattakit Prasertsak, 67070503413
- [x] D-02..D-07 and D-09 agreed by partner review
- [x] Partner confirms the revised D-08 and D-10 (no further objections)
- [ ] Optional: ask TA about waitlist (D-05) and deadline timing (D-04) if the team wants them earlier
- [ ] Partner reviews revised D-07 and new D-12..D-14 (PR from `docs/s1-00-plan-fixes`)
