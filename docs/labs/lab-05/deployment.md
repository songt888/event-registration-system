# Lab 5 deployment guide

Version 0.2 (#94): stack, configuration, commands, the course cloud resources and the first deploy (#87, #90, #94), cost control (#95). The release procedure, how to see the running commit and rollback (sections 6 and 7) come from #92. Decisions are in `docs/decisions.md` (D-17 to D-25).

## 1. Stack and changes from the reference

| Part | Reference (Lab 5 starter kit) | This project | Why |
|---|---|---|---|
| UI | separate frontend | React + Vite, built to `client/dist` and served by the API from `CLIENT_DIST` | one container on one port (D-18) |
| API | Node + Express | Node + Express + TypeScript, Prisma 5 | Deliverable 1 stack |
| Database | PostgreSQL | PostgreSQL 16: Docker locally, Cloud SQL on GCP | D-22 |
| Node | Node 24 | Node 22.9 or later locally (`--env-file-if-exists`); Node 24 in the image and CI | D-19 |
| Seed | reset seed | destructive `npm run seed` locally only; `npm run seed:demo` on the deployed database | data is never reset (D-20) |
| Staging branch | `staging` | `lab5-staging`, created from `sprint-1-staging` (`b092a06`); `sprint-1-staging` keeps Sprint 1 only | D-21 |
| Required check | `test-and-docker` | same name; build, `npm test` against a Postgres service, Docker build; no E2E | D-23 |
| Deploy | Cloud Run from `main` | Cloud Run in `asia-southeast1`, only from `main`, environment `demo` | D-17, D-22 |

## 2. Environment variables

No value below is real. Secrets live only in Secret Manager (cloud) or the gitignored `server/.env` (local).

| Name | Purpose | Secret | Local source | Cloud source |
|---|---|---|---|---|
| `DATABASE_URL` | database the app uses | yes | `server/.env` | Secret Manager |
| `DATABASE_URL_TEST` | test database for `npm test` | no (local placeholder) | `server/.env` | CI service container only |
| `DATABASE_URL_E2E` | E2E database for `npm run test:e2e` | no (local placeholder) | `server/.env` | not used |
| `PORT` | HTTP port | no | `server/.env` (3000) | set by Cloud Run |
| `NODE_ENV` | `development` or `production` | no | `server/.env` | Cloud Run env var |
| `SESSION_TTL_MINUTES` | session length (60) | no | `server/.env` | Cloud Run env var |
| `COOKIE_SECURE` | `true` behind HTTPS | no | `server/.env` (`false`) | Cloud Run env var (`true`) |
| `SEED_PASSWORD` | password of the synthetic demo accounts | yes on the deployed database | `server/.env` | Secret Manager, used only by the seed step |
| `CLIENT_DIST` | folder of the built UI the API serves | no | unset (Vite serves the UI) | set in the image (`/app/client/dist`, #88) |

## 3. Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Build | `npm run build` |
| Test | `npm test` (needs `DATABASE_URL_TEST`); `npm run test:e2e` (local only) |
| Run locally | `npm run dev` |
| Migrate | `npm run migrate` (runs `prisma migrate deploy`, local and deployed; never `migrate dev` or `migrate reset` on the deployed database) |
| Seed (local, test, E2E only) | `npm run seed` (deletes all data first) |
| Seed (deployed) | `npm run seed:demo` (adds missing demo data, deletes nothing). Accounts are matched by email and events by owner and title, so a renamed demo event is created again on the next release |
| Docker image | `docker build -t eventreg .` (three stages: UI build, server build, runtime as user `node`, Node 24) |
| Run everything in Docker | `cp .env.example .env`, then `docker compose up --build` (services `db`, `migrate`, `app`; UI and API on http://localhost:3000) |
| CI | `.github/workflows/ci-docker.yml`, job `test-and-docker`, on every PR into `lab5-staging` and `main` (R-05, D-23): Postgres 16 service plus `eventreg_test`, `npm ci`, `npm run migrate`, `npm test`, `npm run build`, `docker build`. Actions are pinned to full commit SHAs; `.github/dependabot.yml` proposes updates weekly. E2E is not part of it |
| First deploy (#90) | on an up-to-date `main` with `gcloud` signed in: `bash deploy/deploy.sh` (dry run, the default), then `DRY_RUN=0 bash deploy/deploy.sh --demo`: builds and pushes the image tagged with the commit SHA, runs the migration job `s47a6b53b-migrate` (`npm run migrate -w server && npm run seed:demo -w server`; without `--demo` only the migration), then updates the service `s47a6b53b` (D-25) |
| Deploy script test | `bash deploy/tests/test_deploy_stub.sh` (TEST-54, fake `gcloud`, `docker` and `git`; no network) |
| Release script test | `bash deploy/tests/test_release_stub.sh` (TEST-55: `release.sh`, `smoke_test.py` against a localhost stub, and the `deploy.yml` settings check; fake `gcloud`, no network) |

## 4. Course cloud resources and the first deploy (#90, D-25)

The course portal created every resource; we create none and only update the migration job and the service. Names carry the team prefix `s47a6b53b`.

| Resource | Name |
|---|---|
| Project, region | `cpe-se-course-2026`, `asia-southeast1` (shared by all teams) |
| Cloud Run service | `s47a6b53b`, public URL https://s47a6b53b-4d7hbszvwq-as.a.run.app |
| Cloud Run job (migrate and seed) | `s47a6b53b-migrate` |
| Cloud SQL | `s47a6b53b-pg` (PostgreSQL), database and user `s47a6b53b` |
| Artifact Registry | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s47a6b53b/s47a6b53b:<full commit SHA>` |
| Secret Manager | `s47a6b53b-database-url` (`DATABASE_URL`), `s47a6b53b-demo-password` (`SEED_PASSWORD`, demo seed only) |
| Service accounts | runtime `s47a6b53b-runner`; pipeline `s47a6b53b-deployer` through Workload Identity Federation (no key file) |
| GitHub environment `demo` | variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` (from the portal), `APP_PORT=3000`, `MIGRATE_COMMAND=npm run migrate -w server && npm run seed:demo -w server`; no secrets |

First deploy (2026-11-21, `main` `04e8590`):
1. `bash deploy/deploy.sh --demo` in Cloud Shell (dry run) and the plan read.
2. `DRY_RUN=0 bash deploy/deploy.sh --demo`: the build worked, but `docker push` from Cloud Shell to `asia-southeast1-docker.pkg.dev` failed three times with `connect: connection refused` (a Cloud Shell network problem, not a permission one). `set -e` stopped the script before it changed anything.
3. Workaround: the pipeline `Deploy to Google Cloud` (run 44897414447, `MIGRATE_COMMAND` not yet set) built and pushed the same image tag. Then in Cloud Shell, `docker() { echo skip; }; export -f docker` made `docker` a no-op for that shell only, and `DRY_RUN=0 bash deploy/deploy.sh --demo` ran unchanged from step 9 on: it resolved the pushed image's digest, ran the job (`s47a6b53b-migrate-gxtfx`: migrate and demo seed) with `SEED_PASSWORD`, and updated the service (revision `s47a6b53b-00003-gwh`). `unset -f docker` afterwards.
4. `MIGRATE_COMMAND` was then set in `demo`, and run 44898663334 migrated (`s47a6b53b-migrate-6lbkt`) and deployed revision `s47a6b53b-00004-44n`. The job keeps `SEED_PASSWORD`, because the pipeline's `gcloud run jobs update` changes only the command and arguments.

Image note (#88): the runtime stage copies the server workspace `node_modules` including `prisma` and `tsx` (devDependencies), because the migration job runs `prisma migrate deploy` and `npm run seed:demo` from the same image. The cost is image size (about 580 MB); a pruned image is out of scope.

The release procedure and how to find the running commit are in section 6, rollback in section 7 (#92).

## 5. Cost control (#95)

Credits are shared by all teams on the course project `cpe-se-course-2026` (D-25), so one team's waste costs every team. Our rules:

| Rule | How it is kept |
|---|---|
| One Cloud SQL instance only | The course portal created `s47a6b53b-pg`, the smallest tier. We create no other instance, and `deploy/deploy.sh` creates no infrastructure |
| Cloud Run scales 0 to 1 instances | `deploy/deploy.sh` updates the service `s47a6b53b` with `--min-instances 0 --max-instances 1` (512Mi, 1 CPU), so an idle service costs no instance time |
| Other teams' resources are never touched | We never edit, delete or deploy over a resource that does not carry our prefix `s47a6b53b`; the script refuses any project other than `cpe-se-course-2026` |
| The old `teardown.sh` is never run | It deletes resources, which the shared project does not allow (D-25) |
| Billing, IAM and teardown belong to the course staff | We change no billing or IAM setting. We ask a TA to add members, pause or clean up |

After grading ends we follow the instructor's announcement for cleanup and do not delete anything on our own.

## 6. Release procedure (#92)

Only `main` deploys. Every change reaches it through two reviewed PRs, and the ruleset `lab5-protect-main-and-staging` blocks both merges until `test-and-docker` passes on an up-to-date branch and the other member approves (#91).

| Step | Who | What |
|---|---|---|
| 1 | author | Issue, then a branch from `lab5-staging`; contract, red and green commits; `npm test` passes locally |
| 2 | author, reviewer | PR into `lab5-staging` with the label `lab5` and `Part of #<issue>`; the other member writes a specific check and approves; merge |
| 3 | A | sync PR `main` into `lab5-staging` when `main` has commits that staging lacks, so the release PR is up to date |
| 4 | A opens, B approves and merges | release PR `lab5-staging` into `main`; CI runs again on the release commit |
| 5 | pipeline | the push to `main` starts `Deploy to Google Cloud` (`.github/workflows/deploy.yml`, the course portal's file, #111); section 6.1 |
| 6 | either | read-only smoke test: `python3 deploy/smoke_test.py <service URL>` (`/api/health` 200, `/` 200 HTML, `/api/me` 401) |
| 7 | A | annotated tag on the release commit, for example `v0.1.2-lab5` (D-17) |

### 6.1 What the pipeline does

`deploy.yml` runs on a push to `main` or by hand (`workflow_dispatch`), only for `refs/heads/main`, in the GitHub environment `demo`:

1. Checks the 4 portal variables (`GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`) and the `Dockerfile`; a missing one stops the run before any cloud call.
2. Signs in with Workload Identity Federation as `s47a6b53b-deployer`: no key file, and `demo` holds no secrets.
3. Builds the image and pushes it as `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s47a6b53b/s47a6b53b:<full commit SHA>`.
4. When `MIGRATE_COMMAND` is set (`npm run migrate -w server && npm run seed:demo -w server`), points the job `s47a6b53b-migrate` at the new image and runs it with `--wait`. A failed migration stops the run, so the service never gets the new image. The seed adds missing demo data and deletes nothing (D-20).
5. `gcloud run deploy s47a6b53b --image <image> --port 3000` (from `APP_PORT`). Flags it does not pass, such as `--min-instances 0 --max-instances 1` from `deploy/deploy.sh`, keep their current values.
6. Writes the image and the URL to the run summary.

### 6.2 Releases so far

| Release PR | Commit on `main` | Tag | Deploy run | Result |
|---|---|---|---|---|
| #105 | `f23f233` | none | 44798044685 (#1, push) | failed at the WIF sign-in: environment `demo` had no variables yet. No cloud change |
| #110 | `d9cf666` | `v0.1.1-lab5` | 44885988467 (#2, push) | stopped at "Validate deployment settings" with `Missing setting: PROJECT_ID`, as designed. No cloud change |
| #113 | `04e8590` | `v0.1.2-lab5` | 44891493206 (#3, push) | stopped at "Check settings and Dockerfile": variables not set yet. No cloud change |
| (same) | `04e8590` | `v0.1.2-lab5` | 44897414447 (#4, by hand) | success; image pushed and deployed; migration skipped (`MIGRATE_COMMAND` not set yet) |
| (same) | `04e8590` | `v0.1.2-lab5` | 44898663334 (#5, by hand) | success; migration execution `s47a6b53b-migrate-6lbkt`, then revision `s47a6b53b-00004-44n` took 100% of traffic (C-06) |
| (same) | `04e8590` | `v0.1.2-lab5` | 44941012107 (#6, by hand, B) | success; redeploy for the persistence check (C-05, #93): migration `s47a6b53b-migrate-lvnlb`, revision `s47a6b53b-00005-5l7` at 100% |

The first real deploy (#90) was from Cloud Shell: `docker push` failed there three times with `connect: connection refused` (Cloud Shell network, not permissions; `set -e` stopped the script before any change). Run #4 pushed the image, then `DRY_RUN=0 bash deploy/deploy.sh --demo` used that image by digest: migration and demo seed `s47a6b53b-migrate-gxtfx`, then revision `s47a6b53b-00003-gwh`.

### 6.3 Find the running commit

- Console: Cloud Run, service `s47a6b53b`, tab Revision History. The revision with 100% of traffic shows its image by digest (`...@sha256:<digest>`), also after a pipeline deploy by tag.
- Artifact Registry, repository `s47a6b53b`: the commit SHA is the tag of an image index; its Manifest tab lists the `linux/amd64` image digest that Cloud Run runs.
- Example (C-06): revision `s47a6b53b-00005-5l7` came from pipeline run 44941012107 (`gcloud run deploy --image ...:<SHA>`), yet its Image field shows `...s47a6b53b@sha256:484ebb711eee...` (full value in the hover, `evidence/C-06-revision-image-digest.jpg`); index `sha256:a01f2f654a54...` is tagged `04e85902befb951a01efd2e30236b6728352680c` and lists `484ebb711eee...` as its amd64 image; run 44941012107 logs `exporting manifest sha256:484ebb711eee...` for that build. Screenshots: `evidence/C-06-*.jpg`.
- Cloud Shell: `gcloud run revisions describe <revision> --region asia-southeast1 --format='value(status.imageDigest)'`.
- The run summary of `Deploy to Google Cloud` shows the same image, and the commit links to its release PR.

## 7. Rollback (#92)

Roll back by deploying an earlier release image again. Never reset the database and never run the destructive seed (D-20).

| Way | How |
|---|---|
| Console (fastest) | Cloud Run, `s47a6b53b`, Revisions: "Manage traffic" and send 100% to the earlier revision. No new image, no migration |
| Cloud Shell, on `main` | `PROJECT_ID=cpe-se-course-2026 REGION=asia-southeast1 IMAGE_TAG=<earlier full SHA> ROLLBACK=true bash deploy/release.sh`: finds the image by digest, skips the migration and seed, updates the service and sends it 100% of traffic. Run it without `ROLLBACK=true` for a normal manual release (migration first) |
| Through the pipeline | revert the commit on a branch, PR into `lab5-staging`, then a release PR into `main` (section 6) |

A rollback keeps the database schema. If the later release added a migration, the earlier image must still work with the new schema, so a schema change that drops or renames a column needs its own reviewed fix instead.
