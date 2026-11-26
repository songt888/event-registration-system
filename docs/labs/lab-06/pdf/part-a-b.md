<!-- Lab 6 PDF, Parts A and B (L6-08 #127). Author: A (Kirakit Kingkaew). Checker: B. Draft. -->
<!-- Parts C and D (B) and the shared cover, contents, version table, contribution table, AI use and limitations are assembled with this file. -->

# Part A: UAT preparation and handoff (our product, Product Team role)

In Part A we are the **Product Team**. We prepared executable Sprint 1 UAT cases and a handoff so that team Est (EN-033) could test our application without verbal explanations.

## A.1 Release and scope handed over

| Item | Value |
|---|---|
| Product | Event Registration and Attendance System (CPE 334 Theme 3), team EN-009_P3 |
| Product Team | Kirakit Kingkaew (67070503460, A), Nattakit Prasertsak (67070503413, B) |
| UAT Team | Est (EN-033), section 131: Garunyapas Danpitakkul, Dechayut Panyawutvorakul |
| URL | https://s47a6b53b-4d7hbszvwq-as.a.run.app |
| Release under test | tag `v0.1.2-lab5`, commit `04e8590` (`main`), Cloud Run revision `s47a6b53b-00005-5l7` (D-27) |
| Accepted-for-test scope | Sprint 1 only: F-01 to F-06, contract `docs/sprints/sprint-1/` at tag `v0.1.0-sprint1` (`12dcd3c`, AC-01 to AC-51). The Lab 5 changes between `12dcd3c` and `04e8590` (Docker, CI/CD, deploy, Express serving the UI) do not change Sprint 1 behavior |
| Out of scope | cancellation, deadlines, check-in, attendance reports, waitlist, self sign-up, password recovery, editing or deleting events (Sprint 2 and 3) |
| Cases and handoff | `docs/labs/lab-06/uat-cases.md` and `handoff.md` at commit `e22c20a` (2026-11-24 22:37), reviewed in PR #128 (Appendix A1, A2) |

## A.2 Cases and required categories

Six cases, each with a stable ID, Sprint 1 references, purpose, role, preconditions, synthetic inputs, numbered actions and specific expected results. The full text is in Appendix A1.

| Case | Required category | Sprint 1 references | Roles |
|---|---|---|---|
| UAT-01 | Normal domain journey: organizer creates and publishes, participant registers | F-01 to F-04; AC-01, AC-06, AC-25, AC-10, AC-12, AC-24 | Organizer One, Participant 3 |
| UAT-02 | Business rule and boundary: invalid input, last place, duplicate | F-02, F-04; BR-02, BR-03; AC-07, AC-29, AC-13, AC-14 | Organizer One, Participant 3, Participant 4 |
| UAT-03 | Forbidden role and ownership | F-02, F-04, F-06; BR-05; AC-08, AC-20, AC-21, AC-33, AC-34 | Organizer Two, Participant 3 |
| UAT-04 | State, history and persistence across sign-out and new sessions | F-01, F-05, F-06; AC-04, AC-17, AC-19, AC-24 | Organizer One, Participant 3, Participant 4 |
| UAT-05 | Draft events hidden from participants | F-02, F-03; AC-10, AC-31, AC-32 | Organizer One, Participant 3 |
| UAT-06 | Sign-in errors and signed-out access | F-01; AC-02, AC-03, AC-24 | Participant 3 |

Not in the manual scope, and named in the cases so the UAT Team knows why: concurrent requests for the last place (AC-15, AC-37), session expiry after 60 minutes (AC-40), and requests the UI cannot send (AC-16, AC-18, AC-27). Automated tests in our repository cover them (TEST-15, TEST-37, TEST-40, TEST-16, TEST-18, TEST-27).

## A.3 Safe handoff

| Handoff item (handout 3.1) | Where | What it says |
|---|---|---|
| Release tag/commit, revision, URL | handoff section 1 | as in A.1; "if we deploy a new revision during your testing window, we tell you first" |
| Accepted-for-test scope | handoff section 1 | Sprint 1 F-01 to F-06 at `v0.1.0-sprint1`; Sprint 2 and 3 listed as out of scope |
| Roles and accounts | handoff section 2 | labels and roles only: Organizer One, Organizer Two (ORGANIZER); Participant 3, Participant 4 (PARTICIPANT). One shared synthetic password, sent only by Discord direct message; never in Git, a document or this PDF |
| Data setup | handoff section 3 | nothing to set up; the four seeded events are listed and must not be registered for (no cancellation in Sprint 1) |
| Reset and cleanup | handoff section 4 | none needed and none possible in Sprint 1; production is never reset (D-20, D-28). Each case creates its own event titled `UAT-<initials>-<case>-<HHMM>`, so it can be rerun |
| Independence and sequence | handoff section 4 | UAT-04 needs the tester's own UAT-01; UAT-03 needs an event with a registration. Suggested order UAT-06, 01, 04, 02, 03, 05 |
| Reporting | handoff sections 6 and 7 | one GitHub Issue per finding in our repository, with case, revision, account label, steps, expected, actual, severity and screenshot; Discord for scheduling and deploy notices |

| ID | Evidence | Time / version |
|---|---|---|
| E-A1 | `uat-cases.md` and `handoff.md` at `e22c20a` (Appendix A1, A2); review of PR #128 by B (quoted in Appendix A3) | 2026-11-24 22:37 |
| E-A2 | Handoff exchange on Discord: our handoff link sent to Est, Est's handoff received, password sent by direct message (screenshot with the password not shown) | _A to add: screenshot and time_ |
| E-A3 | B's dry-run of all six cases on the live URL before the handoff: "every step matched except the notes below. no app defects found." (PR #128 review, changes requested, then approved at `e22c20a`) | 2026-11-24 |

## A.4 How the handoff was used

Est ran all six cases on `v0.1.2-lab5` / `04e8590` and reported that all six and their extra check X8 passed functionally, with the demo events and Participant One and 2 untouched (Est's Lab 6 message and their findings PDF, `UAT-findings-EN009_P3-by-Est.pdf`, Appendix A4). Their 13 findings came from exploratory testing around the cases; they are triaged in Part C.

## A.5 Limitations (Part A)

- Handoff section 7 left the session dates "to be agreed on Discord". The runs happened in chat-agreed slots (our run of Est's app on 25 Nov; Est's findings on our app filed on 26 Nov 15:47; fixes and release on 26 Nov; retests from 27 Nov), but the dates were not written back into the handoff, and the "agree on sessions" item on #121 stays open.
- The demo events start at times relative to the seed run, so their dates differ from those in the dry-run screenshots. The cases do not depend on them.

---

# Part B: Independent execution (Est's product, UAT Team role)

In Part B we are the **UAT Team** for Est's product. These results are ours as independent testers. Full record: `docs/labs/lab-06/uat-execution.md` (Appendix B1).

## B.1 Product, testers and release

| Item | Value |
|---|---|
| Product Team | Est (EN-033), section 131: Garunyapas Danpitakkul, Dechayut Panyawutvorakul. Product "Campus Café Pre-order" (ordering) |
| UAT testers | Kirakit Kingkaew (A) and Nattakit Prasertsak (B), team EN-009_P3 |
| Release under test | `vienggd/Food-order` `main` commit `b71cdb2` (merge of their PR #84; no tag, as their handoff says) |
| URL | https://food-order-d4jdyxqbca-as.a.run.app; pre-check `GET /api/ready` 200 `{"status":"ready","db":"connected"}` on 2026-11-25 |
| Their cases and handoff | `docs/labs/lab-06/uat-cases.md` and `handoff.md` in their repo, read at commit `e1057b7` |
| Accounts | CUSTOMER-A, CUSTOMER-B, OPERATOR (labels only; the password came privately) |

## B.2 Method and who ran what

Their cases share accounts and depend on earlier orders, so A and B never ran at the same time. The plan was A first; in fact B's session ran first (21:11 to 21:14) and A's after it (22:23 to 22:33). No case needed data from a later one: UAT-03 used A's own UAT-01 order.

| Case | Category | Tester | How it was run | Checker |
|---|---|---|---|---|
| UAT-01 Place an order, staff accepts it | Normal journey | A | **manual**: A signed in and pressed every control in the built-in browser pane of the Claude desktop app; Claude Code took screenshots and noted times on request | B |
| UAT-03 Wrong role and another customer's order | Forbidden / ownership | A | **manual**; steps 3 and 4 from an earlier AI-executed run (Codex Computer Use, A's instruction), labelled | B |
| UAT-05 Wrong password and log out | Normal / state | A | **manual**; the signed-out `/orders` check from the earlier AI-executed run, labelled | B |
| UAT-02 Quantity limit and sold-out item | Rule boundary | B | AI-executed: Claude Code agent-browser (headless Chromium) on B's instruction; B also ran parts by hand in Chrome | A |
| UAT-04 Persistence and double accept | State / persistence | B | AI-executed (agent-browser), one browser session per account | A |
| UAT-06 Tampered price or total (API, optional) | Forbidden (API) | B | AI-executed (agent-browser), API calls from the signed-in page | A |

## B.3 Results on `b71cdb2`

Actual results are what we saw, not the expected text. Times are UTC+7.

| Case | Tester, date and time | Inputs | Actual result (short; per step in Appendix B1) | Result | Evidence |
|---|---|---|---|---|---|
| UAT-01 | A, 2026-11-25 22:23–22:27 | CUSTOMER-A, OPERATOR; Latte ×2, Americano ×1 | Order #11 placed, total ฿185.00, PLACED; operator queue "New orders 5" listed #11; Accept gave "Order #11 accepted." and #11 left the queue ("Accepting…" too short to capture); customer then saw ACCEPTED, "Accepted — being prepared soon.", ฿185.00 | PASS | E-B01-1, E-B01-2a, E-B01-2, E-B01-3 |
| UAT-03 | A, 2026-11-25 22:25–22:31 | CUSTOMER-A, CUSTOMER-B, OPERATOR; order #11 | Customer on `/operator/orders` landed on `/menu` with "You don't have access to that page."; CUSTOMER-B on `/orders/11` saw "Order not found." and no line, total or name of Alice; OPERATOR on `/menu` landed on the queue with the same message; #11 still ACCEPTED ฿185.00 afterwards | PASS | E-B03-1, E-B03-2, E-B03-4, E-B03-3 |
| UAT-05 | A, 2026-11-25 22:31–22:33 | CUSTOMER-A; synthetic wrong password | "Incorrect email or password.", password field empty, email kept; correct password opened the app; Log out returned to `/login`; Back and reload stayed on `/login` with no menu or order data | PASS | E-B05-1, E-B05-2 |
| UAT-02 | B, 2026-11-25 21:11–21:12 | CUSTOMER-A; Thai Milk Tea ×10 then 11; Croissant | Stepper stopped at 10 (More disabled, typing 11 left 10); order #5 ฿500.00 placed; Croissant "Sold out" and Add disabled; My orders count K + 1 (3 → 4), no Croissant line | PASS | E-B02-0 to E-B02-4 |
| UAT-04 | B, 2026-11-25 21:12–21:13 | CUSTOMER-A new order; OPERATOR in two sessions | Order #6 still listed after logout and a new browser; window 1 accepted #6; window 2 (not reloaded) got "Order #6: Already accepted by another staff member."; customer saw ACCEPTED ฿50.00 | PASS | E-B04-1, E-B04-2a, E-B04-2, E-B04-3 |
| UAT-06 | B, 2026-11-25 21:13–21:14 | CUSTOMER-A; order body with `unitPrice: 1`, then with `total: 1` | Both 400 `VALIDATION_ERROR` ("Unrecognized key"); My orders count unchanged (K = 5) | PASS | E-B06-0, E-B06-1 (text), E-B06-2 |

**All six cases PASS on `b71cdb2`; none BLOCKED.** The four required categories are covered by UAT-01, UAT-02, UAT-03 and UAT-04.

For the rejected operations we checked that protected state was not changed or disclosed: UAT-03 step 2 shows no data of Alice to CUSTOMER-B, and step 6 shows #11 unchanged; UAT-04 shows the second accept refused and the order accepted once; UAT-06 shows the order count unchanged after both refused requests.

## B.4 Selected evidence

Each figure: evidence ID, action, expected / actual, time, version `b71cdb2`.

| ID | Action | Expected | Actual | Time |
|---|---|---|---|---|
| E-B01-1 | CUSTOMER-A places Latte ×2, Americano ×1 | `/orders/N`, "Order #N placed!", ฿185.00, PLACED | `/orders/11`, "Order #11 placed!", ฿185.00, PLACED | 22:23:30 |
| E-B01-3 | CUSTOMER-A opens #11 after the operator accepted | ACCEPTED, total unchanged | ACCEPTED, "Accepted — being prepared soon.", ฿185.00 | 22:27:33 |
| E-B03-2 | CUSTOMER-B types `/orders/11` | "Order not found.", no Alice data | "Order not found.", "Back to my orders"; Bob's list "No orders yet." | 22:29:34 |
| E-B03-4 | OPERATOR types `/menu` | queue with "You don't have access to that page.", no menu | as expected | 22:25:42 |
| E-B04-2 | second operator window accepts #6 | refused, order not accepted twice | "Order #6: Already accepted by another staff member." | 21:13 |
| E-B06-2 | My orders after two tampered requests | count still K | 5 orders = K | 21:14:03 |

_(Figures embedded here at build: E-B01-1, E-B01-3, E-B03-2, E-B03-4, E-B04-2, E-B06-2.)_

## B.5 Coverage review and exploratory testing

We compared Est's six cases with their Sprint 1 acceptance criteria (Appendix B1, "Coverage review"): every feature F-01 to F-04 is exercised, but several criteria only partly (browser behavior without the API status or concurrency). We proposed four extra cases (COV-01 to COV-04); they were not sent to Est and are not counted as executed.

Exploratory testing around the cases found seven behaviors (EX-01 to EX-07), all reproduced by B's cross-check, plus EX-08 to EX-13. They became our outgoing reports Food-order #121 to #126 and #128 to #133; reports, Est's triage and our retest are in Part C and Part D.

## B.6 Limitations (Part B)

- UAT-02, UAT-04 and UAT-06 were recorded from an AI-executed browser run (agent-browser) on B's instruction, and UAT-03 steps 3 and 4 and one UAT-05 check from an earlier AI-executed run; each is labelled. All other steps were run by hand.
- The transient "Accepting…" label in UAT-01 step 6 was not captured; the outcome of the step was.
- E-B03-3 is byte-identical to E-B01-3 because the page shows no clock and nothing on it changed between 22:27:33 and 22:30:59; that is what UAT-03 step 6 checks.
- COV-01 to COV-04 were proposed only.

---

# Appendices for Parts A and B (embedded at build)

| Appendix | Content | Source |
|---|---|---|
| A1 | Our UAT cases UAT-01 to UAT-06, complete | `docs/labs/lab-06/uat-cases.md` at `e22c20a` |
| A2 | Our handoff, complete (no password) | `docs/labs/lab-06/handoff.md` at `e22c20a` |
| A3 | Review text of PR #128 (UAT cases) and B's dry-run notes on #120 | GitHub, quoted |
| A4 | Est's summary of their run of our cases (all six PASS functionally; 13 findings) | Est's Lab 6 message and `UAT-findings-EN009_P3-by-Est.pdf` |
| B1 | Our execution record of Est's cases, per step, with coverage review and exploratory findings | `docs/labs/lab-06/uat-execution.md` |

## Contribution (Parts A and B)

| Work | A (Kirakit) | B (Nattakit) |
|---|---|---|
| UAT cases and handoff (L6-01 #120) | wrote | dry-ran every case, reviewed PR #128 |
| Partner arrangement (L6-02 #121) | coordinated with Est, sent the password privately | checked |
| Execution of Est's cases (L6-03 #122) | UAT-01, UAT-03, UAT-05 by hand; checked B's cases | UAT-02, UAT-04, UAT-06; cross-checked EX-01 to EX-07; checked A's cases |
| PDF Parts A and B (L6-08 #127) | wrote | checks |

## AI use (Parts A and B)

| Tool | Task |
|---|---|
| Claude Code (Claude Opus) | drafted the UAT cases, handoff, execution record and this part from A's instructions; during A's manual runs it noted URLs and times and took screenshots when A asked |
| Codex Computer Use | an earlier exploratory run of Est's app on A's instruction (labelled where its observations are used) |
| Claude Code agent-browser | B's AI-executed run of UAT-02, UAT-04, UAT-06 and the EX cross-check |
