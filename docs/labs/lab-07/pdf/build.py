"""Build the Lab 7 PDF (L7-08 #140).

Run from the repository root after `npm install` (Playwright prints the PDF):
  python3 docs/labs/lab-07/pdf/build.py <section>
writes docs/labs/lab-07/pdf/build/lab7_sec<section>_EN-009_P3.pdf

Order: front.md, part-a-b.md (A), part-c-d.md (B; a placeholder until it exists), then the appendices:
A1 CR-01 as merged (9c33d23), B1 the red test file (7098c4e), B2 the red output (E7-B1-red.txt).
"""
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
LAB = HERE.parent
sys.path.insert(0, str(ROOT / "docs" / "pdf"))
import build_pdf  # the Deliverable 1 Markdown converter

CR_MERGE = "9c33d23"  # CR-01 as reviewed and merged in PR #184, before the red commit
RED = "7098c4e"  # red test commit (L7-03)

CSS = """
@page { size: A4; margin: 14mm 13mm; }
body { font: 9.5pt/1.4 -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111; }
h1 { font-size: 16pt; margin: 0 0 6pt; break-before: page; } h1:first-of-type { break-before: auto; }
h2 { font-size: 13pt; margin: 14pt 0 5pt; border-bottom: 1px solid #999; break-after: avoid; } h3 { font-size: 11pt; break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 8pt; font-size: 8.5pt; } th, td { border: 1px solid #bbb; padding: 2pt 4pt; vertical-align: top; text-align: left; }
th { background: #eee; } code { font: 8.5pt Menlo, monospace; background: #f3f3f3; padding: 0 2pt; overflow-wrap: anywhere; }
pre { font: 7.5pt/1.3 Menlo, monospace; background: #f6f6f6; border: 1px solid #ddd; padding: 5pt; white-space: pre-wrap; }
blockquote { margin: 4pt 0 8pt; padding: 2pt 8pt; border-left: 3px solid #bbb; color: #222; }
a { color: #0645ad; text-decoration: none; overflow-wrap: anywhere; } img { max-width: 100%; max-height: 105mm; border: 1px solid #ccc; break-inside: avoid; }
"""


def demote(text, levels=2):
    """Appendix files keep their own headings, two levels down, so they nest under the appendix title."""
    return re.sub(r"^(#{1,4}) ", lambda m: "#" * min(len(m.group(1)) + levels, 6) + " ", text, flags=re.M)


def git_show(rev, path):
    return subprocess.run(["git", "show", f"{rev}:{path}"], cwd=ROOT, check=True, capture_output=True, text=True).stdout


def fence(text, lang=""):
    return f"```{lang}\n{text.rstrip()}\n```\n"


def source():
    part_cd = HERE / "part-c-d.md"
    parts = [
        (HERE / "front.md").read_text(),
        (HERE / "part-a-b.md").read_text(),
        part_cd.read_text() if part_cd.exists() else "# Part C: Objective engineering metrics\n\n_B: part-c-d.md not written yet._\n\n# Part D: Release readiness and retrospective\n\n_B: part-c-d.md not written yet._\n",
        f"# Appendices\n\n## Appendix A1: CR-01 as reviewed and merged (`{CR_MERGE}`, PR #184)\n\n"
        + demote(git_show(CR_MERGE, "docs/labs/lab-07/change-request.md")),
        f"## Appendix B1: red test file at `{RED}` (`server/src/registrations.conflict.int.test.ts`)\n\n"
        + fence(git_show(RED, "server/src/registrations.conflict.int.test.ts"), "ts"),
        "## Appendix B2: red output, E7-B1 (`docs/labs/lab-07/evidence/l7-03/E7-B1-red.txt`)\n\n"
        + fence((LAB / "evidence" / "l7-03" / "E7-B1-red.txt").read_text()),
    ]
    text = "\n\n".join(re.sub(r"<!--.*?-->", "", p, flags=re.S) for p in parts)
    text = re.sub(r"(?<!!)\[([^\]]+)\]\((?!https?:)[^)]+\)", r"\1", text)  # repo-relative links mean nothing on paper
    return re.sub(r"^---$", "", text, flags=re.M)


def render(text):
    """build_pdf.md has no blockquotes: render each run of '> ' lines (review quotes) inside <blockquote>."""
    out = []
    for chunk in re.split(r"(^```.*?^```[ \t]*$)", text, flags=re.M | re.S):
        if chunk.startswith("```"):
            out.append(build_pdf.md(chunk))
            continue
        for part in re.split(r"((?:^> .*\n?)+)", chunk, flags=re.M):
            if part.startswith("> "):
                out.append("<blockquote>" + build_pdf.md(re.sub(r"^> ", "", part, flags=re.M)) + "</blockquote>")
            elif part:
                out.append(build_pdf.md(part))
    return "".join(out)


def main():
    section = sys.argv[1] if len(sys.argv) > 1 else "X"
    body = render(source().replace("&lt;section&gt;", section))
    out = HERE / "build"
    out.mkdir(exist_ok=True)
    page = out / "lab7.html"
    # base = the lab folder, so evidence paths written relative to docs/labs/lab-07/ resolve
    page.write_text(f"<!doctype html><meta charset='utf-8'><base href='{LAB.as_uri()}/'><style>{CSS}</style>{body}")
    pdf = out / f"lab7_sec{section}_EN-009_P3.pdf"
    js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
          f"await p.goto({str(page.as_uri())!r});await p.pdf({{path:{str(pdf)!r},format:'A4',printBackground:true,"
          "displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:\"<div style='font-size:7pt;width:100%;text-align:center'>"
          "<span class=pageNumber></span> / <span class=totalPages></span></div>\",margin:{top:'14mm',bottom:'14mm',left:'13mm',right:'13mm'}});await b.close();})()")
    subprocess.run(["node", "-e", js], cwd=ROOT, check=True)
    print(f"wrote {pdf}")


if __name__ == "__main__":
    main()
