// MathPath engine: question generator, difficulty ladder, answer checker and
// slip diagnosis. Pure functions, no DOM, so `node --test` can cover all of it.
//
// Every worked mistake is computed from the question. A slip is a list of
// equation lines in which exactly one line breaks the algebra; the lines after
// it follow correctly from the broken one, so the wrong working always lands on
// its own wrong answer (never on the right answer by accident).

export const MINUS = '−';
export const TIMES = '×';

// ---------- exact fractions ----------

const gcd = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

export function frac(n, d = 1) {
  if (typeof n === 'object') return n;
  if (!Number.isInteger(n) || !Number.isInteger(d)) throw new TypeError('frac needs integers');
  if (d === 0) throw new RangeError('division by zero');
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
export const add = (a, b) => { a = frac(a); b = frac(b); return frac(a.n * b.d + b.n * a.d, a.d * b.d); };
export const sub = (a, b) => { a = frac(a); b = frac(b); return frac(a.n * b.d - b.n * a.d, a.d * b.d); };
export const mul = (a, b) => { a = frac(a); b = frac(b); return frac(a.n * b.n, a.d * b.d); };
export const div = (a, b) => { a = frac(a); b = frac(b); return frac(a.n * b.d, a.d * b.n); };
export const eq = (a, b) => { a = frac(a); b = frac(b); return a.n === b.n && a.d === b.d; };
export const toNumber = (a) => { a = frac(a); return a.n / a.d; };
const isZero = (a) => frac(a).n === 0;
const isNeg = (a) => frac(a).n < 0;
const neg = (a) => mul(a, -1);

/** "−7", "16/3", "−5/2": always a proper minus sign. */
export function formatNumber(v) {
  const f = frac(v);
  const sign = f.n < 0 ? MINUS : '';
  const n = Math.abs(f.n);
  return f.d === 1 ? `${sign}${n}` : `${sign}${n}/${f.d}`;
}

/** "16/3 ≈ 5.33" for fractions, plain for whole numbers. */
export function formatAnswer(v) {
  const f = frac(v);
  if (f.d === 1) return formatNumber(f);
  const dec = toNumber(f).toFixed(2).replace('-', MINUS);
  const exact = Number.isInteger((f.n * 100) / f.d);
  return `${formatNumber(f)} ${exact ? '=' : '≈'} ${exact ? String(toNumber(f)).replace('-', MINUS) : dec}`;
}

// ---------- writing equations ----------

const term = (a) => {
  a = frac(a);
  if (eq(a, 1)) return 'x';
  if (eq(a, -1)) return `${MINUS}x`;
  return `${formatNumber(a)}x`;
};

/** ax + b as text: "3x + 2", "x − 4", "−2x + 7", "5". */
export function lin(a, b) {
  a = frac(a); b = frac(b);
  if (isZero(a)) return formatNumber(b);
  if (isZero(b)) return term(a);
  return `${term(a)} ${isNeg(b) ? MINUS : '+'} ${formatNumber(isNeg(b) ? neg(b) : b)}`;
}

const bracket = (a, b) => `${eq(a, -1) ? MINUS : formatNumber(a)}(${lin(1, b)})`;

// ---------- reading equations ----------
// A small parser for linear expressions in x, used to solve every line of
// working (and by the tests to prove the working is internally consistent).

function tokenise(text) {
  const out = [];
  const s = text.replace(/−|–/g, '-').replace(/×|·|\*/g, '*').replace(/÷/g, '/');
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d/.test(ch)) {
      let j = i;
      while (j < s.length && /[\d.]/.test(s[j])) j++;
      out.push({ t: 'num', v: s.slice(i, j) });
      i = j; continue;
    }
    if (ch === 'x' || ch === 'X') { out.push({ t: 'x' }); i++; continue; }
    if ('+-*/()='.includes(ch)) { out.push({ t: ch }); i++; continue; }
    throw new SyntaxError(`unexpected "${ch}" in "${text}"`);
  }
  return out;
}

