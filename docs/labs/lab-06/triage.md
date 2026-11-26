# Lab 6 — Triage of findings received about our app (Part C, L6-05 #124)

Product: Event Registration and Attendance System, team EN-009_P3. Findings from UAT team Est (EN-033).

| Item | Value |
|---|---|
| Release under test | tag `v0.1.2-lab5`, commit `04e8590`, Cloud Run revision `s47a6b53b-00005-5l7` (D-27) |
| Contract used for triage | Sprint 1 feature contracts in `docs/sprints/sprint-1/` at `v0.1.0-sprint1` (`12dcd3c`); `f-01-auth.md`, `f-02-publish-event.md` and `f-04-register.md` are unchanged between `12dcd3c` and `04e8590` |
| Findings received | 8, GitHub Issues #141 to #148, opened by Est (ninja) on 2026-11-26 15:47–15:48 (UTC+7) from an exploratory session on 2026-11-25 21:40–21:46 that used an AI-driven browser tool. Est's six agreed cases (UAT-01 to UAT-06) had no recorded result at the time of this triage |
| Revision served at test time | Est wrote "served revision not confirmed". The last Deploy workflow run before the session, run 44941012107 on 2026-11-22 02:27 (UTC+7) from `04e8590`, created `s47a6b53b-00005-5l7`, and no Deploy run has happened since. This covers workflow deploys only; a manual Cloud Shell deploy would not show here (check: `gcloud run revisions list`, L6-06) |
| Owners | A (songt888): #142, #143, #145, #146. B (stickkersz): #141, #144, #147, #148 |

**Fixing enhancements.** An enhancement keeps its class; when the team decides to fix it in Lab 6 it first gets a new AC/TEST in the feature contract (committed before the RED test), because no Sprint 1 AC covers it.

**Classes.** Accepted defect: the behavior breaks a Sprint 1 acceptance criterion or feature contract line. Enhancement: the contract does not require the behavior; we may still improve it. Not a defect: the app does what the contract says and the report expects something else. Duplicate: same cause as another finding, linked to it. **Severity** is by user impact: critical (data loss, security breach, main journey impossible), major (a contract behavior fails and the user cannot continue without a workaround, or it blocks acceptance), minor (wrong or confusing but the task can be completed).

## Summary

