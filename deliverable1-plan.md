# CPE 334 Deliverable 1 — Full-Score Plan
Theme 3: Event Registration and Attendance System (ระบบลงทะเบียนกิจกรรมและเช็กชื่อ) — Participant / Organizer
Submission: LEB2, ONE self-contained PDF per team. 80 pts.

---------------------------------------------------------------------
## 0. What the graders actually reward
TAs read the PDF only (repo is for spot-checks). Points come from: observable behavior, traceability (ID chains),
real tests with real output, and honest disclosure. NOT from length, commit count, or polish.

Rubric: A SRS 10 | B Features+traceability 10 | C System SDS 15 | D 3-sprint plan 5 | E Sprint-1 contracts 20 | F Working S1 + evidence 20

Traps that lose points (from the spec):
1. Generic CRUD / "manage events" wording  -> every FR/BR must be observable + rule-based.
2. Client-chosen user ID or role (role dropdown)  -> auth MUST be enforced on backend from session/token.
3. Mock-only persistence, stub assertions, "all tests pass" screenshot without command/commit/counts.
4. Contract written AFTER code -> need visible git history: spec commit, then failing test commit, then implementation commit (TDD).
5. Author approves own PR; PR review without a specific check/finding.
6. Skipped/failed tests hidden or weakened.
7. Real passwords/secrets in PDF or Git.
8. Later commits changing the assessed version -> tag the release, don't touch main after.
9. PDF must contain everything (Parts A-F) + TOC with page numbers + navigation table. Don't say "see repo".

---------------------------------------------------------------------
## 1. Decisions to lock NOW (record them in the SRS "decisions" table — graders want ambiguities resolved)
| ID | Question (spec says "clarify") | Decision |
|----|----|----|
| D-01 | Context | University campus events (seminars, workshops, activities); synthetic data |
| D-02 | Duplicate registration | One ACTIVE registration per participant per event; partial unique index in DB + service check |
| D-03 | Capacity | Positive integer 1..10,000; counted = ACTIVE registrations; cannot publish capacity <= 0; (later sprint: capacity cannot drop below active count) |
| D-04 | Registration deadline | S1: events can be registered while PUBLISHED and start time in the future. Deadline field + rules -> Sprint 2 |
| D-05 | Waitlist | Out of scope (explicit exclusion) |
| D-06 | Who sees registrations | Organizer sees registrations only for events THEY own; participant sees only their own |
| D-07 | Event lifecycle | DRAFT -> PUBLISHED -> (later) CLOSED/CANCELLED. S1 implements DRAFT->PUBLISHED: create saves a DRAFT, a separate owner-only publish action publishes it (revised, see docs/decisions.md) |
| D-08 | Auth | Email+password, bcrypt hash, server-side session (opaque token in httpOnly cookie, hash in Session table, 1h expiry); logout deletes the session row so a copied cookie stops working. See docs/decisions.md |
| D-09 | Roles | PARTICIPANT, ORGANIZER; one role per account; seeded accounts only |
| D-10 | Concurrency for last place | One transaction: lock event row first (SELECT ... FOR UPDATE), then check duplicate, count ACTIVE, insert. See docs/decisions.md |
| D-11 | Stack | React + TypeScript + Vite, Express + TypeScript + zod, Prisma + PostgreSQL 16, Vitest/Supertest/Playwright; written from scratch for this project (see Section 2) |
| D-12 | Event start time | startsAt must be strictly later than now at create and at publish, else 400 INVALID_START_TIME (BR-09) |
| D-13 | Exact error codes | organizer registers 403; DRAFT/unknown event 404 EVENT_NOT_FOUND; started event 409 EVENT_STARTED; other participant's registration 404; non-owner organizer on a DRAFT 404 (any operation); non-owner organizer on an owner-only operation of a PUBLISHED event 403; wrong role on a role-restricted route 403 for any event ID (check order: 401, then 403 role, then 404/403 ownership) |
| D-14 | Test database | separate DATABASE_URL_TEST; integration files run sequentially (fileParallelism: false), tables truncated in beforeEach. E2E (TEST-22..24) runs separately against its own DATABASE_URL_E2E, reset and seeded before each run, never together with the integration suite |

---------------------------------------------------------------------
## 2. Recommended stack (small, Docker/GCP-ready, real concurrency testing)
- Frontend: React + TypeScript + Vite
- Backend: Node 20 + Express (or Fastify) + TypeScript, zod validation
- DB: PostgreSQL 16 (docker-compose for local) + Prisma migrations + seed script
  (Postgres chosen over SQLite because the "competing requests for last place" test needs real transactional locking; also maps to Cloud SQL in Lab 5)
