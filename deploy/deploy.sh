#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Event Registration: first manual deploy to the course's shared Cloud Run (L5-05, #90; D-25)
# ==============================================================================
# Adapted from the team kit the course portal gave us (prefix s47a6b53b).
# The portal has created every resource; this script creates no infrastructure,
# IAM or secret. Contract: docs/labs/lab-05/l5-05-first-deploy.md
#
# Usage (repo root, on an up-to-date main, gcloud signed in):
#   bash deploy/deploy.sh               # dry run (default): prints the commands only
#   DRY_RUN=0 bash deploy/deploy.sh     # build, push, migrate + demo seed, update the service
#
# Steps: build linux/amd64 image tagged with the HEAD SHA -> push -> resolve the
# digest -> update and run the migration job (stops here if it fails) -> update
# the service -> send all traffic to the new revision.
# Env vars and secrets use --update-*, never --set-* (the course: --set-* replaces
# the portal's values). Offline test: bash deploy/tests/test_deploy_stub.sh (TEST-54)
# ==============================================================================

# ------------------------------------------------------------------------------
# Settings & argument parsing
# ------------------------------------------------------------------------------
DRY_RUN="${DRY_RUN:-1}"
# CHANGE ME: default region if your group uses another one.
REGION="${REGION:-asia-southeast1}"
if [ "$#" -gt 0 ]; then
  echo "Unknown argument: $1" >&2
  echo "Usage: [DRY_RUN=0] $0" >&2
  exit 1
fi

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

# Secret Manager secret names made by the portal (values never stored in this repo).
SECRET_DB_URL="s47a6b53b-database-url"
# The portal's demo password secret is used as SEED_PASSWORD for the synthetic demo accounts.
SECRET_DEMO_PASS="s47a6b53b-demo-password"

echo "=================================================================="
echo "Event Registration Cloud Run deployment"
echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Image   : ${IMAGE_URI}"
echo "Dry Run : ${DRY_RUN}"
echo "=================================================================="

# ==============================================================================
# Portal/TA pre-provisions infrastructure and public service IAM (Guide 5.3 steps 1–8, 5.4).
# These names must exist. Never create or modify project-level IAM here.
JOB_SECRETS="DATABASE_URL=${SECRET_DB_URL}:latest,SEED_PASSWORD=${SECRET_DEMO_PASS}:latest"
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
#     The image's working directory is /app, so the workspace form is needed
#     (`npx prisma migrate deploy` there finds no schema). seed:demo only adds
#     missing demo data and never deletes (D-20).
#     deploy.yml / release.sh later re-run this same job (name: s47a6b53b-migrate).
# ==============================================================================
run_cmd gcloud run jobs update "$MIGRATE_JOB_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --set-cloudsql-instances "$SQL_CONN_NAME" \
  --update-secrets "$JOB_SECRETS" \
  --update-env-vars "NODE_ENV=production,TZ=Asia/Bangkok" \
  --command "sh" \
  --args "-c,npm run migrate -w server && npm run seed:demo -w server" \
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
#     Port 3000 as in the Dockerfile; COOKIE_SECURE=true because Cloud Run is HTTPS only.
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
printf '%s\n' "Demo accounts  : organizer1@example.com, participant1@example.com, ... (password in Secret Manager: ${SECRET_DEMO_PASS}, not printed)"
printf '%s\n' "=================================================================="
