# F-04 Register for an event: engineering contract (Sprint 1)

Issue: #20 (sub-task 2.4 of Issue 2). Implementation: Issue 7 (`feature/s1-07-register`): B writes the failing tests (7.1, #32), A writes the implementation and UI (7.2, #33).
Author: B (stickkersz). Reviewer: A (songt888).
Sources: `docs/srs.md` (FR-06, BR-02, BR-03, BR-04, NFR-01, NFR-03, NFR-04, NFR-07, NFR-09), `docs/decisions.md` (D-02, D-03, D-04, D-10, D-12, D-13, D-14), `docs/system-sds.md` (sections 1.3, 2.1, 2.3, 3, 4, 5, 6, 9, 11), `docs/traceability.md` (NFR-01, NFR-03, NFR-07 rows and coverage gaps), `deliverable1-plan.md` sections 3 and 5. Lab 7 (version 1.7): `docs/labs/lab-07/change-request.md` (CR-01, BR-10, AC-57 to AC-61).

## 1. Linked requirements
| ID | How F-04 covers it |
|---|---|
| FR-06 | A participant registers for a PUBLISHED event that has not started. One ACTIVE registration is stored and `remainingPlaces` goes down by one. Full, duplicate, DRAFT or missing, started-event and time-conflict (BR-10) requests store nothing. |
| BR-02 | ACTIVE registrations never exceed `capacity`, also for parallel requests for the last place. One transaction locks the event row before any check (D-10). |
| BR-03 | One ACTIVE registration per participant per event: service check inside the transaction, plus the partial unique index from Issue 3 (D-02). |
| BR-04 | Only a PUBLISHED event with `startsAt` strictly later than now is registrable; `startsAt` equal to now counts as started (D-04, D-12). |
| BR-10 | (CR-01, Lab 7) A participant may not hold two ACTIVE registrations for events whose `startsAt` are less than 120 minutes apart; exactly 120 minutes is allowed. Checked in the same transaction after the duplicate check and before the capacity check, with the participant's `User` row locked after the event row. |
| NFR-01 | A call to `POST /api/events/:id/registrations` with no cookie, an unknown token, an expired session or a logged-out session gets 401 `UNAUTHENTICATED` and stores nothing (AC-43). |
| NFR-03 | The participant is always the session user; a request body that names a `participantId` is rejected with 400 and stores nothing (AC-44). |
| NFR-04 | 20 parallel registration requests from 20 different participants for a capacity-5 event store exactly 5 ACTIVE registrations (AC-37). |
| NFR-07 | Inputs are validated server-side: a non-UUID `:id` or any body field gets 400 `VALIDATION_ERROR` (AC-44). Errors use the shared shape `{ "error": { "code", "message" } }`, plus `details` for 400 `VALIDATION_ERROR` only, and no `stack` field (system SDS 4.2); every STS error case asserts the shape (section 11). |
| NFR-09 | On the Event detail screen (one of the five NFR-09 screens) a registration rejected with 409 shows the API `error.message` readably; 403, 404, submitting and success states follow system SDS 3.2. |
| D-13 | Organizer: 403 `FORBIDDEN`. DRAFT or missing event: 404 `EVENT_NOT_FOUND`. Started event: 409 `EVENT_STARTED`. |

