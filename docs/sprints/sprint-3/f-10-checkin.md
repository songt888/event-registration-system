# F-10 Check-in: engineering contract (Sprint 3)

Issue: #206 (S3-01, contract) and #207 (S3-02, implementation, `feature/s3-02-checkin`). Author: B (stickkersz). Reviewer: A (songt888).
Sources: `docs/srs.md` (FR-12, BR-05, BR-08, NFR-01, NFR-03, NFR-07, NFR-09), `docs/features.md` (F-10), `docs/decisions.md` (D-10, D-12, D-13, D-20, D-33, D-34, D-36), `docs/system-sds.md` (sections 1.3, 2.2, 4, 5), `deliverable2-plan.md` sections 1 and 2, the F-05/F-06 contract (`docs/sprints/sprint-1/f-05-f-06-registrations.md`), the F-07 and F-08 contracts (`docs/sprints/sprint-2/`), and the ID agreement on #206 (F-10 uses AC/TEST-110 to 119).

## 1. Linked requirements
| ID | How F-10 covers it |
|---|---|
| FR-12 | The owning organizer records a participant's check-in only for an ACTIVE registration, once, and within the D-36 window. |
| BR-05 | An organizer checks in only registrations of their own events; a participant never checks in. |
| BR-08 | ACTIVE only (409 `REGISTRATION_NOT_ACTIVE`), once (409 `ALREADY_CHECKED_IN`), owner only (403), inside `startsAt - 60 min <= now < startsAt + 6 h` (409 `OUTSIDE_CHECKIN_WINDOW`), as D-36 fixes the window. |
| D-36 | The window, the one-`CheckIn`-per-registration rule, the check order and the F-07 rule that a checked-in registration cannot be cancelled. |
| NFR-01 | The check-in route needs a valid session: 401 `UNAUTHENTICATED` otherwise. |
| NFR-03 | The organizer and the event owner are the session user; the body never names a user, a time or a status. |
| NFR-07 | Inputs are validated server-side; errors use the shared shape of system SDS 4.2 with no stack trace. |
| NFR-09 | The Event registrations screen shows the submitting, success and error states of a check-in. |

## 2. Behavior and workflow
**Check in** (`POST /api/registrations/:id/check-in`):
1. The route runs `requireSession` (401), `requireRole('ORGANIZER')` (403), then validates the UUID and the body (400 `VALIDATION_ERROR`). A participant therefore gets 403 for every registration ID, as on every protected route (system SDS 5.1 check order).
2. The service runs one transaction. It reads the registration's `eventId`; no registration: 404 `NOT_FOUND`.
3. It locks the event row first: `SELECT ... FROM "Event" WHERE id = $1 FOR UPDATE` (D-10), so a check-in, a registration cancel (F-07) and an event cancel (F-08) of the same event run one after the other.
4. The event's owner is not the caller: 403 `FORBIDDEN` (D-36), whatever the event's status.
5. The registration, read again under the lock, is CANCELLED: 409 `REGISTRATION_NOT_ACTIVE`.
6. A `CheckIn` row already exists for the registration: 409 `ALREADY_CHECKED_IN`.
7. `now < startsAt - 60 min` or `now >= startsAt + 6 h`: 409 `OUTSIDE_CHECKIN_WINDOW`. `now` is a parameter of the service function (D-12); the route passes the server time.
8. Insert one `CheckIn` row (`registrationId`, `checkedInAt = now`, `checkedInById = <session user>`) and return 201 with the registration item of section 7. The unique `registrationId` backs step 6: a unique violation from a parallel request is answered 409 `ALREADY_CHECKED_IN`. Any rejection rolls back, so nothing is stored.

The event's status is not a separate check: a CLOSED event keeps its ACTIVE registrations (D-34), so they can be checked in; a CANCELLED event has only CANCELLED registrations (step 5); a DRAFT event has no registrations.

