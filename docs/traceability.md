# Requirements and Verification Traceability

Event Registration and Attendance System | CPE 334, Semester 1/2026 | Issue #14

This matrix maps the whole-product [SRS](srs.md) to [features](features.md), completion/verification sprints and the current planned acceptance/test skeleton in [the master plan](../deliverable1-plan.md), Section 5. The S1 contracts in `docs/sprints/sprint-1/` (F-01 #17, F-02 #18, F-03 #19, F-04 #20, F-05/F-06 #21) elaborate every S1 row. Every S1 test now exists and passes: the actual file, test name and result of each AC are in the single results artifact [results](evidence/ac-test-results.md) (51 of 51 AC pass on `sprint-1-staging` at `c1ee1ce`, QA Issue #40; NFR checks in its section 3). S2/S3 rows remain a planning baseline.

## 1. Reading the matrix

- For S1 rows the last column states the verified result and points to the results file; that file, not this matrix, is the evidence. For S2/S3 rows, listed references are planned only. The matching numbered pairs are retained; no ID is renumbered.
- `Pending contract` means that the responsible feature contract must elaborate the behavior and verification before implementation. A partial skeleton must not be presented as full requirement coverage.
- S1 features complete in Sprint 1. Later requirements retain their feature/sprint allocation without invented AC/test IDs; F-10 starts in S2 and completes in S3.
- Named foundation/QA responsibilities cover setup and shared NFR checks where an application feature alone does not. All protected features inherit F-01 authentication and applicable authorization.

## 2. Functional requirements

| Requirement | Feature or responsibility | Sprint | Existing planned AC | Existing planned TEST | Coverage / remaining work |
|---|---|---|---|---|---|
| FR-01 Login | F-01; F-13 rate limit | S1; S3 | AC-01, AC-02; AC-24 UI; S3 draft AC-137, AC-138, AC-139 | TEST-01, TEST-02; TEST-24; S3 draft TEST-137, TEST-138, TEST-139 | Verified: listed S1 AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). S3: D-38 login rate limit drafted in #206 (`docs/sprints/sprint-3/f-13-hardening.md`); planned only; no test has run. |
| FR-02 Logout/revocation | F-01 | S1 | AC-04; AC-24 UI | TEST-04; TEST-24 | Replayed cookie rejected after logout (D-08). Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). |
| FR-03 Current-user identity | F-01 | S1 | AC-03 (no session); AC-01 returns login user; AC-39 authenticated current user | TEST-03; TEST-01; TEST-39 | Exact id/name/role response. Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). |
| FR-04 Create DRAFT/publish own event | F-02 | S1 | AC-06, AC-07, AC-08, AC-09, AC-25, AC-26, AC-29, AC-30, AC-35, AC-36; AC-50 | TEST-06, TEST-07, TEST-08, TEST-09, TEST-25, TEST-26, TEST-29, TEST-30, TEST-35, TEST-36; TEST-50 | Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). |
| FR-05 Published-event browse/detail | F-03; F-02 owns shared detail definition | S1 | AC-10 (list), AC-11 (empty UI); AC-49; AC-38 | TEST-10, TEST-11; TEST-49; TEST-38 | Shared published detail is F-02 AC-49/TEST-49. Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). |
| FR-06 Register | F-04 | S1; CR-01 in Lab 7 | AC-12, AC-13, AC-14, AC-15, AC-16, AC-27, AC-28; AC-43, AC-44; AC-57..AC-61 | TEST-12, TEST-13, TEST-14, TEST-15, TEST-16, TEST-27, TEST-28; TEST-43, TEST-44; TEST-57..TEST-61 | Verified: AC-12..44 listed here pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). Verified at `4d51c76` in L7-04 (#136): TEST-57 through TEST-61 passed ([E7-B2](labs/lab-07/evidence/l7-04/E7-B2-green.txt), [E7-B3](labs/lab-07/evidence/l7-04/E7-B3-regression.txt)). |
| FR-07 Own registrations | F-05 | S1 | AC-17, AC-18; AC-45, AC-46 | TEST-17, TEST-18; TEST-45, TEST-46 | Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). |
| FR-08 Organizer registration list | F-06 | S1 | AC-19, AC-20, AC-21; AC-47, AC-48 | TEST-19, TEST-20, TEST-21; TEST-47, TEST-48 | Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). |
| FR-09 Cancel/re-register | F-07 | S2 | AC-73..AC-80 | TEST-73..TEST-80 | Agreed contract in #200. Planned coverage only. No Sprint 2 test has run. |
| FR-10 Owner event management/capacity change | F-08 | S2 | AC-90..AC-109 | TEST-90..TEST-109 | Agreed contract in #200 (edit AC-90, AC-93..AC-96; close AC-97, AC-98; cancel and cascade AC-99..AC-101, AC-108, AC-109; owner-only AC-102, AC-103; publish unchanged AC-104). Planned coverage only. No Sprint 2 test has run. |
| FR-11 Registration deadline | F-09 | S2 | AC-81..AC-89 | TEST-81..TEST-89 | Agreed contract in #200. Planned coverage only. No Sprint 2 test has run. |
| FR-12 Check-in | F-10 | S3; starts S2 | AC-110..AC-119 | TEST-110..TEST-119 | Contract 1.1 merged (#224). Red #240 (`a4a14cb`: 8 failed / 143 passed, every failure the missing route) and green #242 (`b758793`, merged `2d24701`: `npm test` 153 passed (153), E2E 28 passed with TEST-119 green) - verified independently by A on a disposable PostgreSQL 16. |
| FR-13 Attendance/report | F-11 | S3 | AC-120..AC-127 | TEST-120..TEST-127 | Contract draft in #206 (`docs/sprints/sprint-3/f-11-attendance.md`), pending A's review; implementation after Deliverable 2. Planned coverage only; no test has run. |
| FR-14 Organizer summary | F-12 | S3 | AC-130..AC-136 | TEST-130..TEST-136 | Contract draft in #206 (`docs/sprints/sprint-3/f-12-dashboard.md`), pending B's review. D-37 counting across own events with the per-event D-36 window; planned coverage only; no test has run. |
| FR-15 Own-event list and DRAFT access | F-02, F-06 | S1 | AC-31, AC-32, AC-33, AC-34 | TEST-31, TEST-32, TEST-33, TEST-34 | Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). |

