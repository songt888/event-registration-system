# Sprint 1 — Issue Plan and Kanban

Deliverable 1. Staging branch: `sprint-1-staging`. Release tag: `v0.1.0-sprint1`.
Students (pair work is identified in the Issue and PR):
- Student A: Kirakit Kingkaew — 67070503460 (GitHub `songt888`)
- Student B: Nattakit Prasertsak — 67070503413 (GitHub `stickkersz`)

## Process
```text
Plan Issues and Kanban → move Issue to Started → feature branch from sprint-1-staging
→ red tests (commit) → implementation (commit) → push, open PR → teammate review
→ Fixing if needed → teammate Approve → merge to sprint-1-staging → close Issue, Done
→ next Issue → release PR sprint-1-staging → main → final verification from main → tag → PDF
```
Never commit on `main`. Authors never approve their own PR. Branch names: `feature/s1-NN-topic` (docs: `docs/s1-NN-topic`).

## Kanban columns (GitHub Project)
| Column | Move here when |
|---|---|
| Backlog | Issue created |
| Specified | contract (AC + STS) committed |
| Started | branch created |
| PR Review | PR open, teammate assigned as reviewer |
| Fixing | reviewer requested changes |
| Done | merged to sprint-1-staging, Issue closed |

## Issue sequence
| # | Issue | Scope | Author | Reviewer | Depends on | Branch |
|---|---|---|---|---|---|---|
| 1 | Baseline docs | SRS, features, traceability (Parts A, B); system SDS, 3-sprint plan (Parts C, D) | A: Parts A, B. B: Parts C, D | cross-review | — | per sub-task (below) |
| 2 | Sprint 1 contract and test plan | AC, STS, DoD, version history for F-01..F-06 (Part E) | A: F-01, F-02. B: F-03..F-06 | cross-review | 1 | per sub-task (below) |
| 3 | Foundation | project skeleton, docker-compose Postgres, Prisma schema/migration/seed (seed startsAt relative to run time, always future), test runner (integration files sequential, separate test DB), README, `.env.example` | A | B (fresh clone, follow README) | 2 | `feature/s1-03-foundation` |
| 4 | F-01 Auth | login, logout, me, role guard (API, UI, tests) | A | B | 3 | `feature/s1-04-auth` |
| 5 | F-02 Publish event | create DRAFT, publish, My events (API, UI, tests) | B | A | 3 (routes also use the guards from 4) | `feature/s1-05-publish-event` |
| 6 | F-03 Browse events | published list and remaining places | B | A | 5 | `feature/s1-06-browse-events` |
| 7 | F-04 Register (pair work) | capacity, duplicate, concurrent last place | B writes the red tests, A writes the implementation (same branch, A opens the PR) | B reviews A's PR | 4, 6 | `feature/s1-07-register` |
| 8 | F-05 + F-06 Registrations | participant own registrations; organizer views own event's registrations; ownership denial | A: 8.1 (F-05). B: 8.2 (F-06) | cross-review | 7 | per sub-task (below) |
| 9 | E2E and QA | Playwright journeys, full suite run, pass/fail/skip counts | A and B split the tests (suggested: A TEST-22 and TEST-24, B TEST-23 and the QA run) | cross-review | 4–8 | per sub-task (below) |
| 10 | Evidence, release, PDF | screenshots, AC→TEST results table, release PR, tag, PDF | A and B split the Parts (suggested: A Parts A to C and the login/logout/forbidden demo, B Parts D to F, assembly, release PR, tag) | cross-review | 9 | per sub-task (below) |

