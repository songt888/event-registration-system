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
| [#141](https://github.com/songt888/event-registration-system/issues/141) | Very long title, location or description breaks the layout | major | **Accepted defect** | minor | B | fix in [L6-13 #161](https://github.com/songt888/event-registration-system/issues/161) (AC-65/TEST-65, PR #162), released in `v0.1.3-lab6` |
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
- **Fix (L6-13 #161, PR #162, released in L6-06):** AC-65/TEST-65 added to `f-02-publish-event.md` before the test. RED `820b97e` (My events 1783 px wider than the 1280 px viewport), GREEN `4ca4d1a`: `overflow-wrap: break-word` in windows, `min-width: 0` on event cards and detail columns, and a width cap on list cells (16rem; location 12rem). `overflow-wrap: anywhere` was tried first and dropped because it broke normal words ("Engineeri / ng hall" at 768 px). Normal pages keep every box unchanged at 1280, 768 and 375 px; `npm test` 69 passed, E2E 6 passed.
- **Reproduced** by B on 2026-11-26 17:04 (UTC+7), automated (Playwright), on `04e8590` run locally with the seeded database, not on production ([log](evidence/l6-05/E-C-B-repro-log.txt)). A 120-character title and location and a 2000-character description, none with spaces: at 1280 px My events is 2863 px wide and Publish sits at x 2765 to 2850; at 375 px Publish sits at x 2490 to 2571; the detail page is 24,387 px wide (Est measured about 22,800). The long row widens the whole list, so the Status and Publish columns of **every** row move off screen, not only the long one ([E-C141-1](evidence/l6-05/E-C141-1-my-events-1280.png), [E-C141-2](evidence/l6-05/E-C141-2-my-events-375.png), [E-C141-3](evidence/l6-05/E-C141-3-detail-1280.png)). Scrolling sideways to Publish and pressing it still publishes the event.

### #144 Description line breaks are lost on the event page: enhancement, minor

- **Contract:** `f-03-browse-events.md` line 54 says Event detail "Shows title, description, location"; `f-02-publish-event.md` line 22 defines the description as a string of 0..2000 characters. Neither says that line breaks are kept on screen.
- **Current behavior:** the API stores and returns the description with its line breaks; `EventsPage.tsx` line 102 renders it as `<p>{e.description}</p>`, and HTML collapses the breaks into spaces. The text itself is complete.
- **Reason for the class:** no AC is broken and no data is lost. Keeping the author's line breaks is a fair improvement (`white-space: pre-line` on that paragraph).
- **Reproduced** by B on 2026-11-26 17:04 (UTC+7), same local run ([log](evidence/l6-05/E-C-B-repro-log.txt)): the API returns `"line one\nline two\nline three"`; the detail paragraph has `white-space: normal` and shows `line one line two line three` on one line ([E-C144-1](evidence/l6-05/E-C144-1-detail-one-line.png)).

### #147 At 320 px the Restore button sticks out about 81 px: enhancement, minor

- **Contract:** D-15 asks for working close, minimize and maximize buttons, 24 px window buttons and everything usable by keyboard. No Sprint 1 contract, AC or NFR sets a minimum screen width.
- **Cause:** below 640 px `header nav` does not wrap (`flex-wrap: nowrap`, `styles.css` line 473) and the minimized task button (`.task-min`) carries the full window title, so at 320 px it runs past the right edge.
- **Reason for the class:** Est reports the visible part is still clickable, so Restore still works by mouse and keyboard; no contract line is broken. Keeping the button inside the viewport (truncate the title with an ellipsis) is a fair improvement.
- **Reproduced** by B on 2026-11-26 17:04 (UTC+7), same local run ([log](evidence/l6-05/E-C-B-repro-log.txt)): at 320 px after Minimize, `Restore window: My registrations` spans x 251 to 399, 79 px past the right edge (Est measured about 81). Focusing it and pressing Enter restores the window ([E-C147-1](evidence/l6-05/E-C147-1-restore-320.png)).

### #148 Window buttons on the Not found page have no page name: enhancement, minor

- **Contract:** system SDS 3.2 says a 404 shows "Not found", which the page does. D-15 asks for visible focus and keyboard use of the window buttons; no contract line sets their accessible names.
- **Cause:** the window title comes from the page's `h1` (`Layout.tsx` lines 35–38). The catch-all route in `App.tsx` line 28 renders `<p>Not found</p>` with no `h1`, so the title is never set: it stays empty on a first load (Est's "Restore window:") and keeps the previous page's name after navigation.
- **Reason for the class:** the buttons have a name and work; only the page part of the name is missing, and no AC covers it. Giving the Not found page an `h1` would fix both cases.
- **Reproduced** by B on 2026-11-26 17:04 (UTC+7), same local run ([log](evidence/l6-05/E-C-B-repro-log.txt)): opening `/no-such-page` first and pressing Minimize gives `Restore window: ` with no name ([E-C148-1](evidence/l6-05/E-C148-1-first-load-minimized.png)); opening it after Events gives `Restore window: Events`, the previous page's name ([E-C148-2](evidence/l6-05/E-C148-2-after-events-minimized.png)).
- **Plan:** Sprint 3 accessibility hardening (F-13), or with #147 if L6-06 has room.

## Second batch: #151 to #155

Opened by Est (vienggd) on 2026-11-26 16:50–16:52 (UTC+7) against the same release (`v0.1.2-lab5`, `04e8590`, `s47a6b53b-00005-5l7`), from a Playwright and source review on 2026-11-26 15:55–16:15 (UTC+7). Owners: A (songt888) #152, #153, #155; B (stickkersz) #151, #154.

| Issue | Finding | Est's severity | Class | Our severity | Owner | Fix status |
|---|---|---|---|---|---|---|
| [#152](https://github.com/songt888/event-registration-system/issues/152) | Create event and Publish stay on the page after the session ends | minor | **Duplicate of #142** | minor | A | fixed by L6-09 (PR #167, AC-56), released in `v0.1.3-lab6` |
| [#153](https://github.com/songt888/event-registration-system/issues/153) | Event registrations shows "Not found" or 403 to a participant, depending on which request answers first | minor | **Accepted defect** | minor | A | fix in [L6-17 #172](https://github.com/songt888/event-registration-system/issues/172) (AC-69/TEST-69), released in `v0.1.3-lab6` |
| [#155](https://github.com/songt888/event-registration-system/issues/155) | Password cleared after a 400 on Sign in; blank Capacity says "greater than or equal to 1" | minor | Enhancement | minor | A | fix in [L6-18 #173](https://github.com/songt888/event-registration-system/issues/173) (AC-70/TEST-70), released in `v0.1.3-lab6` |
| [#151](https://github.com/songt888/event-registration-system/issues/151) | Taskbar covers Save draft at 320 px; Logout wraps at 768–812 px | major / minor | _B: pending_ | | B | |
| [#154](https://github.com/songt888/event-registration-system/issues/154) | My events shows Create event to a participant above the 403 message | minor | _B: pending_ | | B | |

### #152 Create event and Publish stay on the page after the session ends: duplicate of #142

- **Reproduced** locally on `04e8590` by Claude Code on A's instruction, 2026-11-26, with a throwaway Playwright script (not committed): organizer1 in two tabs, Logout in tab B, then in tab A Save draft stays on `/organizer/events/new` and Publish stays on `/organizer/events`, each with only the inline "Please sign in." message.
- **Cause:** the same as #142: nothing in the client cleared the signed-in user on a 401, so pages that do not redirect themselves keep their content.
- **Fixed by** L6-09 (PR #167, AC-56: any 401 from the API clears the signed-in user): the same script on `lab6-staging` `4bf235b` opens the Sign in page for both actions. Est's retest of `v0.1.3-lab6` includes these steps.

### #153 Event registrations shows a different error for the same URL: accepted defect, minor

- **Contract:** `f-05-f-06-registrations.md` section 3 and system SDS 5.1: a participant gets 403 for every event ID on this route (AC-21, which the API passes). Section 6 maps 403 to "You do not have access to this" and 404 to "Not found".
- **Cause:** `EventRegistrationsPage.tsx` sends `GET /api/events/:id` and `GET /api/events/:id/registrations` together with `Promise.all` and shows the first error. For an unknown or DRAFT ID the event request gives 404, so the page shows "Not found" whenever that answer comes first.
- **Reason for the class:** one URL must give one answer; the page's answer depends on timing. The existence point in the report adds nothing new: `GET /api/events/:id` already answers 404 for a missing or DRAFT event and 200 for a PUBLISHED one to any signed-in user (F-03).
- **Fix plan (L6-17 #172):** new AC-69/TEST-69 in the F-06 contract; the test delays the registrations response so the event answer always comes first (deterministic RED).

### #155 Password cleared after a 400; blank Capacity message: enhancement, minor

- **Contract:** `f-01-auth.md` section 5 Validation/error: "retain email, keep the password out of logs"; it does not require keeping the password. `f-02-publish-event.md` line 22: capacity must be an integer 1..10000; the blank field is sent as `0` and refused with 400 `VALIDATION_ERROR`, nothing is stored. No wording is set.
- **Reason for the class:** both behaviors meet the Sprint 1 contract; both are fair usability improvements.
- **Decision:** the class stays enhancement, but the team fixes it now: new AC-70/TEST-70 in `f-02-publish-event.md` (pointer in `f-01-auth.md`), L6-18 #173, released in `v0.1.3-lab6`.

## Replies to Est

Each Issue gets a comment with the class, the reason with the contract line, the severity and the fix plan, linked to this file. Est is told on Discord before the L6-06 deploy.
