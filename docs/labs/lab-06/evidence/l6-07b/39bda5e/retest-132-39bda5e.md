# Third retest of Est #132 (desktop queue column labels), tester B

- Product: Est (EN-033) "Campus Café Pre-order", https://food-order-d4jdyxqbca-as.a.run.app
- Version: `vienggd/Food-order` `main` `39bda5e` ("Merge pull request #181 from vienggd/lab6", 2026-11-27 03:19 UTC+7); their "Deploy demo" workflow run on `39bda5e` started 03:19 and completed with success at 03:24 (UTC+7). Live assets `index-DbdmxBc6.js`, `index--AGnC0Oj.css` (changed from `index-D6oQEALR.js` on `163fdb7`); `/api/ready` 200 `{"status":"ready","db":"connected"}`. Cloud Run revision `food-order-00009-jd9` (as recorded by A on Est #132 at 03:32).
- Tester: Nattakit Prasertsak (B), UAT Team EN-009_P3. 2026-11-27 03:34:54 (UTC+7)
- Method: automated, headless Chromium (Playwright script `retest132b.cjs`, written by Claude Code on B's instruction), 1280 × 800, signed in as OPERATOR, `/operator/orders`. The script reads every header cell and the first row's cells with their left edges, and the cell count of every row. Account by label only; no password in any file or image.
- Earlier results: FAIL on `163fdb7` (B, 2026-11-27 00:41 correction; A, 03:05, PR #191).

## Result: PASS

| Column | Header (`scope`) | Header left px | Row 1 cell | Cell left px |
|---|---|---|---|---|
| 1 | Order (col) | 296 | #1 | 296 |
| 2 | Status (col) | 367 | PLACED | 367 |
| 3 | Customer (col) | 470 | Smoke Test | 470 |
| 4 | Items (col) | 575 | Latte ×2 | 575 |
| 5 | Placed (col) | 913 | 22 Nov 21:47 | 913 |
| 6 | Total (col) | 1011 | ฿130.00 | 1011 |
| 7 | Action (col) | 1114 | Accept order | 1114 |

7 header cells, 4 rows with 7 cells each; every header starts at the same x as its column. Evidence: `R2-132-queue-headers.png` (the Status header now sits over the PLACED pills), raw output `retest-132-log.txt`.

Not re-checked on `39bda5e`: the other 8 fixes and UAT-01, 03, 04, 05 (they passed on `163fdb7`; `39bda5e` is a new deploy, so a short regression re-run would confirm them).

## Regression on `39bda5e` (other 8 fixes), tester B, 2026-11-27 03:42 to 03:43 (UTC+7)

Same script and steps as the run on `163fdb7` (`l6-07b/retest-163fdb7.md`); output in `regression/`. Test data: orders #16 and #17 (Latte × 1 each, CUSTOMER-A), both accepted by OPERATOR.

| Est Issue | Result on `39bda5e` |
|---|---|
| #123 (major) | PASS |
| #121 | PASS (all 7 ids 400 `VALIDATION_ERROR`; "Order not found." in the detail panel) |
| #122 | PASS |
| #124 | PASS: the main run logged FAIL because it checks the banner after the network settles (same script issue as on `163fdb7`); the dedicated rerun sees "Order #17 placed!" right after placing, then none after reload or after accept (`regression-124-rerun-log.txt`) |
| #125 | PASS |
| #126 | PASS |
| #128 | PASS |
| #129 | PASS |
| #132 | PASS (header names; the alignment check is the table above) |

**All 9 accepted defects PASS on `39bda5e`.** UAT-01, 03, 04, 05 were not re-run on `39bda5e`; they passed on `163fdb7`, and the only app files the fix release changes are `client/src/pages/QueuePage.tsx` and `client/src/styles.css` (the queue table; `git compare 163fdb7...39bda5e`), the rest is their docs and screenshots.
