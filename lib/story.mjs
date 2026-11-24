// story: a children's picture book (동화) from one sentence. Your agent writes story.md page by page,
// with one [scene: ...] line per page; build draws every page by code (lib/scenes.mjs), lays out a printable
// book.html, saves each page as a picture and checks the text for the child's age.
// Method adapted from weaiw/storybook-generator-skill (MIT): one action per page, a goal, tries that fail,
// a discovery shown not preached, a warm echo ending, and every thing the text names is in the picture.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {pathToFileURL} from 'node:url';
import {parseScene, sceneSvg, BACKDROPS, PROPS, CHARACTERS, MOODS, COLORS} from './scenes.mjs';
import {shoot, findChrome} from './chrome.mjs';
import {slugify, today} from './research.mjs';

// how much text a page holds, per age (our own guide for Korean letters without spaces / English words)
export const AGES = {
  '3-4': {pages: 10, ko: 45, en: 20, sentence: 22, note: 'Very short lines, a sound word or a repeat on most pages, one new thing per page.'},
  '5-6': {pages: 12, ko: 80, en: 35, sentence: 30, note: 'Two or three short sentences a page, a repeating line that changes a little each time.'},
  '7-8': {pages: 12, ko: 130, en: 60, sentence: 38, note: 'Up to four sentences a page, a small mystery or a choice, dialogue is welcome.'},
};
export const band = (age) => { const a = Number(age) || 6; return a <= 4 ? '3-4' : a <= 6 ? '5-6' : '7-8'; };

// words in the text that need the thing in the picture (the illustration contract)
const NEEDS = [
  [/공룡/, 'dino'], [/토끼/, 'rabbit'], [/곰/, 'bear'], [/고양이/, 'cat'], [/부엉이|올빼미/, 'owl'], [/고래/, 'whale'], [/물고기/, 'fish'], [/로봇/, 'robot'],
  [/로켓/, 'rocket'], [/무지개/, 'rainbow'], [/화산/, 'volcano'], [/행성/, 'planet'], [/혜성|별똥별/, 'comet'], [/구름/, 'cloud'], [/소나무/, 'pine'],
  [/침대/, 'bed'], [/이불|담요/, 'blanket'], [/달님|달빛|보름달|초승달|달이 |달을 |달은 |달도 /, 'moon'], [/별님|별빛|별들|별이 |별을 |별은 |별도 /, 'stars'],
  [/\b(dinosaur|dino)s?\b/i, 'dino'], [/\b(rabbit|bunny)\b/i, 'rabbit'], [/\bbear\b/i, 'bear'], [/\bowl\b/i, 'owl'], [/\bwhale\b/i, 'whale'], [/\brocket\b/i, 'rocket'], [/\bmoon\b/i, 'moon'], [/\bstars?\b/i, 'stars'], [/\brainbow\b/i, 'rainbow'],
];
const SCARY = /괴물|피가|피를|죽었|죽어|죽는|잡아먹|무서운 꿈|귀신|monster|blood|dead|die\b|ghost/i;
const PREACH = /교훈|명심|해야 해요|해야 한답니다|해야 합니다|잊지 마세요|알게 되었답니다|lesson|always remember|should always|the moral/i;

