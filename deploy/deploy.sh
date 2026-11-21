#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Event Registration — Idempotent Google Cloud Run Deployment Script
# ==============================================================================
# Usage:
#   ./deploy/deploy.sh [--demo]
#
# Environment Variables (Optional):
#   PROJECT_ID   GCP Project ID (defaults to active gcloud config project)
#   REGION       GCP Region (default: asia-southeast1)
#   DRY_RUN      Set DRY_RUN=1 to print all gcloud commands without executing
#
# WHAT THIS SCRIPT DOES  (one-time / manual first setup; safe to re-run)
#   Creates every cloud resource the app needs and does the first deployment:
#   1 enable APIs     2 Artifact Registry  3 Cloud SQL instance  4 database
#   5 runtime SA+IAM  6 DB user + secret   7 admin password      8 demo password
#   (secret access)   9 build image        10 migrate+seed job   11 Cloud Run service
#   After this, routine releases are done by GitHub Actions (deploy.yml ->
#   deploy/release.sh), which only UPDATES these resources.
#
# ⭐ IMPORTANT
#   - Idempotent: existing resources/secrets are reused, never overwritten
#     (a re-run does not replace credentials).
#   - Passwords are generated with openssl and live only in Secret Manager;
#     they are never printed (run_cmd redacts --password=...).
#   - Preview first with:  DRY_RUN=1 ./deploy/deploy.sh   (no gcloud calls)
#   - Run from the REPO ROOT (step 9 builds the root Dockerfile).
#   - Offline test: deploy/tests/test_deploy_stub.sh
#
# REFERENCES
#   - gcloud run deploy : https://cloud.google.com/sdk/gcloud/reference/run/deploy
#   - Cloud Run jobs    : https://cloud.google.com/run/docs/create-jobs
#   - Cloud SQL + Run   : https://cloud.google.com/sql/docs/postgres/connect-run
#   - Secret Manager    : https://cloud.google.com/secret-manager/docs
#   - Artifact Registry : https://cloud.google.com/artifact-registry/docs/docker
#
# ⭐ CHANGE ME — groups using another tech stack must review (marked below):
#   # CHANGE ME: resource names (REPO_NAME, SQL_INSTANCE, SERVICE_NAME, ...)
#   # CHANGE ME: database engine/version (steps 3, 4, 6)
#   # CHANGE ME: migrate/seed command of the Cloud Run job (step 10)
#   # CHANGE ME: port / memory / scaling flags (step 11)
#
# TEAM s47a6b53b (L5-05, #90; D-20, D-25; contract docs/labs/lab-05/l5-05-first-deploy.md)
#   - Team kit from the course portal; only the CHANGE ME points and the course
#     rules below differ. Steps 1-8 are done by the portal (D-25).
#   - Env vars and secrets use --update-*, never --set-* (course announcement:
#     --set-* replaces the values the portal set).
#   - Real run: DRY_RUN=0 bash deploy/deploy.sh --demo   (on an up-to-date main)
#   - Offline test: bash deploy/tests/test_deploy_stub.sh (TEST-54)
# ==============================================================================

# ------------------------------------------------------------------------------
# Settings & argument parsing
# ------------------------------------------------------------------------------
DRY_RUN="${DRY_RUN:-1}"
# CHANGE ME: default region if your group uses another one.
REGION="${REGION:-asia-southeast1}"
SEED_DEMO_DATA="false"

for arg in "$@"; do
  case "$arg" in
    --demo)
      SEED_DEMO_DATA="true"
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--demo]" >&2
      exit 1
      ;;
  esac
done

