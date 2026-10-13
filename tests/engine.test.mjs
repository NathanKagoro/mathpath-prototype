import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MINUS, frac, eq, formatNumber, formatAnswer, lin, solveEquation, makeQuestion, createRng, generate,
  createLadder, currentQuestion, substitute, advance, parseAnswer, checkAnswer, LESSONS, lessonQuestions, LEVELS,
  UP_AFTER, DOWN_AFTER, SLIP_CATEGORIES,
} from '../assets/js/engine.mjs';

const same = (a, b, msg) => assert.ok(eq(a, b), msg || `${formatNumber(a)} should equal ${formatNumber(b)}`);

test('fractions reduce and print with a real minus sign', () => {
  assert.deepEqual(frac(6, -4), { n: -3, d: 2 });
  assert.equal(formatNumber(frac(-3, 2)), `${MINUS}3/2`);
  assert.equal(formatNumber(-7), `${MINUS}7`);
  assert.equal(formatAnswer(frac(16, 3)), '16/3 ≈ 5.33');
  assert.equal(formatAnswer(frac(15, 2)), '15/2 = 7.5');
  assert.equal(formatAnswer(4), '4');
});

test('linear expressions are written the way a textbook writes them', () => {
  assert.equal(lin(3, 2), '3x + 2');
  assert.equal(lin(1, -4), `x ${MINUS} 4`);
  assert.equal(lin(-1, 7), `${MINUS}x + 7`);
  assert.equal(lin(-2, 0), `${MINUS}2x`);
  assert.equal(lin(0, 5), '5');
});

test('the equation reader solves each form the generator writes', () => {
  same(solveEquation('3(x + 2) = 18'), 4);
  same(solveEquation('3x + 2 = 18'), frac(16, 3));
  same(solveEquation(`2(x ${MINUS} 4) = 10`), 9);
  same(solveEquation('x/3 + 4 = 10'), 18);
  same(solveEquation(`5x ${MINUS} 3 = 2x + 9`), 4);
  same(solveEquation(`${MINUS}3(x ${MINUS} 2) = 12`), -2);
  same(solveEquation('x = 16/3'), frac(16, 3));
  assert.equal(solveEquation('2x + 1 = 2x + 5'), null);
  assert.throws(() => solveEquation('x(x + 1) = 2'));
});

test('audit case: forgetting to distribute in 3(x + 2) = 18 ends at 16/3, not 4', () => {
  const q = makeQuestion({ kind: 'brackets', a: 3, b: 2, c: 18 });
  same(q.answer, 4);
  const slip = q.slips.find((s) => s.category === 'distribute');
  assert.deepEqual(slip.lines, ['3(x + 2) = 18', '3x + 2 = 18', '3x = 16', 'x = 16/3']);
  same(slip.answer, frac(16, 3));
  assert.equal(slip.errorLine, 1);
  assert.equal(slip.fix, '3x + 6 = 18');
});

test('audit case: adding instead of subtracting in 2x + 3 = 11 ends at 7, not 6', () => {
  const q = makeQuestion({ kind: 'two', a: 2, b: 3, c: 11 });
  same(q.answer, 4);
  const slip = q.slips.find((s) => s.category === 'sign');
  assert.deepEqual(slip.lines, ['2x + 3 = 11', '2x = 14', 'x = 7']);
  same(slip.answer, 7);
});

// The core guarantee: every line before the flagged one still has the right
// solution; the flagged line and everything after it share the slip's answer.
function assertConsistent(q) {
  assert.ok(q.slips.length >= 1, `${q.text} has at least one worked mistake`);
  const answers = new Set();
  for (const s of q.slips) {
    assert.ok(SLIP_CATEGORIES[s.category], `${s.id} has a known category`);
    assert.ok(s.errorLine >= 1 && s.errorLine < s.lines.length, `${s.id} flags a real line`);
    assert.equal(s.lines[0], q.text, `${s.id} starts from the question`);
    assert.match(s.lines.at(-1), /^x = /, `${s.id} ends with a value for x`);
    s.lines.forEach((line, i) => {
      const got = solveEquation(line);
      const want = i < s.errorLine ? q.answer : s.answer;
      assert.ok(got && eq(got, want), `${q.text} / ${s.id} line ${i + 1} "${line}" gives ${got && formatNumber(got)}, expected ${formatNumber(want)}`);
    });
    assert.ok(!eq(s.answer, q.answer), `${s.id} must not land on the right answer`);
    same(solveEquation(s.fix), q.answer, `${s.id} fix line is correct`);
    assert.ok(!answers.has(formatNumber(s.answer)), `${q.text}: two slips share an answer`);
    answers.add(formatNumber(s.answer));
  }
  q.solution.forEach((line) => same(solveEquation(line), q.answer, `solution line "${line}" of ${q.text}`));
  assert.match(q.solution.at(-1), /^x = /);
}

