import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { allFiles } from '../tools/make-pages.mjs';
import { markBook, classSummary, CLASSMATES } from '../assets/js/demo.mjs';
import { eq, solveEquation, lessonQuestions } from '../assets/js/engine.mjs';

const read = (f) => readFileSync(fileURLToPath(new URL(`../${f}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
const files = allFiles();
const pages = Object.entries(files).filter(([f]) => f.endsWith('.html'));

test('committed pages match the generator (run `npm run pages` if this fails)', () => {
  for (const [file, text] of Object.entries(files)) assert.equal(read(file), text, `${file} is out of date`);
});

test('no emoji, dollars or hyphen-minus maths in any page', () => {
  for (const [file, text] of pages) {
    assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, `${file} has an emoji`);
    assert.doesNotMatch(text, /dollar|\$\d/i, `${file} mentions dollars`);
    for (const m of text.matchAll(/<span class="maths">([^<]*)<\/span>/g)) assert.doesNotMatch(m[1], /-/, `${file}: "${m[1]}" uses a hyphen for minus`);
  }
});

test('every page has the polish items and a way back', () => {
  for (const [file, text] of pages) {
    if (file === 'student/progress.html') continue;
    for (const needle of ['<meta name="description"', 'rel="icon"', 'og:image', 'twitter:card', 'https://nathankagoro.com']) assert.ok(text.includes(needle), `${file} lacks ${needle}`);
    assert.equal((text.match(/<h1/g) || []).length, 1, `${file} has one h1`);
    if (file.includes('/')) {
      assert.ok(text.includes('href="../index.html"'), `${file} links back to the cover`);
      assert.match(text, /class="demo-note"[\s\S]*scripted/, `${file} labels the demo data`);
    }
  }
  assert.match(files['index.html'], /scripted demo data/);
});

test('every local link and asset in the pages exists', () => {
  const known = new Set([...Object.keys(files), 'assets/css/base.css', 'assets/css/cover.css', 'assets/css/student.css', 'assets/css/teacher.css',
    'assets/js/student.mjs', 'assets/js/teacher.mjs', 'assets/fonts/kalam-700.woff2', 'assets/fonts/andika-400.woff2']);
  for (const [file, text] of pages) {
    if (file === '404.html') continue;
    const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
    for (const m of text.matchAll(/(?:href|src)="([^"#:]+)(?:#[^"]*)?"/g)) {
      const target = new URL(m[1], `http://x/${dir}`).pathname.slice(1);
      assert.ok(known.has(target), `${file} links to missing ${m[1]}`);
      read(target);
    }
  }
});

test('scripted class: wrong answers are the values the slips produce, and totals add up', () => {
  const book = markBook();
  const questions = lessonQuestions(3);
  assert.equal(book.length, CLASSMATES.length);
  for (const student of book) {
    student.answers.forEach((a, i) => {
      if (a.ok) return;
      assert.equal(a.category, student.marks[i], `${student.name} Q${i + 1} has the scripted slip`);
      assert.ok(eq(solveEquation(a.slip.lines.at(-1)), a.slip.answer));
      assert.ok(!eq(a.slip.answer, questions[i].answer));
    });
    assert.equal(student.right, student.marks.filter((m) => m === 'ok').length);
  }
  const s = classSummary(book);
  assert.equal(s.answers, 30);
  assert.equal(s.right + s.struggles.reduce((n, x) => n + x.count, 0), 30);
  assert.equal(s.perQuestion.reduce((a, b) => a + b, 0), s.right);
  assert.equal(s.understanding, Math.round((s.right / 30) * 100));
});
