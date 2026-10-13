// Scripted demo data for the class. None of these people or scores are real.
// Each mark is either 'ok' or the slip the (fictional) student made, so the
// class figures and each wrong answer are computed from one table.

import { lessonQuestions, SLIP_CATEGORIES, formatAnswer } from './engine.mjs';

export const CLASS = { name: 'Form 2 Mathematics', topic: 'Distribution: equations with brackets', lessonId: 3 };

export const CLASSMATES = [
  { name: 'Amina J', xp: 240, marks: ['ok', 'ok', 'ok', 'ok', 'early'], history: 'Right first time on four of five. Lost the last mark by stopping before the final step.' },
  { name: 'Fatima N', xp: 180, marks: ['ok', 'ok', 'sign', 'ok', 'ok'], history: 'One sign slip, corrected on the second try without a hint.' },
  { name: 'Sarah K', xp: 150, marks: ['ok', 'sign', 'ok', 'ok', 'sign'], history: 'Multiplies out brackets reliably. Both misses come from moving a number across the equals sign.' },
  { name: 'Daniel T', xp: 90, marks: ['ok', 'early', 'distribute', 'ok', 'distribute'], history: 'Improves after a hint, then slips back on the next bracket.' },
  { name: 'Aisha K', xp: 70, marks: ['distribute', 'ok', 'distribute', 'sign', 'ok'], history: 'Two different slips, so worth watching her set out one question line by line.' },
  { name: 'John M', xp: 60, marks: ['distribute', 'distribute', 'ok', 'distribute', 'sign'], history: 'Multiplies only the first term in the bracket on most questions.' },
];

export const ALERTS = [
  'Four students have now missed question 3. The commonest slip is forgetting to multiply the second term.',
  'After the hint on question 2, three students corrected their own answer.',
  'Sign slips are appearing on question 4, where the bracket contains a subtraction.',
  'Everyone has attempted question 5. Two students finished with all five right.',
];

// Class progress chart (percent of the term's objectives met), also scripted.
export const PROGRESS = { weeks: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Now'], expected: [10, 22, 35, 48, 60, 71, 80], actual: [8, 15, 27, 37, 45, 50, 53] };

/** The wrong answer a slip produces on a question; falls back to the question's first slip. */
export function slipFor(question, category) {
  return question.slips.find((s) => s.category === category) || question.slips[0];
}

/** Every student's five answers, with the wrong ones computed by the engine. */
export function markBook() {
  const questions = lessonQuestions(CLASS.lessonId);
  return CLASSMATES.map((st) => {
    const answers = st.marks.map((m, i) => {
      const q = questions[i];
      if (m === 'ok') return { ok: true, question: q.text, wrote: formatAnswer(q.answer) };
      const slip = slipFor(q, m);
      return { ok: false, question: q.text, wrote: formatAnswer(slip.answer), category: slip.category, name: slip.name, slip };
    });
    const right = answers.filter((a) => a.ok).length;
    const counts = {};
    answers.forEach((a) => { if (!a.ok) counts[a.category] = (counts[a.category] || 0) + 1; });
    const main = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { ...st, answers, right, percent: Math.round((right / answers.length) * 100), mainSlip: main ? { category: main[0], name: SLIP_CATEGORIES[main[0]], count: main[1] } : null };
  });
}

/** Class totals derived from the mark book. */
export function classSummary(book = markBook()) {
  const all = book.flatMap((s) => s.answers);
  const right = all.filter((a) => a.ok).length;
  const counts = {};
  all.forEach((a) => { if (!a.ok) counts[a.category] = (counts[a.category] || 0) + 1; });
  const struggles = Object.entries(counts)
    .map(([category, n]) => ({ category, name: SLIP_CATEGORIES[category], count: n, share: Math.round((n / all.length) * 100) }))
    .sort((a, b) => b.count - a.count);
  const perQuestion = book[0].answers.map((_, i) => book.filter((s) => s.answers[i].ok).length);
  return {
    answers: all.length, right, understanding: Math.round((right / all.length) * 100), struggles, perQuestion,
    attention: book.filter((s) => s.right <= 2).map((s) => s.name),
  };
}
