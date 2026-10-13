// Writes the static HTML pages, the icon sprite and the favicon.
// The output is committed, so the site is served as plain files with no build
// step. Run `npm run pages` after changing this file; `npm test` fails if the
// committed pages are out of date.
//
// Worked examples, expected answers and the class figures are computed here
// from the same engine the browser uses, never typed in by hand.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS, LEVELS, makeQuestion, lessonQuestions, formatAnswer, UP_AFTER, DOWN_AFTER } from '../assets/js/engine.mjs';
import { STICKERS } from '../assets/js/store.mjs';
import { CLASS, CLASSMATES, PROGRESS, markBook, classSummary } from '../assets/js/demo.mjs';
import { sprite, track, rough, FAVICON } from './draw.mjs';
import { createRng } from '../assets/js/engine.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://nathankagoro.github.io/mathpath-prototype/';
const HOME = 'https://nathankagoro.com';

const icon = (root, id, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true"><use href="${root}assets/icons.svg#${id}"/></svg>`;
const sticker = (root, id, cls = '') => `<svg class="sticker${cls ? ` ${cls}` : ''}" viewBox="0 0 64 64" aria-hidden="true"><use href="${root}assets/icons.svg#${id}"/></svg>`;
const m = (text) => `<span class="maths">${text}</span>`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function head(root, { title, desc, theme, css, path }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="${theme}">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}assets/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}assets/og.jpg">
<link rel="preload" href="${root}assets/fonts/kalam-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${root}assets/fonts/andika-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}assets/css/base.css">
<link rel="stylesheet" href="${root}assets/css/${css}.css">
</head>`;
}

// ---------------------------------------------------------------- cover

function coverPage() {
  const rng = createRng(7);
  const tables = [2, 3, 4, 5].map((n) => `<span>${[1, 2, 3, 4, 5, 6].map((k) => `${k} × ${n} = ${k * n}`).join('<br>')}</span>`).join('');
  const chalkGrid = `<svg class="planner-grid" viewBox="0 0 200 110" aria-hidden="true" fill="none" stroke="#f5f2e6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
<path d="${[20, 50, 80].map((y) => rough([[8, y], [100, y + 1], [192, y]], rng, { s: 1, amp: 1 })).join('')}${[50, 86, 122, 158].map((x) => rough([[x, 6], [x + 1, 55], [x, 104]], rng, { s: 1, amp: 1 })).join('')}" opacity=".55"/>
<path d="${[[62, 30], [98, 30], [170, 30], [62, 60], [134, 60], [98, 90], [134, 90], [170, 90]].map(([x, y]) => rough([[x - 7, y + 1], [x - 2, y + 7], [x + 9, y - 8]], rng, { amp: 1 })).join('')}"/>
<path stroke="#ffbcc7" d="${[[134, 30], [98, 60], [170, 60], [62, 90]].map(([x, y]) => rough([[x - 6, y - 6], [x + 6, y + 6]], rng, { amp: 1 }) + rough([[x + 6, y - 6], [x - 6, y + 6]], rng, { amp: 1 })).join('')}"/>
<path stroke="#ffe27a" d="${[30, 60, 90].map((y) => rough([[12, y], [24, y - 2], [40, y]], rng, { s: 1, amp: 1.5 })).join('')}"/></svg>`;
  return `${head('', { title: 'MathPath: algebra practice that adapts', desc: 'A prototype for practising algebra. The questions get harder as you get them right, and a class board shows the teacher which slip is holding people up.', theme: '#b58a5a', css: 'cover', path: '' })}
<body class="cover">
<a class="skip" href="#main">Skip to the books</a>
<main id="main" class="desk">
  <header class="slip">
    <h1>MathPath</h1>
    <p>Algebra practice that gets harder as you get it right, and a class board that shows the teacher which slip is holding people up. It is a prototype. Pick up a book to try it.</p>
  </header>

  <div class="covers">
    <a class="exbook" href="student/index.html">
      <span class="exbook-print"><b>Exercise book</b> <span>Squared 5&nbsp;mm</span></span>
      <span class="exbook-label">
        <span class="row"><b>Name</b> <i>You</i></span>
        <span class="row"><b>Subject</b> <i>Algebra, solving for x</i></span>
        <span class="row"><b>Class</b> <i>Form 2</i></span>
      </span>
      <span class="exbook-tables" aria-hidden="true">${tables}</span>
      ${sticker('', 'st-star', 'exbook-sticker')}
      <span class="flag">Open the student book</span>
    </a>

    <a class="planner" href="teacher/index.html">
      <span class="planner-title">Teacher's planner</span>
      <span class="planner-sub">Form 2 Mathematics. Who is stuck, and on what.</span>
      ${chalkGrid}
      <span class="flag">Open the teacher's board</span>
    </a>
  </div>

  <aside class="sticky-note">
    <h2>Before you start</h2>
    <p>The class, the classmates and their scores are scripted demo data. Your own answers are marked for real, and your progress is saved only in this browser.</p>
  </aside>

  <svg class="desk-pencil" viewBox="0 0 420 40" aria-hidden="true"><path d="M8 20l34-12v24z" fill="#e8c9a0"/><path d="M8 20l12-4.2v8.4z" fill="#2b2d33"/><path d="M42 8h318v24H42z" fill="#f2b705"/><path d="M42 16h318M42 24h318" stroke="#c98f00" stroke-width="1.5"/><path d="M360 8h22v24h-22z" fill="#b9bcc4"/><path d="M366 8v24M374 8v24" stroke="#8a8e98" stroke-width="2"/><path d="M382 8h22a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8h-22z" fill="#e58c9a"/></svg>

  <footer class="desk-foot">
    <a href="${HOME}">← nathankagoro.com</a>
  </footer>
