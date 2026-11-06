# Software Requirements Specification

Event Registration and Attendance System | CPE 334, Semester 1/2026 | Theme 3

Status: draft for Issue #12 and teammate review. This document specifies the whole product baseline; Sprint 1 is the Deliverable 1 implementation scope. Requirements and verification below are planned, not claims of implemented or tested behavior.

## 1. Purpose, context and actors

University campus organizers need to publish seminars, workshops and activities with limited places, keep a reliable registration list, and later record attendance. Participants need to discover published events, register without duplicate or excess bookings, and retrieve their saved registration. The product connects these workflows through a web UI, backend application and persistent database. All demonstration users and events are synthetic.

| Stakeholder or actor | Responsibility and need |
|---|---|
| Participant (`PARTICIPANT`) | Discover published events, register and read their own registrations; later cancel their own registration. |
| Organizer (`ORGANIZER`) | Create and publish their own events, view their events' registrations; later manage events, check participants in and view attendance summaries. |
| Unauthenticated visitor | Log in using a seeded account. Protected operations reject the request until authentication succeeds. This is not a third account role. |
| Two-student project team | Maintain the baseline and feature contracts, implement and verify the planned increments, and retain authentic review and release evidence. |
| Course assessors and later UAT testers | Reproduce a recorded release with safe accounts/data and inspect traceable requirements, tests and evidence. They are not additional application roles. |

Each account has exactly one role. The backend obtains identity and role from the authenticated session; a client-supplied user ID or role cannot authorize an operation.

## 2. Product scope and delivery boundaries

| Increment | Included product behavior |
|---|---|
| Sprint 1 / Deliverable 1 | Seeded-account login/logout/current user; organizer creates a real DRAFT and separately publishes it; authenticated event browsing with remaining places; participant registration with capacity, duplicate and concurrency enforcement; participant's own registrations; owning organizer's registration list. |
| Sprint 2 | Cancellation and re-registration, organizer event editing/closing/cancellation and capacity changes, registration deadlines. Check-in may start here, with completion in Sprint 3. |
| Sprint 3 | Check-in completion, attendance records/reports, organizer summaries, performance and product hardening, regression verification. |

The Sprint 1 normal journey is: organizer logs in, creates and publishes an event; participant logs in, registers and retrieves the saved registration; owning organizer retrieves the event's registrations. Rejected requests must not create a registration or change the protected record.

Explicit exclusions from Sprint 1 are cancellation, deadline fields/rules, check-in, attendance reports, waitlists, self-registration and password recovery. Cancellation, deadlines, check-in and reporting remain in the whole-product baseline. Waitlists are excluded from the product (D-05); self-registration, password recovery and advanced account administration have no committed feature allocation. No additional permissions or features are implied by their omission.

Sprint 1 runs locally with persistent PostgreSQL data and documented setup. Docker packaging, completed CI/CD and GCP deployment are later Lab 5 work; the design must support that delivery. A final-project demonstration video is not a Deliverable 1 requirement.

## 3. Functional requirements

IDs remain stable across documents, feature contracts, tests and the final PDF. The verification column describes planned checks; detailed AC/STS belong to the feature contracts in Issue 2. Later-sprint criteria will be elaborated before those features are implemented.