export function parseStory(md) {
  const body = md.replace(/<!--[\s\S]*?-->/g, '').replace(/\r/g, '');
  const chunks = body.split(/\n\s*---+\s*\n/);
  const head = chunks.shift() || '';
  const meta = {};
  for (const l of head.split('\n')) {
    const t = l.match(/^#\s+(.+)$/);
    if (t) meta.title = t[1].trim();
    const m = l.match(/^\s*(age|for|by|lang|cover|mood|나이)\s*:\s*(.+)$/i);
    if (m) meta[m[1].toLowerCase() === '나이' ? 'age' : m[1].toLowerCase()] = m[2].trim();
  }
  const pages = chunks.map((c) => {
    const lines = c.split('\n');
    const sl = lines.find((l) => /^\s*\[(scene|장면)\s*:/i.test(l));
    const text = lines.filter((l) => l !== sl).join('\n').trim();
    return {scene: sl ? sl.trim() : null, text};
  }).filter((p) => p.scene || p.text);
  return {meta, pages, placeholder: body.includes('{{write}}')};
}

const letters = (t) => t.replace(/\s/g, '').length;
const words = (t) => (t.match(/[A-Za-z']+/g) || []).length;

export function checkStory(story) {
  const F = [];
  const add = (level, page, message) => F.push({level, page, message});
  const {meta, pages} = story;
  if (story.placeholder) add('fail', null, 'story.md is still the empty template. Write the story, then build again.');
  if (!meta.title) add('fail', null, 'No title. Put "# Title" on the first line.');
  const b = AGES[band(meta.age)];
  const en = /^en/i.test(meta.lang || '') || (pages.map((p) => p.text).join(' ').match(/[A-Za-z]/g) || []).length > (pages.map((p) => p.text).join(' ').match(/[가-힣]/g) || []).length;
  if (pages.length < Math.round(b.pages * 0.6)) add('warn', null, `${pages.length} pages; for age ${band(meta.age)} about ${b.pages} reads well.`);
  if (pages.length > 24) add('warn', null, `${pages.length} pages is long for a picture book; 24 at most.`);
  pages.forEach((p, i) => {
    const n = i + 1;
    if (!p.scene) add('fail', n, `page ${n} has no [scene: ...] line, so it has no picture.`);
    else {
      const s = parseScene(p.scene);
      if (s.unknown.length) add('warn', n, `page ${n}: the picture does not know "${s.unknown.join(', ')}". Known: backdrops ${BACKDROPS.join(' ')}; things ${PROPS.join(' ')}; animals ${CHARACTERS.join(' ')}.`);
      const have = new Set([...s.props.map((x) => x.name), ...s.chars.map((x) => x.name), s.backdrop]);
      for (const [re, thing] of NEEDS) if (re.test(p.text) && !have.has(thing)) add('warn', n, `page ${n}: the text names ${thing}, but the picture has no ${thing}. Add it to the scene line or change the words.`);
    }
    if (!p.text) add('warn', n, `page ${n} has no words (fine for a picture-only page).`);
    const size = en ? words(p.text) : letters(p.text);
    const max = en ? b.en : b.ko;
    if (size > max * 1.5) add('fail', n, `page ${n}: ${size} ${en ? 'words' : 'letters'}, far over ${max} for age ${band(meta.age)}. Split the page.`);
    else if (size > max) add('warn', n, `page ${n}: ${size} ${en ? 'words' : 'letters'}; about ${max} reads well at age ${band(meta.age)}.`);
    for (const s of p.text.split(/(?<=[.!?。])\s+|\n+/)) if (!en && letters(s) > b.sentence) add('warn', n, `page ${n}: a long sentence (${letters(s)} letters): "${s.slice(0, 24)}...". Read it out loud; split it.`);
    if (SCARY.test(p.text)) add('warn', n, `page ${n}: a scary word for a young child. Keep it gentle${/bed|잠/i.test(meta.mood || '') ? ', this is a bedtime story' : ''}.`);
    if (/(?![©®™])\p{Extended_Pictographic}/u.test(p.text)) add('fail', n, `page ${n} has an emoji.`);
    if (/[「」『』]/.test(p.text)) add('fail', n, `page ${n} has corner brackets.`);
    if (/[—―]/.test(p.text)) add('fail', n, `page ${n} has a long dash.`);
  });
  const last = pages[pages.length - 1];
  if (last && PREACH.test(last.text)) add('warn', pages.length, 'The last page tells a lesson. Show it with what the animal does instead, and end on a warm echo of the first page.');
  if (pages.length > 2) {
    const first = parseScene(pages[0].scene || ''), end = parseScene(last.scene || '');
    if (first.chars[0] && end.chars[0] && first.chars[0].name !== end.chars[0].name) add('warn', pages.length, 'The hero on the last page is not the hero of the first page.');
  }
  return F;
}

export function storyBrief({idea, age, pages, lang}) {
  const b = AGES[band(age)];
  return `# Picture book brief

Idea: ${idea}
Age: ${age} (band ${band(age)}): ${b.note}
Pages: about ${pages}. Text per page: up to ${lang === 'en' ? b.en + ' words' : b.ko + ' Korean letters (no spaces)'}.

## How to write it (story.md)
1. Five lines first, only for you: who wants what; the fun rule of this world; the first try that fails or is misunderstood; the discovery (shown, not told); the warm change at the end that echoes the first page.
2. Then page by page. Each page: one action, one discovery, one feeling change or one choice. If a page can go without changing the story, merge it.
3. End each page so the child wants to turn it: an unfinished action, a question, a sound, a surprise about to happen.
4. Repeat a line the child can say along, but change one thing each time (a new friend, a new place, one more star).
5. Never end with a lesson. The last page shows the hero doing the new thing, like the first page but changed.
6. Bedtime story: calm the pace down toward the end, softer words, the last page is quiet.
7. Every thing your text names must be in that page's picture (the check looks).

## Pictures (one [scene: ...] line per page, drawn by code, animals and things only, no people)
- Backdrops: ${BACKDROPS.join(', ')}
- Things: ${PROPS.join(', ')}
- Animals: ${CHARACTERS.join(', ')}  colors: ${COLORS.join(', ')}  moods: ${MOODS.join(', ')}  place: left center right  size: small big
- Example: [scene: night hill moon stars | dino:green:sleepy:left owl:purple:calm:right:small]
- Korean words work: [scene: 밤 언덕 달 별 | 공룡:초록:졸린]
- Keep the hero the same animal and color on every page.

Then: build <this folder>. It makes book.html (print it, or save as PDF), pages/*.png, sheet.jpg and a check.
`;
}

export function startStory({idea, age = 6, pages, lang = 'ko', out = 'out', title}) {
  if (!idea) throw new Error('Say the idea in one line: story "7살, 공룡, 잠자리 동화" --age 7');
  const n = Number(pages) || AGES[band(age)].pages;
  const dir = path.join(path.resolve(out), `${today().replace(/-/g, '')}_${slugify(title || idea)}-story`);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'brief.md'), storyBrief({idea, age, pages: n, lang}));
  const f = path.join(dir, 'story.md');
  if (!fs.existsSync(f)) fs.writeFileSync(f, `<!-- ${idea}. Age ${age}, about ${n} pages. Read brief.md. Replace {{write}} with the story: a head, then pages separated by a line with only ---. -->
# {{write}}
age: ${age}
lang: ${lang}
cover: [scene: night hill moon stars | dino:green:happy]
---
[scene: day hill sun | dino:green:happy]
{{write}}
`);
  fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify({kind: 'story', title: title || idea, idea, age, pages: n, lang, created: new Date().toISOString()}, null, 2));
  return {dir, file: f};
}

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PW = 1600, PH = 1200, ART = 900;

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#1a1712;font-family:"Apple SD Gothic Neo","Noto Sans KR","Nanum Gothic",-apple-system,sans-serif;word-break:keep-all}
.page{width:${PW}px;height:${PH}px;position:relative;overflow:hidden;background:#fbf6ec;margin:0 auto 40px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.art{position:absolute;left:0;top:0;width:${PW}px;height:${ART}px}.art svg{display:block;width:100%;height:100%}
.text{position:absolute;left:0;right:0;top:${ART}px;bottom:0;display:flex;align-items:center;justify-content:center;padding:0 150px;background:#fbf6ec}
.text:before{content:"";position:absolute;inset:0;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 .4  0 0 0 0 .3  0 0 0 0 .2  0 0 0 .08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");pointer-events:none}
.text p{position:relative;font-size:44px;line-height:1.62;color:#3b2f24;text-align:center;font-weight:500;letter-spacing:-.01em}
.text p.long{font-size:37px}.text p.xlong{font-size:32px}
.num{position:absolute;bottom:26px;left:0;right:0;text-align:center;color:#b59a74;font:500 20px/1 "Bodoni 72","Didot",serif;letter-spacing:.2em}
.cover .title,.end .title{position:absolute;left:0;right:0;top:${ART}px;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#fbf6ec;padding:0 120px}
.cover .title:before,.end .title:before{content:"";position:absolute;left:50%;top:44px;width:72px;height:3px;margin-left:-36px;background:#D6892A}
.cover h1,.end h2{font-family:"Nanum Myeongjo","AppleMyungjo","Bodoni 72","Noto Serif KR",serif;font-weight:700;font-size:92px;line-height:1.15;color:#2e241b;letter-spacing:-.01em;text-align:center}
.end h2{font-size:84px}
.cover .sub{font-size:28px;letter-spacing:.14em;color:#8A5410}
@media print{body{background:none}.page{margin:0;box-shadow:none;page-break-after:always}@page{size:${PW}px ${PH}px;margin:0}}
@media (max-width:${PW}px){body{zoom:calc(100vw / ${PW}px)}}
`;

const pageHtml = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}html,body{width:${PW}px;height:${PH}px;overflow:hidden;background:#fbf6ec}.page{margin:0;box-shadow:none}</style></head><body>${inner}</body></html>`;

function pages(story) {
  const {meta} = story;
  const out = [];
  const sub = [meta.for ? (/^en/i.test(meta.lang || '') ? `for ${meta.for}` : `${meta.for}에게`) : '', meta.by || ''].filter(Boolean).join(' · ');
  const coverScene = meta.cover || story.pages[0]?.scene || '[scene: night]';
  out.push({name: '00_cover', inner: `<section class="page cover"><div class="art">${sceneSvg(coverScene, {w: PW, h: ART, seed: 1})}</div><div class="title"><h1>${esc(meta.title || '')}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div></section>`});
  story.pages.forEach((p, i) => {
    const n = [...p.text.replace(/\s/g, '')].length;
    const cls = n > 110 ? 'xlong' : n > 70 ? 'long' : '';
    out.push({name: String(i + 1).padStart(2, '0'), inner: `<section class="page"><div class="art">${sceneSvg(p.scene || '[scene: day]', {w: PW, h: ART, seed: i + 2})}</div><div class="text"><p class="${cls}">${esc(p.text).replace(/\n/g, '<br>')}</p></div><div class="num">${i + 1}</div></section>`});
  });
  const endScene = story.pages[story.pages.length - 1]?.scene || coverScene;
  out.push({name: '99_end', inner: `<section class="page end"><div class="art">${sceneSvg(endScene, {w: PW, h: ART, seed: 99})}</div><div class="title"><h2>${/^en/i.test(meta.lang || '') ? 'The End' : '끝'}</h2></div></section>`});
  return out;
}

export async function buildStory(dir, {log = () => {}, png = true, pdf = true} = {}) {
  dir = path.resolve(dir);
  const story = parseStory(fs.readFileSync(path.join(dir, 'story.md'), 'utf8'));
  const findings = checkStory(story);
  fs.writeFileSync(path.join(dir, 'check.md'), `# Story check\n\n${findings.length ? findings.map((f) => `${f.level === 'fail' ? 'FIX ' : 'LOOK'} ${f.message}`).join('\n') : 'Every check passed.'}\n`);
  if (story.placeholder || !story.pages.length) return {dir, story, findings, files: []};
  const list = pages(story);
  fs.writeFileSync(path.join(dir, 'book.html'), `<!doctype html><html lang="${esc(story.meta.lang || 'ko')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(story.meta.title || 'Picture book')}</title><style>${CSS}body{padding:40px 0}</style></head><body>${list.map((p) => p.inner).join('\n')}</body></html>\n`);
  const files = [];
  const book = path.join(dir, 'book.html');
  let pictureError = null;
  // book.html is always written first; without Chrome (or if Chrome fails) the pages and PDF are skipped and we say why
  if (png && !findChrome()) pictureError = 'No Chrome, Edge or Chromium here, so the page pictures and the PDF were not made';
  if (png && findChrome()) try {
    const pdir = path.join(dir, 'pages');
    fs.rmSync(pdir, {recursive: true, force: true});
    fs.mkdirSync(pdir, {recursive: true});
    const tmp = path.join(dir, '_work');
    fs.mkdirSync(tmp, {recursive: true});
    log(`    ${list.length} pages through Chrome`);
    const raw = list.map((p) => ({html: pageHtml(p.inner), w: PW, h: PH, out: path.join(tmp, p.name + '.png')}));
    await shoot(raw, {tmp});
    for (const r of raw) { const f = path.join(pdir, path.basename(r.out, '.png') + '.jpg'); await sharp(r.out).jpeg({quality: 88, mozjpeg: true}).toFile(f); files.push(f); }
    fs.rmSync(tmp, {recursive: true, force: true});
    // contact sheet
    const cols = 4, tw = 400, th = 300, gap = 14;
    const comps = await Promise.all(files.map(async (f, i) => ({input: await sharp(f).resize(tw, th).toBuffer(), left: gap + (i % cols) * (tw + gap), top: gap + Math.floor(i / cols) * (th + gap)})));
    await sharp({create: {width: cols * (tw + gap) + gap, height: Math.ceil(files.length / cols) * (th + gap) + gap, channels: 3, background: '#14110d'}}).composite(comps).jpeg({quality: 86}).toFile(path.join(dir, 'sheet.jpg'));
    if (pdf) {
      try {
        const {spawnSync} = await import('node:child_process');
        const os = await import('node:os');
        const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'caiw-pdf-'));
        spawnSync(findChrome(), ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${prof}`, '--no-pdf-header-footer', `--print-to-pdf=${path.join(dir, 'book.pdf')}`, pathToFileURL(path.join(dir, 'book.html')).href], {stdio: 'ignore', timeout: 120000});
        fs.rmSync(prof, {recursive: true, force: true});
      } catch {}
    }
  } catch (e) { pictureError = 'Chrome could not draw the pages (' + e.message + ')'; files.length = 0; }
  return {dir, story, findings, files, book, pictureError, sheet: files.length ? path.join(dir, 'sheet.jpg') : null, pdf: fs.existsSync(path.join(dir, 'book.pdf')) ? path.join(dir, 'book.pdf') : null};
}
