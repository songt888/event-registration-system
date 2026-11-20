# L5-07 Deploy workflow: engineering contract (Lab 5)

Lab 5 requirements R-07, R-08, R-09, R-10, check C-06; decisions D-17, D-20, D-22, D-25. Issue #92. Plan: `lab5-plan.md` (section 4, TEST-55).

This contract covers the team kit files `.github/workflows/deploy.yml` and `deploy/release.sh`, adapted to this app like `deploy/deploy.sh` in #90, the new `deploy/smoke_test.py` (the kit has none), and their offline test. The release PR into `main`, the tag `v0.1.1-lab5` and the GitHub environment `demo` are outside this contract.

## 1. Behavior

- **Trigger.** `deploy.yml` runs on a push to `main` and by hand (`workflow_dispatch`). Any other ref does not deploy (D-22). It first runs `ci-docker.yml` (job `test-and-docker`) and deploys only if it passed, or for a manual rollback.
- **Keyless login.** The deploy job uses environment `demo`, the variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` and Workload Identity Federation; no key file. Every action is pinned to a full commit SHA.
- **Image.** The image `asia-southeast1-docker.pkg.dev/<project>/s47a6b53b/s47a6b53b:<full commit SHA>` is built from the root Dockerfile and pushed (skipped for a rollback).
- **`release.sh`.** Needs `PROJECT_ID`, `REGION` and a full 40-character `IMAGE_TAG`; otherwise it exits 1 before any `gcloud` call. It resolves the tag to the image digest (`@sha256:`). A normal release updates the job `s47a6b53b-migrate` to the digest and runs it with `--wait` (the job from #90 runs `npm run migrate -w server && npm run seed:demo -w server`, never the destructive seed, D-20); if the job fails, the script exits non-zero and the service is never updated. Then it updates the service `s47a6b53b` to the digest and sends all traffic to the latest revision. A rollback (`ROLLBACK=true`) skips the job. It writes `SERVICE_URL` and `DEPLOYED_IMAGE` to `GITHUB_ENV`. It creates no infrastructure, IAM or secret, and never uses `--set-env-vars` or `--set-secrets`.
- **`smoke_test.py`.** `python3 deploy/smoke_test.py <URL>`, standard library only, GET requests only (read-only): `/api/health` is 200 with `{"status": "ok"}`, `/` is 200 HTML, `/api/auth/me` without a session is 401. It prints one line per check and exits 0 only if all three pass; otherwise it exits 1. No login, no data written.
- **Visible change.** The sign-in page shows one line saying the demo runs on Google Cloud Run, so the release is visible on the live URL (C-06).

## 2. Acceptance criteria

| AC | Criterion |
|---|---|
| AC-55 | With a fake `gcloud` on the PATH and a local stub HTTP server: (a) a normal release resolves `…/s47a6b53b/s47a6b53b:<SHA>` to its digest and gives the digest to both the job `s47a6b53b-migrate` and the service `s47a6b53b`, runs the job with `--wait` before the service update, and writes `SERVICE_URL` and `DEPLOYED_IMAGE` to `GITHUB_ENV`; (b) when the job fails, `release.sh` exits non-zero and the service is never updated; (c) a rollback never touches the job and still updates the service; (d) an image tag that is not a full SHA exits 1 before any `gcloud` call; (e) no call creates infrastructure, IAM or secrets, uses `--set-env-vars` or `--set-secrets`, or names `toktickit`; (f) `smoke_test.py` exits 0 against a server that answers health 200 `ok`, `/` 200 HTML and `/api/auth/me` 401, and sends only GET requests; (g) it exits 1 when `/api/auth/me` answers 200 or when `/api/health` fails. |

## 3. System test specification

| TEST / AC | Level | Precondition | Steps | Expected result |
|---|---|---|---|---|
| TEST-55 / AC-55 | offline script test (bash and python3, no network beyond localhost, no cost) | fake `gcloud` that logs each call; a local `python3 -m http.server`-style stub that logs each request | `bash deploy/tests/test_release_stub.sh` runs: release, failed migration, rollback, bad tag, smoke test pass, smoke test with `/api/auth/me` 200, smoke test with health 500 | one `PASS: TEST-55 AC-55 ...` line per scenario and exit 0; any `FAIL` line exits non-zero |

## 4. Version history

| Version | Date | Change | Review |
|---|---|---|---|
| 1.0 | 2026-11-21 | First L5-07 contract for the team kit `release.sh` and `deploy.yml`, and `smoke_test.py` | pending A's review |