| ID | Observable required behavior | Sprint | Planned verification |
|---|---|---|---|
| FR-01 | Log in with a seeded email/password. Valid credentials establish a session; an unknown email or wrong password returns the same generic 401 response without revealing which credential was wrong. | S1 | API valid/invalid-login cases (TEST-01, TEST-02); UI login/logout journey (TEST-24). |
| FR-02 | Logout revokes the server-side session. A subsequent protected request, including one replaying the previous cookie, returns 401. | S1 | API logout/replay check (TEST-04); UI logout journey (TEST-24). |
| FR-03 | Retrieve the authenticated user's ID, name and role from the session. Without a valid session, reject with 401; never return `passwordHash`. | S1 | API current-user, no-session and response-field checks (including TEST-03). |
| FR-04 | An organizer creates an event with title, description, location, future start time and valid capacity. Persist it as DRAFT owned by that organizer. A separate owner-only publish operation changes the DRAFT to PUBLISHED. | S1 | API/DB creation, publication, input/time boundaries, role and ownership cases (TEST-06..TEST-09, TEST-25, TEST-26, TEST-29, TEST-30, TEST-35, TEST-36). |
| FR-05 | An authenticated user lists or views PUBLISHED events with remaining places derived from capacity minus ACTIVE registrations. DRAFT events are absent from the published list. | S1 | API list/detail and remaining-place assertions (TEST-10); UI empty-list check (TEST-11). |
| FR-06 | A participant registers for a PUBLISHED event that has not started. Persist an ACTIVE registration and reduce remaining places by one; reject full, duplicate, hidden/missing or started-event cases without adding a row. | S1 | Real API/DB and concurrent registration tests (TEST-12..16, TEST-27, TEST-28). |
| FR-07 | A participant retrieves their own registrations and each registration's status. Requests for another participant's registration return 404 without private data. | S1 | Own/foreign-registration API checks (TEST-17, TEST-18). |
| FR-08 | An organizer retrieves registrations of an event they own. Reject participants and other organizers according to the event visibility/ownership rule in D-13. | S1 | API authorized list, foreign-event and wrong-role cases (TEST-19..21). |
| FR-09 | A participant cancels their own registration; it stops consuming an ACTIVE place and can later be re-registered under BR-07. | S2 | Cancellation, ownership, capacity-release and re-registration tests in the S2 contract. |
| FR-10 | An organizer edits, closes or cancels only their own events, including permitted capacity changes. Do not allow a capacity below the ACTIVE registration count. | S2 | Allowed/rejected state transitions, ownership and capacity-boundary tests in the S2 contract. |
| FR-11 | Enforce an event's registration deadline and reject registration after the allowed deadline boundary. | S2 | Before/at/after-deadline cases once boundary/time semantics are agreed in the S2 contract. |
| FR-12 | The owning organizer records a participant's check-in only for an ACTIVE registration, once, and within the specified event window (BR-08). | S3; may start S2 | Active/inactive, duplicate, ownership and time-window tests in the check-in contract. |
| FR-13 | Persist attendance and provide an attendance report/summary for an event owned by the requesting organizer. | S3 | Saved-attendance retrieval, summary and foreign-event access tests in the reporting contract. |
| FR-14 | Show the owning organizer a summary of registered, checked-in and no-show counts. | S3 | Known-fixture count and ownership checks; agree no-show timing before implementation. |
| FR-15 | An organizer lists only their own events in every implemented status (DRAFT and PUBLISHED in S1), opens their own DRAFT and selects an event to publish or inspect registrations. Participants cannot use the organizer-only list. | S1 | API own-event list, own/foreign DRAFT and wrong-role checks (TEST-31..34). |

## 4. Business rules

Business rules are enforced in the backend service layer and, where applicable, database constraints. Hiding UI controls is not enforcement.

| ID | Required rule and boundary | Sprint | Planned verification |
|---|---|---|---|
| BR-01 | Only an ORGANIZER creates/publishes events. Capacity is an integer from 1 to 10,000; zero, negative and non-integer values are invalid. | S1 | Service/API capacity boundaries and wrong-role tests (TEST-07, TEST-08, TEST-09); DB constraint checks where applicable. |
| BR-02 | ACTIVE registrations never exceed event capacity, including competing requests for the last place. In one transaction, lock the event row before checking duplicates, counting ACTIVE registrations and inserting (D-10). | S1 | Full-event rejection (TEST-13), last-place concurrency (TEST-15) and the NFR-04 concurrency scenario. |
| BR-03 | A participant has at most one ACTIVE registration per event. Enforce the service check and a partial unique database index on `(eventId, participantId)` where status is ACTIVE. | S1 | Duplicate API case and direct database-constraint verification (TEST-14). |
| BR-04 | Registration is allowed only for a PUBLISHED event whose start time is strictly in the future. An event that has started, including `startsAt == now`, is not registrable. | S1 | DRAFT/missing and started-event rejection (TEST-27, TEST-28), using controlled fixtures/time. |
| BR-05 | Participants read only their own private registration details. Organizers manage/view registrations only for their own events. Session identity determines record access. | S1; regress later | Cross-participant and cross-organizer API checks (TEST-18, TEST-20), plus wrong-role cases. |
| BR-06 | Registration closes at the event's registration deadline. Exact equality and timezone handling must be resolved in the S2 contract before implementation. | S2 | Boundary tests under the agreed deadline semantics. |
| BR-07 | A cancelled registration frees a place. Its participant may re-register if the event still meets registration conditions; BR-03 still permits only one ACTIVE registration. | S2 | Cancel/re-register, capacity and concurrent duplicate checks. |
| BR-08 | Check-in requires an ACTIVE registration, is performed only once by the owning organizer, and occurs only within the specified event window. Exact window bounds remain a S3 contract decision. | S3; may start S2 | Status, repeat, ownership and window-boundary cases. |
| BR-09 | At creation and again at publication, `startsAt` must be strictly later than current time. Reject past/equal time with 400 `INVALID_START_TIME` without a state change. Only the owner publishes a DRAFT; republishing PUBLISHED returns 409 `ALREADY_PUBLISHED`. | S1 | Past/equal-time and publication-state cases (TEST-25, TEST-26, TEST-29, TEST-30, TEST-35, TEST-36). |