test('every worked mistake is internally consistent, for 2,000 generated questions', () => {
  const rng = createRng(20261013);
  const categories = new Set();
  for (let i = 0; i < 2000; i++) {
    const q = generate(1 + (i % 4), rng);
    assertConsistent(q);
    q.slips.forEach((s) => categories.add(s.category));
  }
  assert.deepEqual([...categories].sort(), Object.keys(SLIP_CATEGORIES).sort());
});

test('lesson questions are consistent and have whole-number answers', () => {
  for (const lesson of LESSONS) {
    const qs = lessonQuestions(lesson.id);
    assert.equal(qs.length, 5);
    qs.forEach((q) => { assertConsistent(q); assert.equal(q.answer.d, 1); });
    assertConsistent(makeQuestion(lesson.example));
  }
});

test('the generator is deterministic for a seed and differs between seeds', () => {
  const run = (seed) => { const r = createRng(seed); return Array.from({ length: 12 }, (_, i) => generate(1 + (i % 4), r).text); };
  assert.deepEqual(run(7), run(7));
  assert.notDeepEqual(run(7), run(8));
});

test('each level produces the kind of question it promises', () => {
  const rng = createRng(99);
  for (let i = 0; i < 400; i++) {
    const l1 = generate(1, rng), l2 = generate(2, rng), l3 = generate(3, rng), l4 = generate(4, rng);
    assert.ok(['add', 'sub', 'mul', 'div'].includes(l1.kind));
    assert.ok(['two', 'divtwo'].includes(l2.kind));
    assert.equal(l3.kind, 'brackets');
    assert.ok(!l3.text.startsWith(MINUS));
    assert.ok(l4.kind === 'both' || l4.text.includes(MINUS), `${l4.text} should involve negatives or both sides`);
    for (const q of [l1, l2, l3]) assert.ok(q.answer.d === 1 && q.answer.n > 0, `${q.text} has a positive whole answer`);
    assert.equal(l4.answer.d, 1);
    for (const q of [l1, l2, l3, l4]) { assert.ok(q.hint.length > 10); assert.ok(q.wordProblem.length > 20); assert.ok(!/dollar|\$/.test(q.wordProblem)); }
  }
  assert.throws(() => generate(5, rng));
});

test('generate never returns the avoided question', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const first = generate(1, createRng(seed));
    const again = generate(1, createRng(seed), first.key);
    assert.notEqual(again.key, first.key);
  }
});

test('ladder: three correct in a row climb one rung, up to the top', () => {
  let s = createLadder(42);
  const levels = [];
  for (let i = 0; i < 12; i++) { levels.push(s.level); s = advance(s, true).state; }
  assert.deepEqual(levels, [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]);
  assert.equal(s.level, 4);
  assert.equal(UP_AFTER, 3);
});

test('ladder: two misses in a row step down, never below level 1', () => {
  let s = { ...createLadder(42), level: 3 };
  let r = advance(s, false); assert.equal(r.moved, null); assert.equal(r.state.level, 3);
  r = advance(r.state, false); assert.equal(r.moved, 'down'); assert.equal(r.state.level, 2);
  r = advance(r.state, false); r = advance(r.state, false); assert.equal(r.state.level, 1);
  r = advance(r.state, false); r = advance(r.state, false); assert.equal(r.state.level, 1); assert.equal(r.moved, null);
  assert.equal(DOWN_AFTER, 2);
});

test('ladder: a miss resets the streak and a correct answer resets the misses', () => {
  let s = createLadder(5);
  s = advance(s, true).state; s = advance(s, true).state; s = advance(s, false).state;
  assert.equal(s.streak, 0);
  s = advance(s, true).state; s = advance(s, true).state;
  assert.equal(s.level, 1, 'needs three in a row, not three in total');
  s = advance(s, true).state; assert.equal(s.level, 2);
  s = advance(s, false).state; s = advance(s, true).state; s = advance(s, false).state;
  assert.equal(s.level, 2, 'misses must be consecutive to step down');
});

test('ladder: no question repeats back to back, and questions get harder (the audit bug)', () => {
  for (const seed of [1, 2, 3, 2026, 99999]) {
    let s = createLadder(seed);
    let prev = null;
    const seenLevels = new Set();
    for (let i = 0; i < 300; i++) {
      const q = currentQuestion(s);
      assert.notEqual(q.key, prev, `seed ${seed} repeated ${q.text} at step ${i}`);
      assert.equal(q.level, s.level);
      seenLevels.add(q.level);
      prev = q.key;
      s = advance(s, i % 7 !== 6).state; // mostly right, sometimes wrong
    }
    assert.deepEqual([...seenLevels].sort(), [1, 2, 3, 4]);
  }
});

