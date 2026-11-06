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
| D-07 | Event lifecycle | DRAFT -> PUBLISHED in Sprint 1 (create + publish); CLOSED/CANCELLED in Sprint 2 | Confirmed (partner review) |
| D-08 | Auth and logout | Email + password, bcrypt (cost >= 10). **Server-side session:** a random opaque token in an httpOnly, SameSite=Lax cookie; only its SHA-256 hash is stored in a `Session` table (userId, expiresAt = 1h). Logout deletes the row, so a copied cookie stops working immediately; expired rows are rejected. No JWT. | Confirmed (partner review, revised) |
| D-09 | Roles | PARTICIPANT, ORGANIZER; one role per account; seeded accounts only | Confirmed (partner review) |
| D-10 | Last-place concurrency | In ONE transaction: (1) lock the event row first with `SELECT ... FROM "Event" WHERE id = $1 FOR UPDATE` (Prisma `$queryRaw` inside `$transaction`); (2) still inside it, check for an existing ACTIVE registration and count ACTIVE registrations; (3) reject with 409 if count >= capacity, otherwise insert. Commit releases the lock. The partial unique index on (eventId, participantId) WHERE status = 'ACTIVE' is only a backstop for duplicates; it does not protect capacity. "Atomic conditional insert" is NOT used. | Confirmed (partner review, revised) |
| D-11 | Stack | React + TypeScript + Vite, Express + TypeScript + zod, Prisma + PostgreSQL 16, Vitest/Supertest/Playwright | Confirmed (user) |

## Partner review notes (resolved)
- D-08: partner's condition was that logout deleting the cookie does not revoke a copied JWT. Resolution: replace JWT with a server-side session so logout revokes the token. TEST-04 replays the old cookie after logout and expects 401.
- D-10: partner required locking before the count and insert, and a precise method instead of "atomic conditional insert". Resolution: row lock with `FOR UPDATE` first, as written above. TEST-15 sends parallel requests for the last place and expects exactly one success.

## Team checklist
- [x] Student A: Kirakit Kingkaew, 67070503460
- [x] Student B: Nattakit Prasertsak, 67070503413
- [x] D-02..D-07 and D-09 agreed by partner review
- [x] Partner confirms the revised D-08 and D-10 (no further objections)
- [ ] Optional: ask TA about waitlist (D-05) and deadline timing (D-04) if the team wants them earlier
