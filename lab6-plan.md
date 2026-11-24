# CPE 334 Lab 6 Plan: Independent UAT and Defect Management, Sprint 1

Team: A = songt888 (Kirakit Kingkaew), B = stickkersz (Nattakit Prasertsak). Same repo, same app, same rules as `AGENTS.md`.
Deliverable: one PDF on LEB2, `lab6_sec<section>_EN-009_P3.pdf`. Due **Sunday 29 Nov 2026, 23:59** (moved from 22 Nov; the handout still says 22 Nov).
Source: `Lab_6_Sprint_1_UAT.pdf` (the handout; it wins on any conflict).

**What Lab 6 asks.** Another team runs our Sprint 1 acceptance tests on our deployed release, and we run theirs. We are the **Product Team** for our app and the **UAT Team** for the partner's app. Only the partner team can accept our release. We cannot test our own app in place of the partner. Scope is Sprint 1 (F-01 to F-06) only: no cancellation, check-in, attendance or other Sprint 2/3 behavior.

## 0. What is graded (100 points)

| Part | Pts | Our role | The one thing TAs will open |
|---|---|---|---|
| A UAT preparation and handoff | 20 | Product | our UAT cases (stable IDs, AC links, numbered steps, specific expected results) and the handoff (version, URL, accounts by label, setup and cleanup) |
| B Independent execution | 25 | UAT | the partner's cases run on their release: tester, date and time, version, inputs, actual result, PASS/FAIL/BLOCKED, screenshots |
| C Defect reporting and triage | 20 | both | our outgoing defect reports; a triage table of every finding we received (accepted, duplicate, not-defect, enhancement) |
| D Resolution and independent retest | 35 | Product | per accepted defect: RED test, fix and GREEN, reviewed PR, CI, release, deploy, smoke check, partner retest; the partner's signed decision |

Both of us take part in every part (handout section 1 and Part B). Equal commit counts are not required. We show who did what in a contribution table.

## 1. Where the repo stands

| Need | State | Work left |
|---|---|---|
| Sprint 1 contract | AC-01 to AC-51 in `docs/sprints/sprint-1/` (tag `v0.1.0-sprint1` = `12dcd3c`) | cite AC IDs in UAT cases |
| Deployed release | `main` = `04e8590`, tag `v0.1.2-lab5`, Cloud Run revision `s47a6b53b-00005-5l7`, https://s47a6b53b-4d7hbszvwq-as.a.run.app | record it as the UAT baseline (D-27) |
| CI on `lab6-staging` | `ci-docker.yml` ran only on PRs into `lab5-staging` and `main`; L6-00 adds `lab6-staging`. The ruleset `lab5-protect-main-and-staging` does not cover `lab6-staging` | A (repo admin) adds `lab6-staging` to the ruleset after L6-00 merges |
| Pipeline | `deploy.yml` on push to `main` and `workflow_dispatch`; manual runs #4 to #6 succeeded, no push run has deployed yet | the Lab 6 release (if any) should be the first push-triggered deploy |
| Demo accounts | Organizer One and Two; Participant One and 2 to 4; one shared demo password in secret `s47a6b53b-demo-password` | hand the password to the partner privately; never in Git or the PDF |
| Demo events | Intro to Git (Org One, cap 30), Career talk (Org One, cap 2, 1 place left), Hackathon planning (Org One, DRAFT), Robotics club open day (Org Two, cap 40). Start dates are relative to the seed run | check the live start dates; Intro to Git may already have started by the UAT session |
| Production data | never reset (D-20); Sprint 1 has no cancellation, so every registration is permanent | cases create their own events (D-28) |

## 2. Decisions (add to `docs/decisions.md`, never renumber)

