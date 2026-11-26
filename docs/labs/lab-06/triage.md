# Lab 6 — Triage of findings received about our app (Part C, L6-05 #124)

Product: Event Registration and Attendance System, team EN-009_P3. Findings from UAT team Est (EN-033).

| Item | Value |
|---|---|
| Release under test | tag `v0.1.2-lab5`, commit `04e8590`, Cloud Run revision `s47a6b53b-00005-5l7` (D-27) |
| Contract used for triage | Sprint 1 feature contracts in `docs/sprints/sprint-1/` at `v0.1.0-sprint1` (`12dcd3c`); `f-01-auth.md`, `f-02-publish-event.md` and `f-04-register.md` are unchanged between `12dcd3c` and `04e8590` |
| Findings received | 8, GitHub Issues #141 to #148, opened by Est (ninja) on 2026-11-26 15:47–15:48 (UTC+7) from an exploratory session on 2026-11-25 21:40–21:46 that used an AI-driven browser tool. Est's six agreed cases (UAT-01 to UAT-06) had no recorded result at the time of this triage |
| Revision served at test time | Est wrote "served revision not confirmed". The last Deploy workflow run before the session, run 44941012107 on 2026-11-22 02:27 (UTC+7) from `04e8590`, created `s47a6b53b-00005-5l7`, and no Deploy run has happened since. This covers workflow deploys only; a manual Cloud Shell deploy would not show here (check: `gcloud run revisions list`, L6-06) |
| Owners | A (songt888): #142, #143, #145, #146. B (stickkersz): #141, #144, #147, #148 |

**Classes.** Accepted defect: the behavior breaks a Sprint 1 acceptance criterion or feature contract line. Enhancement: the contract does not require the behavior; we may still improve it. Not a defect: the app does what the contract says and the report expects something else. Duplicate: same cause as another finding, linked to it. **Severity** is by user impact: critical (data loss, security breach, main journey impossible), major (a contract behavior fails and the user cannot continue without a workaround, or it blocks acceptance), minor (wrong or confusing but the task can be completed).

## Summary

