<!-- Deliverable 2 PDF, Part C (S3-04 #209). Author: B (Nattakit Prasertsak). Checker: A. Draft: rows marked [at submission] are updated on the day the PDF is built; [S3-02] values come from the F-10 red and green run. -->

# Part C: Sprint 3 contracts and working progress

## C.1 Status at submission

Sprint 3 is part of Deliverable 2 again. On 2026-11-27 PR #216 narrowed D2 to Sprint 2 and deferred D-36 to D-38; on 2026-11-28 PR #223 (merged 00:52) reverted that at A's request and with B's approval, so D2 covers Sprint 2 completion and Sprint 3 progress, D-36 to D-38 are active, and Sprint 3 Issues #206 to #208 are open again. Both changes stay in the history (Part A.4). Sprint 3 work integrates on `sprint-3-staging`, created from `main` after the Sprint 2 release, and the submitted candidate is `v0.4.0-rc1` (D-32).

At the snapshot for this PDF [at submission]:

- **Contracts (S3-01, #206):** F-10 Check-in and F-11 Attendance record and report are written by B in PR #224 (`docs/sprints/sprint-3/f-10-checkin.md`, `f-11-attendance.md`), with AC/TEST-110 to 119 and 120 to 127 (128 and 129 unassigned). A reviewed it on 2026-11-28; B answered all three points in `a94991a` (D-36 participant 403 and the cancel-after-start order, D-37 "checked in" counts ACTIVE registrations only, TEST-114 split into a red and a green-added case). The PR stays a draft until `sprint-3-staging` exists. F-12 and F-13 (A) have no contract yet.
- **Implementation (S3-02, #207):** F-10 starts after S3-01 is merged and after the Sprint 2 release (the plan: F-10 also needs F-07 and F-08). No Sprint 3 code, test or migration exists yet. [at submission]

The checkpoint outcome is "Sprint 3 contracts cover the remaining baseline features; at least one meaningful Sprint 3 workflow or rule is implemented and tested". At this snapshot two of the four contracts are written and in review, and the implemented rule (F-10 check-in window) has not started. The gap and the plan to close it are stated below rather than hidden; if F-10 red and green land before the PDF is built, C.2 and C.3 are updated with their real commits and counts.

## C.2 Status by feature

Status terms: **planned** (only requirement and feature rows), **drafted** (contract with AC and STS written, PR in review, not merged), **specified** (contract merged), **in progress** (red tests committed), **implemented** (green merged), **tested** (suites pass on a recorded commit), **accepted** (in a released, checked version).

| Feature | Requirements | Decided rules | Current status | Achieved AC / tested commit |
|---|---|---|---|---|
| F-10 Check-in | FR-12, BR-05, BR-08, NFR-01, NFR-03, NFR-07, NFR-09 | D-36: window `startsAt - 60 min <= now < startsAt + 6 h`; one `CheckIn` row per registration (unique `registrationId`); a participant gets 403 for every ID; for an organizer: unknown 404, another organizer's event 403, CANCELLED 409 `REGISTRATION_NOT_ACTIVE`, repeat 409 `ALREADY_CHECKED_IN`, outside 409 `OUTSIDE_CHECKIN_WINDOW`; a checked-in registration cannot be cancelled before the start (409 `ALREADY_CHECKED_IN`) | drafted (#224, AC-110 to AC-119) [at submission] | none [S3-02] |
| F-11 Attendance record and report | FR-13, BR-05, NFR-03, NFR-06 | D-37: registered = ACTIVE; checked in = ACTIVE with a `CheckIn`; no-show only after the window ends (`now >= startsAt + 6 h`); CANCELLED rows listed apart, never counted | drafted (#224, AC-120 to AC-127); implementation after D2 | none |
| F-12 Organizer summary dashboard | FR-14, BR-05, NFR-03 | D-37 counting across the owner's events | planned (contract by A) [at submission] | none |
| F-13 Hardening, UX and regression | NFR-05, NFR-06, NFR-09; login rate limiting | D-38: 10 failed attempts per email in 15 minutes, then 429 `TOO_MANY_ATTEMPTS` (known limitation: anyone who knows an email can lock it for 15 minutes); NFR-05 with 1,000 seeded events, 20 warm-up and 200 measured requests at concurrency 10, p95 < 500 ms | planned (contract by A) [at submission]; the E2E suite already runs in CI as a required check (D-39, #219) | none |

## C.3 Remaining work

| Feature or defect | Current status | Remaining action | Owner and target |
|---|---|---|---|
| S3-01 F-10, F-11 contracts | drafted, A's review answered | A re-approves #224; retarget it to `sprint-3-staging` once that branch exists; merge | B (author), A (review); before S3-02 |
| S3-01 F-12, F-13 contracts | planned | write both contracts from D-37 and D-38 (AC/TEST from 130, as proposed on #206); B reviews | A; before S3-03 |
| S3-02 F-10 Check-in | planned | red tests from the F-10 STS on `feature/s3-02-checkin-red` into `feature/s3-02-checkin` (A approves); green: additive `CheckIn` migration (D-20), `POST /api/registrations/:id/check-in` under D-36, roster `checkedInAt`, Check in button on Event registrations, F-07 cancel refusal; E2E (TEST-119) | B; after S3-01 and the Sprint 2 release, before S3-03 |
| S3-03 Release candidate `v0.4.0-rc1` | not started | `sprint-3-staging` → `main`, tag, deploy, regression, post-deployment checks (Part E) | A (B reviews); 29 Nov |
| F-11 Attendance record and report | drafted | implementation from the #224 contract | B; 5 Dec |
| F-12 Organizer summary dashboard | planned | contract and implementation | A; 5 Dec |
| F-13 Hardening, UX and regression | planned; E2E already a required check | login rate limit (D-38), NFR-05 measurement, NFR-09 checklist for the new screens, full regression | A; 8 Dec |
| Lab 6 limitations (taskbar wrap at 641 to 735 px, #147 label ellipsis) | accepted, remaining (Part A.3) | recheck with the F-13 UI checks; fix or keep as documented limitations | B; 8 Dec |
| D7-1 documentation sync | open (Part A.3) | sync PR `lab6-staging` → `sprint-2-staging` (F-01 1.6) and `deployment.md` 0.2 from `lab5-staging` | A; before S2-06 |
| UAT retest of the new features with Est, final regression | not started | send Est the candidate with the new features; record their retest | A and B; 11 Dec |
| Final release `v1.0.0`, video, final PDF | not started | release, deploy, post-deployment checks, video, final PDF | A and B; 13 Dec |

Targets come from `deliverable2-plan.md` section 5; final examinations run from 1 to 11 December, so the F-11 and F-12 targets on 5 December fall inside them and are a known schedule risk.

## C.4 Revisions

The Sprint 3 scope and rules are recorded without rewriting history: D-36 to D-38 were proposed in PR #198, marked deferred in PR #216 and made active again in PR #223 (their rule text unchanged by both); PR #224 proposes two clarifications to D-36 and D-37 from A's review (who gets 403 or 404, the cancel-after-start order, checked in counts ACTIVE only), which apply only when #224 merges. The Sprint 3 Issues #206 to #208 were closed as not planned on 2026-11-27 and reopened on 2026-11-28; both events stay in their timelines.
