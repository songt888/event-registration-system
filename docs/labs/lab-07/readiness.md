# Lab 7 Part D: release readiness, technical debt and retrospective (L7-07 #139)

Author B (Nattakit Prasertsak), reviewer A. Evidence ID E7-D1. Snapshot 2026-11-27 14:15 (UTC+7).

- **Scope:** the maintained Sprint 1 scope in the deployed release, meaning F-01 to F-06, the approved change CR-01 (BR-10), and the Sprint 1 behavior that was accepted before.
- **Not in the release:** Sprint 2 and 3 features. `sprint-2-staging` exists from `861f01f`, but no Sprint 2 code has been merged.

## 1. Readiness checklist

| Item | Status at the snapshot | Evidence |
|---|---|---|
| Accepted Sprint 1 baseline | tag `v0.1.0-sprint1`, commit `12dcd3c` | tag |
| Pre-change commit | `502d2a6` = tag `v0.1.3-lab6`, revision `s47a6b53b-00006-7bv`. No server file changed since Lab 5 (`git diff 04e8590 502d2a6 -- server` is empty) | Part A, E7-B1 |
| Submitted and deployed release | tag `v0.2.0-lab7` (annotated) on merge commit `861f01f` (release PR #193), Cloud Run revision `s47a6b53b-00007-mkk`, https://s47a6b53b-4d7hbszvwq-as.a.run.app | E7-B4 |
| Running revision = release commit | "Deploy to Google Cloud" run 45948919136 built and deployed `861f01f` (2026-11-27 12:58 to 13:00). Its log: "revision [s47a6b53b-00007-mkk] has been deployed and is serving 100 percent of traffic". The live client bundle `index-CcXia3Aw.js` is the same file name as B's local build of `861f01f` | E7-B4, E7-C3 |
| Approved change CR-01 (BR-10) | 409 `TIME_CONFLICT` when two ACTIVE registrations of one participant start less than 120 min apart; exactly 120 min allowed. Red: TEST-57 to TEST-60 fail on `7098c4e`, where the server is unchanged. Green on the release commit: all four pass in `npm test` (73), and TEST-61 passes in the E2E suite (20). On production, 119 min → 409 `TIME_CONFLICT` and 120 min → 201 | E7-B1, E7-C3, E7-B5 |
| Unaffected accepted behavior | Every Sprint 1, Lab 5 and Lab 6 test runs unchanged and passes on `861f01f`. That covers capacity, duplicate, concurrent last place, started event, ownership and session (69 of the 73), and the E2E journeys plus the Lab 6 fixes (19 of the 20). On production, a repeat registration → 409 `ALREADY_REGISTERED` and a participant reading an organizer's list → 403. One old test changed: the TEST-65 fixture moved to two weeks ahead, with its assertions unchanged (B.3) | E7-C3, E7-B5 |
| Automated tests on the release commit | `npm run build` OK; `npm test` 15 files, **73 passed, 0 failed, 0 skipped**; `npm run test:e2e` **20 passed, 0 failed, 0 skipped** (B, 2026-11-27 14:11, Node v24.16.0). Required check `test-and-docker` on the release PR head `a6439d7`: success (run 45897022578) | E7-C3, E7-C5 |
| Failed checks during the work (none hidden) | (1) CI failure on `f8a9270` (run 45885717175): the intended red, with TEST-57 to TEST-60 failing on the unchanged server. (2) First E2E run at `5a2197b`: 19 passed, 1 failed, because the TEST-61 fixture had no event description (400 in setup); fixed in `4d51c76`, no assertion changed. No check failed on the release commit | E7-C5, B.3 |
| Not checked on production | the full-event path and the `TIME_CONFLICT` alert in the UI. Covered by TEST-13, TEST-15 and TEST-37 and by TEST-61 on the release commit. The production requests were AI-executed on A's sign-in, not clicked | E7-B5 |
| Selected user tests | Lab 6 UAT by Est on `v0.1.3-lab6`: all 13 findings PASS; UAT-01, UAT-02, UAT-03, UAT-04 (including step 9) and UAT-06 PASS; decision **Accepted** (#126, 2026-11-27 03:18). UAT was not repeated on `v0.2.0-lab7`; Est's Lab 6 testing ended before this release (D-31) | Lab 6 PDF Part D |
| Defects by severity and status | see section 2: 0 open critical or major; 1 open minor documentation defect | section 2 |
| Technical debt | 6 items, section 3 | section 3 |
| Configuration and secrets | Git holds only `.env.example`, plus the CI placeholders `app:app@localhost` for the throwaway Postgres container. Deploy signs in through Workload Identity Federation (no key file), with Actions pinned to commit SHAs. Runtime secrets stay in Cloud Run, set by the course portal (D-25). No password, cookie or connection string appears in any Lab 7 evidence file | `.github/workflows/deploy.yml`, E7-B5 |
| Documentation and run instructions | README and the AGENTS.md Commands section give setup, `npm test`, `npm run test:e2e`, `npm run seed:demo` (never `npm run seed` on production, D-20), Docker and the deploy and smoke commands. Contract revisions: F-04 1.7, system SDS 1.2, SRS CR-01 line, all on `main`. **Gap:** F-01 1.6 is on `lab6-staging` only, not on `main` (defect D7-1) | README, section 2 |
| Deploy and smoke status | `python3 deploy/smoke_test.py <URL>` at 14:14: `GET /api/health` 200, `GET /` 200 HTML, `GET /api/me` without a session 401, exit 0. CR-01 production checks (E7-B5): 5 of 5 PASS | E7-D1-smoke.txt, E7-B5 |

**Decision: READY** for the maintained Sprint 1 scope in `v0.2.0-lab7` / `s47a6b53b-00007-mkk`.

Reasons:
- The approved change passes its red-then-green tests and the production checks.
- Every previously accepted Sprint 1 test passes unchanged on the release commit.
- The running revision is the release commit.
- The partner accepted the Sprint 1 release before this change.
- No critical or major defect is open.

READY does not mean the outstanding items below are done; each has an owner and an action.

| Outstanding item | Owner | Action |
|---|---|---|
| D7-1: `main` still has F-01 1.5 ("one row from 641 px") | A (Sprint 2 releases) | sync PR `lab6-staging` → `sprint-2-staging` (a merge, not a rebase) before the Sprint 2 release, so F-01 1.6, the Lab 6 evidence and the PDF sources reach `main` |
| E2E not in the required CI check | B | the Part C action: Playwright job in `ci-docker` before S2-03 |
| Est's non-blocking observations #151 (641 to 735 px) and #147 (label ellipsis at 320 px) | B | recheck both with the responsive debt item (TD-3) in the Sprint 2 UI work |
| #137 still open | A | close it; release, tag, deploy and evidence are done (#193, #196) |

## 2. Defects by severity and status

| ID | Source | Severity | Status at the snapshot |
|---|---|---|---|
| #142 | Est, Lab 6 | major | resolved: fixed in `v0.1.3-lab6`, Est retest PASS |
| #141, #153 | Est, Lab 6 | minor | resolved: fixed in `v0.1.3-lab6`, Est retest PASS |
| #152 | Est, Lab 6 | duplicate of #142 | resolved with #142 |
| #143 to #148, #151, #154, #155 (9) | Est, Lab 6 | enhancements (minor) | done in `v0.1.3-lab6`, Est retest PASS |
| D7-1 | B, this review | minor (documentation) | **open**. The deployed contract `main` F-01 1.5 says the taskbar keeps one row "from 641 px", but Logout wraps at 641 to 735 px (Est's #151 observation). F-01 1.6 narrows the statement to "768 px and wider", but it is on `lab6-staging` only. The app is correct against 1.6, and the TEST-72 widths are 768 and 812 px |
| (none) | CR-01 work | | no defect found in the change; no new defect Issue opened in the Lab 7 window (M4) |

Critical: 0. Major: 0 open (1 resolved). Minor: 1 open (D7-1).

## 3. Technical debt

Deferred engineering work, not wrong behavior; wrong behavior is in section 2.

| # | Item | Impact | Priority | Disposition / action |
|---|---|---|---|---|
| TD-1 | Playwright E2E is outside the required check (D-23); 20 tests run only by hand | A UI regression (TEST-61, or the Lab 6 fixes TEST-56, TEST-62 to TEST-72) can merge with a green check | high | E2E job in `ci-docker` before S2-03; owner B (Part C action) |
| TD-2 | E2E runs against the Vite dev servers, not the built image that is deployed | Behavior that only appears in dev leaks into tests: React StrictMode's double request forced the TEST-56 contract correction (`4c05a54`). A difference that only appears in the built image is never caught | medium | run the CI E2E job against the API serving `CLIENT_DIST`; owner B, with TD-1 |
| TD-3 | Responsive layout is checked only at sampled widths (TEST-65: 1280, 1024, 768, 375; TEST-72: 320 to 812) | #141 passed at 1280 and 375 px but overflowed at 768 and 812 px (follow-up PR #171). Est still saw Logout wrap at 641 to 735 px (#151) | medium | one width list shared by the layout tests, with 640, 700 and 1440 added; owner B, in the Sprint 2 UI work |
| TD-4 | Each page maps 401, 403 and 404 to its own screen (`EventsPage`, `EventRegistrationsPage`, `MyEventsPage`, `MyRegistrationsPage`) | Lab 6 defects #142, #152 and #153 came from this. The new Sprint 2 pages (cancel, manage event) can repeat it | medium | one shared error-to-screen helper before the F-07 and F-08 UI; owner A |
| TD-5 | BR-10 has no database constraint; it relies on the service check and the participant-row `FOR UPDATE` lock | A write path that skips the service (seed, script) can store a conflict. Only TEST-60 guards the race | low | keep TEST-60 in every regression run, and keep new write paths behind `registerForEvent` (F-07 re-registration included); owner A |
| TD-6 | Lab 6 post-release docs and evidence are on `lab6-staging` only (27 commits not on `main`) | The repository's `main` does not show the whole history the PDFs cite (D7-1 comes from this) | low | the sync PR in the outstanding items; owner A |

## 4. Retrospective

- **What helped:** reviewing the contract before any code found the one gap that mattered. A asked for TEST-59 (e), which checks that a started registration still counts, so the red set covered every BR-10 branch before the implementation was written.
- **What hurt:** red and green shared one PR (#190) opened from B's account, so GitHub let only A approve it. Its CI run failed on the red commit by design, and both had to be explained in comments. TEST-59 (e) also stayed hidden behind step (c) and needed a separate run.
- **What will change:** for Sprint 2, each feature gets a red PR and a green PR, each approved by the other student, and every red step gets its own `it`. Owner B, starting with S2-03 (F-07: B red, A green).
