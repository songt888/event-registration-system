# Lab 6 — UAT handoff to the partner team (Part A, L6-01 #120)

From the Product Team EN-009_P3: Kirakit Kingkaew (67070503460, A) and Nattakit Prasertsak (67070503413, B).
To the UAT Team: _partner team name and members, filled in after L6-02 (#121)_.

## 1. What you are testing

| Item | Value |
|---|---|
| Product | Event Registration and Attendance System (CPE 334 Theme 3). Organizers publish events with limited places; participants register; organizers see who registered |
| URL | https://s47a6b53b-4d7hbszvwq-as.a.run.app |
| Release under test | tag `v0.1.2-lab5`, commit `04e8590` (`main`), Cloud Run revision `s47a6b53b-00005-5l7` (D-27) |
| Accepted-for-test scope | Sprint 1 only: F-01 sign in, sign out and current user; F-02 organizer creates and publishes an event; F-03 browse published events; F-04 participant registers; F-05 participant's own registrations; F-06 organizer's registrations of an own event. Contract: `docs/sprints/sprint-1/` at tag `v0.1.0-sprint1` |
| Out of scope (Sprint 2 and 3, not part of this acceptance) | cancelling a registration, registration deadlines, check-in, attendance reports, waitlist, self sign-up, password recovery, editing or deleting events |
| Cases | [`uat-cases.md`](uat-cases.md): UAT-01 to UAT-06 |
| Repository | https://github.com/songt888/event-registration-system |

If we deploy a new revision during your testing window, we tell you first and give you the new revision name. Your results apply to the revision you record.

## 2. Accounts

All accounts are synthetic demo accounts. **The password is the same for all of them and is sent to you privately** (not in this document, Git or any PDF). Please do not change it or share it outside your team.

| Label | Sign-in email | Role | Use in |
|---|---|---|---|
| Organizer One | `organizer1@example.com` | ORGANIZER | UAT-01 to UAT-05 |
| Organizer Two | `organizer2@example.com` | ORGANIZER | UAT-03 |
| Participant 3 | `participant3@example.com` | PARTICIPANT | UAT-01 to UAT-06 |
| Participant 4 | `participant4@example.com` | PARTICIPANT | UAT-02, UAT-04 |

Participant One and Participant 2 are used by our own demo data and evidence; please do not use them.

## 3. Data setup

Nothing to set up. The production database already holds the demo accounts and these events, which you will see in the lists:

| Event | Owner | State |
|---|---|---|
| Intro to Git workshop | Organizer One | published |
| Career talk (small room) | Organizer One | published, 2 places |
| Hackathon planning (draft) | Organizer One | draft (visible to Organizer One only) |
| Robotics club open day | Organizer Two | published |

Please **do not register for these events**. Sprint 1 has no cancellation, so a registration is permanent and would change the demo data. Every case creates its own event, titled `UAT-<your initials>-<case number>-<HHMM>`.

## 4. Order, independence and cleanup

- Cases are independent and can run in any order, except two that reuse earlier data: **UAT-04 needs UAT-01** by the same tester, and **UAT-03 needs an event with a registration** (from UAT-01 or UAT-02). Suggested order: UAT-06, UAT-01, UAT-04, UAT-02, UAT-03, UAT-05.
- Each case can be rerun: use a new `<HHMM>` so the title is unique.
- Cleanup: none needed, and none is possible in Sprint 1 (no delete or cancel). Leave the `UAT-…` events in place; we never reset the production database (D-20, D-28).
- Expected time: about 30 to 40 minutes for all six cases.

## 5. Notes for testers

- The app has a decorative retro "desktop" look. On the first visit a short start-up screen plays over the sign-in page; wait for it to finish. Each page sits in a window with three round buttons at its top left (close, minimize, maximize). If you close or minimize a window by accident, click the folder icon or the taskbar button to reopen it. These buttons are decoration and not part of the tested scope.
- Dates are shown and entered in your browser's local time.
- Sound effects can be turned off with the **Sound on** button in the header.
- Record times in local time (UTC+7) together with the revision you tested.

## 6. How to report a finding

Open a GitHub Issue in our repository (https://github.com/songt888/event-registration-system/issues) with the title `UAT finding: <short summary>`, or use the channel agreed in L6-02. Please include: case ID and step, tested revision, account label (never the password), preconditions, steps to reproduce, expected result, actual result, severity (critical, major, minor) with the user impact, and a screenshot. We reply with our triage decision (accepted defect, duplicate, not-defect or enhancement) and the reason.

## 7. Contacts and sessions

_Filled in after L6-02 (#121): contact names, the agreed channel, and the times for the first run, the correction window and the retest._
