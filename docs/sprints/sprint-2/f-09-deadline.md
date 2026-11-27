# F-09 Registration deadline — draft engineering contract (Sprint 2)

Issue: #200 (contract), #204 (implementation). Author: A (songt888). Reviewer: B (stickkersz).
Status: Draft for cross-review. This contract must be reviewed and merged before any F-09 red-test commit.
Sources: `docs/srs.md` (FR-11, BR-04, BR-06, BR-10, NFR-01, NFR-03, NFR-07, NFR-09), `docs/decisions.md` (D-03, D-12, D-13, D-14, D-35), `docs/system-sds.md` (sections 2, 3.2, 4.1–4.3, 5), `docs/features.md` (F-02, F-04, F-09), `docs/sprints/sprint-1/f-02-publish-event.md`, and `docs/sprints/sprint-1/f-04-register.md`.

## 1. Linked requirements

| ID | How F-09 covers it |
|---|---|
| FR-11 | Registration is open only until the event's nullable deadline, subject to the existing event-start rule. |
| BR-04 | A registration still requires a PUBLISHED event whose `startsAt` is strictly later than `now`. |
| BR-06 | When a deadline exists, registration is allowed only while `now < registrationDeadline`; equality and later instants are closed. A null deadline preserves the existing open-until-start behavior. |
| BR-10 | Deadline rejection is checked before duplicate, time-conflict, and capacity checks, following D-35. Existing BR-10 rules remain unchanged. |
| NFR-01 | Protected create, update, and registration requests require a valid session. |
| NFR-03 | The server derives the organizer and participant identities from the session; the request cannot select an owner or participant. |
| NFR-07 | Datetimes are validated server-side; errors use the shared SDS error envelope without stack traces. |
| NFR-09 | The organizer can enter and review the deadline in local time; a participant receives a readable API error when registration is closed. |
| D-12 | `startsAt` remains strictly future for event creation and publication. F-09 does not change that rule. |
| D-13 | Existing session, role, and ownership guards remain in force. |
| D-35 | `registrationDeadline` is nullable, stored as UTC `timestamptz`, and entered/displayed in browser-local time like `startsAt`. A non-null value is valid only when `now < registrationDeadline <= startsAt`; null preserves the old rule. The validation applies when create sets the value or a PATCH includes the field. A PATCH that omits it does not fail solely because the stored deadline passed. The owner may move a passed deadline later while the event is editable and not started, or send null to clear it. Registration at or after the deadline returns 409 `REGISTRATION_CLOSED`. |

## 2. Ownership and workflow boundaries

- F-09 owns deadline semantics, validation, acceptance criteria, and the registration-deadline check in the F-04 registration flow.
- F-02 owns `POST /api/events`, `GET /api/events/mine`, and the shared `GET /api/events/:id` event-detail payload. F-09 adds the optional `registrationDeadline` field to create and the field to each relevant F-02 event response.
- F-03 owns the published-event list `GET /api/events`; F-09 requires its event response items to carry the deadline so the list can display it in local time.
- F-08 (B-owned) owns `PATCH /api/events/:id`, event editability/state transitions, and owner authorization for edits. F-09 defines the deadline-field behavior on that endpoint but does not redefine F-08's access or state rules.
- F-04 owns `POST /api/events/:id/registrations` and the registration transaction. F-09 adds its deadline check at the point specified by D-35.
- The additive schema change is owned by Issue #201. This contract does not add a separate migration.
- D-36 through D-38 and all Sprint 3 behavior remain out of scope.

## 3. Behavior

1. On event creation, an organizer may omit `registrationDeadline` or send null; both mean no deadline. A non-null value must be a valid zoned datetime later than the server's `now` and no later than `startsAt`.
2. On an authorized event PATCH, omission means leave the stored deadline unchanged. If the stored deadline has passed, that fact alone does not reject a PATCH that omits the field. Sending null clears the deadline. Sending a non-null value applies the same `now < registrationDeadline <= startsAt` validation as create.
3. An owner may move a passed deadline later to reopen registration while the event is editable and has not started, provided the new deadline is still later than `now` and no later than `startsAt`. F-08 supplies the event-editability and ownership checks.
4. A non-null deadline is stored as an absolute UTC instant. The organizer enters and sees it in browser-local time, using the same time-zone conversion convention as `startsAt`.
5. On registration, after resource visibility and event-start/state checks, a non-null deadline closes registration when `now >= registrationDeadline`. At the exact deadline, return 409 `REGISTRATION_CLOSED` and do not create a row. With null, continue to the existing F-04 eligibility checks; the event remains registrable only while `startsAt > now`.
6. Every event response needed by My events, event detail, the published-event list, or the event edit form includes `registrationDeadline` as a UTC ISO 8601 timestamp or null. The UI formats a non-null value in local time and shows the existing no-deadline state for null.

