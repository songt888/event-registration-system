# Lab 6: Sprint 1 UAT cases (Part A, L6-01 #120)

Product: Event Registration and Attendance System (CPE 334 Theme 3), team EN-009_P3.
Release under test, URL, accounts and cleanup: see [`handoff.md`](handoff.md). Scope: the Sprint 1 contract only (F-01 to F-06), D-27.

**How to run.** Manual tests in a desktop browser (Chrome or Edge), on the production URL. UAT-01, UAT-02 and UAT-05 create distinct events (D-28). Run UAT-04 after your own UAT-01, and UAT-03 after UAT-01 or UAT-02. Save each event’s exact title and URL for later steps. Start each case signed out, using Logout between cases if needed. See the handoff for the suggested order. Replace `<XX>` with the tester's initials and `<HHMM>` with the current time, for example `UAT-KK-01-1430`. Where a step says "sign out", use the **Logout** button in the bottom taskbar. Record what you actually see, not what is written under "Expected".

**Text that appears on every page.** After sign-in the bottom taskbar shows the user's name and role, for example `Organizer One (Organizer)`, and the links `Events`, plus `My registrations` (participant) or `My events` (organizer).

| Case | Category | Sprint 1 refs |
|---|---|---|
| UAT-01 | Normal domain journey | F-01, F-02, F-03, F-04; AC-01, AC-06, AC-25, AC-10, AC-12, AC-24 |
| UAT-02 | Business rule and boundary | F-02, F-04; BR-02, BR-03; AC-07, AC-29, AC-13, AC-14 |
| UAT-03 | Forbidden role and ownership | F-02, F-04, F-06; BR-05; AC-08, AC-20, AC-21, AC-33, AC-34 |
| UAT-04 | State, history and persistence | F-01, F-05, F-06; AC-04, AC-17, AC-19, AC-24 |
| UAT-05 | Draft visibility | F-02, F-03; AC-10, AC-31, AC-32 |
| UAT-06 | Sign-in errors and signed-out access | F-01; AC-02, AC-03, AC-24 |

Not covered by manual UAT (covered by automated tests in the repo, named here so the UAT team knows they are out of the manual scope): concurrent requests for the last place (AC-15, AC-37), session expiry after 60 minutes (AC-40), and requests the UI cannot send, such as an organizer calling the register API directly (AC-16) or a participant reading another participant's registration by ID (AC-18) or a participant submitting a registration for a DRAFT event (AC-27). The browser checks the create-event denial in UAT-03; TEST-08 checks that no draft row is stored. UAT-04 observes the logout flow in the browser; TEST-04 checks server-side session revocation.

---

## UAT-01 Normal journey: organizer publishes, participant registers

- **Purpose:** the main Sprint 1 journey works end to end.
- **Roles and accounts:** Organizer One (ORGANIZER), then Participant 3 (PARTICIPANT).
- **Preconditions:** signed out. A browser window wide enough to show the tables.
- **Synthetic inputs:** Title `UAT-<XX>-01-<HHMM>`; Description `UAT normal journey`; Location `UAT room 1`; Starts at: tomorrow, 10:00; Capacity `3`.

| Step | Action | Expected result |
|---|---|---|
| 1 | Open the URL. Sign in as Organizer One. | The **Events** page opens. The bottom taskbar shows `Organizer One (Organizer)` and a `My events` link. |
| 2 | Click **My events**, then **Create event**. | The **Create event** form shows the fields Title, Description, Location, Starts at (your local time), Capacity and the button **Save draft**. |
| 3 | Fill in the inputs above and click **Save draft**. | **My events** opens with `Draft "UAT-<XX>-01-<HHMM>" saved.` The new row shows Places left `3 of 3`, Status `DRAFT` and a **Publish** button. |
| 4 | Click **Publish** on that row. | The row's Status becomes `PUBLISHED` and the **Publish** button disappears. |
| 5 | Sign out. | The **Sign in** page opens. |
| 6 | Sign in as Participant 3. Open **Events**. | The new event is listed with its location `UAT room 1` and `3 of 3 places left`. |
| 7 | Click the event title. | The event page shows the title, description, location, start time, `3 of 3 places left` and a **Register** button. |
| 8 | Click **Register**. | The message `You are registered for this event.` appears, and the places text changes to `2 of 3 places left`. |
| 9 | Click **My registrations**. | The table lists the event with Location `UAT room 1` and Status `ACTIVE`. |