</main>
</body>
</html>
`;
}

function notFoundPage() {
  return `${head('/mathpath-prototype/', { title: 'Page not found: MathPath', desc: 'That page is not in the book.', theme: '#b58a5a', css: 'cover', path: '404.html' })}
<body class="cover">
<main id="main" class="desk">
  <header class="slip">
    <h1>That page has been rubbed out</h1>
    <p>There is nothing at this address. The front cover has both books.</p>
    <p><a class="flag flag-inline" href="/mathpath-prototype/">Back to the front cover</a></p>
  </header>
  <footer class="desk-foot"><a href="${HOME}">← nathankagoro.com</a></footer>
</main>
</body>
</html>
`;
}

// ---------------------------------------------------------------- student

const STUDENT_TABS = [
  ['index.html', 'i-home', 'Home'], ['practice.html', 'i-pencil', 'Practice'], ['results.html', 'i-marks', 'Results'],
  ['profile.html', 'i-sticker', 'Stickers'], ['../index.html', 'i-book', 'Cover'],
];

function studentPage({ file, title, desc, page, current, body, attrs = '' }) {
  const tabs = STUDENT_TABS.map(([href, ic, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${icon('../', ic)}<span>${label}</span></a>`).join('\n      ');
  return `${head('../', { title: `${title}: MathPath`, desc, theme: '#fdfcf7', css: 'student', path: `student/${file}` })}
<body class="student" data-page="${page}"${attrs}>
<a class="skip" href="#main">Skip to the page</a>
<div class="book">
  <header class="book-head">
    <p class="brand"><a href="index.html">MathPath</a> <span>algebra exercise book</span></p>
    <nav class="tabs" aria-label="Student book">
      ${tabs}
    </nav>
  </header>
  <p class="demo-note">${icon('../', 'i-info')}<span><strong>Demo.</strong> Classmates and class scores are scripted. Your answers are marked for real and kept in this browser only.</span></p>
  <main id="main">
${body}
  </main>
  <footer class="book-foot">
    <a href="${HOME}">← nathankagoro.com</a>
    <a href="../teacher/index.html">Teacher's board</a>
  </footer>
</div>
<script type="module" src="../assets/js/student.mjs"></script>
</body>
</html>
`;
}

const quizBlock = (firstText, heading) => `    <section class="quiz" aria-labelledby="quiz-h">
      <div class="quiz-head">
        <h2 id="quiz-h">${heading}</h2>
        <p class="q-count" id="q-count"></p>
      </div>
      <p class="question maths" id="q-text">${firstText}</p>
      <form id="answer-form" class="answer" action="#" novalidate>
        <label for="answer" class="maths">x =</label>
        <input id="answer" name="x" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-describedby="answer-help">
        <button type="button" class="key" data-key="sign" aria-label="Switch between negative and positive">±</button>
        <button type="button" class="key" data-key="/" aria-label="Fraction bar">/</button>
        <button type="submit" class="btn primary" id="check">Check answer</button>
        <p id="answer-help" class="small">A whole number, a fraction such as 16/3, or a decimal to 2 places. Press Enter to check.</p>
      </form>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
      <div class="next-row">
        <button type="button" class="btn primary" id="next" hidden>Next question</button>
        <button type="button" class="btn" id="reveal" hidden>Show the answer and move on</button>
      </div>
      <div class="tools">
        <button type="button" class="btn tool" id="t-word" aria-expanded="false" aria-controls="p-word">${icon('../', 'i-speech')}<span>Show it as a word problem</span></button>
        <button type="button" class="btn tool" id="t-hint" aria-expanded="false" aria-controls="p-hint">${icon('../', 'i-bulb')}<span>Show a hint</span></button>
        <button type="button" class="btn tool" id="t-marked" aria-expanded="false" aria-controls="p-marked">${icon('../', 'i-pen')}<span>See an example of marked working</span></button>
      </div>
      <div id="p-word" class="note speech" hidden></div>
      <div id="p-hint" class="note sticky" hidden></div>
      <div id="p-marked" class="scrap" hidden></div>
      <noscript><p class="note sticky">Marking needs JavaScript. The worked example above still reads without it.</p></noscript>
    </section>`;

