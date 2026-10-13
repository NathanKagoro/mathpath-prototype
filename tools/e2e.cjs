// Browser check of the things the original prototype got wrong: Enter submits,
// loose answer formats are accepted, progress reaches 100%, practice really
// moves up the ladder, controls keep their labels, progress survives a reload.
//
//   node tools/e2e.cjs [siteDir] [outDir]

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { serve, launchBrowser } = require('./serve.cjs');

const siteDir = path.resolve(process.argv[2] || '.');
const outDir = path.resolve(process.argv[3] || 'shots');
const PORT = Number(process.env.PORT || 4348);
const URL = `http://127.0.0.1:${PORT}/mathpath-prototype/`;

(async () => {
  const engine = await import('../assets/js/engine.mjs');
  const server = serve(siteDir, PORT);
  const browser = await launchBrowser();
  fs.mkdirSync(outDir, { recursive: true });
  const errors = [];
  let steps = 0;
  const step = (name) => { steps += 1; console.log(`ok ${steps} - ${name}`); };

  async function open(file, width = 390) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: width < 600 ? 844 : 900, isMobile: width < 600, hasTouch: width < 600 });
    page.on('pageerror', (e) => errors.push(`${file}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${file}: ${m.text()}`); });
    await page.goto(URL + file, { waitUntil: 'networkidle0' });
    return page;
  }
  const text = (page, sel) => page.$eval(sel, (el) => el.textContent.trim());
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `flow-${name}.png`), fullPage: true });
  async function answer(page, value) {
    await page.$eval('#answer', (el) => { el.value = ''; el.focus(); });
    await page.type('#answer', value);
    await page.keyboard.press('Enter'); // the audit found Enter did nothing
  }

  // ---- lesson 3
  let page = await open('student/lesson-distribution.html');
  assert.equal(await text(page, '#q-text'), '3(x + 2) = 18');
  assert.equal(await text(page, '#lp-text'), '0 of 5 done, 0%');

  for (const id of ['t-word', 't-hint', 't-marked']) {
    await page.click(`#${id}`);
    const box = await page.$eval(`#${id}`, (el) => ({ w: el.offsetWidth, h: el.offsetHeight, t: el.textContent.trim(), open: el.getAttribute('aria-expanded') }));
    assert.ok(box.t.length > 5 && box.w > 100 && box.h >= 44, `${id} keeps a label after one click: ${JSON.stringify(box)}`);
    assert.equal(box.open, 'true');
  }
  step('tool buttons keep their labels and size after a click');
  const marked = await text(page, '#p-marked');
  assert.match(marked, /3x \+ 2 = 18/); assert.match(marked, /x = 16\/3/); assert.match(marked, /should be\s*3x \+ 6 = 18/);
  assert.ok(!/x = 4\b/.test(marked), 'the wrong working must not land on the right answer');
  assert.match(await text(page, '#p-word'), /3 baskets each hold x mangoes plus 2 extra/);
  step('marked working for 3(x + 2) = 18 ends at 16/3');
  await shot(page, 'lesson-tools-390');

  await answer(page, 'seven');
  assert.match(await text(page, '#feedback'), /Write x as a number/);
  await answer(page, '16/3');
  assert.match(await text(page, '#feedback'), /Not yet[\s\S]*Forgot to multiply out the whole bracket/);
  step('a wrong answer is diagnosed from the value typed');
  await answer(page, '5');
  assert.match(await text(page, '#feedback'), /left side comes to\s*21[\s\S]*right side to\s*18/);
  await shot(page, 'lesson-wrong-390');
  await answer(page, 'x=4');
  assert.match(await text(page, '#feedback'), /Correct/);
  assert.equal(await text(page, '#lp-text'), '1 of 5 done, 20%');
  step('Enter submits and "x=4" is accepted');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'next');
  await page.keyboard.press('Enter');

  const rest = [['2(x − 4) = 10', '9.0', 40], ['4(x + 1) = 28', '06', 60], ['5(x − 3) = 20', ' 7 ', 80], ['6(x + 2) = 30', '3', 100]];
  for (const [q, a, pct] of rest) {
    assert.equal(await text(page, '#q-text'), q);
    await answer(page, a);
    assert.match(await text(page, '#feedback'), /Correct/, `${q} with "${a}"`);
    assert.match(await text(page, '#lp-text'), new RegExp(`${pct}%`));
    if (pct === 100) await shot(page, 'lesson-last-390');
    await page.keyboard.press('Enter');
  }
  assert.equal(await text(page, '#lp-text'), '5 of 5 done, 100%');
  assert.equal(await page.$eval('#lesson-done', (el) => el.hidden), false);
  step('"4.0"-style answers accepted; progress goes 20, 40, 60, 80, 100%');
  await shot(page, 'lesson-done-390');

  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await text(page, '#lp-text'), '5 of 5 done, 100%');
  step('progress survives a reload');

  // ---- practice ladder, seeded
  await page.goto(`${URL}student/practice.html?seed=20261013`, { waitUntil: 'networkidle0' });
  let ladder = engine.createLadder(20261013);
  const seen = [];
  for (let i = 0; i < 10; i++) {
    const q = engine.currentQuestion(ladder);
    assert.equal(await text(page, '#q-text'), q.text, 'page and engine agree for the same seed');
    assert.notEqual(q.text, seen[seen.length - 1], 'no question twice in a row');
    seen.push(q.text);
    assert.match(await text(page, '#ladder-status'), new RegExp(`Level ${ladder.level} of 4`));
    await answer(page, engine.formatNumber(q.answer));
    assert.match(await text(page, '#feedback'), /Correct/);
    ladder = engine.advance(ladder, true).state;
    if (i === 2) { assert.match(await text(page, '#feedback'), /Up to level 2/); await shot(page, 'practice-up-390'); }
    await page.keyboard.press('Enter');
  }
  assert.equal(ladder.level, 4);
  assert.match(await text(page, '#ladder-status'), /Level 4 of 4/);
  assert.equal(new Set(seen).size, seen.length);
  step('practice climbs to level 4 with ten different questions');
  for (let i = 0; i < 2; i++) {
    await answer(page, '999');
    await page.click('#reveal');
    await page.click('#next');
  }
  assert.match(await text(page, '#ladder-status'), /Level 3 of 4/);
  step('two misses in a row step down a level');
  await shot(page, 'practice-390');

  // ---- pages that reflect it
  await page.goto(`${URL}student/index.html`, { waitUntil: 'networkidle0' });
  assert.match(await text(page, '.stop[data-lesson="3"] .stop-state'), /Done/);
  assert.match(await text(page, '#leaderboard .you'), /You\s*\d/);
  assert.ok(!/0 XP/.test(await text(page, '#leaderboard .you')));
  await shot(page, 'home-390');
  await page.goto(`${URL}student/results.html`, { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('#results-body', (el) => el.hidden), false);
  assert.equal(await text(page, '#res-answered'), '17');
  assert.match(await text(page, '#res-slips'), /Forgot to multiply out the whole bracket\s*1/);
  await shot(page, 'results-390');
  await page.goto(`${URL}student/profile.html`, { waitUntil: 'networkidle0' });
  const earned = await page.$$eval('.sticker-sheet .earned', (els) => els.map((el) => el.dataset.sticker));
  assert.deepEqual(earned.sort(), ['first', 'lesson3', 'run5', 'top']);
  await shot(page, 'stickers-390');
  step('home, results and stickers show what was actually done');

  await page.goto(`${URL}teacher/student-detail.html`, { waitUntil: 'networkidle0' });
  assert.equal(await text(page, '#you-row .total'), '5');
  await page.click('#you-row .row-btn');
  assert.match(await text(page, '#you-detail'), /5 of 5/);
  await shot(page, 'markbook-you-390');
  step("the teacher's mark book shows the visitor's real row");

  // ---- reset, with the dialog and Escape
  await page.goto(`${URL}student/profile.html`, { waitUntil: 'networkidle0' });
  await page.click('#reset-open');
  assert.equal(await page.$eval('#reset-dialog', (d) => d.open), true);
  await shot(page, 'reset-dialog-390');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#reset-dialog', (d) => d.open), false);
  assert.equal(await page.$$eval('.sticker-sheet .earned', (els) => els.length), 4, 'Escape keeps progress');
  await page.click('#reset-open');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('#reset-dialog button[value="confirm"]')]);
  assert.equal(await page.$$eval('.sticker-sheet .earned', (els) => els.length), 0);
  step('Escape closes the reset dialog; confirming clears progress');
  await page.close();

  // ---- teacher interactions, desktop
  page = await open('teacher/live-class.html', 1440);
  await page.click('#live-start');
  await page.waitForFunction(() => !document.getElementById('live-lesson').disabled, { timeout: 10000 });
  await page.click('#live-lesson');
  assert.match(await text(page, '#live-alert'), /^Example 1 of 4/);
  await page.click('#live-next');
  assert.match(await text(page, '#live-alert'), /^Example 2 of 4/);
  await shot(page, 'live-1440');
  await page.goto(`${URL}teacher/homework.html`, { waitUntil: 'networkidle0' });
  await page.click('#hw-form button[type="submit"]');
  assert.match(await text(page, '#hw-feedback'), /Nothing was actually sent/);
  await page.goto(`${URL}teacher/index.html`, { waitUntil: 'networkidle0' });
  await page.click('#plan-toggle');
  assert.equal(await text(page, '#plan-status'), 'open to students');
  step('teacher controls work and say they are scripted');

  // ---- storage blocked: the app must still run
  const blocked = await browser.newPage();
  await blocked.evaluateOnNewDocument(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  blocked.on('pageerror', (e) => errors.push(`blocked storage: ${e.message}`));
  await blocked.goto(`${URL}student/lesson-introduction.html`, { waitUntil: 'networkidle0' });
  await answer(blocked, '7');
  assert.match(await text(blocked, '#feedback'), /Correct/);
  step('lessons still work when localStorage throws');

  await browser.close();
  server.close();
  assert.deepEqual(errors, [], 'no console or page errors');
  console.log(`# ${steps} browser checks passed`);
})().catch((e) => { console.error(e); process.exit(1); });
