<!-- Deliverable 2 PDF, Part A (S3-04 #209). Author: B (Nattakit Prasertsak). Checker: A. Draft: values marked [S2-06] are filled from the Sprint 2 release run, values marked [S3-03] from the D2 candidate `v0.4.0-rc1`. -->

# Part A: Sprint 1 continuity and change status

Part A shows that the accepted Sprint 1 slice still works after Labs 5 to 7 and Sprint 2, and lists every deployment, UAT and maintenance finding about our product with its decision, status, release and retest. Times are UTC+7.

## A.1 Accepted Sprint 1 baseline

| Item | Value |
|---|---|
| Accepted Sprint 1 release | tag `v0.1.0-sprint1`, commit `12dcd3c` (2026-11-08), Deliverable 1. The tag has never moved (D-17). |
| Sprint 1 scope | F-01 sign in and out, F-02 publish event, F-03 browse events, F-04 register, F-05 own registrations, F-06 organizer's registrations of an own event; AC-01 to AC-51 |
| Original critical domain journey | an organizer creates and publishes an event; a participant browses it, registers, and sees the registration in My registrations; the organizer sees it in the event's registrations. Automated as **TEST-22** (`e2e/golden-journey.spec.ts`), with the full-event message as TEST-23 |
| Releases since the baseline | `v0.1.1-lab5` `d9cf666` and `v0.1.2-lab5` `04e8590` (Lab 5), `v0.1.3-lab6` `502d2a6` (Lab 6), `v0.2.0-lab7` `861f01f` (Lab 7), Sprint 2 release `v0.3.0-sprint2` [S2-06], D2 candidate `v0.4.0-rc1` [S3-03] (D-32) |

## A.2 The original journey on later versions

| Version | Check | Result | Evidence |
|---|---|---|---|
| `v0.1.2-lab5` `04e8590`, revision `s47a6b53b-00005-5l7` | Est's independent UAT of the Sprint 1 scope on production (Lab 6): UAT-01 normal journey, UAT-02 boundary, UAT-03 forbidden role and ownership, UAT-04 persistence, UAT-05 drafts hidden, UAT-06 sign-in errors | all six cases passed; Est's 13 findings were fixed in `v0.1.3-lab6` | Lab 6 PDF, Part A and Part D |
| `v0.1.3-lab6` `502d2a6`, revision `s47a6b53b-00006-7bv` | Est's retest: all 13 findings and UAT-01, 02, 03, 04 (step 9: data survives the redeploy) and 06 | all PASS; decision **Accepted**, 2026-11-27 03:18 (our Issue #126) | Lab 6 PDF, Part D.4 |
| `v0.2.0-lab7` `861f01f` (release commit) | `npm test` and `npm run test:e2e` on the release commit (automated, B, 2026-11-27 14:11) | 73 passed, 0 failed, 0 skipped; E2E 20 passed, 0 failed, 0 skipped, TEST-22 and TEST-23 among them | Lab 7 E7-C3 |
| `v0.2.0-lab7`, revision `s47a6b53b-00007-mkk` | post-deployment checks on production (AI-executed requests on A's sign-in, 13:32 to 13:35): a repeat registration and a participant reading an organizer's list | 409 `ALREADY_REGISTERED` and 403 `FORBIDDEN`, as in Sprint 1 | Lab 7 E7-B5 |
| `sprint-2-staging` `06284ce` (same app code as `861f01f`) | the new CI job `e2e` on PR #220 (D-39) | 20 passed, TEST-22 included (run 45988721835) | #219, #220 |
| `sprint-2-staging` `33f80e8` (after the S2-02 migration #225 and F-07 #228) | `npm test` and `npm run test:e2e` on the #228 head `3b205c6` (B's merge recheck, 2026-11-28 02:14) | 80 passed, 0 failed, 0 skipped; E2E 21 passed, TEST-22 and TEST-23 unchanged among them | #202, #228 |
| Sprint 2 release `v0.3.0-sprint2` [S2-06] | `npm test` and `npm run test:e2e` on the release commit | [S2-06] | [S2-06] |
| **D2 candidate `v0.4.0-rc1`** [S3-03] | `npm run test:e2e` on the candidate commit and a post-deployment run of the journey on production with a uniquely named synthetic event | [S3-03] | [S3-03] |

The full API suite also runs on every pull request in `test-and-docker`: 73 tests on `861f01f` (the 69 from Sprint 1 to Lab 6 plus CR-01's TEST-57 to TEST-60), 80 on `33f80e8` after F-07's TEST-73 to TEST-79. Sprint 2 adds tests and never edits a Sprint 1 assertion (F-07 PRs #226 and #228 and the F-08 red PR #227 add new test files and change no Sprint 1 test file); a changed expected result would need a contract revision first, as CR-01 did in Lab 7.

## A.3 Change and defect register

**Resolved** means the change or fix is released on `main` and its retest passed. Est is the partner team of Lab 6 (EN-033). IDs are our Issue numbers where one exists.

| ID | Source | Affected requirement / feature | Accepted decision | Status | Fix / change release | Retest outcome |
|---|---|---|---|---|---|---|
| L5-1 | Lab 5 deployment: Deploy runs 44798044685, 44885988467, 44891493206 stopped before any cloud call (the environment `demo` had no variables, so the keyless sign-in failed) | deployment pipeline (D-22, Lab 5 release workflow) | configuration fix: the course portal's variables set on `demo`; no code change | resolved | `v0.1.2-lab5` `04e8590` | Deploy run 44898663334 succeeded; smoke test and the C-04 checks on the public URL passed (Lab 5 PDF Part 4) |
| L5-2 | Lab 5 deployment: GCP account | D-24 | the course's shared project replaces A's own trial project (D-25, course announcement 2026-11-20) | resolved | `v0.1.2-lab5` | first deploy and the C-05 persistence checks after redeploy and restart passed |
| #142 | Lab 6 UAT (Est) | F-01, NFR-01 (stale session in a second tab) | accepted defect, **major** | resolved | `v0.1.3-lab6` (PR #167, TEST-56) | Est PASS, 2026-11-27 02:15 to 02:46 |
| #141 | Lab 6 UAT (Est) | F-02, F-03 UI (long text breaks the layout) | accepted defect, minor (Est proposed major) | resolved | `v0.1.3-lab6` (PRs #162, #171, TEST-65) | Est PASS, 02:15 to 02:46 |
| #153 | Lab 6 UAT (Est) | F-06 UI, D-13 (403 or "Not found" by timing) | accepted defect, minor | resolved | `v0.1.3-lab6` (PR #179, TEST-69) | Est PASS, 00:21:35 |
| #152 | Lab 6 UAT (Est) | F-02 UI | duplicate of #142 | resolved with #142 | `v0.1.3-lab6` | Est PASS, 00:20:45 |
| #143 | Lab 6 UAT (Est) | F-04 UI (stale places after a 409) | enhancement, fixed in Lab 6 | resolved | `v0.1.3-lab6` (PR #168, TEST-62) | Est PASS, 02:15 to 02:46 |
| #144 | Lab 6 UAT (Est) | F-03 UI (description line breaks) | enhancement, fixed | resolved | `v0.1.3-lab6` (PR #166, TEST-66) | Est PASS, 02:15 to 02:46 |
| #145 | Lab 6 UAT (Est) | F-01, F-02 UI, NFR-09 (field errors and ARIA) | enhancement, fixed | resolved | `v0.1.3-lab6` (PR #170, TEST-64) | Est PASS, 02:15 to 02:46 |
| #146 | Lab 6 UAT (Est) | F-02 UI (saved message after Publish) | enhancement, fixed | resolved | `v0.1.3-lab6` (PR #169, TEST-63) | Est PASS, 02:15 to 02:46 |
| #147 | Lab 6 UAT (Est) | F-01 window shell at 320 px | enhancement, fixed | resolved | `v0.1.3-lab6` (PR #166, TEST-67) | Est PASS, 02:15 to 02:46 |
| #148 | Lab 6 UAT (Est) | F-01 window shell (Not found page) | enhancement, fixed | resolved | `v0.1.3-lab6` (PR #166, TEST-68) | Est PASS, 02:15 to 02:46 |
| #151 | Lab 6 UAT (Est) | F-01 window shell (taskbar overlap) | enhancement, fixed; Est proposed major, we classed minor | resolved | `v0.1.3-lab6` (PR #178, TEST-72) | Est PASS, 00:20 to 00:21 |
| #154 | Lab 6 UAT (Est) | F-02 UI (Create event shown to a participant) | enhancement, fixed | resolved | `v0.1.3-lab6` (PR #176, TEST-71) | Est PASS, 00:21:36 |
| #155 | Lab 6 UAT (Est) | F-01, F-02 UI (password cleared after a 400) | enhancement, fixed | resolved | `v0.1.3-lab6` (PR #180, TEST-70) | Est PASS, 00:21:46 |
| L6-O1 | Lab 6: A's release smoke check (727 px) and Est's retest note on #151 | F-01 window shell, AC-72 | accepted limitation: between 641 and 735 px the taskbar wraps Logout to a second row, nothing is covered; AC-72 narrowed to 768 px and wider (F-01 1.6) | **remaining** (known limitation) | none | not a defect against F-01 1.6; recheck planned with the Sprint 2 UI work (Lab 7 TD-3) |
| L6-O2 | Lab 6: Est's retest note on #147 | F-01 window shell at 320 px | accepted limitation: the Restore label is cut with an ellipsis; the button stays inside the screen | **remaining** (known limitation) | none | non-blocking in Est's decision (#126) |
| CR-01 | Lab 7 maintenance: approved change request (#133) | FR-06, new BR-10, F-04 1.7 | requirement change: 409 `TIME_CONFLICT` for two ACTIVE registrations less than 120 minutes apart | resolved | `v0.2.0-lab7` `861f01f` (PRs #183, #184, #185, #190, release #193) | TEST-57 to TEST-61 red on `502d2a6`, green on `861f01f`; production checks 5 of 5 PASS (E7-B5) |
| D7-1 | Lab 7 readiness review (B) | documentation: F-01 contract on `main` | accepted documentation defect, minor: `main` still has F-01 1.5 ("one row from 641 px"); 1.6 exists only on `lab6-staging` | **remaining** | sync PR `lab6-staging` → `sprint-2-staging` before S2-06 (owner A) [S2-06] | [S2-06] |
| TD-1 | Lab 7 metrics and readiness (B) | NFR process, D-23 | technical debt: E2E was outside the required check; fixed by the CI job `e2e` (D-39) | resolved on `sprint-2-staging`; ships in `v0.3.0-sprint2` | PR #220 (#219, closed 2026-11-28) | the job ran 20 passed on its own PR; `e2e` is a required check of the ruleset next to `test-and-docker` since 2026-11-28 |

Totals: 2 Lab 5 deployment findings (resolved), 13 Lab 6 UAT findings (3 accepted defects including 1 major, 1 duplicate, 9 enhancements; all resolved and retested by Est), 2 accepted Lab 6 limitations (remaining, non-blocking), 1 Lab 7 change (released), 1 open documentation defect and 1 resolved technical-debt item. No critical or major defect is open.

## A.4 Approved baseline revisions

Decisions are never renumbered; a revised decision keeps its old text struck through (`docs/decisions.md`).

| Revision | Date | What changed | Rationale | Record |
|---|---|---|---|---|
| D-17 | 2026-11-13 | after Deliverable 1, reviewed release PRs into `main` are allowed, each with its own tag; `v0.1.0-sprint1` never moves | Lab 5 needs releases through `main`; the D1 rule covered the D1 submission only | #85 |
| D-18, D-19, D-20 | 2026-11-13 | one container serves UI and API; Node 22.9+ locally and Node 24 in the image (D-19 revised from Node 20); the deployed database is never reset and migrations only add | Lab 5 packaging; the `--env-file-if-exists` scripts need Node 22.9; production data must survive releases | #85, #87 |
| D-21, D-22 | 2026-11-13 | `lab5-staging` as Lab 5 integration branch (revised from reusing `sprint-1-staging`); only `main` deploys to Cloud Run with Cloud SQL | keep Sprint 1 history separate; one deploy path | #85 |
| D-23 → D-39 | 2026-11-13, revised 2026-11-27 | required check `test-and-docker`; E2E, first local only, now runs in CI as job `e2e` | Lab 7 metrics showed the 20 E2E tests could break with a green check | #219, PR #220 |
| D-24 → D-25 | 2026-11-13, revised 2026-11-20 | GCP: the course's shared project replaces A's own trial project | course announcement 2026-11-20 | #85 |
| D-26 to D-29 | 2026-11-24 | Lab 6: `lab6-staging`, UAT baseline `v0.1.2-lab5`, UAT data rules, corrected release `v0.1.3-lab6` | independent UAT with a partner team | Lab 6 plan |
| F-01 1.1 to 1.5, F-02 1.1 to 1.4, F-03 1.2, F-04 1.6, F-05/F-06 1.2 | 2026-11-26 | new AC-56, AC-62 to AC-72 and their TEST rows for the Lab 6 findings, each committed before its red test | Est's UAT findings (A.3) | Lab 6 PDF Part D.1 |
| F-01 1.6 | 2026-11-26 | AC-72 narrowed to 768 px and wider | found in A's release smoke check; on `lab6-staging` only (D7-1) | PR #182 |
| D-31, CR-01: SRS FR-06 and BR-10, F-04 1.7, system SDS 1.2, F-02 1.5 | 2026-11-27 | `lab7-staging`; the time-conflict rule; TEST-65 fixture moved two weeks ahead (assertions unchanged) | approved change request CR-01 | #133, #134, PR #185, #190 |
| D-32 to D-35 | 2026-11-27 | Sprint 2: `sprint-2-staging` and the release `v0.3.0-sprint2`; Sprint 3 progress on `sprint-3-staging` with the D2 candidate `v0.4.0-rc1`; cancellation, event lifecycle and deadline rules | rules fixed before the Sprint 2 contracts | #199, PRs #198, #223 |
| D2 scope, D-36 to D-38 | 2026-11-27, revised 2026-11-28 | PR #216 narrowed D2 to Sprint 2 and deferred D-36 to D-38; PR #223 (merged 2026-11-28 00:52) reverted that: D2 covers Sprint 2 completion and Sprint 3 progress again, D-36 to D-38 are active, Sprint 3 Issues #206 to #208 reopened. Both changes stay in the history | the D2 handout asks for Sprint 3 progress; A and B decided to restore it | PRs #216, #223 |
| F-02 1.6, F-03 1.3, F-04 1.8, F-05/F-06 1.3 | 2026-11-27 | Sprint 1 contracts revised for F-08: CLOSED events listed, CANCELLED hidden from non-owners, `EVENT_CLOSED` in the registration order (D-35); Sprint 1 AC and tests unchanged | the Sprint 2 features change Sprint 1 visibility rules, so the contracts say so before any test | PR #221 (with #222) |
