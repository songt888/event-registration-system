# F-04 Register for an event: engineering contract (Sprint 1)

Issue: #20 (sub-task 2.4 of Issue 2). Implementation: Issue 7 (`feature/s1-07-register`): B writes the failing tests (7.1, #32), A writes the implementation and UI (7.2, #33).
Author: B (stickkersz). Reviewer: A (songt888).
Sources: `docs/srs.md` (FR-06, BR-02, BR-03, BR-04, NFR-04, NFR-07, NFR-09), `docs/decisions.md` (D-02, D-03, D-04, D-10, D-12, D-13, D-14), `docs/system-sds.md` (sections 1.3, 2.1, 3, 4, 5, 9), `deliverable1-plan.md` section 5.

## 1. Linked requirements
| ID | How F-04 covers it |
|---|---|
| FR-06 | A participant registers for a PUBLISHED event that has not started. One ACTIVE registration is stored and `remainingPlaces` goes down by one. Full, duplicate, DRAFT or missing, and started-event requests store nothing. |
| BR-02 | ACTIVE registrations never exceed `capacity`, also for parallel requests for the last place. One transaction locks the event row before any check (D-10). |
| BR-03 | One ACTIVE registration per participant per event: service check inside the transaction, plus the partial unique index from Issue 3 (D-02). |
| BR-04 | Only a PUBLISHED event with `startsAt` strictly later than now is registrable; `startsAt` equal to now counts as started (D-04, D-12). |
| NFR-04 | 20 parallel registration requests from 20 different participants for a capacity-5 event store exactly 5 ACTIVE registrations (AC-37). |
| NFR-07 | Errors use the shared shape `{ "error": { "code", "message" } }`; no stack trace. |
| NFR-09 | On the Event detail screen (one of the five NFR-09 screens) a registration rejected with 409 shows the API `error.message` readably; 403, 404, submitting and success states follow system SDS 3.2. |
| D-13 | Organizer: 403 `FORBIDDEN`. DRAFT or missing event: 404 `EVENT_NOT_FOUND`. Started event: 409 `EVENT_STARTED`. |

## 2. Behavior and workflow
1. A signed-in participant opens `/events/:id` (F-03 screen) and presses Register.
2. The UI calls `POST /api/events/:id/registrations`. It sends no user ID: the participant is always the session user.
3. The route runs `requireSession` (401), then `requireRole('PARTICIPANT')` (403). An organizer gets 403 for every event ID, so the check order of D-13 holds.
4. The service runs one database transaction, in this order (D-10):
   1. Lock the event row: `SELECT ... FROM "Event" WHERE id = $1 FOR UPDATE` (Prisma `$queryRaw` inside `$transaction`).
   2. No row, or status is not `PUBLISHED`: 404 `EVENT_NOT_FOUND`.
   3. `startsAt <= now`: 409 `EVENT_STARTED`. `now` is a parameter of the service function; the route passes `new Date()` (D-12).
   4. The participant already has an ACTIVE registration for this event: 409 `ALREADY_REGISTERED`.
   5. Count ACTIVE registrations of the event. Count `>= capacity`: 409 `EVENT_FULL`.
   6. Insert the registration with status `ACTIVE` and return 201.
5. Commit releases the lock. Any rejection rolls back, so nothing is stored.
6. If the insert still hits the partial unique index (Prisma error `P2002`), the service returns 409 `ALREADY_REGISTERED`. With the row lock this should not happen; the index is only a backstop (D-10).
7. The UI shows the result and reloads the event, so the screen shows the new `remainingPlaces` from the API.

Because the event row is locked first, a second request for the same event waits until the first commits, then counts the committed rows. Two requests can never both see the last free place.

## 3. Validation
- Path parameter `:id` must be a UUID; otherwise 400 `VALIDATION_ERROR` (system SDS 4.1, 4.2), checked after the session and role guards and before any query.
- Request body: an empty JSON object `{}` sent with `Content-Type: application/json`; any field (for example `participantId`) is rejected with 400 `VALIDATION_ERROR` (system SDS 4.1, unknown fields rejected). The service never reads a participant ID from the request.
- State-changing request rules of system SDS 4.1 apply (`POST` with `Content-Type: application/json`).