test('ladder: the same state always gives the same question', () => {
  const s = advance(advance(createLadder(77), true).state, false).state;
  assert.equal(currentQuestion(s).text, currentQuestion({ ...s }).text);
});

test('answers: the forms the audit found rejected are accepted', () => {
  const q = makeQuestion({ kind: 'brackets', a: 3, b: 2, c: 18 });
  for (const input of ['4', ' 4 ', 'x=4', 'x = 4', 'X = 4', '4.0', '04', '4,0', '8/2', '+4', '4.00', '4 = x']) {
    assert.equal(checkAnswer(q, input).status, 'correct', `"${input}"`);
  }
  for (const input of ['5', '4.5', '4.004', '-4', '40']) assert.equal(checkAnswer(q, input).status, 'wrong', `"${input}"`);
});

test('answers: fractions, mixed numbers, decimals to a tolerance, minus signs', () => {
  const third = makeQuestion({ kind: 'mul', a: 3, c: 16 });
  for (const input of ['16/3', '32/6', '5 1/3', '5.33', '5.333', '5.3333', '5,33', 'x = 16/3']) {
    assert.equal(checkAnswer(third, input).status, 'correct', `"${input}"`);
  }
  assert.equal(checkAnswer(third, '5.3').status, 'close');
  assert.equal(checkAnswer(third, '5.35').status, 'wrong');
  assert.equal(checkAnswer(third, '5').status, 'wrong');
  const negative = makeQuestion({ kind: 'brackets', a: -3, b: -2, c: 12 });
  for (const input of ['-2', `${MINUS}2`, 'x = -2', '-2.0', '-4/2', '4/-2']) {
    assert.equal(checkAnswer(negative, input).status, 'correct', `"${input}"`);
  }
  assert.equal(checkAnswer(makeQuestion({ kind: 'mul', a: 2, c: 15 }), '7.5').status, 'correct');
});

test('answers: nonsense is invalid, not wrong', () => {
  const q = makeQuestion({ kind: 'add', b: 5, c: 12 });
  for (const input of ['', '   ', 'seven', '4/0', '1/2/3', 'x', '4x', '--4', null, undefined]) {
    assert.equal(checkAnswer(q, input).status, 'invalid', `"${input}"`);
  }
  assert.equal(parseAnswer('x=').ok, false);
});

test('wrong answers are diagnosed from the value actually typed', () => {
  const q = makeQuestion({ kind: 'brackets', a: 3, b: 2, c: 18 });
  assert.equal(checkAnswer(q, '16/3').slip.category, 'distribute');
  assert.equal(checkAnswer(q, '5.33').slip.category, 'distribute');
  assert.equal(checkAnswer(q, '8').slip.category, 'sign');
  assert.equal(checkAnswer(q, '6').slip.category, 'early');
  assert.equal(checkAnswer(q, '100').slip, null);
  const two = makeQuestion({ kind: 'two', a: 2, b: 9, c: 25 });
  assert.equal(checkAnswer(two, '17').slip.category, 'sign');
  assert.equal(checkAnswer(two, '16').slip.category, 'early');
  assert.equal(checkAnswer(two, '3.5').slip.category, 'order');
  const one = makeQuestion({ kind: 'div', a: 3, c: 6 });
  assert.equal(checkAnswer(one, '2').slip.category, 'inverse');
});

test('every slip answer, typed back in, is recognised as that slip', () => {
  const rng = createRng(4);
  for (let i = 0; i < 800; i++) {
    const q = generate(1 + (i % 4), rng);
    for (const s of q.slips) {
      const r = checkAnswer(q, formatNumber(s.answer));
      assert.equal(r.status, 'wrong');
      assert.equal(r.slip.id, s.id, `${q.text}: ${formatNumber(s.answer)}`);
    }
    assert.equal(checkAnswer(q, formatNumber(q.answer)).status, 'correct');
  }
});

test('word problems use shillings with thousands separators, never dollars', () => {
  const q = makeQuestion({ kind: 'both', a: 5, b: 2, c: 3, d: 10 });
  assert.match(q.wordProblem, /TSh 2,000 to join and TSh 5,000 a month/);
  const neg = makeQuestion({ kind: 'both', a: -2, b: 3, c: 4, d: -9 });
  assert.match(neg.wordProblem, /I think of a number/);
  assert.equal(LEVELS.length, 4);
});

test('substitute shows what a typed answer gives on each side', () => {
  const wrong = substitute('3(x + 2) = 18', frac(5));
  same(wrong.left, 21); same(wrong.right, 18);
  const right = substitute(`5x ${MINUS} 3 = 2x + 9`, frac(4));
  same(right.left, right.right);
  same(substitute('x/3 + 4 = 10', frac(16, 3)).left, frac(52, 9));
});