## 4. API and validation

### `POST /api/events` (F-02 endpoint; F-09 field)

- Organizer session, as already required by F-02.
- Add optional `registrationDeadline`: ISO 8601 datetime with an explicit time-zone offset, or null. Omitted and null values result in a null stored deadline.
- A non-null value must satisfy `now < registrationDeadline <= startsAt`. Reject a well-formed instant outside that range with 400 `INVALID_DEADLINE`; reject malformed shape using 400 `VALIDATION_ERROR` per system SDS 4.2.
- Store the instant as UTC. The response includes the persisted nullable field.
- All other field validation and create behavior remain owned by F-02.

### Event response payloads (F-02, F-03, and F-08 endpoints)

Every returned Event object in these payloads includes `registrationDeadline` as an ISO 8601 UTC instant or `null`:

| Method and path | Owner | Payload carrying `registrationDeadline` |
|---|---|---|
| `POST /api/events` | F-02 | Created event |
| `GET /api/events/mine` | F-02 | Each event in `events` |
| `GET /api/events/:id` | F-02 shared detail API; F-03 consumes it | Event |
| `GET /api/events` | F-03 | Each published event in the list |
| `PATCH /api/events/:id` | F-08 | Updated event |

The browser formats this instant in local time on My events, event detail, the published-event list, and the edit form. The endpoint and response ownership stays with F-02, F-03, or F-08 as shown; F-09 defines only the deadline field semantics.

### `PATCH /api/events/:id` (F-08 endpoint; F-09 field)

- Owner authorization, event existence/visibility, allowed event states, and the general PATCH shape are defined by B's F-08 contract.
- If the request body omits `registrationDeadline`, leave its stored value unchanged and do not reject the request merely because that stored deadline has passed.
- If PATCH changes `startsAt` and omits `registrationDeadline`, reject the update with 400 `INVALID_DEADLINE` when the stored non-null deadline is later than the new start (F-08 AC-94 / TEST-94).
- If the field is null, clear the stored value. If it is a non-null zoned datetime, validate `now < registrationDeadline <= startsAt` and store the normalized UTC instant.
- A non-null value at or before `now`, after `startsAt`, or otherwise outside the D-35 boundary returns 400 `INVALID_DEADLINE` without a write. Malformed field shape returns 400 `VALIDATION_ERROR`.
- A successful event response contains the persisted nullable `registrationDeadline`; the UI displays it in local time.
- F-09 does not set the status codes/order for an invalid event owner, started event, or non-editable event; use the final F-08 contract for those cases.

### Registration deadline check (F-04 endpoint)

For `POST /api/events/:id/registrations`, retain the existing route guards and F-04 transaction. After the service has established that the event is visible and is either PUBLISHED or CLOSED, apply the exact D-35 service-rule order:

1. Missing/hidden event: 404 (`EVENT_NOT_FOUND` under F-04/D-13).
2. `startsAt <= now`: 409 `EVENT_STARTED`.
3. Event is CLOSED: 409 `EVENT_CLOSED` (F-08/D-34).
4. Non-null `registrationDeadline` and `now >= registrationDeadline`: 409 `REGISTRATION_CLOSED`.
5. Existing ACTIVE registration: 409 `ALREADY_REGISTERED`.
6. BR-10 time conflict: 409 `TIME_CONFLICT`.
7. Capacity full: 409 `EVENT_FULL`.

A CANCELLED event is hidden and follows F-08's cancellation rule (404 as for a hidden event); this contract does not add a new event state. A rejection stores no registration and leaves `remainingPlaces` unchanged. If the deadline equals `startsAt`, D-35 permits storing it when it is future, but at that instant the earlier `EVENT_STARTED` check wins.

