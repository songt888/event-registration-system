# UI before and after (Issue #73, D-15)

Sub-task 73.2 (#75). Seven S1 screens at 1280 px and 375 px wide.

- **Before:** `sprint-1-staging` at `18ff2ba` (before #73, browser defaults).
- **After:** `feature/s1-73-ui-screens` at `d358b31` (PR #76 base plus the 73.2 markup).

How the screenshots were taken: `npm run dev` on the seeded dev database, 2026-11-08. Headless Chromium (Playwright) with reduced motion, so the 3D layer and animations are off.

Accounts: `participant1@example.com` for Events, Event detail and My registrations; `organizer1@example.com` for My events, Create event and Event registrations ("Career talk (small room)"). Login is taken signed out.

Files are named `<screen>-<before|after>-<width>.png`. The screens are `login`, `events`, `event-detail`, `create-event`, `my-events`, `my-registrations` and `event-registrations`.

## Accessibility check (73.2 screens, at d358b31)

| Screen | Keyboard: tab stops checked | Tab stops without a visible focus ring | Status light without its word |
|---|---|---|---|
| My events `/organizer/events` | 24 | 0 | 0 |
| Create event `/organizer/events/new` | 24 | 0 | 0 |
| Event registrations `/organizer/events/:id/registrations` | 22 | 0 | 0 |
| My registrations `/my/registrations` | 23 | 0 | 0 |

- **Not color alone:** every status light keeps its word (PUBLISHED, DRAFT, ACTIVE) next to the light.
- **Contrast:** 73.2 adds no new color, so the values computed in PR #76 apply (lowest 4.9:1).
- **Phone width (375 px):** before, the Event registrations page scrolled sideways. After, the page does not scroll sideways; a wide table scrolls inside its window, using the shared rule `table { display: block; overflow-x: auto; }`.
