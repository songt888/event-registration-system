# F-03 Browse events: engineering contract (Sprint 1)

Issue: #19 (sub-task 2.3 of Issue 2). Implementation: Issue 6 (`feature/s1-06-browse-events`).
Author: B (stickkersz). Reviewer: A (songt888).
Sources: `docs/srs.md` (FR-05, NFR-01, NFR-07, NFR-09), `docs/decisions.md` (D-07, D-13, D-14), `docs/system-sds.md` (sections 1.3, 2.1, 3, 4, 5), `deliverable1-plan.md` section 5.

## 1. Linked requirements
| ID | How F-03 covers it |
|---|---|
| FR-05 | Any signed-in user lists PUBLISHED events with `remainingPlaces = capacity - ACTIVE registrations`; DRAFT events never appear in the list. |
| NFR-01 | `GET /api/events` without a valid session returns 401 and no event data. |
| NFR-07 | Errors use the shared shape `{ "error": { "code", "message" } }`; no stack trace. |
| NFR-09 | The Events screen and the Event detail screen show loading, empty (list only) and error states. |
| D-07 | Only PUBLISHED events are listed. |
| D-13 | DRAFT visibility on the detail endpoint follows F-02 (404 `EVENT_NOT_FOUND` for everyone except the owner). |

No BR is owned by F-03. BR-02..BR-04 (registration rules) belong to F-04.

