# F-09 RED evidence (#204)

Command: `npm test` against disposable PostgreSQL 16.
Tested base: `33f80e8d3c1bede4df74694a7125756dce8f72b2` with the test file added in this commit.
Test file SHA-256: `7a3efd623ef27203ad217295c2e286cd1307afb2db476b0d26ccd06463195844`.
Exit status: 1. Extract from the recorded run:

```text
AssertionError: expected 400 to be 201 // Object.is equality
AssertionError: expected 'VALIDATION_ERROR' to be 'INVALID_DEADLINE' // Object.is equality
AssertionError: expected 201 to be 409 // Object.is equality
AssertionError: expected undefined to be null
AssertionError: expected 400 to be 201 // Object.is equality
 Test Files  1 failed | 16 passed (17)
      Tests  9 failed | 83 passed (92)
```

This covers the independent create and registration portions of TEST-81 through TEST-84.
PATCH and CLOSED precedence coverage depend on F-08.
