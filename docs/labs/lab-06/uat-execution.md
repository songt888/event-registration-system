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
| Tester / date and time | Nattakit Prasertsak, EN-009_P3 / |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A; Thai Milk Tea ×10, try ×11; Croissant |
| K before / order number | K = ; # |
| Actual result (per step) | 1–2: <br>3: <br>4: <br>5: <br>6: |
| Result | |
| Evidence | E-B02-1 (stepper stops at 10), E-B02-2 (total ฿500.00), E-B02-3 (Croissant sold out, add disabled), E-B02-4 (My orders count K + 1) |
| Checked by | A |

### UAT-04 Persistence and double accept

| Field | Value |
|---|---|
| Tester / date and time | Nattakit Prasertsak, EN-009_P3 / |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A new order Thai Milk Tea ×1; OPERATOR in two windows |
| Order number | #P = |
| Actual result (per step) | 2: <br>4: <br>5: <br>6: |
| Result | |
| Evidence | E-B04-1 (order listed after a new session), E-B04-2 (second accept refused), E-B04-3 (customer sees ACCEPTED, ฿50.00) |
| Checked by | A |

### UAT-06 Tampered price or total (API, optional)

| Field | Value |
|---|---|
| Tester / date and time | Nattakit Prasertsak, EN-009_P3 / |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A; `LATTE_ID` from `/api/menu`; bodies with `unitPrice: 1` and with `total: 1` |
| K before | K = |
| Actual result (per step) | 1: <br>2: <br>3: |
| Result | |
| Evidence | E-B06-1 (console: both responses), E-B06-2 (My orders still K) |
| Checked by | A |

## Summary

| Case | Tester | Result | Finding (sheet row / Issue) |
|---|---|---|---|
| UAT-01 | A | Preliminary observations recorded. Formal result pending. | Exploratory: EX-01, EX-04, EX-05, EX-06 |
| UAT-03 | A | Preliminary observations recorded. Formal result pending. | Exploratory: EX-02 |
| UAT-05 | A | Preliminary observations recorded. Formal result pending. | Exploratory: EX-02, EX-03, EX-07 |
| UAT-02 | B | | |
| UAT-04 | B | | |
| UAT-06 | B | | |

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
