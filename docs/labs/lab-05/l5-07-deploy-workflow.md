# L5-07 Deploy workflow: engineering contract (Lab 5)

Lab 5 requirements R-07, R-08, R-09, R-10, check C-06; decisions D-17, D-20, D-22, D-25. Issue #92. Plan: `lab5-plan.md` (section 4, TEST-55).

This contract covers `.github/workflows/deploy.yml`, `deploy/release.sh`, the new `deploy/smoke_test.py` (the kit has none), and their offline test. From v1.3 `deploy.yml` is the generic workflow the course portal gave after linking the repo (#91), as the TA advised: the portal's Workload Identity rule and the deployer service account's rights are set up for it. It is used unchanged. `release.sh` stays for a manual release or rollback from Cloud Shell. The release PR into `main`, the tag `v0.1.1-lab5` and the GitHub environment `demo` are outside this contract.

## 1. Behavior

- **Trigger.** `deploy.yml` runs on a push to `main` and by hand (`workflow_dispatch`). Any other ref does not deploy (D-22). Tests run before the code reaches `main`: the ruleset requires `test-and-docker` on every PR into `main` (#91).
- **Portal workflow.** The portal file, unchanged: it checks the four settings and the root `Dockerfile`, builds and pushes `…/s47a6b53b/s47a6b53b:<commit SHA>`, then, when the variable `MIGRATE_COMMAND` is set, points the job `s47a6b53b-migrate` at the image with that command and runs it with `--wait` (a failed migration stops the workflow before the deploy), then `gcloud run deploy s47a6b53b` with `--port $APP_PORT`. Variables in environment `demo`: the four from the portal, `APP_PORT=3000` and `MIGRATE_COMMAND=npm run migrate -w server && npm run seed:demo -w server` (non-destructive, D-20). The job's `DATABASE_URL` and `SEED_PASSWORD` secrets come from the first `deploy/deploy.sh --demo` run (#90), so that run comes before the first workflow run.
- **Smoke check.** After a deploy, run `python3 deploy/smoke_test.py <service URL>` by hand (Cloud Shell or locally) and keep the output as evidence.
- **Keyless login.** The deploy job uses environment `demo`, the variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` and Workload Identity Federation; no key file. Every action is pinned to a full commit SHA.
- **`release.sh`** (manual, from Cloud Shell; not called by the workflow). Needs `PROJECT_ID`, `REGION` and a full 40-character `IMAGE_TAG`; otherwise it exits 1 before any `gcloud` call. It resolves the tag to the image digest (`@sha256:`). A normal release updates the job `s47a6b53b-migrate` to the digest and runs it with `--wait` (the job from #90 runs `npm run migrate -w server && npm run seed:demo -w server`, never the destructive seed, D-20); if the job fails, the script exits non-zero and the service is never updated. Then it updates the service `s47a6b53b` to the digest and sends all traffic to the latest revision. A rollback (`ROLLBACK=true`) skips the job. It writes `SERVICE_URL` and `DEPLOYED_IMAGE` to `GITHUB_ENV`. It creates no infrastructure, IAM or secret, and never uses `--set-env-vars` or `--set-secrets`.
- **`smoke_test.py`.** `python3 deploy/smoke_test.py <URL>`, standard library only, GET requests only (read-only): `/api/health` is 200 with `{"status": "ok"}`, `/` is 200 HTML, `/api/me` without a session is 401. It prints one line per check and exits 0 only if all three pass; otherwise it exits 1. No login, no data written.
- **Visible change.** The sign-in page shows one line saying the demo runs on Google Cloud Run, so the release is visible on the live URL (C-06).

## 2. Acceptance criteria

| AC | Criterion |
|---|---|
| AC-55 | With a fake `gcloud` on the PATH and a local stub HTTP server: (a) a normal release resolves `…/s47a6b53b/s47a6b53b:<SHA>` to its digest and gives the digest to both the job `s47a6b53b-migrate` and the service `s47a6b53b`, runs the job with `--wait` before the service update, and writes `SERVICE_URL` and `DEPLOYED_IMAGE` to `GITHUB_ENV`; (b) when the job fails, `release.sh` exits non-zero and the service is never updated; (c) a rollback never touches the job and still updates the service; (d) an image tag that is not a full SHA exits 1 before any `gcloud` call; (e) no call creates infrastructure, IAM or secrets, uses `--set-env-vars` or `--set-secrets`, or names `toktickit`; (f) `smoke_test.py` exits 0 against a server that answers health 200 `ok`, `/` 200 HTML and `/api/me` 401, and sends only GET requests; (g) it exits 1 when `/api/me` answers 200 or when `/api/health` fails; (h) the `Check settings and Dockerfile` step of `.github/workflows/deploy.yml`, run under `bash -e` from the repository root like the runner, exits 0 when `PROJECT_ID`, `REGION`, `WIF_PROVIDER` and `WIF_SERVICE_ACCOUNT` are set, and exits non-zero with `Missing GitHub variable for <name>` when any one of the four is empty; (i) `deploy.yml` keeps what the portal's Workload Identity rule needs: `environment: demo`, `id-token: write`, trigger on `main`. |

## 3. System test specification

| TEST / AC | Level | Precondition | Steps | Expected result |
|---|---|---|---|---|
| TEST-55 / AC-55 | offline script test (bash and python3, no network beyond localhost, no cost) | fake `gcloud` that logs each call; a local `python3 -m http.server`-style stub that logs each request | `bash deploy/tests/test_release_stub.sh` runs: release, failed migration, rollback, bad tag, a check over all logged calls, smoke test pass, smoke test with `/api/me` 200, smoke test with health 500, the workflow's settings check with all settings and with each one empty, the workflow structure (i) | one `PASS: TEST-55 AC-55 ...` line per scenario and exit 0; any `FAIL` line exits non-zero |

## 4. Version history

| Version | Date | Change | Review |
|---|---|---|---|
| 1.0 | 2026-11-21 | First L5-07 contract for the team kit `release.sh` and `deploy.yml`, and `smoke_test.py` | pending A's review |
| 1.1 | 2026-11-21 | Smoke check path corrected to `/api/me`, the app's real session route (`server/src/app.ts` mounts the auth router at `/api`; TEST-03); `/api/auth/me` answers 404 | pending A's review |
| 1.2 | 2026-11-21 | AC-55 (h): the settings check must fail when a setting is empty. `test -n a && test -n b` never fails a `bash -e` step (a failed command before `&&` is ignored), so Deploy demo run 44798044685 passed the check with no `demo` variables and failed later at login | A approved in PR #108 |
| 1.3 | 2026-11-21 | `deploy.yml` replaced by the course portal's generic workflow after linking the repo (TA advice), unchanged; AC-55 (h) follows the portal step, new (i); `release.sh` becomes the manual tool | pending B's review |
