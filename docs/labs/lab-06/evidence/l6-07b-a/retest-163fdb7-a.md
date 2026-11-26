# Retest of team Est's corrected release (L6-07b #129), tester A

- Product: Est (EN-033) "Campus Café Pre-order", https://food-order-d4jdyxqbca-as.a.run.app
- Version retested: `vienggd/Food-order` `main` `163fdb7` (their PR #168), Cloud Run revision `food-order-00008-v6c` (from Est's Discord message); live bundle `index-D6oQEALR.js`, checked in the page at 01:36:50 before the run
- Tester: Kirakit Kingkaew (A), UAT Team EN-009_P3. 2026-11-27 01:40 to 01:51 (UTC+7)
- Method: **by hand**. A ran Est's steps from `uat-cases.md` at `163fdb7` in the built-in browser pane of the Claude desktop app, one tab, signing out between accounts (as in our first run). A signed in and pressed every control. Claude Code only noted the URL and time and took a screenshot when A asked (page-only, 1280 × 800 viewport scaled to 800 px). Accounts by label only; no password in any file or image.
- Test data created: order #15 (Latte ×2, Americano ×1, ฿185.00, CUSTOMER-A), accepted by OPERATOR at 01:42.
- Our first run of these cases on `b71cdb2` (A, by hand, 2026-11-25): [`uat-execution.md`](../../uat-execution.md), sections UAT-01, UAT-03, UAT-05.
- B's half (9 fixed defects, UAT-04): [`l6-07b/retest-163fdb7.md`](../l6-07b/retest-163fdb7.md) (PR #186).

## UAT-01 Place an order, staff accepts it: PASS

| Step | Time | Actual | Evidence |
|---|---|---|---|
| 1 | 01:40:01 | CUSTOMER-A on `/menu`; header shows Alice and CUSTOMER; cart empty | E-R-U01-1-menu-customer-a.jpg |
| 2–3 | 01:40:37 | Cart: two lines, Latte ×2 ฿130.00 and Americano ×1 ฿55.00; estimated total ฿185.00 | E-R-U01-3-cart.jpg |
| 4 | 01:41:00 | `/orders/15`; "Order #15 placed!"; Latte ฿65.00 × 2, Americano ฿55.00 × 1; total ฿185.00; PLACED; "Waiting for the café to accept your order." | E-R-U01-4-order-15-placed.jpg |
| 5 | 01:41:46 | OPERATOR on `/operator/orders`; "New orders 5"; row #15 Alice, Latte ×2, Americano ×1, 01:40, ฿185.00 (column headers one column out of line: #132) | E-R-U01-5-queue-shows-15.jpg |
| 6 | 01:42:15 | "Order #15 accepted."; #15 gone from the queue; "New orders 4". The "Accepting…" label was too short to see or capture | E-R-U01-6-order-15-accepted.jpg |
| 7 | 01:42:59, 01:43:27 | CUSTOMER-A My orders: #15 ACCEPTED ฿185.00. `/orders/15` after reload: ACCEPTED, "Accepted — being prepared soon.", total ฿185.00, Accepted 01:42; no "Order #15 placed!" banner | E-R-U01-7a-my-orders-list.jpg, E-R-U01-7-order-15-accepted-customer.jpg |

Step 7 also re-checks two fixes by hand: #124 (no "placed!" banner after reload or above ACCEPTED) and #125 (list row and detail both ACCEPTED): PASS.

## UAT-03 Wrong role and another customer's order: PASS

Order #A = #15 from UAT-01 above. All six steps by hand (on `b71cdb2` steps 3 and 4 came from an earlier AI-executed run).

| Step | Time | Actual | Evidence |
|---|---|---|---|
| 1 | 01:44:25 | CUSTOMER-A typed `/operator/orders`: on `/menu` with "You don't have access to that page."; menu shown, no queue | E-R-U03-1-customer-queue-refused.jpg |
| 2 | 01:45:46 | CUSTOMER-B typed `/orders/15`: "Order not found." and "Back to my orders"; no lines, total or name of Alice; Bob's list "No orders yet." | E-R-U03-2-bob-order-15-not-found.jpg |
| 3 | 01:46:25 | `/orders/99999`: the same "Order not found." | E-R-U03-3-order-99999-not-found.jpg |
| 4 | 01:46:54 | Signed out, loaded `/menu`: sent to `/login`, no menu | E-R-U03-4-signed-out-menu-to-login.jpg |
| 5 | 01:48:03 | OPERATOR loaded `/menu`: on `/operator/orders` with "You don't have access to that page."; queue shown, no menu list | E-R-U03-5-operator-menu-refused.jpg |
| 6 | 01:48:46 | CUSTOMER-A `/orders/15`: ACCEPTED, ฿185.00, Accepted 01:42, the same as at the end of UAT-01 | E-R-U03-6-order-15-unchanged.jpg |

Step 5 note: a first try at 01:47:40 typed `menu` without the leading slash, which the browser resolved to `/operator/menu` ("Page not found"). That was a typing slip, not a result; the step was repeated with the full URL.

Between steps 1 and 2, #122 by hand: after Log out (the access message was showing on `/menu`), `/login` at 01:44:50 shows no access message: PASS (E-R-122-login-after-logout.jpg).

## UAT-05 Wrong password and log out: PASS

| Step | Time | Actual | Evidence |
|---|---|---|---|
| 1 | 01:49:23 | alice@cafe.test with a wrong password: "Incorrect email or password."; password field empty (checked by its length only); email still alice@cafe.test | E-R-U05-1-wrong-password.jpg |
| 2 | 01:49:53 | Correct password: on `/menu`, Alice, CUSTOMER | E-R-U05-2-signed-in-menu.jpg |
| 3 | 01:50:10 | Log out: on `/login` | E-R-U05-3-logged-out.jpg |
| 4 | 01:50:40, 01:51:12 | Back, then reload: on `/login`, no menu or orders. Typed `/orders`: on `/login`, no orders | E-R-U05-4a-back-reload.jpg, E-R-U05-4b-orders-to-login.jpg |

Step 4 limit: whether `/menu` flashed for a moment after Back, before the redirect, was not observed; the page was checked after the reload.

## Summary (A's half)

| Item | Result |
|---|---|
| UAT-01 | PASS |
| UAT-03 | PASS (all steps by hand) |
| UAT-05 | PASS |
| #122, #124, #125 (hand re-check during the cases) | PASS |
| #121, #126, #132 | not re-checked by hand; B's results apply (#121, #126 PASS; #132 FAIL) |

With B's half: 8 of 9 fixed defects PASS, #132 FAIL (minor, column headers out of line); UAT-01, UAT-03, UAT-04, UAT-05 PASS; no case BLOCKED; the major defect #123 PASS. The acceptance decision is recorded by A and B together on #129.
