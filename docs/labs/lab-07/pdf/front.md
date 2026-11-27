<!-- Lab 7 PDF front matter (L7-08 #140): cover, contents, version table. Shared by A and B. Page ranges are filled from the built PDF. -->

# CPE 334 Lab 7: Software Maintenance Metrics and Release Readiness

Team EN-009_P3, section &lt;section&gt;. Theme 3: Event Registration and Attendance System.

| Item | Value |
|---|---|
| Students | Kirakit Kingkaew 67070503460 (A), Nattakit Prasertsak 67070503413 (B) |
| Repository | https://github.com/songt888/event-registration-system |
| Change | CR-01: new business rule BR-10 for F-04 Register. A participant may not hold two ACTIVE registrations for events that start less than 120 minutes apart (409 `TIME_CONFLICT`; exactly 120 minutes is allowed) |
| Accepted Sprint 1 baseline (old rule) | tag `v0.1.0-sprint1`, commit `12dcd3c` |
| Pre-change implementation | `main` `502d2a6` = tag `v0.1.3-lab6`, Cloud Run revision `s47a6b53b-00006-7bv` |
| Submitted `main` release | tag `v0.2.0-lab7`, merge commit `861f01f` (release PR #193) |
| Deployed URL and version | https://s47a6b53b-4d7hbszvwq-as.a.run.app, revision `s47a6b53b-00007-mkk` (deployed 2026-11-27 13:00 UTC+7) |

No password, token, cookie, connection string or key appears in this PDF or its figures. Accounts are named by label only; all data is synthetic.

## Contents

| Part | Content | Author / checker | Pages | Evidence IDs |
|---|---|---|---|---|
| A | Change impact and updated contract | A / B | PAGES_A | E7-A1, E7-A2 |
| B | Implementation and regression-safe delivery | A / B | PAGES_B | E7-B1 to E7-B5 |
| C | Objective engineering metrics | B / A | PAGES_C | E7-C1 to E7-C5 |
| D | Release readiness and retrospective | B / A | PAGES_D | E7-D1 |
| Appendices | A1 CR-01 as reviewed, B1 test file, B2 red output | | PAGES_APP | E7-A1, E7-B1 |

## Version table

| Step | Version | Note |
|---|---|---|
| Accepted Sprint 1 baseline | tag `v0.1.0-sprint1`, `12dcd3c` | old rule: no time-conflict check |
| Unrelated maintenance between baseline and pre-change | `v0.1.2-lab5` `04e8590` (Lab 5 Docker, CI/CD, deploy); `v0.1.3-lab6` `502d2a6` (Lab 6 client fixes) | no server file changed after Lab 5 (`git diff 04e8590 502d2a6 -- server` is empty), so `registerForEvent` is the Sprint 1 code |
| Pre-change implementation | `502d2a6`, revision `s47a6b53b-00006-7bv` | branch point of `lab7-staging` (D-31) |
| Change request | `06da203`, `cc30239`; merged as `9c33d23` (PR #184), 2026-11-27 00:32 | CR-01, impact analysis, AC-57 to AC-61 |
| Revised contract | `49fe0e1`, `3657aab`; merged as `ff9aa9b` (PR #185), 2026-11-27 02:21 | SRS FR-06/BR-10, F-04 1.7, system SDS 1.2, STS TEST-57 to TEST-61 |
| Red test commit | `7098c4e`, 2026-11-27 02:42 | TEST-57 to TEST-60 alone; server code identical to `502d2a6` |
| Green commit | `6fc9c53`, 2026-11-27 03:20 | BR-10 in `registerForEvent`; then `3b03b5d` (TEST-65 fixture), `5a2197b`, `4d51c76` (TEST-61), evidence `1ce3dbe`, `f207543`, `3a65460` |
| Staging integration | `a6439d7` (PR #190), 2026-11-27 03:50 | contains only #183, #184, #185, #190 |
| Accepted `main` release | `861f01f` (release PR #193), 2026-11-27 12:58; tag `v0.2.0-lab7` | merge commit; its tree is identical to `a6439d7` |
| Deployed revision | `s47a6b53b-00007-mkk`, Deploy run 45948919136 | production data not reset (D-20); no migration in this release |

Merge commits: every change reached `lab7-staging` through a reviewed PR with a merge commit, and `main` only through release PR #193. No Sprint 2 or Lab 6 work is in this release: on `main`, `git log --merges --first-parent 502d2a6..861f01f` lists only #193, and on `lab7-staging` the same command for `502d2a6..a6439d7` lists only #183, #184, #185 and #190.
