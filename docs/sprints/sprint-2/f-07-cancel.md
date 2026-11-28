# F-07 Cancel registration — draft engineering contract (Sprint 2)

Issue: #200 (contract), #202 (implementation). Author: A (songt888). Reviewer: B (stickkersz).
Status: Draft for cross-review. This contract must be reviewed and merged before any F-07 red-test commit.
Sources: `docs/srs.md` (FR-09, BR-03, BR-05, BR-07, NFR-01, NFR-03, NFR-07, NFR-09), `docs/decisions.md` (D-02, D-08, D-10, D-13, D-33), `docs/system-sds.md` (sections 2, 3.2, 4.1–4.3, 5), `docs/features.md` (F-04, F-05, F-07), `docs/sprints/sprint-1/f-04-register.md`, and `docs/sprints/sprint-1/f-05-f-06-registrations.md`.

## 1. Linked requirements

| ID | How F-07 covers it |
|---|---|
| FR-09 | A participant cancels their own registration before the event starts; the cancelled row remains and its place is freed. |
| BR-03 | At most one ACTIVE registration exists for a participant and event. Re-registering after cancellation creates a new ACTIVE row; the cancelled row does not violate the existing partial unique index. |
| BR-05 | The participant may read and change only registrations owned by the session user. Unknown and another participant's IDs have the same 404 response. |
| BR-07 | Cancelling an ACTIVE registration frees capacity. If every other registration rule still holds, that participant may register again. |
| NFR-01 | Every cancellation request requires a valid session; absent, unknown, expired, or logged-out sessions receive 401 and change no data. |
| NFR-03 | The caller is derived from the session. The request cannot choose a participant ID or role. |
| NFR-07 | Inputs are validated by the API; errors use the system SDS envelope and contain no stack trace. |
| NFR-09 | My registrations shows the registration status and readable API errors; the Cancel control is available only for an ACTIVE row. |
| D-10 | Cancellation locks the event row first so a concurrent registration sees the committed active count. |
| D-13 | A caller with the wrong role receives 403 before record lookup; a participant receives the same 404 for a foreign or unknown registration. |
| D-33 | Only the session participant's ACTIVE registration can be cancelled, and only while `startsAt > now`; the row is retained with `status = CANCELLED` and `cancelledAt` set. A started event returns 409 `EVENT_STARTED`; an already-cancelled row returns 409 `ALREADY_CANCELLED`; an organizer receives 403. Cancelled rows do not count for capacity, duplicates, or BR-10. |

## 2. Behavior and workflow

1. A participant opens `/my/registrations` (F-05). Each ACTIVE row belonging to that participant has a Cancel control. A CANCELLED row remains visible with its status and has no Cancel control.
2. The control sends `POST /api/registrations/:id/cancel`. The browser sends no participant ID; the server uses the session user. The request has no business fields.
3. The route requires a valid session (401), then the `PARTICIPANT` role (403), then validates `:id` as a UUID (400 `VALIDATION_ERROR`), following the F-05/F-06 guard order.
4. The service scopes the registration to both its ID and the session participant. A foreign or unknown ID returns 404 `NOT_FOUND` without disclosing a record.
5. For an owned ACTIVE registration, cancellation is allowed only if the event's `startsAt` is strictly later than the service's `now` value. At or after `startsAt`, return 409 `EVENT_STARTED` and leave the row unchanged.
6. On success, update the existing row atomically: set `status` to `CANCELLED` and set `cancelledAt`; do not delete or replace the row. Its event's `remainingPlaces` increases by one because only ACTIVE rows count.
7. After a successful response, the UI reloads My registrations from the API so the retained row displays CANCELLED. A failed request shows the API's readable error and does not present a success state.
8. Re-registration is a separate F-04 action. It creates a new ACTIVE row only when all current registration conditions, including BR-10, are met. The existing CANCELLED row remains.

F-08 owns event cancellation and its transactional cancellation of ACTIVE registrations. F-07 does not add or alter the event-cancellation flow.

## 3. Validation and request

- Method and path: `POST /api/registrations/:id/cancel`.
- Authentication and role guards run before ID validation, as in the existing registration contracts.
- `:id` must be a UUID; otherwise return 400 `VALIDATION_ERROR` with the validation `details` defined by system SDS 4.2. No database lookup or write occurs.
- No participant ID, event ID, status, `cancelledAt`, or other business value is accepted from the caller. The participant identity and cancellation timestamp are server-controlled.
- Apply the system SDS state-changing request convention: JSON request with an empty object `{}`; reject unknown fields. No extra request option is introduced.
- The service receives an explicit `now: Date` (the route supplies the current server time), matching the time-injection convention in F-04. The eligibility boundary is strict: `startsAt > now` is cancellable; equality is already started.

