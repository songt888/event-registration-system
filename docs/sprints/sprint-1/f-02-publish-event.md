# F-02 Publish event contract

Issue #18 (parent #2), implemented in Issue #5. Author A specifies the contract; B reviews it and owns implementation. F-02 owns create, publish, My events and the shared event-detail API. F-03 owns the published list and consumes this detail API. F-04 owns registration, and F-06 owns the roster. Requirements: FR-04, FR-15, FR-05 (detail), BR-01, BR-09, NFR-01, NFR-03, NFR-07, NFR-09. Decisions: D-03, D-07, D-12, D-13, D-14.

## Behavior and data

An organizer creates a DRAFT, opens it from My events, and publishes it with a separate action. Only the owning organizer publishes the DRAFT. Creation obtains `ownerId` from the authenticated session and sets `status=DRAFT`, `publishedAt=null`. Publication atomically updates the owning DRAFT to PUBLISHED with `publishedAt=now`, leaving the other fields unchanged. No edit, delete, close or cancel operation is in F-02.

Use the system SDS Event model: UUID `id`, organizer FK `ownerId`, title, description, location, timestamptz `startsAt`, integer `capacity` with database CHECK 1..10000, `status`, `createdAt` and nullable `publishedAt`. Foundation #24 owns the schema migration. F-02 does not write registration rows. For reads, calculate `remainingPlaces = capacity - count(ACTIVE registrations for this event)`; never store the derived value. A PUBLISHED event remains readable when full or after its start. Eligibility to register belongs to F-04.

## API contract

Event payload fields: `id`, `title`, `description`, `location`, `startsAt`, `capacity`, `remainingPlaces`, `status`. Use UUID IDs, UTC ISO 8601 timestamps and status DRAFT or PUBLISHED. Responses do not expose owner IDs, user records, registration rows or session data. My events uses the same event payload for both statuses. Declare the literal `/api/events/mine` route before `/api/events/:id`.

| Method and path | Request | Success |
|---|---|---|
| POST `/api/events` | ORGANIZER session. JSON object with `title`, `description`, `location`, `startsAt`, `capacity`. | 201 with the event payload. |
| GET `/api/events/mine` | ORGANIZER session. No body or required query parameters. | 200 `{ "events": [...] }` with only the caller's DRAFT and PUBLISHED events, sorted by startsAt then id ascending. No matches returns `{ "events": [] }`. |
| GET `/api/events/:id` | Session of either role. UUID route parameter. No body. | 200 with the event payload for any PUBLISHED event or the organizer's own DRAFT. F-03 uses this same payload for event detail. |
| POST `/api/events/:id/publish` | ORGANIZER session. UUID route parameter and JSON `{}`. | 200 with the PUBLISHED event payload after persistence. |

Create accepts title and location strings of length 1..120 after trimming, description string of length 0..2000, and capacity as a JSON integer from 1 to 10000 inclusive. Reject missing fields, wrong types, unknown fields (including ownerId, status and publishedAt), malformed JSON, and non-JSON POSTs. Accept valid ISO 8601 datetime with an explicit zone and normalize to UTC. For create and publish, compare `startsAt > now`; equality and past times return 400 `INVALID_START_TIME`. Capture the server clock for the operation and pass it to the service for deterministic boundary tests. Invalid shape, datetime syntax or UUID returns 400 `VALIDATION_ERROR`. Publish accepts only an empty object.

Session check precedes role check, then validate input before resource lookup. Errors use `{ "error": { "code": "...", "message": "..." } }` with optional field details for validation and no stack or private data. Any protected route returns 401 `UNAUTHENTICATED` for no, invalid, expired or revoked session. The three organizer-only routes return 403 `FORBIDDEN` to participants before looking up an event, even for DRAFT, PUBLISHED or missing UUIDs. A well-formed missing event ID returns 404 `EVENT_NOT_FOUND` after applicable guards. Detail for a foreign DRAFT gives the same 404 as missing. On publish, a non-owner organizer gets 404 for a DRAFT and 403 for a PUBLISHED event. Check ownership before evaluating the state/time of the event. The owner receives 409 `ALREADY_PUBLISHED` on republish, including when the start has passed. Any rejection leaves the database unchanged; unexpected failures use the shared 500 `INTERNAL_ERROR` envelope.

## UI contract

