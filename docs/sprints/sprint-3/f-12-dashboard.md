# F-12 Organizer summary dashboard: engineering contract (Sprint 3)

Issue: #206 (S3-01, contract). Implementation: after Deliverable 2 (`deliverable2-plan.md` section 5: A, 5 Dec) on `feature/s3-12-dashboard`. Author: A (songt888). Reviewer: B (stickkersz).
Sources: `docs/srs.md` (FR-14, BR-05, NFR-01, NFR-03, NFR-06, NFR-07, NFR-09), `docs/features.md` (F-12), `docs/decisions.md` (D-13, D-14, D-37), `docs/system-sds.md` (sections 2.2, 3.2, 4, 5), the F-05/F-06 contracts, the F-10 and F-11 contracts (`docs/sprints/sprint-3/`), and the ID proposal on #206 (F-12 uses AC/TEST-130 to 136; 128 and 129 stay unassigned).

## 1. Linked requirements

| ID | How F-12 covers it |
|---|---|
| FR-14 | The owning organizer sees a summary of registered, checked-in and no-show counts across their own events, with a per-event breakdown. |
| BR-05 | Only the session organizer's own events are summarized; a participant never reaches the route (D-13). |
| D-37 | Registered = ACTIVE registrations; checked in = ACTIVE with a `CheckIn`; no-show = ACTIVE without a `CheckIn` only after that event's check-in window has ended (`now >= startsAt + 6 h`, D-36); before that they are "not yet checked in"; CANCELLED rows are counted as `cancelled` only and never as no-show. |
| NFR-01 | The route needs a valid session: 401 `UNAUTHENTICATED` otherwise. |
| NFR-03 | The organizer is the session user; the request names no user, event set or time. |
| NFR-06 | Counts are computed on read from the stored `Registration` and `CheckIn` rows, so they are the same after a restart without a database reset. |
| NFR-07 | Errors use the shared shape of system SDS 4.2 with no stack trace. |
| NFR-09 | The Summary screen shows loading, empty and error states (system SDS 3.2). |

## 2. Behavior and workflow

1. A signed-in organizer presses **Summary** in the navigation. The UI calls `GET /api/organizer/summary`.
2. The route runs `requireSession` (401), `requireRole('ORGANIZER')` (403), then validates that there is no query string (400 `VALIDATION_ERROR` otherwise). No path or query names a user, event or time (NFR-03).
3. The service reads the caller's events (`ownerId` = session user) ordered by `startsAt` ascending then `id` ascending (the F-02 list order), with each event's registrations and their `CheckIn` rows, in one read. `now` is a parameter of the service function (D-12); the route passes the server time.
4. Each event's counts follow D-37 against that event's own window end (`startsAt + 6 h`): an ACTIVE registration is `CHECKED_IN` (it has a `CheckIn`), `NO_SHOW` (no `CheckIn` and `now >= startsAt + 6 h`), or `NOT_YET_CHECKED_IN` (no `CheckIn` and the window has not ended). A CANCELLED registration counts only in `cancelled` of that event, never as registered, checked in or no-show — including a CANCELLED row that kept its `checkedInAt` from a check-in before an event cancel (F-08).
5. `totals` sums the per-event counts over the caller's events. `remainingPlaces` is the stored capacity minus the event's ACTIVE registrations, as everywhere else (derived on read).
6. The route only reads; nothing is stored or changed. No new table or column is introduced (F-10 owns `CheckIn`, F-08 owns the statuses).

## 3. Validation

- No path parameter; an unexpected query string or body gets 400 `VALIDATION_ERROR`, after the session and role guards.
- Requests use the standard session cookie; identity and ownership come only from the session (NFR-03).

## 4. Failure and boundary cases

| Case | Result |
|---|---|
| No, unknown, expired or revoked session | 401 `UNAUTHENTICATED`, no summary data (AC-135) |
| Caller is a participant | 403 `FORBIDDEN` for the path (AC-132) |
| Owner with no events | 200, `totals` all zero, `events` `[]`, UI empty state (AC-133) |
| Owner's events with no registrations | 200, that event's counts all zero, `registered` 0 (AC-130) |
| Event whose window has ended with unchecked ACTIVE rows | those rows are `NO_SHOW` in that event's counts (AC-131) |
| Event whose window has not ended with unchecked ACTIVE rows | those rows are `NOT_YET_CHECKED_IN`; `noShow` 0 for it (AC-131) |
| Event cancelled after a check-in (F-08): its rows are CANCELLED, one kept `checkedInAt` | counted only in `cancelled`; `checkedIn` does not include it (AC-131) |
| Another organizer's events | never appear in `events` or `totals` (AC-132) |
| Unexpected failure | 500 `INTERNAL_ERROR`, no stack trace |