function pathSvgs() {
  const wide = track([[0, 78], [125, 0], [375, 100], [625, 0], [875, 100], [1000, 30]], false);
  const tall = track([[40, 0], [0, 125], [100, 375], [0, 625], [100, 875], [50, 1000]], true);
  const layers = (d) => `<path class="track-edge" d="${d}"/><path class="track-fill" d="${d}"/><path class="track-squares" d="${d}"/>`;
  return `<svg class="path-line wide" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">${layers(wide)}</svg>
        <svg class="path-line tall" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">${layers(tall)}</svg>`;
}

function studentHome() {
  const stops = LESSONS.map((l) => `          <li class="stop" data-lesson="${l.id}">
            <a href="lesson-${l.slug}.html">
              <span class="stop-disc"><span class="stop-num">${l.id}</span></span>
              <span class="stop-label"><strong>${l.title}</strong><span>${l.blurb}</span><em class="stop-state">Not started</em></span>
            </a>
          </li>`).join('\n');
  const board = [...CLASSMATES.map((c) => ({ name: c.name, xp: c.xp })), { name: 'You', xp: 0, you: true }]
    .map((r) => `<li${r.you ? ' class="you"' : ''}><span>${r.name}</span><span class="xp">${r.xp} XP</span></li>`).join('');
  return studentPage({
    file: 'index.html', page: 'home', current: 'index.html', title: 'Your algebra path',
    desc: 'Three short algebra lessons on a board-game path, then practice that adapts to how you are doing.',
    body: `    <div class="page-title">
      <h1>Your algebra path</h1>
      <p>Three lessons of five questions, then as much practice as you like. Start anywhere.</p>
    </div>

    <section class="path-section" aria-labelledby="path-h">
      <h2 id="path-h" class="sr-only">Lessons</h2>
      <div class="path-wrap">
        ${pathSvgs()}
        <ol class="path">
${stops}
          <li class="stop locked">
            <span class="stop-inner">
              <span class="stop-disc">${icon('../', 'i-lock')}</span>
              <span class="stop-label"><strong>Word problems</strong><span>Planned as lesson 4. Not built in this prototype.</span></span>
            </span>
          </li>
        </ol>
      </div>
    </section>

    <div class="home-row">
      <section class="worksheet homework" aria-labelledby="hw-h">
        <h2 id="hw-h">Homework</h2>
        <p>Set for Form 2: <strong>Lesson 3, Distribution</strong>. Five equations with brackets.</p>
        <p class="pen" id="hw-state">Not started yet.</p>
        <a class="btn primary" href="lesson-distribution.html">Do the homework</a>
      </section>

      <section class="worksheet" aria-labelledby="pr-h">
        <h2 id="pr-h">Extra practice</h2>
        <p>Fresh questions every time. ${UP_AFTER} right in a row moves you up a level, ${DOWN_AFTER} misses in a row moves you down.</p>
        <p class="pen" id="teaser-level">You are on level 1 of ${LEVELS.length}: ${LEVELS[0].name}.</p>
        <a class="btn" href="practice.html">Practise</a>
      </section>

      <aside class="index-card" aria-labelledby="lb-h">
        <h2 id="lb-h">Class table</h2>
        <ol id="leaderboard">${board}</ol>
        <dl class="totals" id="home-totals">
          <div><dt>Days in a row</dt><dd id="stat-days">0</dd></div>
          <div><dt>Stickers</dt><dd id="stat-stickers">0 of ${STICKERS.length}</dd></div>
        </dl>
      </aside>
    </div>`,
  });
}

function workingList(lines, cls = 'working') {
  return `<ol class="${cls}">${lines.map((l) => `<li>${m(l)}</li>`).join('')}</ol>`;
}

function lessonPage(lesson) {
  const ex = makeQuestion(lesson.example);
  const first = lessonQuestions(lesson.id)[0];
  return studentPage({
    file: `lesson-${lesson.slug}.html`, page: 'lesson', current: '', attrs: ` data-lesson="${lesson.id}"`,
    title: `Lesson ${lesson.id}, ${lesson.title}`,
    desc: `${lesson.blurb} A worked example, then five questions marked as you go.`,
    body: `    <div class="page-title">
      <p class="crumb"><a href="index.html">${icon('../', 'i-back')}<span>Back to the path</span></a></p>
      <h1>Lesson ${lesson.id}: ${lesson.title}</h1>
      <p>${lesson.blurb}</p>
    </div>

    <div class="lesson-progress">
      <span class="hand">Lesson progress</span>
      <span class="boxes" id="lp-boxes" aria-hidden="true">${'<span class="box"></span>'.repeat(5)}</span>
      <strong id="lp-text">0 of 5 done, 0%</strong>
    </div>

    <div class="lesson-cols">
${quizBlock(first.text, 'Solve for x')}

      <section class="worksheet example" aria-labelledby="ex-h">
        <h2 id="ex-h">Worked example</h2>
        ${workingList(ex.solution, 'working good')}
        <p>${ex.hint}</p>
      </section>
    </div>

    <section class="worksheet done-card" id="lesson-done" hidden tabindex="-1">
      ${sticker('../', ['st-one', 'st-two', 'st-three'][lesson.id - 1])}
      <div>
        <h2>Lesson ${lesson.id} complete</h2>
        <p>5 of 5 done, 100%. <span id="done-first"></span></p>
        <p class="done-links"><a class="btn primary" href="${lesson.id < 3 ? `lesson-${LESSONS[lesson.id].slug}.html` : 'practice.html'}">${lesson.id < 3 ? `Go to lesson ${lesson.id + 1}` : 'Go to practice'}</a> <a class="btn" href="results.html">See your results</a> <button type="button" class="btn" id="lesson-again">Do this lesson again</button></p>
      </div>
    </section>`,
  });
}

