import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, defaultState, normalise, createStore, recordAttempt, completeLessonQuestion, restartLesson,
  setLadder, lessonProgress, mastery, streakDays, stickers, leaderboard, commonestSlip, dayKey, formatInt,
} from '../assets/js/store.mjs';
import { advance } from '../assets/js/engine.mjs';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test('audit case: lesson progress is questions done, and reaches 100% at the end', () => {
  let s = defaultState();
  const seen = [lessonProgress(s, 3).percent];
  for (let i = 0; i < 5; i++) { s = completeLessonQuestion(s, 3); seen.push(lessonProgress(s, 3).percent); }
  assert.deepEqual(seen, [0, 20, 40, 60, 80, 100]);
  assert.equal(lessonProgress(s, 3).status, 'done');
  s = completeLessonQuestion(s, 3);
  assert.equal(lessonProgress(s, 3).done, 5, 'never passes five');
  assert.equal(lessonProgress(s, 1).status, 'new');
});

test('restarting a finished lesson keeps the sticker', () => {
  let s = defaultState();
  for (let i = 0; i < 5; i++) s = completeLessonQuestion(s, 1);
  s = restartLesson(s, 1);
  assert.equal(lessonProgress(s, 1).done, 0);
  assert.equal(lessonProgress(s, 1).status, 'done');
  s = completeLessonQuestion(s, 1);
  assert.equal(lessonProgress(s, 1).status, 'started');
  assert.ok(stickers(s).find((k) => k.id === 'lesson1').earned);
});

test('attempts: only first tries count for accuracy; XP scales with level', () => {
  let s = defaultState();
  s = recordAttempt(s, { level: 3, correct: false, slip: 'distribute', today: '2026-10-13' });
  s = recordAttempt(s, { level: 3, correct: true, firstTry: false, today: '2026-10-13' });
  assert.equal(s.answered, 1); assert.equal(s.correct, 0); assert.equal(s.xp, 5);
  assert.equal(s.slips.distribute, 1);
  assert.deepEqual(s.byLevel[3], { right: 0, wrong: 1 });
  s = recordAttempt(s, { level: 3, correct: true });
  assert.equal(s.xp, 35); assert.equal(s.run, 1);
  assert.deepEqual(s.days, ['2026-10-13']);
  assert.deepEqual(commonestSlip(s), { category: 'distribute', name: 'Forgot to multiply out the whole bracket', count: 1 });
  assert.equal(commonestSlip(defaultState()), null);
});

test('recordAttempt does not mutate the state it is given', () => {
  const s = defaultState();
  const frozen = JSON.stringify(s);
  recordAttempt(s, { level: 1, correct: true, today: '2026-01-01' });
  completeLessonQuestion(s, 1);
  assert.equal(JSON.stringify(s), frozen);
});

test('mastery is first-attempt accuracy per level, blank until attempted', () => {
  let s = defaultState();
  assert.equal(mastery(s)[0].percent, null);
  s = recordAttempt(s, { level: 1, correct: true });
  s = recordAttempt(s, { level: 1, correct: true });
  s = recordAttempt(s, { level: 1, correct: false });
  assert.equal(mastery(s)[0].percent, 67);
  assert.equal(mastery(s)[1].percent, null);
});

test('stickers are earned by what was actually done', () => {
  let s = defaultState();
  assert.equal(stickers(s).filter((k) => k.earned).length, 0);
  for (let i = 0; i < 5; i++) s = recordAttempt(s, { level: 1, correct: true });
  const earned = stickers(s).filter((k) => k.earned).map((k) => k.id);
  assert.deepEqual(earned, ['first', 'run5']);
  let ladder = s.ladder;
  for (let i = 0; i < 9; i++) ladder = advance(ladder, true).state;
  s = setLadder(s, ladder);
  ladder = advance(advance(ladder, false).state, false).state;
  s = setLadder(s, ladder);
  assert.equal(s.ladder.level, 3);
  assert.ok(stickers(s).find((k) => k.id === 'top').earned, 'top rung stays earned after stepping down');
});

test('streak counts consecutive days back from today or yesterday', () => {
  assert.equal(streakDays([], '2026-10-13'), 0);
  assert.equal(streakDays(['2026-10-13'], '2026-10-13'), 1);
  assert.equal(streakDays(['2026-10-11', '2026-10-12'], '2026-10-13'), 2);
  assert.equal(streakDays(['2026-10-09', '2026-10-12', '2026-10-13'], '2026-10-13'), 2);
  assert.equal(streakDays(['2026-10-10'], '2026-10-13'), 0);
  assert.equal(streakDays(['2026-02-28', '2026-03-01'], '2026-03-01'), 2);
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('leaderboard places the visitor among the scripted classmates', () => {
  const mates = [{ name: 'A', xp: 100 }, { name: 'B', xp: 40 }];
  assert.deepEqual(leaderboard({ xp: 0 }, mates).map((r) => r.name), ['A', 'B', 'You']);
  assert.deepEqual(leaderboard({ xp: 40 }, mates).map((r) => r.name), ['A', 'B', 'You'], 'ties go to the classmate');
  const top = leaderboard({ xp: 1250 }, mates);
  assert.equal(top[0].name, 'You'); assert.equal(top[0].rank, 1);
  assert.equal(formatInt(1250), '1,250');
});

test('storage: round trip, and nothing throws when storage is broken or missing', () => {
  const good = createStore(memory(), 9);
  assert.equal(good.read().ladder.seed, 9);
  const s = recordAttempt(good.read(), { level: 2, correct: true });
  assert.equal(good.write(s), true);
  assert.equal(good.read().xp, 20);
  assert.equal(good.clear(), true);
  assert.equal(good.read().xp, 0);

  const thrower = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); }, removeItem() { throw new Error('blocked'); } };
  const bad = createStore(thrower);
  assert.equal(bad.read().xp, 0);
  assert.equal(bad.write(s), false);
  assert.equal(bad.clear(), false);
  assert.equal(createStore(undefined).read().xp, 0);
  assert.equal(createStore(undefined).write(s), false);
});

test('storage: corrupt or hostile saved data falls back safely', () => {
  const st = memory();
  st.setItem(STORAGE_KEY, '{not json');
  assert.equal(createStore(st).read().xp, 0);
  const n = normalise({ v: 1, xp: -5, answered: 'lots', lessons: { 1: { done: 99, complete: 'yes' } }, ladder: { level: 12, streak: 50, lastKey: 7 }, days: ['2026-10-13', '<b>', 4], slips: { sign: 2, made_up: 9 } });
  assert.equal(n.xp, 0); assert.equal(n.answered, 0);
  assert.deepEqual(n.lessons[1], { done: 5, complete: false });
  assert.equal(n.ladder.level, 1); assert.equal(n.ladder.streak, 2); assert.equal(n.ladder.lastKey, null);
  assert.deepEqual(n.days, ['2026-10-13']);
  assert.equal(n.slips.sign, 2); assert.equal('made_up' in n.slips, false);
  assert.deepEqual(normalise({ v: 2, xp: 50 }), defaultState());
  assert.deepEqual(normalise(null), defaultState());
});