- **Create event** at `/organizer/events/new`: label all five fields, show local time in the form and serialize the selected instant with zone information. Show validation errors near fields or in the form, retain inputs on failure, and disable submission while pending. On 201 confirm the draft was saved and navigate to My events, which reloads persisted data.
- **My events** at `/organizer/events`: show a loading indicator during fetch, “No events yet” when empty, and a readable error with retry when fetch fails. Display DRAFT/PUBLISHED status, provide a detail link, and show Publish only on owned DRAFT rows. Disable the corresponding button while pending, reload on 200 and surface failures without pretending publication succeeded. The roster link hands off to F-06.
- **Event detail** at `/events/:id`: F-03 renders the payload and loading, missing and error states. The owner's DRAFT is accessible from My events. F-04 controls registration behavior. Redirect unauthenticated users to sign in, and show an access message on 403. UI controls do not replace backend authorization. Record the My events loading, empty and error checks in the Sprint 1 NFR-09 manual evidence.

## Acceptance criteria and planned software tests

Use the corresponding TEST ID in each executable test name. Use Vitest service tests for fixed time and Supertest against real PostgreSQL for API/database assertions. Run integration tests with `DATABASE_URL_TEST` and D-14 isolation. Each negative API case checks status, the shared error envelope with code and message, validation details shape when present, and absence of stack traces and private data. For writes, compare relevant database rows before and after rejection.

| AC / TEST | Setup and action | Expected |
|---|---|---|
| AC-06 / TEST-06 | Organizer submits valid input; parameterize capacity 1 and 10000 with future start. | 201, persisted DRAFT owned by the session user with matching fields, null publishedAt and full remainingPlaces. |
| AC-07 / TEST-07 | Try capacity 0, negative, non-integer and above 10000; also reject a numeric string. | 400 VALIDATION_ERROR; no event stored. |
| AC-08 / TEST-08 | Participant submits a valid create request. | 403 FORBIDDEN; no event stored. |
| AC-09 / TEST-09 | Call each F-02 route with no cookie, invalid token, expired session and revoked session; use a valid payload/UUID where applicable and an independent expired session per route. | Every call returns 401 UNAUTHENTICATED; no event data or writes. |
| AC-25 / TEST-25 | Owner publishes a future DRAFT; assert the result from a DB reread. | 200 and persisted PUBLISHED with publishedAt set. |
| AC-26 / TEST-26 | Another organizer attempts to publish the owner's DRAFT. | 404 EVENT_NOT_FOUND; DRAFT and publishedAt unchanged. |
| AC-29 / TEST-29 | Organizer creates with a past startsAt. | 400 INVALID_START_TIME; no event stored. |
| AC-30 / TEST-30 | Owner publishes a seeded DRAFT with past startsAt in API integration and equal startsAt with fixed service time. | 400 INVALID_START_TIME; DRAFT and publishedAt unchanged. |
| AC-31 / TEST-31 | Owner requests own DRAFT by ID. | 200 with matching payload and DRAFT status. |
| AC-32 / TEST-32 | Participant and other organizer request the DRAFT and a missing valid UUID. | Same 404 EVENT_NOT_FOUND envelope with no event fields. |
| AC-33 / TEST-33 | Create owned and foreign events of each status, then call My events as owner and as a third organizer without events. | 200 with exact own-event IDs for both statuses, ordered as specified; third organizer receives empty array. |
| AC-34 / TEST-34 | Participant requests My events. | 403 FORBIDDEN without event data. |
| AC-35 / TEST-35 | Create with startsAt equal to injected now. | 400 INVALID_START_TIME; no insert. |
| AC-36 / TEST-36 | Owner publishes already PUBLISHED event, including one whose start passed. | 409 ALREADY_PUBLISHED; state and timestamp unchanged. |
| AC-49 / TEST-49 | Participant, owner and other organizer fetch a PUBLISHED event with ACTIVE registrations and capacity above the active count; repeat for a full event. | 200 with exact event payload, remainingPlaces equal to capacity minus ACTIVE count and zero when full, no registrant data. |
| AC-50 / TEST-50 | Participant attempts publish on DRAFT, PUBLISHED and missing UUIDs; non-owner organizer attempts publish on another organizer's PUBLISHED and a missing UUID. | Participant receives identical 403 for all IDs. Non-owner receives 403 for PUBLISHED and 404 for missing. No writes. |
| AC-51 / TEST-51 | Organizer tries invalid create field lengths or shapes, invalid datetime, forbidden fields, malformed/non-JSON POST, nonempty publish body and malformed UUIDs for detail/publish. | 400 VALIDATION_ERROR for each invalid shape, no leaks or writes. |

AC/TEST-49..51 cover positive shared detail, publish authorization precedence and malformed input respectively. Earlier IDs retain their assigned meaning. Cross-feature TEST-22 exercises the create and publish journey when E2E work lands.

Apply the [Sprint 1 Definition of Done](definition-of-done.md). Before implementing Issue #5, establish contract-first history, record real red and green results with tested commits, and obtain teammate review. This document specifies expected results. Execution evidence will come from implementation and QA.

| Version | Change |
|---|---|
| 1.0 | Initial F-02 contract for #18. |