| ID | Decision | Note |
|---|---|---|
| D-26 | Integration branch `lab6-staging`, created from `main` `04e8590`; branches `docs/l6-NN-topic`, `fix/l6-NN-topic`; label `lab6`. Releases go `lab6-staging` → `main` by a reviewed PR, as in D-17 | the handout says "fix branch from sprint staging"; `lab6-staging` plays that role and keeps `sprint-1-staging` frozen |
| D-27 | UAT baseline: tag `v0.1.2-lab5` (`04e8590`), revision `s47a6b53b-00005-5l7`. Accepted-for-test scope: the Sprint 1 contract at `v0.1.0-sprint1`. The Lab 5 changes (Docker, CI, deploy, SPA served by Express) do not change Sprint 1 behavior | handout section 2: a newer deployment is fine when the Sprint 1 scope and contract are named |
| D-28 | UAT runs on the production URL with synthetic demo data. Each case creates its own event with a unique title (`UAT-<tester initials>-<case>-<HHMM>`), so cases can be rerun without a reset. Nothing is deleted; cleanup is "leave the uniquely named events" | production data is never reset (D-20) |
| D-29 | A corrected release is tagged `v0.1.3-lab6`; earlier tags never move. We tell the partner before every deploy | handout "Coordination and version control" |

## 3. Issues (label `lab6` on every Issue and PR)