## Sub-tasks (one branch and one small PR each)
Each Issue stays as the parent on the board. Each sub-task is its own GitHub Issue (#12 to #25 and #32 to #45; some closed as merged, see below), linked as a sub-issue of its parent, with its own branch and PR into `sprint-1-staging`. The parent moves to Done when every sub-task is merged. Reviewer is always the other student.

| ID | Sub-task | Output | Author | Branch |
|---|---|---|---|---|
| 1.1 (#12) | SRS | `docs/srs.md`: scope, exclusions, FR/BR/NFR, decisions D-01..D-14 | A | `docs/s1-01-srs` |
| 1.2 (#13) | Features | `docs/features.md`: F-01..F-13, sprint allocation, dependencies | A | `docs/s1-01-features` |
| 1.3 (#14) | Traceability | `docs/traceability.md`: FR → F → AC → TEST | A | `docs/s1-01-traceability` |
| 1.4 (#15) | System SDS and sprint plan | `docs/system-sds.md`: architecture, ER with Session, role matrix, CSRF stance; `docs/sprints/plan.md`: 3 sprints, scope per sprint | B | `docs/s1-01-sds` |
| 2.1 (#17) | F-01 contract, sprint DoD and version history | feature SDS, AC, STS for Auth; Definition of Done and contract version table | A | `docs/s1-02-f01` |
| 2.2 (#18) | F-02 contract | feature SDS, AC, STS for Publish event | A | `docs/s1-02-f02` |
| 2.3 (#19) | F-03 contract | feature SDS, AC, STS for Browse events | B | `docs/s1-02-f03` |
| 2.4 (#20) | F-04 contract | feature SDS, AC, STS for Register | B | `docs/s1-02-f04` |
| 2.5 (#21) | F-05 + F-06 contract | feature SDS, AC, STS for My registrations and organizer view | B | `docs/s1-02-f05-f06` |
| 3.1 (#23) | Skeleton and database | `client/`, `server/`, docker-compose Postgres, `.env.example` | A | `feature/s1-03-skeleton` |
| 3.2 (#24) | Schema and seed | Prisma schema, migration with partial unique index, seed with relative dates | A | `feature/s1-03-schema` |
| 3.3 (#25) | Test runner and README | Vitest projects, `DATABASE_URL_TEST`, sequential integration files, README commands | A | `feature/s1-03-test-runner` |
| 7.1 (#32) | Register red tests | failing tests TEST-12..16, TEST-27 and TEST-28 | B | `feature/s1-07-register` |
| 7.2 (#33) | Register implementation and UI | transaction with row lock, duplicate check, capacity; register button, full and already-registered messages (same branch as 7.1, A opens the PR) | A | `feature/s1-07-register` |
| 8.1 (#35) | My registrations | participant API and UI, ownership denial | A | `feature/s1-08-my-registrations` |
| 8.2 (#36) | Organizer registrations | organizer API and UI, ownership denial | B | `feature/s1-08-organizer-view` |
| 9.1 (#37) | E2E golden journey and login/logout | TEST-22 and TEST-24 | A | `feature/s1-09-e2e-login` |
| 9.2 (#38) | E2E full event | TEST-23 | B | `feature/s1-09-e2e-journey` |
| 9.4 (#40) | QA run | full suite, pass/fail/skip counts, five runs of TEST-15 | B | `feature/s1-09-qa` |
| 10.1 (#41) | Evidence | screenshots, AC → TEST results table in `docs/evidence/` | A | `docs/s1-10-evidence` |
| 10.2 (#42) | PDF Parts A to C | assembled from the docs, with the login/logout/forbidden demo | A | `docs/s1-10-pdf-abc` |
| 10.3 (#43) | PDF Parts D to F and assembly | sprint plan, contracts, working Sprint 1 and verification; one PDF with contents and real page numbers, AI-use declaration | B | `docs/s1-10-pdf-def` |
| 10.4 (#44) | Release | release PR `sprint-1-staging` → `main`, rerun tests from `main`, tag `v0.1.0-sprint1` | B | `docs/s1-10-release` |

Issues 4, 5 and 6 are not split: each is one vertical slice (API, UI, tests) in one branch and one PR (`feature/s1-04-auth`, `feature/s1-05-publish-event`, `feature/s1-06-browse-events`). Merged sub-tasks (closed as not planned): 1.5 into 1.4, 2.6 into 2.1, 7.3 into 7.2, 9.3 into 9.1, 10.5 into 10.3. Sub-task IDs are for planning only; commits and PRs still cite FR/BR/F/AC/TEST IDs.

The other student reviews every PR. Every PR states AI use (tool, task, what was checked by hand); see `docs/team-workflow.md`.

Issue 4 and Issue 5 run in parallel after Issue 3. Issue 5's routes need `requireSession` and `requireRole` from Issue 4, so B writes the red tests and the service logic first and connects the routes after Issue 4 is merged. Each Issue links its FR/BR/F/AC IDs and contract section.

## Order and expected board state
| Step | Issues | Expected board state |
|---|---|---|
| 1 | 1, 2, 3 | 1 and 2 Done, 3 in PR Review |
| 2 | 4 ‖ 5, then 6 | 4, 5, 6 Done |
| 3 | 7, 8 | 7, 8 Done |
| 4 | 9 | 9 Done, staging suite green |
| 5 | 10: acceptance, release PR, tag | all Done |
| 6 | assemble PDF | contents with real page numbers |
| 7 | submit on LEB2 | no pushes to main after tag |

If scope must shrink, simplify UI polish first. Do not cut backend tests or Parts A–E.
