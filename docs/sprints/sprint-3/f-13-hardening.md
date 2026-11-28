# F-13 Hardening, measurement and regression: engineering contract (Sprint 3)

Issue: #206 (S3-01, contract). Implementation: after Deliverable 2 (`deliverable2-plan.md` section 5: A, 8 Dec) on `feature/s3-13-hardening`. Author: A (songt888). Reviewer: B (stickkersz).
Sources: `docs/srs.md` (FR-01, NFR-05, NFR-07, NFR-09), `docs/features.md` (F-13), `docs/decisions.md` (D-38), `docs/system-sds.md` (sections 4, 5), the F-01 contract (`docs/sprints/sprint-1/`), the F-10 to F-12 contracts, and the ID proposal on #206 (F-13 uses AC/TEST-137 to 141).

## 1. Linked requirements

| ID | How F-13 covers it |
|---|---|
| FR-01 (rate limit) | Repeated failed sign-ins for one email are limited per D-38; the error uses the shared envelope. |
| D-38 | 10 failed attempts per email in 15 minutes, then 429 `TOO_MANY_ATTEMPTS` for every further attempt for that email (also with the correct password, and no session is created); a successful login before the lock resets the count; the window is anchored at the first counted failure; known limitation: anyone who knows an email can lock it for 15 minutes. |
| NFR-05 | Measured with 1,000 seeded events, 20 warm-up and 200 measured requests at concurrency 10; p95 < 500 ms; the script and the recorded numbers are committed. |
| NFR-07 | The 429 response uses the shared envelope `{ "error": { "code", "message" } }` with no stack trace. |
| NFR-09 | The screens added in Sprint 2/3 keep the loading/empty/error standard; the checklist is recorded. |
| D-39 | The `e2e` CI job already guards the regressions this feature re-runs; F-13 adds no new CI surface. |

## 2. Behavior and workflow

