# L5-05 First deploy script: engineering contract (Lab 5)

Lab 5 requirements R-02 (settings from the environment, secrets outside Git), R-03 (deployed on GCP) and R-04 (data survives a restart and a redeploy); decisions D-18, D-20, D-22, D-25. Issue #90. Plan: `lab5-plan.md`.

The course runs one shared GCP project, `cpe-se-course-2026`, and its portal has already created this team's resources with the prefix `s47a6b53b` (D-25). The portal gave us a team kit (`deploy.sh`, `release.sh`, `deploy.yml`) whose infrastructure and IAM steps are removed. This contract covers `deploy/deploy.sh`, adapted from that kit to this app, and its offline test. `release.sh` and `deploy.yml` belong to #92.

## 1. Behavior

`deploy/deploy.sh` is the first, manual deploy. A runs it in Cloud Shell from an up-to-date `main` checkout with `gcloud` signed in to the course project (D-25).

- **Fixed target.** Project `cpe-se-course-2026`, region `asia-southeast1`; any other value exits 1. Names come from the portal: Artifact Registry repository and service `s47a6b53b`, migration job `s47a6b53b-migrate`, Cloud SQL `s47a6b53b-pg`, runtime service account `s47a6b53b-runner`, secrets `s47a6b53b-database-url` and `s47a6b53b-demo-password`. The script creates no infrastructure, IAM or secret.
- **Only reviewed `main`.** A real run exits 1 unless the current branch is `main`, and the image tag is the full 40-character SHA of `HEAD`.
- **Image.** Builds the root Dockerfile for `linux/amd64`, pushes it tagged with the commit SHA, then uses the image digest (`@sha256:`) for both the job and the service.
- **Migration job.** Gets `DATABASE_URL` and `SEED_PASSWORD` (from `s47a6b53b-demo-password`) and runs `npm run migrate -w server && npm run seed:demo -w server`. It never runs the destructive `npm run seed` (D-20). If the job fails, the script exits 1 and does not update the service.
- **Service.** Gets only `DATABASE_URL` from Secret Manager, plus `NODE_ENV=production`, `COOKIE_SECURE=true` (HTTPS only) and `SESSION_TTL_MINUTES=60`, on port 3000, 0 to 1 instances. Env vars and secrets are changed with `--update-env-vars` and `--update-secrets`, never `--set-env-vars` or `--set-secrets`, because the course says `--set-*` replaces the values the portal set. All traffic goes to the new revision.
- **No starter-kit leftovers.** No admin account, no `--demo` flag (the demo seed always runs and deletes nothing), no `/api/ready`. Any argument exits 1.
- **Dry run is the default.** Without `DRY_RUN=0` the script only prints each command with `[DRY_RUN]` and calls `gcloud` and `docker` zero times.

## 2. Acceptance criteria

| AC | Criterion |
|---|---|
| AC-54 | With fake `gcloud`, `docker` and `git` on the PATH: (a) a real run on `main` builds for `linux/amd64`, pushes `…/s47a6b53b/s47a6b53b:<HEAD SHA>`, and gives the digest image to both the job and the service; (b) the job command is `npm run migrate -w server && npm run seed:demo -w server` with secrets `DATABASE_URL` and `SEED_PASSWORD`, and never the destructive `npm run seed`; (c) the service gets `COOKIE_SECURE=true` and only the `DATABASE_URL` secret, and no call uses `--set-env-vars` or `--set-secrets`; (d) when the job fails, the script exits 1 and the service is never updated; (e) a real run on another branch exits 1 before any `gcloud` or `docker` call; (f) no call creates infrastructure, IAM or secrets, and no call names `toktickit` or `admin-password`; (g) a dry run (the default) calls `gcloud` and `docker` zero times; (h) an argument such as `--demo` exits 1. |

## 3. System test specification

| TEST / AC | Level | Precondition | Steps | Expected result |
|---|---|---|---|---|
| TEST-54 / AC-54 | offline script test (bash, no network, no cost) | fake `gcloud`, `docker` and `git` that log each call; `git` reports branch `main` (or another branch) and a fixed SHA | `bash deploy/tests/test_deploy_stub.sh` runs: release on `main`, failed migration, other branch, dry run, `--demo` | one `PASS: TEST-54 AC-54 ...` line per scenario and exit 0; any `FAIL` line exits non-zero |

## 4. Version history

| Version | Date | Change | Review |
|---|---|---|---|
| 1.0 | 2026-11-20 | First L5-05 contract, for the course's shared cloud (D-25) and the team kit | pending B's review |
