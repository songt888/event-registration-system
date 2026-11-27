# Lab 7 Part C: five engineering metrics and one action (L7-06 #138)

Author B (Nattakit Prasertsak), reviewer A. Repository `songt888/event-registration-system` only; no other repository and no test run older than the release commit.

- **Window W:** 2026-11-26 00:00 to 2026-11-27 14:11 (UTC+7). The Lab 7 Issues were created at 02:42 on 26 Nov, so all Lab 7 work is inside W.
- **Snapshot S:** 2026-11-27 14:11 (UTC+7), after the Lab 7 release (`v0.2.0-lab7`, merge commit `861f01f`, revision `s47a6b53b-00007-mkk`). This PR and later work are not counted.
- **Sources:** `gh issue list`, `gh pr list` and `gh run list` against the repository at S, and B's run of the suites on `861f01f` at S (E7-C3). All times UTC+7.

## Metrics

| # | Metric | Definition | Scope | Window / snapshot | Value | Source |
|---|---|---|---|---|---|---|
| M1 | Completed Lab 7 Issues | Issues with label `lab7` closed as completed, over all `lab7` Issues; duplicates and cancelled Issues counted apart | Lab 7 work Issues #132 to #140 | W, state at S | **5 of 9 closed (56%)**, 0 duplicate, 0 cancelled; 4 open | E7-C1 |
| M2 | Merged Lab 7 PRs | PRs with label `lab7` merged in W, by target branch; PRs closed without merge counted apart | `lab7-staging` and `main` | W | **7 merged**: 6 into `lab7-staging`, 1 release into `main`; 0 closed unmerged | E7-C2 |
| M3 | Automated test results on the release commit | Passed / failed / skipped for one named suite on one commit: `npm test` (Vitest unit + Supertest API/DB integration on `DATABASE_URL_TEST`) | release commit `861f01f` (`v0.2.0-lab7`) | run at S (14:11) | **15 files, 73 passed, 0 failed, 0 skipped**. Also on the same commit: `npm run build` OK; `npm run test:e2e` (Playwright, Chromium) **20 passed, 0 failed, 0 skipped** | E7-C3 |
| M4 | UAT defect status of our product | Findings from the partner team (Est) about our app, by class. **Resolved** = fix released in `v0.1.3-lab6` **and** Est's retest PASS recorded on the Issue | our app, Lab 6 findings #141 to #155 | status at S | **13 of 13 resolved (100%)**: 3 accepted defects (1 major), 1 duplicate, 9 enhancements; 0 open. New defects reported in W: **0** | E7-C4 |
| M5 | CI run outcomes for Lab 7 | GitHub Actions runs of `ci-docker` on PRs into `lab7-staging` or `main` from Lab 7 branches, and "Deploy to Google Cloud" on pushes to `main`, by conclusion | the two workflows, Lab 7 branches only (Lab 6 and Sprint 2 runs in W excluded) | W | `ci-docker`: **12 runs: 11 success, 1 failure, 0 cancelled**; the failure is the intended red commit (see E7-C5). Deploy: **1 of 1 success** | E7-C5 |

Percentages give numerator and denominator. M3 and M5 state failed, skipped and cancelled counts even when zero.

## Source lists

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

## Interpretation (at most 100 words)

M5 is green apart from the intended red (11 of 12 `ci-docker` runs), but the required check runs only `npm test` (D-23). The 20 E2E tests in M3 ran only on our laptops: TEST-61 (the `TIME_CONFLICT` message) and the Lab 6 fix tests TEST-56 and TEST-62 to TEST-72, which cover all 13 findings resolved in M4. A Sprint 2 change that breaks those screens could merge green, and M4's 100% would silently stop holding.

**Action:** add a Playwright E2E job to `ci-docker` for PRs into `sprint-2-staging`, before the first Sprint 2 feature PR (S2-03). Owner: B.