## 4. Failure and boundary cases
| Case | Result |
|---|---|
| No session, expired or revoked session | 401 `UNAUTHENTICATED` from `requireSession` (F-01 contract); not re-tested in F-04 |
| Caller is an organizer (owner or not, any event ID) | 403 `FORBIDDEN`, nothing stored (AC-16) |
| Event ID unknown or event is DRAFT | 404 `EVENT_NOT_FOUND`, nothing stored (AC-27) |
| `:id` not a UUID | 400 `VALIDATION_ERROR`, nothing stored |
| Event PUBLISHED but `startsAt` in the past | 409 `EVENT_STARTED`, nothing stored (AC-28) |
| `startsAt` exactly equal to `now` (boundary) | 409 `EVENT_STARTED` (AC-28, BR-04) |
| Participant already has an ACTIVE registration for the event | 409 `ALREADY_REGISTERED`, still one row (AC-14) |
| ACTIVE count equals `capacity` | 409 `EVENT_FULL`, nothing stored (AC-13) |
| One place left (`capacity - 1` ACTIVE) | the request succeeds; the event is then full (AC-12, AC-15) |
| Several requests at once for the last place | exactly one 201, the others 409 `EVENT_FULL` (AC-15) |
| 20 parallel requests, capacity 5, no prior registrations | exactly five 201, fifteen 409 `EVENT_FULL` (AC-37) |
| A body with any field | 400 `VALIDATION_ERROR`, nothing stored |
| Unexpected server or database failure | 500 `INTERNAL_ERROR`, generic message, no stack trace (NFR-07) |

When several rules fail at once, the first failing step in section 2 decides the code: a participant who is already registered for a full event gets `ALREADY_REGISTERED`; a full event that has started gets `EVENT_STARTED`.

## 5. Permissions
| Operation | Anon | Participant | Organizer (owner) | Organizer (other) |
|---|---|---|---|---|
| `POST /api/events/:id/registrations` | 401 | allowed if BR-02..BR-04 hold | 403 | 403 |

Identity comes only from the session cookie (NFR-03). The new registration's `participantId` is always the session user's ID.

## 6. UI behavior
| Screen | Route | Behavior |
|---|---|---|
| Event detail | `/events/:id` | The Register button is shown only to participants (from `GET /api/me`) and only for a PUBLISHED event. It stays enabled when the event shows "Full", so the server rule decides and its message is shown (AC-23). Submitting: the button is disabled while the request is pending. Success: "You are registered for this event." and the event reloads from the API. Error: the API `error.message` in an alert; 401 redirects to `/login`; 403 shows "You do not have access to this"; 404 shows "Not found" (system SDS 3.2). |

API `error.message` values (the UI shows them for 409; 403 and 404 follow system SDS 3.2):
| Code | `error.message` |
|---|---|
| `EVENT_FULL` | "This event is full." |
| `ALREADY_REGISTERED` | "You are already registered for this event." |
| `EVENT_STARTED` | "This event has already started." |
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
- Errors: 400 `VALIDATION_ERROR`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `EVENT_NOT_FOUND`; 409 `EVENT_STARTED`, `ALREADY_REGISTERED`, `EVENT_FULL`; 500 `INTERNAL_ERROR`. Shape as in system SDS 4.2.

## 8. Data
- No schema change and no migration. F-04 writes `Registration` (`id`, `eventId`, `participantId`, `status`, `createdAt`) as created in Issue 3.
- Relies on the partial unique index `(eventId, participantId) WHERE status = 'ACTIVE'` and the `capacity` CHECK 1..10000 from the Issue 3 migration (system SDS 2.3).
- The seed planned in system SDS 2.3 (Issue 3) has one PUBLISHED event with capacity 2 and one ACTIVE registration, for the full-event demo and TEST-23; no seed change.

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
| AC-16 | An organizer (owner or not) registering for an event returns 403 `FORBIDDEN` and stores no row. | FR-06, D-13 |
| AC-27 | Registering for a DRAFT event or an unknown event ID returns 404 `EVENT_NOT_FOUND` and stores no row. | FR-06, BR-04, D-13 |
| AC-28 | Registering for a PUBLISHED event whose `startsAt` is in the past returns 409 `EVENT_STARTED` and stores no row; `startsAt` equal to `now` is also rejected as started. | FR-06, BR-04, D-12 |
| AC-37 | For 20 different participants sending registration requests at the same time to a PUBLISHED, future event with capacity 5 and no registrations, exactly 5 requests get 201, 15 get 409 `EVENT_FULL`, and exactly 5 ACTIVE registrations are stored. | NFR-04, BR-02 |

TEST-37 is already named as the NFR-04 verification in `docs/srs.md` (NFR-04, BR-02), `docs/system-sds.md` (sections 9 and 11) and `deliverable1-plan.md` section 3, which says it is "specified in the F-04 contract, #20"; this contract defines AC-37 with the same number. No other new AC is added.

## 11. Software test specification (STS)
All API tests below are API + DB integration tests (Vitest + Supertest, `DATABASE_URL_TEST`, tables truncated in `beforeEach`, D-14). Fixtures are inserted directly in the database; "log in" means `POST /api/auth/login` with the fixture's password. Every `POST` in these tests sends `{}` as JSON.