function decimalToFrac(str) {
  const [whole, dec = ''] = str.split('.');
  return frac(Number(whole + dec), 10 ** dec.length);
}

function parseTokens(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const constant = (k) => ({ x: frac(0), k: frac(k) });
  const times = (p, q) => {
    if (!isZero(p.x) && !isZero(q.x)) throw new SyntaxError('not linear');
    return isZero(p.x)
      ? { x: mul(p.k, q.x), k: mul(p.k, q.k) }
      : { x: mul(p.x, q.k), k: mul(p.k, q.k) };
  };
  function factor() {
    const tk = take();
    if (!tk) throw new SyntaxError('unexpected end');
    if (tk.t === '-') { const f = factor(); return { x: neg(f.x), k: neg(f.k) }; }
    if (tk.t === '+') return factor();
    if (tk.t === 'num') return constant(decimalToFrac(tk.v));
    if (tk.t === 'x') return { x: frac(1), k: frac(0) };
    if (tk.t === '(') {
      const e = expr();
      if (!peek() || take().t !== ')') throw new SyntaxError('missing )');
      return e;
    }
    throw new SyntaxError(`unexpected "${tk.t}"`);
  }
  function product() {
    let left = factor();
    for (;;) {
      const tk = peek();
      if (!tk) break;
      if (tk.t === '*') { take(); left = times(left, factor()); }
      else if (tk.t === '/') {
        take();
        const right = factor();
        if (!isZero(right.x)) throw new SyntaxError('not linear');
        left = { x: div(left.x, right.k), k: div(left.k, right.k) };
      } else if (tk.t === 'x' || tk.t === '(') left = times(left, factor()); // 3x, 3(x + 2)
      else break;
    }
    return left;
  }
  function expr() {
    let left = product();
    for (;;) {
      const tk = peek();
      if (!tk || (tk.t !== '+' && tk.t !== '-')) break;
      take();
      const right = product();
      left = tk.t === '+'
        ? { x: add(left.x, right.x), k: add(left.k, right.k) }
        : { x: sub(left.x, right.x), k: sub(left.k, right.k) };
    }
    return left;
  }
  const result = expr();
  return { result, rest: tokens.slice(pos) };
}

/** Parse "3(x + 2) = 18" into its two linear sides. */
export function parseEquation(text) {
  const tokens = tokenise(text);
  const at = tokens.findIndex((t) => t.t === '=');
  if (at < 0 || tokens.filter((t) => t.t === '=').length !== 1) throw new SyntaxError(`not an equation: "${text}"`);
  const left = parseTokens(tokens.slice(0, at));
  const right = parseTokens(tokens.slice(at + 1));
  if (left.rest.length || right.rest.length) throw new SyntaxError(`could not read "${text}"`);
  return { left: left.result, right: right.result };
}

/** Exact solution of a linear equation given as text, or null if x cancels. */
export function solveEquation(text) {
  const { left, right } = parseEquation(text);
  const a = sub(left.x, right.x);
  if (isZero(a)) return null;
  return div(sub(right.k, left.k), a);
}

// ---------- questions ----------

export const LEVELS = [
  { level: 1, name: 'One step', example: 'x + 5 = 12' },
  { level: 2, name: 'Two steps', example: '2x + 3 = 11' },
  { level: 3, name: 'Brackets', example: '3(x + 2) = 18' },
  { level: 4, name: 'Negatives and x on both sides', example: `5x ${MINUS} 3 = 2x + 9` },
];

export const SLIP_CATEGORIES = {
  distribute: 'Forgot to multiply out the whole bracket',
  sign: 'Sign slip',
  inverse: 'Wrong inverse operation',
  early: 'Stopped a step early',
  order: 'Divided only part of a side',
};

const N = formatNumber;
const abs = (v) => (isNeg(v) ? neg(v) : frac(v));

