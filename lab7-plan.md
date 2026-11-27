# CPE 334 Lab 7 Plan: Software Maintenance Metrics and Release Readiness, Sprint 1

Team: A = songt888 (Kirakit Kingkaew), B = stickkersz (Nattakit Prasertsak). Same repo, same app, same rules as `AGENTS.md`.
Deliverable: one self-contained PDF on LEB2. Due **Sunday 29 Nov 2026, 23:59**, the same day as Lab 6 and Deliverable 2.
Source: `CPE334 Lab 7` handout (it wins on any conflict).

**What Lab 7 asks.** "Can you change it without breaking it?" We change one business rule that already works in Sprint 1, because the requirement changed (not because it is wrong). We analyse the impact, revise the contract **before** code, show the new test red on the old code and green after, keep the old behavior passing, release it through the Lab 5 pipeline, and report five metrics and an honest readiness review.

**The change (CR-01, L7-01).** F-04 registration gets a new rule BR-10: a participant cannot hold two ACTIVE registrations for events whose start times are less than 120 minutes apart (409 `TIME_CONFLICT`; exactly 120 minutes is allowed). No schema change.

**Parallel work (TA, 26 Nov).** Lab 6, Lab 7 and Sprint 2 may run at the same time. Lab 7 keeps its own Issues, branches and PRs (label `lab7`), never mixed into a Sprint 2 or Lab 6 PR. The Lab 7 PDF holds its own complete evidence even where Deliverable 2 uses the same change. Instructor announcement (26 Nov): no instructor/TA approval is needed for the change request, but the change must be a non-trivial change to a Sprint 1 behavior.

## 0. What is graded (100 points)

| Part | Pts | The one thing TAs will open |
|---|---|---|
| A Change impact and updated contract | 25 | CR-01 with old/new rule, baselines, impact table; revised SRS / feature SDS / system SDS / STS with versions; B's review dated **before** the red commit |
| B Implementation and regression-safe delivery | 50 | red output on the pre-change commit, green output, code diff, regression counts, reviewed PRs, CI, release PR, tag, deploy, post-deployment checks (changed and preserved behavior) |
| C Objective engineering metrics | 15 | five dated metrics with definition, scope, window, value, embedded source lists; interpretation ≤ 100 words with one action and owner |
| D Release readiness and retrospective | 10 | checklist with READY / NOT READY for the maintained Sprint 1 scope, defects, debt, failed/skipped checks; three short retrospective answers |

## 1. Where the repo stands

| Need | State |
|---|---|
| Accepted Sprint 1 baseline | tag `v0.1.0-sprint1` = `12dcd3c` (old rule) |
| Pre-change implementation | `main` `502d2a6` = tag `v0.1.3-lab6`, Cloud Run revision `s47a6b53b-00006-7bv`. Between the baseline and here: Lab 5 Docker, CI/CD and deploy, and Lab 6 client fixes; no server code changed after Lab 5 (`git diff 04e8590 502d2a6 -- server` is empty), so `registerForEvent` is unchanged |
| Lab 6 state | `v0.1.3-lab6` is released and deployed; Est's retest (L6-07 #126) is pending. Lab 6 E2E tests are on `main` (see CR-01 regression note) |
| Pipeline | `ci-docker.yml` (`test-and-docker`) on PRs; `deploy.yml` on push to `main`. L7-00 adds `lab7-staging` to the CI trigger |
| Ruleset | `lab5-protect-main-and-staging` (1 approval, required `test-and-docker`). A adds `lab7-staging` |

## 2. Decisions (add to `docs/decisions.md`, never renumber)

