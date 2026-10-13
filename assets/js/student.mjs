// Student book: wires the pages to the engine and the progress store.
// All HTML written here comes from the engine or the store; what the learner
// types is parsed to a number and never inserted as markup.

import {
  LEVELS, LESSONS, UP_AFTER, checkAnswer, currentQuestion, advance, createLadder, lessonQuestions,
  formatAnswer, substitute, SLIP_CATEGORIES,
} from './engine.mjs';
import {
  createStore, recordAttempt, completeLessonQuestion, restartLesson, setLadder, lessonProgress, mastery,
  streakDays, stickers, leaderboard, commonestSlip, dayKey, formatInt,
} from './store.mjs';
import { CLASSMATES } from './demo.mjs';

const $ = (id) => document.getElementById(id);
const page = document.body.dataset.page;

const seedParam = Number.parseInt(new URLSearchParams(location.search).get('seed'), 10);
const randomSeed = () => {
  try { return crypto.getRandomValues(new Uint32Array(1))[0] || 1; } catch { return (Date.now() % 2147483647) || 1; }
};
let storage;
try { storage = window.localStorage; } catch { storage = undefined; }
const store = createStore(storage, Number.isInteger(seedParam) ? seedParam >>> 0 : randomSeed());
let state = store.read();
// ?seed=123 restarts the practice ladder from a known seed (used for testing and demos).
if (Number.isInteger(seedParam) && state.ladder.seed !== seedParam >>> 0) state = setLadder(state, createLadder(seedParam));
const save = () => store.write(state);
save();

