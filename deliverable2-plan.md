# CPE 334 Deliverable 2 Plan: Sprint 2 completion and Sprint 3 progress

Team: A = songt888 (Kirakit Kingkaew), B = stickkersz (Nattakit Prasertsak). Same repo, same app, same rules as `AGENTS.md`.
Deliverable: one self-contained PDF on LEB2, **Sunday 29 Nov 2026, 23:59** (same day as the Lab 6 and Lab 7 PDFs). Final release: 13 Dec.
Source: `project_deliverable_2_v1` handout (it wins on any conflict). Product scope: `docs/srs.md`, `docs/features.md`, `docs/sprints/plan.md`.

**Where we start (27 Nov).** `main` `861f01f` = `v0.2.0-lab7`, deployed as `s47a6b53b-00007-mkk`. It holds Sprint 1 (F-01 to F-06), the Lab 5 pipeline, the Lab 6 fixes and the Lab 7 change BR-10. **No Sprint 2 or Sprint 3 work exists yet**: no contract, branch, Issue or code for F-07 to F-13. The plan below keeps the full Sprint 2 scope (it cannot be moved to Sprint 3 to look complete) and takes one Sprint 3 rule, F-10 check-in, to working and tested.

## 0. What is graded (70 points)

| Part | Pts | What the TA opens |
|---|---|---|
| A Sprint 1 continuity and change status | 5 | `v0.1.0-sprint1` / `12dcd3c`; the Sprint 1 journey on the candidate; change/defect register (Lab 5 to 7 findings, decisions, releases, retests) |
| B Sprint 2 contracts and working increment | 25 | complete contracts for F-07, F-08, F-09 (written **before** code), TDD red/green, completion table AC → test → result → release, reviewed PRs, the Sprint 2 release on `main` |
| C Sprint 3 contracts and working progress | 15 | contracts, AC and STS for F-10 to F-13; F-10 implemented and tested; remaining-work table with owner and date |
| D Requirements and traceability | 10 | current SRS, feature inventory, system SDS; one matrix requirement → feature → sprint → AC → planned test → actual test → result and version; gaps shown |
| E Integrated release candidate | 15 | candidate on `main`, build/test/CI/deploy output on its commit, cross-feature regression, post-deploy checks, setup summary, readiness and plan to 13 Dec |

## 1. Decisions to confirm in S2-00 (proposed; add to `docs/decisions.md`, never renumber)

The SRS and features leave these rules open "for the S2/S3 contract". They are decided here, before any test, and copied into the contracts.