function practicePage() {
  const rungs = [...LEVELS].reverse().map((l) => `<li data-level="${l.level}"><span class="rung-n">${l.level}</span><span class="rung-text"><strong>${l.name}</strong> ${m(l.example)}</span></li>`).join('\n          ');
  return studentPage({
    file: 'practice.html', page: 'practice', current: 'practice.html', title: 'Practice',
    desc: 'Algebra questions generated fresh each time on a four-level ladder. Three right in a row moves you up, two misses moves you down.',
    body: `    <div class="page-title">
      <h1>Practice</h1>
      <p>Fresh questions every time, on a ladder of four levels.</p>
    </div>

    <div class="lesson-cols practice-cols">
${quizBlock('x + 5 = 12', 'Solve for x')}

      <section class="worksheet ladder-panel" aria-labelledby="lad-h">
        <h2 id="lad-h">Your level</h2>
        <p class="pen" id="ladder-status">Level 1 of ${LEVELS.length}: ${LEVELS[0].name}</p>
        <p class="pips" id="ladder-pips"><span class="pip-label">Right in a row</span> <span class="pip-set" aria-hidden="true">${'<span class="pip"></span>'.repeat(UP_AFTER)}</span> <span id="pips-text">0 of ${UP_AFTER}</span></p>
        <ol class="ladder" id="ladder">
          ${rungs}
        </ol>
        <p class="small">${UP_AFTER} right first time in a row: up a level. ${DOWN_AFTER} misses in a row: down a level. Only your first try at each question counts.</p>
      </section>
    </div>`,
  });
}

function resultsPage() {
  return studentPage({
    file: 'results.html', page: 'results', current: 'results.html', title: 'Results',
    desc: 'What you have answered in this browser: lessons done, accuracy by level and the slips the marker spotted.',
    body: `    <div class="page-title">
      <h1>Results</h1>
      <p>Everything here comes from the answers you have checked in this browser.</p>
    </div>

    <section class="worksheet" id="results-empty">
      <h2>Nothing marked yet</h2>
      <p>Answer a question and it will show up here.</p>
      <p><a class="btn primary" href="lesson-introduction.html">Start lesson 1</a> <a class="btn" href="practice.html">Go to practice</a></p>
    </section>

    <div id="results-body" hidden>
      <dl class="totals big">
        <div><dt>Answers checked</dt><dd id="res-answered">0</dd></div>
        <div><dt>Right first time</dt><dd id="res-accuracy">0%</dd></div>
        <div><dt>XP</dt><dd id="res-xp">0</dd></div>
      </dl>
      <p class="pen next-step" id="res-next"></p>
      <div class="results-cols">
        <section class="worksheet" aria-labelledby="rl-h">
          <h2 id="rl-h">Lessons</h2>
          <ul class="plain-list" id="res-lessons"></ul>
        </section>
        <section class="worksheet" aria-labelledby="rm-h">
          <h2 id="rm-h">Right first time, by level</h2>
          <div id="res-mastery"></div>
        </section>
        <section class="worksheet" aria-labelledby="rs-h">
          <h2 id="rs-h">Slips the marker spotted</h2>
          <ul class="plain-list" id="res-slips"></ul>
          <p class="small">A slip is counted when your wrong answer is exactly what that mistake produces.</p>
        </section>
      </div>
    </div>`,
  });
}

function profilePage() {
  const sheet = STICKERS.map((s) => `<li data-sticker="${s.id}">${sticker('../', s.icon)}<span><strong>${s.name}</strong><span class="how">${s.how}</span><em class="earned-text">Not yet</em></span></li>`).join('\n        ');
  return studentPage({
    file: 'profile.html', page: 'stickers', current: 'profile.html', title: 'Stickers',
    desc: 'Seven stickers, each earned by something you actually did: a first right answer, a finished lesson, five in a row.',
    body: `    <div class="page-title">
      <h1>Sticker sheet</h1>
      <p>Each one is earned by something you did. None are given away.</p>
    </div>

    <dl class="totals big">
      <div><dt>XP</dt><dd id="pro-xp">0</dd></div>
      <div><dt>Days in a row</dt><dd id="pro-days">0</dd></div>
      <div><dt>Best run right</dt><dd id="pro-run">0</dd></div>
    </dl>

    <section aria-labelledby="st-h">
      <h2 id="st-h" class="sr-only">Stickers</h2>
      <ul class="sticker-sheet" id="sticker-sheet">
        ${sheet}
      </ul>
    </section>

    <section class="worksheet rubout">
      <h2>Start again</h2>
      <p>This rubs out your lessons, level, XP and stickers in this browser. It cannot be undone.</p>
      <button type="button" class="btn" id="reset-open">${icon('../', 'i-rubber')}<span>Rub out my progress</span></button>
    </section>

    <dialog id="reset-dialog" aria-labelledby="rd-h">
      <h2 id="rd-h">Rub out everything?</h2>
      <p>Your lessons, practice level, XP and stickers will be cleared from this browser.</p>
      <form method="dialog" class="dialog-actions">
        <button class="btn" value="cancel">Keep my progress</button>
        <button class="btn danger" value="confirm">Rub it out</button>
      </form>
    </dialog>`,
  });
}

