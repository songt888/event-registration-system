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

**Method.** Manual tests in Chrome, one private window per account, as their handoff asks. Each tester writes what they actually saw, never the expected text. Every outcome has a screenshot with an evidence ID (`E-B<case>-<n>`). For rejected operations we show the rejection and that the protected data did not change or leak. Times are local (UTC+7).

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
| Tester / date and time | Kirakit Kingkaew, EN-009_P3 / |
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
| Tester / date and time | Kirakit Kingkaew, EN-009_P3 / |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A, CUSTOMER-B, OPERATOR; order #A from UAT-01; `/orders/99999` |
| Actual result (per step) | 1: <br>2: <br>3: <br>4: <br>5: <br>6: |
| Result | |
| Evidence | E-B03-1 (customer on `/operator/orders` refused), E-B03-2 (CUSTOMER-B on `/orders/A`: no Alice data), E-B03-4 (OPERATOR on `/menu` refused), E-B03-3 (order #A unchanged afterwards) |
| Checked by | B |

### UAT-05 Wrong password and log out

| Field | Value |
|---|---|
| Tester / date and time | Kirakit Kingkaew, EN-009_P3 / |
| Version | `b71cdb2` |
| Inputs | CUSTOMER-A; wrong password `wrong-password-1` |
| Actual result (per step) | 1: <br>2: <br>3: <br>4: |
| Result | |
| Evidence | E-B05-1 (wrong-password message), E-B05-2 (after logout, Back and `/orders` end on `/login`) |
| Checked by | B |

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
| UAT-01 | A | | |
| UAT-03 | A | | |
| UAT-05 | A | | |
| UAT-02 | B | | |
| UAT-04 | B | | |
| UAT-06 | B | | |

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
