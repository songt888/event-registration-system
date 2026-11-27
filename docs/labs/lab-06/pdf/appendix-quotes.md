<!-- Appendices A3 and A4 of the Lab 6 PDF: review and decision text quoted from GitHub (L6-08 #127). -->

## Appendix A3: review of our UAT cases and handoff (PR #128)

PR #128 (L6-01 #120), author A, reviewer B. Merged 2026-11-24 23:10 (UTC+7) as `f5089dc`.

**B, CHANGES_REQUESTED, 2026-11-24 15:22 (UTC+7), at `d7f005d`:**

> dry-ran all 6 cases on the live URL bro, every step matched except the notes below. no app defects found.
>
> **Please change in this PR**
> - `handoff.md` section 3: "Hackathon planning (draft)" is PUBLISHED on production (seed makes it DRAFT, I tested published it later), participants see it with a Register button, and it now has 1 registration (Participant 4, from my dry-run, 24 Nov 15:17). Change the row to "published (title says draft), 49 of 50 places" so the partner does not report it as a draft leak.
> - `uat-cases.md` intro and step texts: user name/role and **Logout** are in the bottom taskbar, not "the header" / "top right". Fix the wording.
> - UAT-03 step 4: say which event, e.g. "Organizer One's event from step 1 (its page under Events)".
> - AC refs for UAT-03 and UAT-04 differ from `lab6-plan.md` section 4. Make both files match (whichever list is right).
>
> **Optional** (things a partner tester may report; add one line to expected results or handoff section 5 if you agree)
> - after registering, the event page still shows **Register** (second click gives "already registered").
> - after **Publish**, the green `Draft "..." saved.` message stays on screen.
> - participant on `/organizer/events` sees "You do not have access to this." but still a **Create event** button.
>
> **No action needed**
> - CI will run once #119 merges (it adds `lab6-staging` to `ci-docker.yml`); update this branch after that.
> - my dry-run data: UAT-NP-01-1505, UAT-NP-02-1510, UAT-NP-05-1512 (draft) under Organizer One.

**B, APPROVED, 2026-11-24 23:10 (UTC+7), at `e22c20a`:**

> rechecked e22c20a bro, all fixed, CI green. approving.

## Appendix A4: Est's final decision on our release (our Issue #126)

Posted by Garunyapas Danpitakkul (`vienggd`) for team Est, 2026-11-27 03:18 (UTC+7):

> **Final Sprint 1 Acceptance Decision — UAT Team Est (EN-033)**
>
> - **Decision:** **Accepted**
> - **Version tested:** tag `v0.1.3-lab6`, commit `502d2a6`, Cloud Run revision `s47a6b53b-00006-7bv` (live bundle `index-CcXia3Aw.js` / `index-DM5hmvTK.css`)
> - **Testers & date:** Garunyapas Danpitakkul (`vieng`), Dechayut Panyawutvorakul (`ninja`) — **2026-11-27**
>
> **Re-test summary (all PASS)**
> - **All 13 findings verified PASS:** `#141–#148` (re-tested by Dechayut's side on `2026-11-27 02:15–02:46 UTC+7`, commented on each Issue) and `#151–#155` (re-tested by Garunyapas's side on `2026-11-27 00:20–00:23 UTC+7`, commented on each Issue).
> - **All affected Sprint 1 UAT cases PASS:** `UAT-01`, `UAT-02` (`10/10`), `UAT-03` (`8/8`), `UAT-04` (including step 9 persistence of `UAT-GD-01-2128` across redeploy + `RT-F02` two-tab logout), and `UAT-06`.
> - **Open critical/major/minor defects:** `0` · **BLOCKED cases:** `0`
>
> **Non-blocking observations (no open defects)**
> 1. `#151` documented known limitation in your updated `f-01-auth.md` v1.6 contract ("at 768 px and wider"): at `727 px`, a Participant taskbar still wraps `Logout` onto a second row (`0 px` overlap), while all reported widths (`320 / 768 / 812 px`) pass with `0 px` overlap. Because `641–735 px` lies outside your v1.6 contract and nothing is obscured, we do not treat it as an open limitation against acceptance.
> 2. `#147` observation: at `320 px`, the `Restore` window button fits completely inside the viewport and works with its full accessible name, though its visible label ellipsizes.
>
> _Provenance: Both students directed AI-assisted browser re-tests (`vieng` via Playwright Chromium `2×` DPR; `ninja` via Claude built-in browser signing in each account by hand) and agreed together on **Accepted**._
