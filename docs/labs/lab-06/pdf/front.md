<!-- Lab 6 PDF front matter (L6-08 #127): cover, contents, version table, final decisions. Shared by A and B. Page ranges are filled from the built PDF. -->

# CPE 334 Lab 6: Sprint 1 User Acceptance Testing

Team EN-009_P3, section &lt;section&gt;. Theme 3: Event Registration and Attendance System.

| Item | Value |
|---|---|
| Students | Kirakit Kingkaew 67070503460 (A), Nattakit Prasertsak 67070503413 (B) |
| Repository | https://github.com/songt888/event-registration-system |
| Sprint 1 scope (accepted for test) | F-01 to F-06: sign in and out, organizer publishes an event, browse events, participant registers, participant's own registrations, organizer's registrations of an own event. Contract at tag `v0.1.0-sprint1` (`12dcd3c`, AC-01 to AC-51) |
| Release under UAT | tag `v0.1.2-lab5`, commit `04e8590`, Cloud Run revision `s47a6b53b-00005-5l7` |
| Corrected release | tag `v0.1.3-lab6`, commit `502d2a6` (release PR #181), revision `s47a6b53b-00006-7bv` |
| Deployed URL | https://s47a6b53b-4d7hbszvwq-as.a.run.app |
| Partner team | Est (EN-033), section 131, "Campus Café Pre-order" (`vienggd/Food-order`): Garunyapas Danpitakkul, Dechayut Panyawutvorakul |
| UAT of our product (by Est) | **Accepted**, 2026-11-27, on `v0.1.3-lab6` (our Issue #126) |
| UAT of Est's product (by us) | **Accepted**, 2026-11-27, on their `39bda5e` / `food-order-00009-jd9` (our Issue #129) |

No password, token, cookie, connection string or key appears in this PDF or its figures. Accounts are named by label only.

## Contents

| Part | Content | Author / checker | Pages | Evidence IDs |
|---|---|---|---|---|
| A | UAT preparation and handoff (our product, Product Team role) | A / B | 3–4 | E-A1 to E-A3 |
| B | Independent execution (Est's product, UAT Team role) | A / B | 5–11 | E-B01-1 to E-B06-2 |
| C | Reports, triage and corrections | B / A | 12–14 | E-C141 to E-C154, E-C-B (l6-05); Est's report screenshots on Est #121 to #133; l6-03-explore x02 to x09 |
| D | Retest and final acceptance decisions | B / A | 15–22 | E-D-L606 to E-D-L620; B retest R-121 to R-132, R2-132 (l6-07b); A retest E-R-122 to E-R-U05 (l6-07b-a) |
| Appendices | A1 cases, A2 handoff, A3 review text, A4 Est's decision, B1 execution record | | 23–37 | |

## Version table

**Our product** (`songt888/event-registration-system`)

| Step | Version | Note |
|---|---|---|
| Sprint 1 baseline | tag `v0.1.0-sprint1`, `12dcd3c` | the accepted-for-test contract |
| Release under UAT | tag `v0.1.2-lab5`, `04e8590`, revision `s47a6b53b-00005-5l7` | Lab 5 deployment changes only (Docker, CI/CD, Express serves the UI); no Sprint 1 behavior change (D-27) |
| Defective and test commits | per finding in Part D (D.1) | each fix: contract commit, RED test commit (run on the pre-change code), GREEN commit, evidence; Issues L6-09 to L6-20 (#156 to #177) |
| Corrected release | release PR #181 `lab6-staging` → `main`, merge commit `502d2a6`, tag `v0.1.3-lab6` | client and E2E changes only; no server, schema or migration change |
| Deployed revision | `s47a6b53b-00006-7bv` | deployed 2026-11-26 23:25 (UTC+7); production data not reset (D-20) |
| Merge commits | every change reached `lab6-staging` through a reviewed PR; `main` only through the release PR | later Lab 7 commits on `main` are outside this lab |

**Est's product** (`vienggd/Food-order`)

| Step | Version | Note |
|---|---|---|
| Release under UAT | `main` `b71cdb2` (their PR #84) | our first run, 2026-11-25 |
| Corrected release | `main` `163fdb7` (their PR #168), revision `food-order-00008-v6c` | our retest, 2026-11-27 00:18 to 01:51 |
| Fix for #132 | `main` `39bda5e` (their PR #181), revision `food-order-00009-jd9` | our retest of #132 and B's regression of all nine fixes, 2026-11-27 03:32 to 03:43 |

## Final UAT decisions

| Direction | Decision | Version | Testers, date | Record |
|---|---|---|---|---|
| Est on our product | **Accepted**: 13 of 13 findings retested PASS, all affected cases PASS, no open defect, no case BLOCKED | `v0.1.3-lab6` / `502d2a6` / `s47a6b53b-00006-7bv` | Garunyapas Danpitakkul, Dechayut Panyawutvorakul, 2026-11-27 | our Issue #126 (quoted in Appendix A4) |
| We on Est's product | **Accepted**: 9 of 9 accepted defects PASS (major #123 included; #132 FAIL on `163fdb7`, PASS on `39bda5e`); #130, #131, #133 are enhancements deferred by Est to Sprint 3 | `39bda5e` / `food-order-00009-jd9` | Kirakit Kingkaew, Nattakit Prasertsak, 2026-11-27 | our Issue #129, signed by B and A (Part D) |
