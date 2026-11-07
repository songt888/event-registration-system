# F-05 My registrations and F-06 Event registrations (organizer): engineering contract (Sprint 1)

Issue: #21 (sub-task 2.5 of Issue 2). Implementation: Issue 8: A writes F-05 (8.1, #35, `feature/s1-08-my-registrations`), B writes F-06 (8.2, #36, `feature/s1-08-organizer-view`).
Author: B (stickkersz). Reviewer: A (songt888).
Sources: `docs/srs.md` (FR-07, FR-08, FR-15, BR-05, NFR-01, NFR-03, NFR-07, NFR-09), `docs/decisions.md` (D-06, D-08, D-13, D-14), `docs/system-sds.md` (sections 1.3, 2.1, 3, 4, 5, 6, 9), `docs/features.md` (F-05, F-06), `docs/traceability.md` (FR-07, FR-08, BR-05, NFR-01, NFR-03 rows), `docs/sprints/sprint-1/f-01-auth.md` (AC-42, TEST-42), `deliverable1-plan.md` section 5.

## 1. Linked requirements
| ID | How F-05 and F-06 cover it |
|---|---|
| FR-07 | F-05: a participant retrieves their own registrations, each with its status, and one own registration by ID. Another participant's registration returns 404 `NOT_FOUND` with no data. |
| FR-08 | F-06: an organizer retrieves the registrations of an event they own. Participants get 403; other organizers get 403 on a PUBLISHED event and 404 on a DRAFT (D-13). |
| FR-15 | F-06: the organizer picks the event from their own My events list (F-02) to open its registrations. |
| BR-05 | Participants read only their own registrations; organizers read registrations only of their own events. Record access is decided from the session user in the service layer (system SDS 1.3, 5.2). |
| NFR-01 | All three routes reject no cookie, an unknown token, an expired session and a logged-out session with 401 `UNAUTHENTICATED` and no registration data (AC-45, AC-47). |
| NFR-03 | Role is checked on every route (AC-21, AC-46) and ownership in the service (AC-18, AC-20, AC-48). No route reads a user ID from the request. |
| NFR-07 | A non-UUID `:id` gets 400 `VALIDATION_ERROR` (AC-46, AC-48). Errors use the shape of system SDS 4.2; every STS error case asserts it (section 11). |
| NFR-09 | My registrations and Event registrations are two of the five NFR-09 screens: loading, empty and error states follow system SDS 3.2 (section 6). |
| D-06, D-13 | Participant: own registrations only; foreign registration 404 `NOT_FOUND`. Organizer: own events only; wrong role 403 for every ID; non-owner 403 (PUBLISHED) or 404 `EVENT_NOT_FOUND` (DRAFT). |