- Auth: bcrypt + server-side session in a Postgres `Session` table, opaque token in httpOnly cookie
- Tests: Vitest/Jest (unit) + Supertest (API+DB integration against a test DB) + Playwright (2-3 E2E journeys)
- Layout: business rules live in backend service layer (NOT in React, NOT only in route handlers)
- Config: .env.example only; real .env in .gitignore
(If you prefer another stack that you already know better, keep it — only requirement is UI -> API -> persistent DB.)

---------------------------------------------------------------------
## 3. Requirements baseline (starter set — refine wording, keep IDs stable)
### Functional
- FR-01 Login with email/password; invalid credentials rejected with generic error.
- FR-02 Logout ends session; subsequent protected request -> 401.
- FR-03 GET current user (id, name, role) from session.
- FR-04 Organizer creates an event as DRAFT (title, description, location, start time, capacity > 0) and publishes their own DRAFT event.
- FR-05 Anyone authenticated can list/view published events with remaining places.
- FR-06 Participant registers for a published event.
- FR-07 Participant views own registration(s) (and its status).
- FR-08 Organizer views registrations of an event they own.
- FR-15 Organizer lists their own events in every status (DRAFT and PUBLISHED) and opens their own DRAFT. (S1; added after review, D-07)
-- later sprints --
- FR-09 Participant cancels registration (frees a place).
- FR-10 Organizer edits/closes/cancels own event; capacity change.
- FR-11 Registration deadline enforced.
- FR-12 Organizer checks in participants (check-in).
- FR-13 Attendance record and per-event attendance report/summary.
- FR-14 Organizer dashboard summary (registered / checked-in / no-show counts).
### Business rules
- BR-01 Only ORGANIZER can publish events; capacity must be a positive integer.
- BR-02 Registrations for an event never exceed its capacity (incl. concurrent requests for the last place).
- BR-03 At most one ACTIVE registration per participant per event.
- BR-04 Can register only for PUBLISHED events that have not started.
- BR-05 Participant can read only own registrations; organizer only registrations of own events.
- BR-06 (S2) Registration closes at deadline. BR-07 (S2) Cancelled registration frees a place and may be re-registered.
- BR-08 (S3) Check-in only for ACTIVE registration, only once, only by owning organizer, only within event window.
- BR-09 An event's start time must be strictly later than the current time when it is created and when it is published (D-12); startsAt equal to now is rejected. A PUBLISHED event cannot be published again (409 ALREADY_PUBLISHED). Only the owning organizer can publish a DRAFT event (D-07).
### NFR (measurable + verification + sprint)
- NFR-01 Unauthenticated request to any protected endpoint -> 401, body contains no private data. Verify: API test. S1
- NFR-02 Passwords stored only as bcrypt hash (cost >= 10); never returned by API. Verify: DB test + response test. S1
- NFR-03 Backend authorization on every protected route (role + ownership). Verify: API tests. S1
- NFR-04 Concurrency: 20 parallel register calls for capacity-5 event -> exactly 5 ACTIVE. Verify: integration test TEST-37 (specified in the F-04 contract, #20); TEST-15 covers the separate last-place case. S1
- NFR-05 List events p95 < 500 ms with 1,000 events seed (local). Verify: script. S3
- NFR-06 Data survives app restart. Verify: restart + query. S1(local) / Lab 5
- NFR-07 Inputs validated server-side; errors use a uniform JSON shape and never leak stack traces. S1
- NFR-08 App runs from README in <= 10 commands. S1
- NFR-09 Every Sprint 1 screen that loads data (events list, event detail, my registrations, organizer my events, event registrations) shows a loading indicator while waiting, an empty-state message for an empty list, and a readable error message when the API returns an error: 5 of 5 screens. Verify: E2E TEST-11 (empty state) + manual checklist per screen in docs/evidence/. S1

---------------------------------------------------------------------
## 4. Features & sprint allocation (Part B + D)
| Feature | Description | Covers | Sprint |
|----|----|----|----|
| F-01 Authentication foundation | login/logout/me, seeded users, role guard middleware | FR-01..03, NFR-01,02,03,07 | 1 |
| F-02 Publish event | organizer creates a DRAFT event w/ capacity, lists own events, opens own DRAFT, then publishes it | FR-04, FR-15, BR-01, BR-09 | 1 |
| F-03 Browse events | list/detail with remaining places | FR-05 | 1 |
| F-04 Register for event | capacity + duplicate + concurrency | FR-06, BR-02,03,04, NFR-04 | 1 |
| F-05 My registrations | participant sees own; ownership guard | FR-07, BR-05 | 1 |
| F-06 Event registrations (organizer) | organizer picks an event from My events and sees its registrants | FR-08, FR-15, BR-05 | 1 |
| F-07 Cancel registration | | FR-09, BR-07 | 2 |
| F-08 Manage event (edit/close/cancel/capacity) | | FR-10, D-03 | 2 |
| F-09 Registration deadline | | FR-11, BR-06 | 2 |
| F-10 Check-in | | FR-12, BR-08 | 3 (start S2 if time) |
| F-11 Attendance record/report | | FR-13 | 3 |
| F-12 Organizer summary dashboard | | FR-14 | 3 |
| F-13 Hardening, UX, regression | | NFR-05,06,09 | 3 |
Cross-cutting rows: NFR-01/03 "established S1 (F-01), verified every sprint via regression suite".
Include a "coverage gaps / approved changes" table (even if it says "none").

Sprint plan (Part D): S1 = F-01..F-06 (Deliverable 1). S2 = F-07..F-09 (+ F-10 start). S3 = F-10..F-13.
State dependencies: F-01 -> everything; F-02 -> F-03 -> F-04 -> F-05/F-06.
Feasibility note: S1 is 6 small features; F-04 is the heavy one.

---------------------------------------------------------------------
## 5. Sprint 1 contracts (Part E) — one block per feature F-01..F-06
Each block must have: linked FR/BR/NFR | behavior+workflow | validation | failure/boundary | permissions |
UI behavior | API (method, path, request, response, error shapes) | data fields/constraints/migration | AC list | STS table.
Say "no change" explicitly where a layer isn't touched.

### Key AC / TEST skeleton (expand; IDs must match PDF <-> repo <-> test names)
F-01 Auth
- AC-01 valid login -> 200 + session + user (no passwordHash)          TEST-01 (API)
- AC-02 wrong password / unknown email -> 401 generic message          TEST-02 (API)
- AC-03 GET /api/me without session -> 401                              TEST-03 (API)
- AC-04 logout then GET /api/me -> 401                                  TEST-04 (API)
- AC-05 password stored as bcrypt hash                                  TEST-05 (DB)
F-02 Publish event
- AC-06 organizer creates valid event -> 201, persisted as DRAFT, owner=organizer   TEST-06 (API+DB)
- AC-07 capacity 0 / negative / non-integer -> 400, nothing stored            TEST-07 (unit+API)  <- TDD sample
- AC-08 participant POST /api/events -> 403                                    TEST-08 (API)
- AC-09 anonymous POST /api/events -> 401                                      TEST-09 (API)
- AC-25 owner publishes own DRAFT -> 200, status PUBLISHED                     TEST-25 (API+DB)
- AC-26 organizer B publishes organizer A's DRAFT -> 404 EVENT_NOT_FOUND, status stays DRAFT   TEST-26 (API+DB)  <- event-ownership (D-13 event rule)
- AC-31 owner GET /api/events/:id on own DRAFT -> 200 with the draft            TEST-31 (API+DB)
- AC-32 participant or organizer B GET /api/events/:id on A's DRAFT -> 404 EVENT_NOT_FOUND, no data   TEST-32 (API)
- AC-33 organizer GET /api/events/mine -> own events in every status, none owned by others   TEST-33 (API+DB)
  (F-02 contract note: declare the /api/events/mine route before /api/events/:id, otherwise Express matches "mine" as an id)
- AC-34 participant GET /api/events/mine -> 403 FORBIDDEN                     TEST-34 (API)
- AC-35 create with startsAt exactly equal to now -> 400 INVALID_START_TIME (boundary; now passed in as a fixed time)   TEST-35 (unit)
- AC-36 owner publishes an event that is already PUBLISHED -> 409 ALREADY_PUBLISHED, nothing changes   TEST-36 (API+DB)
- AC-29 create with startsAt in the past -> 400 INVALID_START_TIME, nothing stored   TEST-29 (unit+API)
- AC-30 publish a DRAFT whose startsAt has passed -> 400 INVALID_START_TIME, stays DRAFT   TEST-30 (API+DB)
F-03 Browse
- AC-10 list shows only PUBLISHED events with remainingPlaces                  TEST-10 (API)
- AC-11 empty list -> UI empty state                                           TEST-11 (E2E/UI)
F-04 Register
- AC-12 participant registers -> 201, ACTIVE, remainingPlaces -1               TEST-12 (API+DB)
- AC-13 full event -> 409 EVENT_FULL, no row stored                            TEST-13 (API+DB)  <- TDD sample (domain rule)
- AC-14 second ACTIVE registration same event -> 409 ALREADY_REGISTERED        TEST-14 (API+DB + unique-constraint test)
- AC-15 N parallel requests for last place -> exactly 1 success                TEST-15 (integration, concurrent)
- AC-16 organizer tries to register -> 403 FORBIDDEN, no row stored            TEST-16 (API)
- AC-27 register for a DRAFT or unknown event -> 404 EVENT_NOT_FOUND, no row stored   TEST-27 (API+DB)
- AC-28 register for an event that has started -> 409 EVENT_STARTED, no row stored    TEST-28 (API+DB)
  (AC-16 was split into AC-16, AC-27, AC-28 so each test has one expected code; IDs not renumbered, D-13)
F-05 My registrations
- AC-17 participant sees own registrations                                     TEST-17
- AC-18 participant A GET participant B's registration -> 404 NOT_FOUND, no data   TEST-18 (API)  <- ownership sample (D-13)
F-06 Organizer view
- AC-19 organizer sees registrations of own event                              TEST-19
- AC-20 organizer B requests organizer A's PUBLISHED event registrations -> 403   TEST-20  <- event-ownership (on a DRAFT it is 404, D-13)
- AC-21 participant requests the registrations list of any event (DRAFT, PUBLISHED or unknown ID) -> 403 FORBIDDEN, no data   TEST-21 (D-13 check order)
E2E journeys (Playwright):
- AC-22 golden journey in the UI: organizer creates and publishes an event, participant registers and sees it in My registrations, organizer sees the participant in the event's registrations   TEST-22 (E2E)
- AC-23 participant tries to register for a full event in the UI -> "event is full" message shown, My registrations unchanged   TEST-23 (E2E)
- AC-24 login in the UI shows the user's name and role; after logout, opening a protected page returns to the login screen   TEST-24 (E2E)
Product Definition of Done (write once, explicit checklist): behavior implemented | planned tests executed & passing |
no skipped required tests | PR reviewed by teammate | merged to staging, integration run | README+docs current | incomplete work disclosed | evidence (commit, command, output) attached.

---------------------------------------------------------------------
## 6. System SDS (Part C) checklist
- Architecture diagram (UI -> API -> service layer -> DB) + where rules are enforced (service layer + DB constraints).
- ER diagram: User(id,name,email,passwordHash,role,createdAt), Event(id,ownerId FK,title,description,location,startsAt,capacity CHECK>0,status,createdAt),
  Registration(id,eventId FK,participantId FK,status,createdAt, UNIQUE partial index (eventId,participantId) WHERE status='ACTIVE'), (S3) Attendance.
- Migrations + seed: 2 organizers, 3-4 participants, 3 events (incl. one with 1 place left). Seed computes every startsAt relative to the time it runs (for example now + 7 days), never a fixed date, so seeded events stay registrable under BR-04/BR-09 — synthetic, passwords from env/handoff, not in PDF.
- API conventions: REST, /api prefix, JSON, error shape {error:{code,message}}, status code table (400/401/403/404/409), zod validation.
- Role/permission matrix (operation x Anonymous/Participant/Organizer(owner)/Organizer(other)) + record-access column.
- Auth lifecycle: login -> hash compare -> token (claims, expiry) -> cookie flags -> /me -> logout -> expiry.
- UI: screens (Login, Events list, Event detail/Register, My registrations, Organizer: My events (draft + published, Publish button), Create event, Event registrations), shared validation/loading/empty/error behavior.
- Config: env vars table (DATABASE_URL, DATABASE_URL_TEST, PORT, SESSION_TTL_MINUTES, COOKIE flags), secrets handling, planned Docker + GCP (Cloud Run + Cloud SQL, Secret Manager) — "planned, Lab 5".

---------------------------------------------------------------------
## 7. Git/process (Part F evidence is made DURING the work — start now)
Repo: ONE repo, both students are collaborators.
Branches: main (protected-ish), sprint-1-staging, feature/s1-NN-topic from staging (NN = Issue number; see AGENTS.md).
Order (visible history — this is where points are won):
1. docs commit: SRS, features, traceability, system-sds, sprint plan on main/staging.
2. Per feature: Issue (linked FR/BR/F/AC) -> branch -> commit A "spec+STS for F-0X" -> commit B "failing tests (red)" -> commit C "implementation (green)" -> PR to staging -> teammate reviews (specific finding) -> merge.
3. Staging: run full suite + manual acceptance -> release PR staging -> main, reviewed by the OTHER student than the author -> tag v0.1.0-sprint1.
4. Save raw outputs: `npm test` output with counts + commit hash into docs/evidence/ (and screenshot).
Owners (decided, see docs/team-workflow.md): Issues 1, 2, 9, 10 are split between A and B; Issues 3, 4 are A; Issues 5, 6 are B; Issue 7 is pair work (B writes the red tests, A implements, B reviews); Issue 8 is split (A: 8.1 participant view, B: 8.2 organizer view). The other student reviews every PR.
Each student writes tests AND code for at least one feature and reviews at least two PRs. Keep contribution table honest.
Minimum 2 documented Issue+PR pairs for the PDF (choose F-04 and F-06).

---------------------------------------------------------------------
## 8. Order of work — Be strict about order
Phase 1 — "Docs + skeleton"
  [A+B] Lock decisions D-01..D-14, requirement IDs (Section 1,3). Docs (Issue 1) and contracts (Issue 2): A writes Parts A, B and F-01/F-02; B writes Parts C, D and F-03..F-06; cross-review.
  [A+B] Repo, branches, GitHub Issues & board (F-01..F-06), docker-compose Postgres, Prisma schema + seed, project skeleton, test runner works.
  [A] F-01/F-02 contracts + STS  |  [B] F-03..F-06 contracts + STS (each reviews the other).  Commit "docs: sprint1 contracts" BEFORE any feature code.
Phase 2 — "Red/green implementation"
  F-01 auth (A); F-02 publish event (B, routes connected after F-01 is merged); F-03 (B) after F-02 is merged  — red tests first, then code, PR, cross-review.
  F-04 register (B writes red tests, A implements, B reviews; most important: capacity, duplicate, concurrency) ; F-05 (A) and F-06 (B) in parallel.
  React UI is built inside each feature Issue by its author ; 3 Playwright E2E tests.
  Merge to sprint-1-staging; run complete suite; fix; note failures.
Phase 3 — "Release and evidence"
  Acceptance run on staging, collect screenshots (journey, rejection, login/logout, forbidden), test output with commit id, release PR (reviewed), tag.
  Build the PDF (Section 9). Fill results table AC->TEST->file/name->result. TOC & navigation table with REAL page numbers.
  Freeze documents, proofread PDF vs rubric checklist, then submit on LEB2. Do NOT push to main after tag.

---------------------------------------------------------------------
## 9. PDF structure (single file; use this order & headings)
0. Cover: team, both names+IDs, theme/context, repo URL, release tag + commit hash. Navigation table (A–F, page ranges, IDs). TOC.
A. SRS (stakeholders/problem, actors, scope, exclusions, FR/BR/NFR tables, assumptions, decisions D-01..)
B. Feature inventory + traceability matrix (Requirement -> Feature -> Sprint -> AC/TEST) + coverage gaps + approved changes
C. System SDS (sections in Section 6)
D. Three-sprint plan + explanation of Sprint-1 scope
E. All Sprint-1 contracts F-01..F-06 + STS + DoD
F. Evidence:
   F1 setup summary (commands, env example, seed — no real secrets)
   F2 demo scenarios w/ captions: ID(s), role, start condition, steps, expected, actual: (1) golden journey + retrieve; (2) full-event / duplicate rejection; (3) login/logout + forbidden role/ownership
   F3 build/test commands, tested commit, output w/ passed/failed/skipped counts, AC->TEST results table, automated vs manual labeled
   F4 two excerpts: domain rule (TEST-13) and ownership restriction (TEST-20/18) with failing-then-passing runs & versions
   F5 two Issue+PR cases (IDs, branches, author/reviewer, review comment, merge to staging & main), board screenshot, release tag
   F6 history sequence (commit IDs + dates: spec -> red -> green)
   F7 contribution table, AI-use declaration, known limitations/failed/skipped tests
Build tooling: write PDF from Markdown/HTML (pandoc or print-from-browser); make screenshots readable at normal size.

---------------------------------------------------------------------
## 10. Final submission checklist (tick before upload)
[ ] Parts A–E complete inside PDF  [ ] TOC + nav table with real pages  [ ] README runs from scratch on a clean clone
[ ] Release tag on main; no later commits  [ ] 2 teammate-reviewed PRs with substantive comments  [ ] No self-approvals
[ ] Red->green evidence for >= 2 rules  [ ] AC->TEST->actual result table, counts honest, skips/failures disclosed
[ ] Login/logout, 401, 403 (role), 403/404 (ownership) tests exist & pass  [ ] Concurrency test passes repeatedly (run 5x)
[ ] Screenshots captioned  [ ] No secrets/real passwords in PDF/Git  [ ] Both students named, contribution table, AI-use declaration
[ ] Docker/GCP/video NOT required now (Lab 5)
