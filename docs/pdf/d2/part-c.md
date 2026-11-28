<!-- Deliverable 2 PDF, Part C (S3-04 #209). Author: B (Nattakit Prasertsak). Checker: A. Draft: rows marked [at submission] are updated on the day the PDF is built; [S3-02] values come from the F-10 red and green run. -->

# Part C: Sprint 3 contracts and working progress

## C.1 Status at submission

Sprint 3 is part of Deliverable 2 again. On 2026-11-27 PR #216 narrowed D2 to Sprint 2 and deferred D-36 to D-38; on 2026-11-28 PR #223 (merged 00:52) reverted that at A's request and with B's approval, so D2 covers Sprint 2 completion and Sprint 3 progress, D-36 to D-38 are active, and Sprint 3 Issues #206 to #208 are open again. Both changes stay in the history (Part A.4). Sprint 3 work integrates on `sprint-3-staging`, created from `main` after the Sprint 2 release, and the submitted candidate is `v0.4.0-rc1` (D-32).

At the snapshot for this PDF [at submission]:

- **Contracts (S3-01, #206):** all four Sprint 3 contracts are merged into `sprint-3-staging` (created from `main` `7e34f1b` after the Sprint 2 release): F-10 Check-in and F-11 Attendance record and report by B (#224, AC/TEST-110 to 119 and 120 to 127, merged `846fabd`, 2026-11-28 15:43), F-12 Organizer summary dashboard and F-13 Hardening by A (#234, AC/TEST-130 to 136 and 137 to 141, merged `7e30fd8`, 15:26). Each was reviewed by the other student; A's review of #224 clarified D-36 (who gets 403 or 404, the cancel-after-start order) and D-37 (checked in counts ACTIVE registrations only).
- **Implementation (S3-02, #207):** F-10 is the implemented Sprint 3 rule. Its red tests (TEST-110, 111, 113, 114 (a), 115 to 119) and its implementation (additive `CheckIn` migration, `POST /api/registrations/:id/check-in`, roster `checkedInAt`, the F-07 cancel refusal, the Check in button) follow the red and green PR handoff on `feature/s3-02-checkin`. Red #240 (`a4a14cb`): `npm test` 8 failed / 143 passed (151), every failure the missing route; green #242 (`b758793`, merged `2d24701`): `npm test` 153 passed (153) and E2E 28 passed with TEST-119 green - TEST-112 and TEST-114 (b) added in the green commit. Verified independently by A on a disposable PostgreSQL 16.

The checkpoint outcome is "Sprint 3 contracts cover the remaining baseline features; at least one meaningful Sprint 3 workflow or rule is implemented and tested". The contract half is met: all four remaining features have merged contracts. The implemented rule is F-10 check-in: implemented and tested at commit `2d24701` (red #240 `a4a14cb`, green #242 `b758793` - `npm test` 153 passed (153), E2E 28 passed). F-11 to F-13 are implemented after Deliverable 2 (C.3).

## C.2 Status by feature

Status terms: **planned** (only requirement and feature rows), **drafted** (contract with AC and STS written, PR in review, not merged), **specified** (contract merged), **in progress** (red tests committed), **implemented** (green merged), **tested** (suites pass on a recorded commit), **accepted** (in a released, checked version).

| Feature | Requirements | Decided rules | Current status | Achieved AC / tested commit |
|---|---|---|---|---|
| F-10 Check-in | FR-12, BR-05, BR-08, NFR-01, NFR-03, NFR-07, NFR-09 | D-36: window `startsAt - 60 min <= now < startsAt + 6 h`; one `CheckIn` row per registration (unique `registrationId`); a participant gets 403 for every ID; for an organizer: unknown 404, another organizer's event 403, CANCELLED 409 `REGISTRATION_NOT_ACTIVE`, repeat 409 `ALREADY_CHECKED_IN`, outside 409 `OUTSIDE_CHECKIN_WINDOW`; a checked-in registration cannot be cancelled before the start (409 `ALREADY_CHECKED_IN`) | implemented and tested on `2d24701` (#242) | AC-110..AC-119 pass (TEST-110..119) |
| F-11 Attendance record and report | FR-13, BR-05, NFR-03, NFR-06 | D-37: registered = ACTIVE; checked in = ACTIVE with a `CheckIn`; no-show only after the window ends (`now >= startsAt + 6 h`); CANCELLED rows listed apart, never counted | specified (#224, AC-120 to AC-127); implementation after D2 | none |
| F-12 Organizer summary dashboard | FR-14, BR-05, NFR-03 | D-37 counting across the owner's events | specified (#234, AC-130 to AC-136); implementation after D2 | none |
| F-13 Hardening, UX and regression | NFR-05, NFR-06, NFR-09; login rate limiting | D-38: 10 failed attempts per email in 15 minutes, then 429 `TOO_MANY_ATTEMPTS` (known limitation: anyone who knows an email can lock it for 15 minutes); NFR-05 with 1,000 seeded events, 20 warm-up and 200 measured requests at concurrency 10, p95 < 500 ms | specified (#234, AC-137 to AC-141); implementation after D2; the E2E suite already runs in CI as a required check (D-39, #219) | none |

## C.3 Remaining work

| Feature or defect | Current status | Remaining action | Owner and target |
|---|---|---|---|
| S3-01 contracts F-10 to F-13 | specified: all four merged (#224 `846fabd`, #234 `7e30fd8`) | none for D2; each feature's red and green follow its contract | done 2026-11-28 |
| S3-02 F-10 Check-in | red merged (#240, `a4a14cb`); green merged (#242, `b758793` -> `2d24701`) | red and green landed in the handoff order; shipped in `v0.4.0-rc1` | B (A reviews); done 2026-11-28 |
| S3-03 Release candidate `v0.4.0-rc1` | not started | `sprint-3-staging` → `main`, tag, deploy, regression, post-deployment checks (Part E) | A (B reviews); 29 Nov |
| F-11 Attendance record and report | specified (#224) | red and green from the contract | B; 5 Dec |
| F-12 Organizer summary dashboard | specified (#234) | red and green from the contract | A; 5 Dec |
| F-13 Hardening, UX and regression | specified (#234); E2E already a required check | login rate limit (D-38), NFR-05 measurement (AC-140), NFR-09 checklist for the new screens (AC-141), full regression | A; 8 Dec |
| Lab 6 limitations (taskbar wrap at 641 to 735 px, #147 label ellipsis) | accepted, remaining (Part A.3) | recheck with the F-13 UI checks; fix or keep as documented limitations | B; 8 Dec |
| UAT retest of the new features with Est, final regression | not started | send Est the candidate with the new features; record their retest | A and B; 11 Dec |
| Final release `v1.0.0`, video, final PDF | not started | release, deploy, post-deployment checks, video, final PDF | A and B; 13 Dec |

Targets come from `deliverable2-plan.md` section 5; final examinations run from 1 to 11 December, so the F-11 and F-12 targets on 5 December fall inside them and are a known schedule risk.

## C.4 Revisions

The Sprint 3 scope and rules are recorded without rewriting history: D-36 to D-38 were proposed in PR #198, marked deferred in PR #216 and made active again in PR #223 (their rule text unchanged by both); PR #224 proposes two clarifications to D-36 and D-37 from A's review (who gets 403 or 404, the cancel-after-start order, checked in counts ACTIVE only), which apply only when #224 merges. The Sprint 3 Issues #206 to #208 were closed as not planned on 2026-11-27 and reopened on 2026-11-28; both events stay in their timelines.