| ID | Decision (proposed) | Why |
|---|---|---|
| D-32 | Branches and releases. Sprint 2: integration branch `sprint-2-staging` from `main` `861f01f`; branches `feature/s2-NN-topic`, `docs/s2-NN-topic`, `fix/s2-NN-topic`; release PR → `main`, tag **`v0.3.0-sprint2`**. Sprint 3 progress: `sprint-3-staging` from `main` after the Sprint 2 release; branches `feature/s3-NN-topic`; release PR → `main`, tag **`v0.4.0-rc1`** = the submitted D2 candidate. Earlier tags never move. Both staging branches are added to the ruleset (1 approval, required `test-and-docker`) and to the CI trigger | the handout wants the Sprint 2 release identifiable even when the candidate has later work |
| D-33 | F-07 cancellation. A participant cancels only their own ACTIVE registration, and only before the event starts (`startsAt > now`). `POST /api/registrations/:id/cancel` sets `status` CANCELLED and `cancelledAt`; the row stays. Another participant's ID or an unknown ID: 404 (as FR-07). Already cancelled: 409 `ALREADY_CANCELLED`. Started: 409 `EVENT_STARTED`. Organizer: 403. Re-registration creates a new ACTIVE row (the partial unique index allows it) under all registration rules. CANCELLED rows never count for capacity, duplicates or BR-10 | BR-07; SRS says the time limit is set in the S2 contract |
| D-34 | F-08 event lifecycle. States DRAFT → PUBLISHED → CLOSED, and DRAFT/PUBLISHED/CLOSED → CANCELLED; CANCELLED is final, CLOSED cannot reopen. Owner only (403 other role, 404 another organizer's DRAFT, 403 another organizer's PUBLISHED, as D-13). Edit `PATCH /api/events/:id` (title, description, location, startsAt, capacity, registrationDeadline) only while DRAFT or PUBLISHED and not started. `capacity` below the ACTIVE count: 409 `CAPACITY_BELOW_ACTIVE` (checked under the event row lock). `startsAt` can change only while the event has no ACTIVE registration (409 `EVENT_HAS_REGISTRATIONS`), so BR-10 and deadlines of registered people never shift. Close `POST /api/events/:id/close`: PUBLISHED only; stays listed, shown as Closed; registration 409 `EVENT_CLOSED`; existing registrations stay ACTIVE. Cancel `POST /api/events/:id/cancel`: not listed any more; all its ACTIVE registrations become CANCELLED in the same transaction; registration 404 like a hidden event; the owner still sees it in My events | FR-10, D-03, D-07 "CLOSED/CANCELLED in Sprint 2" |
| D-35 | F-09 deadline. New nullable `Event.registrationDeadline` (timestamptz, stored UTC, entered and shown in the browser's local time like `startsAt`). Null = the old rule (open until start). Validated only when a request sets it (create, or a `PATCH` that sends `registrationDeadline`): later than now and not later than `startsAt` (400 `INVALID_DEADLINE`); a `PATCH` without it never fails on a passed deadline. The owner may move a passed deadline later (reopens registration) while the event is editable and not started; `null` removes it. Registration is allowed only while `now < registrationDeadline`; at the deadline it is closed (409 `REGISTRATION_CLOSED`). Check order: 404 → `EVENT_STARTED` → `EVENT_CLOSED` → `REGISTRATION_CLOSED` → `ALREADY_REGISTERED` → `TIME_CONFLICT` → `EVENT_FULL` | BR-06 asks for equality and timezone to be fixed in the contract |
| D-36 | F-10 check-in window. The owning organizer checks in an ACTIVE registration from 60 minutes before `startsAt` until 6 hours after it (`startsAt - 60 min <= now < startsAt + 6 h`). New table `CheckIn` (one per registration, unique `registrationId`, `checkedInAt`, `checkedInById`). Check order: unknown registration 404; participant or another organizer's event 403; CANCELLED registration 409 `REGISTRATION_NOT_ACTIVE`; repeat 409 `ALREADY_CHECKED_IN`; outside the window 409 `OUTSIDE_CHECKIN_WINDOW`. A checked-in registration can no longer be cancelled (409 `ALREADY_CHECKED_IN`) | BR-08 says the window is a S3 contract decision; events have no end time |
| D-37 | F-11/F-12 counting (contract only for D2). Registered = ACTIVE registrations; checked in = those with a CheckIn; no-show = ACTIVE without CheckIn **after the check-in window has ended**; before that they count as "not yet checked in". CANCELLED rows are listed separately and never counted as no-show | FR-14 asks to agree no-show timing first |
| D-38 | F-13 rate limiting and NFR-05 (contract only for D2): login limited to 10 failed attempts per email per 15 minutes (429 `TOO_MANY_ATTEMPTS`, also for the right password during the lock; a successful login before the lock resets the count; known limitation: anyone can lock a known email for 15 minutes); NFR-05 measured with 1,000 seeded events, 20 warm-up and 200 measured requests at concurrency 10 | system SDS lists both as S3 hardening to specify first |

Migrations only add (D-20): enum values `CLOSED`, `CANCELLED` (Event) and `CANCELLED` (Registration), columns `cancelledAt`, `registrationDeadline`, table `CheckIn`. Production data is never reset; the deploy runs `migrate deploy` and the demo seed.

## 2. Issues (label `sprint-2` or `sprint-3`)

Same Kanban (Backlog → Specified → Started → PR Review → Fixing → Done) on the board "Event Registration - Sprint 2/3" (https://github.com/users/songt888/projects/7). Every feature: contract PR merged first → red commit → green commit → evidence → PR reviewed by the other student → merged into staging. Test names carry IDs: `TEST-73 AC-73 ...`. New IDs continue from AC-72 / TEST-72.

| Issue | Work | Author | Reviewer | Branch | Done when |
|---|---|---|---|---|---|
| S2-00 (#199) | this plan, D-32 to D-38, `sprint-2-staging`, CI trigger, ruleset | A | B | `docs/s2-00-plan` | merged; staging protected; CI ran |
| S2-01 (#200) | **Contracts F-07, F-08, F-09**: feature SDS, workflow, UI/API/data, validation and errors, permissions, AC, STS, DoD, version rows; SRS/system SDS/traceability rows | A: F-07, F-09. B: F-08 | cross | `docs/s2-01-contracts` | merged **before** any S2 test commit |
| S2-02 (#201) | Migration: enum values, `cancelledAt`, `registrationDeadline` (no behavior change); `prisma migrate dev` shows no drift and keeps the ACTIVE partial index | A | B | `feature/s2-02-schema` | migration runs on test DB and in CI; 73 old tests pass |
| S2-03 (#202) | **F-07 Cancel registration**: red API tests (own, foreign 404, twice, started, re-register, place freed, BR-10 slot freed), green service + route, My registrations Cancel button, E2E | B red, A green | each reviews the other's half | `feature/s2-03-cancel` | AC green; E2E green |
| S2-04 (#203) | **F-08 Manage event**: edit, capacity floor under the lock, close, cancel (cascades registrations), owner-only, UI on My events / event page | B | A | `feature/s2-04-manage-event` | AC green; E2E green |
| S2-05 (#204) | **F-09 Registration deadline**: create/edit field, boundary before/at/after, null = old rule, check order, UI field and message | A | B | `feature/s2-05-deadline` | AC green |
| S2-06 (#205) | Sprint 2 integration and release: full suite, E2E, cross-feature checks, release PR → `main`, tag `v0.3.0-sprint2`, deploy, post-deploy checks | A | B | release PR | deployed; evidence |
| S3-01 (#206) | **Contracts F-10 to F-13** (all remaining features, enough UI/API/data detail; D-36 to D-38) | B: F-10, F-11. A: F-12, F-13 | cross | `docs/s3-01-contracts` | merged before the F-10 red commit |
| S3-02 (#207) | **F-10 Check-in** (the implemented Sprint 3 rule): `CheckIn` table, red API tests (window boundaries, repeat, cancelled, foreign owner, participant), green, check-in button on the organizer registrations page | B | A | `feature/s3-02-checkin` | AC green; E2E or API journey |
| S3-03 (#208) | Release candidate: `sprint-3-staging` → `main`, tag `v0.4.0-rc1`, deploy, regression, post-deploy checks | A | B | release PR | submitted version deployed |
| S3-04 (#209) | D2 PDF | A: Parts B, D (35 pts). B: Parts A, C, E (35 pts) | cross-check | `docs/s3-04-pdf` | one PDF, submitted |
| later (by 13 Dec) | F-11 attendance report, F-12 dashboard, F-13 hardening, NFR-05, final UAT retests, video, final release | see section 5 | | | |

F-10 also needs F-07 (a cancelled registration cannot check in) and F-08 (a cancelled event), so S3-02 starts after S2-03 and S2-04 are merged.

### Red and green PR handoff

After the contract PR merges, open a red-test PR into the unprotected feature branch. The other student reviews and approves the red PR; record the expected failing output on the red commit. Give every red step its own `it` so one failure does not hide another. Then implement green on the feature branch and open a separate PR from that branch into `sprint-2-staging`; the other student reviews it and `test-and-docker` must pass. Preserve the red and green commit history. B owns this handoff starting with S2-03 (F-07: B red, A green), as agreed in Lab 7 retrospective D.4.

## 3. Workload and honesty rule

**Workload balance.** Code: A has the migration, F-07 green and F-09; B has F-07 red, F-08 and F-10. Releases: A does both (the Sprint 2 release and the candidate). PDF: 35 points each. B also still has the Lab 7 metrics, readiness and PDF Parts C/D; A's Lab 6/7 work is done, so A takes the plan, four contracts and both releases (moved back after B's review of #198).

A and B set their own timing. Whatever is not finished at submission is reported as it is: an incomplete Sprint 2 feature stays in the Sprint 2 completion table with its missing AC (it is not moved to Sprint 3), and unfinished Sprint 3 work is shown as planned or in progress.

## 4. Evidence plan (PDF)

| Part | Evidence |
|---|---|
| A | tag `v0.1.0-sprint1`; Sprint 1 journey (TEST-22 E2E and a post-deploy check) on `v0.4.0-rc1`; change/defect register from Lab 5 (deployment decisions, `v0.1.2-lab5`), Lab 6 (our 13 findings and fixes, #126 Accepted), Lab 7 (CR-01, `v0.2.0-lab7`) |
| B | full contracts F-07/F-08/F-09 (appendix), red/green per feature with commit IDs, completion table, two Issue/PR chains (suggested F-07 pair work, F-08), program demos: cancel and re-register (persistence: My registrations after reload), capacity below ACTIVE rejected, another organizer's edit refused by the API |
| C | contracts F-10 to F-13, F-10 red/green and demo (check-in rejected outside the window, accepted inside, repeat refused), remaining-work table |
| D | current SRS, features, system SDS, traceability with status per AC (implemented / test run / passed / planned) |
| E | build, `npm test`, E2E, CI run and deploy run on the `v0.4.0-rc1` commit; revision; cross-feature checks (cancel frees capacity and BR-10 slot; cancelled event frees registrations; deadline with BR-10 order); setup summary; readiness; plan to 13 Dec |

Two test excerpts in the PDF: one domain rule (capacity floor or deadline boundary) and one access restriction (foreign organizer edit or foreign cancel).

## 5. Remaining work after D2 (owner, target before 13 Dec; exams 1 to 11 Dec)

| Item | Owner | Target |
|---|---|---|
| F-11 attendance record and report (D-37) | B | 5 Dec |
| F-12 organizer summary dashboard | A | 5 Dec |
| F-13 login rate limit, NFR-05 measurement, NFR-09 checklist for new screens | A | 8 Dec |
| UAT retest of new features with Est, final regression | A and B | 11 Dec |
| final release `v1.0.0`, video, final PDF | A and B | 13 Dec |

## 6. Risks

| Risk | Response |
|---|---|
| A migration breaks production data | additive only (D-20); run `migrate deploy` on a copy of the test DB first; CI runs migrations |
| New states break Sprint 1 and Lab 7 behavior (capacity, BR-10, ownership) | the 73 API tests and 20 E2E stay unchanged and run on every PR; cross-feature tests added in S2-06 |
| Editing `startsAt` after registrations would break BR-10 or deadlines | D-34 blocks it while ACTIVE registrations exist |
| Est sees behavior change during their Lab 6 work | Lab 6 testing is finished (#126); no notice needed |
