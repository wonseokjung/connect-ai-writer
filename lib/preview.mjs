// preview.html per platform: the post laid out the way that platform shows it, with the check results on top.
// index.html for the whole run, and sheet.jpg with every picture.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {length} from './check.mjs';
import {plainText} from './postfile.mjs';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const br = (s) => esc(s).replace(/\n/g, '<br>');
const rel = (from, f) => path.relative(from, f).split(path.sep).join('/');

const BASE = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Segoe UI',sans-serif;word-break:keep-all;overflow-wrap:break-word}
.bar{position:sticky;top:0;z-index:5;background:#0b0a08;color:#f4eee4;padding:12px 16px;font:13px/1.5 -apple-system,'Apple SD Gothic Neo',sans-serif;border-bottom:1px solid #2a241b}
.bar b{color:#D6892A;font-weight:600}.bar a{color:#f2b45a}.bar .row{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.bar details{margin-top:6px}.bar summary{cursor:pointer;color:#c9bfae}.bar li{list-style:none;margin:4px 0}.fail{color:#ff8a7a}.warn{color:#f2b45a}.okc{color:#8fd19e}
.meta{font:12px/1.4 -apple-system,sans-serif;color:#8a8378;margin:6px 0 0}.copy{font:12px -apple-system,sans-serif;border:1px solid #3a3226;background:transparent;color:#c9bfae;border-radius:6px;padding:3px 8px;cursor:pointer}
img{display:block;max-width:100%}`;

function bar({name, findings, back = 'index.html'}) {
  const fails = findings.filter((f) => f.level === 'fail'), warns = findings.filter((f) => f.level === 'warn');
  const status = fails.length ? `<span class="fail">${fails.length} to fix</span>` : '<span class="okc">ready</span>';
  const items = [...fails, ...warns].map((f) => `<li class="${f.level}">${f.level === 'fail' ? 'FIX' : 'LOOK'} ${esc(f.message)} <span style="color:#8a8378">${esc(f.fix || '')}</span></li>`).join('');
  return `<div class="bar"><div class="row"><b>${esc(name)}</b> ${status}${warns.length ? ` <span class="warn">${warns.length} to look at</span>` : ''} <span style="color:#8a8378">preview only, nothing is posted</span> <a href="${back}">all platforms</a></div>${items ? `<details${fails.length ? ' open' : ''}><summary>check</summary><ul>${items}</ul></details>` : ''}</div>`;
}

function copyScript() {
  return `<script>document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{navigator.clipboard.writeText(document.getElementById(b.dataset.copy).value).then(()=>{b.textContent='copied';setTimeout(()=>b.textContent='copy text',1200)})})</script>`;
}

function who(settings, theme) {
  const name = settings.name || theme.brand || 'you';
  return {name, handle: settings.handle || name.toLowerCase().replace(/\s+/g, ''), initial: [...name][0].toUpperCase(), avatar: settings.avatar || null};
}
// your own profile picture if writer.config.json has "avatar", else your first letter
const av = (P, dir, base) => (P.avatar && fs.existsSync(path.resolve(base || dir, P.avatar)) ? `<div class="av" style="background:none;overflow:hidden"><img src="${pathToFileURL(path.resolve(base || dir, P.avatar)).href}" style="width:100%;height:100%;object-fit:cover"></div>` : `<div class="av">${esc(P.initial)}</div>`);

export function previewHtml({key, platform, post, made, findings, dir, settings = {}, theme}) {
  const P = who(settings, theme);
  const imgs = (pi) => made.filter((m) => m.part === pi && m.file);
  const counter = (t) => `${length(t, platform.count)} / ${platform.maxChars}${platform.count === 'x-weighted' ? ' weighted' : ''}`;
  const texts = post.parts.map((p, i) => plainText(p, post, platform, {last: i === post.parts.length - 1}));
  const hidden = texts.map((t, i) => `<textarea id="t${i}" hidden>${esc(t)}</textarea>`).join('');
  let css = '', body = '';

  if (key === 'threads' || key === 'x') {
    const x = key === 'x';
    css = `body{background:${x ? '#000' : '#101010'};color:#f3f5f7}.feed{max-width:600px;margin:0 auto;padding:16px 16px 80px}
.post{display:grid;grid-template-columns:44px 1fr;gap:0 12px;position:relative;padding-top:14px}
.av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#D6892A,#6b4a1c);display:grid;place-items:center;font-weight:700;color:#111}
.line{position:absolute;left:19px;top:62px;bottom:-14px;width:2px;background:#333}.post:last-child .line{display:none}
.nm{font-weight:600;font-size:15px}.nm span{color:#777;font-weight:400;margin-left:6px}.tx{font-size:15px;line-height:1.5;margin:3px 0 10px;white-space:normal}
.media{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}.media img{border-radius:${x ? 16 : 8}px;border:1px solid #2a2a2a;scroll-snap-align:start;height:${x ? 'auto' : '340px'};width:auto;flex:0 0 auto}
.one img{height:auto;max-height:520px;width:100%;object-fit:contain}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;border-radius:16px;overflow:hidden;border:1px solid #2f3336}.grid img{width:100%;aspect-ratio:16/9;object-fit:cover}.grid.n1{grid-template-columns:1fr}.grid.n1 img{aspect-ratio:auto}
.acts{display:flex;gap:26px;color:#777;font-size:13px;margin:10px 0 2px}`;
    body = `<div class="feed">${post.parts.map((p, i) => {
      const im = imgs(i);
      const media = !im.length ? '' : x ? `<div class="grid n${Math.min(im.length, 4) === 1 ? 1 : 2}">${im.slice(0, 4).map((m) => `<img src="${rel(dir, m.file)}" alt="${esc(m.alt)}">`).join('')}</div>` : `<div class="media${im.length === 1 ? ' one' : ''}">${im.map((m) => `<img src="${rel(dir, m.file)}" alt="${esc(m.alt)}">`).join('')}</div>`;
      return `<div class="post"><div>${av(P, dir, settings._dir)}</div><div class="line"></div><div><div class="nm">${esc(P.name)}<span>${x ? '@' + esc(P.handle) + ' · now' : 'now'}</span></div><div class="tx">${br(texts[i])}</div>${media}<div class="acts"><span>${x ? 'reply' : 'like'}</span><span>${x ? 'repost' : 'comment'}</span><span>${x ? 'like' : 'repost'}</span><span>share</span></div><div class="meta">${counter(texts[i])} · ${im.length} picture(s) · <button class="copy" data-copy="t${i}">copy text</button></div></div></div>`;
    }).join('')}</div>`;
  } else if (platform.kind === 'article') {
    const brunch = key === 'brunch';
    css = `body{background:#f5f6f7;color:#222}.page{max-width:900px;margin:0 auto;background:#fff;padding:48px 70px 80px;min-height:100vh}
@media(max-width:700px){.page{padding:28px 16px 60px}}
.cat{color:#03c75a;font-size:13px;margin-bottom:10px}.ttl{font-size:${brunch ? 34 : 30}px;line-height:1.35;font-weight:${brunch ? 400 : 700};font-family:${brunch ? "'Noto Serif KR',AppleMyungjo,serif" : 'inherit'};margin-bottom:14px}
.by{display:flex;gap:10px;align-items:center;color:#888;font-size:13px;padding-bottom:22px;border-bottom:1px solid #eee;margin-bottom:34px}.av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#D6892A,#6b4a1c);display:grid;place-items:center;color:#fff;font-weight:700}
.bd p{font-size:16px;line-height:1.9;margin:0 0 22px}.bd h2{font-size:21px;margin:42px 0 18px;padding-left:12px;border-left:4px solid #222;line-height:1.4}
.bd figure{margin:28px 0}.bd figcaption{color:#999;font-size:13px;text-align:center;margin-top:8px}.bd img{width:100%}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:40px}.tags span{background:#f3f3f3;color:#555;border-radius:14px;padding:5px 12px;font-size:13px}`;
    const blocks = post.parts.flatMap((p, pi) => p.blocks.map((b) => ({...b, pi})));
    let ii = 0;
    const im = made.filter((m) => m.file);
    body = `<div class="page"><div class="cat">${esc(platform.name)}</div><h1 class="ttl">${esc(post.title)}</h1><div class="by">${av(P, dir, settings._dir)}${esc(P.name)} · ${new Date().toISOString().slice(0, 10)}</div><div class="bd">${blocks.map((b) => {
      if (b.type === 'h2') return `<h2>${esc(b.text)}</h2>`;
      if (b.type === 'text') return b.text.split('\n').filter(Boolean).length ? `<p>${br(b.text)}</p>` : '';
      const m = made[ii++];
      return m?.file ? `<figure><img src="${rel(dir, m.file)}" alt="${esc(m.alt)}">${m.alt ? `<figcaption>${esc(m.alt)}</figcaption>` : ''}</figure>` : '';
    }).join('')}</div>${post.tags.length ? `<div class="tags">${post.tags.slice(0, platform.tags.max).map((t) => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}<div class="meta">${length(texts.join('\n'), 'chars')} characters · ${im.length} picture(s) · <button class="copy" data-copy="t0">copy text</button></div></div>`;
  } else {
    // linkedin (single) and instagram (carousel)
    const ig = platform.kind === 'carousel';
    const im = made.filter((m) => m.file);
    css = `body{background:${ig ? '#000' : '#f4f2ee'};color:${ig ? '#f5f5f5' : '#1d1d1d'}}.wrap{max-width:${ig ? 470 : 560}px;margin:0 auto;padding:16px 0 80px}
.card{background:${ig ? '#000' : '#fff'};border:1px solid ${ig ? '#262626' : '#e0dfdc'};border-radius:${ig ? 4 : 10}px;overflow:hidden}
.hd{display:flex;gap:10px;align-items:center;padding:12px 14px}.av{width:${ig ? 32 : 48}px;height:${ig ? 32 : 48}px;border-radius:50%;background:linear-gradient(135deg,#D6892A,#6b4a1c);display:grid;place-items:center;color:#111;font-weight:700}
.nm{font-weight:600;font-size:14px}.sub{color:#888;font-size:12px}.tx{padding:${ig ? '10px 14px' : '0 16px 12px'};font-size:14px;line-height:1.5}
.car{display:flex;overflow-x:auto;scroll-snap-type:x mandatory}.car img{flex:0 0 100%;width:100%;scroll-snap-align:start}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:2px}.grid img{width:100%;aspect-ratio:1;object-fit:cover}.grid.n1{grid-template-columns:1fr}
.dots{text-align:center;color:#555;font-size:12px;padding:8px}.wrap .meta{padding:0 14px}`;
    const media = ig ? `<div class="car">${im.map((m) => `<img src="${rel(dir, m.file)}" alt="${esc(m.alt)}">`).join('')}</div><div class="dots">${im.length} slide(s), swipe</div>` : `<div class="grid n${im.length === 1 ? 1 : 2}">${im.slice(0, 4).map((m) => `<img src="${rel(dir, m.file)}" alt="${esc(m.alt)}">`).join('')}</div>${im.length > 4 ? `<div class="dots">+${im.length - 4} more</div>` : ''}`;
    const cap = `<div class="tx">${ig ? `<b>${esc(P.handle)}</b> ` : ''}${br(texts.join('\n\n'))}</div>`;
    body = `<div class="wrap"><div class="card"><div class="hd">${av(P, dir, settings._dir)}<div><div class="nm">${esc(P.name)}</div><div class="sub">${ig ? '' : 'now'}</div></div></div>${ig ? media + cap : cap + media}</div><div class="meta">${counter(texts.join('\n\n'))} · ${im.length} picture(s) · <button class="copy" data-copy="t0">copy text</button></div></div>`;
  }
  const textarea = platform.kind === 'chain' ? hidden : `<textarea id="t0" hidden>${esc((post.title ? post.title + '\n\n' : '') + texts.join('\n\n') + (platform.kind === 'article' && post.tags.length ? '\n\n' + post.tags.slice(0, platform.tags.max).map((t) => '#' + t).join(' ') : ''))}</textarea>`;
  return `<!doctype html><html lang="${platform.lang || 'ko'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(platform.name)} preview</title><style>${BASE}${css}</style></head><body>${bar({name: platform.name, findings})}${body}${textarea}${copyScript()}</body></html>`;
}

export function indexHtml({run, results, dir}) {
  const cards = results.map((r) => {
    const fails = r.findings.filter((f) => f.level === 'fail').length, warns = r.findings.filter((f) => f.level === 'warn').length;
    const first = r.made.find((m) => m.file);
    return `<a class="pc" href="${r.key}/preview.html">${first ? `<img src="${rel(dir, first.file)}">` : '<div class="noimg">no picture yet</div>'}<div class="pt"><b>${esc(r.platform.name)}</b><span class="${fails ? 'fail' : 'okc'}">${fails ? fails + ' to fix' : 'ready'}</span>${warns ? `<span class="warn">${warns} to look at</span>` : ''}</div><div class="ps">${r.post.parts.length} ${r.platform.kind === 'chain' ? 'post(s)' : 'part'} · ${r.made.filter((m) => m.file).length} picture(s)</div></a>`;
  }).join('');
  const all = results.flatMap((r) => r.made.filter((m) => m.file).map((m) => `<a href="${r.key}/preview.html"><img src="${rel(dir, m.file)}" title="${esc(r.platform.name + ': ' + m.raw)}"></a>`)).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(run.title)}</title><style>${BASE}
body{background:#0b0a08;color:#f4eee4}.top{max-width:1100px;margin:0 auto;padding:36px 16px 10px}.k{color:#D6892A;letter-spacing:.14em;font-size:12px}.h{font-family:'Noto Serif KR',AppleMyungjo,serif;font-size:34px;font-weight:600;margin:8px 0 6px;line-height:1.25}.s{color:#9a8f80;font-size:14px}
.grid{max-width:1100px;margin:22px auto;padding:0 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.pc{display:block;background:#17140f;border:1px solid #2a241b;border-radius:12px;overflow:hidden;color:inherit;text-decoration:none}.pc:hover{border-color:#D6892A}.pc img{width:100%;aspect-ratio:4/3;object-fit:cover}.noimg{aspect-ratio:4/3;display:grid;place-items:center;color:#666}
.pt{display:flex;gap:10px;align-items:baseline;padding:12px 14px 2px;flex-wrap:wrap}.pt b{font-size:16px}.pt span{font-size:12px}.ps{color:#8a8378;font-size:12px;padding:0 14px 14px}
.all{max-width:1100px;margin:10px auto 60px;padding:0 16px;columns:5 160px;column-gap:8px}.all img{width:100%;margin-bottom:8px;border-radius:6px;break-inside:avoid}h3{max-width:1100px;margin:30px auto 0;padding:0 16px;font-size:13px;color:#9a8f80;letter-spacing:.12em;font-weight:500}
</style></head><body><div class="top"><div class="k">CONNECT AI WRITER</div><div class="h">${esc(run.title)}</div><div class="s">${esc(run.sourceLabel)} · nothing is posted until you say so</div></div><div class="grid">${cards}</div><h3>EVERY PICTURE</h3><div class="all">${all}</div></body></html>`;
}

// one image with every picture, labelled (for a quick look, or to send to someone)
export async function contactSheet(results, out, {tile = 300, cols = 6} = {}) {
  const items = results.flatMap((r) => r.made.filter((m) => m.file).map((m) => ({file: m.file, label: `${r.key}  ${m.name}`})));
  if (!items.length) return null;
  const th = Math.round(tile * 0.8) + 30;
  const rows = Math.ceil(items.length / cols);
  const W = cols * (tile + 12) + 12, H = rows * (th + 12) + 12;
  const comps = [];
  for (const [i, it] of items.entries()) {
    const x = 12 + (i % cols) * (tile + 12), y = 12 + Math.floor(i / cols) * (th + 12);
    const img = await sharp(it.file).resize(tile, th - 30, {fit: 'contain', background: '#0b0a08'}).toBuffer();
    comps.push({input: img, left: x, top: y});
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="26"><text x="2" y="18" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#c9bfae">${it.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 40)}</text></svg>`);
    comps.push({input: label, left: x, top: y + th - 28});
  }
  await sharp({create: {width: W, height: H, channels: 3, background: '#0b0a08'}}).composite(comps).jpeg({quality: 86}).toFile(out);
  return out;
}