| ID | Decision | Note |
|---|---|---|
| D-31 | Integration branch `lab7-staging`, created from `main` `502d2a6` (tag `v0.1.3-lab6`); branches `docs/l7-NN-topic`, `feature/l7-NN-topic`, `fix/l7-NN-topic`; label `lab7`. Release: reviewed PR `lab7-staging` → `main`, tag `v0.2.0-lab7`. The Lab 7 release and deploy wait until Est's Lab 6 retest of our app is recorded (L6-07 #126); fallback 29 Nov 12:00 (section 7) | CR-01 would change the result of our Lab 6 case UAT-02 (two registrations for events at the same time) while Est retests it. |

## 3. Issues (label `lab7` on every Issue and PR)

Board: "Event Registration - Lab 7" (https://github.com/users/songt888/projects/6), columns Backlog → Specified → Started → PR Review → Fixing → Done. The teammate reviews with a specific check or finding, approves and merges. Authors never approve their own PR.

| Issue | Work | Author | Reviewer | Done when (evidence) |
|---|---|---|---|---|
| L7-00 (#132) | this plan, D-31, `AGENTS.md` Lab 7 rules, CI on PRs into `lab7-staging`; create `lab7-staging`; add it to the ruleset | A | B | merged; CI ran on the PR; ruleset covers `lab7-staging` |
| L7-01 (#133) | Part A: `docs/labs/lab-07/change-request.md` (CR-01, old/new rule, baselines, boundaries, AC-57 to AC-61, impact table, preserved behavior) | A | B | merged **before** the L7-03 red commit; review text names a specific check |
| L7-02 (#134) | Part A: revised contract: `docs/srs.md` (FR-06, BR-10), `f-04-register.md` (rule, errors, AC, STS TEST-57 to TEST-61, version row), `system-sds.md` (lock order, error code), `traceability.md` | B | A | merged **before** the L7-03 red commit; old text kept in the version history for the PDF |
| L7-03 (#135) | Part B red: TEST-57 to TEST-60 (Supertest, real test DB) committed alone and run on the unchanged `registerForEvent` | B | A | failing output with command and tested commit in `docs/labs/lab-07/evidence/`; every failure is 201 where 409 is expected (or the concurrency count), not a compile error |
| L7-04 (#136) | Part B green: BR-10 in `registerForEvent` (participant row lock after the event row), TEST-61 for the UI message, full `npm test` and `npm run test:e2e` | A | B | passing output and counts with the commit hash; PR merged after a substantive review |
| L7-05 (#137) | Part B release: release PR `lab7-staging` → `main`, tag `v0.2.0-lab7`, deploy, post-deployment checks (changed and preserved behavior), version table | A | B | revision recorded; checks as API output or screenshots, not only a green icon |
| L7-06 (#138) | Part C: `docs/labs/lab-07/metrics.md`, five metrics and one action | B | A | values reconcile with the embedded lists; ≤ 100 words |
| L7-07 (#139) | Part D: `docs/labs/lab-07/readiness.md`, checklist, debt table, READY / NOT READY, three retrospective answers | B | A | nothing failed is hidden |
| L7-08 (#140) | Lab 7 PDF | A and B | each checks the other's parts | both have read the whole PDF; submitted |

## 3a. Who does what

| Member | Author of | Reviews |
|---|---|---|
| A (songt888) | L7-00, L7-01, L7-04, L7-05 (deploys via the course portal), PDF Parts A and B | L7-02, L7-03, L7-06, L7-07 |
| B (stickkersz) | L7-02, L7-03, L7-06, L7-07, PDF Parts C and D | L7-00, L7-01, L7-04, L7-05 release PR |

## 4. TDD order for the change

Contract first: L7-01 and L7-02 merged into `lab7-staging` (reviewed) before any test. Then on `feature/l7-03-time-conflict`: a `test(L7-03)` commit with TEST-57 to TEST-60 alone, run on the unchanged service (red); then a `feat(L7-04)` commit (green); then evidence. Test names carry the TEST and AC IDs, for example `TEST-58 AC-58 allows a registration exactly 120 minutes after another`. Branches catch up by merging `lab7-staging` in, never by rebase, so the evidence hashes stay valid. Old tests are never weakened, skipped or deleted; if an old expected result legitimately changes, the STS row is versioned and the reason recorded.

## 5. Evidence plan

| ID | Proof | Part |
|---|---|---|
| E7-A1 | CR-01 at its merge commit and B's review text | A |
| E7-A2 | old/new excerpts of FR-06, BR-10, F-04 sections and STS rows; A's review text; merge dates before the red commit | A |
| E7-B1 | red: command, test file excerpt (setup and assertions), failing output, tested commit | B |
| E7-B2 | green: same tests passing, code diff of `registerForEvent` | B |
| E7-B3 | regression: full `npm test` and E2E with versions and passed/failed/skipped counts, and why the suite is relevant | B |
| E7-B4 | PR review text, CI run, release PR, tag, Deploy run, Cloud Run revision | B |
| E7-B5 | post-deployment checks: 119/120-minute cases on production (synthetic events), plus a preserved Sprint 1 path (capacity or duplicate, and a participant refused another's data) | B |
| E7-C1..5 | the five metric source lists | C |
| E7-D1 | readiness checklist and debt table | D |

Each screenshot or log carries the evidence ID, action, expected and actual result, time and commit or revision. No password, token, cookie or `DATABASE_URL`; account labels only.

**Version table (PDF):** `v0.1.0-sprint1` / `12dcd3c` (old rule) → pre-change `502d2a6` / `v0.1.3-lab6` / `-00006-7bv` → contract commits → red test commit → green commit → release merge on `main` → `v0.2.0-lab7` → deployed revision. `v0.1.2-lab5` and `v0.1.3-lab6` sit between the baseline and the pre-change commit as unrelated maintenance (Lab 5 deployment, Lab 6 client fixes).

## 6. Safety rules

- Production data is never reset (D-20). Post-deployment checks create uniquely named synthetic events through the app (as D-28) and leave them.
- Registrations made before the release that already conflict stay as they are; the rule applies to new registrations only.
- All `AGENTS.md`, Lab 5 cloud rules and Lab 6 rules still apply.

## 7. Order of work

| Date | Work |
|---|---|
| Thu 26 Nov | L7-00 merged; `lab7-staging` created; L7-01 drafted |
| Fri 27 | L7-01 and L7-02 reviewed and merged; L7-03 red; L7-04 green, PR review, CI |
| Sat 28 | L7-06 metrics and L7-07 readiness drafted (final values after the release); wait for Est's Lab 6 retest |
| Sun 29 | by 12:00 at the latest: L7-05 release, tag, deploy, checks; metrics and readiness finalised; L7-08 PDF; submit |

**Release order with Lab 6 (D-31).** Lab 6 UAT-01 and UAT-02 both register Participant 3 for events at "tomorrow 10:00". Under BR-10 the second would get `TIME_CONFLICT`, so CR-01 must not be live while Est runs or retests our cases. Contract, red, green, review and CI go ahead now. The release PR to `main` and the deploy wait until Est's retest is recorded (L6-07 #126). If it is not done by 29 Nov 12:00, we tell Est on Discord, record the Lab 6 decision as it stands, and release. After the release, UAT-02 is rerun only with start times at least 2 hours from Participant 3's other events; this is a known effect of CR-01, not a Lab 6 defect.

## 8. Definition of Done for Lab 7

- [ ] CR-01 states old and new rule, boundaries, invalid cases and roles, and names the baseline and pre-change versions
- [ ] impact analysis, revised contract and teammate review are dated before the red commit
- [ ] a meaningful test fails on `502d2a6` code and passes after the change; existing regression passes with counts
- [ ] review, CI, release, tag, deploy and post-deployment checks form one traceable sequence
- [ ] five metrics reconcile with embedded sources; interpretation ≤ 100 words
- [ ] READY / NOT READY stated for the maintained Sprint 1 scope; three retrospective answers; contribution table, AI use, limitations; one PDF, no secret
