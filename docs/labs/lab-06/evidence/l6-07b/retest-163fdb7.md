# Retest of team Est's corrected release (L6-07b #129), tester B

- Product: Est (EN-033) "Campus Café Pre-order", https://food-order-d4jdyxqbca-as.a.run.app
- Version retested: `vienggd/Food-order` `main` `163fdb7` (their PR #168), Cloud Run revision `food-order-00008-v6c` (from Est's Discord message); live bundle `index-D6oQEALR.js` / `index-DIcaNBkg.css`; `/api/ready` 200 `{"status":"ready","db":"connected"}`
- Tester: Nattakit Prasertsak (B), UAT Team EN-009_P3. 2026-11-27 00:18 to 00:19 (UTC+7)
- Method: automated, headless Chromium (Playwright script `retest.cjs` / `retest124.cjs`, written by Claude Code on B's instruction), Est's handoff steps from `retest-handoff.md` at `163fdb7`. Accounts by label only (CUSTOMER-A, OPERATOR); no password in any file or screenshot.
- Test data created: orders #12 and #13 (Latte x1 each, CUSTOMER-A), both accepted by OPERATOR during the test.

| Issue | Expected (Est's retest-handoff) | Actual | Result | Evidence |
|---|---|---|---|---|
| #123 (F2, major) | At 375x812 with Latte in cart, Basil Chicken Rice name, price and full + clear above the cart bar | Scrolled to the bottom: name y 584 to 606, + y 585 to 629, the "1 item · ฿65.00 · View cart" bar starts below the item card; the centre of + hits the button | PASS | R-123-phone-bottom.png |
| #121 (F1) | `GET /api/orders/<id>` 400 `VALIDATION_ERROR` for `0x2`, `2e0`, `2.0`, `+2`, `0b10`, `0o2`, `%202`; UI "Order not found." | All 7 ids: 400 `VALIDATION_ERROR`; `/orders/0x2` detail panel "Order not found." | PASS | R-121-orders-0x2.png |
| #122 (F5) | Banner clears on the next page, never on `/login` after logout | `/operator/orders` as CUSTOMER-A redirects to `/menu` with "You don't have access..."; after My orders: gone; on `/login` after Log out: absent | PASS | R-122-1, R-122-2 |
| #124 (F3) | "Order #N placed!" gone after reload and not above ACCEPTED | #13: banner shown right after placing; after reload: absent; after OPERATOR accept + Refresh status: absent | PASS | R-124-0 (#13 right after placing), R-124-2 (#13 after accept); #13 after reload: log only (`retest-124-rerun-log.txt`, banner count 0). R-124-1 is order #12 from the first run, where the banner was never seen, so it does not prove the reload step |
| #125 (F4) | At 1280 px list row and detail both ACCEPTED after Refresh status | #12: list row "ACCEPTED" and detail ACCEPTED | PASS | R-124-125-after-accept.png |
| #126 (F6) | Login 400 shows the server message, not "Something went wrong" | `a..b@cafe.test`: API 400 "Invalid request.", shown "Invalid request."; CUSTOMER-A with a 201-character password: same | PASS | R-126-login-201-chars.png |
| #128 (EX-04) | Latte x2 (1 line): phone tab `Cart (1)`, desktop badge 1 | Phone "Cart (1)"; desktop count 1 | PASS | R-128-phone-cart-badge.png, R-128-desktop-cart-badge.png |
| #129 (EX-06) | 375x812 header shows Campus Café, no horizontal overflow | Header "Campus Café Hey, Alice CUSTOMER Log out"; scrollWidth 375 = viewport 375 | PASS | R-129-phone-header.png |
| #132 (EX-05) | Desktop queue is a `<table>` with Order, Customer, Items, Placed, Total, Action | 1 `<table>`, but each row has 7 cells (`#id`, status pill, customer, items, placed, total, action) under 6 headers: the status column has no header, so Customer labels the status, Items the customer, Placed the items, Total the time and Action the total (`client/src/pages/QueuePage.tsx` at `163fdb7`, lines 116 to 141). Assistive technology still gets wrong column labels | FAIL | R-132-operator-table.png |

**8 of 9 PASS, 1 FAIL (#132).** Correction 2026-11-27: #132 was first recorded and posted as PASS because the script counted only the 6 headers; the screenshot and the source show the headers are one column out of line with the cells.

Corrections to the raw log (`retest-log.txt`), checked on the screenshots and a rerun:
- #121 was logged FAIL because the script read only the first 160 characters of the page; the screenshot shows "Order not found." in the detail panel. PASS.
- #124 was logged FAIL because the first run checked the banner after waiting for the network to settle, which can be after it went; the rerun (`retest-124-rerun-log.txt`, order #13) sees "Order #13 placed!" right after placing, then not after reload or accept. PASS.
- #123 PASS in the log, but the script did not find the cart bar (it is not `position: fixed`, `top y Infinity`); the verdict rests on the screenshot and the hit test.


## UAT-04 re-run (persistence and double accept), tester B, 2026-11-27 00:20 to 00:20:43 (UTC+7)

Same steps as our first run on `b71cdb2` (`uat-execution.md`, UAT-04). Order #P = 14 (Thai Milk Tea x1, ฿50.00), log `uat04-rerun-log.txt`.

| Step | Actual | Evidence |
|---|---|---|
| 1 | CUSTOMER-A logged out, the browser context was closed, a new one opened, signed in again | |
| 2 | My orders row "#14 00:20 · 1 item PLACED ฿50.00"; `/orders/14` shows Thai Milk Tea, ฿50.00, PLACED | U04-1-listed-after-new-session.png |
| 3 | Two OPERATOR sessions both list #14 | |
| 4 | Window 1 Accept: "Order #14 accepted.", row gone | U04-2a-window1-accepted.png |
| 5 | Window 2, not reloaded, Accept: "Order #14: Already accepted by another staff member.", row gone | U04-2-second-accept-refused.png |
| 6 | CUSTOMER-A `/orders/14`: ACCEPTED, ฿50.00, "Accepted — being prepared soon." | U04-3-customer-sees-accepted.png |

**UAT-04: PASS** (same as on `b71cdb2`). Test data: order #14, accepted.

Not done here (owner A, or both): re-run UAT-01, 03, 05 on `163fdb7`; Kirakit's UAT-01/03/05 rows from the first run; the acceptance decision block in Est's `retest-handoff.md`.

Correction posted on Est #132: https://github.com/vienggd/Food-order/issues/132#issuecomment-7199458383 (2026-11-27 00:41 UTC+7). The raw `retest-log.txt` keeps the script output as it ran (#121 and #124 FAIL, #132 PASS); this file holds the checked verdicts.