**Effects on other features:**
- F-06 Event registrations `GET /api/events/:id/registrations`: every item gains `checkedInAt` (UTC ISO 8601 instant, or `null` without a check-in). Nothing else in the F-06 payload, order or permissions changes.
- F-07 cancel `POST /api/registrations/:id/cancel`: an owned ACTIVE registration with a `CheckIn` row gets 409 `ALREADY_CHECKED_IN` and stays ACTIVE (D-36). The check runs after the F-07 checks `ALREADY_CANCELLED` and `EVENT_STARTED`, so only a registration checked in during the hour before the start reaches it; after the start F-07 keeps `EVENT_STARTED`.
- F-08 event cancel: unchanged. It cancels every ACTIVE registration of the event (D-34), checked in or not; `CheckIn` rows are never deleted.
- F-11: reads the `CheckIn` rows for attendance (D-37).

## 3. Validation
- Path `:id`: UUID; otherwise 400 `VALIDATION_ERROR`, after the session and role guards and before any query.
- Body: only the empty object `{}`; any field (for example `checkedInAt`, `checkedInById`, `participantId`): 400 `VALIDATION_ERROR` with field `details`.
- Requests use `Content-Type: application/json` (system SDS 4.1); another content type gets 400 `VALIDATION_ERROR`.

## 4. Failure and boundary cases
| Case | Result |
|---|---|
| No, unknown, expired or revoked session | 401 `UNAUTHENTICATED`, nothing stored (AC-117) |
| Caller is a participant, any registration ID (own, foreign or unknown) | 403 `FORBIDDEN`, nothing stored (AC-116) |
| Organizer, unknown registration UUID | 404 `NOT_FOUND` (AC-116) |
| Another organizer's event | 403 `FORBIDDEN`, nothing stored (AC-116) |
| Non-UUID `:id`, a body field, a non-JSON request | 400 `VALIDATION_ERROR` (AC-116) |
| `now = startsAt - 60 min` | 201 (AC-112) |
| `now` one millisecond before `startsAt - 60 min` | 409 `OUTSIDE_CHECKIN_WINDOW` (AC-112) |
| `now` one millisecond before `startsAt + 6 h` | 201 (AC-112) |
| `now = startsAt + 6 h` | 409 `OUTSIDE_CHECKIN_WINDOW` (AC-112) |
| CANCELLED registration (by the participant, F-07, or by an event cancel, F-08), inside or outside the window | 409 `REGISTRATION_NOT_ACTIVE` (AC-113) |
| Second check-in of the same registration, inside or outside the window | 409 `ALREADY_CHECKED_IN`, still one `CheckIn` row, `checkedInAt` unchanged (AC-114) |
| Two check-ins of the same registration at the same time | one 201, one 409 `ALREADY_CHECKED_IN`, one `CheckIn` row (AC-115) |
| Registration of a CLOSED event, inside the window | 201 (AC-110) |
| Participant cancels their checked-in registration before the start | 409 `ALREADY_CHECKED_IN`, registration still ACTIVE (AC-118) |
| Unexpected failure | 500 `INTERNAL_ERROR`, no stack trace |

When several rules fail at once, the first failing step in section 2 decides the code: a CANCELLED registration outside the window gets `REGISTRATION_NOT_ACTIVE`, and a repeat outside the window gets `ALREADY_CHECKED_IN`.

## 5. Permissions
| Operation | Anon | Participant | Organizer (owner of the event) | Organizer (other) |
|---|---|---|---|---|
| `POST /api/registrations/:id/check-in` | 401 | 403 | allowed by section 2 | 403 (404 only for an unknown ID) |

Identity and ownership come only from the session (NFR-03). The UI hides the Check in button where it cannot be used, but the API decides.

## 6. UI behavior
| Screen | Route | Behavior |
|---|---|---|
| Event registrations (F-06 screen) | `/organizer/events/:id/registrations` | A new column "Check-in". An ACTIVE row without a check-in shows a **Check in** button; a checked-in row shows "Checked in" and the time in local time; a CANCELLED row shows nothing. The button is shown whatever the time, so the API decides the window and its message is shown. It is disabled while its request is pending. On 201 the list reloads from the API; on an error the API `error.message` is shown in an alert and the row is not shown as checked in. 401 redirects to `/login` (system SDS 3.2). |