### Error envelope and proposed copy

All errors follow system SDS 4.2: `{ "error": { "code": "...", "message": "..." } }`, with validation `details` only as defined there and no stack trace. D-35 specifies codes but no exact message text. These two message strings are proposals only and must be reviewed in the shared SDS before the RED commit:

| Code | Proposed message (pending review) |
|---|---|
| `INVALID_DEADLINE` | "Registration deadline must be after now and no later than the event start time." |
| `REGISTRATION_CLOSED` | "Registration for this event is closed." |

For `EVENT_STARTED`, `EVENT_CLOSED`, `ALREADY_REGISTERED`, `TIME_CONFLICT`, and `EVENT_FULL`, use the final existing F-04/F-08/System SDS message text; F-09 does not introduce alternate copy.

## 5. Permissions

| Operation | Anonymous | Participant | Organizer (owner) | Organizer (other) |
|---|---|---|---|---|
| Create an event with a deadline | 401 | 403 | Allowed under F-02 create rules | Allowed under F-02 create rules; caller becomes owner |
| Set/clear a deadline on an event | 401 | 403 | Allowed only when F-08 permits the edit | F-08 ownership result; F-09 adds no owner bypass |
| Register for an event with a deadline | 401 | Allowed under F-04 if every registration rule passes | 403 | 403 |

The UI may hide fields or controls, but the API enforces session, role, and owner checks. Caller-supplied `ownerId`, `participantId`, or event state is never trusted.

## 6. UI behavior

| Screen | Route | Behavior |
|---|---|---|
| Create event | `/organizer/events/new` | Organizer may leave the deadline blank (null) or enter a local date/time. Convert the selected local time to an ISO timestamp with an explicit offset, using the existing `startsAt` convention. Show the saved value in local time after create. |
| Edit event | F-08 edit route | Show the stored deadline in local time. An unchanged/omitted value remains unchanged; an explicit clear sends null. F-08 controls when the edit form is available. |
| Event detail / registration | `/events/:id` | The event response carries nullable `registrationDeadline` for display in local time. When registration is refused at/after the deadline, show the API's readable `error.message`; do not display a success state or change remaining places. |

Exact copy for new deadline errors is pending the shared SDS review in section 4. Loading, submitting, and generic error states follow system SDS 3.2.

## 7. Data

- Issue #201 adds nullable `Event.registrationDeadline` as a PostgreSQL `timestamptz`; store the absolute instant in UTC. Existing rows use null and preserve the old open-until-start behavior.
- No new table, counter, or registration field is introduced by F-09.
- The event API exposes the persisted deadline as a UTC ISO 8601 timestamp or null. UI formatting is local and does not change the stored instant.
- `remainingPlaces` remains derived from capacity minus ACTIVE registrations; the deadline does not reserve or free a place.

## 8. Acceptance criteria (proposed ID allocation)

This draft reserves AC/TEST-81–89 for F-09 within A's proposed 73–89 range. The range remains proposed pending cross-review with B; it does not assign or renumber F-08's IDs.

