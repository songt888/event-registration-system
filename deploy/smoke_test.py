"""Read-only smoke test of the deployed app (L5-07, #92; AC-55). GET requests only, no login, no data written.

Usage: python3 deploy/smoke_test.py <service URL>
"""
import json
import sys
import urllib.error
import urllib.request


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=20) as res:
            return res.status, res.headers.get("Content-Type", ""), res.read()
    except urllib.error.HTTPError as err:
        return err.code, err.headers.get("Content-Type", ""), err.read()


def main(base):
    base = base.rstrip("/")
    status, _, body = get(base + "/api/health")
    health = status == 200 and json.loads(body).get("status") == "ok"
    status, ctype, _ = get(base + "/")
    page = status == 200 and ctype.startswith("text/html")
    status, _, _ = get(base + "/api/me")
    checks = {"GET /api/health is 200 ok": health, "GET / is 200 HTML": page, "GET /api/me without a session is 401": status == 401}
    for name, ok in checks.items():
        print(("PASS: " if ok else "FAIL: ") + name)
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 deploy/smoke_test.py <service URL>")
    sys.exit(main(sys.argv[1]))