## 2. Behavior and workflow
### F-05 My registrations (participant)
1. A signed-in participant opens `/my/registrations` from the header link.
2. The UI calls `GET /api/registrations/mine`. The route runs `requireSession` (401), then `requireRole('PARTICIPANT')` (403).
3. The service returns every registration whose `participantId` is the session user, newest first (`createdAt` descending), each with a summary of its event.
4. `GET /api/registrations/:id` runs the same guards, validates `:id` as a UUID, then loads the registration with `id = :id AND participantId = <session user>`. No row (unknown ID or another participant's registration): 404 `NOT_FOUND`. Both cases give the same answer, so a foreign registration's existence is not revealed (D-13).

### F-06 Event registrations (organizer)
1. A signed-in organizer opens My events (`/organizer/events`, F-02) and presses "Registrations" on one of their events. This opens `/organizer/events/:id/registrations`.
2. The UI calls `GET /api/events/:id` (F-02) for the event title and `GET /api/events/:id/registrations` for the list.
3. The route runs `requireSession` (401), then `requireRole('ORGANIZER')` (403), then validates `:id` as a UUID (400). A participant therefore gets 403 for every event ID (D-13 check order).
4. The service loads the event:
   1. No event: 404 `EVENT_NOT_FOUND`.
   2. Event is DRAFT and its owner is not the caller: 404 `EVENT_NOT_FOUND` (D-13 event rule).
   3. Event is PUBLISHED and its owner is not the caller: 403 `FORBIDDEN`.
   4. Owner: return the event's registrations, oldest first (`createdAt` ascending), each with the participant's name and email.
5. The queries only read; nothing is stored or changed.

## 3. Validation
- `GET /api/registrations/:id` and `GET /api/events/:id/registrations`: `:id` must be a UUID; otherwise 400 `VALIDATION_ERROR` (system SDS 4.1, 4.2), checked after the session and role guards and before any query.
- All three routes are `GET` with no request body. No route accepts a participant or organizer ID from the client; identity comes only from the session (NFR-03).
- Express route order: `/api/registrations/mine` is declared before `/api/registrations/:id`, otherwise `mine` is matched as an ID.

## 4. Failure and boundary cases
| Route | Case | Result |
|---|---|---|
| all three | No cookie, unknown token, expired session (`expiresAt <= now`) or logged-out session | 401 `UNAUTHENTICATED`, no registration data (AC-45, AC-47) |
| `GET /api/registrations/mine` | Participant with no registrations | 200, `registrations: []`; UI empty state (AC-17) |
| `GET /api/registrations/mine`, `GET /api/registrations/:id` | Caller is an organizer (any ID) | 403 `FORBIDDEN` (AC-46) |
| `GET /api/registrations/:id` | Another participant's registration | 404 `NOT_FOUND`, no data (AC-18) |
| `GET /api/registrations/:id` | Unknown UUID | 404 `NOT_FOUND` (AC-46) |
| `GET /api/registrations/:id` | `:id` not a UUID | 400 `VALIDATION_ERROR` (AC-46) |
| `GET /api/events/:id/registrations` | Caller is a participant (DRAFT, PUBLISHED or unknown ID) | 403 `FORBIDDEN`, no data (AC-21) |
| `GET /api/events/:id/registrations` | Another organizer's PUBLISHED event | 403 `FORBIDDEN`, no data (AC-20) |
| `GET /api/events/:id/registrations` | Another organizer's DRAFT event, or unknown UUID | 404 `EVENT_NOT_FOUND`, no data (AC-48) |
| `GET /api/events/:id/registrations` | `:id` not a UUID | 400 `VALIDATION_ERROR` (AC-48) |
| `GET /api/events/:id/registrations` | Owner's event with no registrations (for example the owner's own DRAFT) | 200, `registrations: []`; UI empty state (AC-19) |
| all three | Unexpected server or database failure | 500 `INTERNAL_ERROR`, generic message, no stack trace (NFR-07) |

## 5. Permissions
| Operation | Anon | Participant | Organizer (owner) | Organizer (other) |
|---|---|---|---|---|
| `GET /api/registrations/mine` | 401 | allowed (own only) | 403 | 403 |
| `GET /api/registrations/:id` | 401 | own: allowed; another participant's: 404 | 403 | 403 |
| `GET /api/events/:id/registrations` | 401 | 403 | allowed | 403 (PUBLISHED), 404 (DRAFT) |

This is the system SDS 5.1 matrix. For the registration routes "Organizer (owner)" means the owner of the registration's event: an organizer never uses the participant routes, even for their own event.

## 6. UI behavior
| Screen | Route | Behavior |
|---|---|---|
| My registrations (F-05) | `/my/registrations` | Header link shown to participants only. One row per registration: event title (link to `/events/:eventId`), start time in local time, location, status. Loading: "Loading..." while the request is pending. Empty: "You have no registrations yet." Error: the API `error.message` in an alert; 401 redirects to `/login`; 403 shows "You do not have access to this" (system SDS 3.2). |
| My events (F-02 screen, F-06 adds a link) | `/organizer/events` | Each row of the organizer's own events gets a "Registrations" link to `/organizer/events/:id/registrations` (FR-15). |
| Event registrations (F-06) | `/organizer/events/:id/registrations` | Heading with the event title (from `GET /api/events/:id`) and the number of registrations. Table: participant name, email, status, registered at (local time). Loading: "Loading..." while a request is pending. Empty: "No registrations yet." Error: the API `error.message` in an alert; 401 redirects to `/login`; 403 shows "You do not have access to this"; 404 shows "Not found" (system SDS 3.2). |

`GET /api/registrations/:id` has no screen in Sprint 1; it is an API operation only (system SDS 4.3). The UI never filters registrations by owner itself: the screens show what the API returns.

API `error.message` values:
| Code | `error.message` |
|---|---|
| `NOT_FOUND` | "Registration not found." |
| `EVENT_NOT_FOUND` | "Event not found." |
| `FORBIDDEN` | "You do not have access to this." |