## 2. Behavior and workflow
1. A signed-in participant opens `/events/:id` (F-03 screen) and presses Register.
2. The UI calls `POST /api/events/:id/registrations`. It sends no user ID: the participant is always the session user.
3. The route runs `requireSession` (401), then `requireRole('PARTICIPANT')` (403). An organizer gets 403 for every event ID, so the check order of D-13 holds.
4. The service runs one database transaction, in this order (D-10; steps 5 and 6 added by CR-01, BR-10):
   1. Lock the event row: `SELECT ... FROM "Event" WHERE id = $1 FOR UPDATE` (Prisma `$queryRaw` inside `$transaction`).
   2. No row, or status is not `PUBLISHED`: 404 `EVENT_NOT_FOUND`.
   3. `startsAt <= now`: 409 `EVENT_STARTED`. `now` is a parameter of the service function; the route passes `new Date()` (D-12).
   4. The participant already has an ACTIVE registration for this event: 409 `ALREADY_REGISTERED`.
   5. Lock the participant's row: `SELECT id FROM "User" WHERE id = ${participantId}::uuid FOR UPDATE` (Prisma `$queryRaw`, like the event lock).
   6. The participant has an ACTIVE registration for another event whose `startsAt` differs from this event's `startsAt` by less than 120 minutes, in either direction: 409 `TIME_CONFLICT` (BR-10). The target event itself is excluded, and the other event counts whatever its state, also when it has already started. Exactly 120 minutes is allowed.
   7. Count ACTIVE registrations of the event. Count `>= capacity`: 409 `EVENT_FULL`.
   8. Insert the registration with status `ACTIVE` and return 201.
5. Commit releases the lock. Any rejection rolls back, so nothing is stored.
6. If the insert still hits the partial unique index (Prisma error `P2002`), the service returns 409 `ALREADY_REGISTERED`. With the row lock this should not happen; the index is only a backstop (D-10).
7. The UI shows the result and reloads the event, so the screen shows the new `remainingPlaces` from the API.

Because the event row is locked first, a second request for the same event waits until the first commits, then counts the committed rows. Two requests can never both see the last free place.

The lock order is always the event row, then the participant row (CR-01). Two requests by the same participant for two different events therefore run one after the other at step 5, so the second sees the first's committed registration at step 6 (AC-60). Requests by different participants for the same event still queue on the event row only, as before. Every request takes the two locks in the same order, so they cannot deadlock. The participant lock comes after step 4, so a repeat registration still answers `ALREADY_REGISTERED` without waiting for it.

## 3. Validation
- Path parameter `:id` must be a UUID; otherwise 400 `VALIDATION_ERROR` (system SDS 4.1, 4.2), checked after the session and role guards and before any query.
- Request body: an empty JSON object `{}` sent with `Content-Type: application/json`; any field (for example `participantId`) is rejected with 400 `VALIDATION_ERROR` (system SDS 4.1, unknown fields rejected). The service never reads a participant ID from the request.
- State-changing request rules of system SDS 4.1 apply (`POST` with `Content-Type: application/json`).

## 4. Failure and boundary cases
| Case | Result |
|---|---|
| No cookie, unknown token, expired session (`expiresAt <= now`) or logged-out session | 401 `UNAUTHENTICATED`, nothing stored (AC-43), tested on this route |
| Caller is an organizer (owner or not, any event ID) | 403 `FORBIDDEN`, nothing stored (AC-16) |
| Event ID unknown or event is DRAFT | 404 `EVENT_NOT_FOUND`, nothing stored (AC-27) |
| `:id` not a UUID | 400 `VALIDATION_ERROR`, nothing stored (AC-44) |
| Event PUBLISHED but `startsAt` in the past | 409 `EVENT_STARTED`, nothing stored (AC-28) |
| `startsAt` exactly equal to `now` (boundary) | 409 `EVENT_STARTED` (AC-28, BR-04) |
| Participant already has an ACTIVE registration for the event | 409 `ALREADY_REGISTERED`, still one row (AC-14) |
| ACTIVE count equals `capacity` | 409 `EVENT_FULL`, nothing stored (AC-13) |
| The participant has an ACTIVE registration for another event starting 119 minutes before or after this one, or at the same time | 409 `TIME_CONFLICT`, nothing stored, remaining places unchanged (AC-57) |
| The other event starts exactly 120 minutes before or after (boundary) | 201 (AC-58) |
| Another participant holds a registration at the same time | not a conflict: only the caller's own ACTIVE registrations count (AC-59) |
| Time conflict and the event is full | 409 `TIME_CONFLICT` (step 6 before step 7) (AC-59) |
| Time conflict and already registered for this event | 409 `ALREADY_REGISTERED` (step 4 before step 6) (AC-59) |
| Time conflict and the event has started | 409 `EVENT_STARTED` (step 3 first) (AC-59) |
| The conflicting registration is for an event that has already started | still counts: 409 `TIME_CONFLICT` (AC-59) |
| Two requests at once by one participant for two events 60 minutes apart, both with free places | exactly one 201, the other 409 `TIME_CONFLICT`; one ACTIVE row (AC-60) |
| One place left (`capacity - 1` ACTIVE) | the request succeeds; the event is then full (AC-12, AC-15) |
| Several requests at once for the last place | exactly one 201, the others 409 `EVENT_FULL` (AC-15) |
| 20 parallel requests, capacity 5, no prior registrations | exactly five 201, fifteen 409 `EVENT_FULL` (AC-37) |
| A body with any field, for example `participantId` | 400 `VALIDATION_ERROR`, nothing stored (AC-44) |
| Unexpected server or database failure | 500 `INTERNAL_ERROR`, generic message, no stack trace (NFR-07) |