## 4. Failure and boundary cases

| Case | Response and effect |
|---|---|
| No cookie, unknown token, expired session, or logged-out session | 401 `UNAUTHENTICATED`; no registration data is returned and no row changes. |
| Caller is an organizer, for any registration ID | 403 `FORBIDDEN`; no row changes. |
| Participant supplies a non-UUID ID | 400 `VALIDATION_ERROR`; no lookup or row change. |
| UUID is unknown or belongs to another participant | 404 `NOT_FOUND`; the response does not distinguish the cases and contains no registration data. |
| Owned row is already CANCELLED | 409 `ALREADY_CANCELLED`; no row changes. |
| Owned ACTIVE row has `startsAt <= now` | 409 `EVENT_STARTED`; no row changes. |
| Owned ACTIVE row has a `CheckIn` (checked in, F-10) | 409 `ALREADY_CHECKED_IN`; the row stays ACTIVE. Checked after `ALREADY_CANCELLED` and `EVENT_STARTED`, so after the start the cancel gets `EVENT_STARTED` (F-10 contract section 2; D-36). |
| Owned ACTIVE row has `startsAt > now` | The row remains and changes to CANCELLED; `cancelledAt` is set. The freed place is reflected by the API-derived `remainingPlaces`. |
| Re-register after cancellation, all F-04 conditions satisfied | F-04 registration succeeds with a new ACTIVE row; the prior CANCELLED row remains. |
| Unexpected server or database failure | 500 `INTERNAL_ERROR`; generic message, no stack trace, transaction makes no partial cancellation. |