| ID | Acceptance criterion | Linked |
|---|---|---|
| AC-81 | Creating an event with a valid non-null, offset-bearing deadline later than `now` and no later than `startsAt` stores and returns the same instant normalized to UTC. A deadline equal to a future `startsAt` is valid. | FR-11, BR-06, D-35 |
| AC-82 | On create, or on a PATCH that includes a non-null deadline, an instant at/before `now` or after `startsAt` returns 400 `INVALID_DEADLINE` and writes nothing. A malformed timestamp returns 400 `VALIDATION_ERROR`. | FR-11, BR-06, NFR-07, D-35 |
| AC-83 | With a non-null deadline, an otherwise eligible participant registering just before it succeeds; at equality and after it, registration returns 409 `REGISTRATION_CLOSED`, stores nothing, and leaves remaining places unchanged. | FR-06, FR-11, BR-04, BR-06, D-35 |
| AC-84 | A null/omitted create value means no deadline. On PATCH, omission preserves the saved value and does not fail merely because that value has passed; an explicit null clears it. With null, the existing F-04 start-time rule controls registration. | FR-11, BR-04, BR-06, D-35 |
| AC-85 | An owner may move a passed deadline to a later valid instant while F-08 says the event is editable and not started. Registration reopens only when `now < new deadline` and the other F-04 conditions pass. | FR-11, BR-06, D-35 |
| AC-86 | A zoned deadline is stored as the same absolute UTC instant represented by the request. Changing the browser display timezone changes its displayed local value but not the persisted instant. | FR-11, BR-06, D-35 |
| AC-87 | Deadline create/update uses the existing F-02/F-08 organizer and ownership guards, and registration uses the F-04 participant/session guards. Request bodies containing client-supplied `ownerId` or `participantId` are rejected as unknown fields with 400 `VALIDATION_ERROR`, as required by SDS 4.1; callers cannot select an owner or participant. | NFR-01, NFR-03, D-13, D-35 |
| AC-88 | When multiple registration rules fail, deadline evaluation follows D-35: hidden/missing event, started, closed, deadline, already registered, `TIME_CONFLICT`, then full. A deadline failure wins over duplicate, time-conflict, and full conditions, without storing a row. | FR-06, FR-11, BR-06, BR-10, D-35 |
| AC-89 | The organizer can enter and review the deadline in local time. Event responses preserve the instant; the participant sees the deadline in local time, and a closed-deadline registration shows the API error readably without changing the places text. | FR-11, BR-06, NFR-09, D-35 |

## 9. Software test specification (STS)

API/DB tests use Vitest and Supertest with `DATABASE_URL_TEST`; E2E uses Playwright with `DATABASE_URL_E2E`, after #201's schema migration is merged. Inject explicit service `now` values, `startsAt` and deadline instants, and use isolated fixtures. Set the injected time separately for each boundary request; do not depend on wall-clock timing. Every rejected write verifies the persisted Event/Registration rows and unchanged `remainingPlaces`. Assert the standard error envelope and no stack trace. These cases are planned only; none has been written or run for this draft.

| TEST | AC | Level | Setup and steps | Expected result |
|---|---|---|---|---|
| TEST-81 | AC-81 | API + DB integration | Create an organizer-owned event with `startsAt = T + 2 h`; set a deadline using an explicit offset at `T + 1 h`, then repeat with deadline equal to `startsAt`. | Both create requests succeed; DB stores UTC instants equal to the input instants; response includes the same instants. Equal-to-start is accepted when the instant is still future. |
| TEST-82 | AC-82 | API + DB integration | Submit create and deadline-bearing PATCH values equal to `now`, earlier than `now`, and later than `startsAt`; submit malformed and timezone-less timestamp shapes. | Well-formed out-of-range values return 400 `INVALID_DEADLINE`; malformed values return 400 `VALIDATION_ERROR`; no attempted request changes the event. |
| TEST-83 | AC-83 | API + DB integration | Create three isolated future PUBLISHED event fixtures, each with deadline T and capacity 3, and one otherwise eligible participant per event. Inject service `now` as T minus one millisecond, T, and T plus one millisecond for the corresponding request. | Before T: 201. At and after T: 409 `REGISTRATION_CLOSED`, no new rows, remaining places unchanged for each refusal. |
| TEST-84 | AC-84 | API + DB integration | Create with omitted and null deadlines. In the isolated test DB, insert an editable PUBLISHED event fixture with `startsAt = T + 2 h` and `registrationDeadline = T - 1 min`; use service time T. As its owner, PATCH an unrelated editable field while omitting the deadline, then PATCH with `registrationDeadline: null`. | Omitted create and null create store null. Unrelated PATCH succeeds and preserves the past value. Null PATCH succeeds and clears it. Subsequent registration with null uses the existing `startsAt` behavior. |
| TEST-85 | AC-85 | API + DB integration | In the isolated test DB, insert an editable PUBLISHED event E with `startsAt = T + 2 h` and `registrationDeadline = T - 1 min` (a deadline that was valid when originally set but has since passed). At injected service time T, PATCH as its owner to `T + 1 h`. Then set service `now` to T + 30 minutes for an otherwise eligible participant registration, and to T + 1 hour for a separate eligible participant registration. | PATCH succeeds under F-08 rules and stores the new UTC deadline. Registration at `T + 30 min` succeeds when other F-04 conditions pass; at the new deadline it returns 409 `REGISTRATION_CLOSED`. |
| TEST-86 | AC-86 | API + DB integration and E2E | Send equal-instant timestamps with different explicit offsets through create/update. In E2E, create and save a deadline in one Playwright browser context, reload the event in a second context with a different `timezoneId`, and inspect the API UTC value and both local displays. | All representations map to one stored instant. Changing the browser timezone changes only presentation, not the stored API value. |
| TEST-87 | AC-87 | API + DB integration | Attempt deadline create as a participant; attempt update as a participant and a non-owner organizer. Separately send `ownerId` on event create and PATCH, and `participantId` on registration; each request body includes the otherwise valid fields for that operation. Also attempt registration as anonymous and organizer. | Existing F-02/F-04/F-08 guard results apply. Each forged-ID body is rejected with 400 `VALIDATION_ERROR` for the unknown field under SDS 4.1, without changing an event or creating a registration. Other forbidden requests follow the corresponding F-02/F-04/F-08 contract; exact F-08 foreign-owner result follows that contract. |
| TEST-88 | AC-88 | API + DB integration | Prepare separate fixtures for hidden/missing, started, closed, deadline-reached, duplicate, BR-10 conflict, and full. Include pairwise collisions: started+deadline, deadline+duplicate, deadline+time conflict, deadline+full, and duplicate+time conflict. | Each response uses the first applicable condition in D-35 order. In particular, deadline beats duplicate, `TIME_CONFLICT`, and full; started/closed beat deadline. No rejected request stores a Registration. |
| TEST-89 | AC-89 | E2E (Playwright, `DATABASE_URL_E2E`) | Organizer creates and edits a future event with a local-time deadline, saves and reloads. In the isolated E2E database, prepare a second PUBLISHED event with a future `startsAt` and a `registrationDeadline` already in the past; sign in as an otherwise eligible participant, open its detail page, and attempt registration through the UI. | Organizer sees the saved local time and the response carries the corresponding UTC instant. For the expired-deadline fixture, the real API returns 409 `REGISTRATION_CLOSED`; the participant sees its readable error without a success state or changed places text. TEST-83 is the deterministic backend check at just before, exactly at, and just after the deadline. |

