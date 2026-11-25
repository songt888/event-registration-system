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
| Pre-check | `GET /api/ready` returned 200 `{"status":"ready","db":"connected"}` on 2026-11-25 (A, before testing) |

**Method.** Manual tests in Chrome, one private window per account, as their handoff asks. Each tester writes what they actually saw, never the expected text. Every outcome has a screenshot with an evidence ID (`E-B<case>-<n>`). For rejected operations we show the rejection and that the protected data did not change or leak. Times are local (UTC+7).

## Who runs what

Their cases share accounts and depend on earlier orders (UAT-03 uses UAT-01's order; UAT-02 and UAT-06 count CUSTOMER-A's orders). So **A and B do not run at the same time**: A runs first, then B, and B notes `K` right before UAT-02 and UAT-06.

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
| Tester / date and time | A / |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A, OPERATOR; Latte ×2, Americano ×1 |
| Order number | # |
| Actual result (per step) | 1: <br>3: <br>4: <br>5: <br>6: <br>7: |
| Result | |
| Evidence | E-B01-1 (order placed page), E-B01-2 (operator accepts), E-B01-3 (customer sees ACCEPTED) |
| Checked by | B |

### UAT-03 Wrong role and another customer's order

| Field | Value |
|---|---|
| Tester / date and time | A / |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A, CUSTOMER-B, OPERATOR; order #A from UAT-01; `/orders/99999` |
| Actual result (per step) | 1: <br>2: <br>3: <br>4: <br>5: <br>6: |
| Result | |
| Evidence | E-B03-1 (customer on `/operator/orders` refused), E-B03-2 (CUSTOMER-B on `/orders/A`: no Alice data), E-B03-3 (order #A unchanged afterwards) |
| Checked by | B |

### UAT-05 Wrong password and log out

| Field | Value |
|---|---|
| Tester / date and time | A / |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A; wrong password `wrong-password-1` |
| Actual result (per step) | 1: <br>2: <br>3: <br>4: |
| Result | |
| Evidence | E-B05-1 (wrong-password message), E-B05-2 (after logout, Back and `/orders` end on `/login`) |
| Checked by | B |

### UAT-02 Quantity limit and sold-out item

| Field | Value |
|---|---|
| Tester / date and time | B / |
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
| Tester / date and time | B / |
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
| Tester / date and time | B / |
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
| UAT-01 | A | | |
| UAT-03 | A | | |
| UAT-05 | A | | |
| UAT-02 | B | | |
| UAT-04 | B | | |
| UAT-06 | B | | |