/** Lines that finish "ax = rhs". */
function finishAx(a, rhs) {
  const lines = [`${term(a)} = ${N(rhs)}`];
  if (!eq(a, 1)) lines.push(`x = ${N(div(rhs, a))}`);
  return lines;
}
/** Lines that follow "ax + b = c" (not including it), done correctly. */
function fromLin(a, b, c) {
  if (isZero(b)) return eq(a, 1) ? [] : [`x = ${N(div(c, a))}`];
  return finishAx(a, sub(c, b));
}
const undo = (b) => (isNeg(b) ? `add ${N(abs(b))} to` : `subtract ${N(b)} from`);
const did = (b) => (isNeg(b) ? `subtracts ${N(abs(b))} from` : `adds ${N(b)} to`);
const signed = (b) => `${isNeg(b) ? MINUS : '+'} ${N(abs(b))}`;

const BUILDERS = {
  add({ b, c }) {
    const text = `x + ${N(b)} = ${N(c)}`;
    return {
      level: 1, text,
      solution: [text, `x = ${N(c - b)}`],
      hint: `Undo the + ${N(b)}: subtract ${N(b)} from both sides.`,
      slips: [{
        id: 'add-inverse', category: 'inverse', errorLine: 1,
        lines: [text, `x = ${N(c + b)}`],
        explain: `This adds ${N(b)} to the right-hand side. The equation has + ${N(b)}, so undo it by subtracting ${N(b)} from both sides.`,
        fix: `x = ${N(c - b)}`,
      }],
      word: b > 0 && c > b ? `A fruit pack has x oranges and ${b} bonus oranges, making ${c} in total. How many is x?` : null,
      puzzle: `I think of a number and add ${N(b)}. I get ${N(c)}. What was my number?`,
    };
  },
  sub({ b, c }) {
    const text = `x ${MINUS} ${N(b)} = ${N(c)}`;
    return {
      level: 1, text,
      solution: [text, `x = ${N(c + b)}`],
      hint: `Undo the ${MINUS} ${N(b)}: add ${N(b)} to both sides.`,
      slips: [{
        id: 'sub-inverse', category: 'inverse', errorLine: 1,
        lines: [text, `x = ${N(c - b)}`],
        explain: `This subtracts ${N(b)} again. The equation has ${MINUS} ${N(b)}, so undo it by adding ${N(b)} to both sides.`,
        fix: `x = ${N(c + b)}`,
      }],
      word: b > 0 && c > 0 ? `A bus had x passengers. ${b} got off, leaving ${c} on board. How many is x?` : null,
      puzzle: `I think of a number and subtract ${N(b)}. I get ${N(c)}. What was my number?`,
    };
  },
  mul({ a, c }) {
    const text = `${term(a)} = ${N(c)}`;
    const right = `x = ${N(frac(c, a))}`;
    return {
      level: a < 0 ? 4 : 1, text,
      solution: [text, right],
      hint: `${term(a)} means ${N(a)} ${TIMES} x. Undo it by dividing both sides by ${N(a)}.`,
      slips: [{
        id: 'mul-inverse', category: 'inverse', errorLine: 1,
        lines: [text, `x = ${N(c * a)}`],
        explain: `This multiplies by ${N(a)}. ${term(a)} already means ${N(a)} ${TIMES} x, so undo it by dividing both sides by ${N(a)}.`,
        fix: right,
      }, {
        id: 'mul-subtract', category: 'inverse', errorLine: 1,
        lines: [text, `x = ${N(c - a)}`],
        explain: `This subtracts ${N(a)}. ${term(a)} is a multiplication, ${N(a)} ${TIMES} x, so the inverse is dividing by ${N(a)}.`,
        fix: right,
      }],
      word: a > 0 && c > 0 ? `${a} identical exercise books have ${c} pages altogether. Each book has x pages. How many is x?` : null,
      puzzle: `I think of a number and multiply it by ${N(a)}. I get ${N(c)}. What was my number?`,
    };
  },
  div({ a, c }) {
    const text = `x/${N(a)} = ${N(c)}`;
    const right = `x = ${N(c * a)}`;
    return {
      level: 1, text,
      solution: [text, right],
      hint: `x/${N(a)} means x divided by ${N(a)}. Undo it by multiplying both sides by ${N(a)}.`,
      slips: [{
        id: 'div-inverse', category: 'inverse', errorLine: 1,
        lines: [text, `x = ${N(frac(c, a))}`],
        explain: `This divides by ${N(a)} again. x is already divided by ${N(a)}, so undo it by multiplying both sides by ${N(a)}.`,
        fix: right,
      }],
      word: a > 0 && c > 0 ? `x mangoes are shared equally among ${a} friends. Each friend gets ${c}. How many is x?` : null,
      puzzle: `I think of a number and divide it by ${N(a)}. I get ${N(c)}. What was my number?`,
    };
  },
  two({ a, b, c }) {
    const text = `${lin(a, b)} = ${N(c)}`;
    const good = `${term(a)} = ${N(c - b)}`;
    const q = frac(c, a);
    return {
      level: a < 0 ? 4 : 2, text,
      solution: [text, ...fromLin(a, b, c)],
      hint: `First ${undo(b)} both sides. Then divide both sides by ${N(a)}.`,
      slips: [{
        id: 'two-sign', category: 'sign', errorLine: 1,
        lines: [text, ...finishAx(a, c + b)],
        explain: `Line 2 ${did(b)} the right-hand side. To undo ${signed(b)} you ${undo(b)} both sides.`,
        fix: good,
      }, {
        id: 'two-order', category: 'order', errorLine: 1,
        lines: [text, `${lin(1, b)} = ${N(q)}`, `x = ${N(sub(q, b))}`],
        explain: `Line 2 divides ${N(c)} and ${term(a)} by ${N(a)} but leaves the ${signed(b)} alone. Dividing a side divides every term on it. It is easier to ${undo(b)} both sides first.`,
        fix: good,
      }, {
        id: 'two-early', category: 'early', errorLine: 2,
        lines: [text, good, `x = ${N(c - b)}`],
        explain: `${N(c - b)} is the value of ${term(a)}, not of x. Divide both sides by ${N(a)} to finish.`,
        fix: `x = ${N(frac(c - b, a))}`,
      }],
      word: a > 0 && b > 0 && c > b
        ? `${a} packets hold x pens each, and there are ${b} loose pens. That makes ${c} pens altogether. How many is x?`
        : a > 0 && b < 0 && c > 0
          ? `A hall has ${a} rows of x chairs. ${-b} chairs are taken away, leaving ${c}. How many is x?`
          : null,
      puzzle: `I think of a number, multiply it by ${N(a)}, then ${b < 0 ? `subtract ${N(-b)}` : `add ${N(b)}`}. I get ${N(c)}. What was my number?`,
    };
  },
  divtwo({ a, b, c }) {
    const text = `x/${N(a)} ${signed(b)} = ${N(c)}`;
    const good = `x/${N(a)} = ${N(c - b)}`;
    const right = `x = ${N((c - b) * a)}`;
    return {
      level: 2, text,
      solution: [text, good, right],
      hint: `First ${undo(b)} both sides. Then multiply both sides by ${N(a)}.`,
      slips: [{
        id: 'divtwo-sign', category: 'sign', errorLine: 1,
        lines: [text, `x/${N(a)} = ${N(c + b)}`, `x = ${N((c + b) * a)}`],
        explain: `Line 2 ${did(b)} the right-hand side. To undo ${signed(b)} you ${undo(b)} both sides.`,
        fix: good,
      }, {
        id: 'divtwo-inverse', category: 'inverse', errorLine: 2,
        lines: [text, good, `x = ${N(frac(c - b, a))}`],
        explain: `The last line divides by ${N(a)}. x is already divided by ${N(a)}, so undo it by multiplying both sides by ${N(a)}.`,
        fix: right,
      }],
      word: a > 0 && b > 0 && c > b ? `x sweets are shared equally among ${a} children. Each child then gets ${b} more, and ends up with ${c}. How many is x?` : null,
      puzzle: `I think of a number, divide it by ${N(a)}, then ${b < 0 ? `subtract ${N(-b)}` : `add ${N(b)}`}. I get ${N(c)}. What was my number?`,
    };
  },
  brackets({ a, b, c }) {
    const text = `${bracket(a, b)} = ${N(c)}`;
    const expanded = `${lin(a, a * b)} = ${N(c)}`;
    const q = frac(c, a);
    const slips = [{
      id: 'brackets-distribute', category: 'distribute', errorLine: 1,
      lines: [text, `${lin(a, b)} = ${N(c)}`, ...fromLin(a, b, c)],
      explain: `${N(a)} multiplies both terms in the bracket: ${N(a)} ${TIMES} x and ${N(a)} ${TIMES} ${N(b)}. Line 2 only multiplies the x, so ${signed(b)} should be ${signed(a * b)}.`,
      fix: expanded,
    }, {
      id: 'brackets-sign', category: 'sign', errorLine: 2,
      lines: [text, expanded, ...finishAx(a, c + a * b)],
      explain: `The bracket is multiplied out correctly, but line 3 ${did(a * b)} the right-hand side. To undo ${signed(a * b)} you ${undo(a * b)} both sides.`,
      fix: `${term(a)} = ${N(c - a * b)}`,
    }, {
      id: 'brackets-early', category: 'early', errorLine: 2,
      lines: [text, `${lin(1, b)} = ${N(q)}`, `x = ${N(q)}`],
      explain: `Dividing both sides by ${N(a)} is fine, but the ${signed(b)} then disappears. You still need to ${undo(b)} both sides.`,
      fix: `x = ${N(sub(q, b))}`,
    }];
    if (a < 0) {
      slips.splice(1, 0, {
        id: 'brackets-negative', category: 'sign', errorLine: 1,
        lines: [text, `${lin(a, -a * b)} = ${N(c)}`, ...fromLin(a, -a * b, c)],
        explain: `${N(a)} ${TIMES} ${N(b)} = ${N(a * b)}. The negative outside the bracket changes the sign of both terms, so line 2 should end ${signed(a * b)}.`,
        fix: expanded,
      });
    }
    return {
      level: a < 0 ? 4 : 3, text,
      solution: [text, expanded, ...fromLin(a, a * b, c)],
      hint: `Multiply out the bracket first: ${N(a)} ${TIMES} x and ${N(a)} ${TIMES} ${N(b)}. Then solve ${expanded}.`,
      slips,
      word: a > 0 && b > 0 && c > 0
        ? `${a} baskets each hold x mangoes plus ${b} extra. There are ${c} mangoes altogether. How many is x?`
        : a > 0 && b < 0 && c > 0
          ? `${a} buses each set off with x passengers. ${-b} get off each bus, leaving ${c} passengers altogether. How many is x?`
          : null,
      puzzle: `I think of a number, ${b < 0 ? `subtract ${N(-b)}` : `add ${N(b)}`}, then multiply the result by ${N(a)}. I get ${N(c)}. What was my number?`,
    };
  },
  both({ a, b, c, d }) {
    if (a === c) throw new RangeError('x cancels');
    const text = `${lin(a, b)} = ${lin(c, d)}`;
    const collected = `${lin(a - c, b)} = ${N(d)}`;
    const moveX = c < 0 ? `add ${term(-c)} to` : `subtract ${term(c)} from`;
    const slips = [];
    if (a + c !== 0) {
      slips.push({
        id: 'both-sign-x', category: 'sign', errorLine: 1,
        lines: [text, `${lin(a + c, b)} = ${N(d)}`, ...fromLin(a + c, b, d)],
        explain: `To clear ${term(c)} from the right you ${moveX} both sides. Line 2 does the opposite on the left, giving ${term(a + c)} where it should be ${term(a - c)}.`,
        fix: collected,
      });
    }
    if (b !== 0) {
      slips.push({
        id: 'both-sign-const', category: 'sign', errorLine: 2,
        lines: [text, collected, ...finishAx(a - c, d + b)],
        explain: `The x terms are collected correctly, but line 3 ${did(b)} the right-hand side. To undo ${signed(b)} you ${undo(b)} both sides.`,
        fix: `${term(a - c)} = ${N(d - b)}`,
      });
    }
    const x = frac(d - b, a - c);
    const kiosk = a > c && c > 0 && d > b && b >= 0 && x.d === 1;
    const tsh = (v) => `TSh ${(v * 1000).toLocaleString('en-GB')}`;
    return {
      level: 4, text,
      solution: [text, collected, ...fromLin(a - c, b, d)],
      hint: `Get the x terms on one side: ${moveX} both sides. Then solve ${collected}.`,
      slips,
      word: kiosk
        ? `Two phone kiosks sell monthly bundles. The first charges ${b === 0 ? 'nothing' : tsh(b)} to join and ${tsh(a)} a month. The second charges ${tsh(d)} to join and ${tsh(c)} a month. After x months both have cost the same. How many is x?`
        : null,
      puzzle: `I think of a number. ${N(a)} times my number${b === 0 ? '' : `, ${b < 0 ? `minus ${N(-b)}` : `plus ${N(b)}`},`} is the same as ${N(c)} times my number${d === 0 ? '' : ` ${d < 0 ? `minus ${N(-d)}` : `plus ${N(d)}`}`}. What was my number?`,
    };
  },
};

