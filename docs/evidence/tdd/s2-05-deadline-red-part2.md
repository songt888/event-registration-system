# F-09 RED part 2 evidence (#204)

Commands: `npm test` and `npx playwright test e2e/registration-deadline.spec.ts` against a disposable PostgreSQL 16 instance with separate integration and E2E databases.
Tested base: `7fba054a166d762ed14bcb3c267f251d8b2be6f7` (`feature/s2-05-deadline` after #229) with only the test additions in this commit; no server or client implementation change.
File SHA-256 at this commit:

- `server/src/registration-deadline.int.test.ts`: `3813decb38fdea348c1897d853ea043d52c1332a693f6d1f6fa3d78e4ce90379`
- `e2e/registration-deadline.spec.ts`: `0d04d7c456417be54b7e61626b62fc7ff6837a1b03345720ab3d2755eeb3bd92`

## npm test

Exit status: 1. Migrations applied cleanly on the empty integration database; the run contains no fixture, setup, or compile failure. Extract from the recorded run:

```text
 Test Files  1 failed | 16 passed (17)
      Tests  28 failed | 96 passed (124)
```

All 28 failures are in `registration-deadline.int.test.ts`: the 9 previously recorded part-1 failures plus 19 new part-2 failures. Actual assertion reasons:

| Reason (actual output) | Missing behavior | Cases |
|---|---|---|
| `expected 404 to be 400` / `404 to be 200` / `404 to be 403` / `404 to be 409` | `PATCH /api/events/:id` does not exist yet (F-08 GREEN pending); CLOSED events are still hidden behind 404 | TEST-82 PATCH, TEST-84 PATCH, TEST-85, TEST-87 PATCH guards, TEST-88 closed and closed+deadline |
| `expected 400 to be 201` / `expected undefined to be null` | create rejects or drops `registrationDeadline` as an unknown field | TEST-81, TEST-84 create, TEST-86 |
| `expected 201 to be 409` | registration ignores a passed deadline | TEST-83, TEST-88 deadline |
| `expected 'VALIDATION_ERROR' to be 'INVALID_DEADLINE'` | out-of-range create deadlines are not range-checked | TEST-82 create |
| `expected 'ALREADY_REGISTERED'` / `'TIME_CONFLICT'` / `'EVENT_FULL'` `to be 'REGISTRATION_CLOSED'` | D-35 precedence is not implemented | TEST-88 deadline pairs |

13 part-2 cases already pass and are kept deliberately as regression guards for existing F-02/F-04 rules (the five TEST-87 create/register guards and the eight TEST-88 precedence scenarios without a deadline); they pin behavior that the F-09 GREEN change must not alter.

## E2E (Playwright, isolated E2E database reset and seeded before the run)

Exit status: 1. `npx playwright test e2e/registration-deadline.spec.ts`:

```text
  3 failed
    [chromium] › e2e/registration-deadline.spec.ts:25:1 › TEST-86 AC-86 displays one saved instant in two browser timezones
    [chromium] › e2e/registration-deadline.spec.ts:72:1 › TEST-89 AC-89 saves and reloads a deadline entered in local time
    [chromium] › e2e/registration-deadline.spec.ts:114:1 › TEST-89 AC-89 shows the local deadline and real API refusal without changing places
```

Actual reasons: the create form has no "Registration deadline" input yet (`getByLabel(/registration deadline/i)` timed out in TEST-86 and the first TEST-89 case), and the expired-deadline registration attempt returned 201 instead of 409 `REGISTRATION_CLOSED` (second TEST-89 case). The timezone-display step of TEST-86 never runs before the first failure.

## Scope notes

- PATCH and CLOSED-precedence cases remain red until the F-08 GREEN change provides the route and state rules; the F-09 GREEN run is expected to turn them green once both land.
- B's part-1 review note still applies: the two TEST-82 create cases for malformed and timezone-less values pass only because the field is unknown today; after GREEN they become real format checks.
