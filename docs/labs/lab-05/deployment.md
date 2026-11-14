# Lab 5 deployment guide

Version 0.1 (#87): stack, configuration and commands. The GCP resources, release procedure, cost control and rollback are filled in by #90, #92 and #95, and the final version is written in #94. Decisions are in `docs/decisions.md` (D-17 to D-24).

## 1. Stack and changes from the reference

| Part | Reference (Lab 5 starter kit) | This project | Why |
|---|---|---|---|
| UI | separate frontend | React + Vite, built to `client/dist` and served by the API from `CLIENT_DIST` | one container on one port (D-18) |
| API | Node + Express | Node + Express + TypeScript, Prisma 5 | Deliverable 1 stack |
| Database | PostgreSQL | PostgreSQL 16: Docker locally, Cloud SQL on GCP | D-22 |
| Node | Node 24 | Node 22.9 or later locally (`--env-file-if-exists`); Node 24 in the image and CI | D-19 |
| Seed | reset seed | destructive `npm run seed` locally only; `npm run seed:demo` on the deployed database | data is never reset (D-20) |
| Staging branch | `staging` | `lab5-staging`, created from `sprint-1-staging` (`b092a06`); `sprint-1-staging` keeps Sprint 1 only | D-21 |
| Required check | `test-and-docker` | same name; build, `npm test` against a Postgres service, Docker build; no E2E | D-23 |
| Deploy | Cloud Run from `main` | Cloud Run in `asia-southeast1`, only from `main`, environment `demo` | D-17, D-22 |

## 2. Environment variables

No value below is real. Secrets live only in Secret Manager (cloud) or the gitignored `server/.env` (local).

| Name | Purpose | Secret | Local source | Cloud source |
|---|---|---|---|---|
| `DATABASE_URL` | database the app uses | yes | `server/.env` | Secret Manager |
| `DATABASE_URL_TEST` | test database for `npm test` | no (local placeholder) | `server/.env` | CI service container only |
| `DATABASE_URL_E2E` | E2E database for `npm run test:e2e` | no (local placeholder) | `server/.env` | not used |
| `PORT` | HTTP port | no | `server/.env` (3000) | set by Cloud Run |
| `NODE_ENV` | `development` or `production` | no | `server/.env` | Cloud Run env var |
| `SESSION_TTL_MINUTES` | session length (60) | no | `server/.env` | Cloud Run env var |
| `COOKIE_SECURE` | `true` behind HTTPS | no | `server/.env` (`false`) | Cloud Run env var (`true`) |
| `SEED_PASSWORD` | password of the synthetic demo accounts | yes on the deployed database | `server/.env` | Secret Manager, used only by the seed step |
| `CLIENT_DIST` | folder of the built UI the API serves | no | unset (Vite serves the UI) | set in the image (`/app/client/dist`, #88) |

## 3. Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Build | `npm run build` |
| Test | `npm test` (needs `DATABASE_URL_TEST`); `npm run test:e2e` (local only) |
| Run locally | `npm run dev` |
| Migrate | `npm run migrate` (runs `prisma migrate deploy`, local and deployed; never `migrate dev` or `migrate reset` on the deployed database) |
| Seed (local, test, E2E only) | `npm run seed` (deletes all data first) |
| Seed (deployed) | `npm run seed:demo` (adds missing demo data, deletes nothing). Accounts are matched by email and events by owner and title, so a renamed demo event is created again on the next release |
| Docker image | `docker build -t eventreg .` (three stages: UI build, server build, runtime as user `node`, Node 24) |
| Run everything in Docker | `cp .env.example .env`, then `docker compose up --build` (services `db`, `migrate`, `app`; UI and API on http://localhost:3000) |

## 4. To be completed

- Image (#88, done): the runtime stage copies the server workspace `node_modules` including `prisma` and `tsx` (devDependencies), because the migration job runs `prisma migrate deploy` and `npm run seed:demo` from the same image. The cost is image size (about 580 MB); a pruned image is out of scope.
- GCP project, region `asia-southeast1`, Cloud Run service, Cloud SQL instance, Artifact Registry repository, secret names (#90).
- Release procedure, image tag = full commit SHA, how to find the running commit (#92).
- Cost control and teardown (#95); rollback by redeploying an earlier image SHA (#92).
