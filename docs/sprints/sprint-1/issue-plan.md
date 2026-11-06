# Sprint 1 — Issue Plan and Kanban

Deliverable 1. Staging branch: `sprint-1-staging`. Release tag: `v0.1.0-sprint1`.
Students (pair work is identified in the Issue and PR):
- Student A: Kirakit Kingkaew — 67070503460
- Student B: Nattakit Prasertsak — 67070503413

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
| # | Issue | Scope | Owner | Depends on | Branch |
|---|---|---|---|---|---|
| 1 | Baseline docs | SRS, features, traceability, system SDS, 3-sprint plan (Parts A–D) | A: Parts A, B · B: Parts C, D | — | `docs/s1-01-baseline` |
| 2 | Sprint 1 contract and test plan | AC, STS, DoD for F-01..F-06 (Part E) | A: F-01, F-02 · B: F-03..F-06 | 1 | `docs/s1-02-contract` |
| 3 | Foundation | project skeleton, docker-compose Postgres, Prisma schema/migration/seed, test runner, README, `.env.example` | A | 2 | `feature/s1-03-foundation` |
| 4 | F-01 Auth | login, logout, me, role guard (API, UI, tests) | A | 3 | `feature/s1-04-auth` |
| 5 | F-02 Publish event | organizer publishes event, capacity > 0 (API, UI, tests) | B | 3 | `feature/s1-05-publish-event` |
| 6 | F-03 Browse events | published list and remaining places | B | 5 | `feature/s1-06-browse-events` |
| 7 | F-04 Register | capacity, duplicate, concurrent last place | B writes red tests · A implements · B reviews | 4, 6 | `feature/s1-07-register` |
| 8 | F-05 + F-06 Registrations | participant own registrations; organizer views own event's registrations; ownership denial | A | 7 | `feature/s1-08-registrations` |
| 9 | E2E and QA | Playwright journeys, full suite run, pass/fail/skip counts | A + B | 4–8 | `feature/s1-09-e2e-qa` |
| 10 | Evidence, release, PDF | screenshots, AC→TEST results table, release PR, tag, PDF | A + B | 9 | `docs/s1-10-release` |

Issues 4 and 5 can run in parallel after Issue 3. Each Issue links its FR/BR/F/AC IDs and contract section.

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
