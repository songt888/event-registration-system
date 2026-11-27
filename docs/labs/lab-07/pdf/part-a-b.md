<!-- Lab 7 PDF Parts A and B (L7-08 #140). Author A, checked by B. Times are UTC+7. -->

# Part A: Change impact and updated contract

## A.1 Approved change request (E7-A1)

Issue L7-01 (#133), file `docs/labs/lab-07/change-request.md`, merged into `lab7-staging` as `9c33d23` (PR #184) on 2026-11-27 00:32. The full request as reviewed is Appendix A1; the file has not changed since that merge.

| Item | Value |
|---|---|
| Feature | F-04 Register for an event (Sprint 1) |
| Original requirement | FR-06: a participant registers for a PUBLISHED event that has not started; full, duplicate, hidden/missing and started-event requests are rejected. BR-03: one ACTIVE registration per participant per event |
| Implemented rule (old) | `registerForEvent` checks only: event exists and is PUBLISHED (404), not started (409 `EVENT_STARTED`), not already registered for this event (409 `ALREADY_REGISTERED`), a place is left (409 `EVENT_FULL`). A participant may hold any number of registrations for events at the same time |
| New rule (BR-10) | A participant may not hold two ACTIVE registrations for events whose `startsAt` are **less than 120 minutes apart**, either direction. Such a request gets 409 `TIME_CONFLICT` and nothing is stored |
| Reason | The requirement changed, not a defect: a participant cannot attend two events at once, and a place held for an event they cannot attend is taken from someone else. Sprint 1 events have no end time, so a fixed 2-hour window around the start stands for "at the same time" |
| Scope | F-04 API and its UI message only. F-02, F-03, F-05, F-06 unchanged. No schema change, no migration |
| Boundaries | distance < 120 min → 409; exactly 120 min → allowed; same start (0) → 409. Only the caller's own ACTIVE registrations count; the other event counts also if it has started; the target event itself is excluded |
| Invalid cases and check order | 404 missing/DRAFT → 409 `EVENT_STARTED` → 409 `ALREADY_REGISTERED` → 409 `TIME_CONFLICT` (new) → 409 `EVENT_FULL` |
| Access | unchanged: PARTICIPANT only (403 for ORGANIZER), identity from the session only (a `participantId` in the body is still 400); no other event's ID or title is returned |
| Concurrency | two parallel requests by one participant for two conflicting events give one 201 and one 409: the participant's `User` row is locked after the event row (lock order event, then participant) |
| Existing data | registrations that already conflict before the release are kept; the rule applies to new requests only (D-20) |
| Baselines | accepted Sprint 1: `v0.1.0-sprint1` / `12dcd3c`; pre-change: `502d2a6` / `v0.1.3-lab6` / `s47a6b53b-00006-7bv` |
| Acceptance criteria | AC-57 119 min after/before or same time → 409, nothing stored, places unchanged; AC-58 exactly 120 min after/before → 201; AC-59 per participant and check order kept; AC-60 two concurrent requests → one row; AC-61 UI message, places unchanged |

**Approval.** The labsheet step "obtain instructor/TA approval before implementation" was replaced by the instructor. Approver: Suthep Madarasmi (instructor), announcement "Lab 7 Spec Sheet Change" in the course group, about 2026-11-25 (shown as "2 days ago" when captured on 2026-11-27). Its text: *"You need not get Instructor or TA Approval for your change request to Sprint 1. Think of a good change to Sprint 1 among yourselves, but do try to make it a complex enough added feature and not just a trivial change."* CR-01 is not trivial: a new rule with an exact boundary, a new error code, a second row lock in the registration transaction to stay correct under concurrency, and a UI message.

![E7-A1 instructor announcement replacing TA approval (captured 2026-11-27)](evidence/cr-01-instructor-announcement.webp)

**Teammate review of the request** (B on PR #184, APPROVED 2026-11-27 00:22, before any test or code):

> Checked cc30239 bro. Boundary is clear (<120 is 409, exactly 120 ok, 0 is a conflict), check order puts TIME_CONFLICT after ALREADY_REGISTERED and before EVENT_FULL, and lock order event then participant has no deadlock cycle for one participant on two events. Checked the old-behavior claims on 502d2a6: event row FOR UPDATE in the transaction, the 409 reload in EventDetailPage, seed only gives participant1 a registration (Career talk, day 10), E2E DB is reset per run, and the TEST-62/TEST-65 participant4 clash at roughly 08:00 to 12:00 is real. 2 small nits for the PDF, not blocking: TEST-23 also has participant3 try to register (still EVENT_FULL since p3 has nothing else), and the plan says the announcement was 26 Nov while this says about 25 Nov, maybe pick one. CI never ran here (see my note on #183), so re-run it after #183 merges. LGTM

Answers to the two nits: TEST-23's participant 3 has no other registration, so its result (`EVENT_FULL`) does not change under BR-10. The announcement date is "about 2026-11-25" (the CR wording); the plan's "26 Nov" is the day we read it. Section 6 of the CR file says the review text is "to be filled" from the merged PR; it was not filled in the file, and the review is quoted here from PR #184 instead.

## A.2 Impact analysis

| Item | Affected? | Where | What changes, or why not |
|---|---|---|---|
| Requirement | yes | SRS FR-06, new BR-10 | FR-06 adds the time-conflict rejection; BR-10 states the rule and the boundary |
| Feature SDS | yes | `f-04-register.md` sections 1, 2, 4, 7, 10, 11, 13 | linked BR-10, new workflow steps, failure rows, error code, AC-57 to AC-61, STS TEST-57 to TEST-61, version 1.7 |
| System SDS | yes | `system-sds.md` 1.3, 4.2, 9, 12 | rule in the service layer inside the D-10 transaction with the participant lock; `TIME_CONFLICT` in the 409 codes |
| Traceability | yes | `traceability.md` | BR-10 → F-04 → AC-57..61 → TEST-57..61 |
| Code | yes | `server/src/registrations.service.ts` `registerForEvent` | participant row lock, one query on the caller's ACTIVE registrations joined to their events' `startsAt`, new error |
| Callers | no change | `registrations.routes.ts` (only caller) | route, status mapping and validation stay; the new `AppError` uses the existing error handler |
| API validation | no | zod body/params | the body is still empty; the rule needs only the event and the session user |
| UI | check only | `EventsPage.tsx` `EventDetailPage` | already shows the API message for any 409 and reloads the event (AC-62); TEST-61 confirms, no code change needed |
| Roles and ownership | no change | `requireRole('PARTICIPANT')`, session identity | the check reads only the caller's own registrations; nothing about others is returned |
| Persistence and migrations | no | Prisma schema, migrations | no column or index; a DB constraint cannot compare `startsAt` across two events |
| Historical data | no | production database | existing conflicting rows kept; nothing migrated or cancelled (D-20) |
| Other features | no | F-02, F-03, F-05, F-06 | they never create a registration |
| Seed data | no | `seed.ts`, `seed-demo.ts` | seeds insert rows directly; the demo seed has no pair that conflicts |
| Lab 6 UAT | yes, timing | Lab 6 case UAT-02 | registers one participant for two events at the same time; the release waited for Est's retest of our product (D-31, #126) |

**Preserved behavior and how it is protected.** These Sprint 1 results must not change; the same tests run before and after, unchanged: register, full, duplicate, last place, organizer refused (TEST-12 to TEST-16); DRAFT/missing and started (TEST-27, TEST-28); 20-request capacity (TEST-37); session and body checks (TEST-43, TEST-44); own registrations only (TEST-17, TEST-18); organizer list of own events (TEST-19 to TEST-21); E2E golden journey and full event (TEST-22, TEST-23). The CR checked each fixture on `502d2a6`: the integration tests register a participant through the API for one event only, so no old expected result changes. One Lab 6 E2E pair would collide between about 08:00 and 12:00 local time (TEST-62 and TEST-65 both register Participant 4 near the same start); L7-04 moves TEST-65's fixture to two weeks out, with assertions unchanged (B.3).

## A.3 Revised contract, old and new (E7-A2)

All revisions are in PR #185 (author B, reviewer A), merged as `ff9aa9b` on 2026-11-27 02:21, 21 minutes before the red test commit `7098c4e` (02:42). No existing AC or TEST ID was changed or renumbered.

| Document, section | Old (`502d2a6`) | New (`ff9aa9b`) |
|---|---|---|
| SRS FR-06 | "...reject full, duplicate, hidden/missing or started-event cases without adding a row." | "...reject full, duplicate, hidden/missing, started-event **or time-conflict (BR-10)** cases without adding a row." Tests add TEST-57..TEST-61 |
| SRS BR-10 | (none) | "A participant may not hold two ACTIVE registrations for events whose `startsAt` are less than 120 minutes apart; exactly 120 minutes is allowed. ... rejected with 409 `TIME_CONFLICT` and nothing is stored. Checked in the registration transaction after the duplicate check and before the capacity check; registrations that already conflict before the release stay as they are." |
| F-04 2, transaction steps | 1 lock event; 2 404; 3 `EVENT_STARTED`; 4 `ALREADY_REGISTERED`; 5 count, `EVENT_FULL`; 6 insert | 1 to 4 unchanged; **5 lock the participant's row** `SELECT id FROM "User" WHERE id = ${participantId}::uuid FOR UPDATE`; **6** `TIME_CONFLICT` if another ACTIVE registration's event starts less than 120 min away (target excluded, a started event counts); 7 count, `EVENT_FULL`; 8 insert |
| F-04 2, lock order | event row only | "always the event row, then the participant row ... they cannot deadlock" |
| F-04 4, precedence | "a participant who is already registered for a full event gets `ALREADY_REGISTERED`; a full event that has started gets `EVENT_STARTED`." | adds: "a time conflict beats a full event, and a repeat registration or a started event beats a time conflict." Eight new failure rows (119/120 min, per participant, full, repeat, started, started-held, concurrent) |
| F-04 6/7, messages and errors | 409 `EVENT_STARTED`, `ALREADY_REGISTERED`, `EVENT_FULL` | adds `TIME_CONFLICT`: "You are already registered for another event that starts within 2 hours of this one." |
| F-04 8, data | no schema change | adds: no column, index or migration for BR-10; existing conflicting rows stay |
| System SDS 1.3 | rules BR-02, BR-03, BR-04, BR-09 | new row: BR-10 in the D-10 transaction after the duplicate check, `User` row locked after the event row; DB constraint: "none: a constraint cannot compare `startsAt` across two events" |
| System SDS 4.2, 409 codes | `EVENT_FULL`, `ALREADY_REGISTERED`, `EVENT_STARTED`, `ALREADY_PUBLISHED` | adds `TIME_CONFLICT` |
| Versions | F-04 1.6, system SDS 1.1 | F-04 **1.7** and system SDS **1.2**, both dated 2026-11-27, author B, reviewer A; SRS revision line CR-01 |

**New acceptance criteria (F-04 section 10).**

| AC | Criterion |
|---|---|
| AC-57 | Registering for an event whose `startsAt` is 119 minutes after, 119 minutes before, or equal to the `startsAt` of an event the participant is ACTIVE-registered for returns 409 `TIME_CONFLICT` with the section 6 message; no row is stored and `remainingPlaces` is unchanged. |
| AC-58 | Registering for an event that starts exactly 120 minutes after, or exactly 120 minutes before, an event the participant is ACTIVE-registered for returns 201. |
| AC-59 | Per participant, check order kept: another participant registers for the same event (201); a repeat still returns `ALREADY_REGISTERED`; full and conflicting returns `TIME_CONFLICT`; started and conflicting returns `EVENT_STARTED`; an ACTIVE registration for an event that has started still counts. Nothing stored when rejected. |
| AC-60 | Two simultaneous requests by one participant for two PUBLISHED future events with free places, 60 minutes apart, store exactly one ACTIVE registration; the other gets 409 `TIME_CONFLICT`. |
| AC-61 | On the Event detail screen a `TIME_CONFLICT` rejection shows the section 6 message in the alert and the places text does not change (E2E, or a manual post-deployment check labelled manual). |

**New STS rows (F-04 section 11).** `T` = now + 7 days on a whole minute; all events PUBLISHED, capacity 5 unless stated; prior registrations inserted directly.

| TEST | Type | Inputs and preconditions | Expected result |
|---|---|---|---|
| TEST-57 | API + DB | P1 ACTIVE on A at `T`; register for B at `T+119`, C at `T-119`, D at `T` | each 409 `TIME_CONFLICT`, exact message, `error` has only `code` and `message`; P1's only row is A; B `remainingPlaces` 5 |
| TEST-58 | API + DB | P1 ACTIVE on A at `T`; register for F at `T+119`, B at `T+120`, C at `T-120` | F 409 `TIME_CONFLICT`; B and C 201; P1 rows A, B, C |
| TEST-59 | API + DB | P1 on A at `T` and on H (started 10 min ago); D at `T`; E at `T+30` full (P2, P3); S started 30 min ago; K at now+60 | (a) P4 on D 201; (b) P1 on A `ALREADY_REGISTERED`; (c) P1 on E `TIME_CONFLICT`; (d) P1 on S `EVENT_STARTED`; (e) P1 on K `TIME_CONFLICT`; no other rows |
| TEST-60 | API + DB, concurrent | P1, B at `T`, C at `T+60`, no registrations | `Promise.all` of both: one 201, one 409 `TIME_CONFLICT`; one ACTIVE row; run five times |
| TEST-61 | E2E | seed participant with an ACTIVE registration; event 60 min after it | alert shows the message; places text unchanged |

**Teammate review of the contract** (A on PR #185, before the red commit). Round 1, CHANGES_REQUESTED 2026-11-27 01:33, on `49fe0e1`, excerpt:

> **Change requested (one gap against the CR)** CR section 2 says: "The other event counts whatever its state, also if it has already started, because the participant is still attending it." No AC or TEST checks this. TEST-59 (d) does not: there the *target* S has started, so step 3 answers first. Please add one step, for example TEST-59 (e): as P1, who holds H (started 10 minutes ago), register for a PUBLISHED event K at now + 60 minutes with free places → 409 `TIME_CONFLICT` (pre-change: 201, so it is also a red step). Add the matching sentence to AC-59 in f-04.

Round 1 also checked the check order, the 119/120 boundary on both sides, and walked the lock order for deadlocks (two requests by one participant for two events; two participants for one event): no cycle. Round 2, APPROVED 2026-11-27 02:21 on `3657aab`:

> TEST-59 (e) is in: K at now + 60 is 70 minutes from H (started 10 minutes ago), so < 120 → 409 `TIME_CONFLICT`; K is far from A, E and S, so no other conflict decides it. Pre-change answers 201, so (e) is a real red step ... AC-59 has both sentences ... Step 5 SQL casts to `::uuid`, like the event lock. `FOR UPDATE` kept, fine. Version row 1.7 records the review round. CI `test-and-docker` passes. No existing AC or TEST changed. Approving. Next: L7-03 red (TEST-57 to TEST-60 on `502d2a6`).

**Order in recorded history:** CR-01 merged 00:32 → contract round 1 01:33 → contract approved and merged 02:21 → red test commit 02:42 → green commit 03:20.

# Part B: Implementation and regression-safe delivery

## B.1 New behavior fails on the old code (E7-B1)

- Tests: `server/src/registrations.conflict.int.test.ts`, TEST-57 to TEST-60 (Vitest + Supertest, real PostgreSQL 16 test database, tables truncated per test). Full file in Appendix B1.
- Tested commit: `7098c4e` (author B), committed alone on `feature/l7-03-time-conflict`. `git diff 502d2a6 7098c4e -- server` shows only the new test file, so the service under test is the pre-change code.
- Run 2026-11-27 02:42 by B, Node 24.16.0, Vitest 3.2.7. Re-run by A at `f8a9270` with the same result (PR #190, 02:54).

Setup and assertions (excerpt; boundary in TEST-57 and TEST-58):

```ts
const T = new Date(Math.floor((Date.now() + 7 * DAY) / MIN) * MIN); // whole minute, so 119/120 is exact
const at = (minutes: number) => new Date(T.getTime() + minutes * MIN);

it('TEST-57 AC-57 rejects a registration 119 minutes after, 119 minutes before or at the same time as another', async () => {
  const a = await seedEvent(o.id, T);
  await holdActive(a.id, p1.user.id);
  const later = await seedEvent(o.id, at(119));
  const earlier = await seedEvent(o.id, at(-119));
  const same = await seedEvent(o.id, T);
  for (const e of [later, earlier, same]) expectConflict(await register(e.id, p1.cookie)); // 409 TIME_CONFLICT, exact message
  expect(await eventIdsOf(p1.user.id)).toEqual([a.id]);
  const detail = await request(app).get(`/api/events/${later.id}`).set('Cookie', p1.cookie);
  expect(detail.body.remainingPlaces).toBe(5);
});

it('TEST-58 AC-58 allows exactly 120 minutes after and before, one minute inside is still a conflict', async () => {
  expectConflict(await register(inside.id, p1.cookie));                 // T + 119
  expect((await register(after.id, p1.cookie)).status).toBe(201);       // T + 120
  expect((await register(before.id, p1.cookie)).status).toBe(201);      // T - 120
});

it('TEST-60 AC-60 lets exactly one of two parallel requests from one participant through ...', async () => {
  const results = await Promise.all([register(b.id, p1.cookie), register(c.id, p1.cookie)]); // T and T + 60
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(await eventIdsOf(p1.user.id)).toHaveLength(1);
});
```

Red output (`npm test -w server -- src/registrations.conflict.int.test.ts`, full log in Appendix B2):

```
 ❯ |integration| src/registrations.conflict.int.test.ts (4 tests | 4 failed) 214ms
   × TEST-57 AC-57 rejects a registration 119 minutes after, 119 minutes before or at the same time as another
     → expected 201 to be 409 // Object.is equality
   × TEST-58 AC-58 allows exactly 120 minutes after and before, one minute inside is still a conflict
     → expected 201 to be 409 // Object.is equality
   × TEST-59 AC-59 counts only the caller, counts a started registration and keeps the check order
     → expected 'EVENT_FULL' to be 'TIME_CONFLICT' // Object.is equality
   × TEST-60 AC-60 lets exactly one of two parallel requests from one participant through when the events are 60 minutes apart
     → expected [ 201, 201 ] to deeply equal [ 201, 409 ]
 Test Files  1 failed (1)
      Tests  4 failed (4)
```

Why each failure is the missing rule, not a fixture or compile error: TEST-57 fails on its first request (119 minutes after → 201 stored); TEST-58 fails at `T+119` (the 120-minute steps pass, as the STS says they should on the old code); TEST-59 fails at (c), where the old code goes on to the capacity check; TEST-60 stores both rows. TEST-59 (e) never ran in that log because (c) stopped the test, so B ran it on its own on the same commit with only line (c) commented out for that run (`E7-B1-red-59e.txt`, 03:31): `1 failed | 3 skipped (4)`, `expected 201 to be 409` at line 106. The full suite on `7098c4e`: 15 files, **69 passed, 4 failed** (only the new tests), 0 skipped.

## B.2 Implementation and green (E7-B2)

Green commit `6fc9c53` (author A). Code diff (`git diff 502d2a6 6fc9c53 -- server/src/registrations.service.ts`), the only production code change in the release:

```diff
@@ -41,6 +41,26 @@ export async function registerForEvent(participantId: string, eventId: string, n
         const where = { eventId, status: 'ACTIVE' as const };
         if (await tx.registration.findFirst({ where: { ...where, participantId } })) throw alreadyRegistered();
+
+        // BR-10: serialize one participant's registration attempts across different events.
+        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${participantId}::uuid FOR UPDATE`;
+        const conflictWindowMs = 120 * 60 * 1000;
+        const startMs = event.startsAt.getTime();
+        const conflict = await tx.registration.findFirst({
+          where: {
+            participantId,
+            status: 'ACTIVE',
+            eventId: { not: eventId },
+            event: {
+              startsAt: { gt: new Date(startMs - conflictWindowMs), lt: new Date(startMs + conflictWindowMs) },
+            },
+          },
+          select: { id: true },
+        });
+        if (conflict) {
+          throw new AppError(409, 'TIME_CONFLICT', 'You are already registered for another event that starts within 2 hours of this one.');
+        }
+
         const active = await tx.registration.count({ where });
         if (active >= event.capacity) throw full();
```

How it meets the impact analysis: the check sits inside the existing D-10 transaction after the event lock, the started check and the duplicate check, and before the capacity check (check order). The strict `gt`/`lt` make exactly 120 minutes allowed and the same start a conflict. `eventId: { not: eventId }` excludes the target event; there is no filter on the other event's state, so a started event counts. It reads only the session participant's rows (`participantId` comes from the session), and returns no other event's data. The `User` row lock serializes one participant's parallel requests (AC-60). No schema, migration or route change.

Same tests on the green code (`npm test -w server -- src/registrations.conflict.int.test.ts`, Node 24.19.0, Vitest 3.2.7): **4 passed (4)**, 0 failed. TEST-61 (E2E, `e2e/time-conflict.spec.ts`, `5a2197b` and `4d51c76`) signs in as Participant 1, who holds the seeded Career talk, opens an event created 60 minutes after it, presses Register, and expects the alert text above with the places text unchanged ("5 of 5 places left").

**Event page before and after the change** (E7-B2 UI, automated capture of the TEST-61 scenario on a local build, 2026-11-27 17:01; `docs/labs/lab-07/evidence/l7-04/E7-B2-ui-before-after.md`):

| Commit | Participant One presses Register on an event 60 minutes after the Career talk they hold | Registrations afterwards |
|---|---|---|
| `502d2a6` (pre-change) | "You are registered for this event.", 4 of 5 places left | 2 ACTIVE (the conflict is stored) |
| `861f01f` (release) | alert with the BR-10 message, 5 of 5 places left | 1 ACTIVE (nothing stored) |

![E7-B2 before](evidence/l7-04/E7-B2-before-502d2a6.png)

**Figure E7-B2 before.** Pre-change code `502d2a6`: the conflicting registration is accepted.

![E7-B2 after](evidence/l7-04/E7-B2-after-861f01f.png)

**Figure E7-B2 after.** Release `861f01f`: the same request is refused with the `TIME_CONFLICT` message, and the places stay 5 of 5.

## B.3 Existing regression (E7-B3)

Suite and why: the full API/DB suite (`npm test`) holds every Sprint 1 registration, capacity, duplicate, permission, ownership and session test that the change could affect (the preserved list in A.2); E2E (`npm run test:e2e`) covers the golden journey, the full-event message, the Lab 6 reload-after-409 (TEST-62) and the new alert. TEST-60 is run five times because it is a concurrency test.

| Command | Tested commit | Versions | Result |
|---|---|---|---|
| `npm test` | `4d51c76` | Node 24.19.0, Vitest 3.2.7, PostgreSQL 16 | 15 files, **73 passed, 0 failed, 0 skipped** (69 Sprint 1/Lab 5/Lab 6 + 4 new) |
| `npm test -w server -- src/registrations.conflict.int.test.ts -t "TEST-60"`, 5 rounds | `4d51c76` | as above | each round 1 passed, 0 failed (3 excluded by the filter) |
| `npm run test:e2e` | `4d51c76` | Playwright 1.65.0, Chromium | **20 passed, 0 failed, 0 skipped** (19 before + TEST-61) |
| B's re-run of both suites | `1ce3dbe` | | 73/73 and 20/20, 0 skipped (PR #190 review) |
| A's release run (`build`, `npm test`, E2E, TEST-54, TEST-55) | `a6439d7` | Node 24.19.0, Playwright 1.65.0 | build OK; 73 passed; 20 passed; 6/6; 10/10; 0 failed, 0 skipped |

Disclosed failure: the first E2E run at `5a2197b` gave 19 passed, 1 failed: TEST-61's own fixture left out the required event description and got 400 during setup. `4d51c76` adds the description; no assertion changed.

Old tests changed: one, a fixture only. TEST-65 (`e2e/long-text.spec.ts`, Lab 6) created its event one week ahead at 10:00, and TEST-62 registers the same participant for a seeded event one week ahead, so between about 08:00 and 12:00 local time the two would now be less than 120 minutes apart. `3b03b5d` moves TEST-65's event to two weeks ahead (`nextWeek()` → `inTwoWeeks()`); its assertions are unchanged, and the F-02 contract version 1.5 row records the reason (date and author added in `3a65460`). No test was weakened, skipped or deleted.

## B.4 Review, CI, integration, release and deployment (E7-B4)

| Step | Issue / PR | Author → reviewer | Review and merge | CI `test-and-docker` |
|---|---|---|---|---|
| Plan, D-31, `lab7-staging` CI | #132 / #183 | A → B | approved 2026-11-27 00:22, merged 00:26 | run 45864669822 success |
| Change request CR-01 | #133 / #184 | A → B | approved 00:22, merged 00:32 (A.1) | run 45868342199 success |
| Revised contract | #134 / #185 | B → A | changes requested 01:33, approved and merged 02:21 (A.3) | run 45881423658 success |
| Red (L7-03) and green (L7-04) | #135, #136 / #190 | B (red), A (green) | A checked the red 02:54; B reviewed the green 03:34; A approved 03:45; B merged 03:50 as `a6439d7` | run 45893093947 success on `3a65460` |
| Release `lab7-staging` → `main` | #137 / #193 | A → B | approved 09:44, merged 12:58 as `861f01f` | run 45897022578 success |

PR #190 was opened from B's account but holds both B's red and A's green commits. GitHub does not let a PR's author approve it, so the green was reviewed by B in a review comment and the formal approval came from A, who had checked the red; that approval states this split. B's review of the green (03:34):

> green checked bro (B review of your L7-04 part). service matches F-04 1.7: participant lock after the duplicate check and before capacity, strict gt/lt so exactly 120 is allowed and 0 conflicts, own event excluded, no state filter on the other event so a started registration counts, exact message. reran at 1ce3dbe: build ok, npm test 73/73, e2e 20/20, 0 failed 0 skipped, same as your E7-B3 (TEST-60 5/5 there). TEST-65 move to day 14 has the f-02 1.5 row, assertions unchanged. pushed f207543 with TEST-59 (e) red on its own at 7098c4e (line 106, 201 where 409 expected), so your note is answered. nits: the f-02 1.5 row has no date/author like the others; E7-B2 ran before the commit but E7-B3 covers a committed hash, fine.

B's review of the release PR #193 (APPROVED 09:44):

> checked bro, `a6439d7`: only 4 merges on first-parent (#183 #184 #185 #190), no `server/prisma` diff, `main` is an ancestor (0 behind), code is the 5 files in the body (+192/-6). my run on the same tree matches yours: build OK, `npm test` 73/73, e2e 20/20. approve. just ping Est on Discord before you merge since it deploys right away

The Discord notice was not sent: Est had already recorded their Lab 6 decision on our release (#126, Accepted, 03:18), which was the D-31 wait condition, so A decided no notice was needed and recorded this on #137.

**Release and deployment.** The release changes 5 files outside `docs/`: `registrations.service.ts` (+20), the new `registrations.conflict.int.test.ts` and `e2e/time-conflict.spec.ts`, the `long-text.spec.ts` fixture, and the `lab7-staging` CI trigger. A tagged `861f01f` as `v0.2.0-lab7` (annotated, 2026-11-27 13:29). Earlier tags did not move (`v0.1.0-sprint1` → `12dcd3c`, `v0.1.3-lab6` → `502d2a6`). The push to `main` started "Deploy to Google Cloud" run 45948919136 (12:58:16 to 13:00:07, success). Log lines:

```
Execution [s47a6b53b-migrate-94rk7] has successfully completed.
Service [s47a6b53b] revision [s47a6b53b-00007-mkk] has been deployed and is serving 100 percent of traffic.
```

The migration job ran `npm run migrate` and the non-destructive `seed:demo`; there was nothing to migrate, and production data was not reset (D-20). B's read-only check at 13:02: `/api/health` 200 `{"status":"ok"}`, `/api/me` without a session 401 `UNAUTHENTICATED`.

## B.5 Post-deployment checks on production (E7-B5)

- Version: `v0.2.0-lab7` / `861f01f` / revision `s47a6b53b-00007-mkk`; 2026-11-27 13:32 to 13:35.
- Method: A signed in by hand in the built-in browser pane of the Claude desktop app. Claude Code sent each request with `fetch` from the signed-in page (same origin, the app's own session) and saved the status and JSON. These are AI-executed requests on A's sign-in, not clicks.
- Data: synthetic events with unique titles, left in place (D-28; nothing can be deleted in Sprint 1). Accounts by label: Organizer One, Participant One.

Setup as Organizer One (`POST /api/events`, then `POST /api/events/:id/publish`; capacity 5, location "Synthetic Hall"):

| Event | ID | Starts (UTC+7) | Create / publish |
|---|---|---|---|
| L7-KK-1332-base | `e7f150a6-…` | 10 Dec 2026 10:00 | 201 / 200 PUBLISHED |
| L7-KK-1332-plus119 | `d7a792e6-…` | 10 Dec 2026 11:59 (base + 119 min) | 201 / 200 PUBLISHED |
| L7-KK-1332-plus120 | `8f6ffff2-…` | 10 Dec 2026 12:00 (base + 120 min) | 201 / 200 PUBLISHED |

Checks as Participant One (role checked as PARTICIPANT first), 13:34:57:

| # | Action | Expected | Actual status and body | Result |
|---|---|---|---|---|
| 1 | register for base | 201 | 201, registration ACTIVE, `remainingPlaces` 4 | PASS |
| 2 | register for plus119 | 409 `TIME_CONFLICT` (changed) | 409 `{"error":{"code":"TIME_CONFLICT","message":"You are already registered for another event that starts within 2 hours of this one."}}` | PASS |
| 3 | register for plus120 | 201 (changed, boundary) | 201, registration ACTIVE, `remainingPlaces` 4 | PASS |
| 4 | register for plus120 again | 409 `ALREADY_REGISTERED` (preserved) | 409 `{"error":{"code":"ALREADY_REGISTERED","message":"You are already registered for this event."}}` | PASS |
| 5 | `GET /api/events/<base>/registrations` (Organizer One's list) | refused (preserved access rule) | 403 `{"error":{"code":"FORBIDDEN","message":"You do not have access to this."}}` | PASS |

Afterwards `GET /api/registrations/mine` and the My registrations page list only L7-KK-1332-base and L7-KK-1332-plus120, both ACTIVE; plus119 has no registration.

# Contribution, AI use and limitations (Parts A and B)

## Contribution (Parts A and B)

| Work | A (Kirakit) | B (Nattakit) |
|---|---|---|
| Plan and D-31 (L7-00 #132) | wrote | reviewed, merged |
| Change request CR-01 (L7-01 #133) | wrote | reviewed (boundary, check order, lock order, old-behavior claims), merged |
| Revised contract (L7-02 #134) | reviewed in two rounds (found the started-registration gap) | wrote |
| Red tests TEST-57 to TEST-60 (L7-03 #135) | checked and re-ran the red | wrote, ran, added the (e) run |
| Green, TEST-61, TEST-65 fixture (L7-04 #136) | wrote, ran the regression | reviewed and re-ran both suites, merged #190 |
| Release, tag, deploy, post-deployment checks (L7-05 #137) | release PR #193, release tests, tag, deploy record, production checks | reviewed and merged #193, read-only live check |
| PDF Parts A and B (L7-08 #140) | wrote | checks |

## AI use (Parts A and B)

| Tool | Task |
|---|---|
| Claude Code (Claude Opus), for A | drafted CR-01, the green change, TEST-61, the release PR, the evidence files and these two parts on A's instructions; ran the release test suites; sent the production check requests from A's signed-in page (B.5). A reviewed every change and can explain it |
| Claude Code, for B | drafted the revised contract from the CR on B's instruction (PR #185), and wrote and ran the red tests from the STS on B's instruction (PR #190); B checked them before review. Also ran the TEST-61 scenario on `502d2a6` and `861f01f` and captured the E7-B2 before/after figures (automated, local build) |

## Known limitations (Parts A and B)

- The instructor's announcement shows a relative date ("2 days ago"), so the approval date is about 2026-11-25, not exact.
- CR-01 section 6 ("review, to be filled") was not filled in the file after the merge; the review is quoted in A.1 from PR #184 instead.
- TEST-59 (e)'s red was shown in a separate run with step (c) commented out for that run only; that edit was not committed.
- E7-B2's green run was on the working tree just before the `6fc9c53` commit (identical service patch); the committed hash is covered by the E7-B3 runs at `4d51c76` and B's at `1ce3dbe`.
- The production checks did not cover a full event or the UI alert; capacity is covered by TEST-13/TEST-15/TEST-37 and the alert by TEST-61 on the release tree. The checks were sent from the page by Claude Code, not clicked by hand.
- Registrations made before the release that already conflict are kept, by design; the rule applies to new requests only.
- Test data stays in production: the three `L7-KK-1332-*` events and Participant One's two registrations.
