// Every [image: ...] line becomes a real picture at the platform's size, made by code from your own material.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {card} from './cards.mjs';
import {shoot} from './chrome.mjs';
import {bestFrame} from './frames.mjs';
import {fillCrop} from './focus.mjs';
import {toSec, clock} from './source.mjs';

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
const sameRatio = (a, b) => Math.abs(a - b) / b < 0.02;

async function fit(file, w, h, out) {
  await sharp(file).resize(w, h, {fit: 'cover', position: 'centre'}).jpeg({quality: 90, mozjpeg: true}).toFile(out);
  return out;
}

export async function makeImages({post, platform, runDir, outDir, source, theme, settings = {}, log = () => {}}) {
  const {w, h} = platform.image;
  const work = path.join(runDir, '_work');
  fs.mkdirSync(path.join(work, 'frames'), {recursive: true});
  fs.mkdirSync(path.join(work, 'pages'), {recursive: true});
  fs.rmSync(outDir, {recursive: true, force: true});
  fs.mkdirSync(outDir, {recursive: true});
  const made = [];
  const cards = [];
  let n = 0;
  for (const [pi, part] of post.parts.entries()) {
    for (const d of part.images) {
      n++;
      const base = `${String(n).padStart(2, '0')}_${d.kind}${d.at ? '_' + d.at.replace(/[:.]/g, '') : ''}${['quote', 'title', 'stat'].includes(d.kind) ? '' : d.caption ? '_' + slug(d.caption) : ''}`;
      const item = {part: pi, kind: d.kind, raw: d.raw, alt: d.caption || d.text || (d.items || []).join(', ') || d.label || ''};
      made.push(item);
      try {
        if (d.kind === 'frame') {
          if (!source.video) throw new Error('this source has no video. Use --video my.mp4 when you start, or use a card instead');
          const t = toSec(d.at);
          const raw = path.join(work, 'frames', `t${t.toFixed(2)}.jpg`);
          let info = {t};
          if (!fs.existsSync(raw)) info = await bestFrame(source.video, t, raw, {tmp: work});
          const meta = await sharp(raw).metadata();
          item.at = clock(info.t ?? t);
          if (sameRatio(meta.width / meta.height, w / h)) {
            // same shape as the platform: the frame itself, untouched; the caption becomes the picture caption in the editor
            item.file = await fit(raw, w, h, path.join(outDir, base + '.jpg'));
          } else {
            // the frame fills the whole card (face kept whole), the line sits on a soft shadow at the bottom
            const filled = await fillCrop(raw, w, h, path.join(work, 'frames', `fill_${w}x${h}_${base}.jpg`), {x: d.x ?? null, cacheDir: path.join(work, 'frames')});
            item.focus = filled.by;
            cards.push({item, html: card(d, {w, h, theme, image: {file: filled.file, w, h, filled: true, face: filled.face}, at: d.at}), out: path.join(outDir, base + '.png')});
          }
        } else if (d.kind === 'page') {
          let url = d.url;
          if (!/^(https?|file):\/\//.test(url)) {
            // a local page of your own (an .html file), next to the run or next to the source
            const f = [path.resolve(runDir, url), ...(source.origin || []).filter((o) => !/^https?:/.test(o)).map((o) => path.resolve(path.dirname(o), url))].find((x) => fs.existsSync(x));
            if (!f) throw new Error('page needs a link (https://...) or your own .html file');
            url = pathToFileURL(f).href;
          }
          const shot = path.join(work, 'pages', slug(url.replace(/^\w+:\/\//, '')) + '.png');
          if (!fs.existsSync(shot)) await shoot([{url, w: 1280, h: 800, out: shot}], {tmp: work});
          cards.push({item, html: card(d, {w, h, theme, image: {file: shot, w: 1280, h: 800}}), out: path.join(outDir, base + '.png')});
        } else if (d.kind === 'file') {
          const f = [path.resolve(runDir, d.file), ...(source.origin || []).filter((o) => !/^https?:/.test(o)).map((o) => path.resolve(path.dirname(o), d.file))].find((x) => fs.existsSync(x));
          if (!f) throw new Error(`file not found: ${d.file}`);
          const meta = await sharp(f).metadata();
          if (sameRatio(meta.width / meta.height, w / h)) item.file = await fit(f, w, h, path.join(outDir, base + '.jpg'));
          else {
            const filled = await fillCrop(f, w, h, path.join(work, `fill_${w}x${h}_${base}.jpg`), {x: d.x ?? null, cacheDir: work});
            item.focus = filled.by;
            cards.push({item, html: card(d, {w, h, theme, image: {file: filled.file, w, h, filled: true, face: filled.face}}), out: path.join(outDir, base + '.png')});
          }
        } else if (d.kind === 'gen') {
          const hook = settings.imageHook;
          if (!hook?.enabled || !hook.command) throw new Error('the image hook is off. It stays off unless you turn it on in writer.config.json (imageHook.enabled + command)');
          const out = path.join(work, 'gen_' + base + '.png');
          const cmd = hook.command.replace('{prompt}', JSON.stringify(d.prompt)).replace('{out}', JSON.stringify(out)).replace('{w}', w).replace('{h}', h);
          const r = spawnSync(cmd, {shell: true, stdio: 'inherit'});
          if (r.status !== 0 || !fs.existsSync(out)) throw new Error('your image hook did not make ' + out);
          item.generated = true;
          item.file = await fit(out, w, h, path.join(outDir, base + '.jpg'));
        } else if (['quote', 'stat', 'title', 'steps'].includes(d.kind)) {
          if (d.kind === 'steps' && d.items.length < 2) throw new Error('steps needs two or more "items"');
          if (d.kind !== 'steps' && !(d.text || d.value)) throw new Error('the card has no words');
          cards.push({item, html: card(d, {w, h, theme, at: d.at ? clock(toSec(d.at)) : ''}), out: path.join(outDir, base + '.png')});
        } else throw new Error('unknown picture kind ' + d.kind);
      } catch (e) {
        item.error = e.message;
      }
    }
  }
  if (cards.length) {
    log(`    ${cards.length} card(s) through Chrome`);
    await shoot(cards.map((c) => ({html: c.html, w, h, out: c.out})), {tmp: work});
    for (const c of cards) c.item.file = c.out;
  }
  for (const m of made) {
    if (!m.file) continue;
    const meta = await sharp(m.file).metadata();
    Object.assign(m, {w: meta.width, h: meta.height, name: path.basename(m.file)});
  }
  return made;
}
