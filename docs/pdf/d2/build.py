"""Build the Deliverable 2 PDF (S3-04 #209).

Run from the repository root after `npm install` (Playwright prints the PDF; `pdftotext` from poppler reads it back):
  python3 docs/pdf/d2/build.py <section>
writes docs/pdf/d2/build/CPE334_D2_Theme3_67070503460_67070503413.pdf

Order: front.md, part-a.md (B), part-b.md (A), part-c.md (B), part-d.md (A), part-e.md (B). A part that does not
exist yet becomes a one-line placeholder. Two passes: the first build finds the page where each "Part X:" heading
starts, the second fills the Pages column of the contents table. Before printing, the build lists every em dash and
every unfilled placeholder ([S2-06], [S3-02], [S3-03], [at submission]) so they are cleared before submission.
"""
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "docs" / "pdf"))
import build_pdf  # the Deliverable 1 Markdown converter

PARTS = [("A", "part-a.md", "Sprint 1 continuity and change status"),
         ("B", "part-b.md", "Sprint 2 contracts, completion, TDD and demonstrations"),
         ("C", "part-c.md", "Sprint 3 contracts and working progress"),
         ("D", "part-d.md", "Current baseline documents and traceability"),
         ("E", "part-e.md", "Integrated release candidate")]
NAME = "CPE334_D2_Theme3_67070503460_67070503413.pdf"
PLACEHOLDER = re.compile(r"\[(S2-06|S3-02|S3-03|at submission)\]")

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


def source(pages):
    texts = [(HERE / "front.md").read_text()]
    for letter, file, title in PARTS:
        path = HERE / file
        texts.append(path.read_text() if path.exists() else f"# Part {letter}: {title}\n\n_{file} not written yet._\n")
    text = "\n\n".join(re.sub(r"<!--.*?-->", "", t, flags=re.S) for t in texts)
    text = re.sub(r"\{\{pages:([A-E])\}\}", lambda m: pages.get(m.group(1), "?"), text)
    text = re.sub(r"(?<!!)\[([^\]]+)\]\((?!https?:)[^)]+\)", r"\1", text)  # repo-relative links mean nothing on paper
    return re.sub(r"^---$", "", text, flags=re.M)


def render(text):
    """Blockquotes and **bold** around `code` as in the Lab 6 and Lab 7 builders; fenced blocks stay untouched."""
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
    html = "".join(out)
    return "".join(s if s.startswith("<pre") else re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
                   for s in re.split(r"(<pre.*?</pre>)", html, flags=re.S))


def print_pdf(html, pdf):
    out = HERE / "build"
    out.mkdir(exist_ok=True)
    page = out / "d2.html"
    page.write_text(f"<!doctype html><meta charset='utf-8'><base href='{HERE.as_uri()}/'><style>{CSS}</style>{html}")
    js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
          f"await p.goto({str(page.as_uri())!r});await p.pdf({{path:{str(pdf)!r},format:'A4',printBackground:true,"
          "displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:\"<div style='font-size:7pt;width:100%;text-align:center'>"
          "<span class=pageNumber></span> / <span class=totalPages></span></div>\",margin:{top:'14mm',bottom:'14mm',left:'13mm',right:'13mm'}});await b.close();})()")
    subprocess.run(["node", "-e", js], cwd=ROOT, check=True)


def part_pages(pdf):
    """First and last page of each part, from the "Part X:" headings that start a page (h1 breaks the page)."""
    pages = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], check=True, capture_output=True, text=True).stdout.split("\f")
    starts = {}
    for n, text in enumerate(pages, 1):
        m = re.match(r"\s*Part ([A-E]):", text)
        if m and m.group(1) not in starts:
            starts[m.group(1)] = n
    total = len([p for p in pages if p.strip()])
    order = sorted(starts.items(), key=lambda kv: kv[1])
    ends = {k: (order[i + 1][1] - 1) if i + 1 < len(order) else total for i, (k, _) in enumerate(order)}
    return {k: str(v) if ends[k] == v else f"{v}–{ends[k]}" for k, v in starts.items()}


def main():
    section = sys.argv[1] if len(sys.argv) > 1 else "X"
    pdf = HERE / "build" / NAME
    first = source({})
    print_pdf(render(first.replace("&lt;section&gt;", section)), pdf)
    pages = part_pages(pdf)
    final = source(pages)
    print_pdf(render(final.replace("&lt;section&gt;", section)), pdf)
    assert part_pages(pdf) == pages, "page ranges moved between passes; run the build again"
    for letter, _, _ in PARTS:
        print(f"Part {letter}: pages {pages.get(letter, '?')}")
    for n, line in enumerate(final.splitlines(), 1):
        if "—" in line:
            print(f"em dash, clear before submit: {line.strip()[:110]}")
    left = sorted(set(PLACEHOLDER.findall(final)))
    print(f"unfilled placeholders: {', '.join(left) if left else 'none'}")
    print(f"wrote {pdf}")


if __name__ == "__main__":
    main()
