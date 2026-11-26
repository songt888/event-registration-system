# F-01 — Authentication Contract

Sprint 1 / Deliverable 1, Issue #17 (parent #2). Author: A (`songt888`). Teammate reviewer: B (`stickkersz`). This contract specifies planned behavior; it records no executed application test or completed implementation.

## 1. Scope and sources

Covers FR-01, FR-02, FR-03 and NFR-01, NFR-02, NFR-03, NFR-07. Establishes the authentication/role guards used by BR-01 and BR-05 in other features; their record-ownership rules remain in their own contracts. Decisions D-08, D-09, D-11, D-13 and D-14 apply.

Sources: [SRS](../../srs.md), [system SDS](../../system-sds.md) sections 4–6, [decisions](../../decisions.md), [traceability](../../traceability.md), [master plan](../../../deliverable1-plan.md) section 5 and [team workflow](../../team-workflow.md).

Included: seeded-account login, current user, logout, absolute session expiry, backend session/role middleware and login/header UI. No event or registration data changes. Excluded: self-registration, password recovery, multiple roles, JWT, login rate limiting (planned F-13 hardening), and new account-management screens.

## 2. Behavior and workflow

1. Visitor opens `/login` and submits email/password. The API validates the request, looks up the lowercased email and compares the password with bcrypt. Unknown email still performs comparison against a fixed dummy bcrypt hash. Unknown email and wrong password return the same generic error.
2. Valid credentials generate a fresh opaque token from 32 random bytes, base64url encoded. Store only SHA-256(token) in a new Session row with the user ID and creation time; expiry is exactly creation + 60 minutes. Return public user fields and set the cookie. Login never accepts a caller-selected user ID or role.
3. Protected requests use `requireSession`: hash the cookie, load its Session and User, reject missing/invalid/revoked tokens and `expiresAt <= now` with 401. Delete a found expired row. Successful requests use server-loaded identity/role. Activity does not extend expiry.
4. `GET /api/me` returns that user's ID, name and role. The UI uses it after reload to restore the signed-in header; it does not persist the token or authoritative role in browser storage.
5. `requireRole` runs after `requireSession`, before resource existence/ownership checks. Wrong role returns 403 for every target ID. Feature services enforce their own role/ownership rules using that caller, following D-13.
6. Logout deletes the current Session row, clears the cookie with matching path/security attributes, and returns no body. Replaying the old cookie immediately fails. It revokes this session, not every session belonging to the account.

A new login creates a distinct session; it does not reuse a caller-supplied token. No additional session-list or revoke-all operation is introduced.

## 3. API and validation

All responses exclude passwords, `passwordHash`, token hashes and session tokens from JSON. The cookie is the only token transport. State-changing requests use JSON and reject other content types with 400. Unknown body fields are rejected. Malformed JSON, non-object bodies and invalid fields return 400 `VALIDATION_ERROR` before credentials are checked; no Session is created. Do not trim or lowercase the password.

| Method/path | Request | Success | Failure |
|---|---|---|---|
| `POST /api/auth/login` | JSON `{ "email": "participant1@example.com", "password": "<synthetic seed password>" }`; email must be a syntactically valid nonempty string, password a nonempty string; email lowercased for lookup | 200 `{ "user": { "id": "<uuid>", "name": "<name>", "role": "PARTICIPANT" } }`, or ORGANIZER; sets `sid` | 400 `VALIDATION_ERROR`; 401 `INVALID_CREDENTIALS` |
| `GET /api/me` | No body; valid `sid` cookie | 200 `{ "id": "<uuid>", "name": "<name>", "role": "PARTICIPANT" }`, or ORGANIZER | 401 `UNAUTHENTICATED` |
| `POST /api/auth/logout` | JSON `{}` and valid `sid` cookie | 204, empty body; deletes Session and expires cookie | 401 `UNAUTHENTICATED` without valid session; 400 for invalid JSON/body/content type after session check |

