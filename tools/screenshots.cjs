// Takes full-page screenshots of every page at 1440, 390 and 360 px.
// Serves the site itself from the /mathpath-prototype/ subfolder, the way
// GitHub Pages does, so broken relative paths show up here.
//
//   node tools/screenshots.cjs [siteDir] [outDir]
//
// Uses `puppeteer` when installed (CI), otherwise `puppeteer-core` with
// CHROME_PATH pointing at a local Chrome.

const http = require('http');
const fs = require('fs');
const path = require('path');

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
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' };

function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (!p.startsWith(BASE)) { res.writeHead(404); return res.end('outside base'); }
    let file = path.join(siteDir, p.slice(BASE.length) || 'index.html');
    if (!file.startsWith(siteDir)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(PORT, '127.0.0.1');
}

(async () => {
  let puppeteer, launch = { headless: true, args: ['--no-sandbox'] };
  try { puppeteer = require('puppeteer'); } catch {
    puppeteer = require('puppeteer-core');
    launch.executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  }
  const server = serve();
  const browser = await puppeteer.launch(launch);
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
