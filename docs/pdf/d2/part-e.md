<!-- Deliverable 2 PDF, Part E (S3-04 #209). Author: B (Nattakit Prasertsak). Checker: A. Skeleton: values marked [S3-03] are filled from the candidate release run (#208), [S3-03] from the Sprint 2 release run (#205); nothing below claims a run that has not happened. -->

# Part E: Integrated release candidate

The submitted candidate is `v0.4.0-rc1` on `main` (D-32, #208): it is released from `sprint-3-staging`, which starts from `main` after the Sprint 2 release `v0.3.0-sprint2` (#205), so it integrates Sprint 1, the Lab 5 to 7 changes, the Sprint 2 features F-07, F-08, F-09 and the Sprint 3 work merged by then (Part C). If a part is not merged at submission, it is named here and in Part B or C as such. Times are UTC+7.

## E.1 Candidate version

| Item | Value |
|---|---|
| Sprint 2 release | `v0.3.0-sprint2`, merge commit [S2-06] (release PR [S2-06]) |
| Candidate tag and commit | `v0.4.0-rc1`, merge commit [S3-03] (release PR [S3-03]) |
| CI on the release PR head | `test-and-docker` run [S3-03]; `e2e` run [S3-03] |
| Deploy run | "Deploy to Google Cloud" run [S3-03], push of the merge commit |
| Deployed URL and revision | https://s47a6b53b-4d7hbszvwq-as.a.run.app, revision [S3-03] |
| Running revision = candidate commit | image tagged with the full commit SHA; the served client bundle name equals a local `npm run build` of the commit [S3-03] |
| Migration | S2-02 (#201, merged `a94ef4d`) adds enum values and nullable columns only (D-20); S3-02 adds the `CheckIn` table (additive, F-10 contract section 8) [S3-03]; the deploy's migration job runs `migrate deploy` and the non-destructive `seed:demo`; production data is not reset [S3-03] |

## E.2 Build and automated suites on the candidate commit

| Command | Result on the candidate commit |
|---|---|
| `npm run build` | [S3-03] |
| `npm test` (Vitest + Supertest, real PostgreSQL) | [S3-03] passed, [S3-03] failed, [S3-03] skipped; baseline before Sprint 2: 73 passed, 0 failed, 0 skipped on `861f01f` |
| `npm run test:e2e` (Playwright, Chromium; also the CI job `e2e`, D-39) | [S3-03]; baseline before Sprint 2: 20 passed, 0 failed, 0 skipped |
| `bash deploy/tests/test_deploy_stub.sh` (TEST-54), `bash deploy/tests/test_release_stub.sh` (TEST-55) | [S3-03]; baseline 6/6 and 10/10 |

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
| Cancelling a registration frees its place: `remainingPlaces` goes up by one and another participant can take it | F-07, F-04 (BR-02, BR-07) | TEST-78 | [S3-03] |
| A cancelled registration no longer blocks BR-10: the participant can register for an event less than 120 minutes away | F-07, CR-01 (BR-10) | TEST-79 | [S3-03] |
| Cancelling an event cancels its ACTIVE registrations in one transaction; they show CANCELLED in My registrations and in the owner's roster | F-08, F-05, F-06 | TEST-99, TEST-108, TEST-109 | [S3-03] |
| A capacity cut and a registration for the last place at the same time never exceed the final capacity | F-08, F-04 (BR-02, D-10) | TEST-92 | [S3-03] |
| Deadline, closed state and BR-10 keep the D-35 check order | F-09, F-08, F-04 | TEST-88 | [S3-03] |
| Check-in refuses a cancelled registration, including one cancelled by an event cancel; a checked-in registration cannot be cancelled before the start | F-10, F-07, F-08 | TEST-113, TEST-118 | [S3-03] |
| Sprint 1 journey, authentication, backend permissions and record ownership unchanged | F-01 to F-06 | TEST-22, TEST-23, the 69 Sprint 1/Lab 6 API tests | [S3-03] |

## E.4 Post-deployment checks on production

Uniquely named synthetic events, never a reset (D-20, D-28). Evidence IDs E-E-1 to E-E-4 in `docs/sprints/sprint-2/evidence/`.

| ID | Journey | Expected | Result |
|---|---|---|---|
| E-E-1 | Sprint 1 critical journey: create, publish, register, My registrations, roster | as Sprint 1 | [S3-03] |
| E-E-2 | Persistence: cancel a registration, reload and sign in again | the CANCELLED row is still there | [S3-03] |
| E-E-3 | Rule rejection: capacity below the ACTIVE count | 409 `CAPACITY_BELOW_ACTIVE` | [S3-03] |
| E-E-4 | Backend protection: another organizer edits an event; a participant cancels another participant's registration | 403 / 404 from the API, nothing changed | [S3-03] |
| smoke | `python3 deploy/smoke_test.py <URL>` | `/api/health` 200, `/` 200, `/api/me` 401 | [S3-03] |

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

**Known gap in the repository docs:** the final deployment guide (`docs/labs/lab-05/deployment.md` version 0.2, with the cloud resources and the release and rollback procedure) and the Lab 6 post-release docs are on `lab5-staging` and `lab6-staging`, not on `main`, which still has version 0.1 (D7-1 in Part A). The sync into `sprint-2-staging` is planned before S2-06, so the candidate carries it [S3-03].

## E.6 Readiness of the candidate

| Item | Status |
|---|---|
| Sprint 2 features F-07, F-08, F-09 | [S3-03] per feature: AC passed / missing AC (Part B completion table) |
| Sprint 3 progress | [S3-03] contracts merged; F-10 AC passed / missing AC (Part C) |
| Automated suites on the candidate | [S3-03] (E.2) |
| Cross-feature checks | [S3-03] (E.3) |
| Deploy and post-deployment checks | [S3-03] (E.1, E.4) |
| Open defects | none critical or major at the last check (Part A.3); [S3-03] any Sprint 2 or Sprint 3 defect |
| Known limitations | the 641 to 735 px taskbar wrap and the #147 label ellipsis (Lab 6, accepted); D7-1 documentation sync |
| Decision | [S3-03]: READY or NOT READY for the candidate scope (Sprint 2 complete, Sprint 3 progress), with reasons and owners |

## E.7 Plan to the final release (13 December)

Final examinations run from 1 to 11 December. Dates are targets agreed in `deliverable2-plan.md` section 5; anything not finished by 29 November is reported in the Part B completion table and in Part C, not moved to look complete.

| Item | Owner | Target | Depends on |
|---|---|---|---|
| Finish any Sprint 2 or Sprint 3 AC still missing at D2 [S3-03] | A and B | [date agreed with A at S3-03] | candidate |
| D7-1 sync PR `lab6-staging` → `sprint-2-staging`, and `deployment.md` 0.2 onto `main` | A | before S2-06 | Lab 6 PDF final (done) |
| S3-01 contracts F-10, F-11 (B, #224) and F-12, F-13 (A) | A and B | before S3-02 (F-10, F-11) and S3-03 (F-12, F-13) | D-36 to D-38 (active since #223) |
| S3-02 F-10 check-in (the implemented Sprint 3 rule) | B | before S3-03 | S3-01, Sprint 2 release |
| F-11 attendance record and report | B | 5 Dec | F-10 |
| F-12 organizer summary dashboard | A | 5 Dec | F-11 |
| F-13 login rate limit, NFR-05 measurement, NFR-09 checks for the new screens | A | 8 Dec | F-10 to F-12 |
| UAT retest of the new features with Est, final regression | A and B | 11 Dec | F-10 to F-13 |
| Final release `v1.0.0`, video, final PDF | A and B | 13 Dec | all above |
