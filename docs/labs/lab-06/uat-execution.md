# Lab 6 — Part B: our UAT of the partner's app (L6-03 #122)

We are the **UAT Team** for team **Est** (EN-033), product "Campus Café Pre-order". These results are ours as independent testers.

| Item | Value |
|---|---|
| Product team | Est (EN-033), section 131: Dechayut Panyawutvorakul, Garunyapas Danpitakkul |
| UAT testers | Kirakit Kingkaew (A), Nattakit Prasertsak (B), team EN-009_P3 |
| Release under test | commit `b71cdb2` on `vienggd/Food-order` `main` (merge of their PR #84, Lab 5); no tag on this commit, as their handoff says |
| URL | https://food-order-d4jdyxqbca-as.a.run.app |
| Their handoff and cases | `vienggd/Food-order` branch `lab6`, `docs/labs/lab-06/handoff.md` and `uat-cases.md` (read at commit `e1057b7`) |
| Their contract | `docs/sprint_1/sprints/sprint-1/F-01..F-04` in their repo |
| Accounts used | CUSTOMER-A, CUSTOMER-B, OPERATOR (labels only; the password came privately and is never written here) |
| Where FAILs go | Est's shared sheet (Est gives the link on Discord; link: _to add_) plus an Issue on `vienggd/Food-order` (see "Reporting a failure") |
| Pre-check | `GET /api/ready` returned 200 `{"status":"ready","db":"connected"}` on 2026-11-25 (A, before testing) |

**Method.** Est's handoff asks for manual Chrome or Edge testing with a separate private window per account. Record actual behavior, local time (UTC+7) and screenshot IDs (`E-B<case>-<n>`). For rejected operations, record the rejection and check that the protected data stayed unchanged and was not shown.

A's UAT-01, UAT-03 and UAT-05 observations below come from Codex Computer Use on the live site, with explicit sign-out between accounts in a shared browser tab. They are preliminary. A's manual run in separate private windows, screenshots and B's cross-check remain pending.

B reported running UAT-02, UAT-04 and UAT-06 both manually in Chrome and with Claude Code using agent-browser (headless Chromium, one browser session per account). The agent-browser screenshots are page-only, so B will include URL and local time in the result rows.

## Who runs what

Their cases share accounts and depend on earlier orders (UAT-03 uses UAT-01's order; UAT-02 and UAT-06 count CUSTOMER-A's orders). So **A and B do not run at the same time**: A runs first, then B, and B notes `K` right before UAT-02 and UAT-06.

This order differs from Est's handoff (UAT-01 → 06). It is safe: no case needs data from a later case, and UAT-03 and UAT-04 still run after the cases they depend on (UAT-01, and UAT-04's own new order).

| Order | Case | Category | Tester | Checker |
|---|---|---|---|---|
| 1 | UAT-01 Place an order, staff accepts it | Normal journey | A | B |
| 2 | UAT-03 Wrong role and another customer's order | Forbidden / ownership | A | B |
| 3 | UAT-05 Wrong password and log out | Normal / state | A | B |
| 4 | UAT-02 Quantity limit and sold-out item | Rule boundary | B | A |
| 5 | UAT-04 Persistence and double accept | State / persistence | B | A |
| 6 | UAT-06 Tampered price or total (API, optional) | Forbidden (API) | B | A |

Their four required categories are covered: normal (UAT-01), business rule/boundary (UAT-02), forbidden role/ownership (UAT-03), state/persistence (UAT-04).

## Results

