// humanize: mark what makes writing sound like an AI (Korean translationese and stock phrases, English tells),
// measure rhythm (sentence lengths, one ending over and over, mixed speech levels), and, with --after,
// prove the rewrite kept every number and quote and dropped the tells. Your agent does the rewriting in your voice.
// Process (mark -> rewrite -> audit facts -> final) after blader/humanizer (MIT); Korean kinds after nathankim0/humanize-korean (MIT).
// The patterns themselves are ours, in humanize.json.
import fs from 'node:fs';
import path from 'node:path';
import {pick} from './config.mjs';
import {numbersIn, directionClashes} from './check.mjs';

export function loadPatterns(dir = process.cwd()) {
  const f = pick('humanize.json', [dir]);
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const compile = (list, flags) => (list || []).map((p) => ({...p, rx: new RegExp(p.re, flags)}));
  return [...compile(j.ko, 'gu'), ...compile(j.en, 'giu'), ...compile(j.any, 'gu')];
}

const WEIGHT = {strong: 3, medium: 1};
export const splitSentences = (t) => t.replace(/\r/g, '').split(/(?<=[.!?。])\s+|\n+/).map((s) => s.trim()).filter((s) => s.replace(/[#*>\-\s]/g, '').length > 1);

// Korean speech level of a sentence: 합니다 (formal), 해요 (polite), 한다 (plain)
export function register(s) {
  const e = s.replace(/[\s"'”’)\]]+$/, '').replace(/[.!?。]+$/, '');
  if (/(습니다|습니까|ㅂ니다|입니다|됩니다|합니다|십시오)$/.test(e)) return 'formal';
  if (/(요|죠|세요|에요|예요|래요|네요|거든요|잖아요)$/.test(e)) return 'polite';
  if (/(다|까|라|자|냐|지)$/.test(e) && /[가-힣]$/.test(e)) return 'plain';
  return null;
}

// Text inside double quotes on one line ("..." or “...”) is a quote or an example, not your own sentence.
export function quotedRanges(line) {
  return [...line.matchAll(/"[^"\n]+"|“[^”\n]+”/g)].map((m) => [m.index, m.index + m[0].length]);
}
const inside = (ranges, a, b) => ranges.some(([s, e]) => a >= s && b <= e);

// own: the text of your voice sheet. A marked phrase you really say (it is in your sheet) is yours, not a tell.
// A mark inside quotes goes to `quoted` (shown, not counted), so a quoted example or someone's real words is not a FIX.
export function analyze(text, {patterns = loadPatterns(), never = [], own = ''} = {}) {
  const findings = [], quoted = [];
  const lines = text.replace(/\r/g, '').split('\n');
  const qr = lines.map(quotedRanges);
  for (const p of patterns) {
    const hits = [];
    lines.forEach((l, i) => { for (const m of l.matchAll(p.rx)) if (!(own && m[0].trim().length >= 2 && /[가-힣a-z]/i.test(m[0]) && own.includes(m[0].trim()))) hits.push({line: i + 1, col: m.index + 1, match: m[0].trim(), q: inside(qr[i], m.index, m.index + m[0].length)}); });
    const counted = hits.filter((h) => !h.q);
    for (const {q, ...h} of hits.filter((x) => x.q)) quoted.push({...h, id: p.id, family: p.family, severity: 'quoted', hint: 'quoted (not counted)'});
    if (counted.length && counted.length >= (p.minCount || 1)) for (const {q, ...h} of counted) findings.push({...h, id: p.id, family: p.family, severity: p.severity, hint: p.hint});
  }
  for (const w of never.filter(Boolean)) lines.forEach((l, i) => { const at = l.indexOf(w); if (at >= 0) findings.push({line: i + 1, col: at + 1, match: w, id: 'voice-never', family: 'not your word', severity: 'strong', hint: 'Your voice sheet says you never use this.'}); });

  const sents = splitSentences(text.replace(/^#.*$/gm, ''));
  const lens = sents.map((s) => [...s].length);
  const mean = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, lens.length));
  const regs = sents.map(register);
  const count = {formal: 0, polite: 0, plain: 0};
  for (const r of regs) if (r) count[r]++;
  const known = count.formal + count.polite + count.plain;
  const rhythm = [];
  if (sents.length >= 6 && mean > 12 && sd / mean < 0.3) rhythm.push({id: 'flat-rhythm', family: '리듬 / rhythm', severity: 'medium', hint: `Sentences are all about the same length (${Math.round(mean)} letters, spread ${Math.round((sd / mean) * 100)} %). Mix a very short one with a longer one.`});
  let run = 1, worst = 1, worstEnd = '';
  for (let i = 1; i < sents.length; i++) {
    const a = sents[i - 1].replace(/[.!?。\s]+$/, '').slice(-3), b = sents[i].replace(/[.!?。\s]+$/, '').slice(-3);
    run = a === b && /[가-힣]/.test(b) ? run + 1 : 1;
    if (run > worst) { worst = run; worstEnd = b; }
  }
  if (worst >= 4) rhythm.push({id: 'same-ending', family: '리듬 / rhythm', severity: 'medium', hint: `${worst} sentences in a row end with "${worstEnd}". Change a few endings.`});
  const levels = Object.entries(count).filter(([, n]) => known && n / known >= 0.2);
  if (known >= 5 && levels.length >= 2) rhythm.push({id: 'mixed-register', family: '말투 / speech level', severity: 'medium', hint: `Mixed speech levels: ${levels.map(([k, n]) => `${{formal: '합니다', polite: '해요', plain: '한다'}[k]} ${n}`).join(', ')}. Pick the one you speak in.`});

  const chars = [...text].length;
  const weight = findings.reduce((a, f) => a + WEIGHT[f.severity], 0) + rhythm.reduce((a, f) => a + WEIGHT[f.severity], 0);
  const per1k = Math.round((weight / Math.max(1, chars)) * 1000 * 10) / 10;
  return {findings, quoted, rhythm, stats: {chars, sentences: sents.length, meanLength: Math.round(mean), spread: mean ? Math.round((sd / mean) * 100) : 0, registers: count}, score: per1k, grade: per1k <= 2 ? 'sounds like a person' : per1k <= 8 ? 'some tells' : 'sounds written by an AI'};
}

const quotesIn = (t) => [...t.matchAll(/"([^"]{4,})"|“([^”]{4,})”/g)].map((m) => m[1] || m[2]);
const namesIn = (t) => new Set((t.match(/\b[A-Z][A-Za-z0-9.+-]{2,}\b|\b[A-Za-z]+[0-9]+[A-Za-z0-9]*\b/g) || []).filter((w) => !/^(The|This|That|It|In|And|But|So|We|You|They|He|She|What|When|How|Why|If|Or|For|To|On|At|Of|As|By|An|With|From|Moreover|Furthermore|Additionally|Ultimately|Importantly|Here|There|Let)$/.test(w)));

// before vs after: every number, quote and name kept? tells gone?
export function compare(before, after, opts = {}) {
  const A = analyze(before, opts), B = analyze(after, opts);
  const lost = [];
  const nb = numbersIn(before), na = numbersIn(after);
  for (const n of nb) if (!na.has(n)) lost.push({kind: 'number', value: n});
  for (const n of na) if (!nb.has(n)) lost.push({kind: 'new number', value: n});
  for (const q of quotesIn(before)) if (!after.replace(/\s+/g, ' ').includes(q.replace(/\s+/g, ' '))) lost.push({kind: 'quote', value: q});
  const na2 = namesIn(after);
  for (const w of namesIn(before)) if (!na2.has(w)) lost.push({kind: 'name', value: w});
  // the same number now going the other way (늘었다 -> 줄었다, more -> less) is a changed fact
  for (const c of directionClashes(after, before)) lost.push({kind: 'direction', value: `${c.num} ${c.source} -> ${c.said}`});
  return {before: A, after: B, lost, kept: !lost.length, better: B.score < A.score};
}

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function marked(text, findings) {
  const byLine = {};
  for (const f of findings) (byLine[f.line] ||= []).push(f);
  return text.replace(/\r/g, '').split('\n').map((l, i) => {
    const fs_ = (byLine[i + 1] || []).slice().sort((a, b) => a.col - b.col);
    let out = '', at = 0;
    for (const f of fs_) {
      const s = f.col - 1;
      if (s < at) continue;
      out += esc(l.slice(at, s)) + `<mark class="${f.severity}" title="${esc(f.family + ': ' + f.hint)}">${esc(l.slice(s, s + f.match.length))}</mark>`;
      at = s + f.match.length;
    }
    return out + esc(l.slice(at));
  }).map((l) => (l ? `<p>${l}</p>` : '')).join('');
}

export function humanizeHtml({file, text, result, afterText, cmp}) {
  const side = (title, t, r) => `<section><div class="head"><span>${title}</span><b>${r.score}</b><small>${esc(r.grade)} · ${r.findings.length + r.rhythm.length} marks · per 1,000 letters</small></div><div class="body">${marked(t, [...r.findings, ...(r.quoted || [])])}</div>${r.rhythm.map((x) => `<p class="rh">${esc(x.hint)}</p>`).join('')}</section>`;
  const families = {};
  for (const f of result.findings) families[f.family] = (families[f.family] || 0) + 1;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Humanize ${esc(path.basename(file))}</title>
<style>
:root{--bg:#0b0a08;--fg:#f3ede2;--mute:#9a9183;--gold:#D6892A;--line:#2a251e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.75 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;word-break:keep-all}
main{max-width:1180px;margin:0 auto;padding:52px 24px 70px}.k{color:var(--gold);letter-spacing:.2em;font-size:12px;text-transform:uppercase}
h1{font-family:"Bodoni 72","Didot","Noto Serif KR",serif;font-weight:500;font-size:40px;margin:8px 0 22px}
.grid{display:grid;grid-template-columns:${afterText ? '1fr 1fr' : '1fr'};gap:22px}
section{border:1px solid var(--line);padding:22px 24px;background:#0f0d0a}
.head{display:flex;align-items:baseline;gap:12px;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:12px}.head span{letter-spacing:.18em;font-size:12px;color:var(--mute);text-transform:uppercase}
.head b{font-family:"Bodoni 72",serif;font-size:38px;color:var(--gold);font-weight:500}.head small{color:var(--mute)}
.body p{margin:0 0 10px}mark{background:rgba(255,120,80,.18);color:#ffb59c;border-bottom:2px solid #ff7a50;border-radius:2px;padding:0 1px}mark.medium{background:rgba(214,137,42,.14);color:#f2c58a;border-bottom-color:var(--gold)}mark.quoted{background:none;color:inherit;border-bottom:1px dashed var(--mute)}
.rh{color:#f2c58a;font-size:14px;border-left:2px solid var(--gold);padding-left:10px}
.audit{margin-top:22px;padding:16px 20px;border:1px solid var(--line)}.audit b{color:var(--gold)}.bad{color:#ff8a65}
.fam span{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:2px 12px;margin:0 6px 6px 0;font-size:13px}
@media(max-width:760px){.grid{grid-template-columns:1fr}h1{font-size:30px}main{padding:34px 16px}}
</style></head><body><main><div class="k">connect-ai-writer · humanize</div><h1>${afterText ? 'Before / after' : 'What sounds like an AI'}</h1>
<div class="fam">${Object.entries(families).map(([k, n]) => `<span>${esc(k)} ${n}</span>`).join('')}</div>
<div class="grid">${side('before', text, result)}${afterText ? side('after', afterText, cmp.after) : ''}</div>
${cmp ? `<div class="audit">${cmp.kept ? '<b>Facts kept.</b> Every number, quote and name in the first text is in the rewrite, and nothing new was added.' : `<span class="bad">Changed facts:</span> ${cmp.lost.map((l) => esc(l.kind + ' ' + l.value)).join(', ')}`} · score ${cmp.before.score} → ${cmp.after.score}</div>` : ''}
</main></body></html>`;
}

export function reportLines(r) {
  const out = [];
  for (const f of r.findings.slice(0, 40)) out.push(`${f.severity === 'strong' ? 'FIX ' : 'LOOK'} line ${f.line}: "${f.match}" (${f.family}) ${f.hint}`);
  for (const f of r.rhythm) out.push(`LOOK ${f.hint}`);
  for (const f of (r.quoted || []).slice(0, 12)) out.push(`QUOTE line ${f.line}: "${f.match}" (${f.family}) quoted (not counted)`);
  return out;
}
