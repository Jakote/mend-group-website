#!/usr/bin/env node
// Builds /capability-statement.pdf and /assets/og.png from the HTML sources in
// .github/capability/. Run after changing any company fact, then commit both outputs.
//
//   node .github/scripts/build_capability.cjs
//
// Needs playwright (or playwright-core with CHROME_CHANNEL=chrome). The site itself
// stays dependency-free: this is a local tool, its outputs are committed files.
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('playwright-core')); }

const root = path.resolve(__dirname, '..', '..');
const src = f => 'file://' + path.join(root, '.github', 'capability', f);

(async () => {
  const opts = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {};
  const browser = await chromium.launch(opts);

  const page = await browser.newPage();
  await page.goto(src('statement.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => document.body.scrollHeight - document.body.clientHeight);
  if (overflow > 2) throw new Error(`statement runs past one page by ${overflow}px`);
  await page.pdf({ path: path.join(root, 'capability-statement.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  console.log('wrote capability-statement.pdf');

  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(src('og.html'), { waitUntil: 'networkidle' });
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: path.join(root, 'assets', 'og.png') });
  console.log('wrote assets/og.png');

  await browser.close();
})().catch(e => { console.error(e.message || e); process.exit(1); });
