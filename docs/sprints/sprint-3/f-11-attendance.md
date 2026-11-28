# F-11 Attendance record and report: engineering contract (Sprint 3)

Issue: #206 (S3-01, contract). Implementation: after Deliverable 2 (`deliverable2-plan.md` section 2 row "later (by 13 Dec)" and section 5: B, 5 Dec). Author: B (stickkersz). Reviewer: A (songt888).
Sources: `docs/srs.md` (FR-13, BR-05, NFR-01, NFR-03, NFR-06, NFR-07, NFR-09), `docs/features.md` (F-11), `docs/decisions.md` (D-13, D-14, D-20, D-34, D-36, D-37), `docs/system-sds.md` (sections 2.2, 3.2, 4, 5), the F-05/F-06, F-08 and F-10 contracts, and the ID proposal on #206 (F-11 uses AC/TEST-120 to 129; open until A answers).

## 1. Linked requirements
| ID | How F-11 covers it |
|---|---|
| FR-13 | Attendance is persisted as the F-10 `CheckIn` rows; the owning organizer retrieves an attendance report of one event with its counts. |
| BR-05 | Only the event's owner reads its attendance; a participant or another organizer is refused (D-13). |
| D-37 | Registered = ACTIVE registrations; checked in = ACTIVE registrations with a `CheckIn`; no-show = ACTIVE without `CheckIn` after the check-in window has ended (`now >= startsAt + 6 h`, D-36); before that they are "not yet checked in"; CANCELLED registrations are listed separately and never counted as no-show. |
| NFR-01 | The report route needs a valid session: 401 `UNAUTHENTICATED` otherwise. |
| NFR-03 | The owner is the session user; no parameter names a user. |
| NFR-06 | Check-ins and the report are the same after the application restarts without a database reset. |
| NFR-07 | The path is validated server-side; errors use the shared shape of system SDS 4.2. |
| NFR-09 | The Attendance screen shows loading, empty and error states (system SDS 3.2). |

## 2. Behavior and workflow
1. A signed-in organizer opens My events (`/organizer/events`) or Event registrations (`/organizer/events/:id/registrations`) and presses **Attendance**. This opens `/organizer/events/:id/attendance`.
2. The UI calls `GET /api/events/:id/attendance`. The route runs `requireSession` (401), `requireRole('ORGANIZER')` (403), then validates `:id` as a UUID (400).
3. The service loads the event, with the F-06 visibility rule as F-08 extends it: no event, or another organizer's DRAFT or CANCELLED event: 404 `EVENT_NOT_FOUND`; another organizer's PUBLISHED or CLOSED event: 403 `FORBIDDEN`.
4. For the owner, in one read, it loads the event's registrations with their `CheckIn` rows and builds the report:
   - `windowEnded` = `now >= startsAt + 6 h` (`now` is a parameter of the service function, D-12).
   - Each ACTIVE registration is an attendee with `attendance` `CHECKED_IN` (it has a `CheckIn`), `NO_SHOW` (no `CheckIn` and `windowEnded`), or `NOT_YET_CHECKED_IN` (no `CheckIn` and not `windowEnded`).
   - Each CANCELLED registration is in `cancelled`, with its `cancelledAt` and, if it was checked in before an event cancel (F-08), its `checkedInAt`. It is never counted as registered, checked in or no-show.
   - `counts`: `registered` = number of attendees; `checkedIn`, `notYetCheckedIn`, `noShow` = attendees with that value (so `checkedIn + notYetCheckedIn + noShow = registered`); `cancelled` = number of CANCELLED registrations.
5. The route only reads; nothing is stored or changed. Attendance is stored only by F-10.

## 3. Validation
- Path `:id`: UUID; otherwise 400 `VALIDATION_ERROR`, after the session and role guards and before any query.
- `GET` with no body and no query parameter. No route reads a user ID or a time from the request (NFR-03).