## 5. Non-functional requirements

| ID | Target / observable criterion | Practical verification | Verification sprint |
|---|---|---|---|
| NFR-01 | Every unauthenticated request to a protected endpoint is rejected with 401 and returns no private data. | API checks for protected operations with no, invalid, expired and revoked sessions. | S1; regression each later sprint |
| NFR-02 | Locally managed passwords are stored only as bcrypt hashes with cost at least 10. API responses never contain `passwordHash` or plaintext passwords. | Inspect synthetic seeded DB records and assert hash properties and response fields (including TEST-05). | S1; regression after auth changes |
| NFR-03 | Every protected route enforces authentication and applicable role/record ownership in the backend. Client-selected identity/role cannot bypass the checks. | API role/ownership tests using at least two users of each relevant role and direct requests that bypass UI controls. | S1; regression each later sprint |
| NFR-04 | For 20 concurrent participant registration requests to an eligible capacity-5 event, exactly 5 ACTIVE registrations are stored and capacity is not exceeded. | Real PostgreSQL integration test with eligible distinct participants, followed by DB count and response assertions. Keep the separate last-place TEST-15 case. | S1 |
| NFR-05 | Published-event listing has p95 response time below 500 ms with 1,000 seeded events in the local test environment. | Performance script reporting measured requests and environment; agree sample size, warm-up and request concurrency before executing the S3 acceptance check. | S3 |
| NFR-06 | Persisted application data survives an application restart. | Save a synthetic event and registration, restart the application without resetting its database, then retrieve and compare the saved records. Repeat in the deployed environment during Lab 5. | S1 locally; Lab 5 deployment verification |
| NFR-07 | All inputs are validated server-side. Client-visible errors have `{ "error": { "code": "...", "message": "..." } }` and disclose no stack trace. | Invalid/boundary-input API checks and assertions on error shape, status and sensitive fields. | S1; regression each later sprint |
| NFR-08 | The application runs from a clean clone using the README in at most 10 commands. | Teammate follows documented dependencies, environment example, migration/seed and start steps; record commands and outcome. Agree command-count convention in the foundation README. | S1 |
| NFR-09 | All 5 S1 data-loading screens show a loading indicator while waiting and a readable API-error message; list screens also show an empty-state message when no rows exist. Screens: events list, event detail, My registrations, organizer My events and event registrations. | TEST-11 for the empty published list plus a per-screen loading/empty/error manual checklist in `docs/evidence/`. | S1; UX/regression hardening S3 |

NFR-04 is a separate capacity-5 scenario; it must not replace the competing-last-place test. No result above is marked passing until the command, tested commit and actual output exist.

## 6. Assumptions and open contract details

- Campus events and users are synthetic. S1 uses seeded accounts; email/password credentials are handed off safely and are not included in the PDF or committed as real secrets.
- One account has one fixed role for the S1 scope. Broader organizer authority and account administration are not assumed.
- The application uses persistent PostgreSQL; registration counts refer to ACTIVE registrations. Future statuses do not silently change S1 counting rules.
- Current time is checked by the backend. D-12 specifies controlled service time for boundary tests; display timezone and later deadline/check-in boundary conventions must be documented in their contracts.
- Later-sprint details still to agree: permitted edit/close/cancel transitions; precise deadline equality/timezone; event check-in window; the point at which no-shows are counted; performance sampling parameters. These do not remove FR-09..14 or BR-06..08 from the baseline.
- NFR-08's command-count convention and prerequisites must be explicit in the foundation README. Do not claim that a clean-clone setup has been verified before the teammate actually runs it.

## 7. Confirmed decisions

These resolutions retain D-01..D-14 from [the kickoff decisions](decisions.md). They are confirmed product decisions; this SRS draft still requires teammate review.

