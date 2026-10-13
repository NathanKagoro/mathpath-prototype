// Static file server that mimics GitHub Pages serving the repo from a subfolder.
//   node tools/serve.cjs [dir] [port] [/base/]
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json',
};

function serve(dir = '.', port = 4340, base = '/mathpath-prototype/') {
  const root = path.resolve(dir);
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (!p.startsWith(base)) { res.writeHead(404); return res.end('outside base'); }
    let file = path.join(root, p.slice(base.length) || 'index.html');
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      const nf = path.join(root, '404.html');
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'not found');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(Number(port), '127.0.0.1');
}

function launchBrowser() {
  const launch = { headless: true, args: ['--no-sandbox'] };
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch {
    puppeteer = require('puppeteer-core');
    launch.executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  }
  return puppeteer.launch(launch);
}

module.exports = { serve, launchBrowser };

if (require.main === module) {
  const [dir = '.', port = 4340, base = '/mathpath-prototype/'] = process.argv.slice(2);
  serve(dir, port, base);
  console.log(`http://127.0.0.1:${port}${base}`);
}
