// Takes full-page screenshots of every page at 1440, 390 and 360 px.
// Serves the site itself from the /mathpath-prototype/ subfolder, the way
// GitHub Pages does, so broken relative paths show up here.
//
//   node tools/screenshots.cjs [siteDir] [outDir]
//
// Uses `puppeteer` when installed (CI), otherwise `puppeteer-core` with
// CHROME_PATH pointing at a local Chrome.

const fs = require('fs');
const path = require('path');
const { serve, launchBrowser } = require('./serve.cjs');

const siteDir = path.resolve(process.argv[2] || '.');
const outDir = path.resolve(process.argv[3] || 'shots');
const BASE = '/mathpath-prototype/';
const PORT = Number(process.env.PORT || 4349);
const PAGES = [
  'index.html', 'student/index.html', 'student/lesson-distribution.html', 'student/practice.html', 'student/results.html',
  'student/profile.html', 'teacher/index.html', 'teacher/live-class.html', 'teacher/analytics.html', 'teacher/lesson-plan.html',
  'teacher/homework.html', 'teacher/student-detail.html',
];
const WIDTHS = [[1440, 900], [390, 844], [360, 800]];
(async () => {
  const server = serve(siteDir, PORT, BASE);
  const browser = await launchBrowser();
  fs.mkdirSync(outDir, { recursive: true });
  let problems = 0;
  for (const pg of PAGES) {
    for (const [width, height] of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(`http://127.0.0.1:${PORT}${BASE}${pg}`, { waitUntil: 'networkidle0' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) errors.push(`horizontal overflow of ${overflow}px`);
      await page.screenshot({ path: path.join(outDir, `${pg.replace(/[/.]/g, '_')}-${width}.png`), fullPage: true });
      if (errors.length) { problems += errors.length; console.error(`${pg} @${width}: ${errors.join('; ')}`); }
      await page.close();
    }
  }
  await browser.close();
  server.close();
  console.log(`${PAGES.length * WIDTHS.length} screenshots in ${outDir}`);
  if (problems) process.exit(1);
})();
