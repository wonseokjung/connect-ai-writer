// Every [image: ...] line becomes a real picture at the platform's size, made by code from your own material.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {runTool} from './tool.mjs';
import {pathToFileURL, fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {card} from './cards.mjs';
import {shoot, findChrome} from './chrome.mjs';
import {bestFrame} from './frames.mjs';
import {fillCrop} from './focus.mjs';
import {toSec, clock} from './source.mjs';

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
const sameRatio = (a, b) => Math.abs(a - b) / b < 0.02;
const real = (f) => { try { return fs.realpathSync(f); } catch { return null; } };
const inside = (f, dir) => { const r = path.relative(dir, f); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };

// A local picture or page is used only when it really is (after following links) inside the run folder,
// or is one of the files you named yourself (your source files, --video, --files). Nothing else on your computer.
export function localFile(name, {runDir, source}) {
  const runReal = real(runDir);
  const named = [...(source.origin || []), source.video, ...(source.files || [])].filter((o) => o && !/^https?:/.test(o)).map(real).filter(Boolean);
  const tries = [path.resolve(runDir, name), path.resolve(runDir, 'source', 'files', name), ...(source.origin || []).filter((o) => o && !/^https?:/.test(o)).map((o) => path.resolve(path.dirname(o), name))];
  for (const t of tries) {
    const r = real(t);
    if (!r || !fs.statSync(r).isFile()) continue;
    if ((runReal && inside(r, runReal)) || named.includes(r)) return r;
    throw new Error(`${name} is outside the run folder. Put it in the run folder (or give it with --files when you start) so only files you chose are used`);
  }
  return null;
}
// the same video file always gets the same short id, so a frame cache never mixes two videos
export const sourceId = (video) => { try { const st = fs.statSync(video); return crypto.createHash('sha1').update(`${real(video)}|${st.size}|${st.mtimeMs}`).digest('hex').slice(0, 10); } catch { return 'novideo'; } };

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
          const raw = path.join(work, 'frames', `${sourceId(source.video)}_t${t.toFixed(2)}.jpg`);
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
          if (!/^https?:\/\//.test(url)) {
            // a local page of your own (an .html file) in the run folder, or one you named
            const f = localFile(/^file:\/\//.test(url) ? fileURLToPath(url) : url, {runDir, source});
            if (!f || !/\.html?$/i.test(f)) throw new Error('page needs a link (https://...) or your own .html file in the run folder');
            url = pathToFileURL(f).href;
          }
          const shot = path.join(work, 'pages', slug(url.replace(/^\w+:\/\//, '')) + '.png');
          if (!fs.existsSync(shot)) await shoot([{url, w: 1280, h: 800, out: shot}], {tmp: work});
          cards.push({item, html: card(d, {w, h, theme, image: {file: shot, w: 1280, h: 800}}), out: path.join(outDir, base + '.png')});
        } else if (d.kind === 'file') {
          const f = localFile(d.file, {runDir, source});
          if (!f) throw new Error(`file not found in the run folder: ${d.file}`);
          const meta = await sharp(f).metadata();
          if (sameRatio(meta.width / meta.height, w / h)) item.file = await fit(f, w, h, path.join(outDir, base + '.jpg'));
          else {
            const filled = await fillCrop(f, w, h, path.join(work, `fill_${w}x${h}_${base}.jpg`), {x: d.x ?? null, cacheDir: work});
            item.focus = filled.by;
            cards.push({item, html: card(d, {w, h, theme, image: {file: filled.file, w, h, filled: true, face: filled.face}}), out: path.join(outDir, base + '.png')});
          }
        } else if (d.kind === 'gen') {
          const hook = settings.imageHook;
          if (!hook?.enabled || !hook.command) throw new Error(`the image hook is off. It stays off unless you turn it on in your own ${'~/.connect-ai/connect-ai-writer/writer.config.json'} (imageHook.enabled + command); a project folder cannot turn it on`);
          const out = path.join(work, 'gen_' + base + '.png');
          // no shell: the command is split into words, {out} {w} {h} fill whole words, the prompt goes in on stdin
          const r = runTool(hook.command, {input: String(d.prompt || ''), vars: {out, w, h}, passEnv: hook.passEnv || [], timeout: 10 * 60 * 1000, stdio: ['pipe', 'inherit', 'inherit']});
          if (r.error || r.status !== 0 || !fs.existsSync(out)) throw new Error('your image hook did not make ' + path.basename(out) + (r.error ? ` (${r.error.message})` : ''));
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
    // no Chrome (or Chrome fails): the text, check and preview are still made; each card that could not be drawn says why
    if (!findChrome()) for (const c of cards) c.item.error = 'no Chrome, Edge or Chromium on this computer, so this card was not drawn. Install Chrome (or set CHROME_PATH) and run build again';
    else {
      log(`    ${cards.length} card(s) through Chrome`);
      const res = await shoot(cards.map((c) => ({html: c.html, w, h, out: c.out})), {tmp: work, keepGoing: true});
      res.forEach((r, i) => { if (r.error) cards[i].item.error = 'Chrome could not draw it: ' + r.error; else cards[i].item.file = cards[i].out; });
    }
  }
  for (const m of made) {
    if (!m.file) continue;
    if (!fs.existsSync(m.file)) { m.error = m.error || 'the picture file is missing'; m.file = null; continue; }
    const meta = await sharp(m.file).metadata();
    Object.assign(m, {w: meta.width, h: meta.height, name: path.basename(m.file)});
  }
  return made;
}