# Helper: prints the command (DRY_RUN=1) or prints then executes it.
# ⭐ IMPORTANT: --password=... is redacted in the log; keep this behaviour.
run_cmd() {
  # Log the command without exposing generated database credentials.
  local arg
  if [ "$DRY_RUN" = "1" ]; then
    printf '[DRY_RUN] '
  else
    printf '+ '
  fi
  for arg in "$@"; do
    case "$arg" in
      --password=*) printf '%s ' '--password=<REDACTED>' ;;
      *) printf '%q ' "$arg" ;;
    esac
  done
  printf '\n'
  if [ "$DRY_RUN" != "1" ]; then
    "$@"
  fi
}

# Resolve the GCP project: $PROJECT_ID, else the active gcloud project.
# Shared course project: no project discovery or project IAM changes.
PROJECT_ID="${PROJECT_ID:-cpe-se-course-2026}"
[[ "$PROJECT_ID" == "cpe-se-course-2026" ]] || { echo 'Wrong course project' >&2; exit 1; }
REGION="${REGION:-asia-southeast1}"
[[ "$REGION" == "asia-southeast1" ]] || { echo 'Wrong assigned region' >&2; exit 1; }
REPO_NAME="s47a6b53b"
SQL_INSTANCE="s47a6b53b-pg"
DB_NAME="s47a6b53b"
DB_USER="s47a6b53b"
SERVICE_NAME="s47a6b53b"
MIGRATE_JOB_NAME="s47a6b53b-migrate"
SA_NAME="s47a6b53b-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SQL_CONN_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
if [ "$DRY_RUN" = "1" ]; then
  IMAGE_TAG="${IMAGE_TAG:-0000000000000000000000000000000000000000}"
else
  IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD)}"
  [[ "$(git branch --show-current)" == "main" ]] || { echo 'Deploy reviewed main only' >&2; exit 1; }
  [[ "$IMAGE_TAG" == "$(git rev-parse HEAD)" ]] || { echo 'IMAGE_TAG must match HEAD' >&2; exit 1; }
