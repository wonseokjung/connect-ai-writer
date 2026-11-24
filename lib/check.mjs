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
  const t = text.replace(URL_RE, ' ').replace(/`[^`]*`/g, ' ').replace(/@\d+(\.\d+)*/g, ' ').replace(/^\s*\d+[.)]\s/gm, ' ').replace(/^\s*\d+\s*\/\s*\d+\s*$/gm, ' ').replace(/\[S?\d+\]/g, ' ');
  const out = new Set();
  // a digit glued to a letter is a name (v0, M5, GPT4), not a number to check
  for (const m of t.matchAll(/(?<![A-Za-z])\d+(?:,\d{3})*(?:\.\d+)?/g)) out.add(m[0].replace(/,/g, '').replace(/\.0+$/, ''));
  return out;
}
export function sourceNumbers(text) {
  const s = numbersIn(text);
  for (const [w, v] of Object.entries(KO_NUM)) if (new RegExp(`(^|\\s)${w}\\s?${COUNTER}`).test(text)) s.add(String(v));
  // time stamps in the source are not facts the post can use, so they are left out on purpose
  return s;
}

// ---------- direction: up or down next to the same number ----------
// "15% 늘었다" in the post but "15% 줄었다" in the source is the same number and the opposite fact.
// We look at words right next to the number (about 16 letters after, 12 before) in the post sentence and in every
// source sentence with that number. Only a clear clash is flagged: the source says one way and never the other.
// This is a check of numbers, quotes and direction words, not a full fact check of meaning.
const UP_KO = ['증가', '늘었', '늘어', '늘고', '늘린', '늘리', '늘면', '올랐', '올라', '오른', '오르', '상승', '많아', '커졌', '커지', '높아', '확대', '급증', '성장', '뛰었'];
const DOWN_KO = ['감소', '줄었', '줄어', '줄고', '줄인', '줄이', '줄면', '내렸', '내려', '떨어', '하락', '적어', '작아', '낮아', '축소', '급감', '빠졌'];
const UP_EN = /\b(up|more|increase[sd]?|increasing|rise[sn]?|rose|rising|grew|grow[sn]?|growing|higher|gain(?:ed|s)?|jump(?:ed|s)?|surge[sd]?)\b/gi;
const DOWN_EN = /\b(down|less|fewer|decrease[sd]?|decreasing|drop(?:ped|s)?|fell|fall(?:en|s)?|falling|lower|decline[sd]?|shrank|shrunk)\b/gi;
export const sentencesOf = (t) => String(t || '').split(/\n+|(?<=[.!?。])\s+(?=\S)/).map((x) => x.trim()).filter(Boolean);
function hits(win, at) {
  const out = [];
  for (const [list, dir] of [[UP_KO, 'up'], [DOWN_KO, 'down']]) for (const w of list) for (let i = win.indexOf(w); i >= 0; i = win.indexOf(w, i + 1)) out.push({dir, d: Math.abs(i - at)});
  for (const [re, dir] of [[UP_EN, 'up'], [DOWN_EN, 'down']]) for (const m of win.matchAll(re)) out.push({dir, d: Math.abs(m.index - at)});
  return out;
}
// the direction word nearest to the number in this sentence ('up', 'down' or null)
export function directionNear(sentence, num) {
  let best = null;
  for (const m of sentence.matchAll(/(?<![A-Za-z])\d+(?:,\d{3})*(?:\.\d+)?/g)) {
    if (m[0].replace(/,/g, '').replace(/\.0+$/, '') !== String(num)) continue;
    const a = Math.max(0, m.index - 12), b = m.index + m[0].length + 16;
    for (const h of hits(sentence.slice(a, b), m.index - a)) if (!best || h.d < best.d) best = h;
  }
  return best ? best.dir : null;
}
// every number in `text` whose direction clashes with the source sentences that hold the same number
export function directionClashes(text, sourceText) {
  const src = sentencesOf(sourceText);
  const out = [];
  for (const sent of sentencesOf(text)) for (const num of numbersIn(sent)) {
    const said = directionNear(sent, num);
    if (!said) continue;
    const there = src.filter((x) => numbersIn(x).has(num)).map((x) => ({x, dir: directionNear(x, num)})).filter((y) => y.dir);
    if (there.length && !there.some((y) => y.dir === said)) out.push({num, said, source: there[0].dir, sentence: sent.slice(0, 120), sourceSentence: there[0].x.slice(0, 160)});
  }
  return out;
}
const DIR_WORD = {up: 'up (늘었다, more)', down: 'down (줄었다, less)'};

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
    for (const c of directionClashes([p.text, ...p.images.map((d) => (d.kind === 'stat' ? `${d.value || ''} ${d.label || ''}` : imageWords(d)))].join('\n'), srcText)) add('directionInSource', i, `${platform.name} ${where(i)}: ${c.num} goes ${DIR_WORD[c.said]} here, but ${DIR_WORD[c.source]} in your source ("${c.sourceSentence.slice(0, 70)}").`, 'Say it the way the source says it.');
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
  F.push(...shapeFindings({key, post, platform, source}).map((f) => ({...f, level: rules[f.rule] || f.level})).filter((f) => f.level !== 'off'));
  // the same finding once per part is enough
  const seen = new Set();
  return F.filter((f) => { const k = f.rule + f.part + f.message; if (seen.has(k)) return false; seen.add(k); return true; });
}

export function imageFindings(key, platform, made) {
  const F = [];
  for (const m of made) {
    if (m.skipped) F.push({platform: key, rule: 'picturesSkipped', level: 'warn', part: m.part, image: {raw: m.raw, error: 'not drawn (--no-pictures)'}, message: `${platform.name} post ${m.part + 1}: picture not drawn this time (${m.raw}).`, fix: 'Run build again without --no-pictures (needs Chrome) before you post.'});
    else if (m.error) F.push({platform: key, rule: 'noImages', level: 'fail', part: m.part, image: {raw: m.raw, error: m.error}, message: `${platform.name} post ${m.part + 1}: a picture could not be made (${m.raw}): ${m.error}`, fix: 'Fix the line and run build again.'});
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

// hooks, search words, newsletter subject, and sources: the shape of a post that gets read
// (rules adapted from coreyhaines31/marketingskills (MIT): first line carries the point, title = search words first,
//  subject clear before clever with a preview that adds to it; and from gpt-researcher (Apache-2.0): never cite what you did not read)
export function shapeFindings({key, post, platform, source}) {
  const F = [];
  const add = (rule, level, part, message, fix = '') => F.push({platform: key, rule, level, part, message, fix});
  const P = platform.name;
  if (!post.parts.length || post.placeholder) return F;
  const first = post.parts[0].text.split('\n').map((l) => l.trim()).find(Boolean) || '';
  const hook = platform.hook || {};
  if (hook.firstLineMax && [...first].length > hook.firstLineMax) add('hooks', 'warn', 0, `${P}: the first line is ${[...first].length} characters; about ${hook.firstLineMax} show before "more", so the point should be in them.`, 'Put the most surprising true thing in the first line.');
  if (hook.firstLineMin && [...first].length < hook.firstLineMin) add('hooks', 'warn', 0, `${P}: the first line is very short (${[...first].length}).`, 'Say what the reader gets in the first line.');
  const seo = platform.seo;
  if (seo && platform.kind === 'article') {
    const tl = [...(post.title || '')].length;
    if (post.title && seo.titleMax && tl > seo.titleMax) add('seo', 'warn', null, `${P}: the title is ${tl} characters; up to about ${seo.titleMax} shows in search.`, 'Cut the title, search words first.');
    if (post.title && seo.titleMin && tl < seo.titleMin) add('seo', 'warn', null, `${P}: the title is short (${tl}); a search title usually needs the words plus why to click.`, '');
    if (!post.keyword) add('seo', 'warn', null, `${P}: no "keyword:" line. Which search words is this post for?`, 'Add a line "keyword: 바이브코딩" (it is not posted).');
    else {
      const kw = post.keyword.toLowerCase().replace(/\s+/g, '');
      const has = (t) => (t || '').toLowerCase().replace(/\s+/g, '').includes(kw);
      if (!has(post.title)) add('seo', 'warn', null, `${P}: the title does not have the search words "${post.keyword}".`, 'Put them near the front of the title.');
      else if ((post.title || '').toLowerCase().replace(/\s+/g, '').indexOf(kw) > 12) add('seo', 'warn', null, `${P}: the search words are far back in the title.`, 'Move them to the front.');
      const firstPara = post.parts[0].blocks.find((b) => b.type === 'text')?.text || '';
      if (!has(firstPara)) add('seo', 'warn', null, `${P}: the first paragraph does not have "${post.keyword}".`, 'Say the search words once in the first paragraph.');
      const heads = post.parts.flatMap((p) => p.blocks.filter((b) => b.type === 'h2'));
      if (heads.length && !heads.some((h) => has(h.text))) add('seo', 'warn', null, `${P}: no heading has "${post.keyword}".`, 'Use the words in one heading.');
      if (heads.length < (seo.minHeadings || 0)) add('seo', 'warn', null, `${P}: ${heads.length} heading(s); a long post reads better with ${seo.minHeadings} or more.`, 'Add "## heading" lines.');
    }
  }
  const mail = platform.email;
  if (mail) {
    const sl = [...(post.subject || '')].length, pl = [...(post.preview || '')].length;
    if (!post.subject) add('email', 'fail', null, `${P}: no subject. Add "subject: ..." (the mail's subject line).`, 'Clear beats clever: what is inside, in a few words.');
    else if (sl > mail.subjectMax) add('email', 'warn', null, `${P}: the subject is ${sl} characters; about ${mail.subjectMax} shows on a phone.`, 'Cut it.');
    if (!post.preview) add('email', 'warn', null, `${P}: no "preview:" line (the grey line after the subject in the inbox).`, 'Add one that adds to the subject, not repeats it.');
    else if (pl > mail.previewMax) add('email', 'warn', null, `${P}: the preview is ${pl} characters; about ${mail.previewMax} shows.`, 'Cut it.');
    if (post.subject && post.preview && post.preview.replace(/\s+/g, '').includes(post.subject.replace(/\s+/g, ''))) add('email', 'warn', null, `${P}: the preview repeats the subject.`, 'Say something new in the preview.');
  }
  const R = source?.research;
  if (R) {
    const ids = new Set(R.sources.map((s) => s.id));
    const U = (u) => { let x = u.replace(/[.,]$/, '').replace(/\/$/, ''); try { x = decodeURI(x); } catch {} return x.toLowerCase(); };
    const urls = new Set(R.sources.filter((s) => s.url).map((s) => U(s.url)));
    const all = post.parts.map((p) => p.text).join('\n');
    for (const m of all.matchAll(/\[(S\d+)\]/g)) if (!ids.has(m[1])) add('sources', 'fail', null, `${P}: [${m[1]}] is not one of your research sources.`, `Use ${[...ids].join(', ')}.`);
    for (const u of all.match(/https?:\/\/[^\s)\]]+/g) || []) if (!urls.has(U(u)) && !(source.url && u.startsWith(source.url))) add('sources', 'fail', null, `${P}: the link ${u.slice(0, 60)} is not one of your research sources.`, 'Link only what you read: research add <folder> <link> first.');
    if (platform.kind === 'article') {
      const heads = post.parts.flatMap((p) => p.blocks.filter((b) => b.type === 'h2').map((b) => b.text));
      if (!heads.some((h) => /출처|참고|sources?|references?/i.test(h))) add('sources', 'fail', null, `${P}: no sources section. A post built from research ends with "## 출처" (or "## Sources") and the links you used.`, 'List each source you used: title, site, date, link.');
    }
  }
  return F;
}

// where every number in a post comes from (a fact, a source, or a time in your video)
export function traceNumbers(post, source) {
  const rows = [];
  const lines = source.lines || [];
  for (const [i, p] of post.parts.entries()) {
    const all = [p.text, ...p.images.map(imageWords), ...(i === 0 ? [post.title || ''] : [])].join('\n');
    for (const num of numbersIn(all)) {
      const hit = lines.find((l) => l.fact && numbersIn(l.text).has(num)) || lines.find((l) => numbersIn(l.text).has(num) || sourceNumbers(l.text).has(num));
      rows.push({part: i, num, from: hit ? (hit.fact ? 'fact' : hit.ref || (hit.start != null ? 'source ' + Math.floor(hit.start / 60) + ':' + String(Math.floor(hit.start % 60)).padStart(2, '0') : 'source')) : null, line: hit ? hit.text.slice(0, 120) : null});
    }
  }
  return rows;
}