Leave this event in place; UAT-04 can reuse it.

---

## UAT-02 Business rules: invalid input, capacity limit and duplicates

- **Purpose:** the system rejects invalid events, never exceeds capacity, and allows one active registration per participant per event.
- **Roles and accounts:** Organizer One; Participant 3; Participant 4.
- **Preconditions:** signed out.
- **Synthetic inputs:** Title `UAT-<XX>-02-<HHMM>`; Location `UAT room 2`; Starts at: tomorrow, 10:00; Capacity `1`. Invalid values: Capacity `0`; Starts at: yesterday, 10:00.

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as Organizer One. **My events** → **Create event**. Fill in the inputs, but with Capacity `0`. Click **Save draft**. | The form stays open. Under Capacity: `Number must be greater than or equal to 1`; above the button: `The request is invalid.` No draft is saved. |
| 2 | Set Capacity `1`, set Starts at to yesterday 10:00, click **Save draft**. | The form stays open with `The start time must be in the future.` No draft is saved. |
| 3 | Set Starts at to tomorrow 10:00 and click **Save draft**. | **My events** shows `Draft "UAT-<XX>-02-<HHMM>" saved.` with `1 of 1` and `DRAFT`. Only one row with this title exists (steps 1 and 2 saved nothing). |
| 4 | Click **Publish**. Sign out. | Status `PUBLISHED`; then the **Sign in** page. |
| 5 | Sign in as Participant 3. Open the event from **Events**. Click **Register**. | `You are registered for this event.`; the places text becomes `Full`. |
| 6 | Click **Register** again on the same page. | `You are already registered for this event.` The places text stays `Full`. |
| 7 | Sign out. Sign in as Participant 4. Open the same event. | It shows `Full`. The **Register** button is still shown (the server decides). |
| 8 | Click **Register**. | `This event has no places left.` |
| 9 | Click **My registrations**. | `UAT-<XX>-02-<HHMM>` is **not** listed for Participant 4. |
| 10 | Sign out. Sign in as Organizer One. **My events** → **Registrations** on the event. | The heading reads `UAT-<XX>-02-<HHMM>: 1 registrations` and the only row is `Participant 3`, Status `ACTIVE`. |

---

## UAT-03 Forbidden role and ownership

- **Purpose:** a user cannot see or change data that belongs to another role or another organizer, and a refused action changes nothing.
- **Roles and accounts:** Organizer One, Organizer Two, Participant 3.
- **Preconditions:** an event of Organizer One with at least one registration. Use the event from UAT-01 or UAT-02, or run UAT-01 first. Note its **Registrations** page address (`…/organizer/events/<id>/registrations`) while signed in as Organizer One.

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as Organizer One. **My events** → **Registrations** on the event. Note the address and the rows. Sign out. | The list shows the registrations (names, emails, `ACTIVE`). |
| 2 | Sign in as Organizer Two. Paste the noted address into the address bar. | `You do not have access to this`. No name, email or count of Organizer One's registrations is shown. |
| 3 | Click **My events**. | Organizer Two's own events only (for example `Robotics club open day`); none of Organizer One's events. |
| 4 | In **Events**, open Organizer One’s event from step 1 using its exact title. | The event page shows no **Register** button for an organizer. |
| 5 | Sign out. Sign in as Participant 3. Paste the noted Registrations address. | `You do not have access to this`. No registration data is shown. |
| 6 | Type the address `/organizer/events` (after the host). | The page shows `You do not have access to this.` and a **Try again** button; no event table. |
| 7 | Type `/organizer/events/new`, fill in a title `UAT-<XX>-03-<HHMM>`, location `X`, a start time tomorrow and capacity `5`, click **Save draft**. | `You do not have access to this.` The form stays open; no `Draft … saved` message. |
| 8 | Sign out. Sign in as Organizer One. Open the same **Registrations** page. | The registrations for the selected event match step 1. Capture the denial and lack of a success message in step 7 as browser evidence. Organizer One’s My events only shows owned events, so use TEST-08 separately for the no-draft DB assertion. |

