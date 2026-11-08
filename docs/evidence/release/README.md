# Release evidence for Sprint 1 (Issue 10.1, #41)

All runs on commit `12dcd3c` (the release merge into `main`, agreed for tag `v0.1.0-sprint1` on [Issue #44](https://github.com/songt888/event-registration-system/issues/44)), in a clean checkout with `npm ci`, 2026-11-08 13:45 to 13:50 (Asia/Bangkok), Node 24.19, PostgreSQL 16 in Docker, Playwright 1.65 headless Chromium. Data is the synthetic seed only.

## 1. Commands and counts

| Command | Result | Output |
|---|---|---|
| `npm run build` | passed (server `prisma generate && tsc`, client `tsc -b && vite build`) | [logs/build.txt](logs/build.txt) |
| `npm test` | 12 files, 67 tests: 67 passed, 0 failed, 0 skipped | [logs/test.txt](logs/test.txt) |
| `npm run test:e2e` | 5 tests: 5 passed, 0 failed, 0 skipped | [logs/e2e.txt](logs/e2e.txt) |
| `npm test -w server -- -t "TEST-15\|TEST-37"`, 5 runs | each run 2 passed; 65 not selected by the name filter | [logs/concurrency.txt](logs/concurrency.txt) |
| `npx playwright test -c docs/evidence/release/capture.config.ts` | 8 passed: 3 demo scenarios, 5 NFR-09 screens | screenshots below, [demo/api-evidence.json](demo/api-evidence.json), [nfr-09/results.json](nfr-09/results.json) |

Automated: every row above. Each screenshot is taken only after the script asserted its expected text; a sample (1-4, 2-1, 3-3, `nfr-09/event-detail-error`) was also checked by eye before commit. Local file paths in the logs are replaced by `<release checkout>`.

## 2. Part F2 demo scenarios

The capture script ([capture.spec.ts](capture.spec.ts), config [capture.config.ts](capture.config.ts)) resets and seeds the E2E database like `npm run test:e2e` (D-14), starts the server and client, and asserts every expected result below before it saves a screenshot. API calls go through the signed-in browser session; the JSON file records request, expected and actual status and body (no cookies or passwords).

### Scenario 1: golden journey and persisted retrieval

| Item | Content |
|---|---|
| IDs | AC-22/TEST-22, AC-17/TEST-17, AC-19/TEST-19; FR-04, FR-06, FR-07, FR-08 |
| Roles | organizer1 (ORGANIZER), participant1 (PARTICIPANT) |
| Start condition | Seeded database; no event called "Demo: design review" |
| Steps | Organizer creates the DRAFT (capacity 3, a week ahead) and publishes it; participant registers on the event page; participant opens My registrations and reloads the page; organizer opens the event's registrations |
| Expected | PUBLISHED in My events; "You are registered" and 2 of 3 places left; after reload the registration is still ACTIVE (read back from the database); organizer sees Participant One with email and ACTIVE |
| Actual | as expected: [1-1](demo/1-1-organizer-published.png), [1-2](demo/1-2-participant-registered.png), [1-3](demo/1-3-my-registrations-after-reload.png), [1-4](demo/1-4-organizer-sees-registrant.png); `GET /api/registrations/mine` 200 including the event |

### Scenario 2: rule rejection (full event and duplicate)

| Item | Content |
|---|---|
| IDs | AC-23/TEST-23, AC-13/TEST-13, AC-14/TEST-14; FR-06, BR-02, BR-03 |
| Roles | participant2, participant3 (PARTICIPANT) |
| Start condition | Seed: "Career talk (small room)", capacity 2, one ACTIVE registration (participant1) |
| Steps | participant2 takes the last place; participant3 clicks Register; participant3 opens My registrations; then by API participant3 registers again and participant2 registers a second time |
| Expected | participant3 sees "This event has no places left." and has no registrations; API 409 EVENT_FULL and 409 ALREADY_REGISTERED; remaining places 0, never below |
| Actual | as expected: [2-1](demo/2-1-full-event-rejected.png), [2-2](demo/2-2-my-registrations-unchanged.png); API 409 EVENT_FULL, 409 ALREADY_REGISTERED, `remainingPlaces` 0 of capacity 2 |

### Scenario 3: login, logout and forbidden

| Item | Content |
|---|---|
| IDs | AC-24/TEST-24, AC-04/TEST-04, AC-21/TEST-21, AC-20/TEST-20, AC-16/TEST-16, AC-18/TEST-18; FR-01, FR-02, FR-03, BR-05, NFR-03 |
| Roles | participant1, participant2 (PARTICIPANT), organizer2 (ORGANIZER, does not own the seed events of organizer1) |
| Start condition | Seeded database after scenarios 1 and 2 |
| Steps | Open the login page; sign in as participant1; open an organizer registrations page by URL; log out and open a protected page; replay the old session cookie on `GET /api/me`; organizer2 opens organizer1's event registrations and tries to register; participant2 asks for participant1's registration by ID |
| Expected | header "Participant One (Participant)"; participant gets "You do not have access to this" and API 403; after logout the protected page opens login and the old cookie gets 401; organizer2 gets 403 on the list and 403 on register; participant2 gets 404 |
| Actual | as expected: [3-1](demo/3-1-login.png), [3-2](demo/3-2-signed-in-participant.png), [3-3](demo/3-3-participant-forbidden.png), [3-4](demo/3-4-after-logout-protected-page.png), [3-5](demo/3-5-other-organizer-forbidden.png); API 403 FORBIDDEN (AC-21), 401 UNAUTHENTICATED (AC-04), 403 FORBIDDEN (AC-20), 403 FORBIDDEN (AC-16), 404 NOT_FOUND (AC-18) |

## 3. NFR-09 rerun on the final UI

Same 14 checks as the first run on `827f874` ([ac-test-results.md](../ac-test-results.md) section 3.1), now on the Y2K UI after PRs #76, #77 and #81. Each state is forced on one API call in a fresh page: **loading** never answers the call, **empty** returns the real response with its list emptied, **error** returns 500 `INTERNAL_ERROR` "Something went wrong. Please try again." The script also checks that the window buttons do not cover the message (the PR #81 fix).

| Screen | Role | Loading | Empty | Error |
|---|---|---|---|---|
| Events list `/events` | participant | pass: "Loading events..." | pass: "No published events yet" | pass: message in an alert |
| Event detail `/events/:id` | participant | pass: "Loading event..." | not applicable (one record) | pass: message in an alert |
| My registrations `/my/registrations` | participant | pass: "Loading..." | pass: "You have no registrations yet." | pass: message in an alert |
| My events `/organizer/events` | organizer | pass: "Loading..." | pass: "No events yet" | pass: message in an alert, plus "Try again" |
| Event registrations `/organizer/events/:id/registrations` | organizer | pass: "Loading..." | pass: "No registrations yet." | pass: message in an alert |

Result: 14 of 14 pass; window buttons clear of the message in 14 of 14. Screenshots: [nfr-09/](nfr-09/).

## 4. Not covered

- Screenshots are at 1280 x 800 only; the 375 px layout is shown in [../ui/](../ui/).
- The decorative 3D layer is skipped in headless Chromium (software WebGL, D-16), so the screenshots show the CSS sky.
- No automated test makes the server itself fail with a 500; the error state above is forced in the browser (traceability section 6, open row).
- NFR-06 deployed check is Lab 5.