## 4. Failure and boundary cases
| Case | Result |
|---|---|
| No, unknown, expired or revoked session | 401 `UNAUTHENTICATED`, no attendance data (AC-124) |
| Caller is a participant, any event ID | 403 `FORBIDDEN`, no attendance data (AC-123) |
| Another organizer's PUBLISHED or CLOSED event | 403 `FORBIDDEN` (AC-123) |
| Another organizer's DRAFT or CANCELLED event, or unknown UUID | 404 `EVENT_NOT_FOUND` (AC-123) |
| `:id` not a UUID | 400 `VALIDATION_ERROR` (AC-123) |
| Owner's event with no registrations (for example a DRAFT) | 200, all counts 0, empty lists; UI empty state (AC-127) |
| `now` one millisecond before `startsAt + 6 h` | unchecked ACTIVE rows are `NOT_YET_CHECKED_IN`, `noShow` 0 (AC-121) |
| `now = startsAt + 6 h` | unchecked ACTIVE rows are `NO_SHOW`, `notYetCheckedIn` 0 (AC-121) |
| Owner's CANCELLED event (all registrations CANCELLED, some checked in) | 200, `registered` 0, every row in `cancelled` with its `checkedInAt` where present (AC-122) |
| Unexpected failure | 500 `INTERNAL_ERROR`, no stack trace |

## 5. Permissions
| Operation | Anon | Participant | Organizer (owner) | Organizer (other) |
|---|---|---|---|---|
| `GET /api/events/:id/attendance` | 401 | 403 | allowed, any event status | 403 PUBLISHED/CLOSED, 404 DRAFT/CANCELLED/missing |

This is the F-06 roster rule as F-08 extends it. Identity and ownership come only from the session.

## 6. UI behavior
| Screen | Route | Behavior |
|---|---|---|
| My events (F-02 screen) | `/organizer/events` | Each row gets an **Attendance** link to `/organizer/events/:id/attendance`. |
| Event registrations (F-06 screen) | `/organizer/events/:id/registrations` | An **Attendance** link to the same page. |
| Attendance | `/organizer/events/:id/attendance` | Heading with the event title and start time in local time. A counts line: Registered, Checked in, Not yet checked in, No-show, Cancelled. Table "Attendees": participant name, email, attendance ("Checked in" with the time in local time, "Not yet checked in" or "No-show"). Table "Cancelled registrations": name, email, cancelled at, checked in at (if any). Loading: "Loading..." while the request is pending. Empty: "No registrations yet." when both lists are empty. Error: the API `error.message` in an alert; 401 redirects to `/login`; 403 shows "You do not have access to this"; 404 shows "Not found" (system SDS 3.2). A participant sees the 403 message for every event ID, as AC-69 does for Event registrations. |

The UI shows the counts the API returns; it never counts or filters itself.

## 7. API
### `GET /api/events/:id/attendance`
- Auth: session, role ORGANIZER, owner of the event.
- Request: path `:id` (UUID).
- Response 200:
```json
{
  "event": { "id": "3f1c2a9e-0000-4000-8000-000000000001", "title": "Intro to Git workshop", "startsAt": "2026-11-20T09:00:00.000Z", "status": "PUBLISHED" },
  "windowEnded": false,
  "counts": { "registered": 2, "checkedIn": 1, "notYetCheckedIn": 1, "noShow": 0, "cancelled": 1 },
  "attendees": [
    { "registrationId": "7a2d4c10-0000-4000-8000-000000000002", "participant": { "name": "Participant One", "email": "participant1@example.com" }, "attendance": "CHECKED_IN", "checkedInAt": "2026-11-20T08:40:00.000Z" },
    { "registrationId": "7a2d4c10-0000-4000-8000-000000000003", "participant": { "name": "Participant Two", "email": "participant2@example.com" }, "attendance": "NOT_YET_CHECKED_IN", "checkedInAt": null }
  ],
  "cancelled": [
    { "registrationId": "7a2d4c10-0000-4000-8000-000000000004", "participant": { "name": "Participant Three", "email": "participant3@example.com" }, "cancelledAt": "2026-11-18T10:00:00.000Z", "checkedInAt": null }
  ]
}
```
- Order: both lists by registration `createdAt` ascending, as the F-06 roster. `participant` has only `name` and `email`; never `passwordHash`, `checkedInById` or session data.
- Errors: 400 `VALIDATION_ERROR`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `EVENT_NOT_FOUND`; 500 `INTERNAL_ERROR`.