/**
 * Build a question from a spec such as { kind: 'brackets', a: 3, b: 2, c: 18 }.
 * The answer, hint, worked solution, word problem and every worked mistake
 * are derived from the numbers.
 */
export function makeQuestion(spec) {
  const build = BUILDERS[spec.kind];
  if (!build) throw new RangeError(`unknown kind "${spec.kind}"`);
  for (const k of ['a', 'b', 'c', 'd']) {
    if (k in spec && !Number.isInteger(spec[k])) throw new TypeError(`${k} must be an integer`);
  }
  const raw = build(spec);
  const answer = solveEquation(raw.text);
  if (!answer) throw new RangeError(`"${raw.text}" has no single solution`);
  const seen = new Set();
  const slips = [];
  for (const s of raw.slips) {
    const last = s.lines[s.lines.length - 1];
    let wrong;
    try { wrong = solveEquation(last); } catch { continue; }
    if (!wrong || eq(wrong, answer)) continue; // a "mistake" that still gives the right answer teaches nothing
    const key = `${wrong.n}/${wrong.d}`;
    if (seen.has(key)) continue;
    seen.add(key);
    slips.push({ ...s, answer: wrong, name: SLIP_CATEGORIES[s.category] });
  }
  return {
    kind: spec.kind, spec: { ...spec }, level: raw.level, text: raw.text, key: raw.text,
    answer, answerText: formatAnswer(answer), solution: raw.solution, hint: raw.hint,
    slips, wordProblem: raw.word || raw.puzzle, puzzle: raw.puzzle,
  };
}

