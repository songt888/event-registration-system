"""Build the Lab 5 PDF (#94) from lab5-report.md.

Run from the repository root after `npm install` (Playwright prints the PDF):
  python3 docs/labs/lab-05/pdf/build.py <section>
writes docs/labs/lab-05/pdf/build/lab5_sec<section>_EN-009_P3.pdf
"""
import html
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
sys.path.insert(0, str(ROOT / "docs" / "pdf"))
import build_pdf  # reuse the Deliverable 1 Markdown converter

d1_inline = build_pdf.inline


def inline(text):
    # Same as Deliverable 1, but links stay clickable: the Lab 5 PDF is an index of links.
    links = []
    text = re.sub(r"(?<!!)\[([^\]]+)\]\((https?://[^)]+)\)", lambda m: links.append(m.groups()) or f"\x00{len(links) - 1}\x00", text)
    out = d1_inline(text)
    return re.sub("\x00(\\d+)\x00", lambda m: f"<a href='{html.escape(links[int(m.group(1))][1])}'>{d1_inline(links[int(m.group(1))][0])}</a>", out)


build_pdf.inline = inline

CSS = """
@page { size: A4; margin: 14mm 13mm; }
body { font: 9.5pt/1.4 -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111; }
h1 { font-size: 16pt; margin: 0 0 6pt; } h2 { font-size: 13pt; margin: 14pt 0 5pt; border-bottom: 1px solid #999; break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 8pt; font-size: 8.5pt; } th, td { border: 1px solid #bbb; padding: 2pt 4pt; vertical-align: top; text-align: left; }
th { background: #eee; } code { font: 8.5pt Menlo, monospace; background: #f3f3f3; padding: 0 2pt; overflow-wrap: anywhere; }
pre { font: 8pt/1.3 Menlo, monospace; background: #f6f6f6; border: 1px solid #ddd; padding: 5pt; white-space: pre-wrap; break-inside: avoid; }
a { color: #0645ad; text-decoration: none; overflow-wrap: anywhere; } img { max-width: 100%; border: 1px solid #ccc; break-inside: avoid; }
p:has(> img) { margin: 4pt 0 0; } img { max-height: 105mm; } p:has(> img) + p { font-size: 8.5pt; color: #333; margin-top: 2pt; }
"""


def main():
    section = sys.argv[1] if len(sys.argv) > 1 else "X"
    body = build_pdf.md((HERE / "lab5-report.md").read_text().replace("<section>", section))
    out = HERE / "build"
    out.mkdir(exist_ok=True)
    page = out / "lab5.html"
    page.write_text(f"<!doctype html><meta charset='utf-8'><base href='{HERE.as_uri()}/'><style>{CSS}</style>{body}")
    pdf = out / f"lab5_sec{section}_EN-009_P3.pdf"
    js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
          f"await p.goto({str(page.as_uri())!r});await p.pdf({{path:{str(pdf)!r},format:'A4',printBackground:true,"
          "displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:\"<div style='font-size:7pt;width:100%;text-align:center'>"
          "<span class=pageNumber></span> / <span class=totalPages></span></div>\",margin:{top:'14mm',bottom:'14mm',left:'13mm',right:'13mm'}});await b.close();})()")
    subprocess.run(["node", "-e", js], cwd=ROOT, check=True)
    print(f"wrote {pdf}")


if __name__ == "__main__":
    main()