No new error code.

## 8. Data
- No new table or column: F-11 reads `Event`, `Registration` (`status`, `createdAt`, `cancelledAt`), `CheckIn` (`registrationId`, `checkedInAt`; F-10) and `User` (`name`, `email`).
- Attendance is the `CheckIn` rows; counts are computed on read, never stored, so they cannot drift from the rows (as `remainingPlaces`, system SDS 2.1).
- Nothing is migrated or deleted (D-20).

## 9. Dependencies on other contracts
- F-01: `requireSession`, `requireRole`, the error handler.
- F-02: My events, which gets the Attendance link.
- F-06: the visibility rule and the Event registrations screen, which gets the Attendance link.
- F-07 and F-08: the CANCELLED registration and `cancelledAt`; the CANCELLED and CLOSED event visibility.
- F-10: the `CheckIn` table and the window end `startsAt + 6 h` (D-36). F-11 starts after F-10 is merged.
- F-12 (A): uses the same D-37 counting across the organizer's events.

## 10. Acceptance criteria
- **AC-120** Before the window ends, the owner's report of an event with 3 ACTIVE registrations (one checked in) and 1 CANCELLED registration returns 200 with `windowEnded` false, counts registered 3, checkedIn 1, notYetCheckedIn 2, noShow 0, cancelled 1, the attendees with their `attendance` and `checkedInAt`, and the CANCELLED row only in `cancelled`.
- **AC-121** With a fixed service time, the same event gives `NOT_YET_CHECKED_IN` and noShow 0 at `now = startsAt + 6 h - 1 ms`, and `NO_SHOW` with noShow 2 and notYetCheckedIn 0 at `now = startsAt + 6 h`; checkedIn stays 1 and cancelled stays 1.
- **AC-122** After the owner cancels an event that had a checked-in registration (F-08), the report returns 200 with registered 0, checkedIn 0, noShow 0, and every registration in `cancelled`; the checked-in one keeps its `checkedInAt`.
- **AC-123** A participant gets 403 `FORBIDDEN` for any event ID; another organizer gets 403 `FORBIDDEN` for a PUBLISHED or CLOSED event and 404 `EVENT_NOT_FOUND` for a DRAFT, CANCELLED or unknown event; a non-UUID `:id` gets 400 `VALIDATION_ERROR`; no body contains attendance data.
- **AC-124** The route gives 401 `UNAUTHENTICATED` with no cookie, an unknown token, an expired session and a logged-out session, with no attendance data.
- **AC-125** Check-ins recorded through F-10 are returned unchanged after the application restarts without a database reset (NFR-06).
- **AC-126** In the UI the owner opens Attendance from My events and sees the counts and both tables as the API returns them; a participant opening the page sees "You do not have access to this".
- **AC-127** The owner's event with no registrations returns 200 with all counts 0 and empty lists, and the page shows "No registrations yet."

## 11. Software test specification (STS)
API tests use Vitest and Supertest on the real PostgreSQL test database (`DATABASE_URL_TEST`, D-14). Every error case asserts the status, the shared shape with `code` and `message` only (plus `details` for 400 `VALIDATION_ERROR`) and that the body has only `error`. Fixtures: organizers O and O2; participants P1 to P4; check-ins are made through the F-10 route or service, cancels through F-07 and F-08.

