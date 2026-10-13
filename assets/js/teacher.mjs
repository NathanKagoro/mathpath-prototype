// Teacher's board. Everything about the class is scripted (see demo.mjs);
// the only real data is the visitor's own row in the mark book, read from
// the same localStorage record the student book writes.

import { LEVELS } from './engine.mjs';
import { createStore, lessonProgress, commonestSlip } from './store.mjs';
import { ALERTS, CLASSMATES, CLASS } from './demo.mjs';

const $ = (id) => document.getElementById(id);
const page = document.body.dataset.page;
const KEY = 'mathpath:teacher:v1';

let storage;
try { storage = window.localStorage; } catch { storage = undefined; }
const prefs = (() => { try { return JSON.parse(storage.getItem(KEY)) || {}; } catch { return {}; } })();
const savePrefs = () => { try { storage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage blocked: the switch still works for this visit */ } };

function planToggle() {
  const button = $('plan-toggle'), chip = $('plan-status'), note = $('plan-feedback');
  if (!button) return;
  const render = (announce) => {
    const open = prefs.planOpen === true;
    chip.textContent = open ? 'open to students' : 'closed to students';
    chip.classList.toggle('open', open);
    button.textContent = open ? 'Close it again' : 'Open to students';
    button.setAttribute('aria-pressed', String(open));
    if (announce) note.textContent = open ? 'Marked as open. In this prototype the switch only changes this board.' : 'Marked as closed. In this prototype the switch only changes this board.';
  };
  button.addEventListener('click', () => { prefs.planOpen = !prefs.planOpen; savePrefs(); render(true); });
  render(false);
}

function livePage() {
  const start = $('live-start'), lesson = $('live-lesson'), next = $('live-next');
  const stage = $('live-stage'), alert = $('live-alert');
  const rows = [...document.querySelectorAll('#register li')];
  let alertIndex = -1;

  start.addEventListener('click', () => {
    start.disabled = true;
    stage.textContent = 'Session open. Waiting for students.';
    let joined = 0;
    const tick = setInterval(() => {
      const row = rows[joined];
      row.classList.add('joined');
      row.querySelector('em').textContent = 'here';
      joined += 1;
      stage.textContent = `${joined} of ${CLASSMATES.length} here.`;
      if (joined === rows.length) {
        clearInterval(tick);
        stage.textContent = `All ${CLASSMATES.length} here. Ready to start the lesson.`;
        lesson.disabled = false;
        lesson.focus();
      }
    }, 900);
  });

  const showAlert = () => {
    alertIndex = (alertIndex + 1) % ALERTS.length;
    alert.textContent = `Example ${alertIndex + 1} of ${ALERTS.length}: ${ALERTS[alertIndex]}`;
  };
  lesson.addEventListener('click', () => {
    lesson.disabled = true;
    stage.textContent = `Lesson running for ${CLASS.name}.`;
    next.disabled = false;
    showAlert();
    next.focus();
  });
  next.addEventListener('click', showAlert);
}

function homeworkPage() {
  const due = $('due-date'), feedback = $('hw-feedback');
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  due.min = iso(now);
  due.value = iso(tomorrow);
  $('hw-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = due.value ? new Date(`${due.value}T12:00:00`) : tomorrow;
    const when = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    feedback.textContent = `Marked as sent to Form 2, due ${when}. Nothing was actually sent.`;
  });
}

function markBookPage() {
  const buttons = [...document.querySelectorAll('.row-btn')];
  const panels = [...document.querySelectorAll('.detail')];
  for (const b of buttons) {
    b.addEventListener('click', () => {
      buttons.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      panels.forEach((p) => { p.hidden = p.dataset.detail !== b.dataset.student; });
    });
  }

  // The visitor's own row: Lesson 3 questions finished in the student book.
  const state = createStore(storage).read();
  const p = lessonProgress(state, CLASS.lessonId);
  const done = p.complete ? p.total : p.done;
  const cells = document.querySelectorAll('#you-row td');
  const tick = '<svg class="icon" viewBox="0 0 32 32" aria-hidden="true"><use href="../assets/icons.svg#i-tick"/></svg><span class="sr-only">done</span>';
  cells.forEach((td, i) => {
    if (i < p.total && i < done) { td.className = 'ok'; td.innerHTML = tick; }
    if (i === p.total) td.textContent = done;
  });
  if (state.answered > 0 || done > 0) {
    const slip = commonestSlip(state);
    const acc = state.answered ? `${state.correct} of ${state.answered} answers right first time, ${Math.round((state.correct / state.answered) * 100)}%.` : 'No first attempts recorded.';
    $('you-detail').innerHTML = `<p class="big-figure"><strong>${done} of ${p.total}</strong> Lesson 3 questions finished</p>
<p>${acc}</p>
<p>Practice level ${state.ladder.level} of ${LEVELS.length}: ${LEVELS[state.ladder.level - 1].name}.</p>
<p>${slip ? `Commonest slip so far: ${slip.name.toLowerCase()}, ${slip.count} time${slip.count === 1 ? '' : 's'}.` : 'No known slip spotted so far.'}</p>
<p class="small">A tick here means the question was finished, on any attempt. This row is read from this browser's saved progress.</p>`;
  }
}

planToggle();
({ live: livePage, homework: homeworkPage, markbook: markBookPage })[page]?.();
