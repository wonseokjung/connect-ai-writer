// voice: a voice sheet from YOUR OWN transcripts (lives, lectures, Shorts). Counts, not guesses:
// how you end sentences, how you start them, the words you lean on, and the AI-sounding words you never say.
// The sheet is plain markdown; your agent reads it before writing, and `check` warns on the "never" words.
import fs from 'node:fs';
import path from 'node:path';
import {parseSubtitles, parseText} from './source.mjs';

const KO_ENDINGS = [
  ['거든요', '~거든요 (giving the reason)'], ['잖아요', '~잖아요 (we both know it)'], ['더라고요', '~더라고요 (what I found out)'],
  ['는데요', '~는데요 (setting up the next line)'], ['거예요', '~거예요 (explaining)'], ['거죠', '~거죠'], ['볼까요', '~볼까요? (let us try)'],
  ['겠습니다', '~겠습니다'], ['습니다', '~습니다 (formal)'], ['니다', '~니다 (formal)'], ['세요', '~세요 (inviting)'], ['까요', '~까요?'],
  ['네요', '~네요'], ['군요', '~군요'], ['래요', '~래요'], ['대요', '~대요'], ['죠', '~죠'], ['요', '~요 (해요체, other)'], ['다', '~다 (plain)'],
];
const KO_STOP = new Set(['이거', '그거', '저거', '이게', '그게', '이런', '그런', '저런', '이렇게', '그렇게', '이제', '그냥', '좀', '막', '뭐', '어', '음', '아', '네', '예', '이', '그', '저', '것', '거', '수', '때', '더', '또', '잘', '안', '못', '다', '한', '할', '하는', '하고', '해서', '있는', '있어요', '있습니다', '없는', '같은', '여기', '거기', '저기', '여기에', '거를', '이거를', '그래서', '그리고', '그러면', '근데', '자', '일단', '진짜', '정말', '되게', '굉장히', '너무', '엄청', '하면', '되는', '하는데', '건데', '거예요', '거든요', '거죠', '잖아요', '있고', '있는데', '해요', '합니다', '하나', '어떤', '어떻게', '이것', '그것', '제가', '저는', '저희', '여러분', '여러분들', '우리', '내가', '저의', '제', '내', '뭔가', '많이', '다시', '계속', '바로', '같이', '먼저', '보면', '보시면', '하시면', '그럼']);
const INTENS = ['굉장히', '진짜', '정말', '되게', '엄청', '너무', '완전', '무조건', '무궁무진'];
const SELF = ['제가', '저는', '저 같은 경우', '저희', '내가', '나는'];
const YOU = ['여러분들', '여러분', '대표님들', '우리'];
const EN_STOP = new Set('the a an and or but to of in on for with is are was were be it this that i you we they he she my your our at as so if then just very really there here have has do did not no yes can will would could what how why when about from by'.split(' '));

function readLines(files) {
  const out = [];
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const lines = /\.(srt|vtt)$/i.test(f) ? parseSubtitles(t) : parseText(t);
    out.push(...lines.map((l) => l.text.replace(/\[[^\]]*\]/g, '').trim()).filter(Boolean));
  }
  return out;
}

const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
const isKo = (lines) => { const s = lines.join(''); return (s.match(/[가-힣]/g) || []).length > (s.match(/[A-Za-z]/g) || []).length; };

export function analyze(lines, banned) {
  const ko = isKo(lines);
  const ends = new Map(), opens = new Map(), words = new Map(), counts = {};
  const samples = [];
  let prevEnded = true, sentences = 0, chars = 0;
  const all = lines.join(' ');
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    const toks = line.split(' ').filter(Boolean);
    if (!toks.length) continue;
    if (prevEnded) { const o = toks[0].replace(/[,.?!]/g, ''); if (o && !['어', '음', '아', '네'].includes(o)) bump(opens, ko ? o : o.toLowerCase()); }
    const last = toks[toks.length - 1].replace(/[,.?!~]+$/, '');
    let ended = false;
    if (ko) {
      const hit = KO_ENDINGS.find(([e]) => last.endsWith(e));
      if (hit && /[요다죠까]$/.test(last)) { bump(ends, hit[1]); ended = true; sentences++; chars += line.length; if (line.length >= 12 && line.length <= 48 && samples.length < 400) samples.push({line, end: hit[1]}); }
    } else if (/[.?!]$/.test(toks[toks.length - 1])) { ended = true; sentences++; chars += line.length; if (line.length >= 25 && line.length <= 110) samples.push({line, end: ''}); }
    prevEnded = ended;
    for (const t of toks) {
      const w = t.replace(/[^\p{L}\p{N}]/gu, '');
      if (ko ? w.length >= 2 && !KO_STOP.has(w) && /[가-힣]/.test(w) : w.length >= 3 && !EN_STOP.has(w.toLowerCase())) bump(words, ko ? w : w.toLowerCase());
    }
  }
  for (const w of [...INTENS, ...SELF, ...YOU]) counts[w] = (all.match(new RegExp(w, 'g')) || []).length;
  // "never": AI-sounding phrases from banned.json that do not appear in your own transcripts at all
  const lists = banned[ko ? 'ko' : 'en'] || {};
  const lower = all.toLowerCase().replace(/\s+/g, '');
  const never = [...(lists.banned || []), ...(lists.watch || [])].filter((p) => !lower.includes(p.toLowerCase().replace(/\s+/g, '')));
  const used = [...(lists.watch || [])].filter((p) => lower.includes(p.toLowerCase().replace(/\s+/g, '')));
  // samples: spread over the top endings, no repeats
  const topEnds = top(ends, 6).map(([e]) => e);
  const pick = [];
  for (let r = 0; pick.length < 14 && r < 6; r++) for (const e of topEnds) { const s = samples.filter((x) => x.end === e && !pick.includes(x.line))[r * 3]; if (s && pick.length < 14) pick.push(s.line); }
  if (!ko) for (const s of samples) if (pick.length < 14 && !pick.includes(s.line)) pick.push(s.line);
  return {ko, lines: lines.length, sentences, avg: sentences ? Math.round(chars / sentences) : 0, ends: top(ends, 12), opens: top(opens, 14), words: top(words, 40), counts, never, used, samples: pick};
}