// ---------- seeded generator ----------

/** Small deterministic PRNG (mulberry32). */
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const nonZero = (rng, lo, hi) => { let v = 0; while (v === 0) v = int(rng, lo, hi); return v; };

function specFor(level, rng) {
  if (level === 1) {
    const kind = pick(rng, ['add', 'sub', 'mul', 'div']);
    if (kind === 'add') { const x = int(rng, 2, 15), b = int(rng, 2, 12); return { kind, b, c: x + b }; }
    if (kind === 'sub') { const c = int(rng, 1, 12), b = int(rng, 2, 12); return { kind, b, c }; }
    if (kind === 'mul') { const a = int(rng, 2, 9), x = int(rng, 2, 12); return { kind, a, c: a * x }; }
    return { kind, a: int(rng, 2, 9), c: int(rng, 2, 9) };
  }
  if (level === 2) {
    if (rng() < 0.75) {
      const a = int(rng, 2, 9), x = int(rng, 2, 10);
      let b = nonZero(rng, -12, 12);
      if (a * x + b <= 0) b = -b;
      return { kind: 'two', a, b, c: a * x + b };
    }
    const a = int(rng, 2, 6), m = int(rng, 2, 8);
    let b = nonZero(rng, -9, 9);
    if (m + b <= 0) b = -b;
    return { kind: 'divtwo', a, b, c: m + b };
  }
  if (level === 3) {
    const a = int(rng, 2, 9), x = int(rng, 1, 10);
    let b = nonZero(rng, -9, 9);
    if (x + b <= 0) b = -b;
    return { kind: 'brackets', a, b, c: a * (x + b) };
  }
  // Level 4: negative coefficients, negative answers, x on both sides.
  const roll = rng();
  if (roll < 0.5) {
    const a = nonZero(rng, -6, 9);
    let c = nonZero(rng, -6, 9);
    while (c === a) c = nonZero(rng, -6, 9);
    const x = nonZero(rng, -8, 10), b = int(rng, -12, 12);
    return { kind: 'both', a, b, c, d: (a - c) * x + b };
  }
  if (roll < 0.8) {
    const a = int(rng, -9, -2), x = nonZero(rng, -6, 9);
    let b = nonZero(rng, -9, 9);
    if (x + b === 0) b = -b;
    return { kind: 'brackets', a, b, c: a * (x + b) };
  }
  const a = int(rng, -9, -2), x = nonZero(rng, -8, 9), b = nonZero(rng, -12, 12);
  return { kind: 'two', a, b, c: a * x + b };
}

