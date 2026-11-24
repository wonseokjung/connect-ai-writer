// Builds the GitHub Pages showcase (docs/index.html) from one real run: the real post text and the real pictures.
//   node scripts/showcase.mjs <run folder> [--frame path/to/source-frame.jpg]
// Nothing here is made up: every word on the platform cards comes from the run's post.md files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {xLength} from '../lib/check.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(KIT, 'docs');
const run = path.resolve(process.argv[2] || '');
if (!fs.existsSync(path.join(run, 'run.json'))) { console.error('usage: node scripts/showcase.mjs <run folder> [--frame source.jpg]'); process.exit(1); }
const fi = process.argv.indexOf('--frame');
const sourceFrame = fi > 0 ? process.argv[fi + 1] : null;

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lines = (s) => esc(s).replace(/\n/g, '<br>');

// copy pictures as small webp files
const demo = path.join(DOCS, 'demo');
fs.rmSync(demo, {recursive: true, force: true});
const counters = {};
async function pics(platform, list) {
  fs.mkdirSync(path.join(demo, platform), {recursive: true});
  const out = [];
  for (const f of list) {
    counters[platform] = (counters[platform] || 0) + 1;
    const name = `${String(counters[platform]).padStart(2, '0')}.webp`;
    const meta = await sharp(path.join(run, platform, f)).metadata();
    await sharp(path.join(run, platform, f)).resize({width: Math.min(meta.width, 900)}).webp({quality: 74}).toFile(path.join(demo, platform, name));
    out.push({src: `demo/${platform}/${name}`, w: meta.width, h: meta.height});
  }
  return out;
}
const post = (p) => JSON.parse(fs.readFileSync(path.join(run, p, 'post.json'), 'utf8'));
const md = (p) => fs.readFileSync(path.join(run, p, 'post.md'), 'utf8');

const AV = `<div class="av">J</div>`;
const NAME = 'AI 멘토 제이', HANDLE = 'aimentorjay';

// ---- Threads: a chain
const th = post('threads');
let thHtml = '';
for (const part of th.parts) {
  const ims = await pics('threads', part.images);
  thHtml += `<div class="t-post">${AV}<div class="t-body"><div class="who"><b>${HANDLE}</b><span>now</span></div><p>${lines(part.text)}</p>${ims.length ? `<div class="t-pics">${ims.map((m) => `<img loading="lazy" src="${m.src}" alt="">`).join('')}</div>` : ''}</div></div>`;
}
if (th.tags?.length) thHtml += `<div class="tags">${th.tags.map((t) => '#' + esc(t)).join(' ')}</div>`;

// ---- Naver: the article in post.md order (headings, a picture between paragraphs)
const nv = post('naver');
const nvIms = await pics('naver', nv.parts.flatMap((p) => p.images));
let nvHtml = '', k = 0, para = [];
const flush = () => { if (para.length) nvHtml += `<p>${para.map(esc).join('<br>')}</p>`; para = []; };
for (const raw of md('naver').split('\n')) {
  const l = raw.trim();
  if (l.startsWith('# ')) continue;
  if (/^tags\s*:/i.test(l)) continue;
  if (l.startsWith('## ')) { flush(); nvHtml += `<h4>${esc(l.slice(3))}</h4>`; continue; }
  if (/^\[(image|img|이미지)\s*:/i.test(l)) { flush(); const m = nvIms[k++]; if (m) nvHtml += `<figure><img loading="lazy" src="${m.src}" alt=""></figure>`; continue; }
  if (!l) { flush(); continue; }
  para.push(l);
}
flush();

// ---- X: posts with the weighted count
const xp = post('x');
let xHtml = '';
for (const part of xp.parts) {
  const ims = await pics('x', part.images);
  xHtml += `<div class="x-post">${AV}<div class="t-body"><div class="who"><b>${NAME}</b><span>@${HANDLE}</span></div><p>${lines(part.text)}</p>${ims.map((m) => `<img loading="lazy" class="x-pic" src="${m.src}" alt="">`).join('')}<div class="count">${xLength(part.text)} / 280</div></div></div>`;
}

// ---- LinkedIn: one post, pictures under it
const li = post('linkedin');
const liIms = await pics('linkedin', li.parts[0].images);
const liHtml = `<div class="li-head">${AV}<div><b>${NAME}</b><span>CONNECT AI LAB</span></div></div><p>${lines(li.parts[0].text)}</p><div class="li-pics">${liIms.map((m) => `<img loading="lazy" src="${m.src}" alt="">`).join('')}</div>`;

// ---- Instagram: a carousel and its caption
const ig = post('instagram');
const igIms = await pics('instagram', ig.parts[0].images);
const igHtml = `<div class="ig-head">${AV}<b>${HANDLE}</b></div><div class="ig-car">${igIms.map((m) => `<img loading="lazy" src="${m.src}" alt="">`).join('')}</div><div class="ig-dots">${igIms.map(() => '<i></i>').join('')}</div><p><b>${HANDLE}</b> ${lines(ig.parts[0].text)}</p>`;

let frameTag = '';
if (sourceFrame && fs.existsSync(sourceFrame)) {
  await sharp(sourceFrame).resize({width: 1200}).webp({quality: 78}).toFile(path.join(demo, 'source.webp'));
  frameTag = `<img src="demo/source.webp" alt="One frame of the source lesson video">`;
}

const T = fs.readFileSync(path.join(KIT, 'scripts', 'showcase.template.html'), 'utf8');
const html = T.replace('{{threads}}', thHtml).replace('{{naver_title}}', esc(nv.title)).replace('{{naver}}', nvHtml)
  .replace('{{naver_tags}}', nv.tags.map((t) => '#' + esc(t)).join(' ')).replace('{{x}}', xHtml).replace('{{linkedin}}', liHtml)
  .replace('{{instagram}}', igHtml).replace('{{source}}', frameTag);
fs.writeFileSync(path.join(DOCS, 'index.html'), html);
console.log('wrote docs/index.html and docs/demo/');