fi
[[ "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]] || { echo 'Use full commit SHA' >&2; exit 1; }
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

# Secret Manager secret names (values are never stored in this repo).
SECRET_DB_URL="s47a6b53b-database-url"
# CHANGE ME: this app has no admin account, so the kit admin password secret is not used.
SECRET_DEMO_PASS="s47a6b53b-demo-password"

echo "=================================================================="
echo "Event Registration Cloud Run Deployment"
echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Demo    : ${SEED_DEMO_DATA}"
echo "Dry Run : ${DRY_RUN}"
echo "=================================================================="

# ==============================================================================
# Portal/TA pre-provisions infrastructure and public service IAM (Guide 5.3 steps 1–8, 5.4).
# These names must exist. Never create or modify project-level IAM here.
JOB_SECRETS="DATABASE_URL=${SECRET_DB_URL}:latest"
# CHANGE ME: migrate always; --demo adds the non-destructive demo seed (D-20), whose
# synthetic accounts get the portal demo password as SEED_PASSWORD.
JOB_ARGS="-c,npm run migrate -w server"
if [ "$SEED_DEMO_DATA" = "true" ]; then
  JOB_SECRETS="${JOB_SECRETS},SEED_PASSWORD=${SECRET_DEMO_PASS}:latest"
  JOB_ARGS="${JOB_ARGS} && npm run seed:demo -w server"
fi
if [ "$DRY_RUN" != "1" ]; then
  gcloud run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" >/dev/null
  gcloud run jobs describe "$MIGRATE_JOB_NAME" --project "$PROJECT_ID" --region "$REGION" >/dev/null
fi
# 9. Build & Push Unified Container Image via Cloud Build
#    Builds the root Dockerfile (run this script from the repo root).
#    Tagged with the full commit SHA of HEAD, like deploy.yml.
# ==============================================================================
run_cmd gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
run_cmd docker build --platform linux/amd64 --tag "$IMAGE_URI" .
run_cmd docker push "$IMAGE_URI"
if [ "$DRY_RUN" != "1" ]; then
  IMAGE_URI="$(gcloud artifacts docker images describe "$IMAGE_URI" --project "$PROJECT_ID" --format='value(image_summary.fully_qualified_digest)')"
  [[ "$IMAGE_URI" == "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}@sha256:"* ]] || { echo 'Missing image digest' >&2; exit 1; }
fi

# ==============================================================================
# 10. Create/Update & Execute Cloud Run Job for Migration + Non-destructive Seed
#     ⭐ IMPORTANT: if this job fails the script stops BEFORE deploying the
#        service, so a broken migration never reaches users.
#     CHANGE ME: `--args` runs the server workspace scripts (JOB_ARGS above): the
#        image's working directory is /app, where `npx prisma migrate deploy`
#        finds no schema. Never the destructive `npm run seed`.
#     deploy.yml / release.sh later re-run this same job (name: s47a6b53b-migrate).
# ==============================================================================
run_cmd gcloud run jobs update "$MIGRATE_JOB_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --set-cloudsql-instances "$SQL_CONN_NAME" \
  --update-secrets "$JOB_SECRETS" \
  --update-env-vars "NODE_ENV=production,TZ=Asia/Bangkok,SEED_DEMO_DATA=${SEED_DEMO_DATA}" \
  --command "sh" \
  --args "$JOB_ARGS" \
  --max-retries 1 \
  --task-timeout 300s \
  --project "$PROJECT_ID"

if ! run_cmd gcloud run jobs execute "$MIGRATE_JOB_NAME" \
  --region "$REGION" \
  --wait \
  --project "$PROJECT_ID"; then
  printf '%s\n' "ERROR: Cloud Run migration job '${MIGRATE_JOB_NAME}' failed. Aborting service deployment." >&2
  printf '%s\n' "View job logs with:" >&2
  printf '%s\n' "  gcloud logging read \"resource.type=cloud_run_job AND resource.labels.job_name=${MIGRATE_JOB_NAME}\" --project \"${PROJECT_ID}\" --limit 50 --format=\"value(textPayload)\"" >&2
  exit 1
fi

# ==============================================================================
# 11. Deploy Cloud Run Service
#     CHANGE ME: --port 3000 as in the Dockerfile; 512Mi, 1 CPU, 0 to 1 instances
#                (cost, #95); COOKIE_SECURE=true because Cloud Run is HTTPS only.
#     ⚠️ --allow-unauthenticated makes the service public (needed for the demo).
# ==============================================================================
run_cmd gcloud run services update "$SERVICE_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --add-cloudsql-instances "$SQL_CONN_NAME" \
  --update-secrets "DATABASE_URL=${SECRET_DB_URL}:latest" \
  --update-env-vars "NODE_ENV=production,TZ=Asia/Bangkok,COOKIE_SECURE=true,SESSION_TTL_MINUTES=60" \
  --min-instances 0 \
  --max-instances 1 \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --project "$PROJECT_ID"

run_cmd gcloud run services update-traffic "$SERVICE_NAME" --to-latest --project "$PROJECT_ID" --region "$REGION" --quiet
if [ "$DRY_RUN" = "1" ]; then
  SERVICE_URL="https://${SERVICE_NAME}-<hash>-as.a.run.app"
else
  SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
fi

# ------------------------------------------------------------------------------
# Summary output (URLs; passwords stay in Secret Manager and are not printed)
# ------------------------------------------------------------------------------
printf '\n'
printf '%s\n' "=================================================================="
printf '%s\n' "Deployment Completed!"
printf '%s\n' "Service URL    : ${SERVICE_URL}"
printf '%s\n' "Health Check   : ${SERVICE_URL}/api/health"
if [ "$SEED_DEMO_DATA" = "true" ]; then
  printf '%s\n' "Demo accounts  : organizer1@example.com, participant1@example.com, ..."
  printf '%s\n' "Demo Password  : Stored in Secret Manager: ${SECRET_DEMO_PASS} (not printed)."
fi
printf '%s\n' "=================================================================="
