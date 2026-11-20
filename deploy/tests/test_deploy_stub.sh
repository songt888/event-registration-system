#!/usr/bin/env bash
# TEST-54 AC-54: offline test of deploy/deploy.sh (L5-05, #90). No network, no GCP calls, no cost.
# Fake gcloud, docker and git come first on PATH and log every call; each scenario checks the log.
# Run from the repository root: bash deploy/tests/test_deploy_stub.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${SCRIPT_DIR}/../deploy.sh"
export STATE
STATE="$(mktemp -d)"
trap 'rm -rf "$STATE"' EXIT
mkdir -p "$STATE/bin"
SHA=0123456789abcdef0123456789abcdef01234567
DIGEST="asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s47a6b53b/s47a6b53b@sha256:aaaa"

fail() { echo "FAIL: TEST-54 AC-54 $*"; exit 1; }

cat > "$STATE/bin/gcloud" <<STUB
#!/usr/bin/env bash
printf 'gcloud %s\n' "\$*" >> "\$CALL_LOG"
case "\$1 \$2 \$3" in
  'artifacts docker images') echo '$DIGEST' ;;
  'run jobs execute') [ "\$STUB_MODE" != job-fail ] || exit 1 ;;
  'run services describe') echo https://s47a6b53b-stub.example.invalid ;;
esac
exit 0
STUB
cat > "$STATE/bin/docker" <<'STUB'
#!/usr/bin/env bash
printf 'docker %s\n' "$*" >> "$CALL_LOG"
STUB
cat > "$STATE/bin/git" <<STUB
#!/usr/bin/env bash
case "\$*" in
  'rev-parse HEAD') echo $SHA ;;
  'branch --show-current') echo "\$STUB_BRANCH" ;;
  *) exit 1 ;;
esac
STUB
chmod +x "$STATE/bin/"*
export PATH="$STATE/bin:$PATH"

run() { # mode branch dry_run [args...]
  export STUB_MODE="$1" STUB_BRANCH="$2" DRY_RUN="$3" CALL_LOG="$STATE/$1.log"
  shift 3
  rm -f "$CALL_LOG"; touch "$CALL_LOG"
  result=0
  bash "$DEPLOY_SCRIPT" "$@" > "$STATE/out" 2>&1 || result=$?
}

# Release on main with the kit's --demo flag (first deploy).
run release main 0 --demo
[ "$result" -eq 0 ] || fail "release: exit $result (a)"
L="$CALL_LOG"
grep -q "^docker build --platform linux/amd64 --tag asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s47a6b53b/s47a6b53b:$SHA \.\$" "$L" || fail "release: amd64 build tagged with the HEAD SHA (a)"
grep -q "^docker push asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s47a6b53b/s47a6b53b:$SHA\$" "$L" || fail "release: push by SHA (a)"
job="$(grep '^gcloud run jobs update s47a6b53b-migrate ' "$L")" || fail "release: job not updated (a)"
svc="$(grep '^gcloud run services update s47a6b53b ' "$L")" || fail "release: service not updated (a)"
case "$job" in *"--image $DIGEST "*) ;; *) fail "release: job must use the digest image (a)" ;; esac
case "$svc" in *"--image $DIGEST "*) ;; *) fail "release: service must use the digest image (a)" ;; esac
case "$job" in *'npm run migrate -w server && npm run seed:demo -w server'*) ;; *) fail "release: job command (b)" ;; esac
if printf '%s' "$job" | grep -Eq 'npm run seed( |$|-w)'; then fail "release: job runs the destructive seed (b)"; fi
case "$job" in *'DATABASE_URL=s47a6b53b-database-url:latest'*) ;; *) fail "release: job DATABASE_URL secret (b)" ;; esac
case "$job" in *'SEED_PASSWORD=s47a6b53b-demo-password:latest'*) ;; *) fail "release: job SEED_PASSWORD secret (b)" ;; esac
case "$svc" in *'COOKIE_SECURE=true'*) ;; *) fail "release: service COOKIE_SECURE=true (c)" ;; esac
case "$svc" in *'--update-secrets DATABASE_URL=s47a6b53b-database-url:latest '*) ;; *) fail "release: service secrets must be DATABASE_URL only (c)" ;; esac
if grep -Eq -- '--set-env-vars|--set-secrets' "$L"; then fail "release: --set-env-vars or --set-secrets used (c)"; fi
grep -q '^gcloud run jobs execute s47a6b53b-migrate ' "$L" || fail "release: job not executed (a)"
[ "$(grep -n '^gcloud run jobs execute' "$L" | cut -d: -f1)" -lt "$(grep -n '^gcloud run services update ' "$L" | cut -d: -f1)" ] || fail "release: service updated before the migration (d)"
if grep -Eq '^gcloud (sql|iam|secrets|projects|services enable|artifacts repositories create)|run deploy ' "$L"; then fail "release: creates infrastructure, IAM or secrets (f)"; fi
if grep -qi 'toktickit\|admin-password' "$L"; then fail "release: starter-kit name left (f)"; fi
echo "PASS: TEST-54 AC-54 release on main with --demo"

# Without --demo: migration only, no demo seed and no demo password.
run nodemo main 0
[ "$result" -eq 0 ] || fail "nodemo: exit $result (b)"
job="$(grep '^gcloud run jobs update s47a6b53b-migrate ' "$CALL_LOG")" || fail "nodemo: job not updated (b)"
case "$job" in *'--args -c,npm run migrate -w server --max-retries'*) ;; *) fail "nodemo: job command must be migrate only (b)" ;; esac
case "$job" in *SEED_PASSWORD*) fail "nodemo: SEED_PASSWORD given without --demo (b)" ;; esac
echo "PASS: TEST-54 AC-54 without --demo the job only migrates"

# Failed migration: the service is never updated.
run job-fail main 0
[ "$result" -eq 1 ] || fail "job-fail: exit $result, wanted 1 (d)"
if grep -q '^gcloud run services update ' "$CALL_LOG"; then fail "job-fail: service updated after the failed migration (d)"; fi
echo "PASS: TEST-54 AC-54 failed migration stops the release"

# Only main deploys.
run branch feature/x 0
[ "$result" -eq 1 ] || fail "branch: exit $result, wanted 1 (e)"
[ ! -s "$CALL_LOG" ] || fail "branch: gcloud or docker called on a non-main branch (e)"
echo "PASS: TEST-54 AC-54 refuses a branch other than main"

# Dry run is the default.
unset DRY_RUN
export STUB_MODE=dry STUB_BRANCH=feature/x CALL_LOG="$STATE/dry.log"; : > "$CALL_LOG"
bash "$DEPLOY_SCRIPT" > "$STATE/out" 2>&1 || fail "dry run exited non-zero (g)"
[ ! -s "$CALL_LOG" ] || fail "dry run called gcloud or docker (g)"
grep -q '^\[DRY_RUN\] gcloud run services update s47a6b53b ' "$STATE/out" || fail "dry run did not print the service update (g)"
echo "PASS: TEST-54 AC-54 dry run by default makes no calls"

# Only the kit's --demo flag is accepted.
run unknown main 1 --admin
[ "$result" -ne 0 ] || fail "--admin was accepted (h)"
echo "PASS: TEST-54 AC-54 rejects unknown arguments"