## 5. Permissions

| Operation | Anon | Participant | Organizer (owner) | Organizer (other) |
|---|---|---|---|---|
| `GET /api/organizer/summary` | 401 | 403 | allowed | allowed, but the response only ever contains that caller's own events |

There is no foreign-data case to hide: the query is scoped to the session user (BR-05, D-13). The role guard comes before any lookup, so a participant gets 403 for the path (system SDS 5.1, the F-10/F-11 decision).

## 6. UI behavior

| Screen | Route | Behavior |
|---|---|---|
| Navigation (organizer) | header/nav | A **Summary** link to `/organizer/summary`, visible only to organizers. |
| Summary | `/organizer/summary` | Heading. A counts line: Registered, Checked in, Not yet checked in, No-show, Cancelled (the `totals`). A table "Events": title, status, start time in local time, remaining places, registered, checked in, not yet checked in, no-show, cancelled — one row per own event, in the API order. Loading: "Loading..." while pending. Empty: "No events yet." when `events` is empty. Error: the API `error.message` in an alert; 401 redirects to `/login`; a participant opening the URL sees "You do not have access to this" (as AC-69 does). |

The UI renders the counts the API returns; it never counts or filters itself.

## 7. API

### `GET /api/organizer/summary`
- Auth: session, role ORGANIZER. The response always describes only the session user's events.
- Request: no path parameter, no query, no body.
- Response 200:
```json
{
  "totals": { "registered": 3, "checkedIn": 1, "notYetCheckedIn": 2, "noShow": 0, "cancelled": 1 },
  "events": [
    { "id": "3f1c2a9e-0000-4000-8000-000000000001", "title": "Intro to Git workshop", "status": "PUBLISHED",
      "startsAt": "2026-12-05T09:00:00.000Z", "capacity": 5, "remainingPlaces": 2,
      "registered": 3, "checkedIn": 1, "notYetCheckedIn": 2, "noShow": 0, "cancelled": 1 }
  ]
}
```
- `events` row order: `startsAt` ascending, `id` ascending. No `passwordHash`, `participant` list or session data is returned.
- Errors: 400 `VALIDATION_ERROR`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 500 `INTERNAL_ERROR`.

No new error code.

## 8. Data

- No new table or column. Reads `Event` (`status`, `startsAt`, `capacity`), `Registration` (`status`, `eventId`), `CheckIn` (`registrationId`; F-10) and `User` (the session).
- Counts are computed on read and never stored, so they cannot drift from the rows (as `remainingPlaces`, system SDS 2.1).
- Nothing is migrated or deleted (D-20).

## 9. Dependencies on other contracts

- F-01: `requireSession`, `requireRole`, the error handler.
- F-02: the events list and the organizer navigation.
- F-07/F-08: the CANCELLED statuses of registrations and events (D-33, D-34).
- F-10: the `CheckIn` table and the window end `startsAt + 6 h` (D-36). F-12's no-show counting needs F-10 merged.
- F-11: the per-event attendance report; AC-134 cross-checks the summary against it.
- F-13: the Summary screen joins the NFR-09 checklist.

## 10. Acceptance criteria

- **AC-130** The owner's summary of an account with two own events (one PUBLISHED future with 3 ACTIVE registrations of capacity 5, one DRAFT empty) returns 200 with `totals` registered 3, checkedIn 0, notYetCheckedIn 3, noShow 0, cancelled 0, and two `events` rows whose per-event counts match; each row carries `remainingPlaces` (2 and 5).
- **AC-131** With one own event past `startsAt + 6 h` (2 ACTIVE unchecked, 1 checked in, 1 CANCELLED) and one future event (1 ACTIVE unchecked), at a fixed service time the past event reports `NO_SHOW` 2 and `notYetCheckedIn` 0, the future event reports `notYetCheckedIn` 1 and `noShow` 0; the CANCELLED row (including one that kept `checkedInAt` after an event cancel) counts only in `cancelled`; `totals` sums both.
- **AC-132** A participant gets 403 `FORBIDDEN` for the path; another organizer's events never appear in the first organizer's `events` or `totals`; a non-session request gets 401; nothing in the response names another user.
- **AC-133** An organizer with no events gets 200 with `totals` all zero and `events` `[]`, and the page shows "No events yet."
- **AC-134** For the same service time, every per-event count in the summary equals the same event's `GET /api/events/:id/attendance` report (F-11); the `totals` equal the sum of those reports. (Runs after F-11 is implemented; see STS.)
- **AC-135** The route gives 401 `UNAUTHENTICATED` with no cookie, an unknown token, an expired session and a logged-out session, with no summary data.
- **AC-136** In the UI the organizer opens Summary from the navigation and sees the counts and the events table as the API returns them, also after a reload; a participant opening `/organizer/summary` sees "You do not have access to this"; an empty account shows "No events yet."

