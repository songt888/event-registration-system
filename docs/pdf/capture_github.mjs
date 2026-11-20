// Logged-out screenshots of the two sampled PRs for Part F5 (public repository), cropped to readable slices:
// the PR header (title, merged state, branches), each review, and the merge into sprint-1-staging.
// GitHub's page has no stable ids, so each slice is found by its text and the box around it.
// Run from the repository root: node docs/pdf/capture_github.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'figures');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });

// Smallest element whose own text matches, then grow to the enclosing box that is at least minH tall.
const boxes = (pattern, minH) => page.evaluate(([src, minH]) => {
  const re = new RegExp(src);
  const hits = [...document.querySelectorAll('h2, h3, span, div, p, a')]
    .filter((e) => re.test(e.textContent) && ![...e.children].some((c) => re.test(c.textContent)));
  const seen = new Set();
  return hits.map((e) => {
    let n = e;
    while (n.parentElement && n.getBoundingClientRect().height < minH) n = n.parentElement;
    const r = n.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
  }).filter((r) => { const k = `${Math.round(r.y)}`; if (seen.has(k)) return false; seen.add(k); return r.width < 1000 && r.x < 500; }); // the sidebar (Reviewers) also says approved
}, [pattern, minH]);

for (const n of [63, 65]) {
  await page.goto(`https://github.com/songt888/event-registration-system/pull/${n}`, { waitUntil: 'load', timeout: 90000 }); await page.getByText(/merged commit/).first().waitFor({ timeout: 60000 }); await page.waitForTimeout(1500);
  const head = await page.evaluate(() => {
    const h1 = document.querySelector('h1'); const tab = [...document.querySelectorAll('a, span')].find((e) => e.textContent.trim() === 'Files changed');
    const a = h1.getBoundingClientRect(); const b = tab.getBoundingClientRect();
    return { x: 10, y: a.y + scrollY - 8, width: 1080, height: b.bottom - a.top + 16 };
  });
  await page.screenshot({ path: path.join(OUT, `pr${n}-header.png`), clip: head, fullPage: true });
  const reviews = await boxes('(requested changes|approved these changes)\\s', 120);
  for (const [i, r] of reviews.entries()) {
    await page.screenshot({ path: path.join(OUT, `pr${n}-review${i + 1}.png`), clip: { x: r.x - 60, y: r.y - 6, width: Math.min(r.width + 70, 1060), height: r.height + 12 }, fullPage: true });
  }
  const merged = (await boxes('merged commit', 20)).pop();
  if (merged) await page.screenshot({ path: path.join(OUT, `pr${n}-merged.png`), clip: { x: 20, y: merged.y - 8, width: 760, height: merged.height + 16 }, fullPage: true });
  console.log(`PR #${n}: header, ${reviews.length} review(s), merge ${merged ? 'yes' : 'no'}`);
}
await browser.close();