## 3. Business rules

| Requirement | Feature or responsibility | Sprint | Existing planned AC | Existing planned TEST | Coverage / remaining work |
|---|---|---|---|---|---|
| BR-01 Organizer-only publication; valid capacity | F-02; F-08 capacity changes later | S1; S2 extension | AC-06, AC-07, AC-08, AC-09, AC-25; AC-50 | TEST-06, TEST-07, TEST-08, TEST-09, TEST-25; TEST-50 | Capacity 1..10,000 boundaries and the publication access matrix. Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). Capacity changes are S2 (F-08). |
| BR-02 Never exceed capacity | F-04; F-08 capacity changes later | S1; S2 extension | AC-12, AC-13, AC-15; AC-37; F-08 draft AC-91, AC-92 | TEST-12, TEST-13, TEST-15; TEST-37; F-08 draft TEST-91, TEST-92 | S1 last-place (AC-15) and capacity-5 (AC-37) are separate and verified at `c1ee1ce`. F-08 capacity-floor behavior is planned only; no S2 test has run. |
| BR-03 At most one ACTIVE registration | F-04; F-07 cancellation/re-registration | S1; S2 extension | AC-14; draft AC-77 | TEST-14; draft TEST-77 | S1 API rejection and partial unique index verified at `c1ee1ce`. F-07 re-registration is planned only; no S2 test has run. |
| BR-04 Only PUBLISHED, not-started registration | F-04; F-09 deadline extension | S1; S2 extension | AC-12, AC-27, AC-28; draft AC-81..AC-89 | TEST-12, TEST-27, TEST-28; draft TEST-81..TEST-89 | S1 valid, DRAFT/missing and started cases verified at `c1ee1ce`. F-09 deadline behavior is planned only; no S2 test has run. |
| BR-05 Own-record access | F-05, F-06; F-07, F-08, F-10, F-11, F-12 retain ownership | S1; regress S2/S3 | AC-18, AC-19, AC-20, AC-21, AC-48; related AC-26, AC-32, AC-33; draft AC-74, AC-75 | TEST-18, TEST-19, TEST-20, TEST-21, TEST-48; TEST-26, TEST-32, TEST-33; draft TEST-74, TEST-75 | S1 representative ownership checks verified at `c1ee1ce`. S2 ownership checks are planned only; no S2 test has run. |
| BR-06 Deadline closes registration | F-09 | S2 | AC-81..AC-89 | TEST-81..TEST-89 | Agreed contract in #200. Planned coverage only. No Sprint 2 test has run. |
| BR-07 Cancellation frees place/re-registration | F-07 | S2 | AC-73, AC-77..AC-79 | TEST-73, TEST-77..TEST-79 | Agreed contract in #200. Planned coverage only. No Sprint 2 test has run. |
| BR-08 ACTIVE/once/owner/window check-in | F-10 | S3; starts S2 | AC-111..AC-116 | TEST-111..TEST-116 | Window fixed by D-36; contract 1.1 merged (#224). Passed on `2d24701` (part of the verified 153/153 suite run). |
| BR-09 Future start at create/publish; owner/state rules | F-02 | S1 | AC-25, AC-26, AC-29, AC-30, AC-35, AC-36 | TEST-25, TEST-26, TEST-29, TEST-30, TEST-35, TEST-36 | Past and equal start times on create and publish; no state change on rejection. Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). |
| BR-10 No two ACTIVE registrations less than 120 minutes apart (CR-01) | F-04 | S1 maintenance (Lab 7) | AC-57, AC-58, AC-59, AC-60, AC-61 | TEST-57, TEST-58, TEST-59, TEST-60, TEST-61 | Verified at `4d51c76` in L7-04 (#136): TEST-57 through TEST-61 passed ([E7-B2](labs/lab-07/evidence/l7-04/E7-B2-green.txt), [E7-B3](labs/lab-07/evidence/l7-04/E7-B3-regression.txt)). |

## 4. Non-functional requirements

| Requirement | Feature or responsibility | Verification sprint | Existing planned AC | Existing planned TEST / method | Coverage / remaining work |
|---|---|---|---|---|---|
| NFR-01 No-session rejection without private data | F-01; every protected feature | S1; regress S2/S3 | AC-03, AC-04, AC-09 (examples); AC-40, AC-42 (F-01); AC-38, AC-43, AC-45, AC-47; draft S2 AC-74, AC-87, F-08 AC-103 | TEST-03, TEST-04, TEST-09; TEST-40, TEST-42; TEST-38, TEST-43, TEST-45, TEST-47; draft TEST-74, TEST-87, F-08 TEST-103 | S1 cases verified at `c1ee1ce`; proposed S2 protected-route cases are planned only. |
| NFR-02 Password hashes/private responses | F-01; response protection in all API features | S1; auth regression | AC-01 (login response), AC-05 (stored hash), AC-39 (current-user response) | TEST-01, TEST-05, TEST-39 | Seeded hashes are bcrypt cost 12 (TEST-05); GET /api/me returns exactly id, name and role (TEST-39). Verified: listed AC pass at `c1ee1ce` ([results](evidence/ac-test-results.md)). Regress in S2/S3. |
| NFR-03 Backend role/ownership enforcement | F-01 foundation; all protected features | S1; regress S2/S3 | AC-08, AC-16, AC-18, AC-20, AC-21, AC-26, AC-32, AC-33, AC-34 (samples); AC-42 (shared guards); AC-50; AC-44, AC-46; draft S2 AC-74, AC-75, F-08 AC-102, AC-103 | Matching TEST-08, TEST-16, TEST-18, TEST-20, TEST-21, TEST-26, TEST-32, TEST-33, TEST-34; TEST-42; TEST-50; TEST-44, TEST-46; draft TEST-74, TEST-75, F-08 TEST-102, TEST-103 | S1 direct API cases verified at `c1ee1ce`. Proposed S2 ownership cases are planned only. |
| NFR-04 20 participants/capacity 5 -> exactly 5 ACTIVE | F-04 | S1 | AC-37; AC-15 is the different last-place case | TEST-37; TEST-15 stays separate | Verified: TEST-37 passed in the full run and 5 of 5 extra runs ([results](evidence/ac-test-results.md) sections 1 and 3). |
| NFR-05 List p95 < 500 ms / 1,000 events | F-13; F-03 list responsibility | S3 | AC-140 | TEST-140 | Contract draft in #206 (`docs/sprints/sprint-3/f-13-hardening.md`), pending B's review: `npm run bench` with 1,000 seeded events, 20 warm-up, 200 measured requests at concurrency 10; sampling/warm-up/concurrency now fixed by D-38. Planned only; no run recorded. |
| NFR-06 Data survives restart | Foundation/persistence; F-11, F-13 and persisted S1 journeys | S1 local; Lab 5 deployed; S3 regression | No dedicated AC in current skeleton | Planned restart-and-retrieve check in 9.4 QA; deployment repeat | Verified locally: event and registration identical before and after a server restart ([results](evidence/ac-test-results.md) section 3). Deployed repeat is Lab 5. S3: F-11 AC-125 / TEST-125 (check-ins after a restart) planned in #206; not run. |
| NFR-07 Server validation/uniform safe errors | F-01, F-02, F-04; every API feature | S1; regress S2/S3 | AC-02, AC-07, AC-13, AC-14, AC-16, AC-18, AC-26, AC-27, AC-28, AC-29, AC-30, AC-35, AC-36 (samples); AC-41 (login validation); AC-51; AC-44, AC-46, AC-48; draft S2 AC-74, AC-82..AC-88, F-08 AC-95 | Matching numbered tests; TEST-41; TEST-51; TEST-44, TEST-46, TEST-48; draft TEST-74, TEST-82..TEST-88, F-08 TEST-95 | S1 tests assert the exact error shape and keys and are verified at `c1ee1ce`. Proposed S2 validation/error cases are planned only. |
| NFR-08 README setup in <= 10 commands | Foundation/README: Issue #3 and its fresh-clone review | S1 | No dedicated AC in current skeleton | Planned fresh-clone command-count check; repeat in 9.4 QA | Verified: fresh clone in 8 commands at `c1ee1ce`, recorded on Issue #3 ([results](evidence/ac-test-results.md) section 3). No invented feature/test ID. |
| NFR-09 Five S1 screens: loading/empty/error | F-02, F-03, F-04, F-05, F-06; F-13 hardening later | S1; S3 hardening/regression | AC-11 covers only empty published list; S3 draft AC-141 | TEST-11 plus planned five-screen manual checklist in 9.4 QA; S3 draft TEST-141 | Verified: 14 of 14 manual checks with screenshots at `827f874` ([results](evidence/ac-test-results.md) section 3.1). The UI PRs #76 and #77 changed these screens afterwards; the rerun on the release commit `12dcd3c` passed 14 of 14 (results section 5). S3: the checklist over the new screens (My events, Event registrations, Attendance, Summary) is drafted in #206 as AC-141 / TEST-141; not run. |

## 5. Supplemental UI/end-to-end coverage

These journeys supplement service/API/DB checks; they do not replace negative authorization or concurrency tests.

| AC / TEST | Journey | Features / requirements supplemented | Ownership | Result |
|---|---|---|---|---|
| AC-22 / TEST-22 | Organizer creates/publishes; participant registers and sees it in My registrations; owner sees registrant. | F-01 through F-06; FR-01, FR-04, FR-06, FR-07, FR-08, FR-15; persisted UI journey | A, sub-task 9.1 (#37) | pass (E2E 5 of 5) |
| AC-23 / TEST-23 | Full-event UI rejection; My registrations unchanged. | F-03, F-04, F-05; FR-06, FR-07, BR-02 | B, sub-task 9.2 (#38) | pass (E2E 5 of 5) |
| AC-24 / TEST-24 | Login shows name/role; logout then protected navigation returns to login. | F-01; FR-01, FR-02, FR-03 UI identity only | A, sub-task 9.1 (#37) | pass (E2E 5 of 5) |
| AC-56 / TEST-56 | Logout in a second tab; protected navigation in the first tab shows Sign in and stays, no repeated 401 requests. | F-01; FR-02, FR-03; NFR-01; Lab 6 defect #142 | A, L6-09 (#156) | pass at `d7184bf` (E2E 7 of 7) |
| AC-62 / TEST-62 | After a refused (409) registration the event page reloads the places text. | F-04; FR-05, FR-06 UI; Lab 6 enhancement #143 | A, L6-10 (#157) | pass at `440b03b` (E2E 7 of 7) |
| AC-63 / TEST-63 | "Draft … saved." is removed after Publish and stays removed on reload. | F-02; FR-04 UI; Lab 6 enhancement #146 | A, L6-11 (#158) | pass at `d5c2f84` (E2E 7 of 7) |
| AC-64 / TEST-64 | Sign in and Create event field errors set `aria-invalid` and `aria-describedby`. | F-01, F-02; FR-01, FR-04 UI; NFR-09; Lab 6 enhancement #145 | A, L6-12 (#159) | pass at `912d770` (E2E 8 of 8) |
| AC-65 / TEST-65 | Maximum-length text without spaces wraps: Publish in My events stays on screen at 1280 px; My events (1280, 1024, 768, 375 px), My registrations (1024, 768 px), the event page and the Events list do not scroll sideways. | F-02, F-03, F-05; FR-04, FR-05, FR-07 UI; Lab 6 defect #141 | B, L6-13 (#161) | pass at `d7b89b0` (TEST-65 revised; `npm run test:e2e` 6 passed, 0 failed, 0 skipped; the first version passed at `4ca4d1a`) |
| AC-66 / TEST-66 | The event page keeps the description's line breaks. | F-03; FR-05 UI; Lab 6 enhancement #144 | B, L6-14 (#163) | pass at `1b518ed` (TEST-66; `npm run test:e2e` 8 passed, 0 failed, 0 skipped) |
| AC-67 / TEST-67 | At 320 px the minimized window's Restore button stays inside the screen and keeps its name. | F-01 shell (D-15); Lab 6 enhancement #147 | B, L6-15 (#164) | pass at `1b518ed` (TEST-67; `npm run test:e2e` 8 passed, 0 failed, 0 skipped) |
| AC-68 / TEST-68 | The Not found page names its window ("Not found"). | F-01 shell (D-15); system SDS 3.2; Lab 6 enhancement #148 | B, L6-16 (#165) | pass at `1b518ed` (TEST-68; `npm run test:e2e` 8 passed, 0 failed, 0 skipped) |
| AC-72 / TEST-72 | The taskbar never covers the page at 320 to 812 px; from 641 px Logout stays on the taskbar's single row. | F-01 shell (D-15); NFR-09 UI; Lab 6 enhancement #151 | A, L6-20 (#177) | pass at `ddf85e4` (TEST-72; red at `ea109a1`; `npm test` 69 passed, `npm run test:e2e` 16 passed, 0 failed, 0 skipped) |
| AC-69 / TEST-69 | A participant sees "You do not have access to this" on Event registrations for every event ID, whichever request answers first. | F-06; FR-08, NFR-03 UI; Lab 6 defect #153 | A, L6-17 (#172) | pass at `c54d10a` (TEST-69; red at `3e7a23a`; `npm test` 69 passed, `npm run test:e2e` 16 passed, 0 failed, 0 skipped) |
| AC-70 / TEST-70 | Sign in keeps the typed password after a 400; an empty Capacity says "Capacity is required." without a request. | F-01, F-02; FR-01, FR-04 UI; Lab 6 enhancement #155 | A, L6-18 (#173) | pass at `0b1928a` (TEST-70; red at `6563e70`; `npm test` 69 passed, `npm run test:e2e` 17 passed, 0 failed, 0 skipped) |
| AC-71 / TEST-71 | A participant on My events sees the 403 message and no Create event link; an organizer still sees it. | F-02; FR-04 UI; system SDS 3.1; Lab 6 enhancement #154 | B, L6-19 (#175) | pass at `b06bc36` (TEST-71; `npm run test:e2e` 15 passed, 0 failed, 0 skipped) |
| AC-80 / TEST-80 | A participant cancels an ACTIVE row in My registrations; it remains CANCELLED after reload and has no Cancel control. | F-07; FR-09, BR-03, BR-05, BR-07 | A, S2-01 contract draft (#200); code in S2-03 | planned only; not run |
| AC-89 / TEST-89 | F-09 deadline display in local time and readable registration-closed feedback. | F-09; FR-11, BR-06, NFR-09 | A, S2-01 contract draft (#200); code in S2-05 | planned only; not run |
| AC-105 / TEST-105 | The owner edits title and capacity from My events; the new values stay after a reload. | F-08; FR-10, NFR-09 | B, S2-01 contract draft (#200); code in S2-04 | planned only; not run |
| AC-106 / TEST-106 | The owner closes one event and cancels another; a participant sees "This event is closed." without Register and no longer sees the cancelled event. | F-08; FR-10, NFR-09 | B, S2-01 contract draft (#200); code in S2-04 | planned only; not run |
| AC-107 / TEST-107 | A capacity below the registered count shows the `CAPACITY_BELOW_ACTIVE` message and keeps the typed values. | F-08; FR-10, BR-02, NFR-09 | B, S2-01 contract draft (#200); code in S2-04 | planned only; not run |

## 6. Coverage gaps and planned closure

Every FR/BR/NFR has a feature or named responsibility and sprint above; each S1 row starts with `Closed:` or `Open:`, and the later-sprint row with `Planned (S2/S3):`; closed rows are kept so the history stays visible. One row is `Open:`: the server-side 500 error check. No baseline requirement is removed to close a gap.

| Gap / limitation | Affected scope | Planned closure / owner |
|---|---|---|
| S1 feature contracts are merged (Issue #2); executable tests were absent. | All S1 mappings | Closed: Issues 4 to 8 wrote the tests; 51 of 51 AC pass. |
| Published-event detail and current-user response. | FR-05; FR-03 | Closed: AC-49/TEST-49 and AC-39/TEST-39 pass (results section 2). |
| Representative role/ownership tests are not the full route matrix; invalid/expired sessions, wrong-role publication and foreign-DRAFT registration-list cases need explicit coverage. | FR-04, FR-08; BR-01, BR-05; NFR-01, NFR-03; D-13 | Closed: AC-38, AC-40, AC-42, AC-43, AC-45, AC-47 (sessions), AC-50 (wrong-role publication, D-13 order) and AC-48 (foreign DRAFT list) pass (results section 2). |
| Existing boundary samples do not explicitly cover every approved bound. | BR-01 capacity maximum; BR-04 `startsAt == now`; BR-09 publish equality | Closed: AC-06/TEST-06 (capacity 10,000), AC-28/TEST-28 (`startsAt == now`) and AC-30/TEST-30 (publish equality) pass (results section 2). |
| The capacity-5 concurrency scenario was specified but not executed. | NFR-04, BR-02 | Closed: QA #40 ran TEST-15 and TEST-37 five times each, all pass. |
| Hash-cost/response privacy and uniform safe-error assertions need complete contract coverage. | NFR-02, NFR-07 | Open: no automated test that an unexpected server error returns 500 in the uniform shape without a stack trace. AC-05, AC-19, AC-39 (hash cost, no private fields) and the exact error keys asserted in the 4xx tests pass (results section 2). |
| Restart, setup count and five UI-state checks were planned only. | NFR-06, NFR-08, NFR-09 | Closed: NFR-06, NFR-08 and NFR-09 checks pass (results section 3); the NFR-06 deployed repeat is Lab 5. |
| Sprint 2 contracts for F-07, F-08 and F-09 are agreed in #200. | FR-09..FR-11, BR-02..BR-07, NFR-01/NFR-03/NFR-07 | Planned coverage only. Implementation and verification follow contract merge. No Sprint 2 test has run. |
| Sprint 3 contracts and acceptance details are not part of this S2 contract work. | FR-12..FR-14, BR-08, NFR-05 | Planned after Sprint 2 in `deliverable2-plan.md`; no Sprint 3 implementation or test result is claimed. |
| Release evidence on the tag did not exist yet. | All S1 rows | Closed: Issue 10.1 (#41) reran build, `npm test` 67 of 67, E2E 5 of 5 and NFR-09 14 of 14 on `12dcd3c`, the commit of `v0.1.0-sprint1` (results section 5). |

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

| Issue #2 contract PRs #52, #53, #54, #55, #56 | S1 contracts add AC/TEST-37..51: current user, expiry, validation and guards (F-01, 39..42); F-03 session cases (38); F-04 capacity-5, session and input cases (37, 43, 44); F-05/F-06 session, role, input and DRAFT cases (45..48); F-02 detail, access matrix and validation (49..51). | New IDs are added to the rows above; no ID is renumbered. Recorded here as the A-owned follow-up agreed in PR #53 and #54. |
| QA PR #72, Issue #40 | S1 run on staging `c1ee1ce`: build, `npm test` 67 of 67, E2E 5 of 5, TEST-15/37 five runs; NFR-06/08/09 checks added. | S1 rows above now state verified results with a link to the results file. |
| D-15, D-16; Issue #73, PRs #76 and #77 | Scope addition: one shared Y2K visual style for every S1 screen, a decorative 3D layer, self-hosted fonts and Web Audio sounds. F-03 Events list shows CD cases (contract v1.1). | No FR/BR/NFR, route, API or data change; no new AC/TEST ID. Existing tests still pass (`npm test` 67 of 67 at merge `934dc51`, recorded on Issue #75). |
| CR-01 (Lab 7), #133 PR #184, #134 | Change request: new BR-10 time-conflict rule for F-04 (`docs/labs/lab-07/change-request.md`); F-04 contract 1.7, system SDS 1.2, SRS FR-06 and BR-10. | New BR-10 row and AC/TEST-57..61; no existing ID is renumbered or changed. |

Issue #200 draft note (2026-11-27): AC/TEST ranges agreed by A and B: F-07 73–80, F-09 81–89, F-08 90–109; unused IDs stay unassigned. The S2 mappings above remain planned and are not verification evidence.

## 8. Sources and updating actual results

Use [the SRS](srs.md), [feature inventory](features.md), [decisions](decisions.md), [system SDS](system-sds.md), [sprint plan](sprints/plan.md), [Issue plan](sprints/sprint-1/issue-plan.md) and [team workflow](team-workflow.md) with the master-plan skeleton linked above. Issue #14 owns this matrix; contract authors update links when specifications are elaborated. Do not invent a test file or passing count to fill an empty cell.

During implementation/QA, add actual test file/name and result to the single results artifact `docs/evidence/ac-test-results.md`, preserving links back to this baseline. Record automated vs manual verification, command, tested commit, pass/fail/skip counts and incomplete coverage. The Product Definition of Done and release evidence determine completion; a populated planning matrix does not.