API `error.message` values:
| Code | `error.message` |
|---|---|
| `REGISTRATION_NOT_ACTIVE` | "Only an active registration can be checked in." |
| `ALREADY_CHECKED_IN` | "This participant is already checked in." (on check-in; F-07 cancel uses "A checked-in registration cannot be cancelled.") |
| `OUTSIDE_CHECKIN_WINDOW` | "Check-in is open from 60 minutes before the start until 6 hours after it." |
| `NOT_FOUND` | "Registration not found." (existing) |
| `FORBIDDEN` | "You do not have access to this." (existing) |

## 7. API
### `POST /api/registrations/:id/check-in`
- Auth: session, role ORGANIZER, owner of the registration's event.
- Request: path `:id` (registration UUID); body `{}`.
- Response 201:
```json
{
  "registration": {
    "id": "7a2d4c10-0000-4000-8000-000000000002",
    "status": "ACTIVE",
    "createdAt": "2026-11-10T08:15:00.000Z",
    "checkedInAt": "2026-11-20T08:40:00.000Z",
    "participant": { "name": "Participant One", "email": "participant1@example.com" }
  }
}
```
- The item is the F-06 roster item plus `checkedInAt`. `participant` has only `name` and `email`; `checkedInById` is not returned.
- Errors: 400 `VALIDATION_ERROR`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `REGISTRATION_NOT_ACTIVE`, `ALREADY_CHECKED_IN`, `OUTSIDE_CHECKIN_WINDOW`; 500 `INTERNAL_ERROR`.

### `GET /api/events/:id/registrations` (F-06, extended)
- Every item has `checkedInAt` (UTC ISO 8601 instant or `null`) after `createdAt`. Example item: `{ "id": "...", "status": "ACTIVE", "createdAt": "...", "checkedInAt": null, "participant": { "name": "...", "email": "..." } }`.

### `POST /api/registrations/:id/cancel` (F-07, extended)
- New error: 409 `ALREADY_CHECKED_IN` for an owned ACTIVE registration that has a `CheckIn` row, checked after `ALREADY_CANCELLED` and `EVENT_STARTED`.

New codes for system SDS 4.2 (409): `REGISTRATION_NOT_ACTIVE`, `ALREADY_CHECKED_IN`, `OUTSIDE_CHECKIN_WINDOW`.

## 8. Data
- New table `CheckIn`, added by one additive migration (D-20) in the S3-02 green commit: `id` UUID primary key; `registrationId` UUID, unique, foreign key to `Registration` (`ON DELETE RESTRICT`); `checkedInAt` timestamptz, not null (set from the service `now`, never from the client); `checkedInById` UUID, foreign key to `User` (`ON DELETE RESTRICT`), the organizer who checked in. No column of an existing table changes.
- The unique `registrationId` gives one `CheckIn` per registration (D-36) also under concurrent requests.
- Rows are never deleted. Existing registrations get no `CheckIn` row from the migration; nothing is migrated or reset in production (D-20).
- The red tests create check-ins only through the API, never by inserting `CheckIn` rows, so they run on the code before the migration.

## 9. Dependencies on other contracts
- F-01: `requireSession`, `requireRole`, the error handler.
- F-04: registrations exist through `POST /api/events/:id/registrations`.
- F-06: the Event registrations screen and its roster payload, extended with `checkedInAt` (section 7). TEST-19 compares roster items exactly, so its expected items gain `checkedInAt: null` in the S3-02 green commit, as a recorded revision of the F-06 payload.
- F-07 (A): the meaning of CANCELLED and the cancel route that gains 409 `ALREADY_CHECKED_IN` (section 2).
- F-08: event cancel turns the event's ACTIVE registrations into CANCELLED (D-34); CLOSED events keep ACTIVE registrations.
- F-11: reads `CheckIn` for attendance counts (D-37).
- `deliverable2-plan.md` section 2: S3-02 starts after S2-03 (F-07) and S2-04 (F-08) are merged, on `feature/s3-02-checkin` from `sprint-3-staging`.