Board: "Event Registration - Lab 6" (https://github.com/users/songt888/projects/5), columns Backlog → Specified → Started → PR Review → Fixing → Done. Defect Issues (L6-09 onward) and L6-X are opened only when a finding is accepted or the TA gives an exercise.

The teammate reviews with a specific check, approves and merges. Authors never approve their own PR. Work done only in a browser or chat gets an Issue closed with a record (screenshot or message text, no password).

| Issue | Work | Author | Reviewer | Done when (evidence) |
|---|---|---|---|---|
| L6-00 (#118) | Lab 6 contract: this plan, D-26 to D-29, `AGENTS.md` Lab 6 rules, CI on PRs into `lab6-staging`; create `lab6-staging`; add it to the ruleset | A | B | merged; CI ran on the PR; ruleset covers `lab6-staging` |
| L6-01 (#120) | Part A: `docs/labs/lab-06/uat-cases.md` (section 4) and `handoff.md` (version, URL, scope, account labels and roles, setup, cleanup, case order) | A | B dry-runs every case on the live URL and reports anything unclear | B can follow each case without asking |
| L6-02 (#121) | Partner arrangement: agree on a team, session times (initial run, fix, retest), the channel for findings; send the handoff; send the password privately | A | B | both team names and four student names recorded; handoff sent (date) |
| L6-03 (#122) | Part B: run every partner case on their recorded release; `docs/labs/lab-06/uat-execution.md` with actual results and evidence IDs | A runs half, B runs half | each checks the other's records | every case PASS/FAIL/BLOCKED with screenshot; nothing copied from expected; rejected operations show the rejection and that protected state was not changed or disclosed (3.2) |
| L6-04 (#123) | Part C outgoing: one report per real failure in the partner's app, sent through the agreed channel; record their reply | B | A | each report has Issue ID, product owner/team, reporter, tested version, linked case/AC, preconditions/data, reproduction steps, expected, actual, severity explained by user impact, evidence, and states defect vs feature request (3.3); the partner's outcome recorded |
| L6-05 (#124) | Part C received: `docs/labs/lab-06/triage.md`, every finding about our app (or "none received") with class, reason tied to an AC, severity, owner, status | A | B | every finding has a disposition; each finding reproduced and clarified before dismissal; duplicates linked to the original Issue (3.3); no failing AC relabelled as an enhancement |
| L6-06 (#125) | Release `lab6-staging` → `main`, tag `v0.1.3-lab6`, push-triggered Deploy run, smoke check, revision recorded; tell the partner before deploying | A opens the release PR | B approves and merges | run link; running revision = release commit; smoke output |
| L6-07 (#126) | Part D: send the partner the corrected version and failed cases; partner retests and records one decision (Accepted / Accepted with minor limitations / Not Accepted) | A coordinates | B checks the record | partner's record with tester names, version, date; affected UAT cases re-run, not only the defect (3.4) |
| L6-07b (#129) | UAT Team: retest the partner's corrected release and record our acceptance decision for their app (handout section 2 UAT Team row, 3.4) | A and B | cross | our decision (Accepted / Accepted with minor limitations / Not Accepted) recorded with our tester names, their version, date and evidence |
| L6-08 (#127) | Lab 6 PDF with contents table (Parts A to D, pages, evidence IDs), version table, contribution table, AI use, limitations | A: Parts A, B; B: Parts C, D | cross | PDF named as above; cover has both students and IDs, theme, Sprint 1 scope, repo URL, tested tag/commit, deployed URL/version, final UAT decision, UAT tester names (section 4); manual tests labelled manual (4.2); no secret |
| L6-09+ | One Issue per accepted defect: RED test commit, fix commit (GREEN), full `npm test`, PR into `lab6-staging` | B | A | RED and GREEN output with commands, counts and commit hashes |
| L6-X | Only if no real defect: ask the TA for a controlled defect exercise; run the same chain on an isolated branch, never deployed over the accepted release | B | A | TA request kept as evidence; RED/GREEN on the exercise branch |

## 3a. Who does what

| Member | Author of | Reviews or checks |
|---|---|---|
| A (songt888) | L6-00, L6-01, L6-02, L6-05, L6-06 release PR, L6-07 coordination, PDF Parts A and B; runs half the partner cases and half of the L6-07b retest | L6-04, every fix PR, PDF Parts C and D |
| B (stickkersz) | L6-04, L6-09+ fixes (or L6-X), PDF Parts C and D; runs half the partner cases and half of the L6-07b retest | L6-00, dry-run of L6-01, L6-05, approves and merges the release PR |

## 4. Our UAT cases (draft for L6-01)

Roles and accounts are named by label only. Each case creates its own data (D-28), so the cases are independent and can run in any order. Detailed numbered steps and exact expected screen text go in `uat-cases.md`.

| Case | Category | Sprint 1 refs | Role and account | Outline and key expected result |
|---|---|---|---|---|
| UAT-01 | Normal journey | F-01 to F-04; AC-01, AC-06, AC-25, AC-10, AC-12, AC-24 | Organizer One, then Participant 3 | Organizer creates a future event with capacity 3 and publishes it. Participant sees it in Events with 3 places, registers, and sees 2 places left and an ACTIVE registration |
| UAT-02 | Business rule and boundary | F-02, F-04; AC-07, AC-29, AC-13, AC-14 | Organizer One, Participants 3 and 4 | Capacity 0 and a past start are rejected. Event with capacity 1: Participant 3 registers; a second try is rejected as already registered; Participant 4 is rejected as full; places stay 0 |
| UAT-03 | Forbidden role and ownership | F-04, F-06; AC-16, AC-20, AC-21, AC-08 | Organizer Two, Participant 3 | Organizer Two opens Organizer One's registration list and is refused, with no names shown. A participant cannot open organizer pages or create an event. An organizer cannot register. Then Organizer One checks that nothing changed |
| UAT-04 | State, history and persistence | F-01, F-05, F-06; AC-04, AC-17, AC-19 | Participant 3, Organizer One | After UAT-01 data exists (or a fresh event): sign out, sign in again; My registrations still lists the registration. The organizer's list shows exactly the participant's name and email. After sign-out, a protected page goes to login |
| UAT-05 | Draft visibility | F-02, F-03, F-04; AC-10, AC-27, AC-32 | Organizer One, Participant 3 | A DRAFT event does not appear for a participant, and its direct URL shows not found |
| UAT-06 | Sign-in errors | F-01; AC-02, AC-03 | none, then Participant 3 | Wrong password and unknown email show the same message; signed-out visit to My registrations goes to login |

UAT-04 reruns on a fresh event if the partner runs cases in a different order. Concurrency (AC-15, AC-37) stays covered by automated tests only, and the handoff says so.

## 5. TDD for corrections

New IDs continue the sequence (`AC-56`, `TEST-56`, never renumber). Each accepted defect gets a test named with its TEST ID and the Lab 6 Issue, for example `TEST-56 AC-56 organizer cannot see another organizer's registrations (L6-09)`. The red commit comes first, with the test failing against the defective code; the green commit follows. Keep the commands, the commit hashes and the real pass, fail and skip counts. A test that always passes, a syntax error or a broken fixture does not count. Existing tests and E2E must still pass.

## 6. Evidence plan

| ID | Proof | Part |
|---|---|---|
| E-A1 | `uat-cases.md` and `handoff.md` at a commit, plus the handoff message (no password) | A |
| E-B1..n | one row per partner case: tester, time, version, input, actual, result, screenshot ID | B |
| E-C1..n | outgoing reports and the partner's replies; our triage table | C |
| E-D1..n | RED and GREEN output, diff excerpt, PR review text, CI run, release PR, Deploy run, revision, smoke output | D |
| E-D-final | the partner's decision record: tester names, version, date, conditions | D |

Each screenshot carries the evidence ID, action, expected and actual result, time, and commit or revision. No email of a real person, no password, no `DATABASE_URL`. Review text from Issues and PRs is quoted in the PDF, not only linked.

**Version table (PDF):** Sprint 1 baseline `v0.1.0-sprint1` / `12dcd3c` → tested release `v0.1.2-lab5` / `04e8590` / `-00005-5l7` → defective commit(s) → test commits → corrected `main` release `v0.1.3-lab6` → deployed revision. Explain the merge commits.

## 7. Safety rules

- Credentials reach the partner only through a private channel; the PDF names account labels and roles only.
- Do not reset or reseed production (D-20). UAT creates data only through the app.
- Tell the partner before every deploy. Acceptance covers only the recorded release.
- Never fabricate a finding, a result or a sign-off. Do not invent a defect, and do not break the live release for the exercise. A recorded "Not Accepted" is better than an unsupported "Accepted".
- All `AGENTS.md` and Lab 5 cloud rules still apply (prefix `s47a6b53b` only, `--update-env-vars`, no secrets seen by agents).

## 8. Order of work

| Date | Work |
|---|---|
| Tue 24 – Wed 25 Nov | L6-00 merged; L6-02 find the partner and agree on sessions; L6-01 cases written, B dry-runs them, handoff sent |
| Wed 25 – Thu 26 | both teams run each other's cases (L6-03); outgoing reports (L6-04) |
| Thu 26 – Fri 27 | triage (L6-05); fixes (L6-09+) or ask the TA for the controlled exercise (L6-X) **by Thursday** |
| Fri 27 – Sat 28 | release and deploy (L6-06); partner retest and decision (L6-07); our retest of their fixes and our decision (L6-07b) |
| Sat 28 – Sun 29 | PDF (L6-08), Definition of Done check, submit |

Critical path: partner found, handoff sent, partner runs our cases, fix and release, partner retest. If the partner is unavailable or the app cannot be reached, notify the instructor or TA at once and keep the message as evidence.

## 9. Definition of Done for Lab 6

- [ ] at least 4 cases covering the four categories, each with AC refs and specific expected results; handoff complete
- [ ] every partner case executed by us, with actual results, testers, times and version; both of us tested
- [ ] every received finding classified with a reason; every outgoing failure reported
- [ ] critical and major defects fixed with RED/GREEN, reviewed PR, CI, release, deploy and partner retest; minor ones fixed or accepted by the partner
- [ ] the partner's final decision recorded with names, version and date
- [ ] PDF has contents (Parts A to D, pages, evidence IDs), version table, contribution table, AI use, limitations; no secret

## 10. Open items

1. Which team is our partner (and their session times).
2. The live start dates of the demo events (whether Intro to Git has already started).
3. Whether the TA wants the controlled exercise deployed anywhere, if no real defect appears.