| Issue | Finding | Est's severity | Class | Our severity | Owner | Fix status |
|---|---|---|---|---|---|---|
| [#142](https://github.com/songt888/event-registration-system/issues/142) | After logout in another tab, the first tab keeps the account and menu | major | **Accepted defect** | **major** | A | fix in L6-06 (`fix/l6-NN-stale-session`) |
| [#143](https://github.com/songt888/event-registration-system/issues/143) | Places-left count stale after a refused duplicate registration | minor | Enhancement | minor | A | optional in L6-06; otherwise Sprint 3 |
| [#145](https://github.com/songt888/event-registration-system/issues/145) | Form errors not tied to their fields with ARIA attributes | minor | Enhancement | minor | A | Sprint 3 accessibility hardening (F-13) |
| [#146](https://github.com/songt888/event-registration-system/issues/146) | "Draft … saved." stays after the event is published | minor | Enhancement | minor | A | optional in L6-06; otherwise Sprint 3 |
| [#141](https://github.com/songt888/event-registration-system/issues/141) | Very long title, location or description breaks the layout | major | _B: pending_ | | B | |
| [#144](https://github.com/songt888/event-registration-system/issues/144) | Description line breaks are lost on the event page | minor | _B: pending_ | | B | |
| [#147](https://github.com/songt888/event-registration-system/issues/147) | At 320 px the Restore button sticks out about 81 px | minor | _B: pending_ | | B | |
| [#148](https://github.com/songt888/event-registration-system/issues/148) | Window buttons on the Not found page have no page name | minor | _B: pending_ | | B | |

## A's findings

### #142 After logout in another tab, the first tab keeps showing the account and menu: accepted defect, major

- **Reproduced** by A by hand on production, 2026-11-26 16:07–16:08 (UTC+7), Participant 3, revision `s47a6b53b-00005-5l7`; Claude Code took the screenshots and read the route and request log in the browser console on A's word ([E-C142-7](evidence/l6-05/E-C142-7-run2-request-log.txt)).
  1. Tab A and tab B signed in; A pressed **Logout** in tab B → tab B shows Sign in.
  2. Tab A still shows `Participant 3 (Participant)` and the menu, while `GET /api/me` from tab A already returns 401 ([E-C142-3](evidence/l6-05/E-C142-3-run1-tab-a-stale-after-logout.jpg), [E-C142-5](evidence/l6-05/E-C142-5-run2-tab-a-stale-after-logout.jpg)).
  3. A clicked **My registrations** once in tab A. `GET /api/registrations/mine` → 401; the route passes through `/login` and back to `/events` in under 5 ms; then `GET /api/events` → 401 is sent **198 times in 12.3 s** (about 16 per second) and stops. The window area stays empty, the taskbar still shows `Participant 3 (Participant)`, no message is shown, and the Sign in page never stays ([E-C142-6](evidence/l6-05/E-C142-6-run2-tab-a-blank-after-click.jpg), [E-C142-7](evidence/l6-05/E-C142-7-run2-request-log.txt)).
- **Contract broken:** `f-01-auth.md` section 5, line 57 "Session bootstrap: … 401 clears local user display and opens `/login`" and line 59 "Protected navigation: Missing/expired/revoked session redirects to `/login`".
- **Cause:** on a 401 each page renders `<Navigate to="/login">`, but nothing clears `user` in `AuthProvider` (`client/src/auth.tsx`). `LoginPage.tsx:26` (`if (user) return <Navigate to="/events" replace />`) sends the tab straight back, and `/events` gets 401 again.
- **Severity major** (we agree with Est): after a logout elsewhere the tab is unusable until a manual reload, it gives no message, and the browser repeats failed requests against the server. No data is exposed: every request is refused by the server (AC-04, TEST-04 still hold).
- **Not covered by our UAT cases:** UAT-04 checks logout and Back in a single tab only. The retest adds this two-tab check.
- **Fix plan (L6-06):** clear the displayed user once, in `AuthProvider`, when any API call returns 401; RED first as an E2E test with two pages in one browser context (logout in one, protected navigation in the other expects the Sign in page and no repeated requests), then GREEN, then `npm test` and `npm run test:e2e`.

Run 1 (16:03–16:05) is not used as a result: before the after-click capture the browser recorded a reload, Back or address-bar action on tab A, so its `/login` screen ([E-C142-4](evidence/l6-05/E-C142-4-run1-invalid-tab-reloaded.jpg)) does not show the click alone. Run 2 added a console logger first; the logger survived, so no reload happened.

### #143 Places-left count stays stale after a refused duplicate registration: enhancement, minor

- **Contract:** `f-04-register.md` section 6, line 72: "Success: … the event reloads from the API. Error: the API `error.message` in an alert". The contract reloads the event only on success.
- **Code matches the contract:** `EventsPage.tsx` calls `reload()` only after a 201; a 409 shows `You are already registered for this event.`, which is the AC-14 behavior Est observed.
- **Reason for the class:** the refusal and its message are correct, and no AC asks for a reload after an error. Showing the current count after any 409 is a fair improvement (one `reload()` in the error path).
- Not reproduced on production: the code path above is unconditional; Est's report and the code agree.

### #145 Form errors are not exposed to assistive technology: enhancement, minor

- **Contract:** `f-01-auth.md` line 55 "Show field validation …"; `f-02-publish-event.md` line 28 "Show validation errors near fields or in the form". Neither, nor NFR-09, requires `aria-invalid`, `aria-describedby` or `aria-errormessage`.
- **Current behavior:** every field error and the form error are rendered with `role="alert"` next to their field (`LoginPage.tsx`, `CreateEventPage.tsx`), so screen readers announce them when they appear; they are not programmatically tied to the input.
- **Reason for the class:** no Sprint 1 AC is broken. Est classified our report of the same gap in their app (Food-order #131) as an enhancement for Sprint 3; we classify ours the same way.
- **Plan:** Sprint 3 hardening (F-13): add `aria-invalid` and `aria-describedby` to the Sign in and Create event fields.

### #146 "Draft … saved." stays after the event is published: enhancement, minor

- **Contract:** `f-02-publish-event.md` line 28 "On 201 confirm the draft was saved and navigate to My events" and line 29 "reload on 200" after Publish. It says nothing about removing the saved confirmation.
- **Cause:** the message comes from the navigation state (`MyEventsPage.tsx:17`, shown at line 58); the browser keeps that state on reload, so the message stays until the user leaves the page.
- **Reason for the class:** the confirmation was true when shown and the row status is correct; no AC is broken. It is confusing next to `PUBLISHED`, and clearing it on Publish is a one-line change.
- Not reproduced on production: the code path is unconditional; Est's report and the code agree.

## B's findings

_To be added by B: #141, #144, #147, #148._

## Replies to Est

Each Issue gets a comment with the class, the reason with the contract line, the severity and the fix plan, linked to this file. Est is told on Discord before the L6-06 deploy.