## 10. Acceptance criteria
- **AC-110** The owner checks in an ACTIVE registration of their PUBLISHED event and of their CLOSED event inside the window: 201 with the section 7 item; exactly one `CheckIn` row with `checkedInAt` = the service time and `checkedInById` = the owner; the owner's roster shows that `checkedInAt` and `null` for the other rows.
- **AC-111** Through the API, with the event's `startsAt` set from the real clock: 59 minutes after now (201), 61 minutes after now (409 `OUTSIDE_CHECKIN_WINDOW`), 5 hours 59 minutes before now (201), 6 hours 1 minute before now (409 `OUTSIDE_CHECKIN_WINDOW`); a refusal stores no `CheckIn` row.
- **AC-112** With a fixed service time: `now = startsAt - 60 min` and `now = startsAt + 6 h - 1 ms` are accepted; `now = startsAt - 60 min - 1 ms` and `now = startsAt + 6 h` get 409 `OUTSIDE_CHECKIN_WINDOW`.
- **AC-113** A registration cancelled by its participant (F-07) and one cancelled by an event cancel (F-08) get 409 `REGISTRATION_NOT_ACTIVE`, inside and outside the window; no `CheckIn` row is stored.
- **AC-114** A second check-in of a checked-in registration gets 409 `ALREADY_CHECKED_IN`, inside and outside the window; there is still one `CheckIn` row and its `checkedInAt` is unchanged.
- **AC-115** Two check-ins of the same registration sent at the same time give one 201 and one 409 `ALREADY_CHECKED_IN`, and leave one `CheckIn` row.
- **AC-116** A participant gets 403 `FORBIDDEN` for their own registration, another participant's and an unknown ID; another organizer gets 403 `FORBIDDEN` for a registration of the owner's event; an organizer gets 404 `NOT_FOUND` for an unknown UUID; a non-UUID `:id`, a body `{ "checkedInAt": ... }` and a `text/plain` request get 400 `VALIDATION_ERROR`; nothing is stored.
- **AC-117** The route gives 401 `UNAUTHENTICATED` with no cookie, an unknown token, an expired session and a logged-out session; nothing is stored.
- **AC-118** A participant cancelling their own ACTIVE registration that was checked in before the start gets 409 `ALREADY_CHECKED_IN` with the F-07 message; the registration stays ACTIVE and the `CheckIn` row stays.
- **AC-119** In the UI the owner opens Event registrations of an event that starts within the hour and presses Check in: the row shows "Checked in" with the time, also after a reload. On an event that starts in 7 days, Check in shows the `OUTSIDE_CHECKIN_WINDOW` message and the row keeps its Check in button.

## 11. Software test specification (STS)
API tests use Vitest and Supertest on the real PostgreSQL test database (`DATABASE_URL_TEST`, D-14). Every error case asserts the status, the shared shape with `code` and `message` only (plus `details` for 400 `VALIDATION_ERROR`), the section 6 message, and counts the `CheckIn` rows before and after. Fixtures: organizer O (owner), organizer O2, participants P1 to P3; registrations and cancels are made through the API (F-04, F-07, F-08); events whose `startsAt` must be near or before now are inserted directly in the database, because F-02 accepts only a future start.

