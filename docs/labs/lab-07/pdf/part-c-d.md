<!-- Lab 7 PDF Parts C and D (L7-08 #140). Author B, checked by A. Times are UTC+7. Same content as docs/labs/lab-07/metrics.md (#138) and readiness.md (#139). -->

# Part C: Objective engineering metrics

Author B (Nattakit Prasertsak), reviewer A. Source file `docs/labs/lab-07/metrics.md` (L7-06 #138).

- **Window W:** 2026-11-26 00:00 to 2026-11-27 14:11 (UTC+7). The Lab 7 Issues were created at 02:42 on 26 Nov, so all Lab 7 work is inside W.
- **Snapshot S:** 2026-11-27 14:11 (UTC+7), after the Lab 7 release (`v0.2.0-lab7`, merge commit `861f01f`, revision `s47a6b53b-00007-mkk`). This PR and later work are not counted.
- **Sources:** `gh issue list`, `gh pr list` and `gh run list` against the repository at S, and B's run of the suites on `861f01f` at S (E7-C3). All times UTC+7.

## C.1 Metrics (E7-C1 to E7-C5)

| # | Metric | Definition | Scope | Window / snapshot | Value | Source |
|---|---|---|---|---|---|---|
| M1 | Completed Lab 7 Issues | Issues with label `lab7` closed as completed, over all `lab7` Issues; duplicates and cancelled Issues counted apart | Lab 7 work Issues #132 to #140 | W, state at S | **5 of 9 closed (56%)**, 0 duplicate, 0 cancelled; 4 open | E7-C1 |
| M2 | Merged Lab 7 PRs | PRs with label `lab7` merged in W, by target branch; PRs closed without merge counted apart | `lab7-staging` and `main` | W | **7 merged**: 6 into `lab7-staging`, 1 release into `main`; 0 closed unmerged | E7-C2 |
| M3 | Automated test results on the release commit | Passed / failed / skipped for one named suite on one commit: `npm test` (Vitest unit + Supertest API/DB integration on `DATABASE_URL_TEST`) | release commit `861f01f` (`v0.2.0-lab7`) | run at S (14:11) | **15 files, 73 passed, 0 failed, 0 skipped**. Also on the same commit: `npm run build` OK; `npm run test:e2e` (Playwright, Chromium) **20 passed, 0 failed, 0 skipped** | E7-C3 |
| M4 | UAT defect status of our product | Findings from the partner team (Est) about our app, by class. **Resolved** = fix released in `v0.1.3-lab6` **and** Est's retest PASS recorded on the Issue | our app, Lab 6 findings #141 to #155 | status at S | **13 of 13 resolved (100%)**: 3 accepted defects (1 major), 1 duplicate, 9 enhancements; 0 open. New defects reported in W: **0** | E7-C4 |
| M5 | CI run outcomes for Lab 7 | GitHub Actions runs of `ci-docker` on PRs into `lab7-staging` or `main` from Lab 7 branches, and "Deploy to Google Cloud" on pushes to `main`, by conclusion | the two workflows, Lab 7 branches only (Lab 6 and Sprint 2 runs in W excluded) | W | `ci-docker`: **12 runs: 11 success, 1 failure, 0 cancelled**; the failure is the intended red commit (see E7-C5). Deploy: **1 of 1 success** | E7-C5 |

Percentages give numerator and denominator. M3 and M5 state failed, skipped and cancelled counts even when zero.

## C.2 Source lists

**E7-C1, Lab 7 Issues (M1).** Created 2026-11-26 02:42.

| Issue | Work | State at S | Closed |
|---|---|---|---|
| #132 | L7-00 plan, D-31 | closed, completed | 27 Nov 01:58 |
| #133 | L7-01 change request CR-01 | closed, completed | 27 Nov 01:58 |
| #134 | L7-02 revised contract | closed, completed | 27 Nov 02:21 |
| #135 | L7-03 red | closed, completed | 27 Nov 03:50 |
| #136 | L7-04 green | closed, completed | 27 Nov 04:09 |
| #137 | L7-05 release, deploy, checks | open (release, tag, deploy and evidence done in #193 and #196; Issue not yet closed) | |
| #138 | L7-06 metrics (this file) | open | |
| #139 | L7-07 readiness | open | |
| #140 | L7-08 PDF | open | |

**E7-C2, Lab 7 PRs (M2).**

| PR | Work | Target | Merged |
|---|---|---|---|
| #183 | L7-00 plan | `lab7-staging` | 27 Nov 00:26 |
| #184 | L7-01 CR-01 | `lab7-staging` | 27 Nov 00:32 |
| #185 | L7-02 contract | `lab7-staging` | 27 Nov 02:21 |
| #190 | L7-03 red, L7-04 green | `lab7-staging` | 27 Nov 03:50 |
| #193 | L7-05 release | `main` | 27 Nov 12:58 |
| #196 | L7-05 release evidence | `lab7-staging` | 27 Nov 14:08 |
| #197 | L7-08 PDF Parts A and B | `lab7-staging` | 27 Nov 14:09 |

**E7-C3, test summary (M3).** Commit `861f01f0dc760ee22b64a5d759f343760be7895e`, Node v24.16.0, local PostgreSQL 16 (Docker), run by B on 2026-11-27 from 14:11. Full output: `docs/labs/lab-07/evidence/l7-06/E7-C3-npm-test.txt`, `E7-C3-e2e.txt`, `E7-C3-build.txt`.

```
$ npm test
 Test Files  15 passed (15)
      Tests  73 passed (73)
$ npm run test:e2e
  20 passed (1.2m)
```

The 73 include TEST-57 to TEST-60 (CR-01). The 20 E2E include TEST-61 (the `TIME_CONFLICT` message) and the Lab 6 fix tests TEST-56 and TEST-62 to TEST-72.

**E7-C4, UAT findings about our app (M4).** Est's retest: `v0.1.3-lab6` / `502d2a6` / `s47a6b53b-00006-7bv`. Est's decision on #126: Accepted, 27 Nov 03:18.

| Class | Issues | Fix released | Est retest PASS |
|---|---|---|---|
| Accepted defect | #142 (major), #141, #153 | `v0.1.3-lab6` | #153: 27 Nov 00:21; #141, #142: 02:15 to 02:46 |
| Duplicate | #152 (of #142) | with #142 | 27 Nov 00:20 |
| Enhancement | #143, #144, #145, #146, #147, #148, #151, #154, #155 | `v0.1.3-lab6` | #151, #154, #155: 00:20 to 00:21; the other six: 02:15 to 02:46 |

All 13 Issues are closed. Nine were closed automatically at 26 Nov 23:23 by the release merge, before Est's retest, so the Issue state alone is not the "resolved" measure. In W no new defect Issue was opened about our product. The only Issues created after the release are the Deliverable 2 work Issues #199 to #209, which are not defects.

**E7-C5, CI runs (M5).**

| Run | Workflow | Branch (PR) | Commit | Started | Result |
|---|---|---|---|---|---|
| 45864669822 | ci-docker | `docs/l7-00-plan` (#183) | `d594bf1` | 27 Nov 00:05 | success |
| 45868342199 | ci-docker | `docs/l7-01-change-request` (#184) | `3428fa7` | 00:30 | success |
| 45869038634 | ci-docker | `docs/l7-02-contract` (#185) | `49fe0e1` | 00:35 | success |
| 45881423658 | ci-docker | `docs/l7-02-contract` (#185) | `3657aab` | 02:08 | success |
| 45885717175 | ci-docker | `feature/l7-03-time-conflict` (#190) | `f8a9270` | 02:43 | **failure**: TEST-57 to TEST-60 fail on the unchanged server (the red step) |
| 45891036038 | ci-docker | `feature/l7-03-time-conflict` (#190) | `1ce3dbe` | 03:26 | success |
| 45891691607 | ci-docker | `feature/l7-03-time-conflict` (#190) | `f207543` | 03:31 | success |
| 45893093947 | ci-docker | `feature/l7-03-time-conflict` (#190) | `3a65460` | 03:43 | success |
| 45897022578 | ci-docker | `lab7-staging` (#193) | `a6439d7` | 04:16 | success |
| 45948919136 | Deploy to Google Cloud | push to `main` | `861f01f` | 12:58 | success |
| 45953052844 | ci-docker | `docs/l7-05-release-evidence` (#196) | `d5e1116` | 13:37 | success |
| 45954142826 | ci-docker | `docs/l7-08-pdf-ab` (#197) | `9debdad` | 13:47 | success |
| 45956404002 | ci-docker | `docs/l7-08-pdf-ab` (#197) | `aa26c08` | 14:08 | success |

## C.3 Interpretation and action (at most 100 words)

M5 is green apart from the intended red (11 of 12 `ci-docker` runs), but the required check runs only `npm test` (D-23). The 20 E2E tests in M3 ran only on our laptops: TEST-61 (the `TIME_CONFLICT` message) and the Lab 6 fix tests TEST-56 and TEST-62 to TEST-72, which cover all 13 findings resolved in M4. A Sprint 2 change that breaks those screens could merge green, and M4's 100% would silently stop holding.

**Action:** add a Playwright E2E job to `ci-docker` for PRs into `sprint-2-staging`, before the first Sprint 2 feature PR (S2-03). Owner: B.

# Part D: Release readiness and retrospective

Author B, reviewer A. Evidence E7-D1, source file `docs/labs/lab-07/readiness.md` (L7-07 #139). Snapshot 2026-11-27 14:15 (UTC+7).

- **Scope:** the maintained Sprint 1 scope in the deployed release, meaning F-01 to F-06, the approved change CR-01 (BR-10), and the Sprint 1 behavior that was accepted before.
- **Not in the release:** Sprint 2 and 3 features. `sprint-2-staging` exists from `861f01f`, but no Sprint 2 code has been merged.

## D.1 Readiness checklist (E7-D1)

| Item | Status at the snapshot | Evidence |
|---|---|---|
| Accepted Sprint 1 baseline | tag `v0.1.0-sprint1`, commit `12dcd3c` | tag |
| Pre-change commit | `502d2a6` = tag `v0.1.3-lab6`, revision `s47a6b53b-00006-7bv`. No server file changed since Lab 5 (`git diff 04e8590 502d2a6 -- server` is empty) | Part A, E7-B1 |
| Submitted and deployed release | tag `v0.2.0-lab7` (annotated) on merge commit `861f01f` (release PR #193), Cloud Run revision `s47a6b53b-00007-mkk`, https://s47a6b53b-4d7hbszvwq-as.a.run.app | E7-B4 |
| Running revision = release commit | "Deploy to Google Cloud" run 45948919136 built and deployed `861f01f` (2026-11-27 12:58 to 13:00). Its log: "revision [s47a6b53b-00007-mkk] has been deployed and is serving 100 percent of traffic". The live client bundle `index-CcXia3Aw.js` is the same file name as B's local build of `861f01f` | E7-B4, E7-C3 |
| Approved change CR-01 (BR-10) | 409 `TIME_CONFLICT` when two ACTIVE registrations of one participant start less than 120 min apart; exactly 120 min allowed. Red: TEST-57 to TEST-60 fail on `7098c4e`, where the server is unchanged. Green on the release commit: all four pass in `npm test` (73), and TEST-61 passes in the E2E suite (20). On production, 119 min → 409 `TIME_CONFLICT` and 120 min → 201 | E7-B1, E7-C3, E7-B5 |
| Unaffected accepted behavior | Every Sprint 1, Lab 5 and Lab 6 test runs unchanged and passes on `861f01f`. That covers capacity, duplicate, concurrent last place, started event, ownership and session (69 of the 73), and the E2E journeys plus the Lab 6 fixes (19 of the 20). On production, a repeat registration → 409 `ALREADY_REGISTERED` and a participant reading an organizer's list → 403. One old test changed: the TEST-65 fixture moved to two weeks ahead, with its assertions unchanged (B.3) | E7-C3, E7-B5 |
| Automated tests on the release commit | `npm run build` OK; `npm test` 15 files, **73 passed, 0 failed, 0 skipped**; `npm run test:e2e` **20 passed, 0 failed, 0 skipped** (B, 2026-11-27 14:11, Node v24.16.0). Required check `test-and-docker` on the release PR head `a6439d7`: success (run 45897022578) | E7-C3, E7-C5 |
| Failed checks during the work (none hidden) | (1) CI failure on `f8a9270` (run 45885717175): the intended red, with TEST-57 to TEST-60 failing on the unchanged server. (2) First E2E run at `5a2197b`: 19 passed, 1 failed, because the TEST-61 fixture had no event description (400 in setup); fixed in `4d51c76`, no assertion changed. No check failed on the release commit | E7-C5, B.3 |
| Not checked on production | the full-event path and the `TIME_CONFLICT` alert in the UI. Covered by TEST-13, TEST-15 and TEST-37 and by TEST-61 on the release commit. The production requests were AI-executed on A's sign-in, not clicked | E7-B5 |
| Selected user tests | Lab 6 UAT by Est on `v0.1.3-lab6`: all 13 findings PASS; UAT-01, UAT-02, UAT-03, UAT-04 (including step 9) and UAT-06 PASS; decision **Accepted** (#126, 2026-11-27 03:18). UAT was not repeated on `v0.2.0-lab7`; Est's Lab 6 testing ended before this release (D-31) | Lab 6 PDF Part D |
| Defects by severity and status | see D.2: 0 open critical or major; 1 open minor documentation defect | D.2 |
| Technical debt | 6 items, D.3 | D.3 |
| Configuration and secrets | Git holds only `.env.example`, plus the CI placeholders `app:app@localhost` for the throwaway Postgres container. Deploy signs in through Workload Identity Federation (no key file), with Actions pinned to commit SHAs. Runtime secrets stay in Cloud Run, set by the course portal (D-25). No password, cookie or connection string appears in any Lab 7 evidence file | `.github/workflows/deploy.yml`, E7-B5 |
| Documentation and run instructions | README and the AGENTS.md Commands section give setup, `npm test`, `npm run test:e2e`, `npm run seed:demo` (never `npm run seed` on production, D-20), Docker and the deploy and smoke commands. Contract revisions: F-04 1.7, system SDS 1.2, SRS CR-01 line, all on `main`. **Gap:** F-01 1.6 is on `lab6-staging` only, not on `main` (defect D7-1) | README, D.2 |
| Deploy and smoke status | `python3 deploy/smoke_test.py <URL>` at 14:14: `GET /api/health` 200, `GET /` 200 HTML, `GET /api/me` without a session 401, exit 0. CR-01 production checks (E7-B5): 5 of 5 PASS | E7-D1-smoke.txt, E7-B5 |

**Decision: READY** for the maintained Sprint 1 scope in `v0.2.0-lab7` / `s47a6b53b-00007-mkk`.

Reasons:
- The approved change passes its red-then-green tests and the production checks.
- Every previously accepted Sprint 1 test passes unchanged on the release commit.
- The running revision is the release commit.
- The partner accepted the Sprint 1 release before this change.
- No critical or major defect is open.

READY does not mean the outstanding items below are done; each has an owner and an action.

| Outstanding item | Owner | Action |
|---|---|---|
| D7-1: `main` still has F-01 1.5 ("one row from 641 px") | A (Sprint 2 releases) | sync PR `lab6-staging` → `sprint-2-staging` (a merge, not a rebase) once the Lab 6 PDF (#127) is final and before the Sprint 2 release, so F-01 1.6, the Lab 6 evidence and the PDF sources reach `main` |
| E2E not in the required CI check | B | the Part C action: Playwright job in `ci-docker` before S2-03 |
| Est's non-blocking observations #151 (641 to 735 px) and #147 (label ellipsis at 320 px) | B | recheck both with the responsive debt item (TD-3) in the Sprint 2 UI work |
| #137 still open | A | close it; release, tag, deploy and evidence are done (#193, #196) |

## D.2 Defects by severity and status

| ID | Source | Severity | Status at the snapshot |
|---|---|---|---|
| #142 | Est, Lab 6 | major | resolved: fixed in `v0.1.3-lab6`, Est retest PASS |
| #141, #153 | Est, Lab 6 | minor | resolved: fixed in `v0.1.3-lab6`, Est retest PASS |
| #152 | Est, Lab 6 | duplicate of #142 | resolved with #142 |
| #143 to #148, #151, #154, #155 (9) | Est, Lab 6 | enhancements (minor) | done in `v0.1.3-lab6`, Est retest PASS |
| D7-1 | B, this review | minor (documentation) | **open**. The deployed contract `main` F-01 1.5 says the taskbar keeps one row "from 641 px", but Logout wraps at 641 to 735 px (Est's #151 observation). F-01 1.6 narrows the statement to "768 px and wider", but it is on `lab6-staging` only. The app is correct against 1.6, and the TEST-72 widths are 768 and 812 px |
| (none) | CR-01 work | | no defect found in the change; no new defect Issue opened in the Lab 7 window (M4) |

Critical: 0. Major: 0 open (1 resolved). Minor: 1 open (D7-1).

## D.3 Technical debt

Deferred engineering work, not wrong behavior; wrong behavior is in D.2.

| # | Item | Impact | Priority | Disposition / action |
|---|---|---|---|---|
| TD-1 | Playwright E2E is outside the required check (D-23); 20 tests run only by hand | A UI regression (TEST-61, or the Lab 6 fixes TEST-56, TEST-62 to TEST-72) can merge with a green check | high | E2E job in `ci-docker` before S2-03, recorded as a new decision D-39 that replaces D-23 in the same PR; owner B (Part C action) |
| TD-2 | E2E runs against the Vite dev servers, not the built image that is deployed | Behavior that only appears in dev leaks into tests: React StrictMode's double request forced the TEST-56 contract correction (`4c05a54`). A difference that only appears in the built image is never caught | medium | run the CI E2E job against the API serving `CLIENT_DIST`; owner B, with TD-1 |
| TD-3 | Responsive layout is checked only at sampled widths (TEST-65: 1280, 1024, 768, 375; TEST-72: 320 to 812) | #141 passed at 1280 and 375 px but overflowed at 768 and 812 px (follow-up PR #171). Est still saw Logout wrap at 641 to 735 px (#151) | medium | one width list shared by the layout tests, with 640, 700 and 1440 added; owner B, in the Sprint 2 UI work |
| TD-4 | Each page maps 401, 403 and 404 to its own screen (`EventsPage`, `EventRegistrationsPage`, `MyEventsPage`, `MyRegistrationsPage`) | Lab 6 defects #142, #152 and #153 came from this. The new Sprint 2 pages (cancel, manage event) can repeat it | medium | one shared error-to-screen helper, built in S2-03 (F-07 UI) and reused by F-08; owner A |
| TD-5 | BR-10 has no database constraint; it relies on the service check and the participant-row `FOR UPDATE` lock | A write path that skips the service (seed, script) can store a conflict. Only TEST-60 guards the race | low | keep TEST-60 in every regression run, and keep new write paths behind `registerForEvent` (F-07 re-registration included); owner A |
| TD-6 | Lab 6 post-release docs and evidence are on `lab6-staging` only (27 commits not on `main`) | The repository's `main` does not show the whole history the PDFs cite (D7-1 comes from this) | low | the sync PR in the outstanding items, after #127 is final; owner A |

## D.4 Retrospective

- **What helped:** reviewing the contract before any code found the one gap that mattered. A asked for TEST-59 (e), which checks that a started registration still counts, so the red set covered every BR-10 branch before the implementation was written.
- **What hurt:** red and green shared one PR (#190) opened from B's account, so GitHub let only A approve it. Its CI run failed on the red commit by design, and both had to be explained in comments. TEST-59 (e) also stayed hidden behind step (c) and needed a separate run.
- **What will change:** for Sprint 2, the red part gets its own reviewed PR into the unprotected feature branch (for example `feature/s2-03-cancel`), approved by the other student. The green PR then goes from that feature branch into `sprint-2-staging`, where `test-and-docker` must pass. Every red step gets its own `it`. Owner B, starting with S2-03 (F-07: B red, A green).

# Contribution, AI use and limitations (Parts C and D)

## Contribution (Parts C and D)

| Work | A (Kirakit) | B (Nattakit) |
|---|---|---|
| Metrics M1 to M5, source lists, interpretation and action (L7-06 #138) | reviewed; release record E7-B4 and CI runs used as sources | chose and defined the metrics, collected the lists from `gh`, ran build, `npm test` and E2E on `861f01f`, wrote the interpretation |
| Readiness checklist, defects, technical debt (L7-07 #139) | reviewed; production checks E7-B5 used as evidence; owner of D7-1, TD-4, TD-5, TD-6 and #137 | wrote; ran the production smoke test; found D7-1; owner of TD-1 to TD-3 |
| Retrospective | agreed the answers in review | drafted from the #185 and #190 history |
| PDF Parts C and D (L7-08 #140) | checks | wrote |

## AI use (Parts C and D)

| Tool | Task |
|---|---|
| Claude Code (Claude Sonnet), for B | collected the Issue, PR and CI-run lists with `gh`, ran the release test suites and the read-only smoke test on B's instruction, and drafted Parts C and D; B checked each value against the lists, the evidence files and git |

## Known limitations (Parts C and D)

- The metrics are a snapshot at 2026-11-27 14:11. Work after it is not counted: the PRs for Parts C and D, #210 and #211, and the Sprint 2 work. M1 therefore shows #137 to #140 as open.
- M5 counts only `ci-docker` and Deploy runs on Lab 7 branches; Lab 6 and Sprint 2 runs in the same window are left out by scope, not hidden.
- The E2E counts in M3 come from B's local run on the release commit, because Playwright is not in the required CI check (D-23, TD-1).
- The production checks in E7-B5 were requests sent by Claude Code from A's signed-in page, not clicks. The full-event path and the UI alert were not checked on production.
- READY covers the maintained Sprint 1 scope in `v0.2.0-lab7` only, not the three-sprint product. D7-1 is still open at the snapshot.
