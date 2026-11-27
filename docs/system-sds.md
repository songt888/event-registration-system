# System-Level Software Design Specification (SDS)

Event Registration and Attendance System, CPE 334 group project, Theme 3.
Covers the whole product; Sprint 1 parts are marked **S1**, later parts **S2** or **S3**.
Requirement IDs (FR, BR, NFR) come from `docs/srs.md`; decisions (D-xx) from `docs/decisions.md`; features (F-xx) from `docs/features.md`. Detailed endpoint behavior belongs to the feature contract in `docs/sprints/sprint-1/` or, for Sprint 2, `docs/sprints/sprint-2/`.

## 1. Architecture and stack

### 1.1 Components
```mermaid
flowchart LR
  B["Browser<br/>React SPA (Vite, TypeScript)"] -- "HTTPS, JSON, session cookie" --> R["Express API (Node 20, TypeScript)<br/>routes + zod validation<br/>requireSession / requireRole"]
  R --> S["Service layer<br/>business rules, ownership checks,<br/>transactions"]
  S --> P["Prisma Client"]
  P --> D[("PostgreSQL 16<br/>constraints, partial unique index")]
```

| Component | Responsibility | Technology (D-11) |
|---|---|---|
| UI | Screens, forms, client-side input hints, loading/empty/error states. Holds no business rules and no authority over identity or role. | React 18, TypeScript, Vite, React Router |
| API routes | HTTP mapping, request validation (zod), authentication and role guards, JSON error shape. | Express 4, TypeScript, zod |
| Service layer | All business rules (BR-01..BR-10), record ownership, state transitions, transactions and row locks. | TypeScript modules, one per feature area |
| Data access | Typed queries, migrations, seed. | Prisma 5 |
| Database | Durable storage and last-line integrity: foreign keys, CHECK constraints, unique and partial unique indexes. | PostgreSQL 16 |

A modular monolith: one Node process serves the API and, in production, the built UI. One database. No microservices.

### 1.2 Communication
- The UI calls the API with `fetch` on relative paths under `/api`, sending the session cookie (`credentials: 'include'`).
- **Development:** Vite dev server proxies `/api` to Express, so the browser sees one origin.
- **Production:** Express serves the built UI files and the API from the same origin. No CORS is needed and the cookie stays first-party.

### 1.3 Where rules are enforced
| Rule | Enforced in | Backstop |
|---|---|---|
| Authentication (NFR-01) | `requireSession` middleware on every protected route | none needed: no session, no handler |
| Role (BR-01, NFR-03) | `requireRole` middleware | service functions take the caller and recheck role |
| Ownership (BR-05, BR-09 publish, D-13) | service layer, comparing the record owner with the session user | queries are scoped by owner where possible |
| Capacity (BR-02) | service layer, inside one transaction with `SELECT ... FOR UPDATE` on the event row (D-10) | `capacity` CHECK 1..10000 |
| One active registration (BR-03) | service layer check inside the same transaction | partial unique index `(eventId, participantId) WHERE status = 'ACTIVE'` |
| Registrable event (BR-04) | service layer: status PUBLISHED and `startsAt > now` | none |
| Time conflict (BR-10, CR-01) | service layer, in the D-10 registration transaction after the duplicate check: the participant's `User` row is locked `FOR UPDATE` after the event row, then the participant's other ACTIVE registrations are checked for a `startsAt` less than 120 minutes away | none: a constraint cannot compare `startsAt` across two events |
| Valid start time (BR-09, D-12) | service layer on create and publish | none |
| Input shape | zod schema at the route | DB types and NOT NULL |

The UI may hide controls a user cannot use, but hiding is only a convenience; every rule above holds when the API is called directly.

## 2. Data model