const today = () => dayKey(new Date());
const svg = (id, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 ${id.startsWith('st-') ? '64 64' : '32 32'}" aria-hidden="true"><use href="../assets/icons.svg#${id}"/></svg>`;
const maths = (t) => `<span class="maths">${t}</span>`;
const earnedIds = () => stickers(state).filter((s) => s.earned).map((s) => s.id);

/** Run a state change and return markup for any sticker it newly earned. */
function withStickers(change) {
  const before = new Set(earnedIds());
  change();
  save();
  return stickers(state)
    .filter((s) => s.earned && !before.has(s.id))
    .map((s) => `<p class="new-sticker">${svg(s.icon, 'sticker pressing')}<span>New sticker: ${s.name}</span></p>`);
}

// ------------------------------------------------------------------ quiz

function createQuiz({ onResult, onNext, revealMovesOn }) {
  const form = $('answer-form'), input = $('answer'), check = $('check'), feedback = $('feedback');
  const next = $('next'), reveal = $('reveal'), text = $('q-text'), count = $('q-count');
  const panels = { word: $('p-word'), hint: $('p-hint'), marked: $('p-marked') };
  const toggles = { word: $('t-word'), hint: $('t-hint'), marked: $('t-marked') };
  const openLabel = { word: 'Show it as a word problem', hint: 'Show a hint', marked: 'See an example of marked working' };
  const closeLabel = { word: 'Hide the word problem', hint: 'Hide the hint', marked: 'Hide the marked working' };
  let q = null, firstTry = true, solved = false, slipIndex = 0;

  reveal.textContent = revealMovesOn ? 'Show the answer and move on' : 'Show the worked solution';

  function setPanel(name, open) {
    panels[name].hidden = !open;
    toggles[name].setAttribute('aria-expanded', String(open));
    toggles[name].querySelector('span').textContent = open ? closeLabel[name] : openLabel[name];
  }

  function renderMarked() {
    const slip = q.slips[slipIndex % q.slips.length];
    const lines = slip.lines.map((line, i) => (i === slip.errorLine
      ? `<li class="bad">${maths(line)}${svg('i-cross')}<span class="pen">should be ${maths(slip.fix)}</span></li>`
      : `<li>${maths(line)}</li>`)).join('');
    panels.marked.innerHTML = `<h3>Example of marked working</h3>
<p class="small">A common mistake for this question, worked out by the app from the numbers. It is not a scan of anyone's page.</p>
<ol class="working">${lines}</ol>
<p class="pen">${slip.name}. ${slip.explain}</p>
<p class="small">Everything after the circled line follows from it, so this working ends at ${maths(`x = ${formatAnswer(slip.answer)}`)}, which is not the answer.</p>
${q.slips.length > 1 ? '<button type="button" class="btn tool" id="marked-more"><span>Show a different mistake</span></button>' : ''}`;
    const more = $('marked-more');
    if (more) more.addEventListener('click', () => { slipIndex += 1; renderMarked(); $('marked-more').focus(); });
  }

  const fill = {
    word: () => { panels.word.innerHTML = `<h3>As a word problem</h3><p>${q.wordProblem}</p>`; },
    hint: () => { panels.hint.innerHTML = `<h3>Hint</h3><p>${q.hint}</p>`; },
    marked: renderMarked,
  };
  for (const name of Object.keys(toggles)) {
    toggles[name].addEventListener('click', () => {
      const open = panels[name].hidden;
      if (open) fill[name]();
      setPanel(name, open);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (solved || !q) return;
    const r = checkAnswer(q, input.value);
    if (r.status === 'invalid' || r.status === 'close') {
      feedback.innerHTML = `<p class="pin">${r.message}</p>`;
      input.focus();
      return;
    }
    if (r.status === 'correct') {
      solved = true;
      input.disabled = true; check.disabled = true; reveal.hidden = true;
      const extra = onResult({ correct: true, firstTry, slip: null });
      feedback.innerHTML = `<p class="verdict">${svg('i-tick')}<span>Correct. ${maths(`x = ${q.answerText}`)}${firstTry ? '' : ' Got there on another look.'}</span></p>${extra.lines.join('')}`;
      next.textContent = extra.nextLabel;
      next.hidden = false;
      next.focus();
      return;
    }
    const typed = formatAnswer(r.value);
    const sides = substitute(q.text, r.value);
    const extra = onResult({ correct: false, firstTry, slip: r.slip });
    const why = r.slip
      ? `${r.slip.name}. ${r.slip.explain}`
      : `Put ${maths(`x = ${typed}`)} back in: the left side comes to ${maths(formatAnswer(sides.left))} and the right side to ${maths(formatAnswer(sides.right))}. They should match.`;
    feedback.innerHTML = `<p class="verdict">${svg('i-cross')}<span>Not yet. ${maths(`x = ${typed}`)} is not it.</span></p><p class="pin">${why}</p>${extra.lines.join('')}`;
    firstTry = false;
    reveal.hidden = false;
    input.focus(); input.select();
  });

  reveal.addEventListener('click', () => {
    const lines = q.solution.map((l) => `<li>${maths(l)}</li>`).join('');
    reveal.hidden = true;
    if (revealMovesOn) {
      solved = true; input.disabled = true; check.disabled = true;
      feedback.innerHTML = `<p class="pin">The working, line by line:</p><ol class="working good">${lines}</ol>`;
      next.textContent = 'Next question'; next.hidden = false; next.focus();
    } else {
      feedback.innerHTML = `<p class="pin">The working, line by line. Type the answer yourself to move on.</p><ol class="working good">${lines}</ol>`;
      input.value = ''; input.focus();
    }
  });

  next.addEventListener('click', () => onNext());

  for (const key of form.querySelectorAll('.key')) {
    key.addEventListener('click', () => {
      if (input.disabled) return;
      if (key.dataset.key === 'sign') input.value = /^\s*[-−]/.test(input.value) ? input.value.replace(/^\s*[-−]\s*/, '') : `−${input.value.trim()}`;
      else if (!input.value.includes('/')) input.value += '/';
      input.focus();
    });
  }

  return {
    show(question, countText, { focus = false } = {}) {
      q = question; firstTry = true; solved = false; slipIndex = 0;
      text.textContent = q.text;
      count.textContent = countText;
      input.value = ''; input.disabled = false; check.disabled = false;
      feedback.innerHTML = '';
      next.hidden = true; reveal.hidden = true;
      for (const name of Object.keys(panels)) setPanel(name, false);
      if (focus) input.focus();
    },
  };
}

// ------------------------------------------------------------------ pages

function lessonPage() {
  const id = Number(document.body.dataset.lesson);
  const questions = lessonQuestions(id);
  const cols = document.querySelector('.lesson-cols'), done = $('lesson-done');

  function progress() {
    const p = lessonProgress(state, id);
    document.querySelectorAll('#lp-boxes .box').forEach((b, i) => b.classList.toggle('done', i < p.done));
    $('lp-text').textContent = `${p.done} of ${p.total} done, ${p.percent}%`;
    return p;
  }

  const quiz = createQuiz({
    revealMovesOn: false,
    onResult({ correct, firstTry, slip }) {
      const q = questions[lessonProgress(state, id).done];
      const lines = withStickers(() => {
        state = recordAttempt(state, { level: q.level, correct, firstTry, slip: slip?.category, today: today() });
        if (correct) state = completeLessonQuestion(state, id);
      });
      const p = progress();
      return { lines, nextLabel: p.done >= p.total ? 'Finish the lesson' : 'Next question' };
    },
    onNext: () => render(true),
  });

  function render(focus = false) {
    const p = progress();
    const finished = p.done >= p.total;
    cols.hidden = finished; done.hidden = !finished;
    if (finished) {
      const acc = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
      $('done-first').textContent = `Across everything so far you are right first time ${acc}% of the time.`;
      const st = done.querySelector('.sticker');
      if (focus) { st.classList.add('pressing'); done.focus(); }
      return;
    }
    quiz.show(questions[p.done], `Question ${p.done + 1} of ${p.total}`, { focus });
  }

  $('lesson-again').addEventListener('click', () => { state = restartLesson(state, id); save(); render(true); });
  render();
}

function practicePage() {
  const status = $('ladder-status'), pipsText = $('pips-text');

  function ladderPanel() {
    const { level, streak } = state.ladder;
    status.textContent = `Level ${level} of ${LEVELS.length}: ${LEVELS[level - 1].name}`;
    document.querySelectorAll('#ladder li').forEach((li) => li.classList.toggle('here', Number(li.dataset.level) === level));
    document.querySelectorAll('#ladder-pips .pip').forEach((p, i) => p.classList.toggle('on', i < streak));
    pipsText.textContent = level === LEVELS.length ? `${streak} (top level)` : `${streak} of ${UP_AFTER}`;
  }

  let q = currentQuestion(state.ladder);
  const quiz = createQuiz({
    revealMovesOn: true,
    onResult({ correct, firstTry, slip }) {
      let moved = null;
      const lines = withStickers(() => {
        state = recordAttempt(state, { level: q.level, correct, firstTry, slip: slip?.category, today: today() });
        if (firstTry) {
          const r = advance(state.ladder, correct);
          moved = r.moved;
          state = setLadder(state, r.state);
        }
      });
      const { level } = state.ladder;
      if (moved === 'up') lines.unshift(`<p class="move">${UP_AFTER} right in a row. Up to level ${level}: ${LEVELS[level - 1].name}.</p>`);
      if (moved === 'down') lines.unshift(`<p class="move">Two misses in a row. Down to level ${level}, ${LEVELS[level - 1].name}, for some easier ones.</p>`);
      ladderPanel();
      return { lines, nextLabel: 'Next question' };
    },
    onNext() {
      q = currentQuestion(state.ladder);
      quiz.show(q, `Level ${q.level}`, { focus: true });
    },
  });
  ladderPanel();
  quiz.show(q, `Level ${q.level}`);
}

function homePage() {
  const rows = leaderboard(state, CLASSMATES);
  $('leaderboard').innerHTML = rows.map((r) => `<li${r.you ? ' class="you"' : ''}><span>${r.name}</span><span class="xp">${formatInt(r.xp)} XP</span></li>`).join('');
  $('stat-days').textContent = streakDays(state.days, today());
  const st = stickers(state);
  $('stat-stickers').textContent = `${st.filter((s) => s.earned).length} of ${st.length}`;

  let currentSet = false;
  for (const lesson of LESSONS) {
    const li = document.querySelector(`.stop[data-lesson="${lesson.id}"]`);
    const p = lessonProgress(state, lesson.id);
    const label = li.querySelector('.stop-state');
    if (p.status === 'done') {
      label.textContent = 'Done. Sticker earned.';
      li.querySelector('.stop-disc').innerHTML = svg(['st-one', 'st-two', 'st-three'][lesson.id - 1], 'sticker');
    } else {
      label.textContent = p.status === 'started' ? `${p.done} of ${p.total} done, ${p.percent}%` : 'Not started';
      if (!currentSet) { li.classList.add('is-current'); label.textContent += p.status === 'started' ? '. Carry on here.' : '. Start here.'; currentSet = true; }
    }
  }
  const hw = lessonProgress(state, 3);
  $('hw-state').textContent = hw.status === 'done' ? 'Handed in: 5 of 5 done.' : hw.status === 'started' ? `${hw.done} of 5 done so far.` : 'Not started yet.';
  const { level } = state.ladder;
  $('teaser-level').textContent = `You are on level ${level} of ${LEVELS.length}: ${LEVELS[level - 1].name}.`;
}

function resultsPage() {
  const lessonsStarted = LESSONS.some((l) => lessonProgress(state, l.id).status !== 'new');
  if (!state.answered && !lessonsStarted) return;
  $('results-empty').hidden = true;
  $('results-body').hidden = false;
  $('res-answered').textContent = formatInt(state.answered);
  $('res-accuracy').textContent = state.answered ? `${Math.round((state.correct / state.answered) * 100)}%` : 'none yet';
  $('res-xp').textContent = formatInt(state.xp);

  $('res-lessons').innerHTML = LESSONS.map((l) => {
    const p = lessonProgress(state, l.id);
    const text = p.status === 'done' ? 'Done, 100%' : p.status === 'started' ? `${p.done} of ${p.total} done, ${p.percent}%` : 'Not started';
    return `<li><a href="lesson-${l.slug}.html">Lesson ${l.id}: ${l.title}</a><span>${text}</span></li>`;
  }).join('');

  $('res-mastery').innerHTML = mastery(state).map((lv) => `<div class="m-row"><span class="m-name">${lv.level}. ${lv.name}</span><span>${lv.percent === null ? 'not tried yet' : `${lv.right} of ${lv.total}, ${lv.percent}%`}</span><div class="m-bar"><span style="width:${lv.percent ?? 0}%"></span></div></div>`).join('');

  const slipRows = Object.entries(state.slips).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  $('res-slips').innerHTML = slipRows.length
    ? slipRows.map(([k, n]) => `<li><span>${SLIP_CATEGORIES[k]}</span><strong>${n}</strong></li>`).join('')
    : '<li><span>None spotted so far.</span></li>';

  const nextLesson = LESSONS.find((l) => lessonProgress(state, l.id).status !== 'done');
  const slip = commonestSlip(state);
  $('res-next').textContent = nextLesson
    ? `Next: lesson ${nextLesson.id}, ${nextLesson.title}.`
    : slip
      ? `All three lessons done. Your commonest slip is "${slip.name.toLowerCase()}", so watch for it in practice.`
      : 'All three lessons done. Keep climbing the practice ladder.';
}

function stickersPage() {
  $('pro-xp').textContent = formatInt(state.xp);
  $('pro-days').textContent = streakDays(state.days, today());
  $('pro-run').textContent = state.bestRun;
  for (const s of stickers(state)) {
    const li = document.querySelector(`[data-sticker="${s.id}"]`);
    li.classList.toggle('earned', s.earned);
    li.querySelector('.earned-text').textContent = s.earned ? 'Earned' : 'Not yet';
  }
  const dialog = $('reset-dialog');
  $('reset-open').addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else if (window.confirm('Rub out all your progress in this browser?')) { store.clear(); location.reload(); }
  });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'confirm') { store.clear(); location.reload(); }
    else $('reset-open').focus();
  });
}

({ lesson: lessonPage, practice: practicePage, home: homePage, results: resultsPage, stickers: stickersPage })[page]?.();
