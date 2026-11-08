"""Build the Deliverable 1 PDF (Issue #43, 10.3): cover, navigation table, contents, Parts A to F.

Run from the repository root:
  python3 docs/pdf/build_pdf.py            # writes docs/pdf/build/report.html
  node docs/pdf/render_pdf.mjs             # prints it to PDF and fills in the real page numbers

The text comes from the docs in the repository (Parts A to C through build_part_a_c.py, Part D from the plan,
Part E from the contracts, Part F from part-f.md plus the evidence files), so the PDF cannot drift from the repo.
GitHub data (PR reviews, board, contributions) is read with the gh CLI at build time.
"""
import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "docs" / "pdf"
OUT = PDF / "build"
REPO = "songt888/event-registration-system"
TAG, COMMIT = "v0.1.0-sprint1", "12dcd3c"
PAGES = json.loads((OUT / "pages.json").read_text()) if (OUT / "pages.json").exists() else {}


def run(*args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, check=True).stdout


def gh(*args):
    return json.loads(run("gh", *args))


def read(rel):
    return (ROOT / rel).read_text()


def page(key):
    return str(PAGES.get(key, "?"))


# ---------------------------------------------------------------- markdown
def inline(text):
    parts = re.split(r"(`[^`]+`)", text)
    out = []
    for p in parts:
        if p.startswith("`") and p.endswith("`") and len(p) > 1:
            out.append(f"<code>{html.escape(p[1:-1])}</code>")
            continue
        t = html.escape(p, quote=False)
        t = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", lambda m: f'<img src="{m.group(2)}" alt="{m.group(1)}">', t)
        t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: f"<span class='ref'>{m.group(1)}</span>", t)
        t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
        t = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", t)
        out.append(t)
    return "".join(out)


