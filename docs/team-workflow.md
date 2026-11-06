# Team Workflow (Student A and Student B)

- Student A: Kirakit Kingkaew (GitHub `songt888`)
- Student B: Nattakit Prasertsak (GitHub `stickkersz`)

Principle: no permanent roles. Both students take part in requirements/design, testing, AI supervision, implementation, review and release. Where an Issue has two authors, each writes a defined share in their own PR or commits, and the other student reviews.

## 1. Who writes, who reviews (per Issue)
| Issue | Author | Reviewer | Handoff |
|---|---|---|---|
| 1 Baseline docs | A: SRS, features, traceability (Parts A, B). B: System SDS, sprint plan (Parts C, D) | cross-review | one set of FR/BR/NFR/F IDs used by all later docs |
| 2 Sprint 1 contract and test plan | A: F-01, F-02. B: F-03..F-06 | cross-review | AC and TEST IDs that code must reference |
| 3 Foundation | A | B (fresh clone, follow README) | a runnable repo; B cannot start code before it is merged |
| 4 F-01 Auth | A | B | `requireSession` and `requireRole` that B uses next |
| 5 F-02 Publish event | B | A | create, publish and My events endpoints |
| 6 F-03 Browse events | B | A | published list and remaining places |
| 7 F-04 Register (pair work) | B writes the failing tests, A writes the implementation | B reviews A's PR | tests that fail before the code exists |
| 8 F-05 + F-06 Registrations | A: 8.1 My registrations (participant). B: 8.2 Organizer registrations | cross-review | data that organizers and participants see |
| 9 E2E and QA | A and B split the tests | cross-review | results of the full test run |
| 10 Evidence, release, PDF | A and B split the Parts | cross-review | one self-contained PDF |

Issue 7 mechanics: B commits the failing tests to `feature/s1-07-register` and pushes; A checks out the branch, commits the implementation until the tests pass, and opens the PR; B reviews it. Both names go in the Issue and the PR, and the red and green commits show the TDD sequence.

Suggested shares where the Issue is split: Issue 9 (A: TEST-22 and TEST-24, B: TEST-23 and the QA run) and Issue 10 (A: PDF Parts A to C and the login/logout/forbidden demo screenshots, B: Parts D to F, assembly, release PR, tag). Co-author branches: `docs/s1-01-sds`, `docs/s1-02-contract-b`, `feature/s1-09-e2e-a`, `docs/s1-10-pdf-a`.

## 2. Rhythm of the two students
```text
Issue 1:    A writes Parts A, B  ||  B writes Parts C, D        -> cross-review
Issue 2:    A writes F-01, F-02  ||  B writes F-03..F-06        -> cross-review
Issue 3:    A builds the foundation; B reviews (fresh clone), prepares test cases from the contract
Issue 4:    A builds Auth; B reviews
Issue 5:    B builds Publish event (red tests and service first, routes after Issue 4 is merged); A reviews
Issue 6:    B builds Browse; A reviews
Issue 7:    B writes red tests -> handoff -> A implements -> B reviews
Issue 8:    A builds 8.1 (participant) || B builds 8.2 (organizer) -> cross-review
Issue 9:    A and B split the E2E tests and the QA run
Issue 10:   A and B split the PDF Parts
```
Issue 4 and Issue 5 run in parallel after Issue 3.

## 3. Communication and handoff rules
- Decisions are made in GitHub (Issue or PR comments), not only in chat. They are evidence for Part F. Chat is for scheduling and urgent items.
- A handoff is a PR that is ready for review: tests green locally, Issue/F/AC/TEST IDs and AI use filled in the PR (PR description sections: Issue and contract IDs, TDD evidence, AI use, review), related docs updated.
- A problem in a contract is never fixed silently. Open a comment on the Issue, agree, then commit the contract change separately and record the reason in the version history (as in PR #11).
- A blocked student tags the other on the Issue immediately.
- Short sync before and after each work session: who works on which Issue, what blocks, who reviews what.

## 4. Avoiding conflicts
- One author per branch, except Issue 7 where B pushes the red tests first and A continues on the same branch after the handoff.
- One small PR per Issue share.
- When two students write docs in parallel, each touches only their own files (A: `srs.md`, `features.md`, `traceability.md`; B: `system-sds.md`, `sprints/plan.md`).
- Before opening a PR, merge the latest `sprint-1-staging` into your branch so conflicts are solved by the author, not the reviewer.
- Never push directly to `sprint-1-staging` or `main`; set GitHub branch protection to require a PR and one approval.

## 5. AI supervision (both students)
- Use AI agents for bounded Issues only, with the engineering contract as input.
- Every PR has an "AI use" section: tool, task it helped with, and what the author checked by hand (ran the tests, read the diff, compared with the AC).
- AI output is never accepted on its claim that tests pass; the author runs the command and the reviewer runs it again.
- Both the author and the reviewer must be able to explain the code and the tests in a PR when sampled by a TA.
- The PR "AI use" sections are collected into `docs/sprints/sprint-1/ai-use.md` (tool list, tasks, issues found in AI output) for the declaration in the PDF.

## 6. Decisions
1. Workflow table in section 1: DECIDED.
2. Issue 8 split: A writes 8.1 My registrations (F-05), B writes 8.2 Organizer registrations (F-06): DECIDED. The two run in parallel after Issue 7.

## 7. Reviewer checklist (every PR)
- The code matches the contract and the AC IDs it names; test names contain TEST IDs.
- The PR history shows the failing-test commit before the passing-implementation commit.
- Authorization is enforced on the backend (role and ownership), not only by hiding buttons.
- No real secrets or passwords; only synthetic data.
- The reviewer pulled the branch and ran the tests once.
- The "AI use" section is filled and credible.
- At least one specific check, question or finding is written before approving. Authors never approve their own PR.

## 8. What goes into the PDF (this file is internal)
The TA grades the PDF, not this file. The PDF Part F must show, from real GitHub data:
- two completed Issue + PR cases (Issue, branch, author, reviewer, specific review comment, merge to staging and main);
- the history sequence (contract and red-test commits before implementation commits, with commit IDs);
- the contribution table, matching the real history, naming each student's share (section 1);
- the AI-use declaration, built from `ai-use.md`;
- the final board status and release tag.
Equal commit counts are not required, but both students must be able to explain any sampled requirement, test, design decision or release step.
