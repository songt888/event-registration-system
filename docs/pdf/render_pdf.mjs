// Print docs/pdf/build/report.html to PDF with page numbers, then rebuild until the contents page numbers are the real ones.
// Run from the repository root: node docs/pdf/render_pdf.mjs   (needs poppler's pdftotext for reading the page of each Part)
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const BUILD = path.join(HERE, 'build');
const FINAL = path.join(HERE, 'CPE334_D1_Theme3_67070503460_67070503413.pdf');
const MARKERS = {
  'part-a': 'Part A. SRS and product scope',
  'part-b': 'Part B. Feature inventory and traceability',
  'part-c': 'Part C. System-Level SDS',
  'part-d': 'Part D. Three-sprint plan',
  'part-e': 'Part E. Sprint 1 feature contracts',
  'part-f': 'Part F. Working Sprint 1 and evidence',
  f1: 'F1. Setup summary', f2: 'F2. Program demonstrations', f3: 'F3. Build and automated test results',
  f4: 'F4. Test excerpts and TDD evidence', f5: 'F5. Engineering workflow and history', f6: 'F6. Contributions',
  f7: 'F7. AI-use declaration', f8: 'F8. Known limitations',
};

function build() {
  execFileSync('python3', ['docs/pdf/build_pdf.py'], { cwd: ROOT, stdio: 'inherit' });
}

async function render(browser, out) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(BUILD, 'report.html')).href, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('body[data-ready]', { timeout: 30000 }).catch(() => console.warn('mermaid did not report ready'));
  await page.pdf({
    path: out, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: "<div style='width:100%;font-family:Times,serif;font-size:8pt;color:#5c5752;padding:0 12mm;display:flex;justify-content:space-between'>"
      + "<span>CPE 334 Deliverable 1, release v0.1.0-sprint1 (12dcd3c)</span><span><span class='pageNumber'></span> / <span class='totalPages'></span></span></div>",
    margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' },
  });
  await page.close();
}

function locate(pdf) {
  const pages = execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\f');
  const norm = (s) => s.replace(/\s+/g, ' ');
  const found = {};
  const start = pages.findIndex((p) => norm(p).includes('End of contents.')) + 1; // first page after the cover and contents
  for (const [key, text] of Object.entries(MARKERS)) {
    const from = key.startsWith('f') && found['part-f'] ? found['part-f'] - 1 : start;
    const i = pages.findIndex((p, n) => n >= from && norm(p).includes(text));
    found[key] = i >= 0 ? i + 1 : '?';
  }
  // Contents entries, in document order, searched from the start of Part A (the cover and contents pages name them too).
  const toc = JSON.parse(readFileSync(path.join(BUILD, 'toc.json'), 'utf8'));
  let at = start;
  found.toc = toc.map((t) => {
    const key = norm(t).slice(0, 45);
    const i = pages.findIndex((p, n) => n >= at && norm(p).includes(key));
    if (i < 0) return '?';
    at = i;
    return i + 1;
  });
  const order = ['a', 'b', 'c', 'd', 'e', 'f'];
  order.forEach((k, n) => {
    const next = order[n + 1];
    found[`end-${k}`] = next ? found[`part-${next}`] - 1 : pages.filter((p) => p.trim()).length;
  });
  return found;
}

const browser = await chromium.launch();
let previous = '';
for (let round = 1; round <= 4; round++) {
  build();
  const out = path.join(BUILD, `pass${round}.pdf`);
  await render(browser, out);
  const pages = locate(out);
  const json = JSON.stringify(pages);
  writeFileSync(path.join(BUILD, 'pages.json'), json);
  console.log(`round ${round}:`, json);
  if (json === previous) { copyFileSync(out, FINAL); console.log('final:', FINAL); break; }
  previous = json;
}
await browser.close();
