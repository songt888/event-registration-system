<!-- Deliverable 2 PDF, Part E (S3-04 #209). Author: B (Nattakit Prasertsak). Checker: A. Skeleton: values marked [S3-03] are filled from the candidate release run (#208), [S3-03] from the Sprint 2 release run (#205); nothing below claims a run that has not happened. -->

# Part E: Integrated release candidate

The submitted candidate is `v0.4.0-rc1` on `main` (D-32, #208): it is released from `sprint-3-staging`, which starts from `main` after the Sprint 2 release `v0.3.0-sprint2` (#205), so it integrates Sprint 1, the Lab 5 to 7 changes, the Sprint 2 features F-07, F-08, F-09 and the Sprint 3 work merged by then (Part C). If a part is not merged at submission, it is named here and in Part B or C as such. Times are UTC+7.

## E.1 Candidate version

| Item | Value |
|---|---|
| Sprint 2 release | tag `v0.3.0-sprint2` on merge commit `7e34f1b` (release PR #235, merged 2026-11-28 15:15); deploy run 46125000564 (success, 15:16 to 15:17); revision `s47a6b53b-00008-qrx`, 100 percent of traffic; smoke 3 of 3 PASS |
| Candidate tag and commit | `v0.4.0-rc1`, merge commit `d2b5087` (release PR #243, head `2d24701`, merged 2026-11-28 17:47 UTC+7) |
| CI on the release PR head | `test-and-docker` run 46134292242 (pass); `e2e` run 46134292242 (pass) |
| Deploy run | "Deploy to Google Cloud" run 46136809321 (success), push of the merge commit |
| Deployed URL and revision | https://s47a6b53b-4d7hbszvwq-as.a.run.app, revision `s47a6b53b-00009-txn`, 100 percent of traffic |
| Running revision = candidate commit | image `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s47a6b53b/s47a6b53b:d2b5087d73da51ae6764047b44ccc291595090f6` (the merge commit's full SHA); the served bundles `index-C4SPMp4G.js` / `index-BQpnM-JE.css` equal a local `npm run build` of the commit (verified 2026-11-28) |
| Migration | S2-02 (#201, merged `a94ef4d`) adds enum values and nullable columns only (D-20); S3-02 adds the `CheckIn` table (additive, F-10 contract section 8; verified applied with the ACTIVE partial index intact); the deploy's migration job ran in run 46136809321 with `migrate deploy` and the non-destructive `seed:demo`; production data is not reset |

## E.2 Build and automated suites on the candidate commit

| Command | Result on the candidate commit |
|---|---|
| `npm run build` | succeeds - server `prisma generate && tsc`, client `tsc -b && vite build` (B on `b758793`; the Docker image build in CI run 46134292242 on the candidate) |
| `npm test` (Vitest + Supertest, real PostgreSQL) | 153 passed, 0 failed, 0 skipped on `2d24701`, the #243 head; the merge commit `d2b5087` has the same tree; baseline before Sprint 2: 73 passed, 0 failed, 0 skipped on `861f01f` |
| `npm run test:e2e` (Playwright, Chromium; also the CI job `e2e`, D-39) | 28 passed, 0 failed on `2d24701`; baseline before Sprint 2: 20 passed, 0 failed, 0 skipped |
| `bash deploy/tests/test_deploy_stub.sh` (TEST-54), `bash deploy/tests/test_release_stub.sh` (TEST-55) | 6/6 and 10/10 on the release recheck (`5d365c0`, B); the scripts are unchanged on the candidate |

Failed and skipped tests are listed here with their reason, never removed or weakened to make the suite green.

Progress recorded before the candidate (B's merge rechecks, each in a clean worktree on the exact commit):

| Commit | What it adds | `npm test` | `npm run test:e2e` |
|---|---|---|---|
| `acb3e86` (#225, merged as `a94ef4d`) | S2-02 migration | 73 passed, 0 failed, 0 skipped | 20 passed |
| `3b205c6` (#228, merged as `33f80e8`) | F-07 cancel registration (TEST-73 to TEST-80) | 80 passed, 0 failed, 0 skipped | 21 passed |
| `a39258c` (#231, merged as `5a001f8`) | F-08 manage event (TEST-90 to TEST-109) | 98 passed, 0 failed, 0 skipped | 24 passed |

## E.3 Cross-feature regression

New Sprint 2 and Sprint 3 behavior touches older behavior, shared data, roles and calculations. Each check below runs on the candidate; the planned test is named so the result can be traced.

| Check | Features | Planned test | Result |
|---|---|---|---|
| Cancelling a registration frees its place: `remainingPlaces` goes up by one and another participant can take it | F-07, F-04 (BR-02, BR-07) | TEST-78 | pass on `2d24701` (the verified suites) |
| A cancelled registration no longer blocks BR-10: the participant can register for an event less than 120 minutes away | F-07, CR-01 (BR-10) | TEST-79 | pass on `2d24701` |
| Cancelling an event cancels its ACTIVE registrations in one transaction; they show CANCELLED in My registrations and in the owner's roster | F-08, F-05, F-06 | TEST-99, TEST-108, TEST-109 | pass on `2d24701` |
| A capacity cut and a registration for the last place at the same time never exceed the final capacity | F-08, F-04 (BR-02, D-10) | TEST-92 | pass on `2d24701` (run 5 times) |
| Deadline, closed state and BR-10 keep the D-35 check order | F-09, F-08, F-04 | TEST-88 | pass on `2d24701` |
| Check-in refuses a cancelled registration, including one cancelled by an event cancel; a checked-in registration cannot be cancelled before the start | F-10, F-07, F-08 | TEST-113, TEST-118 | pass on `2d24701` (verified) |
| Sprint 1 journey, authentication, backend permissions and record ownership unchanged | F-01 to F-06 | TEST-22, TEST-23, the 69 Sprint 1/Lab 6 API tests | pass on `2d24701` |

## E.4 Post-deployment checks on production

Uniquely named synthetic events, never a reset (D-20, D-28). Evidence IDs E-E-1 to E-E-4 in `docs/sprints/sprint-2/evidence/`.

| ID | Journey | Expected | Result |
|---|---|---|---|
| E-E-1 | Sprint 1 critical journey: create, publish, register, My registrations, roster | as Sprint 1 | pass - 16/16 on `s47a6b53b-00009-txn` (2026-11-28 18:08 UTC+7, `evidence/e-e-rc1-20261128.txt`) |
| E-E-2 | Persistence: cancel a registration, reload and sign in again | the CANCELLED row is still there | pass - CANCELLED + `cancelledAt` after a fresh sign-in |
| E-E-3 | Rule rejection: capacity below the ACTIVE count | 409 `CAPACITY_BELOW_ACTIVE` | pass - capacity 1 < ACTIVE 2 |
| E-E-4 | Backend protection: another organizer edits an event; a participant cancels another participant's registration | 403 / 404 from the API, nothing changed | pass - 403 foreign edit, 403 wrong-role cancel, 404 foreign cancel |
| smoke | `python3 deploy/smoke_test.py <URL>` | `/api/health` 200, `/` 200, `/api/me` 401 | pass on `s47a6b53b-00009-txn` (smoke + the E-E-0 probe) |

## E.5 Setup summary

**Dependencies:** Node 22.9 or newer locally (Node 24 in the image and CI, D-19), npm, Docker Desktop (PostgreSQL 16), Git. Playwright Chromium for E2E (`npx playwright install chromium`, once).

**Environment variables** (names only; values come from `server/.env` locally, copied from `.env.example`, and from Secret Manager or Cloud Run in the cloud; nothing real is in Git):

| Name | Purpose | Secret |
|---|---|---|
| `DATABASE_URL` | database the app uses | yes (cloud) |
| `DATABASE_URL_TEST` | test database for `npm test`, never the dev one | no (local placeholder) |
| `DATABASE_URL_E2E` | E2E database, reset and seeded before each run | no (local placeholder) |
| `PORT` | API port (3000 locally; set by Cloud Run) | no |
| `NODE_ENV` | `development` locally, `production` in the cloud | no |
| `SESSION_TTL_MINUTES` | session length (60) | no |
| `COOKIE_SECURE` | `false` locally, `true` in the cloud | no |
| `SEED_PASSWORD` | password of the synthetic demo accounts | yes on the deployed database |
| `CLIENT_DIST` | folder of the built UI the API serves (image only, D-18) | no |

**Commands:**

```bash
cp .env.example server/.env      # local placeholders; set SEED_PASSWORD
docker compose up -d db          # PostgreSQL with dev, test and E2E databases
npm install
npm run migrate                  # apply migrations to the dev database
npm run seed                     # synthetic data; local, test and E2E databases only
npm run dev                      # API :3000, UI :5173
npm test                         # unit + API/DB integration on DATABASE_URL_TEST
npm run test:e2e                 # Playwright on DATABASE_URL_E2E
npm run build                    # server and client
docker compose up --build        # whole app in one container on :3000 (root .env)
```

**Database migration and seed:** `npm run migrate` applies Prisma migrations; migrations only add (D-20). `npm run seed` empties every table and is for local, test and E2E databases only; a deployed database uses `npm run seed:demo`, which only adds missing demo accounts and events.

**Deployment:** every push to `main` runs `.github/workflows/deploy.yml`: build and push the image tagged with the commit SHA, run the migration job (`migrate deploy` and `seed:demo`), then `gcloud run deploy` to the Cloud Run service `s47a6b53b`. Sign-in is keyless (Workload Identity Federation); Actions are pinned to commit SHAs. Check a deploy with `python3 deploy/smoke_test.py <URL>`. Roll back by sending traffic to an earlier revision or redeploying an earlier release image, never by resetting the database.

**Repository docs:** the final deployment guide (`docs/labs/lab-05/deployment.md` version 0.2, with the cloud resources and the release and rollback procedure) and F-01 1.6 were only on `lab5-staging` and `lab6-staging` and so not in `v0.3.0-sprint2` (D7-1 in Part A); #238 brought them to `sprint-3-staging` (merged `0e6627d`), so the candidate carries them.

## E.6 Readiness of the candidate

| Item | Status |
|---|---|
| Sprint 2 features F-07, F-08, F-09 | all AC pass (Part B.3 completion table; 143/143 on the release head) |
| Sprint 3 progress | contracts merged (#224, #234); F-10 implemented and tested - AC-110..AC-119 pass on `2d24701` (Part C) |
| Automated suites on the candidate | 153 passed (153) and E2E 28 passed (E.2) |
| Cross-feature checks | all pass on `2d24701` (E.3) |
| Deploy and post-deployment checks | done (E.1, E.4: E-E-1..4 16 checks passed, 0 failed on `s47a6b53b-00009-txn`) |
| Open defects | none critical or major; no Sprint 2 or Sprint 3 defect (Part A.3, #207/#204 close-outs) |
| Known limitations | the 641 to 735 px taskbar wrap and the #147 label ellipsis (Lab 6, accepted) |
| Decision | READY for the candidate scope - Sprint 2 complete (F-07/F-08/F-09 all AC pass, Part B.3) and Sprint 3 progress delivered (contracts F-10..F-13 merged; F-10 implemented and tested, AC-110..AC-119 pass on `2d24701`); no critical or major defect open; decided by A and B at submission |

## E.7 Plan to the final release (13 December)

Final examinations run from 1 to 11 December. Dates are targets agreed in `deliverable2-plan.md` section 5; anything not finished by 29 November is reported in the Part B completion table and in Part C, not moved to look complete.

| Item | Owner | Target | Depends on |
|---|---|---|---|
| Finish any Sprint 2 or Sprint 3 AC still missing at D2 | A and B | none missing at D2 | candidate |
| S3-01 contracts F-10 to F-13 | A and B | done 2026-11-28 (#224, #234 merged into `sprint-3-staging`) | D-36 to D-38 |
| S3-02 F-10 check-in (the implemented Sprint 3 rule) | B | before S3-03 | S3-01, Sprint 2 release |
| F-11 attendance record and report | B | 5 Dec | F-10 |
| F-12 organizer summary dashboard | A | 5 Dec | F-11 |
| F-13 login rate limit, NFR-05 measurement, NFR-09 checks for the new screens | A | 8 Dec | F-10 to F-12 |
| UAT retest of the new features with Est, final regression | A and B | 11 Dec | F-10 to F-13 |
| Final release `v1.0.0`, video, final PDF | A and B | 13 Dec | all above |
