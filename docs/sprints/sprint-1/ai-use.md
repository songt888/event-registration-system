# AI use in Sprint 1

Collected from the "AI use" section of every merged Sprint 1 PR (#46 to #82), as `docs/team-workflow.md` section 5 asks, for the AI-use declaration in the PDF. Both students used AI agents for bounded Issues, with the engineering contract as input. No AI output was accepted on its own claim: the author ran the commands, the teammate reviewed the diff and ran the tests again, and both students must be able to explain every PR.

## 1. Tools

| Tool | Used by | For |
|---|---|---|
| Claude Code (Anthropic), interactive | A (songt888) and B (stickkersz) | drafting docs and contracts, tests, implementation, UI, reviews, QA runs and evidence capture |
| Claude Code "autopilot" (Opus, Sonnet, Haiku), a local runner started by B | B | drafting B's contract and feature PRs (#53 to #55, #63, #64, #67 to #69), first-pass reviews of A's PRs posted under B's account after B's setup, and gated merges of A's approved PRs |
| Codex with document_writer and code_reviewer subagents | A | drafting and checking the SRS, feature inventory, traceability and the F-01 and F-02 contracts (#48, #50, #51, #52, #56) |

## 2. Tasks per Issue

| Issue | PRs | AI task | Checked by hand |
|---|---|---|---|
| 1 Baseline docs | #46, #47, #48, #49, #50, #51 | drafted the workflow, SRS, features, traceability, system SDS and plan | every FR/BR/NFR/F/D/AC/TEST ID present and paired; diagrams render; read in review |
| 2 Contracts | #52 to #57 | drafted the six feature contracts and the DoD | IDs, section references and D-xx decisions checked against the baseline; teammate review |
| 3 Foundation | #58 to #61, #71 | wrote the skeleton, schema, seed, test runner and README | build, `npm test`, fresh clone by the teammate (which found the NFR-08 defect fixed in #71) |
| 4 to 8 Features | #62 to #67 | wrote red tests first, then services, routes and screens from the contracts | `npm test` run by author and reviewer; red then green commits; review against the contract |
| 9 E2E and QA | #68, #69, #70, #72 | wrote the E2E journeys and ran the QA checks | counts copied from the raw output; screenshots looked at |
| 73 UI style | #76, #77, #81 | built three design demos, the chosen Y2K style, and its fix | contrast computed, keyboard and reduced-motion checks, E2E unchanged and passing |
| 10 Release and PDF | #78, #79, #80, #82, this PDF | assembled Parts A to F, ran the release checks and the evidence capture | every count checked against the logs; captions checked against screenshots |

## 3. Problems found in AI output, and how they were caught

| PR | What the AI got wrong | Caught by | Fix |
|---|---|---|---|
| #59 | The seed hashed passwords with bcrypt cost 10, but the contracts fix cost 12; a generated `tsconfig.tsbuildinfo` was committed | B's review | cost 12; file removed and ignored |
| #63 | Two red tests were wrong (a missing key in TEST-06, a TEST-51 leak check that matched the client's own field) | the first green run | test fix commit `259cb84`, recorded in the PR |
| #65 | The TDD evidence file `TEST-13-green.txt` required by the workflow was missing | B's review | added before merge |
| #71 | The autopilot's first review requested changes on a fresh-clone claim it had not proved (an install run with `--prefix`) | B re-ran a real fresh clone | B approved; the autopilot was given a rule never to request changes on an unproven claim |
| #76 | A `client/node_modules` symlink was committed (the `.gitignore` pattern `node_modules/` does not match links) | A's review | removed from the index; pattern changed to `node_modules` |
| #76 | The first two AI UI designs were generic; B rejected them | B | research-based redesign; three demos; the team chose Y2K |
| #78 | The PR text described a one-off edit script, not the committed generator | B's review | sentence removed |
| #81 | Window buttons covered loading and error messages on title-less windows | B's NFR-09 rerun screenshots | one CSS rule; rechecked at two widths |
| #82 | The evidence capture script broke under React's double request in dev | the capture run | fresh page per state; recorded in the PR |

## 4. Limits

- AI reviews posted under B's account were set up and supervised by B; B checked or redid the ones that mattered (for example #71, #77, #82) and every merge into `main` was a human decision (#79).
- No secret, password or real personal data was given to an AI tool; demo data is the synthetic seed.
- Prompt transcripts are not included; the per-PR "AI use" sections on GitHub are the record.