| TEST | AC | Level | Inputs and preconditions | Expected result |
|---|---|---|---|---|
| TEST-110 | AC-110 | API + DB | O's PUBLISHED event E at now + 30 min with P1, P2 ACTIVE; O's CLOSED event C at now + 30 min with P3 ACTIVE; O checks in P1 on E and P3 on C; O reads E's roster | 201 twice with the section 7 item; one `CheckIn` row each with `checkedInById` O; roster: P1 `checkedInAt` set, P2 `null` |
| TEST-111 | AC-111 | API + DB | four O events with one ACTIVE registration each, `startsAt` = now + 59 min, now + 61 min, now - 5 h 59 min, now - 6 h 1 min; O checks in each | 201, 409 `OUTSIDE_CHECKIN_WINDOW`, 201, 409 `OUTSIDE_CHECKIN_WINDOW`; no row for the two refusals |
| TEST-112 | AC-112 | Service unit + DB | one ACTIVE registration per case; the check-in service called with `now` = `startsAt - 60 min`, `startsAt + 6 h - 1 ms`, `startsAt - 60 min - 1 ms`, `startsAt + 6 h` | accepted, accepted, `OUTSIDE_CHECKIN_WINDOW`, `OUTSIDE_CHECKIN_WINDOW` |
| TEST-113 | AC-113 | API + DB | event at now + 30 min: P1 registers then cancels (F-07); event at now + 30 min: P2 registers, O cancels the event (F-08); event at now + 7 days: P3 registers then cancels; O checks in each | 409 `REGISTRATION_NOT_ACTIVE` three times; no `CheckIn` row |
| TEST-114 | AC-114 | API + DB | event at now + 30 min, P1 checked in by O; O checks in again; event at now - 7 h (inserted) whose registration has a check-in made inside the window through the service with a fixed `now`; O checks in again through the API | 409 `ALREADY_CHECKED_IN` twice; one `CheckIn` row each, `checkedInAt` unchanged |
| TEST-115 | AC-115 | API + DB, concurrent | event at now + 30 min, P1 ACTIVE; `Promise.all` of two check-ins by O; run 5 times on new registrations | each run: one 201, one 409 `ALREADY_CHECKED_IN`; one `CheckIn` row |
| TEST-116 | AC-116 | API + DB | P1 checks in their own registration, P2's and a random UUID; O2 checks in P1's registration on O's event; O checks in a random UUID; O sends `not-a-uuid`, a body `{ "checkedInAt": "2026-01-01T00:00:00Z" }` and a `text/plain` body | P1: 403 ×3; O2: 403; O: 404 `NOT_FOUND`; 400 `VALIDATION_ERROR` ×3 with `details` where applicable; no `CheckIn` row |
| TEST-117 | AC-117 | API | the route with no cookie, a random token, an expired session and a logged-out session, on a valid registration of an event inside the window | 401 `UNAUTHENTICATED` four times; no `CheckIn` row |
| TEST-118 | AC-118 | API + DB | event at now + 30 min, P1 registers, O checks P1 in; P1 calls `POST /api/registrations/:id/cancel` | 409 `ALREADY_CHECKED_IN` with "A checked-in registration cannot be cancelled."; registration ACTIVE; `CheckIn` row present |
| TEST-119 | AC-119 | E2E | Organizer One creates and publishes an event at now + 30 min and one at now + 7 days through the API; Participant One registers for both; Organizer One opens Event registrations of each and presses Check in | first event: "Checked in" with the time, still after a reload; second event: alert with the `OUTSIDE_CHECKIN_WINDOW` message, Check in still shown |

Red: TEST-110, TEST-111, TEST-113 to TEST-118 (API) and TEST-119 (E2E) are committed alone on `feature/s3-02-checkin-red` and run on the code before F-10, so they fail on the missing route (404) or the missing `ALREADY_CHECKED_IN` code, never on a compile, import or fixture error. TEST-112 calls the check-in service with a fixed `now` (D-12), a function that exists only after the implementation, so it is added in the green commit; TEST-111 is the red evidence for the window. TEST-114's second case needs that service too and is also added in the green commit; its first case is red. TEST-115 runs 5 times.

## 12. Definition of Done (F-10)
- This contract reviewed by A and merged into `sprint-3-staging` before the F-10 red commit (#206).
- Red PR into `feature/s3-02-checkin`, reviewed and approved by A (the student, not an agent; plan section 2), with the failing output recorded on the red commit; then the green PR into `sprint-3-staging`, reviewed by A, with `test-and-docker` and `e2e` passing.
- All AC-110 to AC-119 pass; the full `npm test` and `npm run test:e2e` pass with counts and the tested commit recorded; TEST-115 runs 5 times.
- Sprint 1, Lab 7 and Sprint 2 tests still pass; TEST-19 changes only by the `checkedInAt: null` field of section 7.
- The `CheckIn` migration is additive (D-20) and `prisma migrate dev` reports no drift and keeps the ACTIVE partial index.
- Traceability rows for FR-12, BR-08 and AC-110 to AC-119 filled with the actual test and result.

## 13. Version history
| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-28 | First F-10 contract (#206): check-in route, D-36 window and check order, `CheckIn` table, roster `checkedInAt`, F-07 cancel refusal for a checked-in registration, UI on Event registrations; AC-110 to AC-119, TEST-110 to TEST-119 | B (stickkersz), drafted with Claude Code | A (songt888) on the PR |