def md(text, shift=0):
    lines = text.replace("\r", "").split("\n")
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("<!--"):
            while i < len(lines) and "-->" not in lines[i]:
                i += 1
            i += 1
            continue
        if line.startswith("```"):
            lang = line[3:].strip()
            j = i + 1
            while j < len(lines) and not lines[j].startswith("```"):
                j += 1
            body = "\n".join(lines[i + 1 : j])
            out.append(f"<pre class='mermaid'>{html.escape(body)}</pre>" if lang == "mermaid" else f"<pre>{html.escape(body)}</pre>")
            i = j + 1
            continue
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            lvl = min(len(m.group(1)) + shift, 6)
            out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>")
            i += 1
            continue
        if line.lstrip().startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            head = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
            rows, j = [], i + 2
            while j < len(lines) and lines[j].lstrip().startswith("|"):
                rows.append([c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", lines[j].strip().strip("|"))])
                j += 1
            t = "<table><thead><tr>" + "".join(f"<th>{inline(h)}</th>" for h in head) + "</tr></thead><tbody>"
            for r in rows:
                t += "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>"
            out.append(t + "</tbody></table>")
            i = j
            continue
        if re.match(r"^\s*([-*]|\d+\.)\s+", line):
            ordered = bool(re.match(r"^\s*\d+\.", line))
            items, j = [], i
            while j < len(lines) and (re.match(r"^\s*([-*]|\d+\.)\s+", lines[j]) or (lines[j].startswith("  ") and lines[j].strip())):
                if re.match(r"^\s*([-*]|\d+\.)\s+", lines[j]):
                    items.append(re.sub(r"^\s*([-*]|\d+\.)\s+", "", lines[j]))
                else:
                    items[-1] += " " + lines[j].strip()
                j += 1
            lis = []
            for it in items:
                box = re.match(r"^\[( |x)\]\s+(.*)", it)
                mark = ("&#9745; " if box.group(1) == "x" else "&#9744; ") if box else ""
                lis.append(f"<li>{mark}{inline(box.group(2) if box else it)}</li>")
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" + "".join(lis) + f"</{tag}>")
            i = j
            continue
        if not line.strip():
            i += 1
            continue
        para, j = [line], i + 1
        while j < len(lines) and lines[j].strip() and not re.match(r"^(#|\||```|<!--|\s*([-*]|\d+\.)\s)", lines[j]):
            para.append(lines[j])
            j += 1
        out.append("<p>" + inline(" ".join(para)) + "</p>")
        i = j
    return "\n".join(out)


def section(text, start, end=None):
    """The markdown between the heading that starts with `start` and the next heading of the same level."""
    lines = text.split("\n")
    s = next(i for i, l in enumerate(lines) if l.startswith(start))
    level = len(start) - len(start.lstrip("#"))
    e = next((i for i in range(s + 1, len(lines)) if re.match(rf"^#{{1,{level}}}\s", lines[i])), len(lines))
    if end:
        e = next((i for i in range(s + 1, len(lines)) if lines[i].startswith(end)), e)
    return "\n".join(lines[s:e])


def figure(src, caption, cls=""):
    return f"<figure class='{cls}'><img src='{src}'><figcaption>{html.escape(caption)}</figcaption></figure>"


def pre(text, cls=""):
    return f"<pre class='{cls}'>{html.escape(text.strip())}</pre>"


# ---------------------------------------------------------------- Parts A to E
def parts_a_c():
    text = run(sys.executable, "docs/pdf/build_part_a_c.py")
    return md(text)


def part_d():
    return "<h1 id='part-d'>Part D. Three-sprint plan</h1>" + md(read("docs/sprints/plan.md"), shift=1)


E_DOCS = [
    ("docs/sprints/sprint-1/f-01-auth.md", "F-01"),
    ("docs/sprints/sprint-1/f-02-publish-event.md", "F-02"),
    ("docs/sprints/sprint-1/f-03-browse-events.md", "F-03"),
    ("docs/sprints/sprint-1/f-04-register.md", "F-04"),
    ("docs/sprints/sprint-1/f-05-f-06-registrations.md", "F-05, F-06"),
    ("docs/sprints/sprint-1/definition-of-done.md", "DoD"),
]


def part_e():
    out = ["<h1 id='part-e'>Part E. Sprint 1 feature contracts and Product Definition of Done</h1>",
           "<p>The six Sprint 1 contracts (feature SDS, applicable UI, API and data specifications, acceptance criteria and the "
           "system test specification with TEST IDs) and the shared Product Definition of Done, each as merged in the repository.</p>"]
    for path, key in E_DOCS:
        out.append(f"<div class='doc' id='e-{key[:4].lower().replace(',', '')}'>" + md(read(path), shift=1) + "</div>")
    return "\n".join(out)


# ---------------------------------------------------------------- Part F blocks
REL = "docs/evidence/release"


def demos():
    readme = read(f"{REL}/README.md")
    sec = section(readme, "## 2. Part F2 demo scenarios")
    sec = sec.split("\n", 1)[1]  # drop the README's own heading; F2 is ours
    out = []
    for block in re.split(r"(?=^### Scenario)", sec, flags=re.M):
        if not block.strip():
            continue
        shots = re.findall(r"\(demo/([^)]+\.png)\)", block)
        out.append(md(block, shift=1))
        if shots:
            out.append("<div class='shots'>" + "".join(figure(f"../../evidence/release/demo/{s}", s[:-4]) for s in shots) + "</div>")
    calls = json.loads(read(f"{REL}/demo/api-evidence.json"))
    calls = calls if isinstance(calls, list) else calls.get("calls", [])
    rows = "".join(
        f"<tr><td>{html.escape(str(c.get('scenario')))}</td><td>{html.escape(str(c.get('ids')))}</td><td>{html.escape(str(c.get('actor')))}</td>"
        f"<td><code>{html.escape(str(c.get('request')))}</code></td><td>{html.escape(str(c.get('expected')))}</td>"
        f"<td>{html.escape(str(c.get('status')))} {html.escape(str((c.get('body') or {}).get('error', {}).get('code', '') if isinstance(c.get('body'), dict) else ''))}</td></tr>"
        for c in calls)
    out.append("<h3>Backend and API evidence for the protected operations</h3>"
               "<p>Recorded by the capture script through the signed-in browser session on the release commit "
               "(<code>docs/evidence/release/demo/api-evidence.json</code>). Hiding a button does not prove authorization: these calls "
               "go straight to the API.</p>"
               "<table><thead><tr><th>Scenario</th><th>AC</th><th>Actor</th><th>Request</th><th>Expected</th><th>Actual</th></tr></thead>"
               f"<tbody>{rows}</tbody></table>")
    return "\n".join(out)


def tail(path, pattern, n=25):
    lines = [re.sub(r"\x1b\[[0-9;]*m", "", l) for l in read(path).split("\n")]
    keep = [l for l in lines if re.search(pattern, l)]
    return "\n".join(keep[:n])


def build_results():
    readme = read(f"{REL}/README.md")
    intro = (f"<p>Tested commit: <code>{COMMIT}</code> (tag <code>{TAG}</code>). Commands and counts from "
             "<code>docs/evidence/release/README.md</code>; the raw output is in <code>docs/evidence/release/logs/</code>.</p>")
    table = md(section(readme, "## 1. Commands and counts").split("\n", 1)[1])
    test_out = pre(tail(f"{REL}/logs/test.txt", r"Test Files|Tests |✓ \||Start at|Duration"), "log")
    e2e_out = pre(tail(f"{REL}/logs/e2e.txt", r"✓|✘|passed|failed|skipped|Running"), "log")
    conc = pre(tail(f"{REL}/logs/concurrency.txt", r"run \d|Tests "), "log")
    return (intro + table + "<h3>Output: <code>npm test</code></h3>" + test_out + "<h3>Output: <code>npm run test:e2e</code></h3>"
            + e2e_out + "<h3>Output: TEST-15 and TEST-37, five runs (NFR-04)</h3>" + conc)


def ac_table():
    text = read("docs/evidence/ac-test-results.md")
    sec = section(text, "## 2. AC to TEST to file and name to result").split("\n", 1)[1]
    return md(sec)


def nfr_table():
    text = read("docs/evidence/ac-test-results.md")
    first = md(section(text, "## 3. NFR checks").split("\n", 1)[1].split("### 3.1")[0])
    rerun = md(section(read(f"{REL}/README.md"), "## 3. NFR-09 rerun").split("\n", 1)[1])
    shots = "<div class='shots'>" + "".join(
        figure(f"../../evidence/release/nfr-09/{n}.png", n) for n in ["events-list-empty", "my-registrations-loading", "event-detail-error"]) + "</div>"
    return first + "<h3>NFR-09 rerun on the release commit</h3>" + rerun + shots


def block(path, marker):
    """One `it(...)` block from a test file, found by its TEST ID, ending at the matching closing line."""
    lines = read(path).split("\n")
    s = next(i for i, l in enumerate(lines) if marker in l and "it(" in l)
    indent = len(lines[s]) - len(lines[s].lstrip())
    e = next(i for i in range(s + 1, len(lines)) if lines[i].startswith(" " * indent + "});"))
    return s + 1, "\n".join(lines[s : e + 1])


def helper(path, name):
    lines = read(path).split("\n")
    s = next(i for i, l in enumerate(lines) if re.match(rf"^(async function|function|const) {name}\b", l))
    e = s
    while not lines[e].rstrip().endswith(";") or lines[e].startswith(" "):
        if lines[e].strip() in ("}", "};") and e > s:
            break
        e += 1
    return "\n".join(lines[s : e + 1])


def excerpts():
    out = []
    specs = [
        ("TEST-13", "domain rule: capacity (BR-02, AC-13)", "server/src/registrations.int.test.ts", ["seedEvent", "register"],
         "A participant cannot register for a full event: the API answers 409 EVENT_FULL and nothing is stored."),
        ("TEST-20", "role and ownership restriction (BR-05, NFR-03, AC-20)", "server/src/event-registrations.int.test.ts", ["login", "list", "fixtures"],
         "An organizer who does not own a PUBLISHED event cannot read its registrations: 403 FORBIDDEN from the backend."),
    ]
    for tid, title, path, helpers, why in specs:
        line, body = block(path, f"'{tid} ")
        code = "\n\n".join([helper(path, h) for h in helpers] + [body])
        red = read(f"docs/evidence/tdd/{tid}-red.txt")
        green = read(f"docs/evidence/tdd/{tid}-green.txt")
        out.append(f"<h3>{tid}: {html.escape(title)}</h3><p>{html.escape(why)} Source: <code>{path}</code>, line {line}.</p>"
                   + pre(code, "code")
                   + "<div class='pair'><div><h4>Red: before the implementation</h4>" + pre(red, "log") + "</div>"
                   + "<div><h4>Green: after the implementation</h4>" + pre(green, "log") + "</div></div>")
    out.append("<p>The other TDD samples named in the team workflow (TEST-07 and TEST-18) are in "
               "<code>docs/evidence/tdd/</code> with the same red and green format.</p>")
    return "\n".join(out)


CHAINS = [
    {"issue": 5, "feature": "F-02 Publish event", "contract_pr": 56, "pr": 63, "role": "B authors, A reviews"},
    {"issue": 7, "feature": "F-04 Register for event", "contract_pr": 54, "pr": 65, "role": "A implements on B's red tests, B reviews"},
]


def pr(n):
    return gh("pr", "view", str(n), "-R", REPO, "--json",
              "number,title,author,headRefName,createdAt,mergedAt,mergeCommit,mergedBy,commits,reviews")


def short(s, n=380):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s if len(s) <= n else s[: s.rfind(" ", 0, n)] + " ..."


def chains():
    out = []
    for c in CHAINS:
        p, cp = pr(c["pr"]), pr(c["contract_pr"])
        reviews = "<br>".join(f"{r['author']['login']}: {r['state'].replace('_', ' ').lower()} at <code>{r['commit']['oid'][:7]}</code> "
                              f"({r['submittedAt'][:16].replace('T', ' ')} UTC)" for r in p["reviews"])
        first = next((r for r in p["reviews"] if r["state"] == "CHANGES_REQUESTED"), p["reviews"][0])
        out.append(
            f"<h3>Issue #{c['issue']}: {c['feature']} ({c['role']})</h3><table><tbody>"
            f"<tr><th>Contract</th><td>PR #{cp['number']} <em>{html.escape(cp['title'])}</em>, branch <code>{cp['headRefName']}</code>, "
            f"author {cp['author']['login']}, merged {cp['mergedAt'][:16].replace('T', ' ')} UTC</td></tr>"
            f"<tr><th>Implementation PR</th><td>PR #{p['number']} <em>{html.escape(p['title'])}</em></td></tr>"
            f"<tr><th>Branch</th><td><code>{p['headRefName']}</code> into <code>sprint-1-staging</code></td></tr>"
            f"<tr><th>Author / reviewer</th><td>{p['author']['login']} / {', '.join(sorted({r['author']['login'] for r in p['reviews']}))}</td></tr>"
            f"<tr><th>Reviews</th><td>{reviews}</td></tr>"
            f"<tr><th>Substantive review (excerpt)</th><td>{html.escape(short(first['body']))}</td></tr>"
            f"<tr><th>Into staging</th><td>merge commit <code>{p['mergeCommit']['oid'][:7]}</code> by {p['mergedBy']['login']}, "
            f"{p['mergedAt'][:16].replace('T', ' ')} UTC</td></tr>"
            f"<tr><th>Into main</th><td>release PR #79, merge commit <code>{COMMIT}</code>, tag <code>{TAG}</code></td></tr>"
            "</tbody></table>")
        n = c["pr"]
        figs = PDF / "figures"
        shots = [(f"pr{n}-header.png", f"PR #{n} on GitHub (logged out): title, merged state, branch into sprint-1-staging")]
        shots += [(f.name, f"PR #{n}: review {k + 1}") for k, f in enumerate(sorted(figs.glob(f"pr{n}-review*.png")))]
        shots += [(f"pr{n}-merged.png", f"PR #{n}: merge into sprint-1-staging")]
        out += [figure(f"../figures/{f}", cap, "gh") for f, cap in shots if (figs / f).exists()]
        c["data"], c["contract"] = p, cp
    return "\n".join(out)


def history():
    out = ["<h3>History sequence: contract and tests before implementation</h3>",
           "<p>Commit IDs and dates from the repository (UTC). In both Issues the contract was merged first, then the failing tests "
           "were committed, then the implementation, then the review and the merges.</p>"]
    for c in CHAINS:
        p, cp = c["data"], c["contract"]
        rows = [(cp["mergedAt"], cp["mergeCommit"]["oid"][:7], f"Contract PR #{cp['number']} merged into staging")]
        for k in p["commits"]:
            rows.append((k["committedDate"], k["oid"][:7], f"{(k['authors'][0].get('login') or '')}: {k['messageHeadline']}"))
        for r in p["reviews"]:
            rows.append((r["submittedAt"], r["commit"]["oid"][:7], f"Review by {r['author']['login']}: {r['state'].replace('_', ' ').lower()}"))
        rows.append((p["mergedAt"], p["mergeCommit"]["oid"][:7], f"PR #{p['number']} merged into sprint-1-staging"))
        rows.sort()
        body = "".join(f"<tr><td>{d[:16].replace('T', ' ')}</td><td><code>{h}</code></td><td>{html.escape(t)}</td></tr>" for d, h, t in rows)
        out.append(f"<h4>Issue #{c['issue']} ({c['feature']})</h4><table><thead><tr><th>Date (UTC)</th><th>Commit</th><th>Event</th></tr></thead>"
                   f"<tbody>{body}<tr><td>2026-11-08 06:07</td><td><code>{COMMIT}</code></td><td>Release PR #79 merged into main; tag {TAG} on this commit</td></tr></tbody></table>")
    return "\n".join(out)


def board():
    items = gh("project", "item-list", "3", "--owner", "songt888", "--limit", "100", "--format", "json")["items"]
    by = {}
    for it in items:
        by.setdefault(it.get("status") or "No status", []).append(it["content"].get("number"))
    rows = "".join(f"<tr><td>{s}</td><td>{len(v)}</td><td>{', '.join('#' + str(n) for n in sorted(x for x in v if x))}</td></tr>"
                   for s, v in sorted(by.items()))
    return ("<h3>Board status and release reference</h3>"
            "<p>GitHub Project \"Event Registration - Sprint 1\" at the time of this build (Issues and sub-tasks; sub-tasks merged into "
            "others were closed as not planned and are not on the board). Release: tag <code>v0.1.0-sprint1</code> on "
            f"<code>{COMMIT}</code>, created after both students agreed on Issue #44.</p>"
            f"<table><thead><tr><th>Column</th><th>Count</th><th>Issues</th></tr></thead><tbody>{rows}</tbody></table>")


def contrib():
    prs = gh("pr", "list", "-R", REPO, "--state", "merged", "--limit", "200", "--json", "number,author,reviews,mergedAt")
    authors = run("git", "log", COMMIT, "--no-merges", "--format=%an").split("\n")
    a_commits = sum(1 for a in authors if a in ("songt888", "Kirakit Kingkaew"))
    b_commits = sum(1 for a in authors if a == "TonklaNattakit")
    stat = {}
    for who in ("songt888", "stickkersz"):
        stat[who] = (sum(1 for p in prs if p["author"]["login"] == who),
                     sum(1 for p in prs for r in p["reviews"] if r["author"]["login"] == who and r["state"] in ("APPROVED", "CHANGES_REQUESTED", "COMMENTED")))
    return (
        "<table><thead><tr><th>Student</th><th>Commits on main (no merges)</th><th>PRs authored (merged)</th><th>Reviews given</th><th>Main work</th></tr></thead><tbody>"
        f"<tr><td>A: Kirakit Kingkaew, 67070503460 (songt888)</td><td>{a_commits}</td><td>{stat['songt888'][0]}</td><td>{stat['songt888'][1]}</td>"
        "<td>SRS, feature inventory, traceability (Parts A, B); F-01 and F-02 contracts; foundation (Issue 3); F-01 Auth; F-04 implementation; "
        "F-05 My registrations; E2E golden journey and login/logout; 73.2 UI screens; PDF Parts A to C; release evidence (10.1); review of every B PR</td></tr>"
        f"<tr><td>B: Nattakit Prasertsak, 67070503413 (stickkersz)</td><td>{b_commits}</td><td>{stat['stickkersz'][0]}</td><td>{stat['stickkersz'][1]}</td>"
        "<td>System-Level SDS and three-sprint plan (Parts C, D); F-03 to F-06 contracts; F-02 Publish and F-03 Browse; F-04 red tests; "
        "F-06 Organizer registrations; E2E full event; QA run and NFR checks (9.4); UI style 73.1 and its fix; release PR and tag (10.4); "
        "PDF Parts D to F and assembly; review of every A PR</td></tr></tbody></table>"
        "<p>Counts are from the repository up to the release commit and from GitHub. Commits by \"Kirakit Kingkaew\" and \"songt888\" are the same "
        "student (two Git identities). Reviews include first-pass reviews by B's supervised autopilot posted under B's account (F7). "
        "Equal counts are not required; both students wrote requirements, contracts, tests, code and reviews.</p>")


def ai_use():
    text = read("docs/sprints/sprint-1/ai-use.md").split("\n", 1)[1]
    return md(text, shift=1)


def part_f():
    text = read("docs/pdf/part-f.md")
    fill = {"DEMOS": demos, "BUILD_RESULTS": build_results, "AC_TABLE": ac_table, "NFR_TABLE": nfr_table, "EXCERPTS": excerpts,
            "CHAINS": chains, "HISTORY": history, "BOARD": board, "CONTRIB": contrib, "AI_USE": ai_use}
    out = []
    for chunk in re.split(r"(\{\{[A-Z_]+\}\})", text):
        m = re.match(r"\{\{([A-Z_]+)\}\}", chunk)
        out.append(fill[m.group(1)]() if m else md(chunk))
    return "\n".join(out).replace("<h1>Part F.", "<h1 id='part-f'>Part F.", 1)


# ---------------------------------------------------------------- front matter
NAV = [
    ("A", "SRS and product scope", "FR-01 to FR-15, BR-01 to BR-09, NFR-01 to NFR-09, D-01 to D-16"),
    ("B", "Feature inventory and traceability", "F-01 to F-13; requirement to feature to sprint to AC/TEST; gaps"),
    ("C", "System-Level SDS", "architecture, data model, UI/API conventions, roles, auth, configuration, deployment"),
    ("D", "Three-sprint plan", "S1 to S3 goals, F-01 to F-13, dependencies, Sprint 1 scope"),
    ("E", "Sprint 1 contracts and Definition of Done", "F-01 to F-06, AC-01 to AC-51, TEST-01 to TEST-51, DoD"),
    ("F", "Working Sprint 1 and evidence", f"demos (AC-22 to AC-24, AC-04, AC-13 to AC-21), results, TDD, history, contributions; release {TAG}"),
]
SUBS_F = ["F1. Setup summary", "F2. Program demonstrations", "F3. Build and automated test results", "F4. Test excerpts and TDD evidence",
          "F5. Engineering workflow and history", "F6. Contributions", "F7. AI-use declaration", "F8. Known limitations"]


def front():
    nav = "".join(f"<tr><td>Part {k}</td><td>{t}</td><td>{page('part-' + k.lower())} to {page('end-' + k.lower())}</td><td>{ids}</td></tr>"
                  for k, t, ids in NAV)
    subs = "".join(f"<tr class='sub'><td></td><td>{s}</td><td>{page('f' + s[1])}</td><td></td></tr>" for s in SUBS_F)
    return f"""
<section class='cover'>
  <p class='course'>CPE 334 Software Engineering, Semester 1/2026</p>
  <h1 class='title'>Project Deliverable 1</h1>
  <p class='subtitle'>Event Registration and Attendance System (Theme 3)</p>
  <table class='meta'><tbody>
    <tr><th>Student A</th><td>Kirakit Kingkaew, 67070503460 (GitHub songt888)</td></tr>
    <tr><th>Student B</th><td>Nattakit Prasertsak, 67070503413 (GitHub stickkersz)</td></tr>
    <tr><th>Repository</th><td>https://github.com/{REPO}</td></tr>
    <tr><th>Submitted release</th><td>tag <code>{TAG}</code>, commit <code>12dcd3c1504a073507017c65a4e8168e8e0e5bef</code> on <code>main</code></td></tr>
    <tr><th>Date</th><td>8 November 2026</td></tr>
  </tbody></table>
  <h2>Navigation</h2>
  <table class='nav'><thead><tr><th>Part</th><th>Content</th><th>Pages</th><th>Relevant IDs</th></tr></thead><tbody>{nav}{subs}</tbody></table>
  <p class='note'>Page numbers refer to this PDF. Execution evidence for the requirements in Parts A to E is in Part F; IDs are the same in every Part and in the repository.</p>
</section>"""


CSS = """
@import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&family=JetBrains+Mono:wght@400&display=swap');
@page { size: A4; }
body { font-family: 'Tinos', 'Times New Roman', serif; font-size: 10pt; line-height: 1.32; color: #1d1b19; }
h1 { font-size: 17pt; color: #a9622f; border-bottom: 1.5px solid #a9622f; padding-bottom: 3px; margin: 0 0 8px; break-before: page; }
h2 { font-size: 13pt; color: #7a4520; margin: 12px 0 4px; break-after: avoid; }
h3 { font-size: 11pt; margin: 10px 0 3px; break-after: avoid; }
h4, h5, h6 { font-size: 10pt; margin: 8px 0 2px; break-after: avoid; }
p { margin: 3px 0 5px; }
ul, ol { margin: 3px 0 5px 18px; padding: 0; }
li { margin: 1px 0; }
code { font-family: 'JetBrains Mono', monospace; font-size: 8pt; background: #f4efe9; padding: 0 2px; border-radius: 2px; }
pre { font-family: 'JetBrains Mono', monospace; font-size: 7.4pt; line-height: 1.3; background: #f7f3ee; border: 1px solid #e4d9cc;
      padding: 5px 7px; white-space: pre-wrap; word-break: break-word; margin: 4px 0 8px; }
pre.mermaid { background: none; border: none; text-align: center; }
table { border-collapse: collapse; width: 100%; margin: 4px 0 8px; font-size: 8.4pt; line-height: 1.25; }
th, td { border: 1px solid #d9cfc4; padding: 2.5px 4px; vertical-align: top; text-align: left; }
th { background: #f2e8de; }
tr { break-inside: avoid; }
.ref { color: #7a4520; }
figure { margin: 4px 0 8px; break-inside: avoid; }
figure img { width: 100%; border: 1px solid #d9cfc4; }
figure.gh img { width: auto; max-width: 100%; max-height: 120mm; }
figcaption { font-size: 8pt; color: #5c5752; margin-top: 2px; }
.shots { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.pair pre { font-size: 6.6pt; }
.cover .course { margin-top: 40px; color: #5c5752; }
.cover .title { break-before: avoid; border: none; font-size: 26pt; margin: 6px 0 2px; }
.cover .subtitle { font-size: 14pt; margin-bottom: 14px; }
.cover table.meta th { width: 22%; }
table.nav td:first-child, table.nav th:first-child { width: 9%; white-space: nowrap; }
table.nav tr.sub td { font-size: 8pt; color: #5c5752; border-top: none; }
table.toc td { border: none; border-bottom: 1px dotted #d9cfc4; padding: 2px 4px; }
table.toc td:last-child { width: 10%; text-align: right; }
table.toc tr.l1 td { font-weight: bold; padding-top: 6px; color: #7a4520; }
table.toc tr.l2 td:first-child { padding-left: 18px; }
.cover .note { font-size: 8.5pt; color: #5c5752; }
"""


def contents(body):
    """Contents page: every Part (h1) and every document or F-section heading (h2) after the cover, with its real page."""
    heads = re.findall(r"<h([12])[^>]*>(.*?)</h\1>", body.split("</section>", 1)[1])
    entries = [(int(lvl), html.unescape(re.sub(r"<[^>]+>", "", t)).strip()) for lvl, t in heads]
    (OUT / "toc.json").write_text(json.dumps([t for _, t in entries]))
    nums = PAGES.get("toc", [])
    rows = "".join(f"<tr class='l{lvl}'><td>{html.escape(t)}</td><td>{nums[i] if i < len(nums) else '?'}</td></tr>"
                   for i, (lvl, t) in enumerate(entries))
    return f"<section class='toc'><h1 class='toc-title'>Contents</h1><table class='toc'><tbody>{rows}</tbody></table><p class='note'>End of contents. Numbers are the page numbers printed at the bottom of each page.</p></section>"


def main():
    OUT.mkdir(exist_ok=True)
    body = "\n".join([front(), parts_a_c(), part_d(), part_e(), part_f()])
    body = (body.replace("<h1>Part A.", "<h1 id='part-a'>Part A.", 1)
                .replace("<h1>Part B.", "<h1 id='part-b'>Part B.", 1)
                .replace("<h1>Part C.", "<h1 id='part-c'>Part C.", 1))
    body = body.replace("</section>", "</section>" + contents(body), 1)
    # The seed password placeholder from .env.example appears in Part C's configuration table; it never goes into the PDF.
    seed = re.search(r"^SEED_PASSWORD=(.+)$", read(".env.example"), re.M)
    if seed and seed.group(1).strip():
        body = body.replace(seed.group(1).strip(), "(local value, see .env.example)")
    doc = ("<!doctype html><html lang='en'><head><meta charset='utf-8'><title>CPE 334 Deliverable 1</title>"
           f"<style>{CSS}</style>"
           "<script type='module'>import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs';"
           "mermaid.initialize({startOnLoad:false, theme:'neutral'}); await mermaid.run(); document.body.dataset.ready='1';</script>"
           f"</head><body>{body}</body></html>")
    (OUT / "report.html").write_text(doc)
    print(f"wrote {OUT / 'report.html'} ({len(doc)} bytes); pages known: {len(PAGES)}")


if __name__ == "__main__":
    main()
