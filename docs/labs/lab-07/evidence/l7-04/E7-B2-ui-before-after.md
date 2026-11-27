# E7-B2 UI: the CR-01 change on the event page, before and after (L7-04 #136)

Captured by B on 2026-11-27 17:01 (UTC+7), automated (Playwright, Chromium, 1280 x 800), on a local build with the E2E database reset and seeded before each run. Same scenario as TEST-61 (`e2e/time-conflict.spec.ts`), run once per commit from a temporary capture script that was not committed. Accounts by label only; the seed password comes from the local environment and is not recorded.

Scenario: Organizer Two creates and publishes "L7 capture: event 60 min after Career talk", 60 minutes after the seeded "Career talk (small room)", capacity 5. Participant One, who already holds an ACTIVE registration for Career talk, opens the new event and presses Register.

| Figure | Commit | Event page after Register | `GET /api/registrations/mine` afterwards |
|---|---|---|---|
| `E7-B2-before-502d2a6.png` | `502d2a6` (pre-change, `v0.1.3-lab6`) | "You are registered for this event.", 4 of 5 places left | `["L7 capture: event 60 min after Career talk:ACTIVE","Career talk (small room):ACTIVE"]` (both kept: the old rule allows the conflict) |
| `E7-B2-after-861f01f.png` | `861f01f` (release `v0.2.0-lab7`) | alert "You are already registered for another event that starts within 2 hours of this one.", 5 of 5 places left | `["Career talk (small room):ACTIVE"]` (nothing stored) |

Each figure is the event window and the taskbar (signed-in user) cropped from the full 1280 x 800 capture.
