# CR-01: reject a registration that starts within 2 hours of another of the participant's events (F-04, BR-10)

Lab 7, Part A. Issue L7-01 (#133). Author: Kirakit Kingkaew (A). Reviewer: Nattakit Prasertsak (B).
This request and the revised contract (L7-02, #134) are reviewed and merged into `lab7-staging` before any test or code for the change (D-31).

## 1. Change request

| Item | Value |
|---|---|
| Feature | F-04 Register for an event (Sprint 1) |
| Original requirement | FR-06: a participant registers for a PUBLISHED event that has not started; reject full, duplicate, hidden/missing or started-event cases. BR-03: at most one ACTIVE registration per participant per event. |
| Implemented rule (old) | `registerForEvent` in `server/src/registrations.service.ts` checks only, in order: event exists and is PUBLISHED (404 `EVENT_NOT_FOUND`), not started (409 `EVENT_STARTED`), not already registered for this event (409 `ALREADY_REGISTERED`), a place is left (409 `EVENT_FULL`). A participant may hold ACTIVE registrations for any number of events at the same start time. |
| New rule (BR-10) | A participant may not hold two ACTIVE registrations for events whose start times are **less than 120 minutes apart**. A registration whose event `startsAt` is within 120 minutes (either side) of the `startsAt` of another event the participant is ACTIVE-registered for is rejected with 409 `TIME_CONFLICT` and stores nothing. |
| Reason | A participant cannot attend two events at once, and a place held for an event they cannot attend is taken from someone else. Events have no end time in Sprint 1, so a fixed 2-hour window around the start time stands for "at the same time". |
| Scope | Registration (F-04) API and its UI message only. No change to event creation and publishing (F-02), browsing (F-03), My registrations (F-05) or the organizer list (F-06). No schema change, no migration. |
| Accepted Sprint 1 baseline | tag `v0.1.0-sprint1`, commit `12dcd3c` (old rule) |
| Pre-change implementation | `main` `502d2a6` = tag `v0.1.3-lab6`, Cloud Run revision `s47a6b53b-00006-7bv`. Between the baseline and this commit: Lab 5 Docker, CI/CD and deploy (`v0.1.2-lab5`) and Lab 6 client fixes (`v0.1.3-lab6`); no server file changed after Lab 5 (`git diff 04e8590 502d2a6 -- server` is empty), so `registerForEvent` is unchanged. |
| Approval | Instructor/TA approval is not required. Approver: Suthep Madarasmi (instructor, admin of the course group). Where: announcement post "Lab 7 Spec Sheet Change" in the course group; date: shown as "2 days ago" when A captured it on 2026-11-27, so about 2026-11-25. Evidence: [screenshot](evidence/cr-01-instructor-announcement.webp). Its text: *"You need not get Instructor or TA Approval for your change request to Sprint 1. Think of a good change to Sprint 1 among yourselves, but do try to make it a complex enough added feature and not just a trivial change."* This replaces the labsheet 3.1 step "Obtain instructor/TA approval before implementation". Why CR-01 is not trivial: a new business rule with an exact boundary, a new error code, a new check in the locked registration transaction with a second row lock to stay correct under concurrent requests (AC-60), and a UI message. Teammate review of this request: Nattakit Prasertsak (B), on the L7-01 PR; the review text and date are copied into section 6 when it is merged. |

## 2. Exact rule and boundaries

- Distance = |target event `startsAt` − other event `startsAt`|. **Distance < 120 minutes → 409 `TIME_CONFLICT`. Distance = 120 minutes exactly → allowed.** The same start time (distance 0) is a conflict.
- Only the participant's own **ACTIVE** registrations count. Other participants' registrations never matter.
- The other event counts whatever its state, also if it has already started, because the participant is still attending it.
- The target event itself is excluded, so a repeat registration still gives `ALREADY_REGISTERED`, not `TIME_CONFLICT`.
- Check order: 404 missing/DRAFT → 409 `EVENT_STARTED` → 409 `ALREADY_REGISTERED` → **409 `TIME_CONFLICT`** → 409 `EVENT_FULL`. A full event that also conflicts gives `TIME_CONFLICT`.
- Message: `You are already registered for another event that starts within 2 hours of this one.` No other event's ID or title is returned.
- Roles and access unchanged: only PARTICIPANT (403 for ORGANIZER); identity from the session only (a `participantId` in the body is still 400).
- Concurrency: two parallel requests by the same participant for two conflicting events give exactly one 201 and one 409. In the D-10 transaction, after the event row lock, the participant's `User` row is locked `FOR UPDATE` before the conflict check (lock order: event, then participant). Without it, two transactions holding locks on two different events could both see no conflict and both insert.
- Existing data: registrations made before the release that already conflict are kept as they are (no migration, no cancellation). The rule applies to new registrations only.

## 3. Acceptance criteria (new IDs)

- **AC-57** Registering for an event 119 minutes after, 119 minutes before, or at the same time as one of the participant's ACTIVE events gives 409 `TIME_CONFLICT`; no row is stored and remaining places are unchanged. (TEST-57)
- **AC-58** Registering for an event exactly 120 minutes after or before gives 201. (TEST-58)
- **AC-59** The check is per participant: another participant with no registration near that time registers for the same event (201). A repeat registration for the same event still gives `ALREADY_REGISTERED`; a full event that also conflicts gives `TIME_CONFLICT`. (TEST-59)
- **AC-60** Two concurrent requests by one participant for two events 60 minutes apart store exactly one ACTIVE registration; the other request gets 409 `TIME_CONFLICT`. (TEST-60)
- **AC-61** On the event page the participant sees the message above and the places text does not change (E2E, or a manual post-deployment check labelled manual). (TEST-61)

## 4. Impact

| Item | Affected? | Where | What changes / reason |
|---|---|---|---|
| Requirement | yes | `docs/srs.md` FR-06, new BR-10 | FR-06 adds the time-conflict rejection; BR-10 states the rule and the 120-minute boundary |
| Feature SDS | yes | `docs/sprints/sprint-1/f-04-register.md` sections 1, 2, 4, 7, 10, 11, 13 | linked BR-10; new step in the workflow; new failure row and error code; AC-57 to AC-61; STS TEST-57 to TEST-61; version row "CR-01, Lab 7" |
| System SDS | yes | `docs/system-sds.md` 1.3, 4.2, 12 | rule enforced in the service layer inside the D-10 transaction with the extra participant row lock; `TIME_CONFLICT` added to the 409 codes |
| Traceability | yes | `docs/traceability.md` | BR-10 → F-04 → AC-57..61 → TEST-57..61 |
| Code | yes | `server/src/registrations.service.ts` `registerForEvent` | new error, participant row lock, one query on the participant's ACTIVE registrations joined to their events' `startsAt` |
| Callers | no change | `server/src/registrations.routes.ts` (only caller) | route, status mapping and body validation stay; the new `AppError` goes through the existing error handler |
| API validation | no | zod body/params in `registrations.routes.ts` | the request body is still empty; the rule needs only the event and the session user |
| UI | check only | `client/src/EventsPage.tsx` `EventDetailPage` | on `502d2a6`, `registerError` shows the API `message` for any 409 other than 403/404, and the event is reloaded after a 409 (AC-62, finding #143); the places text is unchanged because nothing is stored. TEST-61 confirms; code changes only if it fails |
| Roles and ownership | no change | `requireRole('PARTICIPANT')`, session identity | the check reads only the session user's own registrations; no other participant's data is read or returned |
| Persistence | no | Prisma schema, migrations | no new column or index; the query uses the existing `Registration(participantId)` relation |
| Historical data | no | production database | existing conflicting registrations are kept; nothing is migrated or cancelled (D-20) |
| Migrations | no | `server/prisma/migrations` | not needed: no schema change |
| Other features | no | F-02, F-03, F-05, F-06 | they read events and registrations but never create a registration |
| Lab 6 UAT | yes, timing | Lab 6 case UAT-02 | UAT-02 registers Participant 3 for two events at the same time; the release waits for the partner's retest (D-31) |
| Seed and demo data | no | `server/prisma/seed.ts`, `seed-demo.ts` | seeds insert registrations directly, not through `registerForEvent`; the demo seed adds no registrations that conflict under BR-10 (checked in L7-04) |

## 5. Preserved behavior (regression)

These Sprint 1 results must not change. The same tests run before and after, unchanged.

| AC | Behavior | Tests |
|---|---|---|
| AC-12 to AC-16 | register, full, duplicate, last place, organizer refused | TEST-12 to TEST-16 (`registrations.int.test.ts`) |
| AC-27, AC-28 | DRAFT/missing 404, started 409 | TEST-27, TEST-28 |
| AC-37 | capacity under 20 parallel requests | TEST-37 (`registrations.limits.int.test.ts`) |
| AC-43, AC-44 | session required; no body fields | TEST-43, TEST-44 |
| AC-17, AC-18 | My registrations, own rows only | TEST-17, TEST-18 |
| AC-19 to AC-21 | organizer list, own events only | TEST-19 to TEST-21 |
| AC-22, AC-23 | E2E golden journey and full event | TEST-22, TEST-23 (Playwright) |

Checked on `502d2a6`: the integration tests reset the database per test and register a participant through the API for one event only (other rows are inserted directly with Prisma, which BR-10 does not check). E2E TEST-22 registers Participant 1 for an event next week, 3 days from their seeded Career talk registration (day 10); TEST-23 registers Participant 2 only for Career talk. So no old expected result changes under BR-10. Fixtures that need two events for one participant must set `startsAt` explicitly: the default `seedEvent` start (now + 7 days) is the same for every event. One Lab 6 pair is affected: TEST-62 (`reload-after-409.spec.ts`) registers Participant 4 for Intro to Git workshop, seeded at now + 7 days, and TEST-65 (`long-text.spec.ts`) registers Participant 4 for a new event next week at 10:00 local time. When the E2E run starts between about 08:00 and 12:00 local time the two starts are less than 120 minutes apart, so under BR-10 the second registration gets 409 `TIME_CONFLICT` and the test fails. L7-04 fixes this in the fixture (a start time far from the seeded event, with a version row in the STS giving the reason); the assertions stay the same. If any old result does change, the STS row is versioned with the reason; the test is not weakened.

## 6. Review

To be filled from the merged L7-01 PR: reviewer, date, review text.