/** One question at a level. Never returns the question whose key is `avoidKey`. */
export function generate(level, rng, avoidKey = null) {
  if (!LEVELS.some((l) => l.level === level)) throw new RangeError(`no level ${level}`);
  for (let i = 0; i < 200; i++) {
    const q = makeQuestion(specFor(level, rng));
    if (q.key !== avoidKey && q.level === level) return q;
  }
  throw new Error('generator could not find a fresh question');
}

// ---------- difficulty ladder ----------

export const UP_AFTER = 3;   // correct first-time answers in a row to climb a rung
export const DOWN_AFTER = 2; // misses in a row to step down a rung
const TOP = LEVELS.length;

export function createLadder(seed = 1, level = 1) {
  return { seed: seed >>> 0, level, streak: 0, misses: 0, count: 0, lastKey: null };
}

/** The question for the ladder's current position. Same state, same question. */
export function currentQuestion(state) {
  const rng = createRng((Math.imul(state.seed, 2654435761) ^ Math.imul(state.count + 1, 40503)) >>> 0);
  return generate(state.level, rng, state.lastKey);
}

/**
 * Record the first-attempt result for the current question and move on.
 * Returns the next state and whether the learner moved 'up', 'down' or stayed.
 */
export function advance(state, correct) {
  const key = currentQuestion(state).key;
  let { level, streak, misses } = state;
  let moved = null;
  if (correct) {
    streak += 1; misses = 0;
    if (streak >= UP_AFTER && level < TOP) { level += 1; streak = 0; moved = 'up'; }
  } else {
    misses += 1; streak = 0;
    if (misses >= DOWN_AFTER && level > 1) { level -= 1; misses = 0; moved = 'down'; }
  }
  return { state: { ...state, level, streak, misses, count: state.count + 1, lastKey: key }, moved };
}