### 2.1 Entities (S1 baseline; S2 additions planned)
```mermaid
erDiagram
  User ||--o{ Session : "has"
  User ||--o{ Event : "owns (organizer)"
  User ||--o{ Registration : "makes (participant)"
  Event ||--o{ Registration : "receives"
  User {
    uuid id PK
    string email UK
    string name
    string passwordHash
    Role role
    timestamptz createdAt
  }
  Session {
    uuid id PK
    string tokenHash UK
    uuid userId FK
    timestamptz expiresAt
    timestamptz createdAt
  }
  Event {
    uuid id PK
    uuid ownerId FK
    string title
    string description
    string location
    timestamptz startsAt
    int capacity
    EventStatus status
    timestamptz createdAt
    timestamptz publishedAt
    timestamptz registrationDeadline "nullable; S2 (D-35)"
  }
  Registration {
    uuid id PK
    uuid eventId FK
    uuid participantId FK
    RegistrationStatus status
    timestamptz createdAt
    timestamptz cancelledAt "nullable; S2 (D-33)"
  }
```

| Entity | Important fields and constraints | Ownership |
|---|---|---|
| User | `email` unique, lowercase; `passwordHash` bcrypt, never returned by the API (NFR-02); `role` enum `PARTICIPANT` or `ORGANIZER`, one per account (D-09) | itself |
| Session | `tokenHash` = SHA-256 of the cookie token, unique; `expiresAt` = creation + 1 h (D-08); index on `expiresAt`; cascade delete with its user | its user |
| Event | `title` 1..120 chars, `location` 1..120, `description` 0..2000; `capacity` integer, CHECK 1..10000 (D-03); `startsAt` timestamptz; nullable `registrationDeadline` timestamptz (S2, D-35); `status` enum `DRAFT`, `PUBLISHED` (S1), `CLOSED`, `CANCELLED` (S2); `publishedAt` set on publish | `ownerId` = organizer who created it |
| Registration | `status` enum `ACTIVE` (S1), `CANCELLED` (S2); nullable `cancelledAt` timestamptz (S2, D-33); partial unique index on `(eventId, participantId) WHERE status = 'ACTIVE'` (D-02) | `participantId` = participant who registered; the event owner may read it |

Derived value: `remainingPlaces = capacity - count(Registration WHERE eventId = e AND status = 'ACTIVE')`. It is computed on read, never stored, so it cannot drift from the registrations.

Foreign keys from Event and Registration use `ON DELETE RESTRICT`: S1 has no delete operations, and history must not disappear silently.