export function voiceSheet(a, {name = 'you', files = []} = {}) {
  const pct = (n) => (a.sentences ? Math.round((n * 100) / a.sentences) : 0);
  const youWord = a.ko ? ['여러분들', '여러분', '대표님들'].sort((x, y) => a.counts[y] - a.counts[x])[0] : 'you';
  const inten = INTENS.filter((w) => a.counts[w]).sort((x, y) => a.counts[y] - a.counts[x]).slice(0, 4);
  const lines = [];
  lines.push(`# Voice sheet: ${name}`, '');
  lines.push(`Made by connect-ai-writer from ${files.length} of ${name === 'you' ? 'your' : name + "'s"} own transcript file(s): ${a.lines} lines, ${a.sentences} finished sentences, about ${a.avg} characters per sentence.`);
  lines.push('Write the way these numbers say you talk. Your own lines below beat any rule.', '');
  lines.push('## How you end sentences', '', '| ending | share |', '|---|---|', ...a.ends.map(([e, n]) => `| ${e} | ${pct(n)} % (${n}) |`), '');
  lines.push('## How you start them', '', a.opens.map(([o, n]) => `${o} (${n})`).join(', '), '');
  if (a.ko) {
    lines.push('## Who is talking, to whom', '', SELF.concat(YOU).filter((w) => a.counts[w]).map((w) => `${w} ${a.counts[w]}`).join(', '), '');
    lines.push('## Words that make it stronger', '', INTENS.filter((w) => a.counts[w]).map((w) => `${w} ${a.counts[w]}`).join(', ') || 'none', '');
  }
  lines.push('## Words you use a lot', '', a.words.map(([w, n]) => `${w} ${n}`).join(', '), '');
  lines.push('## Your own lines (word for word)', '', ...a.samples.map((s) => `- ${s}`), '');
  lines.push('## Never (AI-sounding, and not once in your transcripts)', '', a.never.join(', ') || 'none', '');
  if (a.used.length) lines.push('', `You do say these, so they are fine for you: ${a.used.join(', ')}`, '');
  lines.push(`<!-- never: ${a.never.join(', ')} -->`, '');
  lines.push('## Five-line brief for the writer', '', '```');
  if (a.ko) {
    const e = a.ends.filter(([x]) => !x.startsWith('~요 (') && !x.startsWith('~다 (')).slice(0, 5).map(([x]) => x.split(' ')[0]);
    lines.push(`Write as ${name}, first person (${SELF.filter((w) => a.counts[w]).slice(0, 2).join(', ') || '제가'}), talking to ${youWord}.`);
    lines.push(`End sentences the way they do: ${e.join(', ')}. Mix them, no ending three times in a row.`);
    lines.push(`Start lines with their openers: ${a.opens.slice(0, 6).map(([o]) => o).join(', ')}.`);
    lines.push(`Sentences about ${a.avg} characters. ${inten.length ? 'Strong words they use: ' + inten.join(', ') + ' (one per paragraph at most).' : ''}`);
    lines.push('No AI phrases from the never list, no emoji, no corner brackets, no long dash. Only what they said.');
  } else {
    lines.push(`Write as ${name}, first person, talking to "you". About ${a.avg} characters per sentence.`);
    lines.push(`Start lines the way they do: ${a.opens.slice(0, 6).map(([o]) => o).join(', ')}.`);
    lines.push(`Words they lean on: ${a.words.slice(0, 8).map(([w]) => w).join(', ')}.`);
    lines.push('Short, spoken, warm. No marketing words from the never list, no emoji, no long dash.');
    lines.push('Only what they said or wrote.');
  }
  lines.push('```', '');
  return lines.join('\n');
}

export function buildVoice(files, {banned, name}) {
  const list = files.map((f) => path.resolve(f));
  for (const f of list) if (!fs.existsSync(f)) throw new Error('not found: ' + f);
  const lines = readLines(list);
  if (lines.length < 30) throw new Error(`Only ${lines.length} lines. Give more of your own transcripts (a few lives or lectures) for a real voice sheet.`);
  const a = analyze(lines, banned);
  return {analysis: a, markdown: voiceSheet(a, {name, files: list})};
}
