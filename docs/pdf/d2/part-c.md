<!-- Deliverable 2 PDF, Part C (S2-07 #209). Author: B (Nattakit Prasertsak). Checker: A. Skeleton: this records Sprint 3 as it stands; rows marked [at submission] are updated on the day the PDF is built. -->

# Part C: Sprint 3 contracts and working progress

## C.1 Status at submission

The team decided on 2026-11-27 to finish Sprint 2 first and to start Sprint 3 only after the Sprint 2 release (PR #216, decided by A and agreed by B on #216; Sprint 3 Issues #206 to #208 closed as not planned at that time). At the snapshot for this PDF, Sprint 3 is therefore **planned, not started**:

- **Contracts:** the four Sprint 3 features have their requirement rows (SRS FR-12 to FR-14, BR-08, NFR-05, NFR-06, NFR-09) and feature rows (`docs/features.md` F-10 to F-13), and three of their open rules are already decided: D-36 check-in window, D-37 attendance counting, D-38 login rate limit and the NFR-05 measurement settings. No Sprint 3 feature contract (feature SDS, AC, STS) is written yet. [at submission]
- **Implementation and tests:** none. No Sprint 3 code, test or migration exists, so no Sprint 3 AC is implemented, tested or accepted. [at submission]

This does not meet the checkpoint outcome "Sprint 3 contracts cover the remaining baseline features; at least one meaningful Sprint 3 workflow or rule is implemented and tested". The gap and the plan to close it are stated below rather than hidden. If Sprint 3 contracts or F-10 are started before the PDF is built, C.2 and C.3 are updated with their real status.

## C.2 Status by feature

Status terms: **planned** (only requirement and feature rows), **specified** (contract with AC and STS merged), **in progress** (red tests committed), **implemented** (green merged), **tested** (suites pass on a recorded commit), **accepted** (in a released, checked version).

| Feature | Requirements | Decided rules | Current status | Achieved AC / tested commit |
|---|---|---|---|---|
| F-10 Check-in | FR-12, BR-05, BR-08, NFR-03 | D-36: window `startsAt - 60 min <= now < startsAt + 6 h`; one `CheckIn` row per registration; check order 404, 403, `REGISTRATION_NOT_ACTIVE`, `ALREADY_CHECKED_IN`, `OUTSIDE_CHECKIN_WINDOW`; a checked-in registration cannot be cancelled (`ALREADY_CHECKED_IN`) | planned [at submission] | none |
| F-11 Attendance record and report | FR-13, BR-05, NFR-03, NFR-06 | D-37: registered = ACTIVE; checked in = with a `CheckIn`; no-show only after the check-in window ends; CANCELLED listed apart | planned [at submission] | none |
| F-12 Organizer summary dashboard | FR-14, BR-05, NFR-03 | D-37 counting | planned [at submission] | none |
| F-13 Hardening, UX and regression | NFR-05, NFR-06, NFR-09; login rate limiting | D-38: 10 failed attempts per email in 15 minutes, then 429 `TOO_MANY_ATTEMPTS` (known limitation: anyone who knows an email can lock it for 15 minutes); NFR-05 with 1,000 seeded events, 20 warm-up and 200 measured requests at concurrency 10, p95 < 500 ms | planned [at submission]; the E2E suite already runs in CI (D-39, #219) as part of the regression work | none |

## C.3 Remaining work

| Feature or defect | Current status | Remaining action | Owner and target |
|---|---|---|---|
| Sprint 3 plan | not started | write the Sprint 3 plan, confirm D-36 to D-38, open the Sprint 3 Issues again (they were closed on 2026-11-27, Part C.1) | A and B; after the Sprint 2 release |
| F-10 Check-in | planned | contract (feature SDS, AC, STS from the next free AC/TEST IDs) reviewed by A; red tests; green: `CheckIn` table (additive migration, D-20), owner-only check-in API under D-36, check-in button on the organizer registrations page; E2E | Nattakit Prasertsak (B); 5 Dec |
| F-11 Attendance record and report | planned | contract reviewed by A; attendance list and counts per event (D-37); report screen; tests | Nattakit Prasertsak (B); 5 Dec |
| F-12 Organizer summary dashboard | planned | contract reviewed by B; totals across the owner's events, no other organizer's records; tests | Kirakit Kingkaew (A); 5 Dec |
| F-13 Hardening, UX and regression | planned; E2E already in CI | contract reviewed by B; login rate limit (D-38); NFR-05 measurement script and result; NFR-09 states for the new screens; full regression | Kirakit Kingkaew (A); 8 Dec |
| Lab 6 limitations (taskbar wrap at 641 to 735 px, #147 label ellipsis) | accepted, remaining (Part A.3) | recheck with the F-13 UI checks; fix or keep as documented limitations | Nattakit Prasertsak (B); 8 Dec |
| D7-1 documentation sync | open (Part A.3) | sync PR `lab6-staging` → `sprint-2-staging` (and `deployment.md` 0.2 onto `main`) | Kirakit Kingkaew (A); before S2-06 |
| UAT retest of the new features with Est, final regression | not started | send Est the candidate with the new features; record their retest | A and B; 11 Dec |
| Final release `v1.0.0`, video, final PDF | not started | release, deploy, post-deployment checks, video, final PDF | A and B; 13 Dec |

Targets come from `deliverable2-plan.md` section 5 and avoid the examination period of 1 to 11 December only where the plan already does; the F-10 to F-12 targets fall inside it and are a known schedule risk.

## C.4 Revisions

The Sprint 3 scope and rules are recorded without rewriting history: D-36 to D-38 were proposed in PR #198 and marked deferred in PR #216 (their text unchanged); the closed Sprint 3 Issues #206 to #208 stay in the history and are reopened or replaced when the Sprint 3 plan starts.
