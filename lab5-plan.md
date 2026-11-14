# CPE 334 Lab 5 — Plan (Cloud Deployment and CI/CD on GCP)

Team: A = songt888 (Kirakit Kingkaew), B = stickkersz (Nattakit Prasertsak). Same repo, same app, same rules as `AGENTS.md`.
Deliverable: one PDF on LEB2 named `lab5_sec<section>_<group name>.pdf`.
Sources: `01_SE_Lab_5_updated.pdf` (the handout; it wins on any conflict), `03_Student-Guide-GCP-Deployment-and+CI+CD-V1_1.pdf` (Episodes 0 to 10), `02_lab5-starter-kit.zip` (templates for TokTickIT, to adapt).

## 0. What is graded (100 points)

| Part | Pts | Requirements | Checks | The one thing TAs will open |
|---|---|---|---|---|
| 1 CI and quality gate | 30 | R-05, R-06, R-09, R-10 | C-01, C-02 | a normal PR with passing checks; a failing PR from a temporary branch with the merge button blocked; the ruleset on `main` |
| 2 Docker and reproducible config | 20 | R-01, R-02 | C-03 | Dockerfile, `.dockerignore`, `.env.example`, env var table; a fresh clone that builds and runs |
| 3 GCP deployment and persistence | 35 | R-03, R-04 | C-04, C-05 | the public URL: sign in, register, one rule rejection; a record before and after restart and redeploy |
| 4 Repeatable release pipeline | 15 | R-07, R-08, R-09, R-11 | C-06 | one labelled change: Issue, PR into staging with a specific review, release PR into main, CI, deploy, running revision = release commit |

Marks reward observable behavior, traceability and credible evidence, not length. Both of us must be able to explain any sampled step (R-11), so no step is done by only one person without the other reading it.

## 1. Where the repo stands today

| Need | Today | Work |
|---|---|---|
| Public repo (R-12) | public, default branch `main` | none; turn on secret scanning push protection |
| Dockerfile, `.dockerignore` | none (only `docker-compose.yml` with the DB) | write a 3-stage image: build client, build server, small runtime as user `node` |
| One origin for UI and API | Vite dev proxy only; Express does not serve the SPA | **code change:** Express serves `client/dist` and falls back to `index.html` for non-`/api` routes (TDD). Done locally in #87 (TEST-52) |
| Settings from env (R-02) | `DATABASE_URL`, `PORT`, `NODE_ENV`, `SESSION_TTL_MINUTES`, `COOKIE_SECURE`, `SEED_PASSWORD` already env | document each in `.env.example` and `deployment.md`; add the new ones. Done locally in #87 (`CLIENT_DIST`, env table in `deployment.md` v0.1) |
| Persistent DB, sessions in DB (R-04) | PostgreSQL 16 + `Session` table, nothing kept in the container | none; verify after restart and redeploy |
| **Seed is destructive** | `server/prisma/seed.ts` runs `deleteMany()` on registrations, events, sessions, users | **must not run on a release**: it would wipe the live data and fail R-04. Add an idempotent demo seed that only creates missing accounts and events (TDD: run twice, count unchanged, existing rows untouched). The migration job runs `prisma migrate deploy` then the idempotent seed only. Done locally in #87 (`npm run seed:demo`, TEST-53) |
| CI (R-05, R-06) | none (`.github/` missing) | workflow on PRs into `lab5-staging` **and** `main`, job id `test-and-docker` |
| Deploy pipeline (R-07, R-08) | none | `deploy.yml` on push to `main`, image tag = full commit SHA, deploy by digest, smoke test |
| Cloud resources | none | Artifact Registry, Cloud Run service and migration job, Cloud SQL PG16, Secret Manager, service accounts, Workload Identity Federation |
| Cookies behind HTTPS | `COOKIE_SECURE` env, `sameSite=lax` | set `COOKIE_SECURE=true` on Cloud Run; check the login works over HTTPS |
| `deployment.md` | v0.1 written locally in #87 (stack, env vars, commands) | finish in #94 (content in section 6) |

Starter-kit differences to adapt: names (`toktickit` becomes `eventreg`), Prisma commands and paths, our scripts (`npm test` runs the server Vitest suite with a real database), no `/api/ready` or `/api/categories` (the smoke test checks `/api/health`, `/`, and that `/api/me` without a session is 401, all read-only), kit CI triggers only on PRs into `main` (ours must also run on PRs into staging).

