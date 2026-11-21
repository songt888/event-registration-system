# CPE 334 Lab 5 — Plan (Cloud Deployment and CI/CD on GCP)

Team: A = songt888 (Kirakit Kingkaew), B = stickkersz (Nattakit Prasertsak). Same repo, same app, same rules as `AGENTS.md`.
Deliverable: one PDF on LEB2 named `lab5_sec<section>_<group name>.pdf`. Due Sunday 22 Nov 2026.
Sources: `01_SE_Lab_5_updated.pdf` (the handout; it wins on any conflict), `03_Student-Guide-GCP-Deployment-and+CI+CD-V1_1.pdf` (Episodes 0 to 10), the course cloud announcement of 2026-11-20 (D-25), and the team kit from the course portal (`deploy.sh`, `release.sh`, `deploy.yml`, `README-LAB5.md`, already named for prefix `s47a6b53b`).

**Course cloud (D-25).** The course runs one shared GCP project, `cpe-se-course-2026`, region `asia-southeast1`. Its portal (https://cpe334-student-cloud-4d7hbszvwq-as.a.run.app) created this team's resources (team EN-009_P3, prefix `s47a6b53b`). We create no resources, service accounts, WIF pools or keys, and change no billing or IAM. The portal's rules: change env vars only with `--update-env-vars` (never `--set-env-vars`), keep secrets in the secrets it made, never touch another team's resources, never run the old `teardown.sh`, one Cloud SQL instance per team. "Resources ready" does not mean the app is deployed: we build, migrate and deploy ourselves.

## 0. What is graded (100 points)

| Part | Pts | Requirements | Checks | The one thing TAs will open |
|---|---|---|---|---|
| 1 CI and quality gate | 30 | R-05, R-06, R-09, R-10 | C-01, C-02 | a normal PR with passing checks; a failing PR from a temporary branch with the merge button blocked; the ruleset on `main` |
| 2 Docker and reproducible config | 20 | R-01, R-02 | C-03 | Dockerfile, `.dockerignore`, `.env.example`, env var table; a fresh clone that builds and runs |
| 3 GCP deployment and persistence | 35 | R-03, R-04 | C-04, C-05 | the public URL: sign in, register, one rule rejection; a record before and after restart and redeploy |
| 4 Repeatable release pipeline | 15 | R-07, R-08, R-09, R-11 | C-06 | one labelled change: Issue, PR into staging with a specific review, release PR into main, CI, deploy, running revision = release commit |

Marks reward observable behavior, traceability and credible evidence, not length. Both of us must be able to explain any sampled step (R-11), so no step is done by only one person without the other reading it.

## 1. Where the repo stands

| Need | State | Work left |
|---|---|---|
| Public repo (R-12) | public, default branch `main`; secret scanning push protection on | none |
| Dockerfile, `.dockerignore` | done in #88 (3 stages, runtime as user `node`, Node 24) | none |
| One origin for UI and API | done in #87 (TEST-52): Express serves `client/dist` from `CLIENT_DIST` | none |
| Settings from env (R-02) | done in #87: `.env.example` and the env table in `deployment.md` | none |
| Persistent DB, sessions in DB (R-04) | PostgreSQL 16 + `Session` table, nothing kept in the container | verify after restart and redeploy (#93) |
| Non-destructive seed | done in #87: `npm run seed:demo` (TEST-53); the destructive `seed.ts` stays local only (D-20) | none |
| CI (R-05, R-06) | done in #89: `ci-docker.yml`, job `test-and-docker`, on PRs into `lab5-staging` and `main`; TEST-54 runs in it | ruleset makes it required (#91) |
| First deploy script | done in #90 code (PR #100): `deploy/deploy.sh` adapted from the team kit, TEST-54 | the real run from Cloud Shell on `main` |
| Deploy pipeline (R-07, R-08) | none | `deploy.yml`, `release.sh`, `smoke_test.py` (#92) |
| Cloud resources | created by the portal (D-25): service `s47a6b53b`, job `s47a6b53b-migrate`, Cloud SQL `s47a6b53b-pg`, registry `s47a6b53b`, runtime and deployer service accounts, secrets `s47a6b53b-database-url` and `s47a6b53b-demo-password` | none; we only update the job and service |
| GitHub to GCP (WIF) | the deployer service account is "not linked to GitHub Actions" yet | link the repo in the portal tab "Lab 5 · Repository review" after the release to `main`; the portal then shows the team's GitHub variables (#91) |
| Cookies behind HTTPS | `COOKIE_SECURE` env, `sameSite=lax` | `deploy.sh` sets `COOKIE_SECURE=true`; check the login over HTTPS (#90) |
| `deployment.md` | v0.1 plus the CI and first-deploy rows | finish in #94 (content in section 6) |

The portal reviewed `main` at `12dcd3c` and listed these Lab 5 files as missing: `Dockerfile`, `.github/workflows/ci-docker.yml`, `deploy/deploy.sh` (all three now on `lab5-staging`), `deploy/release.sh`, `.github/workflows/deploy.yml`, `deploy/smoke_test.py` (#92; the team kit has no `smoke_test.py`). After the release PR, "Recheck the latest main" should find them all.

Team kit differences to adapt: our Prisma commands run through the server workspace (`npm run migrate -w server && npm run seed:demo -w server`), no admin account, the kit's `--demo` flag adds the demo seed, no `/api/ready` (the smoke test checks `/api/health`, `/`, and that `/api/me` without a session is 401, all read-only), CI also runs on PRs into `lab5-staging`.

## 2. Decisions (in `docs/decisions.md`, never renumber)

| ID | Decision | Note |
|---|---|---|
| D-17 | `main` reopens for Lab 5 releases. Tag `v0.1.0-sprint1` stays on `12dcd3c`; the Lab 5 release gets the tag `v0.1.1-lab5` | confirmed by B in the #87 review |
| D-18 | One container serves the SPA and the API on `$PORT` (3000) | simplest on Cloud Run, same origin for cookies and `/api` |
| D-19 | Image and CI use Node 24; local development needs Node 22.9 or later (`--env-file-if-exists`) | |
| D-20 | Production seed is idempotent and non-destructive; the destructive `seed.ts` stays for local, test and E2E only | R-04 |
| D-21 | Integration branch `lab5-staging`, created from the `sprint-1-staging` head `b092a06`; `sprint-1-staging` keeps Sprint 1 only | confirmed by B |
| D-22 | Only `main` deploys. Environment `demo`, deployable only from `main`. Region `asia-southeast1`. No separate cloud staging | handout 4.2 |
| D-23 | E2E is not in the required check; `test-and-docker` runs build, `npm test` with a Postgres service and the Docker build | recorded limitation |
| D-24 | (superseded by D-25) A hosts a GCP Free Trial project | |
| D-25 | The course's shared project and the portal's resources for prefix `s47a6b53b` replace our own project; we create no infrastructure, IAM or secrets | course announcement 2026-11-20 |

## 3. Issues (GitHub #85 to #95, label `lab5` on every Issue and PR)

Branches: `feature/l5-NN-topic`, `docs/l5-NN-topic`, `fix/l5-NN-topic`, created from `lab5-staging`; PRs into `lab5-staging`; the teammate reviews with a specific check, approves and merges; authors never approve their own PR. Portal-only work has an Issue closed with a screenshot (no personal email, no secret values).

| Issue | Work | Author | Reviewer | Guide | Done when (evidence) |
|---|---|---|---|---|---|
| L5-00 (#85) | Lab 5 contract: D-17 to D-24, `AGENTS.md` Lab 5 rules, this plan | A | B | | merged with #87 |
| L5-01 (#86) | Sign in to the course portal, team prefix, activate resources until "Infrastructure ready" | A | | Ep. 1 | portal screenshots: 6/6 ready, team resources |
| L5-02 (#87) | Cloud-ready app: serve the SPA from Express; idempotent demo seed; `.env.example`; `deployment.md` v0.1 | A | B | Ep. 2 | red then green commits, `npm test` count |
| L5-03 (#88) | Docker: `Dockerfile`, `.dockerignore`, compose `app` service, fresh-clone check | B | A | Ep. 3 | C-03 commands and output |
| L5-04 (#89) | CI `test-and-docker`, Dependabot for Actions, actions pinned to commit SHA | B | A | Ep. 4 | C-01: a PR with green checks; run link |
| L5-05 (#90) | `deploy/deploy.sh` from the team kit and TEST-54 (merged, PR #100); then the first real deploy from Cloud Shell on `main` | A | B | Ep. 5 | public URL opens, sign in works; C-04 |
| L5-06 (#91) | Ruleset on `main` and `lab5-staging` requiring `test-and-docker`; failing PR from a temporary branch; after the release, link the repo in the portal's Lab 5 tab to get the GitHub variables | A (repo admin, portal); B opens the failing PR | cross | Ep. 6 | C-02: blocked merge; portal review passes on `main` |
| L5-07 (#92) | `deploy.yml`, `release.sh`, `smoke_test.py`, a visible change, the release PR `lab5-staging` → `main`, tag `v0.1.1-lab5`; GitHub environment `demo` with the portal's variables | B writes the workflow; A opens the release PR, B approves and merges | cross | Ep. 7 | C-06: pipeline run, running revision = release commit |
| L5-08 (#93) | Persistence: create a record, restart, redeploy, read it back; optional rollback | B | A | Ep. 8 | C-05: before and after screenshots with the URL visible |
| L5-09 (#94) | Finish `deployment.md`; Lab 5 PDF with the evidence index | A: `deployment.md` final, Parts 0 to 2; B: Parts 3 and 4 | cross | Sec. 12 | PDF named `lab5_sec<section>_<group>.pdf` |
| L5-10 (#95) | Cost control under the course rules (shared credits, one smallest Cloud SQL, Cloud Run 0 to 1 instances, no `teardown.sh`) | A checks `deploy.sh`; B writes the section | cross | Ep. 9, 10 | note in `deployment.md` |

Both names appear on pair Issues. Equal commit counts are not required (R-11).

## 3a. Who does what

| Member | Author of | Reviews or checks |
|---|---|---|
| A (songt888) | #85, #86 portal, #87, #90 deploy script and the Cloud Shell deploy, #91 ruleset and the portal's Lab 5 review; opens the #92 release PR | #88, #89, #92 workflow, #93 evidence |
| B (stickkersz) | #88, #89, #92 workflow files, #93, the #91 failing PR (C-02) | #87, #90 script PR, #91 settings; approves and merges the release PR |
| Shared | #94: A `deployment.md` and PDF Parts 0 to 2, B Parts 3 and 4; #95: A checks the settings, B writes the section | each reviews the other's part |

## 3b. Status (2026-11-20)

| Issue | Status |
|---|---|
| #85 to #89 | closed, cards in Done |
| #90 | script and TEST-54 merged (PR #100); waits for the release on `main` and the real deploy |
| #91 to #95 | not started |

## 4. TDD and test scope

New IDs continue the sequence (`AC-52`, `TEST-52`, never renumber). Names contain the TEST ID.

| TEST | Level | Checks |
|---|---|---|
| TEST-52 / AC-52 (#87, done) | API integration (Supertest) | `GET /` returns the page, `GET /events/123` returns `index.html`, `GET /api/unknown` returns the JSON 404 |
| TEST-53 / AC-53 (#87, done) | integration, real DB | the demo seed run twice creates each account once; a registration created between the runs survives; no `deleteMany` |
| TEST-54 / AC-54 (#90, done) | offline script test | `deploy.sh` with fake `gcloud`, `docker` and `git`: release on `main`, failed migration stops the release, other branch refused, dry run by default, `--demo` adds the demo seed, other arguments refused |
| TEST-55 / AC-55 (#92, contract first) | offline script test | `release.sh` and `smoke_test.py`, same style as TEST-54 |

Existing tests plus E2E 5 must still pass. No test is weakened to get green. Red commit first, then green.

## 5. Evidence plan (record command or run link, result, tested commit)

| Check | Proof | When |
|---|---|---|
| C-01 | link to a normal PR and its Actions run, test summary | done (#89, #100) |
| C-02 | link to the failing PR from `lab5/temp-failing-check`, failed `test-and-docker`, merge button blocked | #91 |
| C-03 | fresh clone, `.env.example` copied, `docker compose up --build`, output | done (#88) |
| C-04 | screenshots with the URL visible: sign in, register, one rejection (event full or 403) | after #90 |
| C-05 | create a registration, restart, redeploy, read it back; before and after screenshots | #93 |
| C-06 | PR links, pipeline run, Cloud Run revision showing the release commit SHA | #92 |

Screenshots only where a link cannot show it. Every figure has a numbered caption naming the check, requirement, and commit, run or URL. No personal email or secret in any screenshot. The PDF follows the handout headings "Answer Part 0" to "Answer Part 4", with an evidence index (at least one row per rubric part).

## 6. `docs/labs/lab-05/deployment.md` must contain

Stack and every change from the reference; each env var (purpose, secret or not, source); commands to build, test, run, migrate, seed; the course project, region and the portal's resource names; the release procedure and how to find the running commit (Cloud Run revision, image tag = full SHA); cost control under the course rules; rollback by redeploying an earlier image SHA; decisions D-17 to D-25.

## 7. Safety rules (handout 4.3 and 9, the course announcement, plus `AGENTS.md`)

- No `.env`, password, `DATABASE_URL`, key or service-account file in Git, logs, screenshots or the PDF. Secrets live in the portal's Secret Manager secrets (runtime) and GitHub environment secrets (pipeline). If one leaks: change it at once (new secret version), redeploy, tell a TA.
- No JSON key files: the portal's Workload Identity Federation. Actions pinned to full commit SHAs.
- Read every `gcloud` command an agent proposes before it runs. Agents never change billing, IAM or databases, and never see a secret.
- Env vars and secrets only with `--update-env-vars` and `--update-secrets`. Only our prefix `s47a6b53b`; never another team's resources; never the old `teardown.sh`; no new Cloud SQL instance.
- Never commit, push, merge or tag without being asked (agents), never approve your own PR, never rewrite history.
- The failing-check demo uses a temporary branch and is never merged. The released app must never break.

## 8. Order of work

1. #91 ruleset on `main` and `lab5-staging` (A). In parallel: #92 workflow files into `lab5-staging` (B); #95 cost note.
2. #91 failing PR from a temporary branch, screenshot, close without merging (B).
3. #92 release PR `lab5-staging` → `main` (A opens, B approves and merges), tag `v0.1.1-lab5`.
4. #90 first deploy from Cloud Shell on `main`: `bash deploy/deploy.sh --demo`, then `DRY_RUN=0 bash deploy/deploy.sh --demo`; C-04 on the live URL.
5. #91 portal: "Recheck the latest main", review the diff, activate; put the GitHub variables in environment `demo`; then #92 pipeline release (C-06).
6. #93 persistence (C-05).
7. #94 `deployment.md` and the PDF, then the Definition of Done below.

Critical path: ruleset, release to `main`, first deploy, persistence, PDF. If the portal does not give the GitHub variables in time, the deploy stays manual from Cloud Shell on `main`; write the blocker and the TA contact in the PDF rather than skipping silently.

## 9. Definition of Done for Lab 5 (from the handout, plus ours)

- [ ] fresh clone builds and runs; all settings from env; no secret anywhere
- [ ] public URL serves the latest `main` release; domain workflow works; running commit can be shown
- [ ] data survived a restart and a redeploy
- [ ] CI runs on PRs into staging and `main`; failed required check blocks the merge
- [ ] the latest release reached `main` by reviewed PRs and was deployed by the pipeline
- [ ] repository public until grading ends
- [ ] `deployment.md` and the evidence index complete; both members can explain any step
- [ ] PDF named `lab5_sec<section>_<group name>.pdf`; no real secret in it
- [ ] our rules: red then green commits, test names carry TEST IDs, teammate-reviewed PRs, labels `lab5`, test counts quoted from real runs

## 10. Open items

1. Section number and group name for the PDF file name (the portal team name is EN-009_P3).
2. Whether the portal gives the GitHub variables after the repo is linked (step 5 of section 8).
