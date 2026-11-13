# L5-02 Cloud-ready app: engineering contract (Lab 5)

Lab 5 requirements R-02 (settings from the environment) and R-04 (data survives a restart and a redeploy); decisions D-18 (one container serves the UI and the API) and D-20 (releases never reset data). Plan: `lab5-plan.md`.

## 1. Behavior

- **Built UI from the API.** When `CLIENT_DIST` names a folder that contains `index.html`, the API serves the files in it. Any `GET` path outside `/api` that is not a file returns `index.html`, so a reload on `/events/<id>` works. Without `CLIENT_DIST` nothing changes (local development keeps the Vite dev server).
- **Unknown API paths.** A request to an `/api` path that no route handles returns 404 with the standard shape `{ "error": { "code": "NOT_FOUND", "message": "Not found." } }`, never the UI page, never a stack trace.
- **Demo seed for releases.** `npm run seed:demo` creates the demo accounts (organizer1, organizer2, participant1 to participant4 at example.com) and the four demo events only when they are missing, with passwords from `SEED_PASSWORD` (bcrypt cost 12). It never deletes or updates a row. Running it again, or on a database that already has real data, changes nothing. The destructive `npm run seed` stays for local, test and E2E use only.

## 2. Environment variables added

| Name | Purpose | Secret | Source |
|---|---|---|---|
| `CLIENT_DIST` | folder with the built UI, served by the API | no | set in the image (`/app/client/dist`); unset locally |

## 3. Acceptance criteria

| AC | Criterion |
|---|---|
| AC-52 | With `CLIENT_DIST` set, `GET /` and `GET /events/<any id>` return the UI page (`text/html`), a file under `CLIENT_DIST` is served as itself, and an unknown `/api` path returns 404 `NOT_FOUND` in the standard error shape without a stack trace. |
| AC-53 | `npm run seed:demo` run twice leaves exactly one of each demo account and demo event; a registration and a non-demo user created between the runs are still there, unchanged; demo passwords verify against `SEED_PASSWORD` and are bcrypt cost 12 hashes. |

## 4. System test specification

| TEST / AC | Level | Precondition | Steps | Expected result |
|---|---|---|---|---|
| TEST-52 / AC-52 | API integration (Supertest) | temporary folder with `index.html` (marker text) and `assets/app.js`; `CLIENT_DIST` points to it | `GET /`; `GET /events/123`; `GET /assets/app.js`; `GET /api/unknown` | 200 HTML with the marker; 200 HTML with the marker; 200 with the file content; 404 `{ error: { code: "NOT_FOUND", message } }`, no `stack` key, not HTML |
| TEST-53 / AC-53 | DB integration | empty test database | run `npm run seed:demo`; record counts and password hashes; create one registration (participant2, "Intro to Git workshop") and one non-demo user; run `npm run seed:demo` again | 6 demo users and 4 demo events after each run; hashes unchanged after the second run; the registration and the extra user still exist; demo hashes are bcrypt cost 12 and verify |

## 5. Version history

| Version | Date | Change | Review |
|---|---|---|---|
| 1.0 | 2026-11-13 | First L5-02 contract | pending B's review |