| TEST | AC | Level | Inputs and preconditions | Expected result |
|---|---|---|---|---|
| TEST-120 | AC-120 | API + DB | O's event at now + 30 min; P1, P2, P3 ACTIVE, P4 registered then cancelled; O checks in P1; O reads the report | 200 with the counts and lists of AC-120; P4 only in `cancelled`; `participant` has exactly `name` and `email` |
| TEST-121 | AC-121 | Service unit + DB | the TEST-120 data; the report service called with `now` = `startsAt + 6 h - 1 ms` and `startsAt + 6 h` | first: `windowEnded` false, P2, P3 `NOT_YET_CHECKED_IN`, noShow 0; second: `windowEnded` true, P2, P3 `NO_SHOW`, noShow 2, notYetCheckedIn 0; checkedIn 1, cancelled 1 both times |
| TEST-122 | AC-122 | API + DB | O's event at now + 30 min; P1, P2 ACTIVE; O checks in P1; O cancels the event; O reads the report | 200; registered 0, checkedIn 0, noShow 0, cancelled 2; P1's `cancelled` row has `checkedInAt`, P2's `null` |
| TEST-123 | AC-123 | API + DB | P1 reads O's PUBLISHED event, a DRAFT and a random UUID; O2 reads O's PUBLISHED, CLOSED, DRAFT, CANCELLED and a random UUID; O reads `not-a-uuid` | P1: 403 ×3; O2: 403, 403, 404, 404, 404; O: 400 `VALIDATION_ERROR` with a `details` item for `id` |
| TEST-124 | AC-124 | API | the route with no cookie, a random token, an expired session and a logged-out session | 401 `UNAUTHENTICATED` four times; body only `error` |
| TEST-125 | AC-125 | API + DB, and manual QA | O checks in P1 through one app instance; a second `createApp()` instance on the same database reads the report; in the QA run the server process is restarted without a database reset and the report is read again | same counts and `checkedInAt` each time |
| TEST-126 | AC-126 | E2E | Organizer One creates an event at now + 30 min, two participants register, Organizer One checks in one; Organizer One opens Attendance from My events; Participant One opens the same URL | organizer: Registered 2, Checked in 1, Not yet checked in 1, No-show 0, Cancelled 0, both attendees listed; participant: "You do not have access to this" |
| TEST-127 | AC-127 | API + DB and E2E | O's DRAFT event; O reads the report; Organizer One opens its Attendance page | 200, all counts 0, `attendees` and `cancelled` `[]`; the page shows "No registrations yet." |

Red: when F-11 is implemented (after Deliverable 2), TEST-120, TEST-122 to TEST-124, TEST-126 and TEST-127 are committed alone and fail on the missing route (404); TEST-121 calls the report service with a fixed `now` (D-12) and is added in the green commit; TEST-125's API part is red on the missing route, its restart part is a manual QA check (NFR-06, as in Sprint 1).

## 12. Definition of Done (F-11)
- This contract reviewed by A and merged into `sprint-3-staging` (#206); F-10 merged before F-11 starts.
- Red PR into the F-11 feature branch reviewed and approved by A, then the green PR into the integration branch reviewed by A with the required checks passing.
- All AC-120 to AC-127 pass; full `npm test` and `npm run test:e2e` pass with counts and the tested commit recorded; the TEST-125 restart check recorded in the QA run.
- Traceability rows for FR-13, NFR-06 and AC-120 to AC-127 filled with the actual test and result.
- For Deliverable 2, F-11 is a contract only and is reported as not started in the Sprint 3 remaining-work table.

## 13. Version history
| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-28 | First F-11 contract (#206): attendance report route, D-37 counting with the D-36 window end, CANCELLED rows listed separately, owner-only, Attendance screen; AC-120 to AC-127, TEST-120 to TEST-127; AC/TEST-128 and 129 stay unassigned | B (stickkersz), drafted with Claude Code | A (songt888) on the PR |
