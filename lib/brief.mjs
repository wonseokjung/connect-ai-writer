// editorial brief: before any title or post, five things on one page.
// who reads it, what it is for, the claims that must stay (each one from the source), what material may be public,
// and the one next action the reader takes. plan prefills from it, write follows it, check can read it.
// The idea of a creative brief before writing is common editorial practice; the sections and the checks are ours.
import fs from 'node:fs';
import path from 'node:path';
import {numbersIn, sourceNumbers, quoteMatch, norm, directionClashes} from './check.mjs';

export const SECTIONS = [
  {key: 'reader', ko: '누가 읽나요', en: 'reader', hint: 'One kind of person, as specific as you can: what they do, what they already know, what they want.'},
  {key: 'purpose', ko: '무엇을 위한 글인가요', en: 'purpose', hint: 'One sentence: after reading, the reader knows / can do / feels ...'},
  {key: 'claims', ko: '꼭 지킬 내용', en: 'claims to keep', hint: 'The points every post must keep, one per line, each from the source (numbers exactly as in the source).', list: true},
  {key: 'public', ko: '공개해도 되는 것', en: 'what may be public', hint: 'Material you may show: your video frames, your page, numbers you said. Anything private stays out (names, prices you did not say, client work).', list: true},
  {key: 'next', ko: '다음 행동', en: 'next action', hint: 'The one thing the reader does next (watch the video, sign up, reply). One line.'},
];

export function briefTemplate({title}) {
  return `# Editorial brief: ${title}

<!-- Fill each section before plan and write. One page. Every post follows it.
     claims: one point per line, from the source; check fails a number that is not in the source. -->
${SECTIONS.map((s) => `
## ${s.en} (${s.ko})
<!-- ${s.hint} -->
${s.list ? '- ' : ''}`).join('\n')}
`;
}

export function parseBrief(md) {
  const out = {};
  let cur = null;
  for (const raw of md.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const h = raw.match(/^##\s+(.+)$/);
    if (h) { cur = SECTIONS.find((s) => h[1].toLowerCase().startsWith(s.en) || h[1].includes(s.ko)); if (cur) out[cur.key] = []; continue; }
    if (!cur) continue;
    const t = raw.replace(/^\s*[-*]\s*/, '').trim();
    if (t) out[cur.key].push(t);
  }
  return out;
}

export function checkBrief(md, source) {
  const b = parseBrief(md);
  const problems = [];
  for (const s of SECTIONS) if (!(b[s.key] || []).length) problems.push(`${s.en} (${s.ko}) is empty: ${s.hint}`);
  if ((b.next || []).length > 1) problems.push('next action: one action only, so the reader knows what to do.');
  const srcText = (source?.lines || []).map((l) => l.text).join('\n');
  const srcNums = sourceNumbers(srcText), srcNorm = norm(srcText);
  for (const c of b.claims || []) {
    for (const n of numbersIn(c)) if (!srcNums.has(n)) problems.push(`claim "${c.slice(0, 40)}": the number ${n} is not in your source.`);
    for (const x of directionClashes(c, srcText)) problems.push(`claim "${c.slice(0, 40)}": ${x.num} goes ${x.said} here, ${x.source} in your source.`);
    for (const q of [...c.matchAll(/"([^"]{6,})"/g)].map((m) => m[1])) if (quoteMatch(q, srcNorm) < 0.8) problems.push(`claim "${c.slice(0, 40)}": the quote is not your source's words.`);
  }
  return {brief: b, problems, ok: !problems.length};
}

export const briefFile = (runDir) => path.join(runDir, 'editorial-brief.md');
export function startBrief(runDir) {
  const f = briefFile(runDir);
  if (fs.existsSync(f)) return {file: f, made: false};
  const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
  fs.writeFileSync(f, briefTemplate({title: run.title}));
  return {file: f, made: true};
}
export function readBrief(runDir) {
  const f = briefFile(runDir);
  return fs.existsSync(f) ? parseBrief(fs.readFileSync(f, 'utf8')) : null;
}

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// editorial-brief.html: the one page, as the writer sees it, with the check on top
export function briefHtml({title, result}) {
  const b = result.brief;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Editorial brief: ${esc(title)}</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#0b0a08;color:#f4eee4;font:15px/1.6 -apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;word-break:keep-all}
.w{max-width:860px;margin:0 auto;padding:40px 16px 70px}.k{color:#D6892A;letter-spacing:.16em;font-size:12px}.h{font-family:'Noto Serif KR',AppleMyungjo,serif;font-size:32px;font-weight:600;line-height:1.3;margin:8px 0 6px}
.st{font-size:13px;margin:0 0 26px}.ok{color:#8fd19e}.bad{color:#ff8a7a}.g{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:600px){.g{grid-template-columns:1fr}.h{font-size:26px}}
.c{background:#15120d;border:1px solid #2a241b;border-radius:12px;padding:16px 18px}.c.wide{grid-column:1/-1}.c b{display:block;color:#D6892A;font-size:12px;letter-spacing:.12em;font-weight:600;margin-bottom:2px}.c i{display:block;color:#8a8378;font-style:normal;font-size:12px;margin-bottom:8px}
.c li{list-style:none;padding:5px 0;border-top:1px solid #241f17}.c li:first-child{border-top:0}.next{font-family:'Noto Serif KR',AppleMyungjo,serif;font-size:20px}.p li{color:#ff8a7a;list-style:none;margin:4px 0}
</style></head><body><div class="w"><div class="k">CONNECT AI WRITER · EDITORIAL BRIEF</div><div class="h">${esc(title)}</div>
<div class="st">${result.ok ? '<span class="ok">brief ok: every section filled, every number and up/down word matches the source</span>' : `<span class="bad">${result.problems.length} to fix</span><ul class="p">${result.problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`}</div>
<div class="g">${SECTIONS.map((s) => `<div class="c${s.list || s.key === 'next' ? ' wide' : ''}"><b>${esc(s.en.toUpperCase())}</b><i>${esc(s.ko)}</i>${s.key === 'next' ? `<div class="next">${esc((b[s.key] || [])[0] || '')}</div>` : `<ul>${(b[s.key] || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`}</div>`).join('')}</div></div></body></html>
`;
}
