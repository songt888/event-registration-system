# E7-B5: post-deployment checks on production (L7-05 #137)

- Version: tag `v0.2.0-lab7`, `861f01f`, Cloud Run revision `s47a6b53b-00007-mkk`, https://s47a6b53b-4d7hbszvwq-as.a.run.app
- When: 2026-11-27 13:32 to 13:35 UTC+7
- Who and how: A signed in by hand in the built-in browser pane of the Claude desktop app (password typed by A, not in any file). Claude Code sent the requests below with `fetch` from the signed-in page (same origin, the app's own session cookie) and saved the raw status and JSON. AI-executed requests on A's sign-in.
- Data: synthetic events with unique titles, created through the app's API and left in place (D-28; production is never reset, D-20). Accounts by label only: Organizer One, Participant One.

## 1. Setup as Organizer One (ORGANIZER)

`POST /api/events` then `POST /api/events/:id/publish`, capacity 5, location "Synthetic Hall".

| Title | Event ID | startsAt (UTC) | UTC+7 | Create | Publish |
|---|---|---|---|---|---|
| L7-KK-1332-base | `e7f150a6-c454-4ef5-9aa2-1edf48a093c5` | 2026-12-10T03:00:00.000Z | 10:00 | 201 | 200, PUBLISHED |
| L7-KK-1332-plus119 | `d7a792e6-96ff-451e-9066-48030a4e269c` | 2026-12-10T04:59:00.000Z | 11:59 (base + 119 min) | 201 | 200, PUBLISHED |
| L7-KK-1332-plus120 | `8f6ffff2-3beb-4434-b430-76e461053dfe` | 2026-12-10T05:00:00.000Z | 12:00 (base + 120 min) | 201 | 200, PUBLISHED |

## 2. Checks as Participant One (PARTICIPANT, `5cd19e08-2138-4d51-9468-7494a8ca0fc3`)

| # | Request (06:34:57 UTC) | Expected | Status | Body | Result |
|---|---|---|---|---|---|
| 1 | `POST /api/events/<base>/registrations` | registered | 201 | registration `3cae37d2-…` ACTIVE, `remainingPlaces` 4 | PASS |
| 2 | `POST /api/events/<plus119>/registrations` (119 min after #1) | BR-10 refuses | 409 | `{"error":{"code":"TIME_CONFLICT","message":"You are already registered for another event that starts within 2 hours of this one."}}` | **PASS (changed behavior)** |
| 3 | `POST /api/events/<plus120>/registrations` (exactly 120 min) | registered | 201 | registration `0fda3cef-…` ACTIVE, `remainingPlaces` 4 | **PASS (changed behavior, boundary)** |
| 4 | `POST /api/events/<plus120>/registrations` again | Sprint 1 duplicate rule | 409 | `{"error":{"code":"ALREADY_REGISTERED","message":"You are already registered for this event."}}` | PASS (preserved) |
| 5 | `GET /api/events/<base>/registrations` (Organizer One's list) | refused | 403 | `{"error":{"code":"FORBIDDEN","message":"You do not have access to this."}}` | PASS (preserved) |

After the checks, `GET /api/registrations/mine` lists only L7-KK-1332-base and L7-KK-1332-plus120 (both ACTIVE); plus119 has no registration. The **My registrations** page shows the same two rows (10 Dec 2026 10:00 and 12:00, Synthetic Hall, ACTIVE).

## Not covered

- The full-event path (capacity) was not run on production; the duplicate rule was used as the preserved Sprint 1 path, as the Lab 7 plan allows. Capacity is covered by the release suite (TEST-13, TEST-15 in `npm test`, 73 passed on `a6439d7`).
- The TIME_CONFLICT alert in the UI was not clicked on production; TEST-61 (E2E) covers it on the release tree.
