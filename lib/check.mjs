// check: before anything goes out. Every finding is one plain sentence with what to do.
// Numbers and quotes must be in your source; limits, AI-sounding phrases, emoji, corner brackets, em dashes, and no-picture posts.
import {imageWords} from './postfile.mjs';

// X weighted length (twitter-text v3 weights): most Latin counts 1, Hangul / CJK / emoji count 2, a link counts 23.
// Same as connect-ai-marketer's xcount (CONNECT AI LAB, MIT).
const LIGHT = [[0x0000, 0x10ff], [0x2000, 0x200d], [0x2010, 0x201f], [0x2032, 0x2037]];
const URL_RE = /https?:\/\/[^\s]+/g;
export function xLength(text) {
  let n = 0;
  const urls = text.match(URL_RE) || [];
  for (const ch of text.replace(URL_RE, '')) {
    const cp = ch.codePointAt(0);
    n += LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
  }
  return n + urls.length * 23;
}
export const length = (text, count) => (count === 'x-weighted' ? xLength(text) : [...text].length);

export const norm = (s) => s.toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[\s\p{P}\p{S}]+/gu, '');

const KO_NUM = {한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 석: 3, 네: 4, 넷: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10, 스무: 20, 스물: 20, 서른: 30, 마흔: 40, 쉰: 50, 백: 100, 천: 1000, 만: 10000};
const COUNTER = '(?:명|개|가지|번|강|시간|분|초|살|달|주|배|장|편|권|잔|회|군데|마리)';
export function numbersIn(text) {
  // links, code, version numbers, list markers ("1. ") and thread counters ("1/5") are not facts
  const t = text.replace(URL_RE, ' ').replace(/`[^`]*`/g, ' ').replace(/@\d+(\.\d+)*/g, ' ').replace(/^\s*\d+[.)]\s/gm, ' ').replace(/^\s*\d+\s*\/\s*\d+\s*$/gm, ' ');
  const out = new Set();
  for (const m of t.matchAll(/\d+(?:,\d{3})*(?:\.\d+)?/g)) out.add(m[0].replace(/,/g, '').replace(/\.0+$/, ''));
  return out;
}
export function sourceNumbers(text) {
  const s = numbersIn(text);
  for (const [w, v] of Object.entries(KO_NUM)) if (new RegExp(`(^|\\s)${w}\\s?${COUNTER}`).test(text)) s.add(String(v));
  // time stamps in the source are not facts the post can use, so they are left out on purpose
  return s;
}

function bigrams(s) {
  const m = new Map();
  for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); }
  return m;
}
function dice(a, b) {
  const A = bigrams(a), B = bigrams(b);
  let inter = 0, total = 0;
  for (const [g, n] of A) { inter += Math.min(n, B.get(g) || 0); total += n; }
  for (const n of B.values()) total += n;
  return total ? (2 * inter) / total : 0;
}
// how close a quote is to the source: 1 = word for word
export function quoteMatch(quote, srcNorm) {
  const q = norm(quote);
  if (!q) return 0;
  if (srcNorm.includes(q)) return 1;
  let best = 0;
  const L = q.length;
  for (let i = 0; i + L <= srcNorm.length + 4; i += 2) best = Math.max(best, dice(q, srcNorm.slice(i, i + L + 2)));
  return best;
}

const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;
const CORNER = /[「」『』]/;
const DASH = /[—―]/;

export function checkPost({key, post, platform, source, rules, banned, never = []}) {
  const F = [];
  const add = (rule, part, message, fix = '') => {
    const level = rules[rule] || 'fail';
    if (level === 'off') return;
    F.push({platform: key, rule, level, part, message, fix});
  };
  const srcText = source.lines.map((l) => l.text).join('\n');
  const srcNorm = norm(srcText);
  const srcNums = sourceNumbers(srcText);
  for (const n of rules.allowNumbers || []) srcNums.add(String(n));
  const where = (i) => (platform.kind === 'chain' ? `post ${i + 1}` : platform.kind === 'article' ? 'the article' : 'the post');

  if (post.placeholder) add('placeholder', null, `${platform.name}: post.md is still the empty template.`, 'Write the post (or let your agent write it), then run build again.');
  if (!post.parts.length) { add('placeholder', null, `${platform.name}: post.md has no text.`, 'Write the post first.'); return F; }
  if (platform.kind === 'article' && !post.title) add('limits', null, `${platform.name}: no title.`, 'Put "# Your title" on the first line.');

  const totalImages = post.parts.reduce((a, p) => a + p.images.length, 0);
  if (totalImages === 0) add('noImages', null, `${platform.name}: there is no picture in this post.`, 'Add at least one [image: ...] line (a frame, a quote card, a stat card, a diagram or your page).');
  else if (totalImages < (platform.minImages || 1)) add('noImages', null, `${platform.name}: ${totalImages} picture(s); this platform reads better with at least ${platform.minImages}.`, 'Add a picture between paragraphs.');
  if (platform.kind === 'chain' && post.parts[0].images.length === 0 && totalImages) add('firstPartImage', 0, `${platform.name}: the first post has no picture, and the first post is the one people see.`, 'Move your best picture to the first post.');
  if (platform.kind === 'chain' && platform.maxParts && post.parts.length > platform.maxParts) add('limits', null, `${platform.name}: ${post.parts.length} posts in the thread; keep it to ${platform.maxParts}.`, 'Join or cut posts.');

  const tagMax = platform.tags?.max ?? 30;
  if (post.tags.length > tagMax) add('limits', null, `${platform.name}: ${post.tags.length} tags; the limit here is ${tagMax}.`, `Keep the best ${tagMax}.`);

  post.parts.forEach((p, i) => {
    const last = i === post.parts.length - 1;
    let text = p.text;
    if (last && post.tags.length && ['hashtag', 'topic'].includes(platform.tags?.style)) text += '\n\n' + post.tags.slice(0, tagMax).map((t) => '#' + t.replace(/\s+/g, '')).join(' ');
    const n = length(text, platform.count);
    if (platform.kind !== 'article' && n > platform.maxChars) add('limits', i, `${platform.name} ${where(i)}: ${n} ${platform.count === 'x-weighted' ? 'weighted characters (Korean letters count 2)' : 'characters'}; the limit is ${platform.maxChars}.`, `Cut ${n - platform.maxChars}.`);
    if (platform.kind === 'article') {
      const total = length(post.parts.map((x) => x.text).join('\n'), 'chars');
      if (total > platform.maxChars) add('limits', i, `${platform.name}: ${total} characters, over ${platform.maxChars}.`, 'Split it into two articles.');
      if (platform.minChars && total < platform.minChars) add('watchPhrases', i, `${platform.name}: ${total} characters; a blog post usually reads better from ${platform.minChars}.`, 'Add one more part from the source (only what is in it).');
    }
    if (p.images.length > platform.maxImages) add('limits', i, `${platform.name} ${where(i)}: ${p.images.length} pictures; up to ${platform.maxImages}.`, `Keep ${platform.maxImages}.`);

    const all = [p.text, ...p.images.map(imageWords), ...(i === 0 ? [post.title, ...post.tags] : [])].join('\n');
    const lower = all.toLowerCase();
    for (const num of numbersIn(all)) if (!srcNums.has(num)) add('numbersInSource', i, `${platform.name} ${where(i)}: the number ${num} is not in your source.`, 'Use only numbers you said or wrote, or take it out.');
    for (const d of p.images) {
      if (d.kind === 'quote') {
        const m = quoteMatch(d.text, srcNorm);
        if (m < 0.8) add('quotesInSource', i, `${platform.name} ${where(i)}: the quote card "${d.text.slice(0, 40)}" is not in your source.`, 'A quote card uses your exact words. Copy the line from source.txt.');
        else if (m < 1) add('quotesInSource', i, `${platform.name} ${where(i)}: the quote card "${d.text.slice(0, 40)}" is close to your words but not the same (${Math.round(m * 100)} %).`, 'Copy it word for word from source.txt, or keep it if you only tidied it.');
      }
      if (d.kind === 'gen') add('generatedImages', i, `${platform.name} ${where(i)}: a generated picture ("${(d.prompt || '').slice(0, 40)}").`, 'Only if you are fine with an AI picture here. Never a person, a screenshot or a number.');
      if (!['frame', 'quote', 'stat', 'title', 'steps', 'page', 'file', 'gen'].includes(d.kind)) add('limits', i, `${platform.name} ${where(i)}: unknown picture kind "${d.kind}".`, 'Use frame, quote, stat, title, steps, page or file.');
      if (d.kind === 'frame' && !d.at) add('limits', i, `${platform.name} ${where(i)}: a frame needs a time, like [image: frame 03:12].`, 'Add the time.');
    }
    const lists = [banned.ko || {}, banned.en || {}];
    for (const L of lists) {
      for (const ph of L.banned || []) if (lower.includes(ph.toLowerCase()) && !srcNorm.includes(norm(ph))) add('bannedPhrases', i, `${platform.name} ${where(i)}: "${ph}" sounds like an AI wrote it.`, 'Say it the way you would say it out loud.');
      for (const ph of L.watch || []) if (lower.includes(ph.toLowerCase()) && !srcNorm.includes(norm(ph))) add('watchPhrases', i, `${platform.name} ${where(i)}: "${ph}" often sounds written, not spoken.`, 'Keep it only if you really talk like that.');
    }
    const listed = new Set(lists.flatMap((L) => [...(L.banned || []), ...(L.watch || [])]));
    for (const w of never) if (w && !listed.has(w) && lower.includes(w.toLowerCase())) add('watchPhrases', i, `${platform.name} ${where(i)}: "${w}" is on your voice sheet as a word you never use.`, 'Swap it for your own word.');
    for (const L of Object.values(rules.claims || {})) for (const c of L) if (lower.includes(c.toLowerCase()) && !srcText.toLowerCase().includes(c.toLowerCase())) add('claimWords', i, `${platform.name} ${where(i)}: "${c}" is a strong claim that is not in your source.`, 'Take it out, or say only what you said.');
    if (EMOJI.test(all)) add('emoji', i, `${platform.name} ${where(i)}: has an emoji.`, 'Take it out (or turn the emoji rule off in rules.json).');
    if (CORNER.test(all)) add('cornerBrackets', i, `${platform.name} ${where(i)}: has corner brackets 「 」.`, 'Use plain quotes " " or nothing.');
    if (DASH.test(all)) add('emDash', i, `${platform.name} ${where(i)}: has a long dash.`, 'Use a comma, a period or a colon.');
  });
  // the same finding once per part is enough
  const seen = new Set();
  return F.filter((f) => { const k = f.rule + f.part + f.message; if (seen.has(k)) return false; seen.add(k); return true; });
}

export function imageFindings(key, platform, made) {
  const F = [];
  for (const m of made) {
    if (m.error) F.push({platform: key, rule: 'noImages', level: 'fail', part: m.part, message: `${platform.name} post ${m.part + 1}: a picture could not be made (${m.raw}): ${m.error}`, fix: 'Fix the line and run build again.'});
    else if (m.w !== platform.image.w || m.h !== platform.image.h) F.push({platform: key, rule: 'limits', level: 'warn', part: m.part, message: `${platform.name}: ${m.name} is ${m.w}x${m.h}, the platform size is ${platform.image.w}x${platform.image.h}.`, fix: ''});
  }
  return F;
}

export function reportText(findings, {lang = 'en'} = {}) {
  const fails = findings.filter((f) => f.level === 'fail'), warns = findings.filter((f) => f.level === 'warn');
  const lines = [];
  lines.push(fails.length ? `${fails.length} thing(s) to fix before posting, ${warns.length} to look at.` : warns.length ? `Ready to post. ${warns.length} thing(s) to look at.` : 'Ready to post. Every check passed.');
  for (const f of [...fails, ...warns]) lines.push(`${f.level === 'fail' ? 'FIX ' : 'LOOK'} ${f.message}${f.fix ? '  ' + f.fix : ''}`);
  return lines.join('\n');
}
