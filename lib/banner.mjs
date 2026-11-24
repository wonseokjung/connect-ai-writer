// The terminal banner: CONNECT AI LAB in block letters with a color gradient, then who made it and why.
const FONT = {
  C: [' ██████╗', '██╔════╝', '██║     ', '██║     ', '╚██████╗', ' ╚═════╝'],
  O: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  N: ['███╗   ██╗', '████╗  ██║', '██╔██╗ ██║', '██║╚██╗██║', '██║ ╚████║', '╚═╝  ╚═══╝'],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  T: ['████████╗', '╚══██╔══╝', '   ██║   ', '   ██║   ', '   ██║   ', '   ╚═╝   '],
  A: [' █████╗ ', '██╔══██╗', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  I: ['██╗', '██║', '██║', '██║', '██║', '╚═╝'],
  L: ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
  B: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██████╔╝', '╚═════╝ '],
  ' ': ['  ', '  ', '  ', '  ', '  ', '  '],
};
const STOPS = [[214, 137, 42], [242, 180, 90], [255, 112, 102], [214, 92, 230], [110, 140, 255], [70, 215, 255]];

export const colorOn = () => !process.env.NO_COLOR && (!!process.env.FORCE_COLOR || !!process.stdout.isTTY);
const rgb = ([r, g, b], t) => colorOn() ? `\x1b[38;2;${r};${g};${b}m${t}\x1b[0m` : t;
const bold = (t) => colorOn() ? `\x1b[1m${t}\x1b[0m` : t;
const dim = (t) => colorOn() ? `\x1b[2m${t}\x1b[0m` : t;
function at(x) {
  const p = Math.max(0, Math.min(1, x)) * (STOPS.length - 1), i = Math.min(Math.floor(p), STOPS.length - 2), f = p - i;
  return STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * f));
}
function block(word) {
  const rows = Array.from({length: 6}, (_, r) => [...word].map((ch) => (FONT[ch] || FONT[' '])[r]).join(''));
  const w = Math.max(...rows.map((r) => [...r].length));
  return rows.map((row) => [...row].map((ch, x) => (ch === ' ' ? ' ' : rgb(at(x / w), ch))).join(''));
}
export const gold = (t) => rgb(STOPS[0], t);
export const dimmed = dim;
export const tint = (i, n, t) => rgb(at(n > 1 ? i / (n - 1) : 0), t);

export function banner(cols = process.stdout.columns || +process.env.COLUMNS || 80) {
  const lines = [''];
  const wide = cols >= 108;
  for (const word of wide ? ['CONNECT AI LAB'] : ['CONNECT', 'AI LAB']) for (const r of block(word)) lines.push('  ' + r);
  lines.push('');
  lines.push('  ' + bold('by AI Mentor Jay') + dim('   ·   ') + [...'AI education for everyone'].map((c, i, a) => rgb(at(i / a.length), c)).join('') + dim('   ·   모두를 위한 AI 교육'));
  lines.push('');
  return lines.join('\n');
}