## 11. Software test specification (STS)

API tests use Vitest and Supertest on the real PostgreSQL test database (`DATABASE_URL_TEST`, D-14). Fixtures: organizers O and O2; participants P1 to P4; registrations and cancellations through the API (F-04, F-07, F-08); check-ins through the F-10 route or service; events whose window has ended are inserted directly (F-02 accepts only a future start). Every test asserts the response shape of section 7 and that no other organizer's data appears.

| TEST | AC | Level | Inputs and preconditions | Expected result |
|---|---|---|---|---|
| TEST-130 | AC-130 | API + DB | O's future PUBLISHED event (3 ACTIVE of capacity 5) and empty DRAFT; O reads the summary | 200 with the totals and two rows of AC-130; row order by `startsAt` |
| TEST-131 | AC-131 | API + DB | O's past event (inserted; 2 ACTIVE unchecked, 1 checked in, 1 CANCELLED — one variant where the CANCELLED row kept `checkedInAt` from an event cancel) and future event (1 ACTIVE unchecked); O reads the summary at a fixed `now` | per-event `NO_SHOW`/`NOT_YET_CHECKED_IN` split of AC-131; the CANCELLED rows only in `cancelled`; totals sum both events |
| TEST-132 | AC-132 | API + DB | O2 owns an event with registrations; P1 reads the summary; O reads the summary | P1: 403 `FORBIDDEN`; O's response has no O2 event or count |
| TEST-133 | AC-133 | API + DB | a fresh organizer with no events | 200, `totals` all zero, `events` `[]` |
| TEST-134 | AC-134 | API + DB | the TEST-131 fixtures; O reads the summary and each event's F-11 attendance report at the same `now` | every per-event count and the totals match the attendance reports (added after F-11's implementation; see red note) |
| TEST-135 | AC-135 | API | the route with no cookie, a random token, an expired session and a logged-out session | 401 `UNAUTHENTICATED` four times; body only `error` |
| TEST-136 | AC-136 | E2E | Organizer One with a published event and a registration opens Summary from the navigation; Participant One opens `/organizer/summary` | organizer sees the counts and the table, still after a reload; participant sees "You do not have access to this" |

Red: TEST-130, TEST-131, TEST-132, TEST-133, TEST-135 and TEST-136 are committed alone on the F-12 red branch and run before the implementation, so they fail on the missing route (404), never on a compile, import or fixture error. TEST-134 compares against the F-11 attendance route, so it is added after F-11's implementation exists (like the F-10 contract's TEST-112 rule); TEST-131's time-sensitive split is asserted with events inserted directly, not with a mocked clock.

## 12. Definition of Done (F-12)

- This contract reviewed by B and merged (with the S3-01 round) before any F-12 red commit (#206); F-10 and F-11 merged before F-12 starts.
- Red PR reviewed and approved by B, with the failing output recorded on the red commit; then the green PR into the integration branch with the required checks passing.
- All AC-130 to AC-136 pass; full `npm test` and `npm run test:e2e` pass with counts and the tested commit recorded.
- Traceability rows for FR-14 and AC-130 to AC-136 filled with the actual test and result.
- For Deliverable 2, F-12 is a contract only and is reported as planned in the Sprint 3 remaining-work table.

## 13. Version history

| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-28 | First F-12 contract (#206): organizer summary route with D-37 counting across own events and the per-event D-36 window, Summary screen; AC-130 to AC-136, TEST-130 to TEST-136; TEST-134 disclosed as added after F-11 | A (songt888) | Pending B (stickkersz) |
| 1.1 | 2026-11-28 | B's review: each event row carries its own `cancelled` count (D-37, consistent with `totals` and the F-11 report cross-check); system SDS 2.4 added | A (songt888) | B (stickkersz) on #234 |