function progressRedirect() {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Progress has moved: MathPath</title>
<meta name="description" content="Progress is now shown on the results page.">
<meta http-equiv="refresh" content="0; url=results.html">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../assets/css/base.css">
<link rel="stylesheet" href="../assets/css/student.css">
</head>
<body class="student">
<div class="book"><main id="main"><div class="page-title"><h1>Progress has moved</h1><p>It is now part of <a href="results.html">Results</a>.</p></div></main></div>
</body>
</html>
`;
}

// ---------------------------------------------------------------- teacher

const TEACHER_TABS = [
  ['index.html', 'i-board', 'Overview'], ['live-class.html', 'i-bell', 'Live class'], ['analytics.html', 'i-chart', 'Analytics'],
  ['lesson-plan.html', 'i-plan', 'Lesson plan'], ['homework.html', 'i-homework', 'Homework'], ['student-detail.html', 'i-marks', 'Mark book'],
  ['../student/index.html', 'i-pencil', 'Student book'], ['../index.html', 'i-book', 'Cover'],
];

function teacherPage({ file, title, desc, page, body }) {
  const tabs = TEACHER_TABS.map(([href, ic, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ''}>${icon('../', ic)}<span>${label}</span></a>`).join('\n      ');
  return `${head('../', { title: `${title}: MathPath teacher's board`, desc, theme: '#25483b', css: 'teacher', path: `teacher/${file}` })}
<body class="teacher" data-page="${page}">
<a class="skip" href="#main">Skip to the board</a>
<div class="board">
  <header class="board-head">
    <p class="brand"><a href="index.html">MathPath</a> <span>teacher's board, ${CLASS.name}</span></p>
    <nav class="chalk-nav" aria-label="Teacher's board">
      ${tabs}
    </nav>
  </header>
  <p class="demo-note">${icon('../', 'i-info')}<span><strong>Demo.</strong> The class, the names and every score on this board are scripted. Nothing is sent to anyone.</span></p>
  <main id="main">
${body}
  </main>
  <footer class="board-foot">
    <a href="${HOME}">← nathankagoro.com</a>
  </footer>
