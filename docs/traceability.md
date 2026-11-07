# Requirements and Verification Traceability

Event Registration and Attendance System | CPE 334, Semester 1/2026 | Issue #14

This matrix maps the whole-product [SRS](srs.md) to [features](features.md), completion/verification sprints and the current planned acceptance/test skeleton in [the master plan](../deliverable1-plan.md), Section 5. It is a planning baseline, not an execution-results table. The [F-01 contract](sprints/sprint-1/f-01-auth.md) now elaborates authentication; other S1 contracts, executable tests and result files remain pending. Contract content is not execution evidence.

## 1. Reading the matrix

- An AC/test listed below is an existing planned reference, not a claim that its detailed STS or implementation exists. The matching numbered pairs are retained; no ID is renumbered.
- `Pending contract` means that the responsible feature contract must elaborate the behavior and verification before implementation. A partial skeleton must not be presented as full requirement coverage.
- S1 features complete in Sprint 1. Later requirements retain their feature/sprint allocation without invented AC/test IDs; F-10 starts in S2 and completes in S3.
- Named foundation/QA responsibilities cover setup and shared NFR checks where an application feature alone does not. All protected features inherit F-01 authentication and applicable authorization.

## 2. Functional requirements

| Requirement | Feature or responsibility | Sprint | Existing planned AC | Existing planned TEST | Coverage / remaining work |
|---|---|---|---|---|---|
| FR-01 Login | F-01 | S1 | AC-01, AC-02; AC-24 UI | TEST-01, TEST-02; TEST-24 | Login success/failure elaborated in the F-01 contract (#17); executable verification pending. |
| FR-02 Logout/revocation | F-01 | S1 | AC-04; AC-24 UI | TEST-04; TEST-24 | Replayed cookie rejection belongs in the API case (D-08); specified in the F-01 contract (#17); executable verification pending. |
| FR-03 Current-user identity | F-01 | S1 | AC-03 (no session); AC-01 returns login user; AC-39 authenticated current user | TEST-03; TEST-01; TEST-39 | F-01 contract specifies exact id/name/role response; execution pending. |
| FR-04 Create DRAFT/publish own event | F-02 | S1 | AC-06, AC-07, AC-08, AC-09, AC-25, AC-26, AC-29, AC-30, AC-35, AC-36 | TEST-06, TEST-07, TEST-08, TEST-09, TEST-25, TEST-26, TEST-29, TEST-30, TEST-35, TEST-36 | Creation/publication, role, ownership and time skeleton; boundary/matrix gaps below; contract pending #18. |
| FR-05 Published-event browse/detail | F-03; F-02 owns shared detail definition | S1 | AC-10 (list), AC-11 (empty UI) | TEST-10, TEST-11 | Partial: positive PUBLISHED-detail behavior is not an explicit AC in the skeleton; resolve in #18, referenced by #19. |
| FR-06 Register | F-04 | S1 | AC-12, AC-13, AC-14, AC-15, AC-16, AC-27, AC-28 | TEST-12, TEST-13, TEST-14, TEST-15, TEST-16, TEST-27, TEST-28 | Valid, full, duplicate, last-place, wrong-role, hidden/missing and started-event skeleton; contract pending #20. |
| FR-07 Own registrations | F-05 | S1 | AC-17, AC-18 | TEST-17, TEST-18 | Own retrieval/foreign-record rejection skeleton; statuses and UI details elaborated in #21. |
| FR-08 Organizer registration list | F-06 | S1 | AC-19, AC-20, AC-21 | TEST-19, TEST-20, TEST-21 | Owner list, other-owner PUBLISHED rejection and wrong-role cases; complete DRAFT/access matrix in #21. |
| FR-09 Cancel/re-register | F-07 | S2 | Pending S2 contract | Pending S2 contract | Planned future coverage; retain BR-07 and ownership. |
| FR-10 Owner event management/capacity change | F-08 | S2 | Pending S2 contract | Pending S2 contract | Planned future coverage; define transitions and capacity-count boundary before implementation. |
| FR-11 Registration deadline | F-09 | S2 | Pending S2 contract | Pending S2 contract | Planned future coverage; equality/timezone unresolved. |
| FR-12 Check-in | F-10 | S3; starts S2 | Pending check-in contract | Pending check-in contract | Planned future coverage; ACTIVE/once/owner/window conditions remain required. |
| FR-13 Attendance/report | F-11 | S3 | Pending S3 contract | Pending S3 contract | Planned future coverage; saved attendance and owner report. |
| FR-14 Organizer summary | F-12 | S3 | Pending S3 contract | Pending S3 contract | Planned future coverage; own-event totals and no-show timing. |
| FR-15 Own-event list and DRAFT access | F-02, F-06 | S1 | AC-31, AC-32, AC-33, AC-34 | TEST-31, TEST-32, TEST-33, TEST-34 | Own/foreign DRAFT and own-event-list skeleton; shared detail owned by #18; selection used by #21. |

## 3. Business rules

| Requirement | Feature or responsibility | Sprint | Existing planned AC | Existing planned TEST | Coverage / remaining work |
|---|---|---|---|---|---|
| BR-01 Organizer-only publication; valid capacity | F-02; F-08 capacity changes later | S1; S2 extension | AC-06, AC-07, AC-08, AC-09, AC-25 | TEST-06, TEST-07, TEST-08, TEST-09, TEST-25 | Partial: skeleton has invalid capacity samples and create-role checks; upper bound 10,000 and publication access matrix need elaboration (#18). |
| BR-02 Never exceed capacity | F-04; F-08 capacity changes later | S1; S2 extension | AC-12, AC-13, AC-15; dedicated NFR-04 AC pending #20 | TEST-12, TEST-13, TEST-15; TEST-37 reference | Last-place and capacity-5 scenarios are distinct. Row-lock implementation/DB assertions belong to #20; S2 must also prevent reducing capacity below ACTIVE count. |
| BR-03 At most one ACTIVE registration | F-04; F-07 cancellation/re-registration later | S1; S2 extension | AC-14 | TEST-14 | API rejection plus partial unique-index verification planned; S2 adds cancel/re-register behavior. |
| BR-04 Only PUBLISHED, not-started registration | F-04; F-09 deadline extension | S1; S2 extension | AC-12, AC-27, AC-28 | TEST-12, TEST-27, TEST-28 | Skeleton covers valid, DRAFT/missing and started cases; exact start-time equality must be explicit in #20. |
| BR-05 Own-record access | F-05, F-06; F-07, F-08, F-10, F-11, F-12 retain ownership | S1; regress S2/S3 | AC-18, AC-19, AC-20, AC-21; related AC-26, AC-32, AC-33 | TEST-18, TEST-19, TEST-20, TEST-21; TEST-26, TEST-32, TEST-33 | Representative ownership/role checks; full protected-operation matrix still needs contract coverage. |
| BR-06 Deadline closes registration | F-09 | S2 | Pending S2 contract | Pending S2 contract | Future rule retained; no fabricated boundary/IDs. |
| BR-07 Cancellation frees place/re-registration | F-07 | S2 | Pending S2 contract | Pending S2 contract | Future rule retained; preserve BR-03. |
| BR-08 ACTIVE/once/owner/window check-in | F-10 | S3; starts S2 | Pending check-in contract | Pending check-in contract | Future rule retained; exact event window unresolved. |
| BR-09 Future start at create/publish; owner/state rules | F-02 | S1 | AC-25, AC-26, AC-29, AC-30, AC-35, AC-36 | TEST-25, TEST-26, TEST-29, TEST-30, TEST-35, TEST-36 | Create equality is explicit; publish-at-equality needs contract elaboration. No state change on rejection. |

## 4. Non-functional requirements

| Requirement | Feature or responsibility | Verification sprint | Existing planned AC | Existing planned TEST / method | Coverage / remaining work |
|---|---|---|---|---|---|
| NFR-01 No-session rejection without private data | F-01; every protected feature | S1; regress S2/S3 | AC-03, AC-04, AC-09 (examples); AC-40, AC-42 (F-01) | TEST-03, TEST-04, TEST-09; TEST-40, TEST-42 | Partial: enumerate no/invalid/expired/revoked-session checks across protected routes in #17..#21. |
| NFR-02 Password hashes/private responses | F-01; response protection in all API features | S1; auth regression | AC-01 (login response), AC-05 (stored hash), AC-39 (current-user response) | TEST-01, TEST-05, TEST-39 | Partial: bcrypt cost >= 10 and sensitive-field absence across responses must be asserted in the contracts. |
| NFR-03 Backend role/ownership enforcement | F-01 foundation; all protected features | S1; regress S2/S3 | AC-08, AC-16, AC-18, AC-20, AC-21, AC-26, AC-32, AC-33, AC-34 (samples); AC-42 (shared guards) | Matching TEST-08, TEST-16, TEST-18, TEST-20, TEST-21, TEST-26, TEST-32, TEST-33, TEST-34; TEST-42 | Partial: complete the SDS role/ownership matrix using D-13 check order, including direct API requests bypassing UI. |
| NFR-04 20 participants/capacity 5 -> exactly 5 ACTIVE | F-04 | S1 | Dedicated AC pending #20; AC-15 is the different last-place case | TEST-37 reference; TEST-15 stays separate | Scenario referenced in the approved plan/SRS/SDS; full AC/STS belongs to B's #20 contract. This matrix does not assign a new AC. |
| NFR-05 List p95 < 500 ms / 1,000 events | F-13; F-03 list responsibility | S3 | Pending S3 contract | Performance script planned; no ID assigned | Agree sampling/warm-up/concurrency; retain SRS numeric target. |
| NFR-06 Data survives restart | Foundation/persistence; F-11, F-13 and persisted S1 journeys | S1 local; Lab 5 deployed; S3 regression | No dedicated AC in current skeleton | Planned restart-and-retrieve check in 9.4 QA; deployment repeat | API/DB persistence samples and AC-22 do not prove survival across restart; actual evidence pending. |
| NFR-07 Server validation/uniform safe errors | F-01, F-02, F-04; every API feature | S1; regress S2/S3 | AC-02, AC-07, AC-13, AC-14, AC-16, AC-18, AC-26, AC-27, AC-28, AC-29, AC-30, AC-35, AC-36 (samples); AC-41 (login validation) | Matching numbered tests | Partial: response-code samples do not alone cover uniform shape, all invalid input or absence of stack traces. |
| NFR-08 README setup in <= 10 commands | Foundation/README: Issue #3 and its fresh-clone review | S1 | No dedicated AC in current skeleton | Planned fresh-clone command-count check; repeat in 9.4 QA | Named responsibility; agree command-count convention and retain the actual commands/outcome. No invented feature/test ID. |
| NFR-09 Five S1 screens: loading/empty/error | F-02, F-03, F-04, F-05, F-06; F-13 hardening later | S1; S3 hardening/regression | AC-11 covers only empty published list | TEST-11 plus planned five-screen manual checklist in 9.4 QA | Partial: loading/error and other list-empty states require the documented checklist/contracts; do not defer S1 obligation to F-13. |

## 5. Supplemental UI/end-to-end coverage

These journeys supplement service/API/DB checks; they do not replace negative authorization or concurrency tests.

| Planned AC / TEST | Journey | Features / requirements supplemented | Planned ownership |
|---|---|---|---|
| AC-22 / TEST-22 | Organizer creates/publishes; participant registers and sees it in My registrations; owner sees registrant. | F-01 through F-06; FR-01, FR-04, FR-06, FR-07, FR-08, FR-15; persisted UI journey | A, sub-task 9.1 (#37) |
| AC-23 / TEST-23 | Full-event UI rejection; My registrations unchanged. | F-03, F-04, F-05; FR-06, FR-07, BR-02 | B, sub-task 9.2 (#38) |
| AC-24 / TEST-24 | Login shows name/role; logout then protected navigation returns to login. | F-01; FR-01, FR-02, FR-03 UI identity only | A, sub-task 9.1 (#37) |

## 6. Coverage gaps and planned closure

Every FR/BR/NFR has a feature or named responsibility and sprint above; this is allocation coverage, not complete AC/STS or execution coverage. No baseline requirement is removed to close a gap.

| Gap / limitation | Affected scope | Planned closure / owner |
|---|---|---|
| Detailed S1 feature contracts and executable tests are absent at this checkpoint. | All S1 mappings; none is an executed pass. | Issue #2 shares: A #17/#18, B #19/#20/#21, before feature implementation. |
| Positive published-event detail lacks a dedicated AC in the skeleton. Authenticated current-user response is now AC-39/TEST-39 in F-01. | FR-05; FR-03 contract elaborated, not executed | A elaborates shared detail in #18; B #19 refers to that definition. Preserve IDs; F-01 adds AC/TEST-39..42 for current user, expiry, validation and guards, leaving 37 to F-04 and 38 to B's F-03 draft. |
| Representative role/ownership tests are not the full route matrix; invalid/expired sessions, wrong-role publication and foreign-DRAFT registration-list cases need explicit coverage. | FR-04, FR-08; BR-01, BR-05; NFR-01, NFR-03; D-13 | Contract authors #17..#21 map all applicable SDS permissions. Preserve session -> role -> ownership precedence. |
| Existing boundary samples do not explicitly cover every approved bound. | BR-01 capacity maximum; BR-04 `startsAt == now`; BR-09 publish equality | #18/#20 elaborate approved boundaries without inventing changed limits. |
| The capacity-5 concurrency scenario has a TEST-37 reference but no full dedicated AC/STS yet. | NFR-04, BR-02 | B defines in #20; QA #40 later runs TEST-15 and TEST-37 separately, five times each. |
| Hash-cost/response privacy and uniform safe-error assertions need complete contract coverage. | NFR-02, NFR-07 | Relevant contract authors add explicit assertions/verification; passing status codes alone are insufficient. |
| Restart, setup count and all five UI-state checks are planned, not executed or fully detailed in the AC skeleton. | NFR-06, NFR-08, NFR-09 | Foundation author/reviewer and B's #40 QA prepare the named checks; retain actual output/checklists and label manual evidence. |
| Later-sprint contracts and measurement parameters are intentionally not fully elaborated yet. | FR-09..FR-14, BR-06..BR-08, NFR-05; later changes to existing rules | S2/S3 contracts before implementation; resolve deadline/check-in/no-show/state boundaries and performance sampling. |
| No application test files, commands/results or release evidence exist yet. | Actual verification for all rows | Implement under contracts; maintain `docs/evidence/ac-test-results.md` with actual file/name, command, tested commit and pass/fail/skip result during QA/release. |

## 7. Approved changes and retained decisions

This table records changes already visible in the merged baseline; it does not approve new scope in this traceability draft. Preserve source history rather than renumber IDs.

| Source / recorded evidence | Change or clarification | Traceability effect |
|---|---|---|
| Kickoff partner decisions, `docs/decisions.md` D-08/D-10 | Server-side session revocation replaces cookie deletion/JWT assumptions; lock the event row before count/insert. | FR-02 / AC-04 / TEST-04 and BR-02 / AC-15 / TEST-15 retain their IDs and require the agreed behavior. |
| PR #11, merge `5169fb2`; D-07, D-12, D-13, D-14 | Real DRAFT/publication and private-DRAFT access; FR-15 own-event list; future-start rule BR-09; exact errors, split registration negatives; integration-test isolation. | Preserve added FR-15, BR-09 and AC/TEST-25..36. AC-16 remains wrong-role; AC-27/28 distinguish DRAFT/missing and started targets. |
| PR #47, merge `b9db4f4`; revised D-14 and workflow | E2E uses its own `DATABASE_URL_E2E`; shared detail contract owned by F-02; QA/build/NFR checks, release-before-final-evidence and preserved merge/TDD history clarified. | Keep tests isolated; route FR-05 detail elaboration to #18; retain named NFR QA responsibilities and evidence from the tagged release. No feature is removed. |
| PR #49, merge `b4477c1`; review fix `0ae053b` | D-13 checks session, then role, then ownership; wrong-role organizer-route calls return 403 for every event ID. NFR-04 uses separate TEST-37. | AC-21 / TEST-21 wording clarified; TEST-15 remains last-place; TEST-37's full AC/STS is still #20 work. |
| SRS PR #48, merge `bf728a2` | Whole-product requirements documented, retaining the approved current-user fields; review aligns D-13 precedence, E2E isolation and TEST-37 references. | Requirement IDs remain FR-01..15, BR-01..09 and NFR-01..09; planned verification is not execution evidence. |
| Feature inventory PR #50, merge `79e0dcd` | F-01..F-13 allocated with dependencies and cross-cutting responsibilities. | S1 F-01..F-06; S2 F-07..F-09; S3 F-10..F-13 (F-10 starts S2). S1 NFR duties stay in S1. |

## 8. Sources and updating actual results

Use [the SRS](srs.md), [feature inventory](features.md), [decisions](decisions.md), [system SDS](system-sds.md), [sprint plan](sprints/plan.md), [Issue plan](sprints/sprint-1/issue-plan.md) and [team workflow](team-workflow.md) with the master-plan skeleton linked above. Issue #14 owns this matrix; contract authors update links when specifications are elaborated. Do not invent a test file or passing count to fill an empty cell.

During implementation/QA, add actual test file/name and result to the single results artifact `docs/evidence/ac-test-results.md`, preserving links back to this baseline. Record automated vs manual verification, command, tested commit, pass/fail/skip counts and incomplete coverage. The Product Definition of Done and release evidence determine completion; a populated planning matrix does not.