### 2.2 Later sprints (planned)
| Sprint | Change | For |
|---|---|---|
| S2 (planned; contracts under #200) | Registration `CANCELLED` status and `cancelledAt`; Event `registrationDeadline`; Event `CLOSED`, `CANCELLED` | F-07, F-08, F-09 |
| S3 | Check-in record per ACTIVE registration (`checkedInAt`, `checkedInById`), unique per registration | F-10, F-11, F-12 |

Each change is a new Prisma migration; existing migrations are never edited.

Planned S2 lifecycle transitions from D-33/D-34: an Event moves `DRAFT` to `PUBLISHED` through the existing publish operation, then `PUBLISHED` to `CLOSED`; an owner may move `DRAFT`, `PUBLISHED`, or `CLOSED` to final `CANCELLED`. `CLOSED` remains listed and cannot reopen; `CANCELLED` is omitted from normal browse and its ACTIVE registrations become CANCELLED. An F-07 cancellation changes an owned Registration from `ACTIVE` to `CANCELLED` and retains the row; re-registration creates a separate ACTIVE row. These transitions are planned only and their detailed checks belong to F-07/F-08/F-09 contracts.

### 2.3 Migrations and seed
- Schema lives in `server/prisma/schema.prisma`; migrations in `server/prisma/migrations/`, created with `prisma migrate dev` and applied in deployment with `prisma migrate deploy`.
- Prisma 5 cannot declare CHECK constraints or partial indexes, so the first migration adds them with raw SQL (`capacity` CHECK, the ACTIVE partial unique index). Issue 3 verifies that `prisma migrate dev` reports no drift afterwards.
- Seed (`npm run seed`) is repeatable: it clears the tables and inserts synthetic data:
  - 2 organizers and 4 participants (`@example.com` addresses), all with the password from `SEED_PASSWORD`;
  - organizer 1: one PUBLISHED event with capacity 30, one PUBLISHED event with capacity 2 and one ACTIVE registration (one place left, for the full-event demo), one DRAFT event;
  - organizer 2: one PUBLISHED event (for the cross-owner checks).
- Every seeded `startsAt` is relative to the time the seed runs (for example now + 7 days), never a fixed date, so seeded events stay registrable (D-14).

## 3. UI structure

### 3.1 Screens and navigation (S1)
| Screen | Route | Who | Data | Feature |
|---|---|---|---|---|
| Login | `/login` | anonymous | `POST /api/auth/login` | F-01 |
| Events | `/events` | any signed-in user | `GET /api/events` | F-03 |
| Event detail | `/events/:id` | any signed-in user (draft: owner only) | `GET /api/events/:id`; Register button for participants | F-03, F-04 |
| My registrations | `/my/registrations` | participant | `GET /api/registrations/mine` | F-05 |
| My events | `/organizer/events` | organizer | `GET /api/events/mine`; Publish button on drafts | F-02 |
| Create event | `/organizer/events/new` | organizer | `POST /api/events` | F-02 |
| Event registrations | `/organizer/events/:id/registrations` | owning organizer | `GET /api/events/:id/registrations` | F-06 |

The header shows the signed-in user's name and role (from `GET /api/me`) and a Logout button. Navigation links depend on the role. A participant who types an organizer URL sees the API's 403 message; the route guard in the UI is only for convenience.

### 3.2 Shared behavior (NFR-09)
| State | Behavior |
|---|---|
| Loading | Spinner or "Loading..." text in the content area while a request is pending |
| Empty | A plain message for an empty list, for example "No published events yet" |
| Error | The API `error.message` in an alert; 401 redirects to `/login`; 403 shows "You do not have access to this"; 404 shows "Not found" |
| Validation | Inline message under each field, from the API `details` of a 400 response; the form keeps the user's input |
| Submitting | The submit button is disabled while its request is pending, so a double click cannot send twice |
| Success | A short confirmation, and the list or detail reloads from the API so the screen shows saved data |

### 3.3 Sprint 2 additions (planned; contracts pending cross-review)
| Screen | Planned addition | Feature |
|---|---|---|
| My registrations | Show a Cancel control only for the participant's ACTIVE registrations; retain a cancelled row with its status after reload. | F-07 (A) |
| My events / event management | Allow an organizer to edit, close or cancel only their own events according to the F-08 state contract. | F-08 (B) |
| Create/edit event and event detail | Enter and display an optional registration deadline in the browser's local time; show the API's registration-closed message when a registration is refused. | F-09 (A), F-08 owns event PATCH |

## 4. API conventions

### 4.1 Rules
- REST over HTTPS, JSON bodies, prefix `/api`, plural nouns, camelCase fields.
- IDs are UUIDs. Times are ISO 8601 in UTC (`2026-11-20T09:00:00.000Z`); the UI shows local time.
- Every request body is validated with a zod schema before the service is called. Unknown fields are rejected.
- State-changing requests use `POST` or, for the F-08 event-edit operation, `PATCH`; each requires `Content-Type: application/json`, and other content types get 400.
- Responses never contain `passwordHash`, session tokens or token hashes.
- Lists are small in S1 and not paginated. NFR-05 (S3) revisits this.

### 4.2 Error shape and status codes (NFR-07, D-13)
```json
{ "error": { "code": "EVENT_FULL", "message": "This event has no places left.", "details": [] } }
```
`details` appears only for validation errors: `[{ "field": "capacity", "message": "Must be an integer from 1 to 10000" }]`.

| Status | Codes | When |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_START_TIME`, `INVALID_DEADLINE` (S2) | body or parameter invalid; start time not strictly in the future; or a supplied non-null registration deadline is not later than now or is later than `startsAt` (D-35) |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` | no valid session; wrong email or password (one generic message) |
| 403 | `FORBIDDEN` | wrong role on a role-restricted route (for any event ID), or a non-owner organizer on an owner-only operation of a PUBLISHED event |
| 404 | `NOT_FOUND`, `EVENT_NOT_FOUND` | record missing, a DRAFT requested by anyone except its owner (when the caller has the route's role), a hidden CANCELLED event, or another participant's registration |
| 409 | `EVENT_FULL`, `ALREADY_REGISTERED`, `EVENT_STARTED`, `TIME_CONFLICT`, `ALREADY_PUBLISHED`, `ALREADY_CANCELLED`, `CAPACITY_BELOW_ACTIVE`, `EVENT_HAS_REGISTRATIONS`, `EVENT_CLOSED`, `REGISTRATION_CLOSED` (S2) | a business rule rejects the request; the F-07/F-08/F-09 contracts define each state check and precedence before implementation |
| 500 | `INTERNAL_ERROR` | unexpected failure; generic message, details logged on the server only, no stack trace |

### 4.3 Endpoint inventory (S1)
The feature contracts define request, response and error details. This table fixes paths and owners so contracts do not overlap.

| Method and path | Purpose | Role | Feature | Main AC |
|---|---|---|---|---|
| `POST /api/auth/login` | sign in, set session cookie | anonymous | F-01 | AC-01, AC-02 |
| `POST /api/auth/logout` | delete session, clear cookie | any signed-in | F-01 | AC-04 |
| `GET /api/me` | current user (id, name, role; FR-03) | any signed-in | F-01 | AC-03 |
| `POST /api/events` | create a DRAFT event | organizer | F-02 | AC-06..AC-09, AC-29, AC-35 |
| `GET /api/events/mine` | own events, every status | organizer | F-02 | AC-33, AC-34 |
| `GET /api/events/:id` | one event; DRAFT only for its owner | any signed-in | F-02 (defines), F-03 (uses) | AC-31, AC-32 |
| `POST /api/events/:id/publish` | DRAFT to PUBLISHED | owning organizer | F-02 | AC-25, AC-26, AC-30, AC-36 |
| `GET /api/events` | PUBLISHED events with `remainingPlaces` | any signed-in | F-03 | AC-10, AC-11 |
| `POST /api/events/:id/registrations` | register the caller | participant | F-04 | AC-12..AC-16, AC-27, AC-28 |
| `GET /api/registrations/mine` | caller's registrations with event summary | participant | F-05 | AC-17 |
| `GET /api/registrations/:id` | one registration | its participant | F-05 | AC-18 |
| `GET /api/events/:id/registrations` | registrations of an event | owning organizer | F-06 | AC-19..AC-21 |

Express route order: `/api/events/mine` is declared before `/api/events/:id`.

### 4.4 Sprint 2 endpoint additions (planned; contracts pending cross-review)

| Method and path | Purpose | Role | Feature | Main AC |
|---|---|---|---|---|
| `PATCH /api/events/:id` | Edit an owner's event; F-09 supplies the optional `registrationDeadline` field and its validation rules | owning organizer | F-08 route; F-09 field rules | F-08 proposed AC-90..AC-109; F-09 proposed AC-82, AC-84..AC-87 |
| `POST /api/events/:id/close` | Move an eligible PUBLISHED event to CLOSED | owning organizer | F-08 | F-08 proposed AC-90..AC-109 |
| `POST /api/events/:id/cancel` | Cancel an eligible event and its ACTIVE registrations in one transaction | owning organizer | F-08 | F-08 proposed AC-90..AC-109 |
| `POST /api/registrations/:id/cancel` | Cancel the caller's own ACTIVE registration | participant | F-07 | AC-73..AC-79 |
| `POST /api/events` | Add the optional `registrationDeadline` field to event creation | organizer | F-02 route; F-09 field rules | F-09 proposed AC-81..AC-82, AC-84, AC-87 |
| `POST /api/events/:id/registrations` | Apply the deadline check in the existing registration flow | participant | F-04 route; F-09 deadline rule | F-09 proposed AC-83, AC-88 |

Every Event response from `POST /api/events`, `GET /api/events/mine`, `GET /api/events/:id`, `GET /api/events`, and `PATCH /api/events/:id` includes `registrationDeadline` as a UTC ISO 8601 instant or `null`, for My events, detail, browse, and edit screens. F-02 owns create, My events, and detail; F-03 owns the published list; F-08 owns PATCH; F-09 defines only the deadline field semantics. These are planned contract changes, not implemented behavior or verified results.

## 5. Roles and permissions

### 5.1 Role/permission matrix (S1)
Columns: **Anon** = no session; **Part** = participant; **Org own** = organizer who owns the event; **Org other** = organizer who does not.

| Operation | Anon | Part | Org own | Org other |
|---|---|---|---|---|
| Log in | allowed | n/a | n/a | n/a |
| Log out, read `/api/me` | 401 | allowed | allowed | allowed |
| List PUBLISHED events | 401 | allowed | allowed | allowed |
| Read a PUBLISHED event | 401 | allowed | allowed | allowed |
| Read a DRAFT event | 401 | 404 | allowed | 404 |
| Create event (as DRAFT) | 401 | 403 | allowed (becomes owner) | allowed (becomes owner) |
| List own events (`/mine`) | 401 | 403 | allowed (own only) | allowed (own only) |
| Publish a DRAFT | 401 | 403 | allowed | 404 |
| Register for an event | 401 | allowed if BR-02..BR-04 hold | 403 | 403 |
| List own registrations | 401 | allowed (own only) | 403 | 403 |
| Read one registration | 401 | own: allowed; another participant's: 404 | 403 | 403 |
| View an event's registrations | 401 | 403 | allowed | 403 (PUBLISHED), 404 (DRAFT) |

Check order on every protected route: session (401), then role (403), then existence and ownership (404 for a DRAFT or a foreign registration, 403 for a non-owner on a PUBLISHED event). So a participant who calls an organizer-only route gets 403 for every event ID, DRAFT or not, as AC-21 expects; the same answer for every ID reveals nothing. The DRAFT 404 rule applies to organizers who do not own the event (D-13).

### 5.2 Record access
| Record | Who can read it | Who can change it |
|---|---|---|
| User | the user (via `/api/me`); the owning organizer sees registrants' name and email only | nobody (seeded) |
| Event (DRAFT) | its owner | its owner (publish in S1; edit/cancel rules are S2) |
| Event (PUBLISHED) | every signed-in user | nobody in S1; owner edit/close/cancel rules are S2 (F-08) |
| Event (CLOSED/CANCELLED) | CLOSED remains listed; CANCELLED is omitted from normal browse and remains in its owner's My events list (D-34) | owner lifecycle rules are S2 (F-08) |
| Registration | its participant; the event's owner | created by its participant in S1; F-07 may cancel the participant's own ACTIVE row in S2 |

Identity and role always come from the session on the server. The API never accepts a user ID or role from the client for authorization.

### 5.3 Sprint 2 authorization notes (planned)
- F-07 cancellation requires a PARTICIPANT session and scopes the row to that session user. A foreign or unknown registration ID has the same 404 result; an ORGANIZER receives 403 (D-13, D-33).
- F-08 event management is owner-only and takes identity from the session. The F-08 contract supplies operation-specific state and D-13 ownership precedence before implementation.
- F-09 does not add a role or permission; deadline checks are part of the existing F-04 registration and F-02/F-08 event-write operations.

## 6. Authentication and session lifecycle (D-08)

| Step | Behavior |
|---|---|
| Credentials | Email and password. Passwords are stored only as bcrypt hashes, cost 12 (NFR-02 requires at least 10). Seed passwords come from `SEED_PASSWORD`, never from Git. |
| Login | `POST /api/auth/login`: validate body, find the user by lowercase email, compare with bcrypt. Unknown email and wrong password both return 401 `INVALID_CREDENTIALS` with the same message; an unknown email is still compared against a fixed dummy hash so response time does not reveal which accounts exist. |
| Session creation | Generate 32 random bytes (`crypto.randomBytes`), encode as base64url. Store only `SHA-256(token)` in `Session` with `expiresAt = now + SESSION_TTL_MINUTES` (60). |
| Cookie | `sid=<token>`; `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=3600`, `Secure` when `COOKIE_SECURE=true` (production). The token is never readable by JavaScript and never in a response body. |
| Each request | `requireSession` hashes the cookie token, loads the session with its user, rejects it if missing or `expiresAt <= now` (401, and the expired row is deleted), then sets `req.user`. Expiry is absolute: activity does not extend it. |
| Current user | `GET /api/me` returns `{ id, name, role }` from `req.user` (FR-03). |
| Logout | `POST /api/auth/logout` deletes the session row and clears the cookie. Replaying the old cookie afterwards returns 401 (AC-04). |
| Role guard | `requireRole('ORGANIZER')` or `requireRole('PARTICIPANT')` after `requireSession`; wrong role returns 403 `FORBIDDEN`. |

**CSRF stance.** The cookie is `SameSite=Lax`, so browsers do not send it on cross-site `POST` requests. Every state-changing request is a `POST` that must carry `Content-Type: application/json`, which a cross-site HTML form cannot send without a CORS preflight, and the API allows no cross-origin requests. Together these block cross-site request forgery in S1 without a CSRF token. A token is reconsidered if the API ever accepts cross-origin requests.

**Not in S1 (known limitations):** self-registration, password reset, login rate limiting, multiple roles per account. Rate limiting is planned for S3 hardening (F-13).

## 7. Error handling and logging
- One Express error handler turns known errors (`AppError` with status and code) into the JSON shape in 4.2.
- Unknown errors become 500 `INTERNAL_ERROR`; the stack trace is logged on the server and never sent (NFR-07).
- Request logs record method, path, status and duration. Passwords, cookies and tokens are never logged.

## 8. Configuration and secrets
| Variable | Used by | Example in `.env.example` | Secret |
|---|---|---|---|
| `DATABASE_URL` | server, Prisma | local PostgreSQL connection from `.env.example` (value omitted) | yes in production |
| `DATABASE_URL_TEST` | integration tests (D-14) | local test database connection from `.env.example` (value omitted) | no (local only) |
| `DATABASE_URL_E2E` | Playwright E2E (D-14) | local E2E database connection from `.env.example` (value omitted) | no (local only) |
| `PORT` | server | `3000` | no |
| `NODE_ENV` | server | `development` | no |
| `SESSION_TTL_MINUTES` | session lifetime | `60` | no |
| `COOKIE_SECURE` | cookie `Secure` flag | `false` (local), `true` (production) | no |
| `SEED_PASSWORD` | seed script | local-only placeholder (value omitted) | yes |

- Only `.env.example`, with placeholder values, is committed; `.env` and `.env.*` are gitignored.
- No secret is placed in client code, docs, screenshots or the PDF.
- In production, secrets come from GCP Secret Manager as environment variables (Lab 5).
- Local PostgreSQL runs from `docker-compose.yml` with three databases: dev, test and E2E.

## 9. Test architecture
| Level | Tool | Database | Covers |
|---|---|---|---|
| Unit | Vitest | none | pure rules: start-time check with an injected `now`, capacity input validation |
| API/DB integration | Vitest + Supertest | `DATABASE_URL_TEST`, files run one at a time, tables truncated in `beforeEach` (D-14) | persistence, permissions, ownership, error codes, concurrency (TEST-15 last place, TEST-37 NFR-04 scenario, TEST-60 two requests by one participant under BR-10) |
| End-to-end | Playwright | `DATABASE_URL_E2E`, reset and seeded before each run | TEST-22..TEST-24 critical journeys |

Test names start with their TEST and AC IDs, for example `TEST-13 AC-13 rejects registration when event is full`.

## 10. Deployment design (planned, Lab 5)
```mermaid
flowchart LR
  GH["GitHub main<br/>(reviewed release PR)"] --> CI["GitHub Actions<br/>build + tests"]
  CI --> IMG["Docker image<br/>(UI build + API)"]
  IMG --> AR["Artifact Registry"]
  AR --> CR["Cloud Run service"]
  CR --> SQL[("Cloud SQL<br/>PostgreSQL 16")]
  SM["Secret Manager"] -. env vars .-> CR
```
- **Image:** one multi-stage Dockerfile builds the UI with Vite and the server with `tsc`, then runs Node with only production dependencies. Express serves the UI and the API, so one container is enough.
- **Database:** Cloud SQL for PostgreSQL 16 keeps data across restarts and redeployments (NFR-06). Migrations run with `prisma migrate deploy` as a release step before traffic moves to the new revision.
- **Configuration:** the variables in section 8 are set on the Cloud Run service; secrets come from Secret Manager; `COOKIE_SECURE=true`.
- **Pipeline:** PRs run build and tests; a failed required check blocks the merge. Merges to `main` build the image and deploy it, with a manual approval step if needed.
- The exact GCP access method follows the Lab 5 instructions; Sprint 1 only has to be Docker-ready (no host paths, configuration from environment variables, stateless server).

## 11. NFR design mapping
| NFR | Design element | Section |
|---|---|---|
| NFR-01 unauthenticated → 401, no private data | `requireSession` on every protected route | 1.3, 5.3, 6 |
| NFR-02 bcrypt cost ≥ 10, hash never returned | bcrypt cost 12; response mappers omit `passwordHash` | 2.1, 6 |
| NFR-03 backend role and ownership checks | `requireRole` + service ownership checks; S1 matrix and S2 authorization notes | 1.3, 5 |
| NFR-04 20 parallel requests, capacity 5 → exactly 5 ACTIVE | row lock transaction (D-10); verified by TEST-37 | 1.3, 9 |
| NFR-05 list p95 < 500 ms with 1,000 events (S3) | indexed `status`, `startsAt`; pagination if needed | 4.1 |
| NFR-06 data survives restart | PostgreSQL volume locally, Cloud SQL in production | 8, 10 |
| NFR-07 server validation, uniform errors, no stack traces | zod at routes, one error handler | 4.2, 4.4, 7 |
| NFR-08 runs from README in ≤ 10 commands | docker compose + npm scripts | 2.3, 8 |
| NFR-09 loading, empty, error states | shared UI behavior | 3.2 |

## 12. Version history
| Version | Date | Change | Author | Reviewer |
|---|---|---|---|---|
| 1.0 | 2026-11-07 | First System-Level SDS for Deliverable 1 (Issue #15) | B (stickkersz) | A (songt888) |
| 1.1 | 2026-11-07 | PR #49 review: `/api/me` fields match FR-03; check order and D-13 precedence made explicit; NFR-04 verified by TEST-37 | B (stickkersz) | A (songt888) |
| 1.2 | 2026-11-27 | Lab 7 CR-01 (#134): BR-10 row in 1.3 with the lock order event row, then participant row (extends D-10); `TIME_CONFLICT` in the 4.2 409 codes; TEST-60 in 9 | B (stickkersz), with Claude Code | A (songt888) |
| 1.3 draft | 2026-11-27 | Issue #200 contract preparation: mark S2 data additions, API error codes, endpoint additions, Event response fields and authorization as planned from D-33..D-35. F-07/F-09 are A's drafts; F-08 remains B-owned. Configuration examples omit connection credentials and seed-password values. No S2 behavior is implemented or verified. | A (songt888) | Pending B (stickkersz) |