---

## UAT-04 State and persistence: data survives sign-out and later sessions

- **Purpose:** registrations are stored on the server, survive sign-out and sign-in, and are shown to the right people only.
- **Roles and accounts:** Participant 3, Organizer One, Participant 4.
- **Preconditions:** UAT-01 done by this tester (Participant 3 registered for `UAT-<XX>-01-<HHMM>`). Save that event’s exact title and URL. Participant 4 must have no registration for it. If the fixture is missing, run UAT-01 first, then sign out before starting UAT-04.

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as Participant 3. **My registrations**. | `UAT-<XX>-01-<HHMM>` is listed with Status `ACTIVE`. Record the target event row. |
| 2 | Sign out. | The **Sign in** page opens. |
| 3 | Use the browser **Back** button, or type `/my/registrations`. | The **Sign in** page opens again; the list is not shown. |
| 4 | Close the browser completely, open it again, open the URL. | The **Sign in** page (the session ended at logout). |
| 5 | Sign in as Participant 3. **My registrations**. | The same target event row as in step 1, `UAT-<XX>-01-<HHMM>`, `ACTIVE`. |
| 6 | Open the event from the list. | `2 of 3 places left` (or fewer if other testers registered). |
| 7 | Sign out. Sign in as Organizer One. **My events** → **Registrations** on `UAT-<XX>-01-<HHMM>`. | The list contains `Participant 3`, `participant3@example.com`, `ACTIVE`, with the registration time from UAT-01. |
| 8 | Sign out. Sign in as Participant 4. **My registrations**. | `UAT-<XX>-01-<HHMM>` is **not** listed. |
| 9 | Retest session only: repeat step 5 on the corrected release. | The registration from the first session is still listed (data survived the redeploy). |

---

## UAT-05 Draft events are hidden from participants

- **Purpose:** an unpublished event cannot be seen or registered for by participants.
- **Roles and accounts:** Organizer One, Participant 3.
- **Preconditions:** signed out.
- **Synthetic inputs:** Title `UAT-<XX>-05-<HHMM>`; Location `UAT room 5`; Starts at: tomorrow, 10:00; Capacity `5`.

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as Organizer One. Create the event (**Save draft**). Do **not** publish. | Row with `DRAFT`. |
| 2 | Click the event title in **My events**. Note the address (`…/events/<id>`). | The event page opens for its owner. No **Register** button. |
| 3 | Sign out. Sign in as Participant 3. Open **Events**. | `UAT-<XX>-05-<HHMM>` is **not** listed. |
| 4 | Paste the noted address. | `Not found`. No title, location or **Register** button. |

---

## UAT-06 Sign-in errors and signed-out access

- **Purpose:** wrong credentials reveal nothing, and private pages need a session.
- **Roles and accounts:** none, then Participant 3.
- **Preconditions:** signed out.
- **Synthetic inputs:** a wrong password `wrong-password-1`; an unknown email `nobody@example.com`.

| Step | Action | Expected result |
|---|---|---|
| 1 | Open the URL. | The app opens the **Sign in** page (not the events list). |
| 2 | Type `/my/registrations` after the host. | The **Sign in** page. |
| 3 | Sign in with `participant3@example.com` and `wrong-password-1`. | `Email or password is incorrect.` The password field is cleared. Still on **Sign in**. |
| 4 | Sign in with `nobody@example.com` and `wrong-password-1`. | Exactly the same message as step 3; nothing says whether the email exists. |
| 5 | Sign in as Participant 3 with the correct password. | The **Events** page; bottom taskbar shows `Participant 3 (Participant)`. |
