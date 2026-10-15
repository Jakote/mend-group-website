#!/usr/bin/env node
// Visual and accessibility check for mendgroup.co.za.
//
// Usage: node visual_check.cjs [BASE_URL] [OUT_DIR]
//   BASE_URL defaults to http://localhost:8000, OUT_DIR to ./visual-out
//
// For every page, at desktop and phone width:
//   - saves a full-page screenshot to OUT_DIR (CI uploads these for review)
//   - FAILS if the page scrolls sideways (content wider than the viewport)
//   - FAILS on images without alt, or links/buttons with no accessible name
//   - WARNS on more or fewer than one <h1>, and on non-inline tap targets under 24px
// Needs the `playwright` package and a Chromium (CI installs both).

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = (process.argv[2] || 'http://localhost:8000').replace(/\/$/, '');
const OUT = process.argv[3] || 'visual-out';

const PAGES = [
  '/', '/document-chase/',
  '/previews/khali-hotel/', '/previews/mohahlaula-boutique/', '/previews/lesotho-fap/',
];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

const failures = [];
const warnings = [];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    for (const p of PAGES) {
      const label = `${vp.name} ${p}`;
      const res = await page.goto(BASE + p, { waitUntil: 'networkidle' });
      if (!res || res.status() !== 200) { failures.push(`${label}: HTTP ${res && res.status()}`); continue; }
      // Scroll-reveal content starts hidden; show it so the screenshot is the real page.
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('visible')));
      await page.waitForTimeout(900);

      const r = await page.evaluate(() => {
        const name = el => (el.getAttribute('aria-label') || el.getAttribute('title') ||
          el.textContent || (el.querySelector('img[alt]') || {}).alt || '').trim();
        const visible = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
        // Links inside running text are exempt from target size (WCAG 2.5.8), so skip inline ones.
        const small = [...document.querySelectorAll('a, button')].filter(visible)
          .filter(el => getComputedStyle(el).display !== 'inline').filter(el => {
          const b = el.getBoundingClientRect(); return b.width < 24 || b.height < 24;
        });
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          noAlt: [...document.querySelectorAll('img:not([alt])')].map(i => i.src.split('/').pop()),
          unnamed: [...document.querySelectorAll('a, button')].filter(visible)
            .filter(el => !name(el)).map(el => el.outerHTML.slice(0, 90)),
          h1: document.querySelectorAll('h1').length,
          small: small.map(el => (name(el) || el.outerHTML).slice(0, 40)),
        };
      });

      if (r.overflow > 1) failures.push(`${label}: scrolls sideways by ${r.overflow}px`);
      if (r.noAlt.length) failures.push(`${label}: images without alt: ${r.noAlt.join(', ')}`);
      if (r.unnamed.length) failures.push(`${label}: links/buttons with no name: ${r.unnamed.join(' | ')}`);
      if (r.h1 !== 1) warnings.push(`${label}: ${r.h1} <h1> elements`);
      if (r.small.length) warnings.push(`${label}: ${r.small.length} tap target(s) under 24px: ${r.small.slice(0, 5).join(' | ')}`);

      const file = `${vp.name}${p.replace(/\//g, '_').replace(/_$/, '') || '_home'}.png`;
      await page.screenshot({ path: path.join(OUT, file), fullPage: true });
      console.log(`shot  ${label} -> ${file}`);
    }
    await page.close();
  }
  await browser.close();

  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const f of failures) console.log(`FAIL  ${f}`);
  console.log(failures.length ? `\n${failures.length} visual check(s) failed` : '\nall visual checks passed');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