| ID | Question | Agreed resolution |
|---|---|---|
| D-01 | Context | University campus seminars, workshops and activities; synthetic data. |
| D-02 | Duplicates | At most one ACTIVE registration per participant/event, using a service check and partial unique DB index. |
| D-03 | Capacity | Integer 1..10,000, consumed by ACTIVE registrations. Capacity changes are S2 and cannot reduce capacity below the ACTIVE count. |
| D-04 | Registration deadline | S1 eligibility is PUBLISHED and not started. A separate deadline field and its rules are S2. |
| D-05 | Waitlist | Explicitly excluded from product scope. |
| D-06 | Registration visibility | Participant: own registrations only. Organizer: registrations of own events only. |
| D-07 | Event lifecycle | S1 creation stores a real DRAFT; separate owner publication changes it to PUBLISHED. Only PUBLISHED events appear in the published list and accept registrations. Only an owner reads their DRAFT; organizer My events lists own events in every implemented status. Republish is a conflict. CLOSED/CANCELLED belong to S2. |
| D-08 | Auth and logout | Email/password with bcrypt cost >= 10; random opaque session token in an httpOnly, SameSite=Lax cookie. Store only its SHA-256 hash in a server-side `Session` linked to user and expiry; expiry is 1 hour. Logout deletes the row so a copied cookie is revoked; reject expired sessions. This design uses no JWT. |
| D-09 | Roles | PARTICIPANT and ORGANIZER; one role per account; seeded accounts only in S1. |
| D-10 | Concurrency | In one Prisma transaction, lock the event row with `SELECT ... FOR UPDATE` first, then check ACTIVE duplicate, count ACTIVE registrations and conditionally insert. The partial unique index protects duplicates; the row lock protects capacity. |
| D-11 | Stack and origin | React + TypeScript + Vite; Node 20 + Express + TypeScript + zod; Prisma + PostgreSQL 16; Vitest, Supertest and Playwright. Build from scratch for this group project, without copying the individual TokTickIT lab code. |
| D-12 | Start time and testing | Reject create/publish when `startsAt <= now` with 400 `INVALID_START_TIME`, leaving stored state unchanged. Service functions take `now: Date`; routes pass current time and unit tests pass a fixed time. API started-event cases use directly inserted past fixtures. |
| D-13 | Rejection codes and hidden records | Organizer registration: 403 `FORBIDDEN`. DRAFT/missing registration target: 404 `EVENT_NOT_FOUND`. Started event: 409 `EVENT_STARTED`. Foreign participant registration: 404 `NOT_FOUND`. A non-owner organizer cannot discover a DRAFT through read/publish/registration-list operations (404 `EVENT_NOT_FOUND`); a caller with the wrong role on a role-restricted route gets 403 `FORBIDDEN` for every event ID, which reveals nothing (check order: 401, then role, then ownership); an owner-only operation on a PUBLISHED event by a non-owner returns 403 `FORBIDDEN`. The published event remains visible only under the authenticated browsing policy. |
| D-14 | Test isolation and seed | Integration/concurrency use separate `DATABASE_URL_TEST`, never the development database; run integration files sequentially (`fileParallelism: false`) and truncate test tables before each test. TEST-15 creates its concurrency inside that test. E2E (TEST-22..TEST-24) runs as its own command against its own database (`DATABASE_URL_E2E`), reset and seeded before each run, never together with the integration suite. Compute seeded `startsAt` relative to seed-run time, always in the future. |

The D-08 logout ambiguity was resolved by server-side revocation rather than cookie deletion alone. The D-10 capacity ambiguity was resolved by locking before the count/insert. PR #11 resolved the real-DRAFT lifecycle, start-time boundaries, exact rejection codes and test isolation (D-07, D-12..D-14); IDs were added rather than renumbered.

## 8. Sources, ownership and change control

| Source | Use in this baseline |
|---|---|
| Course `project_deliverable_1_v1.pdf`, Sections 2, 3.1 and 4.1 | S1 outcome and Part A coverage: stakeholder problem, actors, scope/exclusions, FR/BR/NFR, assumptions and decisions. |
| Course `group_work_specs_v1.pdf`, Theme 3 and Section 8.1 | Whole-product event scope, Sprint 1 example, role/ownership rules and baseline discipline. |
| [Master plan](../deliverable1-plan.md), Sections 1, 3 and 5 | Stable requirement IDs, sprint scope, existing numeric targets and planned verification IDs. |
| [Kickoff decisions](decisions.md), D-01..D-14 | Confirmed resolutions of significant ambiguities. |
| [Team workflow](team-workflow.md) and [Issue plan](sprints/sprint-1/issue-plan.md) | Author A prepares SRS; author B reviews it; later artifacts have separate ownership. |

Issue #12 owns this SRS. Feature inventory/traceability, system SDS, sprint plan and detailed S1 contracts are separate Issues; this document does not claim those outputs are complete. Keep stable IDs and record any agreed revision with its reason before implementation. Planned tests, actual test results and teammate approval must remain distinguishable.
