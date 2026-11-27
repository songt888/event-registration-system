# F-08 Manage event: engineering contract (Sprint 2)

Issue: #200 (S2-01, contract) and #203 (S2-04, implementation, `feature/s2-04-manage-event`). Author: B (stickkersz). Reviewer: A (songt888).
Sources: `docs/srs.md` (FR-10, BR-01, BR-02, BR-05, NFR-01, NFR-03, NFR-07, NFR-09), `docs/features.md` (F-08), `docs/decisions.md` (D-03, D-07, D-10, D-12, D-13, D-20, D-34, D-35), `docs/system-sds.md` (sections 1.3, 2, 3, 4), `deliverable2-plan.md` sections 1 and 2, and the precedence and ID agreement on #200.
Rules marked **(#200)** are the gaps D-34 left open, proposed on #200 on 2026-11-27. They are added to D-34 when A agrees in the review of this contract.

## 1. Linked requirements
| ID | How F-08 covers it |
|---|---|
| FR-10 | The owning organizer edits an event, closes it or cancels it. A capacity below the ACTIVE count is rejected. |
| BR-01 | Only an ORGANIZER manages events. An edited capacity stays an integer from 1 to 10,000. |
| BR-02 | ACTIVE registrations never exceed capacity, also when a capacity change and a registration run at the same time: the capacity check runs under the event row lock (D-10). |
| BR-05 | An organizer manages only their own events. A participant or another organizer is refused before anything changes (D-13). |
| D-03 | A capacity change after publish is allowed, never below the ACTIVE count. |
| D-34 | The lifecycle DRAFT → PUBLISHED → CLOSED, and DRAFT, PUBLISHED or CLOSED → CANCELLED; CANCELLED is final, CLOSED cannot reopen. `startsAt` changes only while the event has no ACTIVE registration. |
| NFR-01 | The three F-08 routes need a valid session: 401 `UNAUTHENTICATED` otherwise. |
| NFR-03 | The owner is always the session user; a body never names an owner or a status. |
| NFR-07 | Inputs are validated server-side; errors use the shared shape of system SDS 4.2 with no stack trace. |
| NFR-09 | My events and the Edit event screen show loading, error, submitting and success states; field errors are linked to their fields as in AC-64. |

## 2. Behavior and workflow
States and the operations that move between them:

| From | Edit | Close | Cancel | Publish (F-02) |
|---|---|---|---|---|
| DRAFT | allowed | 409 `EVENT_NOT_PUBLISHED` | → CANCELLED | → PUBLISHED |
| PUBLISHED | allowed while not started | → CLOSED | → CANCELLED while not started | 409 `ALREADY_PUBLISHED` |
| CLOSED | 409 `EVENT_NOT_EDITABLE` | 409 `ALREADY_CLOSED` | → CANCELLED while not started | 409 `ALREADY_PUBLISHED` |
| CANCELLED | 409 `EVENT_NOT_EDITABLE` | 409 `EVENT_NOT_PUBLISHED` | 409 `ALREADY_CANCELLED` | 409 `EVENT_NOT_EDITABLE` **(#200)** |

**Edit** (`PATCH /api/events/:id`):
1. The route runs `requireSession` (401), `requireRole('ORGANIZER')` (403), then validates the UUID and the body (400 `VALIDATION_ERROR`).
2. The service runs one transaction. It locks the event row first: `SELECT ... FROM "Event" WHERE id = $1 FOR UPDATE` (D-10).
3. No row, or the event is a DRAFT or CANCELLED event of another organizer: 404 `EVENT_NOT_FOUND`. Another organizer's PUBLISHED or CLOSED event: 403 `FORBIDDEN` (D-13).
4. `startsAt <= now` (stored value): 409 `EVENT_STARTED`. `now` is a parameter of the service function (D-12).
5. Status CLOSED or CANCELLED: 409 `EVENT_NOT_EDITABLE` **(#200)**.
6. The body sends a `startsAt` different from the stored value while the event has at least one ACTIVE registration: 409 `EVENT_HAS_REGISTRATIONS` (D-34). Sending the stored value again is not a change.
7. A changed `startsAt` must be strictly later than now: otherwise 400 `INVALID_START_TIME` (D-12).
8. Deadline rules belong to F-09 (D-35): a sent `registrationDeadline` is checked there, and when `startsAt` changes, the stored deadline must still be at or before the new start **(#200)**; failures are 400 `INVALID_DEADLINE`.
9. A sent `capacity` lower than the count of ACTIVE registrations: 409 `CAPACITY_BELOW_ACTIVE`. Equal to the count is allowed.
10. Update only the fields sent and return 200 with the event payload. Any rejection rolls back, so nothing changes.

**Close** (`POST /api/events/:id/close`): the same guards and ownership checks (steps 1 to 3), then: CLOSED → 409 `ALREADY_CLOSED`; DRAFT or CANCELLED → 409 `EVENT_NOT_PUBLISHED` **(#200)**; otherwise status CLOSED and 200. Closing is allowed after the start, because it only stops further registration. Existing registrations stay ACTIVE.

**Cancel** (`POST /api/events/:id/cancel`): the same guards and ownership checks, then: CANCELLED → 409 `ALREADY_CANCELLED`; `startsAt <= now` → 409 `EVENT_STARTED` **(#200)**; otherwise, in the same transaction, set the event to CANCELLED and every ACTIVE registration of the event to CANCELLED with `cancelledAt = now` (D-34, column from S2-02, meaning from F-07), then 200.

**Effects on other features:**
- F-03 list `GET /api/events`: PUBLISHED and CLOSED events, each with its status; CANCELLED and DRAFT events are not listed.
- F-02/F-03 detail `GET /api/events/:id`: a CLOSED event is visible to every signed-in user; a CANCELLED event only to its owner (404 `EVENT_NOT_FOUND` for everyone else, like a DRAFT).
- F-02 My events: all four statuses.
- F-04 registration: CANCELLED → 404 `EVENT_NOT_FOUND` (same as a DRAFT); CLOSED → 409 `EVENT_CLOSED`, at the place D-35 gives it (after `EVENT_STARTED`, before `REGISTRATION_CLOSED`).
- F-05/F-06: registrations cancelled by an event cancel show status CANCELLED to the participant and in the owner's roster; a non-owner gets 404 for the roster of a CANCELLED event, as for a DRAFT.

Lock order: the event row is always locked first (D-10). An edit or cancel and a registration for the same event therefore run one after the other, so a capacity cut cannot slip under a registration, and a registration cannot land on an event that was just cancelled (AC-92, AC-101).

## 3. Validation
- Path `:id`: UUID; otherwise 400 `VALIDATION_ERROR`, after the session and role guards and before any query.
- `PATCH` body: a JSON object with at least one of `title` (string, trimmed, 1..120), `description` (string, 0..2000), `location` (string, trimmed, 1..120), `startsAt` (ISO 8601 date-time with an explicit zone, normalized to UTC), `capacity` (JSON integer 1..10000), `registrationDeadline` (F-09: ISO 8601 date-time with a zone, or `null`). These are the create rules of F-02. An empty object, an unknown field (for example `status`, `ownerId`, `publishedAt`), a wrong type or a malformed value: 400 `VALIDATION_ERROR` with field `details`.
- Close and cancel accept only the empty object `{}`; any field: 400 `VALIDATION_ERROR`.
- Requests use `Content-Type: application/json` (system SDS 4.1). `PATCH` is added to the state-changing methods of system SDS 4.1 for this route.

## 4. Failure and boundary cases
| Case | Result |
|---|---|
| No, unknown, expired or revoked session on any F-08 route | 401 `UNAUTHENTICATED`, nothing changes (AC-103) |
| Caller is a participant, any event ID | 403 `FORBIDDEN`, nothing changes (AC-102) |
| Another organizer, PUBLISHED or CLOSED event | 403 `FORBIDDEN` (AC-102) |
| Another organizer, DRAFT, CANCELLED or missing event | 404 `EVENT_NOT_FOUND` (AC-102) |
| `capacity` equal to the ACTIVE count | 200 (AC-91) |
| `capacity` one below the ACTIVE count | 409 `CAPACITY_BELOW_ACTIVE`, capacity unchanged (AC-91) |
| Capacity cut and a registration for the last place at the same time | never more ACTIVE rows than the final capacity; exactly one of the two succeeds (AC-92) |
| `startsAt` changed while an ACTIVE registration exists | 409 `EVENT_HAS_REGISTRATIONS` (AC-93) |
| `startsAt` sent equal to the stored value while registrations exist | 200, treated as no change (AC-93) |
| `startsAt` changed to a time equal to now or in the past | 400 `INVALID_START_TIME` (AC-94) |
| Edit of an event that has started | 409 `EVENT_STARTED` (AC-96) |
| Edit of a CLOSED or CANCELLED event | 409 `EVENT_NOT_EDITABLE` (AC-96) |
| Body `{}`, unknown field, bad type or bound | 400 `VALIDATION_ERROR` (AC-95) |
| Close a DRAFT or CANCELLED event | 409 `EVENT_NOT_PUBLISHED` (AC-98) |
| Close a CLOSED event | 409 `ALREADY_CLOSED` (AC-98) |
| Register for a CLOSED event | 409 `EVENT_CLOSED`, nothing stored (AC-97) |
| Cancel a CANCELLED event | 409 `ALREADY_CANCELLED` (AC-100) |
| Cancel an event that has started (`startsAt <= now`) | 409 `EVENT_STARTED` (AC-100) |
| Register for a CANCELLED event | 404 `EVENT_NOT_FOUND`, nothing stored (AC-99) |
| A registration and a cancel at the same time | no ACTIVE registration remains on the CANCELLED event (AC-101) |
| Publish a CANCELLED DRAFT | 409 `EVENT_NOT_EDITABLE` (AC-104) |
| Unexpected failure | 500 `INTERNAL_ERROR`, no stack trace |

When several rules fail at once, the first failing step in section 2 decides the code: for example, a started CLOSED event gets `EVENT_STARTED` on edit, and a cancelled event gets `ALREADY_CANCELLED` on cancel even after its start.

## 5. Permissions
| Operation | Anon | Participant | Organizer (owner) | Organizer (other) |
|---|---|---|---|---|
| `PATCH /api/events/:id` | 401 | 403 | allowed by section 2 | 403 PUBLISHED/CLOSED, 404 DRAFT/CANCELLED/missing |
| `POST /api/events/:id/close` | 401 | 403 | allowed by section 2 | same as above |
| `POST /api/events/:id/cancel` | 401 | 403 | allowed by section 2 | same as above |

Identity and ownership come only from the session (NFR-03). The UI hides controls the caller cannot use, but the API decides.

## 6. UI behavior
| Screen | Route | Behavior |
|---|---|---|
| My events | `/organizer/events` | The status column shows DRAFT, PUBLISHED, CLOSED or CANCELLED. Per row: **Edit** for DRAFT and PUBLISHED events that have not started; **Close** for PUBLISHED events; **Cancel event** for DRAFT, PUBLISHED and CLOSED events that have not started. Cancel event asks for confirmation inside the page (a "Confirm cancel" button next to it), never a browser dialog. Buttons are disabled while their request is pending. On 200 the list reloads from the API; on an error the API `error.message` is shown in an alert and nothing is shown as done. |
| Edit event | `/organizer/events/:id/edit` | The Create event form, filled from `GET /api/events/:id`, sends only the changed fields. Field errors from a 400 appear under their fields with `aria-invalid` and `aria-describedby` (as AC-64); a 409 message appears in an alert; the typed values stay. Start time is entered and shown in local time and sent with its zone (as F-02). On 200 it returns to My events with "Event … saved." |
| Event detail | `/events/:id` | A CLOSED event shows "Registration for this event is closed." and no Register button (F-04 already shows Register only for a PUBLISHED event). A CANCELLED event opened by a non-owner shows "Not found" from the 404. |
| Events list | `/events` | CLOSED events stay listed with a "Closed" label; CANCELLED events are gone. |

API `error.message` values:
| Code | `error.message` |
|---|---|
| `EVENT_NOT_EDITABLE` | "This event can no longer be edited." |
| `EVENT_HAS_REGISTRATIONS` | "The start time cannot change while people are registered." |
| `CAPACITY_BELOW_ACTIVE` | "Capacity cannot be lower than the number of registered participants." |
| `EVENT_NOT_PUBLISHED` | "Only a published event can be closed." |
| `ALREADY_CLOSED` | "This event is already closed." |
| `ALREADY_CANCELLED` | "This event is already cancelled." |
| `EVENT_CLOSED` | "Registration for this event is closed." |
| `EVENT_STARTED` | "This event has already started." (existing) |
| `INVALID_START_TIME` | "The start time must be in the future." (existing) |

## 7. API
### `PATCH /api/events/:id`
- Auth: session, role ORGANIZER, owner only.
- Request: path `:id` (UUID); body with one or more editable fields (section 3), for example `{ "capacity": 40, "title": "Intro to Git (room change)" }`.
- Response 200: the event payload of F-02 (`id`, `title`, `description`, `location`, `startsAt`, `capacity`, `remainingPlaces`, `status`, plus `registrationDeadline` from F-09), read back after the update.
- Errors: 400 `VALIDATION_ERROR`, `INVALID_START_TIME`, `INVALID_DEADLINE`; 401; 403 `FORBIDDEN`; 404 `EVENT_NOT_FOUND`; 409 `EVENT_STARTED`, `EVENT_NOT_EDITABLE`, `EVENT_HAS_REGISTRATIONS`, `CAPACITY_BELOW_ACTIVE`; 500.

### `POST /api/events/:id/close`
- Auth: session, role ORGANIZER, owner only. Body `{}`.
- Response 200: the event payload with `status` `CLOSED`.
- Errors: 400 `VALIDATION_ERROR`; 401; 403; 404 `EVENT_NOT_FOUND`; 409 `ALREADY_CLOSED`, `EVENT_NOT_PUBLISHED`; 500.

### `POST /api/events/:id/cancel`
- Auth: session, role ORGANIZER, owner only. Body `{}`.
- Response 200: the event payload with `status` `CANCELLED` and `remainingPlaces` equal to `capacity` (no ACTIVE registration is left).
- Errors: 400 `VALIDATION_ERROR`; 401; 403; 404 `EVENT_NOT_FOUND`; 409 `ALREADY_CANCELLED`, `EVENT_STARTED`; 500.

New codes for system SDS 4.2 (409): `EVENT_NOT_EDITABLE`, `EVENT_HAS_REGISTRATIONS`, `CAPACITY_BELOW_ACTIVE`, `EVENT_NOT_PUBLISHED`, `ALREADY_CLOSED`, `ALREADY_CANCELLED`, `EVENT_CLOSED`.

## 8. Data
- Uses the S2-02 migration (#201), additive only (D-20): `EventStatus` gains `CLOSED` and `CANCELLED`; `RegistrationStatus` gains `CANCELLED`; `Registration.cancelledAt` (nullable timestamptz). F-08 adds no column of its own: no AC needs a close or cancel time on the event.
- The capacity CHECK 1..10000 and the partial unique index on ACTIVE registrations stay as they are.
- Rows are never deleted: a cancelled event and its cancelled registrations stay for the owner's history and for Sprint 3 attendance.
- Existing events keep their status; nothing is migrated or cancelled by the release.

## 9. Dependencies on other contracts
- F-01: `requireSession`, `requireRole`, the error handler.
- F-02: create, publish, the event payload and My events; publish of a CANCELLED event changes from `ALREADY_PUBLISHED` to `EVENT_NOT_EDITABLE` (AC-104, F-02 revision row in the same PR).
- F-03: the list and detail visibility of CLOSED and CANCELLED events (section 2).
- F-04: `registerForEvent` step 2 becomes: missing, DRAFT or CANCELLED → 404; then `EVENT_STARTED`; then CLOSED → `EVENT_CLOSED` (D-35 order). F-04 gets a revision row in the same PR.
- F-07 (A): the meaning of a CANCELLED registration and `cancelledAt`; event cancel uses the same values.
- F-09 (A): `registrationDeadline` in the PATCH body and its rules, and the deadline re-check when `startsAt` changes.
- F-05: shows CANCELLED registrations; no query change.
- F-06: the roster's visibility check treats CANCELLED like DRAFT (404 for a non-owner, AC-109); F-06 gets a revision row in the same PR.

## 10. Acceptance criteria
- **AC-90** The owner edits title, description and location of their DRAFT and of their PUBLISHED event that has not started; 200, the stored row has the new values, and the fields not sent are unchanged.
- **AC-91** The owner sets capacity to exactly the ACTIVE count (200) and to the ACTIVE count minus 1 (409 `CAPACITY_BELOW_ACTIVE`, capacity unchanged); raising capacity is allowed up to 10000.
- **AC-92** A capacity cut to the current ACTIVE count and a registration for one more place, sent at the same time, never leave more ACTIVE registrations than the final capacity, and exactly one of the two requests succeeds.
- **AC-93** With an ACTIVE registration, a changed `startsAt` gets 409 `EVENT_HAS_REGISTRATIONS` and nothing changes; sending the stored `startsAt` again gets 200; without registrations a new future `startsAt` gets 200.
- **AC-94** A changed `startsAt` equal to now or in the past gets 400 `INVALID_START_TIME` and nothing changes.
- **AC-95** A body `{}`, an unknown field (`status`, `ownerId`), a wrong type, a capacity of 0 or 10001, a title of 121 characters, a non-UUID `:id`, or a non-JSON request gets 400 `VALIDATION_ERROR` and nothing changes.
- **AC-96** Editing an event that has started gets 409 `EVENT_STARTED`; editing a CLOSED or a CANCELLED event gets 409 `EVENT_NOT_EDITABLE`; nothing changes.
- **AC-97** The owner closes their PUBLISHED event: 200 with status CLOSED; it is still in `GET /api/events` with status CLOSED; its ACTIVE registrations are unchanged; a new registration gets 409 `EVENT_CLOSED` and nothing is stored.
- **AC-98** Closing a DRAFT or a CANCELLED event gets 409 `EVENT_NOT_PUBLISHED`; closing a CLOSED event gets 409 `ALREADY_CLOSED`; nothing changes.
- **AC-99** The owner cancels their PUBLISHED event that has two ACTIVE registrations: 200 with status CANCELLED; both registrations are CANCELLED with `cancelledAt` set; the event is not in `GET /api/events`; `GET /api/events/:id` gives 404 to a participant and to another organizer and 200 to the owner; it stays in My events; a new registration gets 404 `EVENT_NOT_FOUND`. A DRAFT and a CLOSED event can also be cancelled.
- **AC-100** Cancelling a CANCELLED event gets 409 `ALREADY_CANCELLED`; cancelling an event that has started gets 409 `EVENT_STARTED`; nothing changes.
- **AC-101** A registration and a cancel of the same event sent at the same time never leave an ACTIVE registration on a CANCELLED event.
- **AC-102** A participant gets 403 on all three routes for any event ID; another organizer gets 403 for a PUBLISHED or CLOSED event and 404 for a DRAFT, CANCELLED or missing event; nothing changes.
- **AC-103** All three routes give 401 `UNAUTHENTICATED` with no cookie, an unknown token, an expired session and a logged-out session; nothing changes.
- **AC-104** Publishing a CANCELLED DRAFT gets 409 `EVENT_NOT_EDITABLE`; publishing a CLOSED event still gets 409 `ALREADY_PUBLISHED`; nothing changes.
- **AC-105** In the UI the owner opens Edit from My events, changes the title and the capacity and saves; My events shows the new values, also after a reload.
- **AC-106** In the UI the owner closes one event and cancels another (with the in-page confirmation); My events shows CLOSED and CANCELLED; a participant sees the closed event with "Registration for this event is closed." and no Register button, and no longer sees the cancelled event in the Events list.
- **AC-107** In the UI a capacity below the registered count shows "Capacity cannot be lower than the number of registered participants." and keeps the typed values.
- **AC-108** After the owner cancels an event, the participant's `GET /api/registrations/mine` shows that registration with status CANCELLED (cross-feature with F-05, F-07).
- **AC-109** After a cancel, the owner's roster `GET /api/events/:id/registrations` still returns 200 with the registrations, now CANCELLED; another organizer gets 404 `EVENT_NOT_FOUND` for the cancelled event, as for a DRAFT.

## 11. Software test specification (STS)
API tests use Vitest and Supertest on the real PostgreSQL test database (`DATABASE_URL_TEST`, D-14); service tests pass a fixed `now`. Every error case asserts the status, the shared shape with `code` and `message` only (plus `details` for 400 `VALIDATION_ERROR`), and compares the relevant rows before and after. Fixtures: organizer O (owner), organizer O2, participants P1 to P3; `T` = now + 7 days on a whole minute.

| TEST | Level | Inputs and preconditions | Expected result |
|---|---|---|---|
| TEST-90 | API + DB | O's DRAFT and O's PUBLISHED event at `T`; PATCH `{title, description, location}` on each | 200 each; rows have the new text; `startsAt`, `capacity`, `status` unchanged |
| TEST-91 | API + DB | O's PUBLISHED event, capacity 5, 3 ACTIVE; PATCH capacity 3, then 2, then 10000 | 200, 409 `CAPACITY_BELOW_ACTIVE` (capacity still 3), 200 |
| TEST-92 | API + DB, concurrent | capacity 3, 2 ACTIVE; `Promise.all` of PATCH capacity 2 and P3 registering; run 5 times | each run: exactly one 2xx; final ACTIVE count ≤ final capacity |
| TEST-93 | API + DB | (a) event with 1 ACTIVE: PATCH `startsAt` `T+60` → 409 `EVENT_HAS_REGISTRATIONS`; PATCH `startsAt` = stored value → 200. (b) event without registrations: PATCH `startsAt` `T+60` → 200 | as stated; (a) `startsAt` unchanged |
| TEST-94 | Service unit + API | PATCH `startsAt` = now (fixed service time) and a past time on an event without registrations | 400 `INVALID_START_TIME`; row unchanged |
| TEST-95 | API + DB | PATCH `{}`, `{status:"CLOSED"}`, `{ownerId}`, `{capacity:"5"}`, `{capacity:0}`, `{capacity:10001}`, a 121-character title, a non-UUID `:id`, `text/plain` body | 400 `VALIDATION_ERROR` with `details` where applicable; nothing changes |
| TEST-96 | API + DB | PATCH on an event with `startsAt` in the past; PATCH on a CLOSED and on a CANCELLED event | 409 `EVENT_STARTED`; 409 `EVENT_NOT_EDITABLE` twice; nothing changes |
| TEST-97 | API + DB | O's PUBLISHED event with 1 ACTIVE (P1); close; list as P2; P2 registers | 200 CLOSED; list contains it with status CLOSED; P1's row still ACTIVE; P2 gets 409 `EVENT_CLOSED`, no row |
| TEST-98 | API + DB | close a DRAFT, a CANCELLED and a CLOSED event | 409 `EVENT_NOT_PUBLISHED`, 409 `EVENT_NOT_PUBLISHED`, 409 `ALREADY_CLOSED`; nothing changes |
| TEST-99 | API + DB | O's PUBLISHED event with P1, P2 ACTIVE; cancel; then list, detail as P3, O2 and O; P3 registers; also cancel a DRAFT and a CLOSED event | 200 CANCELLED; P1, P2 rows CANCELLED with `cancelledAt`; absent from list; detail 404, 404, 200; P3 gets 404 `EVENT_NOT_FOUND`; DRAFT and CLOSED cancels 200 |
| TEST-100 | API + DB | cancel a CANCELLED event; cancel an event with `startsAt` in the past | 409 `ALREADY_CANCELLED`; 409 `EVENT_STARTED`; nothing changes |
| TEST-101 | API + DB, concurrent | PUBLISHED event; `Promise.all` of cancel and P1 registering; run 5 times | each run: cancel 200; P1 gets 201 (then cancelled by the cancel) or 404; no ACTIVE row on the event |
| TEST-102 | API + DB | P1 calls PATCH, close, cancel on a DRAFT, a PUBLISHED and a missing ID; O2 calls them on O's PUBLISHED, CLOSED, DRAFT, CANCELLED and a missing ID | P1: 403 for all; O2: 403, 403, 404, 404, 404; nothing changes |
| TEST-103 | API | each route with no cookie, unknown token, expired and logged-out session | 401 `UNAUTHENTICATED` for all; nothing changes |
| TEST-104 | API + DB | publish a CANCELLED DRAFT; publish a CLOSED event | 409 `EVENT_NOT_EDITABLE`; 409 `ALREADY_PUBLISHED`; nothing changes |
| TEST-105 | E2E | Organizer One opens Edit on a seeded future event, changes title and capacity, saves, reloads My events | the row shows the new title and capacity after the reload |
| TEST-106 | E2E | Organizer One closes event X and cancels event Y (Cancel event, then Confirm cancel); Participant 3 opens X and the Events list | My events shows CLOSED and CANCELLED; X shows "Registration for this event is closed." with no Register button; Y is not in the list |
| TEST-107 | E2E | an event with 2 ACTIVE registrations; Organizer One sets capacity 1 in Edit and saves | the alert shows the `CAPACITY_BELOW_ACTIVE` message; the form keeps capacity 1 and the other values |
| TEST-108 | API + DB | P1 holds an ACTIVE registration; O cancels the event; P1 calls `GET /api/registrations/mine` | the row has status CANCELLED and `cancelledAt` |
| TEST-109 | API + DB | O cancels an event with 2 ACTIVE registrations; O and O2 call the roster | O: 200 with both rows CANCELLED; O2: 404 `EVENT_NOT_FOUND` (a CANCELLED event is hidden from non-owners, like a DRAFT) |

Red: TEST-90 to TEST-104 and TEST-108, TEST-109 are committed alone and run on the code after S2-02 (the schema exists, the routes do not), so they fail on the missing behavior (404 route or wrong code), not on a compile error. TEST-105 to TEST-107 are E2E and are red against the same code.

## 12. Definition of Done (F-08)
- This contract merged into `sprint-2-staging` before any F-08 test (#200), with the F-02 and F-04 revision rows and the new codes in system SDS 4.2.
- Red PR into `feature/s2-04-manage-event`, approved by A, with the failing output recorded on the red commit; then the green PR into `sprint-2-staging`, reviewed by A, with `test-and-docker` passing (plan section 2).
- All AC-90 to AC-109 pass; the full `npm test` and `npm run test:e2e` pass with counts and the tested commit recorded; TEST-92 and TEST-101 run 5 times.
- Sprint 1 and Lab 7 tests still pass unchanged (capacity, BR-10, ownership).
- Traceability rows for FR-10 and AC-90 to AC-109 filled with the actual test and result.

## 13. Version history
| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-27 | First F-08 contract (#200): edit, capacity floor under the lock, `startsAt` rule, close, cancel with cascade, owner-only, UI; AC-90 to AC-109, TEST-90 to TEST-109; the five gap rules proposed on #200 marked **(#200)** | B (stickkersz), drafted with Claude Code | A (songt888) on the PR |