| TEST | AC | Level | Setup | Steps | Expected |
|---|---|---|---|---|---|
| TEST-12 | AC-12 | API + DB integration | Organizer O; participant P1; event E PUBLISHED, capacity 3, `startsAt` now + 7 days, no registrations. Log in as P1. | `POST /api/events/E/registrations`; then `GET /api/events/E`. | 201; `registration.status` `ACTIVE`, `registration.eventId` E; `remainingPlaces` 2. Database: exactly one Registration for (E, P1), status ACTIVE. Detail shows `remainingPlaces` 2. |
| TEST-13 | AC-13 | API + DB integration | O; participants P1, P2, P3; E PUBLISHED, capacity 2, future, ACTIVE registrations for P1 and P2. Log in as P3. | `POST /api/events/E/registrations`. | 409, `error.code` `EVENT_FULL`. Database: still 2 Registrations for E, none for P3. |
| TEST-14 | AC-14 | API + DB integration | O; P1; E PUBLISHED, capacity 5, future. Log in as P1. | (a) Register for E twice. (b) Insert a second ACTIVE Registration for (E, P1) directly with Prisma. | (a) first 201, second 409 `ALREADY_REGISTERED`; one ACTIVE row for (E, P1). (b) the insert throws a unique violation (Prisma `P2002`); still one ACTIVE row. |
| TEST-15 | AC-15 | API + DB integration, concurrent | O; participants P1..P12; E PUBLISHED, capacity 3, future, ACTIVE registrations for P1 and P2 (one place left). Log in P3..P12 one by one first, keeping each cookie. | Send the 10 registration requests (P3..P12) at the same time with `Promise.all`, all inside one test. | Exactly one 201 and nine 409 `EVENT_FULL`. Database: exactly 3 ACTIVE Registrations for E. |
| TEST-16 | AC-16 | API + DB integration | Organizers O (owner) and O2; E PUBLISHED, capacity 5, future, owned by O. | Log in as O, `POST /api/events/E/registrations`; log in as O2, same request; as O2, the same request with a random UUID. | All three 403 `FORBIDDEN`. Database: no Registration rows. |
| TEST-27 | AC-27 | API + DB integration | O; P1; D DRAFT owned by O, capacity 5, future. Log in as P1. | Register for D; for a random UUID. | Both 404 `EVENT_NOT_FOUND`. Database: no Registration rows. |
| TEST-28 | AC-28 | API + DB integration and unit | O; P1; S PUBLISHED, capacity 5, `startsAt` now minus 1 hour (inserted directly, D-12). Log in as P1. Unit case: no database. | Register for S. Unit case: call the service's eligibility check with a fixed `now` equal to the event's `startsAt`. | API: 409 `EVENT_STARTED`; no Registration rows. Unit: rejected with `EVENT_STARTED`. |
| TEST-37 | AC-37 | API + DB integration, concurrent | O; participants P1..P20; E PUBLISHED, capacity 5, future, no registrations. Log in P1..P20 one by one first, keeping each cookie. | Send the 20 registration requests at the same time with `Promise.all`, all inside one test. | Exactly five 201 and fifteen 409 `EVENT_FULL`. Database: exactly 5 ACTIVE Registrations for E, from 5 different participants. |

Test names start with their IDs, for example `TEST-13 AC-13 rejects registration when event is full`.
TEST-13 is a TDD sample for the PDF: its failing run is saved as `docs/evidence/tdd/TEST-13-red.txt` and its passing run as `TEST-13-green.txt` (team-workflow).
The UI states of the Register action (NFR-09 error message; system SDS 3.2 submitting and success) are checked by TEST-23 (E2E, Issue 9) for the full-event message and by hand in the 9.4 QA run checklist.
TEST-15 and TEST-37 are each run five times in the 9.4 QA run (issue-plan 9.4).

## 12. Definition of Done (F-04)
The Sprint 1 Definition of Done (F-01 contract, #17) applies. For F-04 in addition:
- TEST-12..TEST-16, TEST-27, TEST-28 and TEST-37 exist, run and pass; none skipped.
- The failing tests are committed before the implementation on `feature/s1-07-register`, and the failing run is saved (TEST-13 in `docs/evidence/tdd/`).
- The registration runs in one transaction that locks the event row first (D-10); no "atomic conditional insert".
- The Register button shows submitting, success and error states.
- PR opened by A, reviewed by B, merged into `sprint-1-staging` with a merge commit.

## 13. Version history
| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-07 | First F-04 contract (Issue #20) | B (stickkersz) | A (songt888) |
