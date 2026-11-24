// Fill the card with your picture, without cutting a head.
// Where is the person? On a Mac we ask Apple's Vision (lib/face.swift, on-device, nothing sent anywhere).
// Elsewhere, or if Vision finds nobody, we keep the middle, which is where a talking head usually sits.
// You can always say it yourself: [image: frame 03:12 "caption" x=0.3] (0 = left edge, 1 = right edge).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const SWIFT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'face.swift');

export function findPeople(file, {cacheDir} = {}) {
  const cache = cacheDir ? path.join(cacheDir, path.basename(file) + '.faces.json') : null;
  if (cache && fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, 'utf8'));
  let found = {faces: [], people: [], by: 'none'};
  if (process.platform === 'darwin' && !process.env.CAIW_NO_VISION) {
    const r = spawnSync('swift', [SWIFT, file], {encoding: 'utf8', timeout: 60000});
    try {
      if (r.status === 0) found = {...JSON.parse(r.stdout.trim().split('\n').pop()), by: 'vision'};
    } catch {}
  }
  if (cache) fs.writeFileSync(cache, JSON.stringify(found));
  return found;
}

// pure math, tested: the crop box (in source pixels) for a target shape, keeping the face whole
export function cropBox({sw, sh, tw, th, faces = [], people = [], x = null}) {
  const want = tw / th;
  const face = [...faces].sort((a, b) => b.w * b.h - a.w * a.h)[0] || null;
  const body = [...people].sort((a, b) => b.w * b.h - a.w * a.h)[0] || null;
  if (sw / sh > want) {
    // wider than the card: keep the full height (a head is never cut), choose the left edge
    const cw = Math.round(sh * want);
    const focus = face || body;
    let cx;
    if (x != null) cx = x * sw;
    else if (!focus) cx = sw / 2;
    else {
      const fx = focus.x + focus.w / 2;
      // near the middle: centre it. Near an edge: keep it off-centre, so what is beside the person stays in the picture
      const at = Math.abs(fx - 0.5) < 0.15 ? 0.5 : fx > 0.5 ? 0.66 : 0.34;
      cx = fx * sw + (0.5 - at) * cw;
    }
    let left = Math.round(cx - cw / 2);
    if (face && x == null) {
      const pad = face.w * sw * 0.25;
      left = Math.min(left, Math.round(face.x * sw - pad));
      left = Math.max(left, Math.round((face.x + face.w) * sw + pad - cw));
    }
    left = Math.max(0, Math.min(sw - cw, left));
    return {left, top: 0, width: cw, height: sh};
  }
  // taller than the card: keep the full width, keep the head with room above it
  const ch = Math.round(sw / want);
  const focus = face || body;
  let top = focus ? Math.round((focus.y - (face ? face.h * 0.6 : 0.02)) * sh) : Math.round((sh - ch) * 0.25);
  top = Math.max(0, Math.min(sh - ch, top));
  return {left: 0, top, width: sw, height: ch};
}

// writes a picture exactly w x h that fills the card; returns where the face ended up (0..1 of the card) for the caption
export async function fillCrop(file, w, h, out, {x = null, cacheDir} = {}) {
  const meta = await sharp(file).metadata();
  const {faces, people, by} = x != null ? {faces: [], people: [], by: 'you'} : findPeople(file, {cacheDir});
  const box = cropBox({sw: meta.width, sh: meta.height, tw: w, th: h, faces, people, x});
  await sharp(file).extract(box).resize(w, h).jpeg({quality: 92, mozjpeg: true}).toFile(out);
  const face = faces[0] ? {top: (faces[0].y * meta.height - box.top) / box.height, bottom: ((faces[0].y + faces[0].h) * meta.height - box.top) / box.height} : null;
  return {file: out, box, by, face};
}
