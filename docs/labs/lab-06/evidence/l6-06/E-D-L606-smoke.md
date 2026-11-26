# E-D-L606-smoke: post-deploy smoke check of v0.1.3-lab6

Release `v0.1.3-lab6`, commit `502d2a6`, Cloud Run revision `s47a6b53b-00006-7bv`, URL https://s47a6b53b-4d7hbszvwq-as.a.run.app.
Tester: Kirakit Kingkaew (A) signed in by hand; Claude Code drove the built-in browser and read the page (DOM and network log). Manual test. Synthetic demo accounts only; no password recorded.

## Without a session (curl, 2026-11-26 16:26 UTC)
| Request | Expected | Actual |
|---|---|---|
| `GET /`, `GET /login` | 200 HTML | 200 `text/html` |
| `GET /api/me`, `GET /api/events` | 401 JSON error shape | 401 `{"error":{"code":"UNAUTHENTICATED","message":"Please sign in."}}` |
| served bundle `/assets/index-CcXia3Aw.js` | contains the Lab 6 changes | contains "Capacity is required." (L6-18), `taskbar-h` (L6-20), `allSettled` (L6-17) |

## Signed in (built-in browser, Chrome)
| ID | Time (UTC) | Account | Action | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| E-D-L606-smoke-1 | 16:33:21 | Participant 3 | open `/organizer/events/00000000-0000-4000-8000-000000000000/registrations` | "You do not have access to this"; no "Not found", no table (AC-69) | alert "You do not have access to this"; no "Not found"; no table | PASS |
| E-D-L606-smoke-2 | 16:32:13 | Organizer One | Create event at 320 x 568, scroll to the end | Save draft above the taskbar (AC-72 a) | Save draft bottom y 432, taskbar top y 459 (109 px tall), `#root` padding 120 px; 0 px covered | PASS |
| E-D-L606-smoke-3 | 16:32:32 | Organizer One | fill every field except Capacity (title `UAT-A-SMOKE-L606-2332`), press Save draft | "Capacity is required.", no `POST /api/events`, stays on Create event (AC-70 b) | alert `capacity-error: Capacity is required.`; Capacity `aria-invalid="true"`, `aria-describedby="capacity-error"`; URL `/organizer/events/new`; network log has no POST to `/api/events`; title kept | PASS |

Also seen: as Organizer One, the same unknown-ID registrations URL shows "Not found" (API 404 `EVENT_NOT_FOUND`), as D-13 specifies for an organizer.

## Finding during the check
At a 727 px wide viewport, signed in as Participant 3, the taskbar is 2 rows: Logout sits 42 px below Events (taskbar items need 710 px, 703 px available). Nothing is covered (the page reserves the taskbar's height), but AC-72 states "from 641 px the taskbar is one row"; TEST-72 checks 768 and 812 px only. Not one of Est's reported widths.
