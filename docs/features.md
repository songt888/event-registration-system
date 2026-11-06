# Feature Inventory

Event Registration and Attendance System | CPE 334, Semester 1/2026 | Theme 3

Prepared for Issue #13. This inventory allocates the whole-product baseline in [the SRS](srs.md) to features and completion sprints. It describes planned behavior, not implementation or test results. Detailed feature AC/STS belong to the engineering contracts; the requirement-by-requirement traceability matrix is Issue #14.

## 1. Features and dependencies

Dependencies below are direct product dependencies; authentication/authorization from F-01 applies to every protected feature. Sprint 1 implementation also waits for the foundation in Issue #3 and its reviewed contracts.

| ID | Feature | Observable completion behavior | Related requirements | Completion sprint | Direct dependencies |
|---|---|---|---|---|---|
| F-01 | Authentication foundation | Seeded accounts log in, retrieve current-user identity and log out. Expired/revoked sessions and wrong-role requests are rejected by the backend; passwords remain hashed and private. | FR-01, FR-02, FR-03; NFR-01, NFR-02, NFR-03, NFR-07 | S1 | Foundation: schema, seed and test runner. |
| F-02 | Publish event | An organizer creates an owned DRAFT with valid capacity and future start time, lists/opens their own events, and separately publishes their DRAFT. Reject invalid input, foreign access and republishing. | FR-04, FR-15; BR-01, BR-09; NFR-03, NFR-07, NFR-09 | S1 | F-01 for protected routes. |
| F-03 | Browse events | Signed-in users list/view PUBLISHED events and remaining places. The published list hides DRAFTs; the UI handles loading, an empty list and API errors. | FR-05; NFR-09 | S1 | F-02 for published events and the shared detail definition; F-01 for access. |
| F-04 | Register for event | A participant creates a persisted ACTIVE registration for an eligible event. Reject full, duplicate, DRAFT/missing, started-event and wrong-role attempts; competing requests cannot exceed capacity. | FR-06; BR-02, BR-03, BR-04; NFR-04, NFR-07, NFR-09 | S1 | F-01, F-03; F-02 transitively. |
| F-05 | My registrations | A participant retrieves their own saved registrations and statuses, with loading/empty/error states. Another participant's private registration is not returned. | FR-07; BR-05; NFR-03, NFR-09 | S1 | F-04. |
| F-06 | Event registrations (organizer) | The organizer selects an event from their own events and retrieves its registrations. Reject other organizers and participants; show loading/empty/error states. | FR-08, FR-15; BR-05; NFR-03, NFR-09 | S1 | F-02 for owned-event selection; F-04 for registrations. |
| F-07 | Cancel registration | A participant cancels their own ACTIVE registration, freeing its place, and can register again when the event remains eligible. Preserve the one-ACTIVE-registration rule. | FR-09; BR-03, BR-05, BR-07 | S2 | F-04, F-05. |
| F-08 | Manage event | An owner edits, closes or cancels their event and changes capacity without reducing it below the ACTIVE count. Cancelled events reject registration. | FR-10; BR-01, BR-02, BR-05; D-03 | S2 | F-02, F-06. |
| F-09 | Registration deadline | Apply an event's registration deadline alongside existing eligibility rules and reject registration outside the permitted boundary. | FR-11; BR-04, BR-06 | S2 | F-02, F-04. |
| F-10 | Check-in | The owning organizer records check-in once for an ACTIVE registration within the agreed event window; reject invalid status, repeat, foreign-owner and out-of-window attempts. | FR-12; BR-05, BR-08; NFR-03 | S3; starts S2 | Start: F-06. Completion: F-06, F-07. |
| F-11 | Attendance record and report | Persist and retrieve attendance for the requesting organizer's event and report its registered, checked-in and no-show counts under agreed counting rules. | FR-13; BR-05; NFR-03, NFR-06 | S3 | F-10. |
| F-12 | Organizer summary dashboard | Show an organizer registered, checked-in and no-show totals across their own events, excluding other organizers' private records. | FR-14; BR-05; NFR-03 | S3 | F-11. |
| F-13 | Hardening, UX and regression | Verify the list-performance target, repeat persistence and UI-state checks, run regression, and fix/re-test UAT defects. Include the S3 login-rate-limiting hardening identified in the system SDS; specify its policy before implementation. | NFR-05, NFR-06, NFR-09; regression of applicable baseline FR/BR/NFR | S3 | Integrated F-01 through F-12; released versions and UAT findings where applicable. |