## 7. API
### `GET /api/registrations/mine` (F-05)
- Auth: session cookie required. Role `PARTICIPANT`.
- Request: no parameters, no body.
- Response 200:
```json
{
  "registrations": [
    {
      "id": "7a2d4c10-0000-4000-8000-000000000002",
      "status": "ACTIVE",
      "createdAt": "2026-11-10T08:15:00.000Z",
      "event": {
        "id": "3f1c2a9e-0000-4000-8000-000000000001",
        "title": "Intro to Git workshop",
        "location": "Room 201",
        "startsAt": "2026-11-20T09:00:00.000Z"
      }
    }
  ]
}
```
- Order: `createdAt` descending. Not returned: `participantId` (it is the caller), other participants' registrations, event owner details.
- Errors: 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 500 `INTERNAL_ERROR`.

### `GET /api/registrations/:id` (F-05)
- Auth: session cookie required. Role `PARTICIPANT`.
- Request: path `:id` (UUID).
- Response 200: `{ "registration": { ... } }` with the same fields as one item of `/mine`.
- Errors: 400 `VALIDATION_ERROR`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `NOT_FOUND` (unknown ID or another participant's registration); 500 `INTERNAL_ERROR`.

### `GET /api/events/:id/registrations` (F-06)
- Auth: session cookie required. Role `ORGANIZER`, owner of the event.
- Request: path `:id` (UUID).
- Response 200:
```json
{
  "registrations": [
    {
      "id": "7a2d4c10-0000-4000-8000-000000000002",
      "status": "ACTIVE",
      "createdAt": "2026-11-10T08:15:00.000Z",
      "participant": { "name": "Participant One", "email": "participant1@example.com" }
    }
  ]
}
```
- Order: `createdAt` ascending. `participant` has only `name` and `email` (system SDS 5.2); never `passwordHash`, session data or the participant's other registrations.
- Errors: 400 `VALIDATION_ERROR`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `EVENT_NOT_FOUND`; 500 `INTERNAL_ERROR`.

Error shape for all three routes as in system SDS 4.2.

## 8. Data
- No schema change and no migration. F-05 and F-06 only read `Registration` (`id`, `eventId`, `participantId`, `status`, `createdAt`), `Event` (`id`, `ownerId`, `title`, `location`, `startsAt`, `status`) and `User` (`name`, `email`) as created in Issue 3.
- Every S1 registration is `ACTIVE`; the `status` field is returned so S2 `CANCELLED` rows (F-07) need no API change.
- The seed planned in system SDS 2.3 (Issue 3) already has one ACTIVE registration on an organizer 1 event and a PUBLISHED event of organizer 2 for the cross-owner checks; no seed change.

## 9. Dependencies on other contracts
- F-01 (#17): `requireSession`, `requireRole`, the 401/403 responses and the error handler (AC-42).
- F-02 (#18): `GET /api/events/:id` for the Event registrations heading, and the My events screen that holds the "Registrations" link.
- F-04 (#20): registrations exist only through `POST /api/events/:id/registrations`; tests insert them directly.
- Issue 3: schema, `DATABASE_URL_TEST`, sequential integration files and table truncation (D-14).

## 10. Acceptance criteria
| AC | Criterion | Linked |
|---|---|---|
| AC-17 | A participant's `GET /api/registrations/mine` returns 200 with exactly their own registrations, each with `id`, `status`, `createdAt` and the event's `id`, `title`, `location` and `startsAt`, and none of another participant's; a participant with no registrations gets `registrations: []`. `GET /api/registrations/:id` for their own registration returns 200 with that registration. | FR-07, BR-05 |
| AC-18 | A participant's `GET /api/registrations/:id` for another participant's registration returns 404 `NOT_FOUND`, and the body contains no registration data. | FR-07, BR-05, D-13 |
| AC-19 | An organizer's `GET /api/events/:id/registrations` for an event they own returns 200 with exactly that event's registrations, each with `id`, `status`, `createdAt` and the participant's `name` and `email` only; an owned event with no registrations returns `registrations: []`. | FR-08, FR-15, BR-05 |
| AC-20 | Organizer B's `GET /api/events/:id/registrations` for organizer A's PUBLISHED event returns 403 `FORBIDDEN` with no registration data. | FR-08, BR-05, D-13 |
| AC-21 | A participant's `GET /api/events/:id/registrations` for a DRAFT event, a PUBLISHED event or an unknown event ID returns 403 `FORBIDDEN` with no registration data. | FR-08, NFR-03, D-13 |
| AC-45 | `GET /api/registrations/mine` and `GET /api/registrations/:id` with no cookie, with a token that matches no session, with an expired session (`expiresAt <= now`) or with the cookie of a logged-out session return 401 `UNAUTHENTICATED` with no registration data. | NFR-01, FR-07, D-08 |
| AC-46 | An organizer's `GET /api/registrations/mine` and `GET /api/registrations/:id` (an existing or an unknown registration ID) return 403 `FORBIDDEN`. A participant's `GET /api/registrations/:id` with an unknown UUID returns 404 `NOT_FOUND`, and with a non-UUID `:id` returns 400 `VALIDATION_ERROR`. | NFR-03, NFR-07, FR-07, D-13 |
| AC-47 | `GET /api/events/:id/registrations` with no cookie, with a token that matches no session, with an expired session (`expiresAt <= now`) or with the cookie of a logged-out session returns 401 `UNAUTHENTICATED` with no registration data. | NFR-01, FR-08, D-08 |
| AC-48 | Organizer B's `GET /api/events/:id/registrations` for organizer A's DRAFT event, or for an unknown event UUID, returns 404 `EVENT_NOT_FOUND`, and with a non-UUID `:id` returns 400 `VALIDATION_ERROR`; none of these responses contain registration data. | FR-08, BR-05, NFR-07, D-13 |

AC-17..AC-21 keep the numbers of `deliverable1-plan.md` section 5 and `docs/traceability.md`. AC-45..AC-48 are new: no existing AC covered the session, wrong-role, unknown-ID and invalid-ID cases of these three routes, and the DRAFT case of AC-20 (404 instead of 403, D-13) had no AC. `f-01-auth.md` TEST-42 says "Real endpoint matrices also required in F-02..F-06 contracts", and `docs/traceability.md` leaves the "complete DRAFT/access matrix" to #21 (FR-08 row). The numbers follow AC-44, the highest AC found on `sprint-1-staging`, every remote branch and the open PRs.

## 11. Software test specification (STS)
All tests below are API + DB integration tests (Vitest + Supertest, `DATABASE_URL_TEST`, tables truncated in `beforeEach`, D-14). Fixtures (users, events, registrations, sessions) are inserted directly in the database; "log in" means `POST /api/auth/login` with the fixture's password. Every error response is also asserted to have the shape `{ "error": { "code", "message" } }`, plus `details` for 400 `VALIDATION_ERROR` only, and no `stack` field (NFR-07, system SDS 4.2): the 401, 403 and 404 responses have exactly the keys `code` and `message` in `error`; the 400 responses are checked for `error.code` and the absence of `stack` only. "No registration data" means the body has only the `error` key.

Shared fixtures: organizers O and O2; participants P1, P2, P3; E PUBLISHED owned by O, capacity 5, `startsAt` now + 7 days; E2 PUBLISHED owned by O2, capacity 5, future; D DRAFT owned by O, capacity 5, future. Registrations, all ACTIVE: R1 (P1, E), R2 (P2, E), R3 (P1, E2), R4 (P3, E2), with `createdAt` R1 < R2 < R3 < R4.

| TEST | AC | Level | Setup | Steps | Expected |
|---|---|---|---|---|---|
| TEST-17 | AC-17 | API + DB integration | Shared fixtures, plus participant P4 with no registrations. | Log in as P1: `GET /api/registrations/mine`; `GET /api/registrations/R1`. Log in as P4: `GET /api/registrations/mine`. | P1 list: 200, exactly R3 then R1 (newest first), each with `status` `ACTIVE` and the matching event `id`, `title`, `location`, `startsAt`; R2 and R4 absent. R1: 200, `registration.id` R1, `registration.event.id` E. P4: 200, `registrations` `[]`. |
| TEST-18 | AC-18 | API + DB integration | Shared fixtures. | Log in as P1: `GET /api/registrations/R2`. | 404, `error.code` `NOT_FOUND`; body has only `error`. |
| TEST-19 | AC-19 | API + DB integration | Shared fixtures. | Log in as O: `GET /api/events/E/registrations`; `GET /api/events/D/registrations`. | E: 200, exactly R1 then R2 (oldest first), each with `id`, `status`, `createdAt` and `participant` with exactly the keys `name` and `email` of P1 and P2; R3, R4 absent; no `passwordHash` anywhere in the body. D: 200, `registrations` `[]`. |
| TEST-20 | AC-20 | API + DB integration | Shared fixtures. | Log in as O2: `GET /api/events/E/registrations`. | 403, `error.code` `FORBIDDEN`; body has only `error`. |
| TEST-21 | AC-21 | API + DB integration | Shared fixtures. | Log in as P1: `GET /api/events/E/registrations`; `GET /api/events/D/registrations`; `GET /api/events/<random UUID>/registrations`. | All three 403, `error.code` `FORBIDDEN`; each body has only `error`. |
| TEST-45 | AC-45 | API + DB integration | Shared fixtures, plus a `Session` row for P1 with `tokenHash` = SHA-256 of a known token T and `expiresAt` in the past, inserted directly (system SDS 6, D-08). | Call `GET /api/registrations/mine` and `GET /api/registrations/R1`, each (a) with no cookie, (b) with a random token as cookie, (c) with T as cookie, (d) after logging in as P1 and `POST /api/auth/logout`, with the old cookie. | All eight 401, `error.code` `UNAUTHENTICATED`; each body has only `error`. |
| TEST-46 | AC-46 | API + DB integration | Shared fixtures. | Log in as O: `GET /api/registrations/mine`; `GET /api/registrations/R1`; `GET /api/registrations/<random UUID>`. Log in as P1: `GET /api/registrations/<random UUID>`; `GET /api/registrations/not-a-uuid`. | O: all three 403 `FORBIDDEN`, body only `error`. P1: 404 `NOT_FOUND`, body only `error`; 400 `VALIDATION_ERROR`, no `stack`. |
| TEST-47 | AC-47 | API + DB integration | Shared fixtures, plus a `Session` row for O with `tokenHash` = SHA-256 of a known token T and `expiresAt` in the past, inserted directly. | `GET /api/events/E/registrations` (a) with no cookie, (b) with a random token as cookie, (c) with T as cookie, (d) after logging in as O and `POST /api/auth/logout`, with the old cookie. | All four 401, `error.code` `UNAUTHENTICATED`; each body has only `error`. |
| TEST-48 | AC-48 | API + DB integration | Shared fixtures. | Log in as O2: `GET /api/events/D/registrations`; `GET /api/events/<random UUID>/registrations`; `GET /api/events/not-a-uuid/registrations`. | D and random UUID: 404 `EVENT_NOT_FOUND`, body only `error`. Non-UUID: 400 `VALIDATION_ERROR`, no `stack`, no `registrations` field. |

Test names start with their IDs, for example `TEST-18 AC-18 returns 404 for another participant's registration`.
TEST-18 and TEST-20 are TDD samples for the PDF: their failing runs are saved as `docs/evidence/tdd/TEST-18-red.txt` and `TEST-20-red.txt`, and their passing runs as `TEST-18-green.txt` and `TEST-20-green.txt` (team-workflow).
The UI journey through My registrations and Event registrations is covered by TEST-22 (E2E, Issue 9.1), and My registrations after a full-event rejection by TEST-23 (E2E, Issue 9.2). The loading, empty and error states of both screens (NFR-09) are checked by hand in the 9.4 QA run checklist.

## 12. Definition of Done (F-05, F-06)
The shared [Sprint 1 Definition of Done](definition-of-done.md) applies. In addition:
- F-05 (8.1, A): TEST-17, TEST-18, TEST-45 and TEST-46 exist, run and pass; none skipped.
- F-06 (8.2, B): TEST-19, TEST-20, TEST-21, TEST-47 and TEST-48 exist, run and pass; none skipped.
- The failing tests are committed before the implementation on each branch, and the failing runs of TEST-18 and TEST-20 are saved in `docs/evidence/tdd/`.
- Ownership is decided in the service layer from the session user (BR-05), not in the UI.
- Both screens show loading, empty and error states (NFR-09).
- Each PR is reviewed by the other student and merged into `sprint-1-staging` with a merge commit.

## 13. Version history
| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-07 | First F-05 and F-06 contract (Issue #21) | B (stickkersz) | A (songt888) |