Fill in one block per case. Result is PASS, FAIL or BLOCKED (with the reason; BLOCKED is not a pass). Every FAIL becomes a row in their shared sheet and an outgoing report (L6-04 #123).

### UAT-01 Place an order, staff accepts it

| Field | Value |
|---|---|
| Tester / date and time | Kirakit Kingkaew, EN-009_P3 (case owner); Codex Computer Use / 2026-11-25, 20:30 (order time shown by the app) |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A, OPERATOR; Latte ×2, Americano ×1 |
| Order number | #3 |
| Actual result (per step) | 1: CUSTOMER-A landed on `/menu` with the customer header.<br>2–3: Added Latte ×2 and Americano ×1. Cart showed two lines and ฿185.00 total.<br>4: `/orders/3` displayed `Order #3 placed!`, `PLACED` and the waiting message. Unit prices were ฿65.00 and ฿55.00, total ฿185.00.<br>5: OPERATOR saw #3 in the New orders queue with the same items and total.<br>6: The queue displayed `Order #3 accepted.` and removed the card. The transient `Accepting…` label was not captured.<br>7: CUSTOMER-A reopened #3 and saw `ACCEPTED`, the accepted message and the unchanged ฿185.00 total. |
| Result | Preliminary workflow matched the observations above. Formal result pending manual run and screenshots. |
| Evidence | Screenshots pending: E-B01-1 (order placed page), E-B01-2 (operator accepts), E-B01-3 (customer sees ACCEPTED) |
| Checked by | B pending |

### UAT-03 Wrong role and another customer's order

| Field | Value |
|---|---|
| Tester / date and time | Kirakit Kingkaew, EN-009_P3 (case owner); Codex Computer Use / 2026-11-25 (exact test time not recorded) |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A, CUSTOMER-B, OPERATOR; order #3 from UAT-01; `/orders/99999` |
| Actual result (per step) | 1: CUSTOMER-A was redirected from `/operator/orders` to `/menu` with the access warning. No queue was shown.<br>2–3: CUSTOMER-B saw `Order not found.` for both #3 and #99999. No order lines or total from #3 were shown.<br>4: Opening `/menu` while signed out redirected to `/login`.<br>5: OPERATOR was redirected from `/menu` to `/operator/orders` with the access warning. No customer menu was shown.<br>6: CUSTOMER-A reopened #3 and saw the same `ACCEPTED` status and ฿185.00 total. |
| Result | Preliminary access checks matched the observations above. Formal result pending manual run and screenshots. |
| Evidence | Screenshots pending: E-B03-1 (customer on `/operator/orders` refused), E-B03-2 (CUSTOMER-B on `/orders/3`: no Alice data), E-B03-4 (OPERATOR on `/menu` refused), E-B03-3 (order #3 unchanged afterwards) |
| Checked by | B pending |

### UAT-05 Wrong password and log out

| Field | Value |
|---|---|
| Tester / date and time | Kirakit Kingkaew, EN-009_P3 (case owner); Codex Computer Use / 2026-11-25 (exact test time not recorded) |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A; wrong password `wrong-password-1` |
| Actual result (per step) | 1: Wrong password showed `Incorrect email or password.` and cleared the password input. The subsequent login succeeded without re-entering the email.<br>2: Correct password opened `/menu`.<br>3: Log out returned to `/login`.<br>4: In the follow-up run after viewing order #4, Back and reload stayed on `/login` without showing order details. A separate direct visit to `/orders` while signed out also returned to `/login`. |
| Result | Preliminary sign-in and logout checks matched the observations above. Formal result pending manual run and screenshots. |
| Evidence | Screenshots pending: E-B05-1 (wrong-password message), E-B05-2 (after logout, Back and `/orders` end on `/login`) |
| Checked by | B pending |

### UAT-02 Quantity limit and sold-out item

| Field | Value |
|---|---|
| Tester / date and time | Nattakit Prasertsak, EN-009_P3 (case owner); Claude Code agent-browser / 2026-11-25, 21:11:17 to 21:12:06 |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A; Thai Milk Tea ×10, try ×11; Croissant |
| K before / order number | K = 3 (#4, #3, #2); #5 |
| Actual result (per step) | 1–2: Added Thai Milk Tea, raised it with the stepper to 10. At 10 the **More** button was disabled; typing 11 in the box left 10; the menu **+** on Thai Milk Tea stayed enabled but the quantity stayed 10. Estimated total ฿500.00.<br>3: Placed at 21:11:53; `/orders/5` showed `Order #5 placed!`, Thai Milk Tea ฿50.00 × 10, total ฿500.00, `PLACED`.<br>4: Croissant greyed with a `Sold out` badge.<br>5: **Add Croissant** was disabled; the click did not reach it and the cart stayed empty.<br>6: My orders listed 4 orders = K + 1 (#5, #4, #3, #2). Lines: #5 Thai Milk Tea ×10; #4 Latte ×1, Americano ×1; #3 Latte ×2, Americano ×1; #2 Thai Milk Tea ×1, Basil Chicken Rice ×2. None has Croissant. |
| Result | PASS |
| Evidence | E-B02-0 (K before), E-B02-1 (stepper stops at 10), E-B02-2 (total ฿500.00, `/orders/5`), E-B02-3 (Croissant sold out, add disabled), E-B02-4 (My orders count K + 1), in `evidence/l6-03/` |
| Checked by | A |

### UAT-04 Persistence and double accept

| Field | Value |
|---|---|
| Tester / date and time | Nattakit Prasertsak, EN-009_P3 (case owner); Claude Code agent-browser / 2026-11-25, 21:12:20 to 21:13:36 |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A new order Thai Milk Tea ×1; OPERATOR in two browser sessions |
| Order number | #P = 6 (placed 21:12:20, ฿50.00, `PLACED`) |
| Actual result (per step) | 1: Logged out, closed the browser, opened a new browser and logged in again as CUSTOMER-A.<br>2: My orders row `#6 21:12 · 1 item PLACED ฿50.00`; `/orders/6` showed Thai Milk Tea ฿50.00 × 1, total ฿50.00.<br>3: Both operator sessions listed #1 (Smoke Test), #5 and #6.<br>4: Window 1 pressed **Accept order** on #6 at 21:13:28: `Order #6 accepted.` and the card was gone.<br>5: Window 2 (not reloaded, still showing #6) pressed **Accept order**: `Order #6: Already accepted by another staff member.`; the list reloaded and showed only #1 and #5.<br>6: CUSTOMER-A opened `/orders/6`: `ACCEPTED`, total ฿50.00, hint `Accepted — being prepared soon.`, timeline `Accepted 21:13`. |
| Result | PASS |
| Evidence | E-B04-1 (order listed after a new session), E-B04-2a (window 1 accepted), E-B04-2 (second accept refused), E-B04-3 (customer sees ACCEPTED, ฿50.00), in `evidence/l6-03/` |
| Checked by | A |

### UAT-06 Tampered price or total (API, optional)

| Field | Value |
|---|---|
| Tester / date and time | Nattakit Prasertsak, EN-009_P3 (case owner); Claude Code agent-browser / 2026-11-25, 21:13:46 to 21:14:03 |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A; `LATTE_ID` = 1 from `/api/menu`; bodies with `unitPrice: 1` and with `total: 1` |
| K before | K = 5 |
| Actual result (per step) | 1: `unitPrice: 1` body: status 400, `error.code` `VALIDATION_ERROR`, details `Unrecognized key: "unitPrice"` at `items[0]`.<br>2: `total: 1` body: status 400, `error.code` `VALIDATION_ERROR`, details `Unrecognized key: "total"`.<br>3: My orders still listed 5 orders = K. |
| Result | PASS |
| Evidence | E-B06-0 (K before), E-B06-1 (console output of both responses, text file), E-B06-2 (My orders still K), in `evidence/l6-03/` |
| Checked by | A |

## Summary

| Case | Tester | Result | Finding (sheet row / Issue) |
|---|---|---|---|
| UAT-01 | A | Preliminary observations recorded. Formal result pending. | Exploratory: EX-01, EX-04, EX-05, EX-06 |
| UAT-03 | A | Preliminary observations recorded. Formal result pending. | Exploratory: EX-02 |
| UAT-05 | A | Preliminary observations recorded. Formal result pending. | Exploratory: EX-02, EX-03, EX-07 |
| UAT-02 | B | PASS | none (side note: EX-13) |
| UAT-04 | B | PASS | none |
| UAT-06 | B | PASS | none |

## Exploratory findings for cross-check

Codex Computer Use reproduced these seven behaviors on the deployed demo site. Severity is proposed as minor. Screenshots and A/B cross-check are outstanding. These entries are candidates for Est's triage and are separate from the supplied cases' formal outcomes.

| ID | Case | Steps and actual result | Expected or suggested behavior |
|---|---|---|---|
| EX-01 | UAT-01 | At 320 px, open Cart from the bottom tab and press Tab. Focus goes to My orders while the cart is open. | Move keyboard focus to a control in the open cart. |
| EX-02 | UAT-03 / UAT-05 | As CUSTOMER-A, open the operator queue. After the redirect and warning, log out without dismissing it. The warning remains on Sign in and disappears on reload. | Normal logout clears the prior page's access warning. |
| EX-03 | UAT-05 | Submit an empty Sign in form. The two required-field messages are visible, but have no field association or live announcement in the browser's page structure. | Associate the errors with their fields and expose new messages to assistive technology. |
| EX-04 | UAT-01 | On mobile, add Latte twice. The cart has one line and shows two items, but the tab reads Cart (2). | The shared UI specification calls for the badge to count lines. The tab should show Cart (1), with two items and ฿130.00 still shown in the cart. |
| EX-05 | UAT-01 | At 1440 px, open the operator queue. Column labels are visible but hidden from assistive technologies with `aria-hidden`. The order rows are a list. | Expose the desktop queue's column labels and their relationship to the row values. |
| EX-06 | UAT-01 | At mobile widths, view the customer Menu and the operator Order queue. Their top bars show name, role and Log out, but omit the café brand. | The shared UI specification includes the brand in the mobile top bar. |
| EX-07 | UAT-05 | Submit with an empty or malformed email. Correct it and press Tab. The original error remains and the input still has `aria-invalid="true"`. | Clear or update the stale error after correction. This is a UX finding. The specification does not say when to clear validation errors. |

EX-03 and EX-05 were checked through browser accessibility information and page structure. Screen-reader playback was not tested. See Est's [Sprint 1 UI specification](https://github.com/vienggd/Food-order/blob/lab6/docs/sprint_1/ui/ui-spec.md) for the expected mobile header and Cart badge behavior.

**B's cross-check of EX-01 to EX-07** (Claude Code agent-browser, 2026-11-25, 21:54:49 to 21:55:47, CUSTOMER-A and OPERATOR, no orders placed): all seven reproduced.

| ID | B's actual result | Evidence |
|---|---|---|
| EX-01 | At 320 px, **Cart** tab opened `/menu#cart`; one Tab moved focus to the `My orders` link, outside the cart. | X-EX01 |
| EX-02 | CUSTOMER-A opened `/operator/orders`, landed on `/menu` with the warning, pressed **Log out**: `/login` still showed `You don't have access to that page.` Same family as EX-09 below. | X-EX02 |
| EX-03 | Empty Sign in: both inputs `aria-invalid="true"`, no `aria-describedby`; the two `.field-error` messages have no role and no live region. | X-EX03 |
| EX-04 | Latte added twice: 1 cart line, tab reads `Cart (2)`. ui-spec line 62: "Cart ... with the number of cart lines". The desktop sidebar count does the same (`Menu 10` for one line of 10 in E-B02-1). | X-EX04 |
| EX-05 | At 1440 px the queue header row has `aria-hidden="true"`; the queue is a `UL`; no `table` or `role=table` on the page. | X-EX05 |
| EX-06 | Phone top bar text: `Hey, Alice / CUSTOMER / Log out`; no brand. ui-spec line 62 lists the brand in the phone top bar. | (text check) |
| EX-07 | `alice@` submitted: `Enter a valid email.`, `aria-invalid="true"`; corrected to `alice@cafe.test` and pressed Tab: the same error and `aria-invalid="true"` stayed. | X-EX07 |

**B's exploratory findings** (Claude Code agent-browser and a review of Est's public source at `b71cdb2`, 2026-11-25, 21:07 to 21:22). Sent to Est as a PDF report with IDs F1 to F6; the F ID is kept for their triage.

| ID | Report ID | Steps and actual result | Expected | Proposed severity |
|---|---|---|---|---|
| EX-08 | F1 | As CUSTOMER-A, `GET /api/orders/0x2`, `2e0`, `2.0`, `+2`, `0b10`, `0o2`, `%202` each gave 200 with order #2 (`abc` gave 400). As OPERATOR, accept `0x2` and `2e0` on accepted #2 gave 409, `abc` gave 400. Cause: `server/src/ids.ts:5` `z.coerce.number()`. | AC-F03-08 and AC-F04-08: a malformed id gives 400 `VALIDATION_ERROR`. | minor |
| EX-09 | F5 | As CUSTOMER-A, open `/operator/orders` (warning on `/menu`), then add Latte and place order #9: `/orders/9` shows `You don't have access to that page.` next to `Order #9 placed!`. Report this together with EX-02 as one Issue. | The warning is for one redirect only. | minor |
| EX-10 | F2 | 375 × 812 with any item in the cart, scrolled to the bottom: the fixed cart bar (y 676 to 728) covers Basil Chicken Rice's name, price and **+** (y 657 to 701); only a 19 px strip of **+** is tappable. | Every available item can be seen and added (AC-F02-06, F-03 add). | major |
| EX-11 | F3 | Place #8: `Order #8 placed!` stays after a page reload, and after OPERATOR accepts #8 and the customer presses **Refresh status** it shows above `ACCEPTED`. | The success message is not shown again on reload or above a later status. | minor |
| EX-12 | F4 | Desktop, same screen: after **Refresh status** the detail shows #8 `ACCEPTED`, the list still shows #8 `PLACED`. | One status per order on one screen. | minor |
| EX-13 | F6 | Sign in with `a..b@cafe.test` (passes the page's email check) or a 201-character password: server 400, page shows `Something went wrong. Please try again.` | ui-spec error table: a 400 shows `error.message` in the error box. | minor |

Side note (not a finding): on the menu, **+** for an item already at 10 stays enabled and does nothing; AC-F03-12 only requires the quantity not to pass 10.

Evidence for this section: `evidence/l6-03/` (X-EX01 to X-EX07) and `evidence/l6-03-explore/` (F1 to F6 screenshots).

## Reporting a failure (feeds L6-04 #123)

Est's handoff lets us open the Issue ourselves on their public repo: "You may open it yourselves instead (label `lab6`); then put the link in the sheet."

1. The tester sends the failing case, step, actual result, time and screenshot to A (or B).
2. We write the Issue from the template below and both of us read it before it is posted.
3. Post it at https://github.com/vienggd/Food-order/issues. We are not collaborators there, so GitHub drops labels we set; the body asks Est to add `lab6`.
4. Put the Issue link in Est's shared sheet and the summary table above, add a row to the outgoing table below, and tell Est on Discord.
5. Record Est's triage answer (defect, duplicate, not a defect, enhancement) and reason in the outgoing table when it arrives.

Never put a password, token or personal email in an Issue or screenshot.

### Issue template

```markdown
Title: UAT finding: <short summary> (UAT-0X step N)

**Reporter:** <name>, UAT Team EN-009_P3 (testing team Est's Sprint 1 release)
**Product team:** Est (EN-033)
**Tested version:** commit `b71cdb2`, https://food-order-d4jdyxqbca-as.a.run.app
**Tested at:** <YYYY-MM-DD HH:MM> (UTC+7)
**Case / requirement:** UAT-0X step N; <AC / FR / BR from their uat-cases.md>
**Defect or feature request:** defect against specified behavior (<contract file and AC>) | feature request

**Preconditions and data**
- Account: <CUSTOMER-A / CUSTOMER-B / OPERATOR> (label only)
- Data: <order number, items, K>

**Steps to reproduce**
1. …
2. …

**Expected** (from <uat-cases.md / contract>)
…

**Actual**
…

**Severity:** <critical / major / minor>, because <user impact: who is affected and what they cannot do or what wrong data they get>

**Evidence:** <screenshot, evidence ID E-B0X-n>

Please add the label `lab6` (we cannot set labels on your repo) and reply with your triage decision.
```

## Outgoing reports (L6-04 #123)

| Our ID | Est Issue | Case and step | Summary | Severity | Reporter | Sent (date, channel) | Est's decision and reason |
|---|---|---|---|---|---|---|---|
| | | | _none yet_ | | | | |
