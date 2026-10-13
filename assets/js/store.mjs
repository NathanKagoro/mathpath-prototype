// What this browser's visitor has actually done, kept in localStorage.
// Pure state functions plus a storage wrapper that never throws (private
// windows and blocked site data make localStorage unreliable).

import { LESSONS, LEVELS, SLIP_CATEGORIES, createLadder } from './engine.mjs';

export const STORAGE_KEY = 'mathpath:v1';
export const QUESTIONS_PER_LESSON = 5;

export function defaultState(seed = 1) {
  return {
    v: 1,
    lessons: Object.fromEntries(LESSONS.map((l) => [l.id, { done: 0, complete: false }])),
    ladder: createLadder(seed),
    byLevel: Object.fromEntries(LEVELS.map((l) => [l.level, { right: 0, wrong: 0 }])),
    slips: Object.fromEntries(Object.keys(SLIP_CATEGORIES).map((k) => [k, 0])),
    xp: 0, answered: 0, correct: 0, run: 0, bestRun: 0, topLevel: 1, days: [],
  };
}

const count = (v, max = 1e6) => (Number.isInteger(v) && v >= 0 ? Math.min(v, max) : 0);

/** Turn whatever was in storage into a valid state; bad data falls back to defaults. */
export function normalise(raw, seed = 1) {
  const base = defaultState(seed);
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return base;
  for (const l of LESSONS) {
    const r = raw.lessons?.[l.id] || {};
    base.lessons[l.id] = { done: count(r.done, QUESTIONS_PER_LESSON), complete: r.complete === true };
  }
  const lad = raw.ladder || {};
  const level = count(lad.level);
  base.ladder = {
    seed: count(lad.seed, 0xffffffff) || seed,
    level: level >= 1 && level <= LEVELS.length ? level : 1,
    streak: count(lad.streak, 2), misses: count(lad.misses, 1), count: count(lad.count),
    lastKey: typeof lad.lastKey === 'string' ? lad.lastKey.slice(0, 60) : null,
  };
  for (const l of LEVELS) {
    const r = raw.byLevel?.[l.level] || {};
    base.byLevel[l.level] = { right: count(r.right), wrong: count(r.wrong) };
  }
  for (const k of Object.keys(SLIP_CATEGORIES)) base.slips[k] = count(raw.slips?.[k]);
  for (const k of ['xp', 'answered', 'correct', 'run', 'bestRun']) base[k] = count(raw[k]);
  base.topLevel = Math.max(base.ladder.level, Math.min(count(raw.topLevel), LEVELS.length), 1);
  base.days = Array.isArray(raw.days) ? raw.days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-60) : [];
  return base;
}

/** localStorage wrapper. Every call is safe when storage is missing or blocked. */
export function createStore(storage, seed = 1) {
  return {
    read() {
      try { return normalise(JSON.parse(storage.getItem(STORAGE_KEY)), seed); } catch { return defaultState(seed); }
    },
    write(state) {
      try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
    },
    clear() {
      try { storage.removeItem(STORAGE_KEY); return true; } catch { return false; }
    },
  };
}

export const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Record one checked answer.
 * firstTry: only first attempts count towards accuracy and the run of correct answers.
 */
export function recordAttempt(state, { level, correct, firstTry = true, slip = null, today = null }) {
  const s = structuredClone(state);
  if (firstTry) {
    s.answered += 1;
    s.byLevel[level][correct ? 'right' : 'wrong'] += 1;
    if (correct) { s.correct += 1; s.run += 1; s.bestRun = Math.max(s.bestRun, s.run); } else s.run = 0;
  }
  if (correct) s.xp += firstTry ? 10 * level : 5;
  if (!correct && slip && slip in s.slips) s.slips[slip] += 1;
  if (today && !s.days.includes(today)) s.days = [...s.days, today].sort().slice(-60);
  return s;
}

/** A lesson question was answered correctly: move the lesson on by one. */
export function completeLessonQuestion(state, lessonId) {
  const s = structuredClone(state);
  const l = s.lessons[lessonId];
  l.done = Math.min(QUESTIONS_PER_LESSON, l.done + 1);
  if (l.done === QUESTIONS_PER_LESSON) l.complete = true;
  return s;
}

export function restartLesson(state, lessonId) {
  const s = structuredClone(state);
  s.lessons[lessonId].done = 0; // `complete` stays: the sticker was earned
  return s;
}

export function setLadder(state, ladder) {
  const s = structuredClone(state);
  s.ladder = { ...ladder };
  s.topLevel = Math.max(s.topLevel, ladder.level);
  return s;
}

/** Progress is questions done out of five: 0, 20 ... 100. */
export function lessonProgress(state, lessonId) {
  const l = state.lessons[lessonId];
  const done = l.done;
  return {
    done, total: QUESTIONS_PER_LESSON, complete: l.complete,
    percent: Math.round((done / QUESTIONS_PER_LESSON) * 100),
    status: done === QUESTIONS_PER_LESSON || (l.complete && done === 0) ? 'done' : done > 0 ? 'started' : 'new',
  };
}

/** First-attempt accuracy per level, null where nothing has been answered. */
export function mastery(state) {
  return LEVELS.map((l) => {
    const { right, wrong } = state.byLevel[l.level];
    const total = right + wrong;
    return { ...l, right, wrong, total, percent: total ? Math.round((right / total) * 100) : null };
  });
}

/** Days in a row with at least one answer, counting back from today (or yesterday). */
export function streakDays(days, today) {
  const set = new Set(days);
  const d = new Date(`${today}T12:00:00`);
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

export const STICKERS = [
  { id: 'first', icon: 'st-tick', name: 'First tick', how: 'Get one answer right first time.', test: (s) => s.correct >= 1 },
  { id: 'lesson1', icon: 'st-one', name: 'Lesson 1 done', how: 'Finish all five Introduction questions.', test: (s) => s.lessons[1].complete },
  { id: 'lesson2', icon: 'st-two', name: 'Lesson 2 done', how: 'Finish all five Variables questions.', test: (s) => s.lessons[2].complete },
  { id: 'lesson3', icon: 'st-three', name: 'Bracket breaker', how: 'Finish all five Distribution questions.', test: (s) => s.lessons[3].complete },
  { id: 'run5', icon: 'st-star', name: 'Five in a row', how: 'Five right first time, one after another.', test: (s) => s.bestRun >= 5 },
  { id: 'top', icon: 'st-ladder', name: 'Top rung', how: 'Reach level 4 in practice.', test: (s) => s.topLevel >= LEVELS.length },
  { id: 'twenty', icon: 'st-twenty', name: 'Twenty answered', how: 'Check twenty answers of your own.', test: (s) => s.answered >= 20 },
];

export const stickers = (state) => STICKERS.map(({ test, ...s }) => ({ ...s, earned: test(state) }));

/** Class table: scripted classmates plus the visitor's real row, highest XP first. */
export function leaderboard(state, classmates) {
  const rows = [...classmates.map((c) => ({ name: c.name, xp: c.xp, you: false })), { name: 'You', xp: state.xp, you: true }];
  rows.sort((a, b) => b.xp - a.xp || (a.you ? 1 : b.you ? -1 : 0));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** The slip the visitor makes most, or null. */
export function commonestSlip(state) {
  const top = Object.entries(state.slips).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] > 0 ? { category: top[0], name: SLIP_CATEGORIES[top[0]], count: top[1] } : null;
}

export const formatInt = (n) => n.toLocaleString('en-GB');
