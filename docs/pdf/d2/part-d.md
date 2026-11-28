<!-- Deliverable 2 PDF, Part D (S3-04 #209). Author: A (Kirakit Kingkaew). Checker: B. Draft: quotes the baseline documents as merged on `sprint-2-staging` `5d365c0` (SRS, features, system SDS, traceability); the full matrices live in `docs/traceability.md` and are reproduced here in summary. -->

# Part D: Current baseline documents and traceability

Part D states the requirements the product implements, the features that cover them, and the per-requirement test status. The graded matrix is `docs/traceability.md`; this part summarizes it as of `5d365c0` and names the exact status of every AC group.

## D.1 Requirements (SRS, `docs/srs.md`)

15 functional requirements, 10 business rules, 9 non-functional requirements. Sprint coverage:

| Group | Requirements | Sprint status |
|---|---|---|
| Foundation and journeys | FR-01..FR-08 and FR-15 (F-01, F-02, F-03, F-04, F-05, F-06) | S1, verified; regressed green through every Sprint 2 merge |
| Maintenance change | FR-06 with BR-10 `TIME_CONFLICT` (CR-01, Lab 7) | S1 maintenance, verified at `861f01f` |
| Sprint 2 slice | FR-09 cancel (BR-03/05/07), FR-10 manage/close/cancel events, FR-11 registration deadline (BR-06), D-33..D-35 | S2, implemented and tested; released as `v0.3.0-sprint2` (`7e34f1b`, revision `s47a6b53b-00008-qrx`) |
| Sprint 3 slice | FR-12 check-in (BR-08, D-36), FR-13 attendance (D-37), FR-14 organizer summary | S3, contracts drafted (#224, #234), implementation planned (F-10 by B before the candidate; F-11..13 by 5-8 Dec) |

## D.2 Features (features inventory, `docs/features.md`)

| Feature | Version | Status |
|---|---|---|
| F-01..F-06 (Sprint 1) | 1.2..1.8 (Lab 6/7 and F-08 visibility revisions) | implemented, verified |
| F-07 Cancel registration | 1.0 | implemented, tested on `33f80e8` |
| F-08 Manage event | 1.0 | implemented, tested on `5a001f8` |
| F-09 Registration deadline | 1.0 (1.1 display scope from the #233 review) | implemented, tested on `8f12a48` |
| F-10 Check-in, F-11 Attendance | drafts in #224 | specified only |
| F-12 Summary, F-13 Hardening | drafts in #234 | specified only |

## D.3 System design (`docs/system-sds.md`)

Sections 1-3 (architecture, data, UI) describe the shipped system: React + TypeScript client, Express + TypeScript API with the session guard chain, PostgreSQL through Prisma, the shared error envelope of 4.2, and the Explorer-style UI. Section 2.3 documents migrations and the repeatable seed; section 2.4 (merged with #232's PDF round and #224/#234's planned rows) lists the Sprint 3 planned pieces (CheckIn table, summary route, 429 `TOO_MANY_ATTEMPTS`, the bench script) as planned, never implemented.

## D.4 Traceability with status per AC (`docs/traceability.md`)

| Requirement | AC | Test | Status |
|---|---|---|---|
| FR-01..FR-08, FR-15 (S1) | AC-01..AC-51 (plus AC-56, AC-62..AC-72 Lab 6 fixes) | TEST-01..51, 56..72 | verified at `c1ee1ce`; regressed green on every release head since |
| BR-10 CR-01 (Lab 7) | AC-57..AC-61 | TEST-57..TEST-61 | verified at `861f01f` |
| FR-09 / BR-03, BR-07 | AC-73..AC-80 | TEST-73..TEST-80 | passed on `33f80e8` |
| FR-10 | AC-90..AC-109 | TEST-90..TEST-109 | passed on `5a001f8` |
| FR-11 / BR-06 | AC-81..AC-89 | TEST-81..TEST-89 | passed on `8f12a48` |
| FR-12 / BR-08 (S3) | AC-110..AC-119 | TEST-110..TEST-119 | planned (contract #224) |
| FR-13 (S3) | AC-120..AC-127 | TEST-120..TEST-127 | planned (contract #224) |
| FR-14 (S3) | AC-130..AC-136 | TEST-130..TEST-136 | planned (contract #234) |
| FR-01 rate limit, NFR-05, NFR-09 (S3) | AC-137..AC-141 | TEST-137..TEST-141 | planned (contract #234) |
| NFR-01..NFR-09 (S1) | the numbered ACs of section 4 | the matching tests | verified; S2/S3 additions planned or passed as above |

## D.5 Gaps, stated plainly

- Every Sprint 2 AC is implemented, tested and passed; none is moved to Sprint 3 to look complete.
- The Sprint 3 contracts (F-10..F-13) are merged into `sprint-3-staging` (#224, #234); F-10 is in its red and green handoff (#240), F-11..F-13 follow after D2.
- Known limitations carried from Lab 6 (taskbar wrap between 641 and 735 px; the #147 label ellipsis) remain open, owned and dated in Part C.3 - they are limitations, not missing requirements; the D7-1 documentation sync was resolved by #238 on `sprint-3-staging`.
- The release-dependent rows are filled: the release is `v0.3.0-sprint2` at `7e34f1b`, deployed as revision `s47a6b53b-00008-qrx` (deploy run 46125000564); the post-deployment journeys are recorded in Part A and Part B B.5.
