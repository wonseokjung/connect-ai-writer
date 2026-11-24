// Frames from your own video: try a few moments around the time you asked for and keep the sharpest one
// (no motion blur, not too dark, not a fade). The frame is never cropped, so a face is never cut.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';

const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {encoding: 'utf8'});

export function hasFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], {encoding: 'utf8'});
  return !r.error && r.status === 0;
}

export function probe(video) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', video], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error('ffprobe could not read ' + path.basename(video));
  const j = JSON.parse(r.stdout);
  return {w: j.streams?.[0]?.width, h: j.streams?.[0]?.height, duration: Number(j.format?.duration || 0)};
}

// sharpness = variance of the Laplacian on a small grey copy; brightness = mean
export async function measure(file) {
  const {data, info} = await sharp(file).greyscale().resize({width: 480, withoutEnlargement: true}).raw().toBuffer({resolveWithObject: true});
  const {width: w, height: h} = info;
  let sum = 0, sum2 = 0, n = 0, mean = 0;
  for (let i = 0; i < data.length; i++) mean += data[i];
  mean /= data.length;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x;
    const v = 4 * data[k] - data[k - 1] - data[k + 1] - data[k - w] - data[k + w];
    sum += v; sum2 += v * v; n++;
  }
  const m = sum / n;
  return {sharp: sum2 / n - m * m, mean};
}

export async function bestFrame(video, at, out, {spread = 1.2, tries = 7, maxWidth = 1920, tmp} = {}) {
  const {duration} = probe(video);
  const t0 = Math.max(0, Math.min(at, Math.max(0, duration - 0.2)));
  const dir = fs.mkdtempSync(path.join(tmp || path.dirname(out), '.frames-'));
  const picks = [];
  for (let i = 0; i < tries; i++) {
    const t = Math.max(0, Math.min(duration - 0.05, t0 - spread + (2 * spread * i) / (tries - 1)));
    const f = path.join(dir, `c${i}.jpg`);
    ff(['-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', f]);
    if (!fs.existsSync(f)) continue;
    const m = await measure(f);
    const ok = m.mean > 22 && m.mean < 235;
    picks.push({t, ...m, score: (ok ? 1 : 0.15) * m.sharp * (1 - Math.abs(t - t0) / (spread * 6))});
  }
  fs.rmSync(dir, {recursive: true, force: true});
  if (!picks.length) throw new Error(`no frame at ${at}s in ${path.basename(video)}`);
  picks.sort((a, b) => b.score - a.score);
  const best = picks[0];
  ff(['-ss', best.t.toFixed(3), '-i', video, '-frames:v', '1', '-vf', `scale='min(${maxWidth},iw)':-2`, '-q:v', '2', out]);
  if (!fs.existsSync(out)) throw new Error('ffmpeg could not save the frame');
  return {file: out, t: best.t, sharp: Math.round(best.sharp), mean: Math.round(best.mean), tried: picks.length};
}

// candidates across the whole video, so you (or your agent) can look and pick times: a contact sheet with the time on each
export async function candidates(video, dir, {count = 16, from = 0} = {}) {
  fs.mkdirSync(dir, {recursive: true});
  const {duration} = probe(video);
  const list = [];
  for (let i = 0; i < count; i++) {
    const t = from + ((duration - from) * (i + 0.5)) / count;
    const f = path.join(dir, `at_${String(Math.round(t)).padStart(5, '0')}.jpg`);
    const r = await bestFrame(video, t, f, {spread: 2, tries: 5, maxWidth: 640, tmp: dir});
    list.push({t: r.t, file: f, sharp: r.sharp});
  }
  return list;
}
