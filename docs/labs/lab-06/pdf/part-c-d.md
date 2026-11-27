<!-- Lab 6 PDF, Parts C and D (L6-08 #127). Author: B (Nattakit Prasertsak). Checker: A. Draft. -->
<!-- Parts A and B (A) are in part-a-b.md; the shared cover, contents, version table, contribution table, AI use and limitations are assembled with both files. -->

# Part C: Defect reporting and triage

## C.1 As UAT Team: our reports on Est's app

Est (EN-033), "Campus Café Pre-order", commit `b71cdb2` on `vienggd/Food-order` `main`, https://food-order-d4jdyxqbca-as.a.run.app. Our six UAT cases all passed (Part B); the 12 reports below come from exploratory checks around UAT-01, UAT-03 and UAT-05.

**Report fields.** Every Issue uses one template (Part B, "Issue template"): reporter, product team, tested version and time, linked case and requirement, defect or feature request, preconditions and data, numbered steps, expected (quoted from Est's contract), actual, severity with the user impact, evidence. We are not collaborators on Est's repo, so each Issue asks Est to add the `lab6` label.

**Severity** is by user impact: major when a customer cannot do a Sprint 1 task without a workaround, minor when the task can still be completed.

**Defect or feature request.** A report is a defect when it breaks a line of Est's contract (AC, ui-spec, F-0x); otherwise it is sent as a feature request. We sent 8 as defects and 4 as feature requests.

| Our ID | Est Issue | Summary | Our class / severity | Est's decision |
|---|---|---|---|---|
| EX-08 | #121 | Malformed order id (`0x2`, `2e0`) accepted instead of 400 | defect / minor | accepted defect, minor |
| EX-02 + EX-09 | #122 | Access warning stays after logout and on the next order page | defect / minor | accepted defect, minor |
| EX-10 | #123 | On a phone the cart bar covers the last menu item | defect / **major** | accepted defect, **major, release-blocking** |
| EX-11 | #124 | "Order #N placed!" stays after reload | defect / minor | accepted defect, minor |
| EX-12 | #125 | List shows PLACED while the detail shows ACCEPTED | defect / minor | accepted defect, minor |
| EX-13 | #126 | Some invalid sign-ins show a generic error | defect / minor | accepted defect, minor |
| EX-04 | #128 | Phone Cart tab counts items, not cart lines | defect / minor | accepted defect, minor |
| EX-06 | #129 | Phone top bar has no café brand | defect / minor | accepted defect, minor |
| EX-01 | #130 | Cart does not move keyboard focus | feature request / minor | enhancement (Sprint 3) |
| EX-03 | #131 | Sign in field errors not linked to fields | feature request / minor | enhancement (Sprint 3) |
| EX-05 | #132 | Desktop queue hides column labels from assistive technology | feature request / minor | enhancement, then **reclassified as accepted defect** (their F-04 says the queue is a table); fixed RED `d1bf95c`, GREEN `2e291c8` |
| EX-07 | #133 | Email error stays after the email is corrected | feature request / minor | enhancement (Sprint 3) |

Totals: 12 reports, Est accepted 9 as defects (1 major) and 3 as enhancements. Food-order #127 first bundled six findings in one checklist; on review (PR #131) it was split into #128 to #133 and closed as replaced. Notified through GitHub Issues (Est's handoff allows this) and Discord.

**Quoted report (Food-order #123, the major one):**

> **Reporter:** Nattakit Prasertsak (B), UAT Team EN-009_P3. **Product team:** Est (EN-033). **Tested version:** commit `b71cdb2`. **Tested at:** 2026-11-25 21:07 to 21:22 (UTC+7). **Case / requirement:** UAT-01 at phone width; AC-F02-06 (every available item can be seen and added), F-03 add to cart. **Defect or feature request:** defect against specified behavior.
> **Preconditions:** CUSTOMER-A; viewport 375 × 812; at least one item in the cart.
> **Steps:** 1. Sign in as CUSTOMER-A at 375 × 812 and add any item. 2. Scroll the menu to the bottom.
> **Expected** (AC-F02-06): Basil Chicken Rice's name, price and **+** are fully visible and can be tapped.
> **Actual:** The fixed cart bar (y 676 to 728) covers the item's name, price and **+** (y 657 to 701). Only a 19 px strip of **+** can be tapped.
> **Severity:** major, because on a phone a customer cannot reliably see or add the last menu item.

> **Est's triage (vienggd, 2026-11-26 00:50 UTC+7):** "Accepted defect (major, release-blocking). Breaks AC-F02-06 / NFR-06 on 375px phone because .cart-bar covers the last menu item. Label lab6 added; owner: vieng. Fixing on lab6 (RED -> GREEN) for re-test."

## C.2 As Product Team: triage of Est's findings about our app

Release under test: `v0.1.2-lab5`, `04e8590`, revision `s47a6b53b-00005-5l7`. 13 findings, #141 to #148 (exploratory session 2026-11-25) and #151 to #155 (Playwright and source review 2026-11-26). Est's six agreed cases had no recorded result at triage time.

**Classes.** Accepted defect: breaks a Sprint 1 AC or contract line. Enhancement: the contract does not require it. Not a defect: the app does what the contract says. Duplicate: same cause as another finding, linked to it. A failing requirement is never relabelled as an enhancement; each finding was reproduced or traced to code before it was classed.

| Issue | Finding | Est's sev. | Class | Our sev. | Owner | Fix |
|---|---|---|---|---|---|---|
| #142 | After logout in another tab, the first tab keeps the account and menu | major | **Accepted defect** | major | A | L6-09, AC-56 |
| #141 | Very long title, location or description breaks the layout | major | **Accepted defect** | minor | B | L6-13, AC-65 |
| #153 | Event registrations shows "Not found" or 403 depending on timing | minor | **Accepted defect** | minor | A | L6-17, AC-69 |
| #152 | Create event and Publish stay on the page after the session ends | minor | **Duplicate of #142** | minor | A | fixed by L6-09 |
| #143 | Places-left count stale after a refused duplicate | minor | Enhancement | minor | A | L6-10, AC-62 |
| #144 | Description line breaks lost | minor | Enhancement | minor | B | L6-14, AC-66 |
| #145 | Form errors not tied to fields with ARIA | minor | Enhancement | minor | A | L6-12, AC-64 |
| #146 | "Draft … saved." stays after Publish | minor | Enhancement | minor | A | L6-11, AC-63 |
| #147 | At 320 px the Restore button sticks out about 81 px | minor | Enhancement | minor | B | L6-15, AC-67 |
| #148 | Window buttons on Not found have no page name | minor | Enhancement | minor | B | L6-16, AC-68 |
| #151 | Taskbar covers Save draft at 320 px; Logout wraps at 768 px | major / minor | Enhancement | minor | A (was B) | L6-20, AC-72 |
| #154 | My events shows Create event to a participant above the 403 | minor | Enhancement | minor | B | L6-19, AC-71 |
| #155 | Password cleared after a 400; blank Capacity message | minor | Enhancement | minor | A | L6-18, AC-70 |

Totals: 3 accepted defects (1 major), 1 duplicate, 9 enhancements, 0 not-a-defect. The team chose to fix every enhancement in Lab 6 as well; each got a new AC/TEST in the feature contract first, because no Sprint 1 AC covered it.

**Where our severity differs from Est's:**
- #141 minor, not major: sideways scrolling still reaches Publish, the event can be published, no data is wrong, and it needs a 120-character word with no spaces.
- #151 minor, not major: Save draft's centre stays above the taskbar and the button works; only the bottom 18 px are covered.

**Quoted triage reply (#141, stickkersz, 2026-11-26 18:34 UTC+7):**

> Triage (team EN-009_P3): **Accepted defect, minor** (you proposed major: sideways scrolling still reaches Publish, so the task can be completed). Owner: Nattakit Prasertsak (B). Reproduced on `04e8590`, and your 768/812 px follow-up is confirmed. Fix in #161 / PR #162 (AC-65): long text wraps, Publish stays on screen at 1280 px, and below that a list that is still too wide scrolls inside its own box, so no page scrolls sideways at any width. Ships in `v0.1.3-lab6`; we will tell you on Discord before we deploy, with the new revision, so you can retest it.

Full reasons with the contract line, cause and reproduction evidence per finding: `docs/labs/lab-06/triage.md`.

---

# Part D: Resolution and retest

## D.1 Fix chain per finding

Every fix: Issue, then a branch from `lab6-staging`, then the contract row (AC/TEST) committed alone, then a RED test run on the unfixed client, then GREEN, then the full suites, then a PR reviewed by the other student, CI `test-and-docker`, and a merge into `lab6-staging`. Commands: `npm test` (Vitest + Supertest on `DATABASE_URL_TEST`) and `npm run test:e2e` (Playwright on `DATABASE_URL_E2E`, reset and seeded per run). Test names carry the TEST ID.

| Fix | Finding | Test (file) | RED commit: failure | GREEN commit | Suites at GREEN | PR (reviewer) | Merge |
|---|---|---|---|---|---|---|---|
| L6-09 | #142 (+#152) | TEST-56 `e2e/stale-session.spec.ts` | `7525406`: after Logout in tab 2, tab 1 never shows Sign in | `d7184bf` | 69 / E2E 7 | #167 (B) | `3390d83` |
| L6-10 | #143 | TEST-62 `e2e/reload-after-409.spec.ts` | `10abc27`: 409 shown, "29 of 30 places left" never appears | `440b03b` | 69 / 7 | #168 (B) | `25553a8` |
| L6-11 | #146 | TEST-63 `e2e/saved-message.spec.ts` | `08c08cb`: "Draft … saved." still there, expected 0, received 1 | `d5c2f84` | 69 / 7 | #169 (B) | `130ee6e` |
| L6-12 | #145 | TEST-64 `e2e/aria-errors.spec.ts` (2 tests) | `1f0dd0c`: errors shown, fields have no `aria-invalid` | `912d770` | 69 / 8 | #170 (B) | `6b8fb19` |
| L6-13 | #141 | TEST-65 `e2e/long-text.spec.ts` | `820b97e`: My events scrolls sideways at 1280 px, received 1783 | `4ca4d1a` | 69 / 6 | #162 (A) | `0cb4d67` |
| L6-13 follow-up | #141 (768/812 px) | TEST-65 revised | `74965b4`: scrolls sideways at 1024 px, received 94 | `d7b89b0` | 69 / 6 | #171 (A) | `dc9b70e` |
| L6-14..16 | #144, #147, #148 | TEST-66, 67, 68 `e2e/ui-enhancements.spec.ts` | `413f21e`: all 3 fail on the missing behavior | `1b518ed` | 69 / 8 | #166 (A) | `4bf235b` |
| L6-19 | #154 | TEST-71 `e2e/create-event-link.spec.ts` | `9fac803`: Create event link, expected 0, received 1 | `b06bc36` | 69 / 15 | #176 (A) | `fa21935` |
| L6-20 | #151 | TEST-72 `e2e/taskbar-overlap.spec.ts` | `ea109a1`: page bottom under the taskbar by 18 to 23 px at 320/375 px; Logout 41 px below the row at 768 px | `ddf85e4` | 69 / 16 | #178 (B) | `860f8a1` |
| L6-17 | #153 | TEST-69 `e2e/registrations-403.spec.ts` | `3e7a23a`: unknown ID shows "Not found", no 403 alert | `c54d10a` | 69 / 16 | #179 (B) | `14d0e72` |
| L6-18 | #155 | TEST-70 `e2e/keep-input.spec.ts` (2 tests) | `6563e70`: password empty after a 400; no "Capacity is required." | `0b1928a` | 69 / 17 | #180 (B) | `77b2dc6` |

"Suites at GREEN" = `npm test` passed / `npm run test:e2e` passed on that commit, 0 failed and 0 skipped in every row. E2E counts grow as each fix adds its test. Evidence per fix: `docs/labs/lab-06/evidence/l6-NN/E-D-*.txt` (red, green, npm test, full E2E), each naming its commit.

**Notes:**
- L6-09 has a contract correction `4c05a54` before the RED test: the E2E client runs Vite dev with React StrictMode, which sends each first request twice, so TEST-56 counts refused requests only after the Sign in form appears.
- L6-13 first tried `overflow-wrap: anywhere`; it passed TEST-65 but broke normal words ("Engineeri / ng hall" at 768 px) and was replaced before review. #162 was merged before the follow-up commits were pushed, so they went in through #171.
- Merge commits are explained in the version table: each fix PR that was behind `lab6-staging` got a merge of `lab6-staging` (not a rebase), so the RED and GREEN hashes in the evidence stay valid. Merges with a resolved conflict in `docs/traceability.md`: #168, #169, #170, #179.

**Quoted reviews (one per student):**

> **songt888 on #162 (2026-11-26 17:47 UTC+7):** "Checked locally: RED at 820b97e fails on 'My events scrolls sideways at 1280 px' (1783), the real defect, not the fixture. GREEN at 4ca4d1a: `npm run test:e2e` 6 passed, 0 failed, 0 skipped; CI green. Order contract → red → green is right, and the 375 px scope is fine."

> **stickkersz on #179 (2026-11-26):** "checked bro. allSettled + registrations error wins over the event error matches AC-69 and D-13, owner path unchanged. ran it locally on lab6-staging 860f8a1 + #180 + #179 merged: npm test 69/69, e2e 19/19, TEST-69 passes for all 3 IDs."

## D.2 Integration before release

`lab6-staging` at `14d0e72` (all fixes merged), Node v24.16.0, 2026-11-26, by B: `npm run build` OK; `npm test` 14 files, 69 passed, 0 failed, 0 skipped; `npm run test:e2e` 19 passed, 0 failed, 0 skipped. Output: `docs/labs/lab-06/evidence/l6-06/integration-14d0e72/` (build, `npm test`, E2E, each with the commit hash).

## D.3 Release and deploy (L6-06 #125)

| Step | Record |
|---|---|
| Partner told before deploy | A on Discord, confirmed on PR #181 (songt888, 2026-11-26 23:13 UTC+7): "A has sent Est the deploy notice on Discord (v0.1.3-lab6 to the same URL, with the list of findings to retest)" |
| Release PR | #181 `lab6-staging` → `main`, opened by A, approved by B (2026-11-26 23:07), merged by B at 23:23 as `502d2a6`. `main` `04e8590` was an ancestor (121 ahead, 0 behind); `git diff --stat origin/main origin/lab6-staging -- server` empty, so no migration and no data reset (D-20) |
| CI | `test-and-docker` success on the PR head `14d0e72` (run 45854970137) |
| Tag | `v0.1.3-lab6` on `502d2a6` (A; checked with `git ls-remote --tags`) |
| Deploy | "Deploy to Google Cloud" run 45858377105, push of `502d2a6`, success. Image tag `502d2a67708e8908487bd56f1b45835fc69de416`; log: "revision [s47a6b53b-00006-7bv] has been deployed and is serving 100 percent of traffic" (2026-11-26 23:25 UTC+7) |
| Running revision = release commit | `502d2a6` has the same tree as `14d0e72` (`02d4d8a`). The live page serves `assets/index-CcXia3Aw.js` and `index-DM5hmvTK.css`, the same content-hashed names as B's local `npm run build` of `14d0e72`, so the deployed client is the release code |
| B's read-only live check (23:27, no sign-in) | `GET /api/health` 200 `{"status":"ok"}`; `GET /api/me` without a cookie 401 `UNAUTHENTICATED`; the served bundle contains the fix strings "Capacity is required." (AC-70), `allSettled` (AC-69), `table-scroll` (AC-65). Output: `docs/labs/lab-06/evidence/l6-06/E-D-L606-live-check.txt` |
| A's smoke check (manual, PR #182, `E-D-L606-smoke`) | Without a session: `/` and `/login` 200, `/api/me` and `/api/events` 401. Signed in, 2026-11-26 23:32 to 23:33 (UTC+7): participant sees the 403 message on an unknown-ID registrations page (AC-69), Save draft above the taskbar at 320 px (AC-72), empty Capacity sends no request (AC-70): all PASS. At 727 px a participant's taskbar wrapped Logout; AC-72 narrowed to 768 px and wider as a known limitation (F-01 1.6) |
| Version sent to Est | A on Discord, recorded on #126 at 2026-11-26 23:48 (UTC+7): tag, commit, revision, release notes #181 and the findings to retest with their UAT cases |

## D.4 Retest by Est (L6-07 #126)

Retest request sent by A on Discord after the deploy (recorded on #126 at 2026-11-26 23:48 UTC+7) with version, revision, the findings and the affected UAT cases. Est (vieng) posted results on each Issue; all on `v0.1.3-lab6` / `502d2a6` / `s47a6b53b-00006-7bv`, AI-assisted Playwright Chromium, stated by Est as not clicked by hand.

| Finding | Est's result | Time (UTC+7) | Notes |
|---|---|---|---|
| #151 | PASS | 2026-11-27 00:20 to 00:21 | 320, 768, 812 px; at 727 px Logout wraps, nothing covered, "matching your updated f-01-auth.md v1.6" |
| #152 (dup. of #142) | PASS | 00:20:45 | Save draft, Publish, My events after logout in tab B: one 401, then `/login`; UAT-04 step 9 (data survives the redeploy) PASS |
| #153 | PASS | 00:21:35 | 10 of 10 loads show the 403 message, never "Not found" |
| #154 | PASS | 00:21:36 | no Create event link for a participant |
| #155 | PASS | 00:21:46 | password kept after a 400, cleared after a 401; "Capacity is required."; UAT-06 and UAT-01 re-run PASS |
| #141 to #148 | PASS (all 8) | 02:15 to 02:46 | retested by Dechayut (ninja), AI-run on ninja's request with ninja signing in by hand; #142 two-tab logout: Sign in, no loop, `/api/me` 401 after logout; #147 Restore inside 320 px (label ellipsis noted, no new finding) |

Est's final decision on our app (comment on #126, vienggd, 2026-11-27 03:18 UTC+7): **Accepted**, `v0.1.3-lab6` / `502d2a6` / `s47a6b53b-00006-7bv`, testers Garunyapas Danpitakkul and Dechayut Panyawutvorakul. All 13 findings PASS; UAT-01, UAT-02 (10/10), UAT-03 (8/8), UAT-04 incl. step 9 and UAT-06 PASS; 0 open defects. #151 (641 to 735 px wrap) and #147 (label ellipsis) are listed as non-blocking observations. (Est's earlier Discord message said "Accepted with minor limitations"; the GitHub record is the final one.)

## D.5 Our retest of Est (L6-07b #129)

Est's corrected release: `vienggd/Food-order` `main` `163fdb7` (their PR #168), revision `food-order-00008-v6c` (from Est's Discord message), live bundle `index-D6oQEALR.js` / `index-DIcaNBkg.css` checked by us, `/api/ready` 200. Their retest handoff: `docs/labs/lab-06/retest-handoff.md` at `163fdb7`.

B's half, 2026-11-27 00:18 to 00:20 (UTC+7), headless Chromium (Playwright script by Claude Code on B's instruction), CUSTOMER-A and OPERATOR; a result comment on each Est Issue:

| Est Issue | Our ID | Result | Actual (short) |
|---|---|---|---|
| #123 (major) | EX-10 | PASS | 375 x 812: Basil Chicken Rice name and full + above the cart bar; tap at the centre of + hits it |
| #121 | EX-08 | PASS | 7 malformed ids: 400 `VALIDATION_ERROR`; UI "Order not found." |
| #122 | EX-02+09 | PASS | warning shown once, gone on the next page and on `/login` |
| #124 | EX-11 | PASS | "Order #13 placed!" right after placing; gone after reload and after accept |
| #125 | EX-12 | PASS | list row and detail both ACCEPTED (#12) |
| #126 | EX-13 | PASS | both invalid sign-ins show the server's "Invalid request." |
| #128 | EX-04 | PASS | Latte x2: "Cart (1)"; desktop count 1 |
| #129 | EX-06 | PASS | "Campus Café" in the phone header; no sideways scroll |
| #132 | EX-05 | **FAIL** | queue is a `<table>`, but each row has 7 cells under 6 headers (the status `<td>` has no `<th>`), so the labels sit one column off. First posted as PASS because the script checked only the header names; correction posted on Est #132 (2026-11-27 00:41) |

UAT-04 re-run (B): PASS, order #14 survives a new session, the second accept is refused ("Already accepted by another staff member."), the customer sees ACCEPTED. Test data: orders #12 to #14, all accepted.

Corrections recorded honestly: #132 was first posted to Est as PASS and corrected to FAIL (see the table). The raw script log first marked #121 and #124 FAIL because of the script (it read only 160 characters; it checked the banner too late); the screenshots and a rerun show PASS. Evidence: `docs/labs/lab-06/evidence/l6-07b/` (`retest-163fdb7.md`, screenshots, raw logs; PR #186).

A's half (PR #187, `docs/labs/lab-06/evidence/l6-07b-a/`, by hand, 2026-11-27 01:40 to 01:51): UAT-01 (order #15), UAT-03 (all six steps), UAT-05 PASS; #122, #124, #125 re-checked by hand during the cases: PASS.

**#132 after Est's fix release.** A retested at 03:05 on `163fdb7`: still FAIL (fix merged on Est's `lab6` but not deployed; PR #191). Est deployed `39bda5e` (their PR #181), revision `food-order-00009-jd9`, 03:19 to 03:24. #132 then PASS: A at 03:32 (PR #191) and B at 03:34 (PR #192): 7 headers, all `scope="col"`, over 7 cells per row, left edges equal. B's regression run of all 9 accepted defects on `39bda5e` (03:42 to 03:43): all PASS (#124 by its dedicated rerun). UAT cases were not re-run on `39bda5e`: the only app files changed since `163fdb7` are `QueuePage.tsx` and `styles.css`.

Our decision for Est's Sprint 1 release: **Accepted** on `39bda5e` / `food-order-00009-jd9` (9 of 9 defects PASS, #123 major PASS, UAT-01, 03, 04, 05 PASS, nothing BLOCKED, no open defect; #130, #131, #133 are enhancements Est deferred to Sprint 3). B signed off on #129 (2026-11-27 03:51 UTC+7), A at 04:08; the decision block was sent to Est for their `retest-handoff.md`. Evidence: PRs #186, #187, #191, #192.
