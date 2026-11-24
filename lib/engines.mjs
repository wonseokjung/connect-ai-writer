// Our other AI employees as optional engines. The writer never installs or downloads them; it finds them if they are
// there (on PATH, or a kit folder you point to) and says how to get them if they are not.
//   motion         connect-ai-motion         a motion graphics video from your post's words, no footage (9:16 and 16:9)
//   video-motion   connect-ai-video-motion   motion graphics on your own talking-head video
//   product-photo  connect-ai-product-photo  product photos from one phone photo (white background, scenes)
//   marketer       connect-ai-marketer       posting, replies and listening in your browser (takes handoff/)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, spawn} from 'node:child_process';
import {parsePost} from './postfile.mjs';
import {numbersIn, sourceNumbers} from './check.mjs';

export const ENGINES = [
  {key: 'motion', pkg: 'connect-ai-motion', env: 'CAIW_MOTION_KIT', what: 'a motion graphics video from your post (no footage needed)', get: 'npx connect-ai-motion doctor', repo: 'https://github.com/wonseokjung/connect-ai-motion'},
  {key: 'video-motion', pkg: 'connect-ai-video-motion', env: 'CAIW_VIDEO_MOTION_KIT', what: 'motion graphics on your own video, around you', get: 'npx connect-ai-video-motion doctor', repo: 'https://github.com/wonseokjung/connect-ai-video-motion'},
  {key: 'product-photo', pkg: 'connect-ai-product-photo', env: 'CAIW_PRODUCT_PHOTO_KIT', what: 'product photos from one phone photo', get: 'coming soon from CONNECT AI LAB', repo: null},
  {key: 'marketer', pkg: 'connect-ai-marketer', env: 'CAIW_MARKETER_KIT', what: 'posting, replies and listening in your browser (reads handoff/)', get: 'https://github.com/wonseokjung/connect-ai-marketer', repo: 'https://github.com/wonseokjung/connect-ai-marketer'},
];

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {encoding: 'utf8'});
  return r.status === 0 ? r.stdout.split('\n')[0].trim() : null;
}

// -> {file, args, where} or null
export function findEngine(key, env = process.env) {
  const e = ENGINES.find((x) => x.key === key);
  if (!e) throw new Error(`unknown engine ${key}`);
  const kit = env[e.env];
  if (kit && fs.existsSync(path.join(kit, 'bin', 'cli.mjs'))) return {file: process.execPath, args: [path.join(kit, 'bin', 'cli.mjs')], where: kit, ...e};
  const bin = which(e.pkg);
  if (bin) return {file: bin, args: [], where: bin, ...e};
  return null;
}

export function engineTable(env = process.env) {
  return ENGINES.map((e) => ({...e, found: findEngine(e.key, env)}));
}

// a first script for a motion video: one short line per beat, only words from the post (the numbers stay the source's)
export function scriptFromPost(post, {maxBeats = 8} = {}) {
  const beats = [];
  const short = (t) => t.replace(/\[S?\d+\]/g, '').replace(/\s+/g, ' ').trim();
  const sentences = (t) => short(t).split(/(?<=[.!?。])\s+/).map((s) => s.trim()).filter((s) => s && [...s].length <= 42);
  if (post.title) beats.push(short(post.title));
  for (const p of post.parts) {
    const first = sentences(p.text)[0];
    if (first && !beats.includes(first)) beats.push(first);
    for (const d of p.images) {
      if (d.kind === 'stat' && d.value) beats.push(short(`${d.value}. ${d.label || ''}`).replace(/\.\s*$/, '.'));
      else if (d.kind === 'quote' && d.text && [...d.text].length <= 42) beats.push(`"${d.text}"`);
      else if (d.kind === 'steps' && d.items?.length) beats.push(d.items.slice(0, 3).join(', ') + '.');
    }
    if (beats.length >= maxBeats) break;
  }
  return [...new Set(beats)].slice(0, maxBeats);
}

export function motionProject(runDir, key, {platform, source}) {
  const md = fs.readFileSync(path.join(runDir, key, 'post.md'), 'utf8');
  const post = parsePost(md, platform);
  const dir = path.join(runDir, 'motion', key);
  fs.mkdirSync(dir, {recursive: true});
  const script = path.join(dir, 'script.md');
  if (!fs.existsSync(script)) fs.writeFileSync(script, scriptFromPost(post).join('\n') + '\n');
  // numbers in the script must be the source's numbers too
  const srcNums = sourceNumbers(source.lines.map((l) => l.text).join('\n'));
  const lines = fs.readFileSync(script, 'utf8').split('\n').filter((l) => l.trim());
  const bad = lines.flatMap((l) => [...numbersIn(l)].filter((n) => !srcNums.has(n)).map((n) => ({line: l, num: n})));
  return {dir, script, lines, bad};
}

export function runEngine(eng, args, {cwd, log = () => {}, env = {}} = {}) {
  return new Promise((resolve) => {
    const p = spawn(eng.file, [...eng.args, ...args], {cwd, env: {...process.env, ...env}, stdio: ['ignore', 'pipe', 'pipe']});
    let out = '';
    p.stdout.on('data', (d) => { out += d; for (const l of String(d).split('\n')) if (/PASS|ERROR|film|sheet|render|wrote|check/i.test(l)) log('    ' + l.trim().slice(0, 140)); });
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({code, out}));
    p.on('error', (e) => resolve({code: 1, out: String(e)}));
  });
}

// the videos an engine made for this run, so build can put them in the preview and the hand-off
export function motionFilms(runDir, key) {
  const out = path.join(runDir, 'motion', key, 'out');
  if (!fs.existsSync(out)) return [];
  return fs.readdirSync(out).filter((f) => /^film.*\.mp4$/.test(f)).map((f) => ({file: path.join(out, f), ratio: f.includes('9x16') ? '9:16' : f.includes('1x1') ? '1:1' : '16:9'}));
}

// connect-ai-motion's pie scene shows a whole number (84.6% would show as 85%). A number from the source must show as
// written, so a beat with a decimal value moves to the big-number scene, which prints it as is.
const ROUNDS = /shapes-pie|pie|donut|ring/i;
export function keepExactNumbers(storyboardFile) {
  const sb = JSON.parse(fs.readFileSync(storyboardFile, 'utf8'));
  const moved = [];
  const EXACT = ['kit/big-number', 'hyperframes/warm-grain-pill-stat', 'hyperframes/warm-grain-circle-stat'];
  for (const b of sb.beats || []) {
    if (b.value != null && /\d\.\d/.test(String(b.value)) && ROUNDS.test(b.kind || '')) {
      const used = new Set((sb.beats || []).map((x) => x.kind));
      const to = EXACT.find((k) => !used.has(k));
      if (!to) continue;
      moved.push({id: b.id, from: b.kind, to, value: b.value});
      b.kind = to;
    }
  }
  if (moved.length) fs.writeFileSync(storyboardFile, JSON.stringify(sb, null, 2));
  return moved;
}