Test names start with the IDs, for example `TEST-83 AC-83 closes registration at the exact deadline`. F-08 AC-94 / TEST-94 covers the stored-deadline check in section 11.

## 10. Definition of Done (F-09)

The shared Sprint 2 Definition of Done applies. In addition:

- AC-81 through AC-89 and TEST-81 through TEST-89 are cross-reviewed with F-08 and F-04 before any F-09 red commit.
- The RED tests are committed and run on the pre-change code; retain actual failure output. A fixture, selector, compilation, or setup failure is not valid red evidence.
- The green change is limited to F-09 and the field behavior assigned to A; F-08 route ownership and unrelated event rules remain in B's contract.
- Run the targeted tests, full `npm test`, `npm run test:e2e`, and required CI; report actual counts, tested commit, and any skips/failures.
- Update the shared SRS, system SDS, and traceability to reflect planned contract status without claiming tests are verified before execution.
- B reviews the green PR; no feature is complete until the required review, checks, and merge are verified.

## 11. Cross-review decisions

- If PATCH moves `startsAt` earlier than the stored non-null deadline and omits `registrationDeadline`, return 400 `INVALID_DEADLINE` without changing the event. F-08 step 8 and AC-94 / TEST-94 define the check and its precedence.
- Publishing after the saved deadline has passed follows F-02/D-12. F-09 adds no publish-time deadline check. An owner may update the deadline through PATCH while the event is editable.

Other F-08-specific proposals in the #200 discussion remain B-owned and are not adopted here. The proposed exact messages in section 4 also need review in the shared SDS. No new event-state, publish, or edit rule is inferred from F-09.

## 12. Version history

| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| Draft 0.1 | 2026-11-27 | First F-09 contract draft from FR-11, BR-06, D-35, and the F-02/F-04 conventions. Proposes AC-81–89 and TEST-81–89; local-time copy and two cross-feature behavior questions remain open for review. | A (songt888) | Pending B (stickkersz) |
| Draft 0.2 | 2026-11-27 | Record the PATCH deadline check and publication scope from the #221 cross-review. | A (songt888) | Pending B (stickkersz) |
