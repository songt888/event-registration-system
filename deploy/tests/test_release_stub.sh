#!/usr/bin/env bash
# TEST-55 AC-55: offline test of deploy/release.sh and deploy/smoke_test.py (L5-07, #92). No GCP calls, no cost.
# A fake gcloud comes first on PATH and logs every call; a stub HTTP server on 127.0.0.1 logs every request.
# Run from the repository root: bash deploy/tests/test_release_stub.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE="${SCRIPT_DIR}/../release.sh"
SMOKE="${SCRIPT_DIR}/../smoke_test.py"
STATE="$(mktemp -d)"
srv=
trap '[ -z "$srv" ] || kill "$srv" 2>/dev/null; rm -rf "$STATE"' EXIT
mkdir -p "$STATE/bin"
SHA=0123456789abcdef0123456789abcdef01234567
DIGEST="asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s47a6b53b/s47a6b53b@sha256:aaaa"
URL=https://s47a6b53b-stub.example.invalid

fail() { echo "FAIL: TEST-55 AC-55 $*"; exit 1; }

cat > "$STATE/bin/gcloud" <<STUB
#!/usr/bin/env bash
printf 'gcloud %s\n' "\$*" >> "\$CALL_LOG"
case "\$1 \$2 \$3" in
  'artifacts docker images') echo '$DIGEST' ;;
  'run jobs execute') [ "\$STUB_MODE" != job-fail ] || exit 1 ;;
  'run services describe') echo $URL ;;
esac
exit 0
STUB
chmod +x "$STATE/bin/gcloud"
export PATH="$STATE/bin:$PATH" PROJECT_ID=cpe-se-course-2026 REGION=asia-southeast1
unset SERVICE_NAME MIGRATE_JOB_NAME

release() { # mode rollback image_tag
  export STUB_MODE="$1" ROLLBACK="$2" IMAGE_TAG="$3" CALL_LOG="$STATE/$1.log" GITHUB_ENV="$STATE/$1.env"
  : > "$CALL_LOG"; : > "$GITHUB_ENV"
  result=0
  bash "$RELEASE" > "$STATE/out" 2>&1 || result=$?
}

# Normal release.
release release false "$SHA"
[ "$result" -eq 0 ] || fail "release: exit $result (a)"
L="$CALL_LOG"
grep -q "^gcloud artifacts docker images describe asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s47a6b53b/s47a6b53b:$SHA " "$L" || fail "release: digest of the SHA image (a)"
grep -q "^gcloud run jobs update s47a6b53b-migrate --image=$DIGEST " "$L" || fail "release: job must use the digest image (a)"
grep -q '^gcloud run jobs execute s47a6b53b-migrate --wait ' "$L" || fail "release: job not run with --wait (a)"
grep -q "^gcloud run services update s47a6b53b --image=$DIGEST " "$L" || fail "release: service must use the digest image (a)"
grep -q '^gcloud run services update-traffic s47a6b53b --to-latest ' "$L" || fail "release: traffic not sent to the latest revision (a)"
[ "$(grep -n '^gcloud run jobs execute' "$L" | cut -d: -f1)" -lt "$(grep -n '^gcloud run services update ' "$L" | cut -d: -f1)" ] || fail "release: service updated before the migration (a)"
grep -qx "SERVICE_URL=$URL" "$GITHUB_ENV" || fail "release: SERVICE_URL not in GITHUB_ENV (a)"
grep -qx "DEPLOYED_IMAGE=$DIGEST" "$GITHUB_ENV" || fail "release: DEPLOYED_IMAGE not in GITHUB_ENV (a)"
echo "PASS: TEST-55 AC-55 release migrates, then deploys the digest image"

# Failed migration: the service is never updated.
release job-fail false "$SHA"
[ "$result" -ne 0 ] || fail "job-fail: exit 0, wanted non-zero (b)"
if grep -q '^gcloud run services update' "$CALL_LOG"; then fail "job-fail: service updated after the failed migration (b)"; fi
echo "PASS: TEST-55 AC-55 failed migration stops the release"