When several rules fail at once, the first failing step in section 2 decides the code: a participant who is already registered for a full event gets `ALREADY_REGISTERED`; a full event that has started gets `EVENT_STARTED`; a time conflict beats a full event, and a repeat registration or a started event beats a time conflict.

## 5. Permissions
| Operation | Anon | Participant | Organizer (owner) | Organizer (other) |
|---|---|---|---|---|
| `POST /api/events/:id/registrations` | 401 | allowed if BR-02..BR-04 and BR-10 hold | 403 | 403 |

Identity comes only from the session cookie (NFR-03). The new registration's `participantId` is always the session user's ID.

## 6. UI behavior
| Screen | Route | Behavior |
|---|---|---|
| Event detail | `/events/:id` | The Register button is shown only to participants (from `GET /api/me`) and only for a PUBLISHED event. It stays enabled when the event shows "Full", so the server rule decides and its message is shown (AC-23). Submitting: the button is disabled while the request is pending. Success: "You are registered for this event." and the event reloads from the API. Error: the API `error.message` in an alert; on 409 the event also reloads from the API, so the places text is current (AC-62); 401 redirects to `/login`; 403 shows "You do not have access to this"; 404 shows "Not found" (system SDS 3.2). |

API `error.message` values (the UI shows them for 409; 403 and 404 follow system SDS 3.2):
| Code | `error.message` |
|---|---|
| `EVENT_FULL` | "This event has no places left." (system SDS 4.2) |
| `ALREADY_REGISTERED` | "You are already registered for this event." |
| `EVENT_STARTED` | "This event has already started." |
| `TIME_CONFLICT` | "You are already registered for another event that starts within 2 hours of this one." (no other event's ID or title is returned; AC-61) |
| `EVENT_NOT_FOUND` | "Event not found." |
| `FORBIDDEN` | "You do not have access to this." |

Shared states follow system SDS 3.2. The UI never decides capacity, duplicates or eligibility itself.

## 7. API
### `POST /api/events/:id/registrations`
- Auth: session cookie required. Role `PARTICIPANT`.
- Request: path `:id` (UUID); body `{}` (`Content-Type: application/json`).
- Response 201:
```json
{
  "registration": {
    "id": "7a2d4c10-0000-4000-8000-000000000002",
    "eventId": "3f1c2a9e-0000-4000-8000-000000000001",
    "status": "ACTIVE",
    "createdAt": "2026-11-10T08:15:00.000Z"
  },
  "remainingPlaces": 28
}
```
- `remainingPlaces` is computed after the insert, inside the same transaction.
- Not returned: `participantId` (it is the caller), other registrations, owner details.
- Errors: 400 `VALIDATION_ERROR`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `EVENT_NOT_FOUND`; 409 `EVENT_STARTED`, `ALREADY_REGISTERED`, `TIME_CONFLICT`, `EVENT_FULL`; 500 `INTERNAL_ERROR`. Shape as in system SDS 4.2.

## 8. Data
- No schema change and no migration. F-04 writes `Registration` (`id`, `eventId`, `participantId`, `status`, `createdAt`) as created in Issue 3.
- Relies on the partial unique index `(eventId, participantId) WHERE status = 'ACTIVE'` and the `capacity` CHECK 1..10000 from the Issue 3 migration (system SDS 2.3).
- The seed planned in system SDS 2.3 (Issue 3) has one PUBLISHED event with capacity 2 and one ACTIVE registration, for the full-event demo and TEST-23; no seed change.
- CR-01 (BR-10) adds no column, index or migration. The rule is checked in the service only: a database constraint cannot compare `startsAt` across two events. Registrations made before the release that already conflict stay as they are (no migration, no cancellation, D-20); the rule applies to new registration requests only.

## 9. Dependencies on other contracts
- F-01 (#17): `requireSession`, `requireRole`, the 401/403 responses and the error handler.
- F-02 (#18): events exist and are published; `GET /api/events/:id` returns `remainingPlaces` for the reload after registering.
- F-03 (#19): the Event detail screen that holds the Register button.
- Issue 3: schema with the partial unique index, `DATABASE_URL_TEST`, sequential integration files and table truncation (D-14).

## 10. Acceptance criteria
| AC | Criterion | Linked |
|---|---|---|
| AC-12 | A participant registering for a PUBLISHED, future event with free places gets 201 with an ACTIVE registration; exactly one ACTIVE row for that participant and event is stored; `remainingPlaces` in the response and in `GET /api/events/:id` is one lower than before. | FR-06 |
| AC-13 | Registering for an event whose ACTIVE registrations equal its capacity returns 409 `EVENT_FULL` and stores no row. | FR-06, BR-02 |
| AC-14 | A participant's second registration for the same event returns 409 `ALREADY_REGISTERED` and the event still has one ACTIVE row for that participant; inserting a second ACTIVE row for the same participant and event directly in the database fails with a unique violation. | FR-06, BR-03, D-02 |
| AC-15 | When several different participants send registration requests at the same time for the last place of an event, exactly one gets 201, every other request gets 409 `EVENT_FULL`, and ACTIVE registrations equal the capacity. | BR-02, D-10 |
| AC-16 | An organizer (owner or not) registering for an event (PUBLISHED, DRAFT or unknown ID) returns 403 `FORBIDDEN` and stores no row. | FR-06, D-13 |
| AC-27 | Registering for a DRAFT event or an unknown event ID returns 404 `EVENT_NOT_FOUND` and stores no row. | FR-06, BR-04, D-13 |
| AC-28 | Registering for a PUBLISHED event whose `startsAt` is in the past returns 409 `EVENT_STARTED` and stores no row; `startsAt` equal to `now` is also rejected as started. | FR-06, BR-04, D-12 |
| AC-37 | For 20 different participants sending registration requests at the same time to a PUBLISHED, future event with capacity 5 and no registrations, exactly 5 requests get 201, 15 get 409 `EVENT_FULL`, and exactly 5 ACTIVE registrations are stored. | NFR-04, BR-02 |
| AC-43 | `POST /api/events/:id/registrations` with no cookie, with a token that matches no session, with an expired session (`expiresAt <= now`) or with the cookie of a logged-out session returns 401 `UNAUTHENTICATED` and stores no row. | NFR-01, FR-06, D-08 |
| AC-62 | On the event page, when Register is refused with 409, the page shows the API message and then reloads the event, so the places text equals `remainingPlaces` from `GET /api/events/:id` at that time. | FR-05, FR-06 UI; Lab 6 enhancement #143 (L6-10) |
| AC-44 | A participant's request with body `{ "participantId": "<another participant's id>" }`, or with a non-UUID `:id`, returns 400 `VALIDATION_ERROR` and stores no row. | NFR-03, NFR-07, FR-06 |
| AC-57 | Registering for an event whose `startsAt` is 119 minutes after, 119 minutes before, or equal to the `startsAt` of an event the participant is ACTIVE-registered for returns 409 `TIME_CONFLICT` with the message in section 6; no row is stored and the event's `remainingPlaces` is unchanged. | FR-06, BR-10; CR-01 |
| AC-58 | Registering for an event that starts exactly 120 minutes after, or exactly 120 minutes before, an event the participant is ACTIVE-registered for returns 201. | FR-06, BR-10; CR-01 |
| AC-59 | The check is per participant and keeps the check order: another participant with no registration near that time registers for the same event (201); a repeat registration for the same event still returns `ALREADY_REGISTERED`; a full event that also conflicts returns `TIME_CONFLICT`; a started event that also conflicts returns `EVENT_STARTED`; and an ACTIVE registration for an event that has already started still counts, so registering for an event less than 120 minutes from it returns `TIME_CONFLICT`. Nothing is stored for a rejected request. | FR-06, BR-02, BR-03, BR-10; CR-01 |
| AC-60 | When one participant sends two registration requests at the same time for two PUBLISHED, future events with free places whose `startsAt` are 60 minutes apart, exactly one ACTIVE registration is stored; the other request gets 409 `TIME_CONFLICT`. | BR-10, D-10; CR-01 |
| AC-61 | On the Event detail screen, a participant whose registration is rejected with `TIME_CONFLICT` sees the message in section 6 in the alert, and the places text does not change. Checked by E2E, or by a manual post-deployment check labelled manual. | FR-06, BR-10, NFR-09; CR-01 |

TEST-37 is already named as the NFR-04 verification in `docs/srs.md` (NFR-04, BR-02), `docs/system-sds.md` (sections 9 and 11) and `deliverable1-plan.md` section 3, which says it is "specified in the F-04 contract, #20"; this contract defines AC-37 with the same number.
AC-43 and AC-44 are new: no existing AC covered an unauthenticated registration request (AC-03 covers `/api/me`, AC-09 covers `POST /api/events`, AC-38 in F-03 PR #53 covers `GET /api/events`), or a registration request that names another participant or has an invalid `:id`. `docs/traceability.md` asks the F-01..F-06 contract authors to enumerate session checks on protected routes (NFR-01 row, coverage gaps) and to add explicit validation and direct-request assertions (NFR-03, NFR-07). The numbers follow AC-42, the highest AC found on `sprint-1-staging`, every remote branch and the open PRs.

## 11. Software test specification (STS)
All API tests below are API + DB integration tests (Vitest + Supertest, `DATABASE_URL_TEST`, tables truncated in `beforeEach`, D-14). Fixtures are inserted directly in the database; "log in" means `POST /api/auth/login` with the fixture's password. Every `POST` in these tests sends `{}` as JSON, except the body case of TEST-44. Every error response is also asserted to have the shape `{ "error": { "code", "message" } }`, plus `details` for 400 `VALIDATION_ERROR` only, and no `stack` field (NFR-07, system SDS 4.2): the 401, 403, 404 and 409 responses have exactly the keys `code` and `message` in `error`; the 400 responses (TEST-44) have exactly the keys `code`, `message` and `details` in `error`, with the full envelope asserted in the TEST-44 row.

| TEST | AC | Level | Setup | Steps | Expected |
|---|---|---|---|---|---|
| TEST-12 | AC-12 | API + DB integration | Organizer O; participant P1; event E PUBLISHED, capacity 3, `startsAt` now + 7 days, no registrations. Log in as P1. | `POST /api/events/E/registrations`; then `GET /api/events/E`. | 201; `registration.status` `ACTIVE`, `registration.eventId` E; `remainingPlaces` 2. Database: exactly one Registration for (E, P1), status ACTIVE. Detail shows `remainingPlaces` 2. |
| TEST-13 | AC-13 | API + DB integration | O; participants P1, P2, P3; E PUBLISHED, capacity 2, future, ACTIVE registrations for P1 and P2. Log in as P3. | `POST /api/events/E/registrations`. | 409, `error.code` `EVENT_FULL`. Database: still 2 Registrations for E, none for P3. |
| TEST-14 | AC-14 | API + DB integration | O; P1; E PUBLISHED, capacity 5, future. Log in as P1. | (a) Register for E twice. (b) Insert a second ACTIVE Registration for (E, P1) directly with Prisma. | (a) first 201, second 409 `ALREADY_REGISTERED`; one ACTIVE row for (E, P1). (b) the insert throws a unique violation (Prisma `P2002`); still one ACTIVE row. |
| TEST-15 | AC-15 | API + DB integration, concurrent | O; participants P1..P12; E PUBLISHED, capacity 3, future, ACTIVE registrations for P1 and P2 (one place left). Log in P3..P12 one by one first, keeping each cookie. | Send the 10 registration requests (P3..P12) at the same time with `Promise.all`, all inside one test. | Exactly one 201 and nine 409 `EVENT_FULL`. Database: exactly 3 ACTIVE Registrations for E. |
| TEST-16 | AC-16 | API + DB integration | Organizers O (owner) and O2; E PUBLISHED, capacity 5, future, owned by O; D DRAFT, capacity 5, future, owned by O. | Log in as O, `POST /api/events/E/registrations`; log in as O2, same request; as O2, the same request with a random UUID; as O, `POST /api/events/D/registrations`; as O2, the same request for D. | All five 403 `FORBIDDEN` (the role check runs before the DRAFT check, D-13). Database: no Registration rows. |
| TEST-27 | AC-27 | API + DB integration | O; P1; D DRAFT owned by O, capacity 5, future. Log in as P1. | Register for D; for a random UUID. | Both 404 `EVENT_NOT_FOUND`. Database: no Registration rows. |
| TEST-28 | AC-28 | API + DB integration and unit | O; P1; S PUBLISHED, capacity 5, `startsAt` now minus 1 hour (inserted directly, D-12). Log in as P1. Unit case: no database. | Register for S. Unit case: call the service's eligibility check with a fixed `now` equal to the event's `startsAt`. | API: 409 `EVENT_STARTED`; no Registration rows. Unit: rejected with `EVENT_STARTED`. |
| TEST-37 | AC-37 | API + DB integration, concurrent | O; participants P1..P20; E PUBLISHED, capacity 5, future, no registrations. Log in P1..P20 one by one first, keeping each cookie. | Send the 20 registration requests at the same time with `Promise.all`, all inside one test. | Exactly five 201 and fifteen 409 `EVENT_FULL`. Database: exactly 5 ACTIVE Registrations for E, from 5 different participants. |
| TEST-43 | AC-43 | API + DB integration | O; P1; E PUBLISHED, capacity 5, future, owned by O. A `Session` row for P1 with `tokenHash` = SHA-256 of a known token T and `expiresAt` in the past, inserted directly (system SDS 6, D-08). | `POST /api/events/E/registrations` (a) with no cookie, (b) with a random token as cookie, (c) with T as cookie, (d) after logging in as P1 and `POST /api/auth/logout`, with the old cookie. | All four 401, `error.code` `UNAUTHENTICATED`. Database: no Registration rows. |
| TEST-44 | AC-44 | API + DB integration | O; participants P1, P2; E PUBLISHED, capacity 5, future, owned by O. Log in as P1. | (a) `POST /api/events/E/registrations` with body `{ "participantId": "<P2 id>" }`. (b) `POST /api/events/not-a-uuid/registrations` with `{}`. | Both 400 with the envelope `{ "error": { "code": "VALIDATION_ERROR", "message": "<nonempty string>", "details": [{ "field": "<name>", "message": "<nonempty string>" }] } }` (system SDS 4.2): `error` has exactly the keys `code`, `message` and `details` (no `stack`); `error.message` is a nonempty string; `details` is a nonempty array whose items have exactly the keys `field` and `message`, both nonempty strings; (a) has an item with `field` `participantId`, (b) has an item with `field` `id`. Database: no Registration rows (none for P1 or P2). |
| TEST-62 | AC-62 | E2E (Playwright), L6-10 #157 | Own E2E database seeded; participant P (seed account) and a PUBLISHED future event E with free places that P is not registered for. One browser context. | Open E's page and note the places text; register P for E through the API from the same context (the open page is now stale); click Register on the open page. | Alert "You are already registered for this event."; the places text then shows one place fewer than before. Red on `04e8590`, where it stays unchanged. |
| TEST-57 | AC-57 | API + DB integration | O; P1; `T` = now + 7 days on a whole minute. A at `T` with an ACTIVE registration for P1 (inserted directly). B at `T + 119 min`, C at `T - 119 min`, D at `T`; all PUBLISHED, capacity 5. Log in as P1. | Register for B, for C and for D; then `GET /api/events/B`. | Each 409, `error.code` `TIME_CONFLICT`, `error.message` is the section 6 text, `error` has exactly `code` and `message`. Database: P1's only ACTIVE row is A. B `remainingPlaces` 5. |
| TEST-58 | AC-58 | API + DB integration | O; P1; A at `T` with an ACTIVE registration for P1. F at `T + 119 min`, B at `T + 120 min`, C at `T - 120 min`; all PUBLISHED, capacity 5. Log in as P1. | Register for F, then B, then C. | F: 409 `TIME_CONFLICT` (one minute inside the boundary). B and C: 201 each. Database: P1 has ACTIVE rows for A, B and C. |
| TEST-59 | AC-59 | API + DB integration | O; P1, P2, P3, P4. A at `T` with an ACTIVE registration for P1. D at `T`, capacity 5. E at `T + 30 min`, capacity 2, ACTIVE for P2 and P3 (full). H started 10 minutes ago with an ACTIVE registration for P1, and S started 30 minutes ago (both inserted directly, D-12). K at now + 60 minutes, capacity 5. Log in as P1 and as P4. | (a) As P4, register for D. (b) As P1, register for A again. (c) As P1, register for E. (d) As P1, register for S. (e) As P1, register for K. | (a) 201: P1's registration at `T` does not count for P4. (b) 409 `ALREADY_REGISTERED`, still one A row. (c) 409 `TIME_CONFLICT` (the pre-change code answers `EVENT_FULL`). (d) 409 `EVENT_STARTED` (step 3 first, although S also conflicts with H). (e) 409 `TIME_CONFLICT`: H has started but P1's registration for it still counts (the pre-change code answers 201). No other new rows. |
| TEST-60 | AC-60 | API + DB integration, concurrent | O; P1; B at `T`, C at `T + 60 min`, both PUBLISHED, capacity 5, no registrations. Log in as P1 once. | Send both registration requests at the same time with `Promise.all`. | One 201 and one 409 `TIME_CONFLICT`. Database: exactly one ACTIVE row for P1 across B and C. Run five times in the L7-04 regression run. |
| TEST-61 | AC-61 | E2E (Playwright), or a manual post-deployment check labelled manual | A seed participant with an ACTIVE registration; a PUBLISHED event that starts 60 minutes after it. | Open the event page and note the places text; press Register. | Alert shows the `TIME_CONFLICT` message of section 6; the places text is unchanged. |

Test names start with their IDs, for example `TEST-13 AC-13 rejects registration when event is full`.
TEST-13 is a TDD sample for the PDF: its failing run is saved as `docs/evidence/tdd/TEST-13-red.txt` and its passing run as `TEST-13-green.txt` (team-workflow).
The UI states of the Register action (NFR-09 error message; system SDS 3.2 submitting and success) are checked by TEST-23 (E2E, Issue 9) for the full-event message and by hand in the 9.4 QA run checklist.
TEST-15 and TEST-37 are each run five times in the 9.4 QA run (issue-plan 9.4).
CR-01 red set (L7-03, #135): TEST-57 to TEST-60 are committed alone and run on the pre-change code (`502d2a6`, `v0.1.3-lab6`). Each fails there on the missing rule (201 where 409 `TIME_CONFLICT` is expected, or `EVENT_FULL` instead of `TIME_CONFLICT`), not on a compile error or a fixture. TEST-58's 120-minute steps and TEST-59's (a), (b) and (d) pass on the old code too, while TEST-59 (c) and (e) fail on it: they guard the boundary and the check order. TEST-61 is written and run in L7-04 (#136). Tests that register one participant for two events must set `startsAt` explicitly: the default fixture start is the same for every event.

## 12. Definition of Done (F-04)
The shared [Sprint 1 Definition of Done](definition-of-done.md) applies. For F-04 in addition:
- TEST-12..TEST-16, TEST-27, TEST-28, TEST-37, TEST-43 and TEST-44 exist, run and pass; none skipped.
- The failing tests are committed before the implementation on `feature/s1-07-register`, and the failing run is saved (TEST-13 in `docs/evidence/tdd/`).
- The registration runs in one transaction that locks the event row first (D-10); no "atomic conditional insert".
- The Register button shows submitting, success and error states.
- PR opened by A, reviewed by B, merged into `sprint-1-staging` with a merge commit.
- CR-01 (Lab 7): TEST-57 to TEST-60 committed and run red on the pre-change code before the implementation commit (L7-03), then green with TEST-61 and the full regression suite (L7-04); TEST-60 run five times.

## 13. Version history
| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-07 | First F-04 contract (Issue #20) | B (stickkersz) | A (songt888) |
| 1.1 | 2026-11-07 | Before the PR: added AC-43/TEST-43 (NFR-01, 401 on registration) and AC-44/TEST-44 (NFR-03, NFR-07, 400 for a `participantId` body or non-UUID `:id`); STS asserts the error shape; sources list completed | B (stickkersz) | A (songt888) |
| 1.2 | 2026-11-07 | Before the PR: error shape allows `details` on 400 `VALIDATION_ERROR` only (system SDS 4.2); TEST-44 asserts `error.code` and no `stack` | B (stickkersz) | A (songt888) |
| 1.3 | 2026-11-07 | Before the PR: AC-43/TEST-43 add unknown-token and expired-session cases (NFR-01); `EVENT_FULL` message matches system SDS 4.2; DoD links the shared `definition-of-done.md` | B (stickkersz) | A (songt888) |
| 1.4 | 2026-11-07 | Review round 1 (PR #54): TEST-44 asserts the full validation envelope: `code`, nonempty `message`, `details` items `{ field, message }` naming `participantId` or `id`, no `stack` (system SDS 4.2) | B (stickkersz) | A (songt888) |
| 1.5 | 2026-11-07 | Review round 2 (PR #54): TEST-16 adds a DRAFT event; an organizer gets 403 `FORBIDDEN` (not 404) before any DRAFT check (D-13); AC-16 wording extended | B (stickkersz) | A (songt888) |
| 1.6 | 2026-11-26 | Lab 6 UAT: AC-62/TEST-62 (enhancement #143): the event reloads after a 409, so the places text is current; UI behavior row extended. Committed before the RED test (L6-10 #157) | A (songt888), with Claude Code | B (stickkersz) |
| 1.7 | 2026-11-27 | Lab 7 CR-01 (#133, #134; `docs/labs/lab-07/change-request.md`): new BR-10 time-conflict rule. Section 2 adds the participant row lock and the `TIME_CONFLICT` check between the duplicate and capacity checks; failure rows, message, API errors and data note; AC-57 to AC-61 and TEST-57 to TEST-61. No existing AC or TEST changes. Review round 1 (PR #185): AC-59 and TEST-59 (e) cover a registration for a started event that still counts, and AC-59 names the started-event precedence (d); the participant lock SQL casts to `uuid`. Committed before the L7-03 red tests | B (stickkersz), with Claude Code | A (songt888) |
| 1.8 | 2026-11-27 | Sprint 2 F-08 (#200, `docs/sprints/sprint-2/f-08-manage-event.md`): `registerForEvent` treats a CANCELLED event like a DRAFT (404 `EVENT_NOT_FOUND`) and rejects a CLOSED event with 409 `EVENT_CLOSED` after `EVENT_STARTED` (D-35 order; F-09 adds `REGISTRATION_CLOSED` next). Planned; implemented in S2-04 | B (stickkersz), with Claude Code | A (songt888) |
