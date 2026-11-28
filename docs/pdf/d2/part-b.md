<!-- Deliverable 2 PDF, Part B (S3-04 #209). Author: A (Kirakit Kingkaew). Checker: B. Draft: values marked [S2-06] are filled from the Sprint 2 release run (PR #235); [at submission] values are updated when the PDF is built. Times are UTC+7. -->

# Part B: Sprint 2 contracts, completion, TDD and demonstrations

Part B shows that the three Sprint 2 features were specified before any code, built in strict red/green order with the teammate review between the halves, and that every planned acceptance criterion passes on a recorded commit. All times are UTC+7; all test data is synthetic.

## B.1 Contracts before code (S2-01, #200)

The rules were fixed before the first red commit (D-33 to D-35 in `docs/decisions.md`, proposed in #199):

| Contract | Content | AC/TEST | PR | Merged |
|---|---|---|---|---|
| F-07 Cancel registration | participant cancels own ACTIVE before `startsAt`; CANCELLED frees capacity, duplicates and BR-10; re-register under all rules | AC-73..80 / TEST-73..80 | #221 | 2026-11-28 01:04 |
| F-09 Registration deadline | nullable `registrationDeadline`, D-35 validation and check order | AC-81..89 / TEST-81..89 | #221 | 2026-11-28 01:04 |
| F-08 Manage event | edit rules (D-34), capacity floor under the row lock, close, cancel with cascade | AC-90..109 / TEST-90..109 | #222 | 2026-11-28 00:35 |

S2-02 (#225) added the Sprint 2 schema first — enum values CLOSED/CANCELLED, `cancelledAt`, `registrationDeadline` — additive only (D-20), with no behavior change and the ACTIVE partial index intact.

## B.2 TDD: red and green per feature

Every red commit was run on the pre-change code and the failure output recorded (`docs/evidence/tdd/`); a red caused by a compile, import or fixture error would not count. The other student reviewed each red PR before the green work started.

| Feature | Red (author, PR, commits, recorded failures) | Green (author, PR, head) | Suite after green |
|---|---|---|---|
| S2-02 schema | n/a (schema only; 73 Sprint 1 tests still pass) | A, #225 (`acb3e86`, merged `a94ef4d`) | 73 / 20 E2E |
| F-07 (B red, A green) | B, #226 (`b0e7455` + `9ffaef0`): 7 failing TEST-73..79 on the missing route and missing 409s | A, #228 (`3b205c6`, merged `33f80e8`) | 80 / 21 E2E |
| F-08 (B) | B, #227 (`5c6fc25` + `4b64dd2`): 16 failing / 74 passing on `npm test` (TEST-104 passes by design as a regression check) and 3 E2E failing (TEST-105..107), on the missing routes and UI | B, #231 (`48e5670` + `a39258c`, merged `5a001f8`) | 98 / 24 E2E |
| F-09 (A) | A, part 1 #229 (`f32db1f`): 9 failing / 83 passing; part 2 #230 (`f8e59de`): 28 failing / 96 passing of 124, PATCH and CLOSED cases included | A, #233 (`35ffc4e`..`8f12a48`, merged `81adad2`) | 143 passed (143) / 27 E2E |

B reran every suite on the exact heads before approving (`665d5e2`: 142/142; `8f12a48`: 143/143, E2E 27, build clean). Two review rounds on F-09 produced real changes: the deadline display moved to My events and the published-event list per the contract's section 3.6, and a boundary bug in the F-08 step-8 stored-deadline check (found by B, fixed in `8f12a48`, regression-tested by the TEST-85 combined-move case). The F-09 red part 2 existed because F-08's PATCH route was not merged yet — its PATCH cases were red on the missing route, exactly as the F-09 contract and B's part-1 review planned.

## B.3 Sprint 2 completion table

| Feature | AC | Planned test | Result | Release |
|---|---|---|---|---|
| S2-02 schema | no behavior change; no drift; partial index kept | `prisma migrate dev` check | pass (no drift; index kept) | `v0.3.0-sprint2` |
| F-07 cancel | AC-73..80 | TEST-73..80 | all pass on `33f80e8` (80/0/0) | `v0.3.0-sprint2` |
| F-08 manage event | AC-90..109 | TEST-90..109 | all pass on `5a001f8` (98/0/0; TEST-92 and TEST-101 run 5 times) | `v0.3.0-sprint2` |
| F-09 deadline | AC-81..89 | TEST-81..89 | all pass on `8f12a48` (143/143; TEST-86 across two browser time zones) | `v0.3.0-sprint2` |

No planned test was skipped or weakened; the two disclosed adjustments (the TEST-85 session fixture and the F-09 display scope) are recorded in the F-09 contract version history and PR #233. Release: tag `v0.3.0-sprint2` at `7e34f1b` (release PR #235, merged 2026-11-28 15:15 UTC+7), deployed as Cloud Run revision `s47a6b53b-00008-qrx` (deploy run 46125000564); the release head adds documentation only, so the recorded suites stand.

## B.4 Issue and PR chains (pair work)

- **F-07 (the agreed handoff):** B wrote the red tests (#226) after A's contract, A implemented the green (#228); each half reviewed by the other student — the S2-03 split from `deliverable2-plan.md` section 2, as agreed in the Lab 7 retrospective (D.4).
- **F-08:** B authored contract (#222), red (#227) and green (#231); A reviewed every PR and merged the green with `test-and-docker` and `e2e` green.
- **F-09:** A authored contract (#221), both red commits (#229, #230) and the green (#233); B reviewed and reran everything, requesting two changes that were made before merge. Since #230 the team convention is **reviewer merges**: the student who approved a PR merges it; #229, merged before that, was merged by its author.

## B.5 Demonstrations

Each demonstration is a scripted run against the release head `7e34f1b` (production revision `s47a6b53b-00008-qrx` where noted), kept as evidence in `docs/sprints/sprint-2/` [S2-06]:

1. **Cancel and re-register with persistence** (F-07, TEST-77/78/80): the participant cancels, reloads My registrations and sees the CANCELLED row with `cancelledAt`; a second participant takes the freed place; the first participant registers again and holds a new ACTIVE row while the CANCELLED row remains.
2. **Capacity below ACTIVE rejected** (F-08, TEST-91/92): the owner lowers capacity to the ACTIVE count (allowed, equality) and one below it — 409 `CAPACITY_BELOW_ACTIVE` under the event row lock, with a concurrent last-place registration never exceeding the final capacity.
3. **Another organizer's edit refused by the API** (F-08/F-09, TEST-102/TEST-95/TEST-87): a second organizer PATCHes someone else's PUBLISHED event — 403 `FORBIDDEN`, nothing changed; a forged `ownerId` in the body — 400 `VALIDATION_ERROR`.

## B.6 Two test excerpts

Domain rule — the deadline boundary at one-millisecond precision (TEST-83, `server/src/registration-deadline.int.test.ts`):

```ts
it.each([-1, 0, 1])('TEST-83 AC-83 controls registration at deadline offset %i ms', async (offset) => {
  ...
  const result = await at(new Date(deadline.getTime() + offset), () => request(app)
    .post(`/api/events/${e.id}/registrations`).set('Cookie', p.cookie).send({}));
  if (offset < 0) {
    expect(result.status).toBe(201);
  } else {
    expect(result.status).toBe(409);
    expect(errorBody(result).code).toBe('REGISTRATION_CLOSED');
```

Access restriction — the guards a deadline-bearing PATCH keeps (TEST-87 rows, same file): a participant PATCHing anyone's event gets 403 `FORBIDDEN`, a foreign organizer 403 `FORBIDDEN`, a forged `ownerId` in the body 400 `VALIDATION_ERROR`, and the stored event is unchanged after every refusal (`expect(await prisma.event.findMany()).toEqual([event])`).
