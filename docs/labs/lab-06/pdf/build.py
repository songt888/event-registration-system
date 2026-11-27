"""Build the Lab 6 PDF (L6-08 #127).

Run from the repository root after `npm install` (Playwright prints the PDF):
  python3 docs/labs/lab-06/pdf/build.py <section>
writes docs/labs/lab-06/pdf/build/lab6_sec<section>_EN-009_P3.pdf

Order: front.md, part-a-b.md, part-c-d.md (B; a placeholder until it exists), then the appendices:
A1 uat-cases.md and A2 handoff.md as handed over (commit e22c20a), A3/A4 appendix-quotes.md, B1 uat-execution.md.
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

HANDOFF_COMMIT = "e22c20a"  # cases and handoff as reviewed in PR #128 and sent to Est

CSS = """
@page { size: A4; margin: 14mm 13mm; }
body { font: 9.5pt/1.4 -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111; }
h1 { font-size: 16pt; margin: 0 0 6pt; break-before: page; } h1:first-of-type { break-before: auto; }
h2 { font-size: 13pt; margin: 14pt 0 5pt; border-bottom: 1px solid #999; break-after: avoid; } h3 { font-size: 11pt; break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 8pt; font-size: 8.5pt; } th, td { border: 1px solid #bbb; padding: 2pt 4pt; vertical-align: top; text-align: left; }
th { background: #eee; } code { font: 8.5pt Menlo, monospace; background: #f3f3f3; padding: 0 2pt; overflow-wrap: anywhere; }
pre { font: 8pt/1.3 Menlo, monospace; background: #f6f6f6; border: 1px solid #ddd; padding: 5pt; white-space: pre-wrap; break-inside: avoid; }
blockquote { margin: 4pt 0 8pt; padding: 2pt 8pt; border-left: 3px solid #bbb; color: #222; }
a { color: #0645ad; text-decoration: none; overflow-wrap: anywhere; } img { max-width: 100%; max-height: 105mm; border: 1px solid #ccc; break-inside: avoid; }
"""


def demote(text, levels=2):
    """Appendix files keep their own headings, two levels down, so they nest under the appendix title."""
    return re.sub(r"^(#{1,4}) ", lambda m: "#" * min(len(m.group(1)) + levels, 6) + " ", text, flags=re.M)


def git_show(rev, path):
    return subprocess.run(["git", "show", f"{rev}:{path}"], cwd=ROOT, check=True, capture_output=True, text=True).stdout


def source():
    part_cd = HERE / "part-c-d.md"
    parts = [
        (HERE / "front.md").read_text(),
        (HERE / "part-a-b.md").read_text(),
        part_cd.read_text() if part_cd.exists() else "# Part C: Reports, triage and corrections\n\n_B: part-c-d.md not written yet._\n\n# Part D: Retest and final acceptance decisions\n\n_B: part-c-d.md not written yet._\n",
        "# Appendices\n\n## Appendix A1: our UAT cases, as handed over (`e22c20a`)\n\n"
        + demote(git_show(HANDOFF_COMMIT, "docs/labs/lab-06/uat-cases.md")),
        "## Appendix A2: our handoff, as handed over (`e22c20a`)\n\n" + demote(git_show(HANDOFF_COMMIT, "docs/labs/lab-06/handoff.md")),
        (HERE / "appendix-quotes.md").read_text(),
        "## Appendix B1: our execution record of Est's cases\n\n" + demote((LAB / "uat-execution.md").read_text()),
    ]
    text = "\n\n".join(re.sub(r"<!--.*?-->", "", p, flags=re.S) for p in parts)
    text = re.sub(r"(?<!!)\[([^\]]+)\]\((?!https?:)[^)]+\)", r"\1", text)  # repo-relative links mean nothing on paper
    return re.sub(r"^---$", "", text, flags=re.M)


def render(text):
    """Render review quotes without splitting fenced code blocks."""
    out = []
    for chunk in re.split(r"(^```.*?^```[ \t]*$)", text, flags=re.M | re.S):
        if chunk.startswith("```"):
            out.append(build_pdf.md(chunk))
            continue
        for part in re.split(r"((?:^>(?: .*)?\n?)+)", chunk, flags=re.M):
            if part.startswith(">"):
                out.append("<blockquote>" + build_pdf.md(re.sub(r"^> ?", "", part, flags=re.M)) + "</blockquote>")
            elif part:
                out.append(build_pdf.md(part))
    return "".join(out)


def main():
    section = sys.argv[1] if len(sys.argv) > 1 else "X"
    body = render(source().replace("&lt;section&gt;", section)).replace("&lt;br&gt;", "<br>")
    out = HERE / "build"
    out.mkdir(exist_ok=True)
    page = out / "lab6.html"
    # base = the lab folder, so evidence paths written relative to docs/labs/lab-06/ resolve
    page.write_text(f"<!doctype html><meta charset='utf-8'><base href='{LAB.as_uri()}/'><style>{CSS}</style>{body}")
    pdf = out / f"lab6_sec{section}_EN-009_P3.pdf"
    js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
          f"await p.goto({str(page.as_uri())!r});await p.pdf({{path:{str(pdf)!r},format:'A4',printBackground:true,"
          "displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:\"<div style='font-size:7pt;width:100%;text-align:center'>"
          "<span class=pageNumber></span> / <span class=totalPages></span></div>\",margin:{top:'14mm',bottom:'14mm',left:'13mm',right:'13mm'}});await b.close();})()")
    subprocess.run(["node", "-e", js], cwd=ROOT, check=True)
    print(f"wrote {pdf}")


if __name__ == "__main__":
    main()