</div>
<div class="ledge" aria-hidden="true"><span class="chalk-stick"></span><span class="chalk-stick yellow"></span><span class="chalk-stick pink"></span><span class="duster"></span></div>
<script type="module" src="../assets/js/teacher.mjs"></script>
</body>
</html>
`;
}

const book = markBook();
const summary = classSummary(book);
const hwQuestions = lessonQuestions(CLASS.lessonId);

const planStatus = (note) => `<div class="plan-status">
        <p><span class="hand">Lesson 3 is</span> <strong class="status-chip" id="plan-status">closed to students</strong></p>
        <button type="button" class="btn chalk-btn primary" id="plan-toggle" aria-pressed="false">Open to students</button>
        <p class="small" id="plan-feedback" role="status" aria-live="polite">${note}</p>
      </div>`;

function chalkBar(percent, label) {
  return `<div class="chalk-bar" role="img" aria-label="${label}: ${percent}%"><span style="width:${percent}%"></span></div>`;
}

function teacherOverview() {
  return teacherPage({
    file: 'index.html', page: 'overview', title: 'Overview',
    desc: 'A scripted Form 2 class on a chalkboard: how many answers were right, which slip is commonest and who needs a word.',
    body: `    <h1>${CLASS.name}</h1>
    <p class="lede">This week: ${CLASS.topic.toLowerCase()}.</p>

    <div class="board-cols">
      <section class="chalk-box" aria-labelledby="und-h">
        <h2 id="und-h">Lesson 3 homework</h2>
        <p class="big-figure"><strong>${summary.right} of ${summary.answers}</strong> answers right, ${summary.understanding}%</p>
        ${chalkBar(summary.understanding, 'Answers right')}
        <h3>Commonest slips</h3>
        <ul class="chalk-list">
          ${summary.struggles.map((s) => `<li>${s.name}: <strong>${s.count}</strong> of ${summary.answers} answers, ${s.share}%</li>`).join('\n          ')}
        </ul>
      </section>

      <section class="chalk-box" aria-labelledby="att-h">
        <h2 id="att-h">Worth a word</h2>
        <p>Two or fewer right out of five:</p>
        <ul class="chalk-list names">
          ${summary.attention.map((n) => `<li>${n}</li>`).join('')}
        </ul>
        <p><a class="chalk-link" href="student-detail.html">Open the mark book</a></p>
        <h3>Suggested next step</h3>
        <p>Reteach multiplying out a bracket with one question on the board, for example ${m(hwQuestions[2].text)}, before setting more.</p>
      </section>

      <section class="chalk-box" aria-labelledby="cls-h">
        <h2 id="cls-h">Classes</h2>
        <ul class="class-list">
          <li>Form 1 Mathematics <span>no demo data</span></li>
          <li class="active">Form 2 Mathematics <span>on the board now</span></li>
          <li>Form 3 Mathematics <span>no demo data</span></li>
          <li>Form 4 Mathematics <span>no demo data</span></li>
        </ul>
        <h3>Prepared lesson</h3>
        <p>Week 2: multi-step distribution, 40 minutes. <a class="chalk-link" href="lesson-plan.html">Read the plan</a></p>
        ${planStatus('In this prototype the switch only changes this board.')}
      </section>
    </div>`,
  });
}

function teacherLive() {
  return teacherPage({
    file: 'live-class.html', page: 'live', title: 'Live class',
    desc: 'A scripted run-through of a live class session: students join, the lesson starts and example alerts appear.',
    body: `    <h1>Live class</h1>
    <p class="lede">A scripted run-through of what a live session would look like. No one is really joining.</p>

    <div class="board-cols two">
      <section class="chalk-box" aria-labelledby="ses-h">
        <h2 id="ses-h">Session</h2>
        <p class="stage" id="live-stage" role="status" aria-live="polite">Not started.</p>
        <div class="btn-row">
          <button type="button" class="btn chalk-btn primary" id="live-start">Play the scripted session</button>
          <button type="button" class="btn chalk-btn" id="live-lesson" disabled>Start the lesson</button>
        </div>
        <h3>Example alert</h3>
        <p class="alert" id="live-alert" role="status" aria-live="polite">Alerts appear here once the lesson has started.</p>
        <button type="button" class="btn chalk-btn" id="live-next" disabled>Show the next example alert</button>
        <p class="small">The four alerts are written examples of the kind of note the board could raise. They are not detected from anything.</p>
      </section>

      <section class="chalk-box" aria-labelledby="reg-h">
        <h2 id="reg-h">Register</h2>
        <ul class="register" id="register">
          ${CLASSMATES.map((c) => `<li><span>${c.name}</span><em>waiting</em></li>`).join('\n          ')}
        </ul>
      </section>
    </div>`,
  });
}

function chalkChart() {
  const rng = createRng(31);
  const X = (i) => 46 + i * 52;
  const Y = (p) => 205 - p * 2;
  const line = (vals) => rough(vals.map((v, i) => [X(i), Y(v)]), rng, { amp: 1.2 });
  const last = PROGRESS.weeks.length - 1;
  return `<svg class="chalk-chart" viewBox="0 0 400 250" role="img" aria-labelledby="chart-t chart-d">
          <title id="chart-t">Class progress against expected progress</title>
          <desc id="chart-d">Expected progress rises from ${PROGRESS.expected[0]}% to ${PROGRESS.expected[last]}% over seven weeks. The class rises from ${PROGRESS.actual[0]}% to ${PROGRESS.actual[last]}%, falling behind from week 4.</desc>
          <g fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="#d3ddd6" stroke-width="1" opacity=".45" d="${[20, 40, 60, 80].map((p) => rough([[46, Y(p)], [200, Y(p)], [372, Y(p)]], rng, { amp: 0.8 })).join('')}"/>
            <path stroke="#f5f2e6" stroke-width="2.5" d="${rough([[46, 30], [46, 205], [376, 205]], rng, { amp: 1 })}"/>
            <path stroke="#ffe27a" stroke-width="3.5" stroke-dasharray="2 8" d="${line(PROGRESS.expected)}"/>
            <path stroke="#ffbcc7" stroke-width="4" d="${line(PROGRESS.actual)}"/>
          </g>
          <g font-family="Andika, Segoe UI, sans-serif" font-size="12" fill="#f5f2e6">
            ${[0, 20, 40, 60, 80].map((p) => `<text x="38" y="${Y(p) + 4}" text-anchor="end">${p}%</text>`).join('')}
            ${PROGRESS.weeks.map((w, i) => `<text x="${X(i)}" y="224" text-anchor="middle">${w}</text>`).join('')}
            <text x="${X(last) - 6}" y="${Y(PROGRESS.expected[last]) - 10}" text-anchor="end" fill="#ffe27a" font-weight="700">Expected ${PROGRESS.expected[last]}%</text>
            <text x="${X(last) - 2}" y="${Y(PROGRESS.actual[last]) + 22}" text-anchor="end" fill="#ffbcc7" font-weight="700">Class ${PROGRESS.actual[last]}%</text>
          </g>
        </svg>`;
}

function teacherAnalytics() {
  const top = summary.struggles[0];
  const q = makeQuestion({ kind: 'brackets', a: 2, b: 3, c: 21 });
  const slip = q.slips.find((s) => s.category === 'distribute');
  return teacherPage({
    file: 'analytics.html', page: 'analytics', title: 'Analytics',
    desc: 'Scripted class progress against expected progress, and the commonest algebra slip with its working computed line by line.',
    body: `    <h1>Analytics</h1>
    <p class="lede">Where the class is against the plan, and the slip behind most wrong answers.</p>

    <div class="board-cols two">
      <section class="chalk-box" aria-labelledby="ch-h">
        <h2 id="ch-h">Progress against the plan</h2>
        ${chalkChart()}
        <p class="small">Scripted figures: share of the term's objectives met, by week.</p>
      </section>

      <section class="chalk-box" aria-labelledby="mis-h">
        <h2 id="mis-h">Commonest slip</h2>
        <p><strong>${top.name}.</strong> ${top.count} of the ${summary.answers} homework answers, ${top.share}%.</p>
        <p>On ${m(q.text)} it looks like this:</p>
        <ol class="chalk-working">
          ${slip.lines.map((l, i) => `<li${i === slip.errorLine ? ' class="bad"' : ''}>${m(l)}${i === slip.errorLine ? ` <span class="chalk-note">should be ${m(slip.fix)}</span>` : ''}</li>`).join('\n          ')}
        </ol>
        <p>The right answer is ${m(`x = ${formatAnswer(q.answer)}`)}. The slip gives ${m(`x = ${formatAnswer(slip.answer)}`)}.</p>
      </section>
    </div>

    <section class="chalk-box" aria-labelledby="pri-h">
      <h2 id="pri-h">Slips by share of answers</h2>
      <ul class="slip-bars">
        ${summary.struggles.map((s) => `<li><span>${s.name}</span>${chalkBar(s.share, s.name)}<strong>${s.share}%</strong></li>`).join('\n        ')}
      </ul>
      <p class="small">Counted from the mark book: each wrong answer there is the value that slip produces.</p>
    </section>`,
  });
}

function teacherPlan() {
  const parts = [
    ['Part 1, 10 min', 'Review', 'Recall one-step equations and inverse operations.'],
    ['Part 2, 15 min', 'Core idea', 'Multiply out the bracket, every term, then solve the two-step equation.'],
    ['Part 3, 10 min', 'Guided practice', `Students solve ${hwQuestions.slice(0, 3).map((q) => m(q.text)).join(', ')}.`],
    ['Part 4, 5 min', 'Exit check', 'One quick question to confirm the class is ready for word problems.'],
  ];
  return teacherPage({
    file: 'lesson-plan.html', page: 'plan', title: 'Lesson plan',
    desc: 'A prepared 40-minute lesson plan on equations with brackets, pinned to the teacher\'s board.',
    body: `    <h1>Lesson plan</h1>
    <p class="lede">Distribution to solve for x. 40 minutes.</p>

    <div class="board-cols two">
      <section class="pinned" aria-labelledby="pl-h">
        <h2 id="pl-h">Week 2: multi-step distribution</h2>
        <p><strong>Objective.</strong> Students solve equations with brackets and isolate x accurately.</p>
        <ol class="plan-parts">
          ${parts.map(([t, h, p]) => `<li><span class="when">${t}</span><strong>${h}</strong><span>${p}</span></li>`).join('\n          ')}
        </ol>
      </section>

      <section class="chalk-box" aria-labelledby="vis-h">
        <h2 id="vis-h">Visibility</h2>
        ${planStatus('In this prototype the switch only changes this board.')}
        <p><a class="chalk-link" href="analytics.html">See the analytics for this lesson</a></p>
      </section>
    </div>`,
  });
}

function teacherHomework() {
  return teacherPage({
    file: 'homework.html', page: 'homework', title: 'Homework',
    desc: 'Set the Lesson 3 homework: five bracket equations with expected answers worked out by the question engine.',
    body: `    <h1>Homework</h1>
    <p class="lede">Distribution and solving for x.</p>

    <div class="board-cols two">
      <section class="pinned" aria-labelledby="hq-h">
        <h2 id="hq-h">Prepared questions</h2>
        <ol class="hw-list">
          ${hwQuestions.map((q) => `<li>${m(q.text)} <span class="pen">${m(`x = ${formatAnswer(q.answer)}`)}</span></li>`).join('\n          ')}
        </ol>
        <p class="small">Answers in red are worked out by the question engine, not typed in.</p>
      </section>

      <section class="chalk-box" aria-labelledby="set-h">
        <h2 id="set-h">Set it</h2>
        <form id="hw-form" action="#" class="hw-form">
          <label class="check"><input type="checkbox" name="standard" checked> <span>Standard practice set, the five questions</span></label>
          <label class="check"><input type="checkbox" name="adaptive" checked> <span>Extra ladder practice for anyone with two or fewer right</span></label>
          <label for="due-date">Due date</label>
          <input id="due-date" name="due" type="date">
          <button type="submit" class="btn chalk-btn primary">Mark as sent to Form 2</button>
        </form>
        <p class="stage" id="hw-feedback" role="status" aria-live="polite">Not sent yet.</p>
        <p class="small">Nothing leaves this browser. The button shows what the confirmation would say.</p>
      </section>
    </div>`,
  });
}

function teacherMarkBook() {
  const sorted = [...book].sort((a, b) => a.name.localeCompare(b.name));
  const cell = (a) => (a.ok
    ? `<td class="ok">${icon('../', 'i-tick')}<span class="sr-only">right</span></td>`
    : `<td class="no">${icon('../', 'i-cross')}<span class="sr-only">wrong: ${a.name}</span></td>`);
  const rows = sorted.map((s, i) => `<tr>
              <th scope="row"><button type="button" class="row-btn" data-student="${i}" aria-pressed="${i === 0}">${s.name}</button></th>
              ${s.answers.map(cell).join('')}
              <td class="total">${s.right}</td>
            </tr>`).join('\n            ');
  const details = sorted.map((s, i) => {
    const wrong = s.answers.map((a, qi) => ({ ...a, n: qi + 1 })).filter((a) => !a.ok);
    return `<section class="chalk-box detail" data-detail="${i}"${i ? ' hidden' : ''} aria-labelledby="d${i}-h">
        <h2 id="d${i}-h">${s.name}</h2>
        <p class="big-figure"><strong>${s.right} of 5</strong> right, ${s.percent}%</p>
        ${chalkBar(s.percent, 'Right')}
        <p>${s.history}</p>
        <h3>Wrong answers</h3>
        <ul class="chalk-list wrongs">
          ${wrong.map((a) => `<li><span>Q${a.n} ${m(a.question)}: wrote ${m(`x = ${a.wrote}`)}</span><span class="chalk-note">${a.name}. ${m(a.slip.lines[a.slip.errorLine])} should be ${m(a.slip.fix)}</span></li>`).join('\n          ')}
        </ul>
      </section>`;
  }).join('\n      ');
  return teacherPage({
    file: 'student-detail.html', page: 'markbook', title: 'Mark book',
    desc: 'A mark-book grid for a scripted class of six, plus a real row for whoever has used the student book in this browser.',
    body: `    <h1>Mark book</h1>
    <p class="lede">Lesson 3 homework. Choose a name to see what went wrong.</p>

    <div class="board-cols two markbook-cols">
      <section class="pinned markbook" aria-labelledby="mb-h">
        <h2 id="mb-h">${CLASS.name}</h2>
        <table>
          <thead>
            <tr><th scope="col">Student</th>${hwQuestions.map((q, i) => `<th scope="col"><abbr title="${esc(q.text)}">Q${i + 1}</abbr></th>`).join('')}<th scope="col">/5</th></tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="you-row" id="you-row">
              <th scope="row"><button type="button" class="row-btn" data-student="you" aria-pressed="false">You</button></th>
              ${'<td class="blank"><span class="sr-only">not done</span></td>'.repeat(5)}
              <td class="total">0</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><th scope="row">Right, of ${book.length}</th>${summary.perQuestion.map((n) => `<td>${n}</td>`).join('')}<td></td></tr>
          </tfoot>
        </table>
        <p class="small">The six named students are scripted. The row marked You is real: it shows the Lesson 3 questions finished in the student book in this browser.</p>
      </section>

      <div class="details">
      ${details}
      <section class="chalk-box detail" data-detail="you" hidden aria-labelledby="dy-h">
        <h2 id="dy-h">You, in this browser</h2>
        <div id="you-detail"><p>Nothing recorded yet. <a class="chalk-link" href="../student/lesson-distribution.html">Open Lesson 3 in the student book</a></p></div>
      </section>
      </div>
    </div>`,
  });
}

// ---------------------------------------------------------------- output

export function allFiles() {
  const out = {
    'index.html': coverPage(),
    '404.html': notFoundPage(),
    'assets/icons.svg': sprite(),
    'assets/favicon.svg': FAVICON,
    'student/index.html': studentHome(),
    'student/practice.html': practicePage(),
    'student/results.html': resultsPage(),
    'student/profile.html': profilePage(),
    'student/progress.html': progressRedirect(),
    'teacher/index.html': teacherOverview(),
    'teacher/live-class.html': teacherLive(),
    'teacher/analytics.html': teacherAnalytics(),
    'teacher/lesson-plan.html': teacherPlan(),
    'teacher/homework.html': teacherHomework(),
    'teacher/student-detail.html': teacherMarkBook(),
  };
  for (const l of LESSONS) out[`student/lesson-${l.slug}.html`] = lessonPage(l);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const [file, text] of Object.entries(allFiles())) {
    const full = join(ROOT, file);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  console.log(`wrote ${Object.keys(allFiles()).length} files`);
}
