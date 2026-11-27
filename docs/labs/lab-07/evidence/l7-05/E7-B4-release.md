# E7-B4: Lab 7 release, tag and deployment (L7-05 #137)

Recorded by A on 2026-11-27 from GitHub (`gh pr view`, `gh run view`) and the Deploy run log.

## Version table

| Step | Value |
|---|---|
| Baseline before Lab 7 | `main` `502d2a6`, tag `v0.1.3-lab6`, revision `s47a6b53b-00006-7bv` |
| Release candidate | `lab7-staging` `a6439d7` (merge of PR #190; contains #183, #184, #185, #190) |
| Release PR | #193 `lab7-staging` → `main`, approved by B (stickkersz) 2026-11-27 09:44 UTC+7, merged by B 12:58 UTC+7 |
| Required check on #193 | `test-and-docker` success, run 45897022578 (https://github.com/songt888/event-registration-system/actions/runs/45897022578) |
| Merge commit on `main` | `861f01f0dc760ee22b64a5d759f343760be7895e` (tree identical to `a6439d7`) |
| Tag | `v0.2.0-lab7` (annotated, by A) → `861f01f`. Earlier tags unchanged: `v0.1.0-sprint1` → `12dcd3c`, `v0.1.3-lab6` → `502d2a6` |
| Deploy run | "Deploy to Google Cloud" 45948919136, push of `861f01f`, 12:58:16 to 13:00:07 UTC+7, success (https://github.com/songt888/event-registration-system/actions/runs/45948919136) |
| Migration job | `s47a6b53b-migrate` execution `s47a6b53b-migrate-94rk7` completed (`npm run migrate` + non-destructive `seed:demo`); no schema change in this release, production data not reset (D-20) |
| Cloud Run revision | `s47a6b53b-00007-mkk`, serving 100 percent of traffic |
| Deployed URL | https://s47a6b53b-4d7hbszvwq-as.a.run.app |

## Review text (B on #193, APPROVED, 2026-11-27 09:44 UTC+7)

> checked bro, `a6439d7`: only 4 merges on first-parent (#183 #184 #185 #190), no `server/prisma` diff, `main` is an ancestor (0 behind), code is the 5 files in the body (+192/-6). my run on the same tree matches yours: build OK, `npm test` 73/73, e2e 20/20. approve. just ping Est on Discord before you merge since it deploys right away

The Discord notice was dropped before the merge: Est's Lab 6 testing of our release was already finished and recorded (#126, Accepted, 03:18), so A decided no notice was needed (recorded on #137 and in the #193 body).

## Deploy log lines

```
Execution [s47a6b53b-migrate-94rk7] has successfully completed.
Service [s47a6b53b] revision [s47a6b53b-00007-mkk] has been deployed and is serving 100 percent of traffic.
```

## Read-only live check after deploy (B, #137 comment 13:02 UTC+7)

`/api/health` 200 `{"status":"ok"}`; `/api/me` without a session 401 `UNAUTHENTICATED`. Client bundle unchanged (`index-CcXia3Aw.js`), expected because CR-01 changes the server only.

Release tests on the same tree (`a6439d7`) are in the #193 body: build OK, `npm test` 73 passed, e2e 20 passed, TEST-54 6/6, TEST-55 10/10, 0 failed, 0 skipped.