Login is public. `/api/me` and logout allow either account role after authentication. Protected-route authentication precedes role, validation and resource handling; this preserves 401 → 403 → existence/ownership ordering. Login's request validation has no session prerequisite.

Errors use `{ "error": { "code": "...", "message": "..." } }`. Validation adds only `error.details: [{ "field": "email", "message": "..." }]` as applicable. Invalid credentials use the exact same message `Email or password is incorrect.` for both causes. Missing/invalid/expired/revoked session uses `UNAUTHENTICATED`; wrong role uses `FORBIDDEN`. Unexpected failures return 500 `INTERNAL_ERROR` and a generic message, with no stack trace or private fields; credentials, cookies and tokens are never logged.

Cookie: `sid`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=3600`, `Secure` when `COOKIE_SECURE=true` (production). Expiry is also enforced on the server, regardless of browser cookie retention. Clear the cookie with Max-Age=0 on successful logout. Development uses the same-origin Vite proxy; production serves UI/API from one origin. Do not enable cross-origin requests. The JSON-only POST and SameSite policy follow the SDS CSRF stance; a separate CSRF token is not added in S1.

## 4. Data and migration contract

| Entity | Required fields/constraints | Change owned by |
|---|---|---|
| User | UUID id, unique lowercase email, name, bcrypt passwordHash (cost 12, baseline minimum 10), one role enum PARTICIPANT/ORGANIZER, createdAt | Foundation #24 migration/seed; F-01 reads only |
| Session | UUID id, unique tokenHash, userId FK to User (cascade deletion), expiresAt, createdAt; expiresAt index | Foundation #24 schema/migration; F-01 creates, reads and deletes rows |

Use PostgreSQL persistence and Prisma as specified in the SDS. No schema duplication in Issue #4 if foundation satisfies this contract. Seed only synthetic accounts; obtain seed passwords from `SEED_PASSWORD`, never commit a real password. F-01 makes no Event/Registration schema change. Config: SESSION_TTL_MINUTES=60, COOKIE_SECURE=false locally/true in production; DB configuration follows foundation. No plaintext token is stored in the database.

## 5. UI contract

| State/action | Observable behavior |
|---|---|
| Login form | Labelled email and password fields; password masked; submit button; no self-registration/reset links promising unavailable features |
| Submitting | Disable submit and show a pending indication until completion; do not send twice from a repeated click |
| Validation/error | Show field validation and readable generic credential/API/network error; retain email (and the typed password after a 400 validation error; it is cleared after 401, AC-70 in F-02), keep the password out of logs; allow retry. A field with an error is marked invalid and tied to its error text (AC-64, defined in F-02 for the Sign in and Create event forms) |
| Success | Navigate to `/events`; header shows name/role returned by `/api/me`; participant and organizer links follow SDS navigation |
| Session bootstrap | Show loading while `/api/me` is pending; 401 clears local user display and opens `/login`; other failures show a readable retryable error. A 401 from any later API call also clears the displayed user, so a session revoked in another tab opens `/login` and it stays there (AC-56) |
| Logout | Wait for confirmed API success, clear displayed user, navigate to `/login`; an API/network failure is shown and must not be presented as successful server revocation |
| Protected navigation | Missing/expired/revoked session redirects to `/login`; wrong-role page shows the readable 403 message. UI hiding never substitutes for API guards |
| Window shell (D-15) | Each page window takes its title from the page `h1`; the Not found page has the title "Not found", so its window buttons name it (AC-68). Below 640 px the minimized window's Restore button stays inside the screen, shortening its visible title with an ellipsis while its accessible name keeps the full title (AC-67). The page always keeps free space under its content as tall as the taskbar, so the taskbar never covers a page control at any width; from 641 px the taskbar is one row, with Logout on the same row as the page links (AC-72) |

Empty-list states are no change in F-01; they belong to the five data-loading screens in their respective features. AC-24/TEST-24 covers the later end-to-end UI journey (#37), without replacing the API tests here.

## 6. Acceptance criteria

Existing AC-01..05 and AC-24 retain their original meaning. Additional IDs close explicit traceability gaps; AC-37/TEST-37 belong to B's F-04 NFR-04 scenario; AC-38/TEST-38 are already reserved by B's F-03 branch. Neither pair is defined here. The new IDs are proposed in this first contract for teammate review before implementation.

| ID | Observable outcome | Requirements |
|---|---|---|
| AC-01 | For either seeded role, valid credentials return 200 and public user fields, create a matching hashed Session with 60-minute absolute expiry and set the specified cookie; no sensitive JSON fields | FR-01; NFR-02 |
| AC-02 | Wrong password and unknown syntactically valid email return identical 401 INVALID_CREDENTIALS code/message; no Session created | FR-01; NFR-07 |
| AC-03 | GET /api/me without a cookie returns 401 UNAUTHENTICATED and no private data | FR-03; NFR-01 |
| AC-04 | Authenticated logout returns 204, deletes that Session and clears cookie; replaying the old cookie on /api/me returns 401 | FR-02; NFR-01 |
| AC-05 | Synthetic seeded passwords are bcrypt hashes with cost at least 10 (configured 12), verify against the seed password and are never plaintext | NFR-02 |
| AC-39 | Valid-session GET /api/me returns exactly the caller's id, name and role for either role; no email, password/hash, token/hash or another user's fields | FR-03; NFR-02 |
| AC-40 | Unknown/revoked or expired session is rejected with 401; expiry equality counts as expired and the found expired row is removed; successful activity before expiry does not extend it | NFR-01; D-08 |
| AC-41 | Invalid login request cases return 400 VALIDATION_ERROR with the safe error shape and no new Session; valid-shaped invalid credentials still use AC-02 | NFR-07 |
| AC-42 | Shared guards reject anonymous callers with 401 before role handling; valid-session wrong role gets 403 before target lookup; client-supplied identity/role cannot authorize a request | NFR-01, NFR-03; BR-01/BR-05 foundation |
| AC-24 | UI login shows name/role; logout followed by protected navigation returns to login | FR-01, FR-02, FR-03; cross-feature E2E |
| AC-56 | With two tabs of one signed-in participant, after Logout in the second tab, protected navigation in the first tab shows the Sign in page, which stays; the header no longer shows the user, and the browser does not repeat the refused (401) requests | FR-02, FR-03; NFR-01; Lab 6 defect #142 (L6-09) |
| AC-67 | At 320 px wide, after Minimize, the taskbar's Restore button is fully inside the viewport, its accessible name is `Restore window: <page title>`, and pressing Enter on it restores the window | D-15; NFR-09 UI; Lab 6 enhancement #147 (L6-15) |
| AC-72 | At 320 x 568, 375 x 667, 768 x 1024 and 812 x 375, for an organizer on Create event and a participant on Events, scrolled to the end, the lowest page content (for the organizer: Save draft) is above the taskbar; at 768 and 812 px Logout is on the same taskbar row as Events | D-15; NFR-09 UI; Lab 6 enhancement #151 (L6-20 #177) |
| AC-68 | An unknown path shows "Not found" as the window title; after Minimize the Restore button is named `Restore window: Not found`, both on a first load and after another page | D-15; system SDS 3.2; Lab 6 enhancement #148 (L6-16) |

## 7. Software Test Specification (planned)

All API/DB tests use DATABASE_URL_TEST, with sequential integration files and truncation before each test (D-14). Never reset the dev database. Use a fixed `now` for service expiry boundaries; real API expiry tests may insert expired Session fixtures. TEST-24 runs separately against DATABASE_URL_E2E, reset/seeded before its run. Names contain TEST and AC IDs. Every result below is **not run: implementation/test runner pending Issues #3/#4**.

| TEST / AC | Level | Preconditions | Action | Expected result |
|---|---|---|---|---|
| TEST-01 / AC-01 | API + DB | Synthetic participant and organizer with bcrypt hashes; empty Session table | Login once per role with correct credentials | 200 correct public user; cookie flags (Secure false/true config cases); 32-byte token decoded; DB contains only its SHA-256 hash, correct user FK and expiry = creation + 60 min; no sensitive JSON fields |
| TEST-02 / AC-02 | API + DB | Known account and an absent email; Session count recorded | Send wrong password and unknown-email requests | Same 401 code/message, no sensitive fields/stack and unchanged Session count; inspect service/dummy-hash path, do not claim a timing benchmark |
| TEST-03 / AC-03 | API | No session cookie | GET /api/me | 401 UNAUTHENTICATED, uniform error, no private data |
| TEST-04 / AC-04 | API + DB | Logged-in account; capture cookie and Session ID | POST logout with {}, inspect DB/cookie, replay captured cookie on /api/me | 204 empty body, Session absent, sid expires at matching path, replay gets 401; another independently created session remains valid |
| TEST-05 / AC-05 | DB + hash verification | Run synthetic seed with test-only password from environment | Inspect User hashes and bcrypt-compare test password | All hashes use bcrypt cost >=10 (seed config 12), compare succeeds, no stored plaintext password |
| TEST-39 / AC-39 | API + DB | Valid sessions for two distinct users, covering both roles | GET /api/me with each cookie | Exactly id/name/role of corresponding user; sensitive fields and other user's data absent |
| TEST-40 / AC-40 | Service unit + API/DB | Fixed now; sessions expiring before, exactly at, and after now; unknown/revoked token | Call guard and /api/me; make successful request before expiry then inspect expiry | Before/equal expiry rejected and found expired rows deleted; unknown/revoked rejected; future expiry succeeds and timestamp unchanged |
| TEST-41 / AC-41 | API + DB | Session count recorded | Parameterize missing fields, empty/non-string fields, invalid email, extra userId/role, array/null body, malformed JSON and non-JSON Content-Type | 400 VALIDATION_ERROR with safe shape; field details where applicable; no Session created; no stack/password reflected |
| TEST-42 / AC-42 | Middleware unit + API integration | Guard test harness with a target-handler spy; no session, valid PARTICIPANT and ORGANIZER sessions | Call protected role-specific harness with missing/wrong/correct role; attempt identity override; use several target IDs | 401 before role/handler, 403 for wrong role regardless of ID, handler not reached on denial; correct role uses session identity only. Real endpoint matrices also required in F-02..F-06 contracts |
| TEST-56 / AC-56 | E2E (Playwright), L6-09 #156 | Own E2E database seeded; one browser context, two pages signed in as the same participant | In page 2 press Logout; in page 1 click My registrations; count `/api/` requests that return 401 in page 1 over the next 3 seconds | Page 1 shows the Sign in form and still shows it after 3 seconds; header shows no user name; no `/api/` request returns 401 in page 1 during those 3 seconds after the Sign in form appears (no repeated requests). The 401s before it are not counted: the E2E client runs in dev mode, where React StrictMode sends each page's first request twice. Red on `04e8590`, where the tab returns to `/events` and repeats `GET /api/events` |
| TEST-67 / AC-67 | E2E (Playwright), L6-15 #164 | Own E2E database seeded; viewport 320 x 568; participant signed in | Open My registrations, press Minimize, read the Restore button's box and name, focus it and press Enter | Button right edge at most 320 px; name `Restore window: My registrations`; after Enter the Minimize button is visible again. Red on `04e8590`, where the button ends 79 px past the edge |
| TEST-72 / AC-72 | E2E (Playwright), L6-20 #177 | Own E2E database seeded; Organizer One and Participant One | At each of the four viewports: sign in, open Create event (organizer) or Events (participant), scroll to the end and read the taskbar top, the lowest page content and the tops of Logout and Events (measured again until stable, up to 3 s, because the taskbar can grow after first paint) | Lowest page content at or above the taskbar top in all eight cases; at 768 and 812 px Logout and Events tops within 8 px. Red on the unfixed client: 320 px both roles and 375 px participant covered by 18 to 23 px; Logout 41 px lower at 768 px (both roles) and 812 px (participant) |
| TEST-68 / AC-68 | E2E (Playwright), L6-16 #165 | Own E2E database seeded; participant signed in | (a) Open `/no-such-page` directly, press Minimize, read the Restore button name; (b) open Events, then go to `/no-such-page` inside the app, press Minimize, read the name | "Not found" is the page heading in both; the name is `Restore window: Not found` in both. Red on `04e8590`, where (a) gives `Restore window: ` and (b) `Restore window: Events` |
| TEST-24 / AC-24 | E2E, later #37 | Own E2E database seeded; browser signed out | Login each role, check header, logout, open protected page | Name/role correct; successful logout then protected page opens login; retain command/commit/output when actually implemented |

TEST-04 also parameterizes logout with a valid session and malformed JSON, non-object/nonempty body or non-JSON content type: expect 400 VALIDATION_ERROR, no cookie clearing and no Session deletion; the same session must still access /api/me. TEST-40 additionally calls logout with no, unknown, expired and revoked cookie, including malformed bodies: expect 401 before body validation, no private data and no deletion of another valid session (found expired-row cleanup remains required).

For every error assertion, check code, JSON envelope, no stack/private fields and no unintended persistence. Service inspection complements, but does not replace, API/DB behavioral checks. Do not expose test-harness routes in production. Each feature contract must enumerate no/invalid/expired/revoked-session and role/ownership cases for its real protected endpoints; this middleware harness alone does not prove the full route matrix.

## 8. Product Definition of Done

Use the shared [Sprint 1 Definition of Done](definition-of-done.md). Contract preparation does not complete those product/release gates.

## 9. Contract version history

| Version | Date | Scope/change and reason | Status/review |
|---|---|---|---|
| F-01 1.0 | 2026-11-07 | Initial #17 contract from merged baseline. Retains AC/TEST-01..05 and 24; proposes AC/TEST-39..42 for authenticated /me, expiry, input validation and shared guards, closing traceability gaps without renumbering or defining F-04's 37 | Prepared by A with Codex/document_writer assistance; pending genuine B review and merge |
| F-01 1.1 | 2026-11-26 | Lab 6 UAT: AC-56/TEST-56 for defect #142 (a 401 from any API call clears the displayed user; session bootstrap row extended); the Validation/error row points to AC-64 in F-02 for enhancement #145. Contract committed before the RED tests (L6-09 #156, L6-12 #159) | Prepared by A with Claude Code assistance; review by B on the PR |
| F-01 1.2 | 2026-11-26 | TEST-56 counts refused requests only after the Sign in form appears: in the dev-mode E2E client React StrictMode sends each first request twice, so "at most one 401 per endpoint" would fail on correct code. Found while writing the RED test, before any test commit (L6-09 #156) | A with Claude Code; review by B on the fix PR |
| F-01 1.3 | 2026-11-26 | Lab 6 UAT: Window shell row in the UI contract; AC-67/TEST-67 (enhancement #147, Restore button inside a 320 px screen) and AC-68/TEST-68 (enhancement #148, the Not found page names its window). Committed before the RED tests (L6-15 #164, L6-16 #165) | Prepared by B with Claude Code assistance; review by A on the PR |
| F-01 1.4 | 2026-11-26 | Lab 6 UAT: the Validation/error row keeps the typed password after a 400 and points to AC-70 in F-02 for enhancement #155. Contract committed before the RED test (L6-18 #173) | A with Claude Code; review by B on the PR |
| F-01 1.5 | 2026-11-26 | Lab 6 UAT: Window shell row and AC-72/TEST-72 for enhancement #151 (the taskbar never covers the page; one taskbar row from 641 px). The decision for #151 changes from Sprint 3 to a fix in `v0.1.3-lab6`. Contract committed before the RED test (L6-20 #177) | Prepared by A with Claude Code assistance; review by B on the PR |

Later F-02..F-06 contracts keep their own version histories in their owned files. Record changes before implementation, with Issue/PR, reason, affected IDs and actual reviewer/merge state. Do not label a proposed contract or future test as approved/passed.