// ---------- answer checking ----------

/**
 * Read what a learner typed. Accepts "4", "x = 4", "4.0", "04", "−4", "16/3",
 * "5 1/3", "5.33" and "5,33". Returns { ok, value, decimals } where decimals
 * is null for exact entries (whole numbers and fractions).
 */
export function parseAnswer(input) {
  let s = String(input ?? '').trim().replace(/[−–—]/g, '-').replace(/⁄|÷/g, '/');
  s = s.replace(/^x\s*=\s*/i, '').replace(/\s*=\s*x$/i, '').trim();
  if (!s) return { ok: false, reason: 'empty' };
  let m;
  if ((m = s.match(/^([+-]?)\s*(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) {
    const [, sign, w, n, d] = m;
    if (Number(d) === 0) return { ok: false, reason: 'zero' };
    const v = add(Number(w), frac(Number(n), Number(d)));
    return { ok: true, value: sign === '-' ? neg(v) : v, decimals: null };
  }
  if ((m = s.match(/^([+-]?)\s*(\d+)\s*\/\s*([+-]?)(\d+)$/))) {
    const [, sign, n, sign2, d] = m;
    if (Number(d) === 0) return { ok: false, reason: 'zero' };
    const v = frac(Number(n), Number(d));
    return { ok: true, value: (sign === '-') !== (sign2 === '-') ? neg(v) : v, decimals: null };
  }
  if ((m = s.match(/^([+-]?)\s*(\d*)(?:[.,](\d+))?$/)) && (m[2] || m[3])) {
    const [, sign, w, dec = ''] = m;
    if ((w + dec).length > 12) return { ok: false, reason: 'long' };
    const v = frac(Number((w || '0') + dec), 10 ** dec.length);
    return { ok: true, value: sign === '-' ? neg(v) : v, decimals: dec.length || null };
  }
  return { ok: false, reason: 'format' };
}

/** Does a parsed entry stand for `target`? Decimals need 2+ places unless exact. */
export function matches(parsed, target) {
  if (eq(parsed.value, target)) return true;
  if (!parsed.decimals || parsed.decimals < 2) return false;
  return Math.abs(toNumber(parsed.value) - toNumber(target)) < 10 ** -parsed.decimals;
}

/**
 * Mark an answer. status is 'correct', 'wrong', 'close' (right value but too
 * few decimal places) or 'invalid' (not a number). For a wrong answer, `slip`
 * is the known mistake that produces exactly that value, when there is one.
 */
export function checkAnswer(question, input) {
  const parsed = parseAnswer(input);
  if (!parsed.ok) {
    return {
      status: 'invalid',
      message: parsed.reason === 'empty'
        ? 'Write a value for x first.'
        : 'Write x as a number, such as 4, −3, 16/3 or 5.33.',
    };
  }
  if (matches(parsed, question.answer)) return { status: 'correct', value: parsed.value };
  if (parsed.decimals === 1 && Math.abs(toNumber(parsed.value) - toNumber(question.answer)) < 0.1) {
    return { status: 'close', value: parsed.value, message: 'Close. Give x as a fraction, or to at least 2 decimal places.' };
  }
  const slip = question.slips.find((s) => matches(parsed, s.answer)) || null;
  return { status: 'wrong', value: parsed.value, slip };
}

// ---------- lessons (fixed sets, built through the same engine) ----------

export const LESSONS = [
  {
    id: 1, slug: 'introduction', title: 'Introduction', blurb: 'One-step equations: undo one operation.',
    example: { kind: 'add', b: 4, c: 11 },
    questions: [
      { kind: 'add', b: 5, c: 12 }, { kind: 'sub', b: 3, c: 9 }, { kind: 'mul', a: 4, c: 28 },
      { kind: 'div', a: 3, c: 5 }, { kind: 'add', b: 9, c: 20 },
    ],
  },
  {
    id: 2, slug: 'variables', title: 'Variables', blurb: 'Two-step equations: clear the number, then the multiplier.',
    example: { kind: 'two', a: 2, b: 5, c: 17 },
    questions: [
      { kind: 'two', a: 2, b: 3, c: 11 }, { kind: 'two', a: 3, b: -6, c: 15 }, { kind: 'two', a: 4, b: 8, c: 24 },
      { kind: 'divtwo', a: 2, b: 5, c: 9 }, { kind: 'two', a: 2, b: 9, c: 25 },
    ],
  },
  {
    id: 3, slug: 'distribution', title: 'Distribution', blurb: 'Equations with brackets: multiply out, then solve.',
    example: { kind: 'brackets', a: 2, b: 3, c: 14 },
    questions: [
      { kind: 'brackets', a: 3, b: 2, c: 18 }, { kind: 'brackets', a: 2, b: -4, c: 10 }, { kind: 'brackets', a: 4, b: 1, c: 28 },
      { kind: 'brackets', a: 5, b: -3, c: 20 }, { kind: 'brackets', a: 6, b: 2, c: 30 },
    ],
  },
];

export const lessonQuestions = (id) => LESSONS.find((l) => l.id === id).questions.map(makeQuestion);