The S1 path is authentication -> publication -> browsing -> registration -> participant/organizer retrieval. F-02's red tests and service work may proceed alongside F-01 after the foundation; connecting protected F-02 routes waits for `requireSession` and `requireRole`. F-05 and F-06 can proceed in parallel after F-04.

F-02 owns the full definition of `GET /api/events/:id`, including published/DRAFT visibility. F-03 consumes that definition; its contract must refer to it rather than define a competing endpoint contract.

## 2. Cross-cutting responsibilities and verification allocation

A later hardening feature does not defer Sprint 1 quality obligations. These responsibilities apply wherever the feature uses the relevant layer.

| Responsibility | Requirement IDs | Establishment and planned verification |
|---|---|---|
| Session security, password protection and backend permissions | NFR-01, NFR-02, NFR-03 | Established by F-01 in S1; role/ownership checks verified for each protected feature and repeated during sprint regression. |
| Capacity under concurrency | NFR-04 | Established and verified in F-04/S1, including both the last-place case and the distinct 20-participant/capacity-5 scenario; no test design is redefined here. |
| Server validation and safe error responses | NFR-07 | Established in the S1 API foundation/authentication flow and verified for every applicable feature; retained in later regression. |
| Persistent data and reproducible local setup | NFR-06, NFR-08 | Foundation/README responsibility in S1; fresh-clone setup and restart/retrieval checks in S1 QA. NFR-06 is also verified for deployment in Lab 5 and revisited in F-13. |
| Shared loading, empty and error states | NFR-09 | Required on all five S1 data-loading screens within F-02 through F-06; verified in S1 QA and revisited in F-13 for hardening. |
| Published-list performance | NFR-05 | Measured in F-13/S3 against the SRS target: p95 below 500 ms with 1,000 events; measurement parameters agreed before execution. |

## 3. Scope boundaries and remaining elaboration

- Completion allocation is S1: F-01 through F-06; S2: F-07 through F-09; S3: F-10 through F-13. F-10 starts in S2 and has one completion allocation, S3.
- Cancellation, deadline rules, check-in and attendance/reporting are future features, not omissions from the whole-product baseline. Waitlists remain excluded (D-05); self-registration, password recovery and advanced account administration have no committed feature allocation.
- The S2/S3 contracts still need exact event-edit/close/cancel transitions, cancellation timing, deadline equality/timezone, check-in window, no-show timing and performance sampling. The login-rate-limiting policy also needs its S3 contract. Do not invent these rules in implementation.
- Docker/CI/CD/GCP delivery is Lab 5 work on the same product, not an extra S1 feature. Keep lab assessment Issues/evidence separate from unrelated feature work.
- Every baseline FR, BR and important NFR has a feature or named responsibility above. Detailed AC/verification mapping, coverage gaps and approved-change records belong to `docs/traceability.md` in Issue #14; this inventory does not claim that artifact is complete.

## 4. Sources and change control

Use [the SRS](srs.md) for stable FR/BR/NFR, [kickoff decisions](decisions.md) for D-01 through D-14, [the master plan](../deliverable1-plan.md) Section 4 for feature allocation, and [the three-sprint plan](sprints/plan.md) for dependencies and completion outcomes. [The system SDS](system-sds.md) defines shared design and the planned S3 rate-limiting hardening; [the Issue plan](sprints/sprint-1/issue-plan.md) and [team workflow](team-workflow.md) define ownership and integration order.

Preserve IDs and record justified changes before implementation. A feature is complete only when its agreed contract and Product Definition of Done have real verification and teammate-reviewed integration evidence.