# Rollback: no migration, the service still moves.
release rollback true "$SHA"
[ "$result" -eq 0 ] || fail "rollback: exit $result (c)"
if grep -q '^gcloud run jobs' "$CALL_LOG"; then fail "rollback: migration job touched (c)"; fi
grep -q "^gcloud run services update s47a6b53b --image=$DIGEST " "$CALL_LOG" || fail "rollback: service not updated (c)"
echo "PASS: TEST-55 AC-55 rollback skips the migration"

# A tag that is not a full SHA.
release bad-tag false 0123abc
[ "$result" -eq 1 ] || fail "bad-tag: exit $result, wanted 1 (d)"
[ ! -s "$CALL_LOG" ] || fail "bad-tag: gcloud called (d)"
echo "PASS: TEST-55 AC-55 rejects a short image tag"

ALL="$(cat "$STATE"/*.log)"
if printf '%s\n' "$ALL" | grep -Eq '^gcloud (sql|iam|secrets|projects|services enable|artifacts repositories create)|run deploy |--set-env-vars|--set-secrets'; then fail "a call creates infrastructure, IAM or secrets, or uses --set-* (e)"; fi
if printf '%s\n' "$ALL" | grep -qi toktickit; then fail "a call names toktickit (e)"; fi
echo "PASS: TEST-55 AC-55 no infrastructure, IAM, secrets or --set-*"

cat > "$STATE/server.py" <<'PY'
import http.server, os, sys
mode, log, portfile = sys.argv[1:4]
class H(http.server.BaseHTTPRequestHandler):
    def handle_any(self):
        with open(log, 'a') as f:
            f.write(f'{self.command} {self.path}\n')
        if self.path == '/api/health':
            code, ctype, body = (500 if mode == 'health-fail' else 200), 'application/json', b'{"status":"ok"}'
        elif self.path == '/api/me':
            code, ctype, body = (200 if mode == 'me-open' else 401), 'application/json', b'{}'
        elif self.path == '/':
            code, ctype, body = 200, 'text/html; charset=utf-8', b'<!doctype html><title>Event Registration</title>'
        else:
            code, ctype, body = 404, 'text/plain', b''
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    do_GET = do_HEAD = do_POST = do_PUT = do_PATCH = do_DELETE = handle_any
    def log_message(self, *args):
        pass
server = http.server.HTTPServer(('127.0.0.1', 0), H)
with open(portfile + '.tmp', 'w') as f:
    f.write(str(server.server_port))
os.replace(portfile + '.tmp', portfile)
server.serve_forever()
PY

smoke() { # server mode
  REQ="$STATE/$1.req"
  : > "$REQ"; rm -f "$STATE/port"
  python3 "$STATE/server.py" "$1" "$REQ" "$STATE/port" & srv=$!
  for _ in $(seq 50); do [ -s "$STATE/port" ] && break; sleep 0.1; done
  [ -s "$STATE/port" ] || fail "stub server did not start"
  result=0
  python3 "$SMOKE" "http://127.0.0.1:$(cat "$STATE/port")" > "$STATE/out" 2>&1 || result=$?
  kill "$srv" 2>/dev/null || true; wait "$srv" 2>/dev/null || true; srv=
}

smoke ok
[ "$result" -eq 0 ] || fail "smoke ok: exit $result (f)"
for req in 'GET /api/health' 'GET /' 'GET /api/me'; do grep -qx "$req" "$REQ" || fail "smoke ok: missing $req (f)"; done
if grep -qv '^GET ' "$REQ"; then fail "smoke ok: a request other than GET (f)"; fi
echo "PASS: TEST-55 AC-55 smoke test passes on a healthy app with GET only"

smoke me-open
[ "$result" -eq 1 ] || fail "smoke me-open: exit $result, wanted 1 (g)"
echo "PASS: TEST-55 AC-55 smoke test fails when /api/me is not 401"

smoke health-fail
[ "$result" -eq 1 ] || fail "smoke health-fail: exit $result, wanted 1 (g)"
echo "PASS: TEST-55 AC-55 smoke test fails when /api/health fails"