1. **Login rate limit (D-38).** The login route keeps, per email, a count and an anchor time. The first failed attempt for an email without a live record starts a window anchored at that attempt. Every failed attempt inside the window increments the count. When the count reaches 10 inside the window, the email is locked: every further login attempt for that email returns 429 `TOO_MANY_ATTEMPTS` — with a wrong or the correct password, valid or invalid shape — and no session row is created. A successful login (before the lock) clears the email's record. Once `now >= anchor + 15 min`, the record no longer applies: the next attempt is evaluated normally and a new failure starts a fresh window. `now` is the server time; tests inject it (D-12).
2. The counter lives in the login service process, keyed by email. Recorded limitation (alongside D-38's own): a process restart clears every lock, and the locks are per instance; this is acceptable for the course scope and is stated in the readiness notes.
3. **NFR-05 measurement.** A committed script seeds or reuses 1,000 synthetic events on a disposable database, warms up with 20 requests, then measures 200 `GET /api/events` requests at concurrency 10 and reports p95. The run's output is recorded in the evidence; the pass rule is p95 < 500 ms.
4. **NFR-09 checklist.** A manual checklist over the screens added since Sprint 1 — My events (edit/close/cancel controls), Event registrations (Check-in column), Attendance, Summary — records loading, empty and error behavior per screen with the checklist result.
5. **Regression.** The full `npm test` and `npm run test:e2e` are re-run and recorded; the `e2e` CI job (D-39) keeps guarding them on every PR.

## 3. Validation

- The rate limit applies to `POST /api/auth/login` bodies regardless of shape: a locked email returns 429 even for a malformed body (after the lock check), because the limit is keyed by the submitted email when it is a string; a body without a usable email keeps the existing 400 `VALIDATION_ERROR`.
- The lock check runs before password verification and before any session lookup or write.

## 4. Failure and boundary cases

| Case | Result |
|---|---|
| 9 failed attempts for one email inside the window | each 401 `UNAUTHENTICATED`; no lock yet (AC-137) |
| 10th failed attempt inside the window | 401 `UNAUTHENTICATED`; the email is now locked (AC-137) |
| 11th attempt inside the window, any password | 429 `TOO_MANY_ATTEMPTS`; no session created (AC-137) |
| Any further attempt for that email inside the window, wrong password | 429 `TOO_MANY_ATTEMPTS` (AC-138) |
| Further attempt with the correct password during the lock | 429 `TOO_MANY_ATTEMPTS`, no session row (AC-138) |
| Attempt for another email during the lock | evaluated normally: 200 on success, 401 on failure (AC-139) |
| A successful login before the lock, then failures again | the count restarted; the 10th new failure is the first lock (AC-139) |
| First attempt after `anchor + 15 min` | evaluated normally; a new failure anchors a fresh window (AC-138) |
| 1,000-event list measurement | p95 < 500 ms recorded (AC-140) |
| NFR-09 checklist on the new screens | all states recorded per screen (AC-141) |
| Unexpected failure | 500 `INTERNAL_ERROR`, no stack trace |

## 5. Permissions

| Operation | Anon | Participant | Organizer | Notes |
|---|---|---|---|---|
| `POST /api/auth/login` under the limit | 401 on failure / 200 on success | same | same | unchanged from F-01 |
| `POST /api/auth/login` while that email is locked | 429 `TOO_MANY_ATTEMPTS` | 429 | 429 | per email; no session is created |

The limit is anonymous by design (pre-login), keyed by the submitted email; it adds no new role surface.

## 6. UI behavior

| Screen | Route | Behavior |
|---|---|---|
| Sign in | `/login` | A 429 shows the API `error.message` in the existing error area (role="alert"), with the password field kept as the Lab 6 fix (#155) requires; the form stays usable for another email. |

Proposed `error.message` values (pending the shared SDS review in the PR):

| Code | Proposed message (pending review) |
|---|---|
| `TOO_MANY_ATTEMPTS` | "Too many attempts. Try again in 15 minutes." |

## 7. API

### `POST /api/auth/login` (F-01 endpoint; F-13 limit)
- Unchanged request shape; unchanged 200/401/400 behavior below the limit.
- New 429 response: `{ "error": { "code": "TOO_MANY_ATTEMPTS", "message": "..." } }`; no session cookie is set.
- New code for system SDS 4.2: 429 `TOO_MANY_ATTEMPTS`.

### Measurement script
- `npm run bench` (green commit adds the script, the workspace entry and the README command row, per AGENTS). It runs against a disposable database seeded with 1,000 events, prints total, mean, p50, p95 and max of the 200 measured requests, and exits non-zero when p95 >= 500 ms.

No other endpoint changes.

## 8. Data

- No new table or column. The counter is held in the login service process (section 2.2); restarts clear it (recorded limitation).
- The bench script creates its own disposable database state; production is never touched (D-20, D-28).

## 9. Dependencies on other contracts

- F-01: the login route and the session creation it guards.
- F-10/F-11/F-12: the screens the NFR-09 checklist covers.
- F-03: the measured list endpoint (`GET /api/events`) owns its query; the benchmark only measures it.
- D-39: the `e2e` CI job remains the regression guard; F-13 adds no workflow change.

## 10. Acceptance criteria

- **AC-137** With a fixed service time, 10 failed logins for one email inside the 15-minute window each return 401 `UNAUTHENTICATED`, and the 11th attempt for that email returns 429 `TOO_MANY_ATTEMPTS`; no session exists for the locked attempts.
- **AC-138** During the lock, an attempt with the correct password returns 429 and creates no session; at `anchor + 15 min + 1 ms` a login for that email is evaluated normally again, and a new failure anchors a fresh window.
- **AC-139** A successful login before the lock resets that email's count (9 failures, success, then 10 failures each return 401; only the next attempt gets 429); another email's attempts are never affected by the lock.
- **AC-140** The committed measurement run on 1,000 seeded events (20 warm-up, 200 measured requests at concurrency 10) records p95 < 500 ms with the script output in the evidence.
- **AC-141** The NFR-09 checklist over the new screens (My events controls, Event registrations Check-in column, Attendance, Summary) records loading, empty and error behavior per screen, and every gap found is either fixed or recorded as a limitation.

## 11. Software test specification (STS)

API tests use Vitest and Supertest with `DATABASE_URL_TEST`; time is injected through the service/route seam (D-12) so the 15-minute window is tested without waiting. Fixtures: two accounts with known emails; bcrypt cost is the test fixture's (D-14). Every 429 test asserts the shared envelope and that no session row was created.

| TEST | AC | Level | Inputs and preconditions | Expected result |
|---|---|---|---|---|
| TEST-137 | AC-137 | API + DB | fixed `now`; 11 logins for one email with a wrong password | attempts 1 to 10: 401; attempt 11: 429 `TOO_MANY_ATTEMPTS`; no new session rows for that email after the lock starts |
| TEST-138 | AC-138 | API + DB | continue TEST-137: a correct-password attempt, a malformed body, and an attempt for a second email; then one attempt at `anchor + 15 min + 1 ms` | correct password: 429, no session; malformed: 429; second email: evaluated normally; after the window: normal evaluation (200/401 as the password decides) |
| TEST-139 | AC-139 | API + DB | 9 failures, a successful login, then 10 failures, then one more | the 10 failures after the reset: 401; the next attempt: 429; the second email's attempts run normally throughout |
| TEST-140 | AC-140 | Measurement script | `npm run bench` on a disposable database with 1,000 seeded events | recorded output with p95 < 500 ms; non-zero exit if the rule fails (added in the green commit; a procedure, not red — it measures, it does not gate behavior) |
| TEST-141 | AC-141 | Manual QA | the checklist of section 2.4 over the new screens | recorded per-screen results; gaps fixed or recorded as limitations (manual, like the Sprint 1 NFR-09 run) |

Red: TEST-137, TEST-138's during-lock cases and TEST-139 are committed alone on the F-13 red branch and run before the implementation: the login route currently has no limit, so the 429 assertions fail against 401/200, never on a compile, import or fixture error. TEST-140 and TEST-141 are procedures added with the implementation, disclosed here.

## 12. Definition of Done (F-13)

- This contract reviewed by B and merged (with the S3-01 round) before any F-13 red commit (#206).
- Red PR reviewed and approved by B with the failing output recorded on the red commit; the green commit adds the limit, the `TOO_MANY_ATTEMPTS` envelope row in the shared SDS, the bench script with its README command row, and the checklist results.
- All AC-137 to AC-141 pass (TEST-140 with its recorded run; TEST-141 with the recorded checklist); full `npm test` and `npm run test:e2e` pass with counts and the tested commit recorded.
- The readiness notes record the restart-clears-locks limitation next to D-38's known limitation.
- Traceability rows for NFR-05 and NFR-09 filled with the actual result.
- For Deliverable 2, F-13 is a contract only and is reported as planned in the Sprint 3 remaining-work table.

## 13. Version history

| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-28 | First F-13 contract (#206): D-38 login rate limit (per-email 15-minute window, 429 `TOO_MANY_ATTEMPTS`), NFR-05 measurement procedure, NFR-09 checklist for the new screens; AC-137 to AC-141, TEST-137 to TEST-141; the procedure cases disclosed | A (songt888) | Pending B (stickkersz) |
| 1.1 | 2026-11-28 | B's review: the lock starts after 10 failures (the 10th failure itself is a 401; the 11th attempt is the first 429), per D-38's wording; TEST-139 is red like TEST-137 (its 429 assertion fails before the implementation); system SDS 2.4 and the FR-01 traceability row added | A (songt888) | B (stickkersz) on #234 |