For an owned CANCELLED registration on an event that has already started, return 409 `ALREADY_CANCELLED` before checking `EVENT_STARTED` (#200).

## 5. Permissions

| Operation | Anonymous | Participant (owner) | Participant (other) | Organizer |
|---|---|---|---|---|
| `POST /api/registrations/:id/cancel` | 401 | Allowed only for own ACTIVE registration before `startsAt` | 404, same as unknown | 403 for every ID |

Ownership is enforced in the service from the session user. The UI hiding a control is not authorization; direct API calls must receive the same server-side checks.

## 6. UI behavior

| Screen | Route | Behavior |
|---|---|---|
| My registrations (F-05) | `/my/registrations` | Show Cancel only for the signed-in participant's ACTIVE rows. Disable the control while the request is pending. On success reload the list; the same row remains with status CANCELLED and no Cancel control. On failure show the API `error.message` accessibly; do not change the displayed status to CANCELLED. Loading, empty, 401 and 403 states follow system SDS 3.2. |

## 7. API

### `POST /api/registrations/:id/cancel`

- Auth: session cookie required. Role: `PARTICIPANT`.
- Request: UUID path parameter; empty JSON object `{}`; no participant or status fields.
- Success: HTTP 200 with `{ "registration": { ... } }`, using the My registrations row fields plus `status: "CANCELLED"` and `cancelledAt`.
- Errors: 400 `VALIDATION_ERROR`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `ALREADY_CANCELLED`, `EVENT_STARTED` or, from F-10, `ALREADY_CHECKED_IN`; 500 `INTERNAL_ERROR`.
- All errors use `{ "error": { "code": "...", "message": "..." } }`; 400 validation may add `details` as specified in system SDS 4.2. Responses never include a stack trace or another participant's registration.

### Error messages

| Code | Message |
|---|---|
| `FORBIDDEN` | "You do not have access to this." (system SDS 4.2) |
| `NOT_FOUND` | "Registration not found." (F-05/F-06 contract) |
| `EVENT_STARTED` | "This event has already started." (F-04 contract) |
| `ALREADY_CANCELLED` | "This registration has already been cancelled." |
| `ALREADY_CHECKED_IN` | "A checked-in registration cannot be cancelled." (F-10 contract, on cancel) |

## 8. Data and integrity

- Issue #201 owns the additive migration that adds `CANCELLED` to `RegistrationStatus` and nullable `Registration.cancelledAt` (`timestamptz`). F-07 does not add another schema change.
- A successful cancellation updates the existing `Registration` row; it does not delete the row or create a replacement.
- The existing partial unique index remains scoped to rows with `status = 'ACTIVE'`. A new ACTIVE row for the same participant/event is therefore possible after the prior row is CANCELLED, while two ACTIVE rows remain prohibited.
- `remainingPlaces = capacity - count(ACTIVE registrations)`. The value is derived from the active count; no counter column is introduced.
- `cancelledAt` is null for ACTIVE rows and set to the server time for a row changed to CANCELLED by F-07. If F-08 cancels an event and its registrations, that feature's contract defines its transaction.

## 9. Acceptance criteria

The agreed #200 allocation is AC/TEST-73–80 for F-07, 81–89 for F-09, and 90–109 for F-08.

| ID | Acceptance criterion | Linked |
|---|---|---|
| AC-73 | For the signed-in participant's own ACTIVE registration, cancellation before `startsAt` returns the HTTP 200 response from section 7, retains the same registration row with status CANCELLED and non-null `cancelledAt`, and the following My registrations read still shows that row as CANCELLED. | FR-09, BR-03, BR-05, BR-07, D-33 |
| AC-74 | Requests with no cookie, an unknown token, an expired session, or a revoked/logged-out session return 401 `UNAUTHENTICATED`. An organizer receives 403 `FORBIDDEN` for a valid or malformed registration ID. A participant's non-UUID ID returns 400 `VALIDATION_ERROR`. No case changes a registration; guard order is session, role, then UUID validation. | NFR-01, NFR-03, NFR-07, D-13 |
| AC-75 | A participant's request for a foreign or unknown UUID returns the same 404 `NOT_FOUND`, with no registration data and no change to the foreign row. | FR-09, BR-05, D-13 |
| AC-76 | An owned CANCELLED row returns 409 `ALREADY_CANCELLED`; an owned ACTIVE row whose `startsAt` is equal to or earlier than `now` returns 409 `EVENT_STARTED`. Each rejection leaves stored data unchanged. An owned CANCELLED row on a started event returns 409 `ALREADY_CANCELLED`. | FR-09, BR-07, D-33 |
| AC-77 | After a successful cancellation, if the event remains eligible and all F-04 rules hold, the participant can register again. The result is a new ACTIVE row while the original CANCELLED row remains. | FR-09, BR-03, BR-07, D-33 |
| AC-78 | Cancelling an ACTIVE row frees one capacity place. A different eligible participant can take that place; the ACTIVE count does not exceed capacity and the cancelled row remains stored. | BR-02, BR-07, D-10, D-33 |
| AC-79 | A participant's CANCELLED row does not trigger BR-10 `TIME_CONFLICT`; with no other conflicting ACTIVE registration and all F-04 rules satisfied, registration for an event less than 120 minutes away can succeed. | BR-10, D-33 |
| AC-80 | In My registrations, the Cancel control appears only for ACTIVE rows. After a successful cancellation the row displays CANCELLED after reload and the control is absent; a refused cancellation displays the API error without presenting the row as cancelled. | FR-07, FR-09, NFR-09, D-33 |

## 10. Software test specification (STS)

All API/DB tests use Vitest and Supertest with `DATABASE_URL_TEST` and isolated fixtures per the existing test setup (D-14). Use a fixed service `now` and explicit event `startsAt` values; do not depend on wall-clock timing. Each error test asserts the SDS error envelope, status, code, and absence of private registration data. No real credentials or environment values appear in this contract.

| TEST | AC | Level | Setup and steps | Expected result |
|---|---|---|---|---|
| TEST-73 | AC-73 | API + DB integration | Create participant P, organizer O, future PUBLISHED event E with capacity 2, and P's ACTIVE registration R. Log in as P and POST `/api/registrations/R/cancel`; then GET `/api/registrations/mine`. | HTTP 200 returns the My registrations row for R with status CANCELLED and a non-null `cancelledAt`; list identifies R as CANCELLED; DB retains R with the same ID and non-null `cancelledAt`; active count falls by one. Freeze `now`; no partial or deleted row. |
| TEST-74 | AC-74 | API + DB integration | Create separate valid, unknown, expired and revoked session cases for P; call the cancel route without a cookie, with an unknown token, with an expired token, and with the cookie retained after logout. Also call with organizer O using a valid ID and a malformed ID, and with P using a malformed ID. | The four invalid-session cases return 401 `UNAUTHENTICATED`; O receives 403 `FORBIDDEN` before ID lookup for both IDs; P's malformed ID returns 400 `VALIDATION_ERROR`. Assert the registration row is unchanged after every call. |
| TEST-75 | AC-75 | API + DB integration | Create P and P2 with ACTIVE rows R and R2 on future events. Log in as P; call cancel for R2 and for an unknown UUID. | Both return identical 404 `NOT_FOUND`; body contains only `error`; R2 remains ACTIVE with null `cancelledAt`. |
| TEST-76 | AC-76 | API + DB integration | Create owned CANCELLED rows on a future and a started event, and an owned ACTIVE row on an event with `startsAt = now`; repeat with `startsAt < now`. | Both CANCELLED rows return 409 `ALREADY_CANCELLED`; started ACTIVE rows return 409 `EVENT_STARTED`; all stored rows and timestamps remain unchanged. |
| TEST-77 | AC-77 | API + DB integration | Create future PUBLISHED event E and P's ACTIVE row R. Cancel R, then register P for E under otherwise-valid F-04 conditions. | Cancellation succeeds; registration succeeds as a different ACTIVE row ID; database contains one CANCELLED row R with `cancelledAt` and one new ACTIVE row; the partial unique ACTIVE index is satisfied. |
| TEST-78 | AC-78 | API + DB integration | Create future PUBLISHED event E at capacity 1 with P's single ACTIVE row. P cancels; eligible participant P2 registers for E. | Cancel succeeds; P2 receives the F-04 success; database retains P's CANCELLED row, has P2's ACTIVE row, and ACTIVE count is exactly capacity (1), never over it. |
| TEST-79 | AC-79 | API + DB integration | Create future events A and B less than 120 minutes apart. P has an ACTIVE registration on A, cancels it, then registers for B; all other F-04 conditions hold. | Cancellation succeeds and registration for B succeeds; P has no ACTIVE row on A and exactly one ACTIVE row on B. The cancelled A row remains and is not treated as a BR-10 conflict. |
| TEST-80 | AC-80 | E2E (Playwright, `DATABASE_URL_E2E`) | Seed or create participant P with one ACTIVE and one CANCELLED registration. Sign in as P, open `/my/registrations`, cancel the ACTIVE row, reload. Also exercise a refused response in an isolated fixture. | Cancel is available only on the ACTIVE row and disabled while pending. After success, the same row displays CANCELLED after reload and no Cancel control; the already-CANCELLED row never has a control. On refusal, the readable API error appears and the row stays ACTIVE. |

Test names start with their IDs, for example `TEST-73 AC-73 cancels the participant's own active registration`. These are planned tests only; no test has been written or run for this draft.

## 11. Definition of Done (F-07)

The shared Sprint 2 Definition of Done applies. In addition:

- AC-73 through AC-80 and TEST-73 through TEST-80 are reviewed against D-33 and the finalized F-08/F-09 contracts before any red commit.
- Each required RED test is committed and run on the pre-change code; retain the real failure output. A selector, fixture, compilation, or setup failure is not valid red evidence.
- The implementation updates the cancellation transaction and UI with the smallest change satisfying this contract; all relevant tests and regression suites run with actual counts recorded.
- Migration work is owned by #201; no schema work is folded into this feature without review.
- The red test work is independently reviewed as specified in the Sprint 2 red/green PR handoff; the green PR is reviewed by B and merged to `sprint-2-staging` with required checks passing.

## 12. Cross-review decisions

- Return HTTP 200 with the My registrations row shape, `status: CANCELLED` and `cancelledAt` in the `registration` envelope.
- Lock the event row first in the cancellation transaction (D-10).
- Check `ALREADY_CANCELLED` before `EVENT_STARTED`, including when both conditions apply.

## 13. Version history

| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| Draft 0.1 | 2026-11-27 | First F-07 contract draft from FR-09, BR-03/05/07, D-33, and the Sprint 1 F-04/F-05/F-06 conventions. Proposes AC-73–80 and TEST-73–80; success response and concurrency/error-order questions remain open for cross-review. | A (songt888) | Pending B (stickkersz) |
| 1.1 | 2026-11-28 | F-10 cross-feature revision (D-36, decided in the #224 review): cancelling a checked-in registration returns 409 `ALREADY_CHECKED_IN`, checked after `ALREADY_CANCELLED` and `EVENT_STARTED`; the F-10 section 2 and TEST-118 define the behavior, which lands with S3-02. Recorded here so the contract stays self-contained. | A (songt888) | B (stickkersz) on #224 |