## 2. Behavior and workflow
1. A signed-in user (participant or organizer) opens `/events`.
2. The UI calls `GET /api/events`.
3. The API checks the session (`requireSession`). No role check: both roles may browse.
4. The service reads every event with status `PUBLISHED` and, for each, counts its ACTIVE registrations. It returns `remainingPlaces = capacity - activeCount`. The value is computed on read and never stored (system SDS 2.1).
5. The UI lists the events. Each row links to `/events/:id`.
6. The Event detail screen calls `GET /api/events/:id`. That endpoint is defined by the F-02 contract (#18), including the DRAFT rule (AC-31, AC-32). F-03 does not redefine it; F-03 only needs its response to contain the same fields as one list item, including `remainingPlaces` (see section 9).
7. The Register button on the detail screen belongs to F-04.

PUBLISHED events whose `startsAt` has passed stay in the list in Sprint 1. FR-05 has no time filter; registering for them is rejected by F-04 (AC-28, 409 `EVENT_STARTED`).

## 3. Validation
`GET /api/events` takes no request body and no query parameters in Sprint 1 (no filters, no pagination; system SDS 4.1). Query parameters, if sent, are ignored.

## 4. Failure and boundary cases
| Case | Result |
|---|---|
| No session, expired session or revoked session | 401 `UNAUTHENTICATED`, no event data (AC-38) |
| No PUBLISHED events (DRAFT events may exist) | 200 with an empty list; the UI shows the empty state (AC-10, AC-11) |
| Event with no ACTIVE registrations | `remainingPlaces` equals `capacity` (AC-10) |
| Event whose ACTIVE registrations equal its capacity | `remainingPlaces` is `0`; the event is still listed (AC-10) |
| Unexpected server or database failure | 500 `INTERNAL_ERROR` with a generic message, no stack trace (NFR-07) |

## 5. Permissions
| Operation | Anon | Participant | Organizer |
|---|---|---|---|
| `GET /api/events` (list PUBLISHED) | 401 | allowed | allowed |
| `GET /api/events/:id` | as defined in F-02 | as defined in F-02 | as defined in F-02 |

Identity comes only from the session cookie. The list is the same for every signed-in user: it contains no private data and no registrant information.

## 6. UI behavior
| Screen | Route | Behavior |
|---|---|---|
| Events | `/events` | Loading: "Loading events...". Empty: "No published events yet". Error: the API `error.message` in an alert; 401 redirects to `/login`. Each row shows the title (link to `/events/:id`), the start time in the browser's local time, the location and "N of C places left"; when `remainingPlaces` is 0 the row shows "Full". |
| Event detail | `/events/:id` | Loading: "Loading event...". Error: 404 shows "Not found"; other errors show the API `error.message`; 401 redirects to `/login`. Shows title, description, location, local start time and "N of C places left" (or "Full"). |

Shared states follow system SDS 3.2. The UI shows the value from the API; it never computes `remainingPlaces` itself.

## 7. API
### `GET /api/events`
- Auth: session cookie required. Any role.
- Request: no body, no parameters.
- Response 200:
```json
{
  "events": [
    {
      "id": "3f1c2a9e-0000-4000-8000-000000000001",
      "title": "Intro to Git workshop",
      "description": "Hands-on session for first-year students.",
      "location": "Engineering Building, Room 301",
      "startsAt": "2026-11-20T09:00:00.000Z",
      "capacity": 30,
      "remainingPlaces": 29,
      "status": "PUBLISHED"
    }
  ]
}
```
- Order: `startsAt` ascending, then `id` ascending, so the order is stable.
- Not returned: `ownerId`, owner details, registrations, `createdAt`, `publishedAt`.
- Errors: 401 `UNAUTHENTICATED`; 500 `INTERNAL_ERROR`. Shape as in system SDS 4.2.

### `GET /api/events/:id`
Defined by the F-02 contract (#18). Not redefined here.

## 8. Data
- No schema change and no migration. F-03 reads `Event` and `Registration` as created in Issue 3.
- `remainingPlaces` is derived on read: `capacity - count(Registration WHERE eventId = e.id AND status = 'ACTIVE')`.
- Seed (Issue 3) already contains PUBLISHED and DRAFT events, and one PUBLISHED event with one place left (system SDS 2.3); no seed change.

## 9. Dependencies on other contracts
- F-01 (#17): `requireSession`, the 401 response and the error handler.
- F-02 (#18): `GET /api/events/:id`. F-03's Event detail screen needs that response to include `remainingPlaces` for a PUBLISHED event, because FR-05 covers viewing an event with its remaining places. TEST-10 asserts it.
- Issue 3: schema, seed and test runner. Issue 9: Playwright setup is shared with TEST-22..TEST-24.

## 10. Acceptance criteria
| AC | Criterion | Linked |
|---|---|---|
| AC-10 | A signed-in user's `GET /api/events` returns 200 with every PUBLISHED event and no DRAFT event. Each item has `remainingPlaces = capacity - ACTIVE registrations` (equal to `capacity` with no registrations, `0` when full). `GET /api/events/:id` for a PUBLISHED event returns the same `remainingPlaces`. | FR-05, D-07 |
| AC-11 | When `GET /api/events` returns an empty list, the Events screen shows "No published events yet" and no event rows. | FR-05, NFR-09 |
| AC-38 | `GET /api/events` without a session cookie, or with the cookie of a logged-out session, returns 401 `UNAUTHENTICATED` and the body contains no event data. | NFR-01, FR-05 |

AC-38 is new: no existing AC covered an unauthenticated request to the event list (AC-03 covers `/api/me`, AC-09 covers `POST /api/events`).

## 11. Software test specification (STS)
| TEST | AC | Level | Setup | Steps | Expected |
|---|---|---|---|---|---|
| TEST-10 | AC-10 | API + DB integration (Vitest + Supertest, `DATABASE_URL_TEST`) | Insert directly: organizer O, participants P1 and P2; event E1 PUBLISHED capacity 3 with no registrations; E2 PUBLISHED capacity 2 with ACTIVE registrations for P1 and P2; E3 DRAFT owned by O. Log in as P1. | `GET /api/events`; then `GET /api/events/:id` for E2. | 200; exactly E1 and E2 in the list, E3 absent; E1 `remainingPlaces` 3; E2 `remainingPlaces` 0; detail of E2 has `remainingPlaces` 0. Also run the list as O: same two events. |
| TEST-11 | AC-11 | E2E UI (Playwright, `DATABASE_URL_E2E`) | Seeded database; log in through the UI as a seeded participant. Replace only the `GET /api/events` response with `{ "events": [] }` (Playwright `page.route`), since the seeded database always has PUBLISHED events. | Open `/events`. | "No published events yet" is visible; no event row is rendered. |
| TEST-38 | AC-38 | API integration | One PUBLISHED event inserted. | (a) `GET /api/events` with no cookie. (b) Log in, log out, then `GET /api/events` with the old cookie. | Both 401 with `error.code` `UNAUTHENTICATED`; the body has no `events` field. |

Test names start with their IDs, for example `TEST-10 AC-10 lists only PUBLISHED events with remaining places`.
The loading and error states of both screens (NFR-09) are checked by hand in the 9.4 QA run checklist in `docs/evidence/`, not by an automated test.

## 12. Definition of Done (F-03)
The Sprint 1 Definition of Done (F-01 contract, #17) applies. For F-03 in addition:
- TEST-10, TEST-11 and TEST-38 exist, run and pass; none skipped.
- The failing run of TEST-10 is committed before the implementation (red, then green).
- The service computes `remainingPlaces` from ACTIVE registrations; nothing is stored.
- The Events and Event detail screens show loading, empty (list) and error states.
- PR reviewed by A and merged into `sprint-1-staging` with a merge commit.

## 13. Version history
| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-07 | First F-03 contract (Issue #19) | B (stickkersz) | A (songt888) |
