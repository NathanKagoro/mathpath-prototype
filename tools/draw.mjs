// Hand-drawn SVG, generated: every stroke is a polyline whose points are
// nudged by a seeded random amount, so icons look pencilled but the output
// is identical on every run.

import { createRng } from '../assets/js/engine.mjs';

const f = (n) => Number(n.toFixed(1));
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

export function circle(cx, cy, rx, n = 9, ry = rx) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

export function star(cx, cy, outer, inner, points = 5) {
  return Array.from({ length: points * 2 }, (_, i) => {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? inner : outer;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

/** Path data for one stroke. opts: s (smooth), z (closed), amp (wobble). */
export function rough(points, rng, { s = false, z = false, amp = 0.5 } = {}) {
  const p = points.map(([x, y]) => [x + (rng() - 0.5) * 2 * amp, y + (rng() - 0.5) * 2 * amp]);
  const P = ([x, y]) => `${f(x)} ${f(y)}`;
  if (!s) return `M${p.map(P).join('L')}${z ? 'Z' : ''}`;
  if (z) {
    let d = `M${P(mid(p[p.length - 1], p[0]))}`;
    p.forEach((pt, i) => { d += `Q${P(pt)} ${P(mid(pt, p[(i + 1) % p.length]))}`; });
    return `${d}Z`;
  }
  let d = `M${P(p[0])}`;
  for (let i = 1; i < p.length - 1; i++) d += `Q${P(p[i])} ${P(mid(p[i], p[i + 1]))}`;
  return `${d}L${P(p[p.length - 1])}`;
}

const S = (p, o = {}) => ({ p, ...o });

// Line icons on a 32-unit grid.
const ICONS = {
  'i-home': [S([[4, 16], [16, 5], [28, 16]]), S([[7, 14], [7, 27], [25, 27], [25, 14]]), S([[13, 27], [13, 19], [19, 19], [19, 27]])],
  'i-pencil': [S([[6, 26], [8, 19], [21, 6], [26, 11], [13, 24]], { z: 1 }), S([[8, 19], [13, 24]]), S([[18, 9], [23, 14]])],
  'i-marks': [S([[5, 6], [27, 6], [27, 26], [5, 26]], { z: 1 }), S([[10, 16], [14, 21], [23, 10]])],
  'i-sticker': [S(star(16, 17, 12, 5.2), { z: 1 })],
  'i-book': [S([[7, 4], [25, 4], [25, 28], [7, 28]], { z: 1 }), S([[11, 4], [11, 28]]), S([[14, 9], [22, 9], [22, 15], [14, 15]], { z: 1 })],
  'i-board': [S([[4, 6], [28, 6], [28, 22], [4, 22]], { z: 1 }), S([[10, 22], [7, 29]]), S([[22, 22], [25, 29]]), S([[9, 13], [12, 10], [14, 15], [17, 11], [21, 14]], { s: 1 })],
  'i-tick': [S([[5, 17], [8, 20], [12, 26], [18, 15], [27, 5]], { s: 1 })],
  'i-cross': [S([[7, 7], [15, 17], [25, 26]], { s: 1 }), S([[25, 6], [16, 16], [7, 26]], { s: 1 })],
  'i-lock': [S([[7, 14], [25, 14], [25, 27], [7, 27]], { z: 1 }), S([[11, 14], [11, 9], [16, 5], [21, 9], [21, 14]], { s: 1 })],
  'i-bulb': [S(circle(16, 13, 8.5), { s: 1, z: 1 }), S([[12, 24], [20, 24]]), S([[13, 28], [19, 28]])],
  'i-speech': [S([[5, 6], [27, 6], [27, 21], [15, 21], [9, 27], [10, 21], [5, 21]], { z: 1 }), S([[10, 11], [22, 11]]), S([[10, 16], [18, 16]])],
  'i-pen': [S([[20, 4], [27, 11], [12, 26], [5, 27], [6, 20]], { z: 1 }), S([[17, 7], [24, 14]])],
  'i-back': [S([[27, 16], [6, 16]]), S([[13, 8], [5, 16], [13, 24]])],
  'i-bell': [S([[8, 22], [10, 12], [16, 6], [22, 12], [24, 22]], { s: 1 }), S([[5, 22], [27, 22]]), S(circle(16, 26, 1.8, 6), { s: 1, z: 1 })],
  'i-plan': [S([[7, 6], [25, 6], [25, 28], [7, 28]], { z: 1 }), S([[12, 4], [20, 4], [20, 8], [12, 8]], { z: 1 }), S([[11, 14], [21, 14]]), S([[11, 19], [21, 19]]), S([[11, 24], [17, 24]])],
  'i-homework': [S([[16, 8], [6, 6], [6, 24], [16, 26]]), S([[16, 8], [26, 6], [26, 24], [16, 26]]), S([[16, 8], [16, 26]])],
  'i-chart': [S([[5, 5], [5, 27], [28, 27]]), S([[8, 22], [13, 16], [18, 19], [26, 8]])],
  'i-rubber': [S([[5, 20], [17, 8], [26, 17], [17, 26], [10, 26]], { z: 1 }), S([[12, 13], [21, 22]])],
  'i-ladder': [S([[10, 4], [10, 28]]), S([[22, 4], [22, 28]]), S([[10, 9], [22, 9]]), S([[10, 15], [22, 15]]), S([[10, 21], [22, 21]])],
  'i-flag': [S([[8, 4], [8, 28]]), S([[8, 6], [24, 9], [8, 15]])],
  'i-people': [S(circle(11, 10, 4, 7), { s: 1, z: 1 }), S([[4, 26], [6, 19], [11, 17], [16, 19], [18, 26]], { s: 1 }), S(circle(22, 12, 3.2, 7), { s: 1, z: 1 }), S([[20, 18], [24, 18], [27, 21], [28, 26]], { s: 1 })],
  'i-info': [S(circle(16, 16, 11, 10), { s: 1, z: 1 }), S([[16, 15], [16, 23]]), S([[16, 10], [16, 10.6]])],
};

// Stickers on a 64-unit grid: a scalloped disc, a white ring, a white glyph.
const two = (x) => [S([[x, 27], [x + 6, 20], [x + 13, 26], [x + 1, 44]], { s: 1 }), S([[x + 1, 44], [x + 14, 44]])];
const STICKERS = {
  'st-tick': { fill: '#1f8f4e', glyph: [S([[19, 33], [24, 37], [29, 44], [36, 31], [46, 20]], { s: 1 })] },
  'st-one': { fill: '#e2711d', glyph: [S([[25, 27], [33, 19], [33, 46]])] },
  'st-two': { fill: '#2a63c9', glyph: two(24) },
  'st-three': { fill: '#d63c62', glyph: [S([[23, 22], [35, 18], [40, 26], [31, 32]], { s: 1 }), S([[31, 32], [41, 37], [36, 46], [23, 43]], { s: 1 })] },
  'st-star': { fill: '#f2b705', glyph: [S(star(32, 33, 17, 7.5), { z: 1, fill: '#fff' })], ink: '#8a5a00' },
  'st-ladder': { fill: '#12868a', glyph: [S([[24, 17], [22, 47]]), S([[40, 17], [42, 47]]), S([[24, 24], [40, 24]]), S([[23, 32], [41, 32]]), S([[23, 40], [41, 40]])] },
  'st-twenty': { fill: '#1c3d9e', glyph: [...two(14), S(circle(42, 33, 7, 10, 12), { s: 1, z: 1 })] },
};

export function sprite() {
  const rng = createRng(1955);
  let out = '<svg xmlns="http://www.w3.org/2000/svg">\n';
  for (const [id, strokes] of Object.entries(ICONS)) {
    const d = strokes.map((st) => rough(st.p, rng, st)).join('');
    out += `<symbol id="${id}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></symbol>\n`;
  }
  for (const [id, st] of Object.entries(STICKERS)) {
    const edge = rough(Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      const r = i % 2 ? 27.5 : 31;
      return [32 + Math.cos(a) * r, 32 + Math.sin(a) * r];
    }), rng, { s: 1, z: 1, amp: 0.2 });
    const ring = rough(circle(32, 32, 23.5, 14), rng, { s: 1, z: 1, amp: 0.4 });
    const glyph = st.glyph.map((g) => `<path d="${rough(g.p, rng, { ...g, amp: 0.6 })}" fill="${g.fill || 'none'}" stroke="${g.fill ? st.ink : '#fff'}" stroke-width="${g.fill ? 2 : 5}"/>`).join('');
    out += `<symbol id="${id}" viewBox="0 0 64 64" stroke-linecap="round" stroke-linejoin="round"><path d="${edge}" fill="${st.fill}"/><path d="${ring}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" stroke-dasharray="3 3"/>${glyph}</symbol>\n`;
  }
  return `${out}</svg>\n`;
}

/** A smooth track through points; `vertical` picks which way the bends go. */
export function track(points, vertical) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    d += vertical
      ? `C${x1} ${f((y1 + y2) / 2)} ${x2} ${f((y1 + y2) / 2)} ${x2} ${y2}`
      : `C${f((x1 + x2) / 2)} ${y1} ${f((x1 + x2) / 2)} ${y2} ${x2} ${y2}`;
  }
  return d;
}

export const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="9" fill="#fdfcf7"/><path d="M0 16h64M0 32h64M0 48h64M16 0v64M32 0v64M48 0v64" stroke="#bcd6e8" stroke-width="2"/><path d="M11 0v64" stroke="#e0424e" stroke-width="3"/><path d="M20 20l17 25M37 19L20 45" stroke="#1c3d9e" stroke-width="7" stroke-linecap="round"/><path d="M36 44l7 9 14-27" fill="none" stroke="#c21f2e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`;
