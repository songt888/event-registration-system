# L5-08 persistence check (C-05)

Issue #93. Requirement R-04, check C-05. Evidence only: no code or schema change.

## Setup

- Live URL: https://s47a6b53b-4d7hbszvwq-as.a.run.app
- Release on `main`: `04e8590` (tag `v0.1.2-lab5`).
- Data: Cloud SQL `s47a6b53b-pg`, outside the container. The deployed seed is `seed:demo`, which adds missing demo data and deletes nothing (D-20).
- Account: Participant One (synthetic demo account, role PARTICIPANT). B typed the password; it appears in no file, log or screenshot.

## Steps and result

| Step | Time (+07, 2026-11-22) | Revision serving 100% | What was seen |
|---|---|---|---|
| Before | 02:25 | `s47a6b53b-00004-44n` (from run 44898663334, the last deploy before this check) | My registrations: Intro to Git workshop (Room 201) ACTIVE, Career talk (small room) (Room 105) ACTIVE |
| Redeploy | 02:27 to 02:29 | new: `s47a6b53b-00005-5l7` | `Deploy to Google Cloud` run [44941012107](https://github.com/songt888/event-registration-system/actions/runs/44941012107) (#6), started by hand by B on `main` `04e8590`: image rebuilt and pushed, migration and `seed:demo` execution `s47a6b53b-migrate-lvnlb`, then "revision [s47a6b53b-00005-5l7] has been deployed and is serving 100 percent of traffic" |
| After | 02:29 | `s47a6b53b-00005-5l7` | page reloaded: the same two registrations, both ACTIVE |
| Restart | 12:36 | `s47a6b53b-00005-5l7` (no deploy since run #6) | Cloud Run had scaled the service to 0 instances while idle (no request from 03:26:04 to 12:36:06). Service logs: 12:36:06 "Starting new instance. Reason: AUTOSCALING", 12:36:08 "API listening". No Console change and no new image |
| After restart | 12:38 | `s47a6b53b-00005-5l7` | Participant One signed in again on the new container: the same two registrations, both ACTIVE |

The redeploy replaced the running container with a new revision and ran the migration and demo seed again, and the restart started a fresh container of the same revision. Both registrations survived both. So the records live in Cloud SQL, not in the container, and neither the release path nor a container restart resets data.

## Evidence

- Figure C-05.1, before (URL and clock visible): `evidence/C-05-before.jpg`
- Figure C-05.2, redeploy run #6 summary (image `...:04e85902befb951a01efd2e30236b6728352680c`, URL): `evidence/C-05-redeploy-run6-summary.jpg`
- Figure C-05.3, after (URL and clock visible): `evidence/C-05-after.jpg`
- Figure C-05.4, restart in the service logs (Cloud Run, `s47a6b53b`, Observability, Logs, read-only): `evidence/C-05-restart-logs-1236.jpg`
- Figure C-05.5, after restart (URL and clock visible): `evidence/C-05-after-restart.jpg`

## Console view of the redeploy

Cloud Run, `s47a6b53b`, Revision History (read-only, 02:33): `s47a6b53b-00005-5l7` serves 100% (to latest), deployed by `s47a6b53b-deployer` using gcloud; `-00004-44n` and older are at 0%. Screenshot and the trace from revision to commit `04e8590`: `evidence/C-06-revisions-00005.jpg` and `deployment.md` section 6.3 (#92).

## Not done here

- Optional rollback and roll forward.