## 2. Decisions to lock first (record as D-17 onward in `docs/decisions.md`, never renumber)

| ID | Decision | Why / note |
|---|---|---|
| D-17 | `main` reopens for Lab 5 releases (agreed by A; B confirms in the #87 review). The rule "no commits to `main` after the tag" in `AGENTS.md` covered the Deliverable 1 submission only; `AGENTS.md` now has a separate Lab 5 section. Tag `v0.1.0-sprint1` stays on `12dcd3c`; the Lab 5 release gets its own tag (proposal `v0.1.1-lab5`) | R-07 needs real merges into `main`; the old tag must never move. `AGENTS.md` Lab 5 section written; **B's agreement still needed in the #87 review** |
| D-18 | One container serves the SPA and the API on `$PORT` (3000) | simplest on Cloud Run, same origin so cookies and `/api` work unchanged |
| D-19 | Image and CI use Node 24 (the evidence runs used Node 24.19); local development needs Node 22.9 or later, because the npm scripts use `--env-file-if-exists` (`engines` raised from `>=20`) | avoid testing on one version and shipping another |
| D-20 | Production seed is idempotent and non-destructive; the destructive `seed.ts` stays for local, test and E2E only | R-04; see section 1 |
| D-21 | Integration branch: a new branch `lab5-staging`, created from the `sprint-1-staging` head `b092a06`; Lab 5 branches start from it and PRs go into it. `sprint-1-staging` keeps Sprint 1 only. Both the ruleset and CI cover `lab5-staging` and `main` | the name shows it is the handout's staging branch for Lab 5; Sprint 1 history stays apart (first plan reused `sprint-1-staging`, changed before any Lab 5 push) |
| D-22 | Only `main` deploys. Environment `demo`, deployable only from `main`. Region `asia-southeast1` (as the kit). No separate cloud staging | handout 4.2 |
| D-23 | E2E (Playwright) is not in the required check; the required check runs build, `npm test` (real Postgres service container) and the Docker build. E2E stays a local command and a recorded limitation | keeps CI short and reliable; honest limitation in the PDF |
| D-24 | The member who owns the GCP account is the host; the other is added as Editor. **A hosts** (decided). The host runs the Console steps, but each console change has an Issue closed with a screenshot, and the other member verifies access | handout 4.4; decided |

## 3. Issues (GitHub #86 to #95, label `lab5` on every Issue and PR; #85 was merged into #87 and closed as not planned)

Branches: `feature/l5-NN-topic`, `docs/l5-NN-topic`, `fix/l5-NN-topic`, created from `lab5-staging`; PRs into `lab5-staging`; the teammate reviews with a specific check; authors never approve their own PR. Console-only work has an Issue and no branch.

| Issue | Work | Author | Reviewer | Guide | Done when (evidence) |
|---|---|---|---|---|---|
| L5-01 (#86) | GCP Free Trial, project, add the teammate as Editor, **budget alert first**, billing check | A (host) | B verifies access | Ep. 1 | screenshots: credit, budget, both members in IAM |
| L5-02 (#87) | Cloud-ready app: serve the SPA from Express; idempotent demo seed; `.env.example`; first `deployment.md`; new AC/TEST IDs; plus D-17 to D-24 in `docs/decisions.md`, the `AGENTS.md` Lab 5 section and this plan | A (tests and implementation) | B | Ep. 2 | red then green commits, `npm test` count, `deployment.md` v0.1 |
| L5-03 (#88) | Docker: `Dockerfile`, `.dockerignore`, compose `app` service, fresh-clone check | B | A runs the fresh clone | Ep. 3 | C-03 commands and output |
| L5-04 (#89) | CI workflow `test-and-docker` (the Postgres service must also create `eventreg_test`, because `docker/init-db.sql` only runs in local compose), Dependabot for Actions, actions pinned to commit SHA | B | A | Ep. 4 | C-01: a PR with green checks; run link |
| L5-05 (#90) | First deploy from Cloud Shell: adapt `deploy.sh` (`DRY_RUN=1` first, read the output), Cloud SQL, secrets, runtime service account, migration job, Cloud Run service | A runs, B reviews the script PR and the Console result | B | Ep. 5 | public URL opens, sign in works; resource list screenshot |
| L5-06 (#91) | Workload Identity Federation, deployer service account, environment `demo` and its variables, ruleset on `main` (and `lab5-staging`), required check `test-and-docker`; failing PR from a temporary branch | A (repo admin) for settings; B opens the failing PR | cross | Ep. 6 | C-02: blocked merge screenshot; the temp branch is never merged and `main` is never broken |
| L5-07 (#92) | `deploy.yml`, `release.sh`, smoke test, visible change (for example a footer or version line showing the commit) through staging and a release PR into `main`; tag | B writes workflow, A opens the release PR, B approves it | cross | Ep. 7 | C-06: pipeline run, running revision = release commit |
| L5-08 (#93) | Persistence: create a record, restart, redeploy, read it back; optional rollback and roll forward | B | A | Ep. 8 | C-05: before and after screenshots with the URL visible |
| L5-09 (#94) | Finish `deployment.md`; Lab 5 PDF with the evidence index | A: `deployment.md` final, Parts 0 to 2; B: Parts 3 and 4 | cross | Sec. 12 | PDF named `lab5_sec<section>_<group>.pdf` |
| L5-10 (#95) | Cost control: pause or reduce while idle, teardown date written down. The service stays up until grading ends | A: Console cost settings; B: cost and teardown section | cross | Ep. 9, 10 | note in `deployment.md` |

Both names appear on pair Issues. Equal commit counts are not required (R-11).

## 3a. Who does what (4 Issues each, 2 shared)

| Member | Author of | Reviews or checks |
|---|---|---|
| A (songt888) | #86 GCP account (host), budget, IAM, push protection; #87 cloud-ready code plus D-17 to D-24, the `AGENTS.md` Lab 5 section and this plan; #90 first deploy (Cloud Shell; needs the owner's IAM rights); #91 WIF, environment `demo`, ruleset (needs repo admin and IAM); opens the #92 release PR | #88 (fresh clone, C-03), #89 CI, #92 deploy workflow, #93 persistence evidence |
| B (stickkersz) | #88 Docker; #89 CI; #92 deploy workflow; #93 persistence check on the live URL; the #91 failing PR from a temporary branch (C-02) | confirms D-17 in the #87 review; checks access on #86; reviews #87, #90 (script and Console result), #91 settings; approves the release PR |
| Shared | #94: A writes `deployment.md` final and PDF Parts 0 to 2, B writes Parts 3 and 4; #95: A sets cost settings in the Console, B writes the cost and teardown section | each reviews the other's part |

A's Issues are the ones that need the GCP owner account or repo admin rights; B's are the files and checks that do not. Both members deploy (A the first deploy, B the pipeline release and the live checks) and both must be able to explain every step (R-11).

## 3b. Status

| Issue | Status |
|---|---|
| #85 L5-00 | closed as not planned: its work moved into #87 |
| #86 L5-01 | not started (A, in the GCP Console) |
| #87 L5-02 | code done locally; also carries D-17 to D-24, the `AGENTS.md` Lab 5 section and this plan (written locally, not committed). Docs done locally: D-17 to D-24 in `docs/decisions.md`, `CLIENT_DIST` in `.env.example`, root `seed:demo` script, `seed:demo` in README and `AGENTS.md`, `docs/labs/lab-05/deployment.md` v0.1; B confirms D-17 in the review. Code on `feature/l5-02-cloud-ready`: contract `4775e02`, red tests `1c6fdc5`, implementation `e6cc0e6`; `npm test` 69 of 69, build passed, E2E 5 of 5; not pushed, no PR |
| #88 to #95 | not started |

## 4. TDD and test scope (small, tied to the code that changes)

New IDs continue the sequence (`AC-52`, `TEST-52`, never renumber). Names contain the TEST ID.

| TEST | Level | Checks |
|---|---|---|
| TEST-52 / AC-52 (done locally, #87) | API integration (Supertest) | with a built `client/dist` folder, `GET /` returns the page and `GET /events/123` returns `index.html`; `GET /api/unknown` returns a 404 in the one JSON error shape with no stack trace (before #87 Express answered with its default HTML 404; the SPA fallback must not swallow `/api`) |
| TEST-53 / AC-53 (done locally, #87) | integration, real DB | the demo seed run twice creates each account once; a registration created between the runs survives; passwords come from `SEED_PASSWORD` and are bcrypt cost 12; no `deleteMany` |
| TEST-54 / AC-54 (with #90 and #92, contract first) | offline script test | deploy and release scripts: dry run prints the plan and changes nothing (kit has `deploy/tests/`, adapt) |

Existing tests (now 69 with TEST-52 and TEST-53) plus E2E 5 must still pass. No test is weakened to get green. Red commit first, then green.

## 5. Evidence plan (record command or run link, result, tested commit)

| Check | Proof | When |
|---|---|---|
| C-01 | link to a normal PR and its Actions run, test summary | after #89 |
| C-02 | link to the failing PR from `lab5/temp-failing-check`, failed `test-and-docker`, merge button blocked (screenshot, caption with PR number and commit) | #91 |
| C-03 | fresh clone, `.env.example` copied, `docker compose up --build`, output | #88 |
| C-04 | screenshots with the URL visible: sign in, register, one rejection (event full or 403) | after #90 |
| C-05 | create a registration, restart, redeploy, read it back; before and after screenshots | #93 |
| C-06 | PR links, pipeline run, Cloud Run revision showing the release commit SHA | #92 |

Screenshots only where a link cannot show it (blocked merge, Console setting, before and after). Every figure has a numbered caption naming the check, requirement, and commit, run or URL. Hide any secret before inserting. The PDF follows the handout headings: "Answer Part 0" to "Answer Part 4", with an evidence index (at least one row per rubric part).

## 6. `docs/labs/lab-05/deployment.md` must contain

Stack and every change from the reference; each env var (purpose, secret or not, source); commands to build, test, run, migrate, seed; GCP project, region, resource names; the release procedure and how to find the commit that is running (Cloud Run revision label, image tag = full SHA, `/api/health` version if added); cost control and teardown; rollback by redeploying an earlier image SHA; the D-17 to D-24 decisions.

## 7. Safety rules (handout 4.3 and 9, plus `AGENTS.md`)

- No `.env`, password, `DATABASE_URL`, key or service-account file in Git, logs, screenshots or the PDF. Secrets live in Secret Manager (runtime) and GitHub environment secrets (pipeline). Turn on secret scanning push protection first. If one leaks: change it at once, redeploy, tell a TA.
- No JSON key files: Workload Identity Federation. Actions pinned to full commit SHAs.
- Read every `gcloud` command an agent proposes before it runs. Agents never change billing, IAM or databases on their own, and never see a secret.
- Never commit, push, merge or tag without being asked (agents), never approve your own PR, never rewrite history.
- The failing-check demo uses a temporary branch and is never merged. The released app must never break.
- Cost: budget alert before any resource, Cloud Run min instances 0, max 3 or fewer, smallest Cloud SQL tier (add `--edition=enterprise` if `db-f1-micro` is refused), storage auto-increase off.

## 8. Order of work (dependencies only)

1. #86 GCP project and budget alert (billing may need a TA, so start it first).
2. In parallel with GCP setup: #87 cloud-ready code with TDD and the Lab 5 decisions (B confirms D-17 in its review), #88 Docker.
3. #89 CI, then #90 first deploy to a public URL.
4. #91 Workload Identity Federation and the ruleset, then the failing PR from a temporary branch.
5. #92 deploy workflow and the release through staging into `main`, then #93 persistence.
6. #94 deployment.md and the PDF, #95 cost note, then the Definition of Done below.

Critical path: billing and project, then Cloud SQL and first deploy, then WIF and ruleset, then the pipeline release. If WIF or the ruleset blocks us, write the blocker, the log excerpt and the TA contact in the PDF rather than skipping silently.

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

1. Section number and group name for the PDF file name (A gives them later).
2. B confirms D-17 (main reopens, release tag name) in the #87 review, before any merge into `main`.
3. A's GCP account: a personal Gmail that never used the Free Trial, not @mail.kmutt.ac.th.

Decided: A hosts the GCP account; `AGENTS.md` has a Lab 5-only section; #85 merged into #87; work split 4 Issues each plus #94 and #95 shared; the Deliverable 1 PDF fixes stay local and are not pushed.