| Issue | Finding | Est's severity | Class | Our severity | Owner | Fix status |
|---|---|---|---|---|---|---|
| [#142](https://github.com/songt888/event-registration-system/issues/142) | After logout in another tab, the first tab keeps the account and menu | major | **Accepted defect** | **major** | A | fix in [L6-09 #156](https://github.com/songt888/event-registration-system/issues/156) (AC-56/TEST-56), released in `v0.1.3-lab6` |
| [#143](https://github.com/songt888/event-registration-system/issues/143) | Places-left count stale after a refused duplicate registration | minor | Enhancement | minor | A | fix in [L6-10 #157](https://github.com/songt888/event-registration-system/issues/157) (AC-62/TEST-62), released in `v0.1.3-lab6` |
| [#145](https://github.com/songt888/event-registration-system/issues/145) | Form errors not tied to their fields with ARIA attributes | minor | Enhancement | minor | A | fix in [L6-12 #159](https://github.com/songt888/event-registration-system/issues/159) (AC-64/TEST-64), released in `v0.1.3-lab6` |
| [#146](https://github.com/songt888/event-registration-system/issues/146) | "Draft … saved." stays after the event is published | minor | Enhancement | minor | A | fix in [L6-11 #158](https://github.com/songt888/event-registration-system/issues/158) (AC-63/TEST-63), released in `v0.1.3-lab6` |
| [#141](https://github.com/songt888/event-registration-system/issues/141) | Very long title, location or description breaks the layout | major | **Accepted defect** | minor | B | fix in L6-06 (`fix/l6-NN-long-text`) |
| [#144](https://github.com/songt888/event-registration-system/issues/144) | Description line breaks are lost on the event page | minor | Enhancement | minor | B | optional in L6-06; otherwise Sprint 3 |
| [#147](https://github.com/songt888/event-registration-system/issues/147) | At 320 px the Restore button sticks out about 81 px | minor | Enhancement | minor | B | optional in L6-06; otherwise Sprint 3 |
| [#148](https://github.com/songt888/event-registration-system/issues/148) | Window buttons on the Not found page have no page name | minor | Enhancement | minor | B | Sprint 3 accessibility hardening (F-13) |

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
- **Fix plan (L6-09 #156, released in L6-06):** AC-56/TEST-56 added to `f-01-auth.md` before the test. Clear the displayed user once, in `AuthProvider`, when any API call returns 401; RED first as an E2E test with two pages in one browser context (logout in one, protected navigation in the other expects the Sign in page and no repeated requests), then GREEN, then `npm test` and `npm run test:e2e`.

Run 1 (16:03–16:05) is not used as a result: before the after-click capture the browser recorded a reload, Back or address-bar action on tab A, so its `/login` screen ([E-C142-4](evidence/l6-05/E-C142-4-run1-invalid-tab-reloaded.jpg)) does not show the click alone. Run 2 added a console logger first; the logger survived, so no reload happened.

### #143 Places-left count stays stale after a refused duplicate registration: enhancement, minor

- **Contract:** `f-04-register.md` section 6, line 72: "Success: … the event reloads from the API. Error: the API `error.message` in an alert". The contract reloads the event only on success.
- **Code matches the contract:** `EventsPage.tsx` calls `reload()` only after a 201; a 409 shows `You are already registered for this event.`, which is the AC-14 behavior Est observed.
- **Reason for the class:** the refusal and its message are correct, and no AC asks for a reload after an error. Showing the current count after any 409 is a fair improvement (one `reload()` in the error path).
- Not reproduced on production: the code path above is unconditional; Est's report and the code agree.
- **Decision:** the class stays enhancement (no Sprint 1 AC is broken), but the team fixes it now: new AC-62/TEST-62 in `f-04-register.md`, L6-10 #157, released in `v0.1.3-lab6`.

### #145 Form errors are not exposed to assistive technology: enhancement, minor

- **Contract:** `f-01-auth.md` line 55 "Show field validation …"; `f-02-publish-event.md` line 28 "Show validation errors near fields or in the form". Neither, nor NFR-09, requires `aria-invalid`, `aria-describedby` or `aria-errormessage`.
- **Current behavior:** every field error and the form error are rendered with `role="alert"` next to their field (`LoginPage.tsx`, `CreateEventPage.tsx`), so screen readers announce them when they appear; they are not programmatically tied to the input.
- **Reason for the class:** no Sprint 1 AC is broken. Est classified our report of the same gap in their app (Food-order #131) as an enhancement for Sprint 3; we classify ours the same way.
- **Decision:** the class stays enhancement, but the team fixes it now instead of in Sprint 3: new AC-64/TEST-64 in `f-02-publish-event.md` (pointer in `f-01-auth.md`), L6-12 #159, released in `v0.1.3-lab6`.

### #146 "Draft … saved." stays after the event is published: enhancement, minor

- **Contract:** `f-02-publish-event.md` line 28 "On 201 confirm the draft was saved and navigate to My events" and line 29 "reload on 200" after Publish. It says nothing about removing the saved confirmation.
- **Cause:** the message comes from the navigation state (`MyEventsPage.tsx:17`, shown at line 58); the browser keeps that state on reload, so the message stays until the user leaves the page.
- **Reason for the class:** the confirmation was true when shown and the row status is correct; no AC is broken. It is confusing next to `PUBLISHED`, and clearing it on Publish is a one-line change.
- Not reproduced on production: the code path is unconditional; Est's report and the code agree.
- **Decision:** the class stays enhancement, but the team fixes it now: new AC-63/TEST-63 in `f-02-publish-event.md`, L6-11 #158, released in `v0.1.3-lab6`.

## B's findings

### #141 Very long title, location or description breaks the layout: accepted defect, minor

- **Contract:** `f-02-publish-event.md` line 22 accepts title and location of 1..120 characters and a description of 0..2000; line 29 asks My events to "show Publish only on owned DRAFT rows"; `f-03-browse-events.md` line 54 asks Event detail to show the title, description and location. A value the API accepts must therefore be shown without hiding the Publish control.
- **Cause (code at `04e8590`):** `client/src/styles.css` has no `overflow-wrap` or `word-break` rule, so a long string with no spaces cannot wrap; below 640 px `th, td { white-space: nowrap; }` (line 469) also stops wrapping in the My events list. The row grows to the string's width and Publish moves off screen.
- **Reason for the class:** contract-valid input makes the Publish control and the detail text unusable without scrolling sideways, so a contract behavior fails. It is not a duplicate of another finding.
- **Severity minor** (Est proposed major): the task can still be completed by scrolling sideways to Publish, no data is wrong, and it needs an unbroken 120-character title or a description with no spaces, which normal event text does not have. We fix it anyway in L6-06.
- **Fix plan (L6-06):** `overflow-wrap: anywhere` on window content, list cells and the event detail text; RED first as an E2E test that saves a 120-character title with no spaces and checks that Publish is inside the viewport at 1280 px and at 375 px, then GREEN, then `npm test` and `npm run test:e2e`.
- Not reproduced by B on production yet; Est's report, their saved event (`/events/6e0c7e76-…`) and the CSS above agree.

### #144 Description line breaks are lost on the event page: enhancement, minor

- **Contract:** `f-03-browse-events.md` line 54 says Event detail "Shows title, description, location"; `f-02-publish-event.md` line 22 defines the description as a string of 0..2000 characters. Neither says that line breaks are kept on screen.
- **Current behavior:** the API stores and returns the description with its line breaks; `EventsPage.tsx` line 102 renders it as `<p>{e.description}</p>`, and HTML collapses the breaks into spaces. The text itself is complete.
- **Reason for the class:** no AC is broken and no data is lost. Keeping the author's line breaks is a fair improvement (`white-space: pre-line` on that paragraph).
- Not reproduced on production: the rendering is unconditional; Est's report and the code agree.

### #147 At 320 px the Restore button sticks out about 81 px: enhancement, minor

- **Contract:** D-15 asks for working close, minimize and maximize buttons, 24 px window buttons and everything usable by keyboard. No Sprint 1 contract, AC or NFR sets a minimum screen width.
- **Cause:** below 640 px `header nav` does not wrap (`flex-wrap: nowrap`, `styles.css` line 473) and the minimized task button (`.task-min`) carries the full window title, so at 320 px it runs past the right edge.
- **Reason for the class:** Est reports the visible part is still clickable, so Restore still works by mouse and keyboard; no contract line is broken. Keeping the button inside the viewport (truncate the title with an ellipsis) is a fair improvement.
- Not reproduced by B on production yet; Est's measurement and the CSS above agree.

### #148 Window buttons on the Not found page have no page name: enhancement, minor

- **Contract:** system SDS 3.2 says a 404 shows "Not found", which the page does. D-15 asks for visible focus and keyboard use of the window buttons; no contract line sets their accessible names.
- **Cause:** the window title comes from the page's `h1` (`Layout.tsx` lines 35–38). The catch-all route in `App.tsx` line 28 renders `<p>Not found</p>` with no `h1`, so the title is never set: it stays empty on a first load (Est's "Restore window:") and keeps the previous page's name after navigation.
- **Reason for the class:** the buttons have a name and work; only the page part of the name is missing, and no AC covers it. Giving the Not found page an `h1` would fix both cases.
- **Plan:** Sprint 3 accessibility hardening (F-13), or with #147 if L6-06 has room.

## Replies to Est

Each Issue gets a comment with the class, the reason with the contract line, the severity and the fix plan, linked to this file. Est is told on Discord before the L6-06 deploy.
