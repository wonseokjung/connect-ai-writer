// Read what the user owns into one shape: {kind, title, origin, video, url, lines: [{start, end, text}]}.
// Sources: .srt / .vtt / .txt / .md, a video file (with its subtitles next to it or --srt), a YouTube link (its subtitles,
// through yt-dlp if it is installed), or a web page of your own (the article text, through Mozilla Readability).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const VIDEO = /\.(mp4|mov|m4v|mkv|webm|avi)$/i;
export const isVideo = (f) => VIDEO.test(f);
export const isYouTube = (s) => /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(s);
export const isUrl = (s) => /^https?:\/\//i.test(s);

export function toSec(t) {
  const m = String(t).trim().replace(',', '.').split(':').map(Number);
  return m.reduce((a, v) => a * 60 + v, 0);
}
export function clock(s) {
  s = Math.max(0, s || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(x).padStart(2, '0');
}

const clean = (t) => t.replace(/<[^>]+>/g, '').replace(/\{\\[^}]+\}/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function parseSubtitles(text) {
  const out = [];
  const blocks = text.replace(/\r/g, '').replace(/^WEBVTT[^\n]*\n/, '').split(/\n\s*\n/);
  for (const b of blocks) {
    const rows = b.split('\n').filter((r) => r.trim() !== '');
    const i = rows.findIndex((r) => r.includes('-->'));
    if (i < 0) continue;
    const [a, z] = rows[i].split('-->').map((x) => x.trim().split(/\s+/)[0]);
    const txt = clean(rows.slice(i + 1).join(' '));
    if (!txt) continue;
    out.push({start: toSec(a), end: toSec(z), text: txt});
  }
  // YouTube auto captions roll: each cue repeats the one before. Keep only the new words.
  const dedup = [];
  let full = null; // the whole text of the cue before, as it was shown
  for (const c of out) {
    const prev = dedup[dedup.length - 1];
    if (prev && c.text === full) { prev.end = c.end; continue; }
    if (prev && full && c.text.startsWith(full + ' ')) { const rest = c.text.slice(full.length).trim(); full = c.text; if (rest) dedup.push({...c, text: rest}); continue; }
    full = c.text;
    dedup.push({...c});
  }
  return dedup;
}

export function parseText(text) {
  const lines = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const r = raw.trim();
    if (!r) continue;
    const m = r.match(/^\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d+)?)\]?\s*[-|]?\s*(.+)$/);
    if (m) lines.push({start: toSec(m[1]), end: null, text: clean(m[2])});
    else lines.push({start: null, end: null, text: r.replace(/^#+\s*/, '')});
  }
  for (let i = 0; i < lines.length; i++) if (lines[i].start != null && lines[i].end == null) lines[i].end = lines.slice(i + 1).find((l) => l.start != null)?.start ?? lines[i].start + 3;
  return lines;
}

function sidecar(video) {
  const dir = path.dirname(video), base = path.basename(video).replace(VIDEO, '');
  const all = fs.readdirSync(dir).filter((f) => /\.(srt|vtt)$/i.test(f));
  return all.find((f) => f.replace(/\.(srt|vtt)$/i, '') === base) || all.find((f) => f.startsWith(base)) || null;
}

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {encoding: 'utf8'});
  return r.status === 0 ? r.stdout.split('\n')[0].trim() : null;
}

async function fromYouTube(url, {downloadVideo = false, workDir} = {}) {
  const yt = which('yt-dlp');
  if (!yt) throw new Error('A YouTube link needs yt-dlp (it reads the subtitles). Install it (brew install yt-dlp / pip install yt-dlp), or give the .srt file you already have.');
  const dir = fs.mkdtempSync(path.join(workDir || os.tmpdir(), 'yt-'));
  const title = spawnSync(yt, ['--skip-download', '--print', 'title', url], {encoding: 'utf8'}).stdout.trim();
  const r = spawnSync(yt, ['--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', 'ko,en,ko-orig,en-orig', '--sub-format', 'vtt', '-o', path.join(dir, 'sub.%(ext)s'), url], {encoding: 'utf8'});
  const subs = fs.readdirSync(dir).filter((f) => f.endsWith('.vtt')).sort((a, b) => (a.includes('.ko') ? -1 : 1) - (b.includes('.ko') ? -1 : 1));
  if (!subs.length) throw new Error('No subtitles found for that video. ' + (r.stderr || '').split('\n').slice(-2).join(' '));
  let video = null;
  if (downloadVideo) {
    spawnSync(yt, ['-f', 'bv*[height<=1080][ext=mp4]+ba/b[height<=1080]', '--merge-output-format', 'mp4', '-o', path.join(dir, 'video.%(ext)s'), url], {stdio: 'inherit'});
    video = fs.readdirSync(dir).map((f) => path.join(dir, f)).find((f) => isVideo(f)) || null;
  }
  return {kind: 'youtube', title, origin: url, url, video, lines: parseSubtitles(fs.readFileSync(path.join(dir, subs[0]), 'utf8'))};
}

async function fromPage(url) {
  const res = await fetch(url, {headers: {'user-agent': 'Mozilla/5.0 connect-ai-writer'}});
  if (!res.ok) throw new Error(`could not open ${url} (${res.status})`);
  const html = await res.text();
  const {parseHTML} = await import('linkedom');
  const {Readability} = await import('@mozilla/readability');
  const {document} = parseHTML(html);
  const art = new Readability(document).parse();
  const text = (art?.textContent || '').split(/\n+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 1);
  return {kind: 'page', title: art?.title || url, origin: url, url, video: null, lines: text.map((t) => ({start: null, end: null, text: t}))};
}

export async function readSource(inputs, {srt = null, video = null, downloadVideo = false, workDir} = {}) {
  const list = Array.isArray(inputs) ? inputs : [inputs];
  const parts = [];
  for (const input of list) {
    if (isYouTube(input)) { parts.push(await fromYouTube(input, {downloadVideo, workDir})); continue; }
    if (isUrl(input)) { parts.push(await fromPage(input)); continue; }
    const f = path.resolve(input);
    if (!fs.existsSync(f)) throw new Error(`not found: ${input}`);
    if (fs.statSync(f).isDirectory()) throw new Error(`${input} is a folder. Give a file: a video, .srt, .vtt, .txt or .md`);
    if (isVideo(f)) {
      const side = srt ? path.resolve(srt) : sidecar(f) && path.join(path.dirname(f), sidecar(f));
      if (!side) throw new Error(`No subtitles for ${path.basename(f)}. The writer reads what you said from subtitles. Either put ${path.basename(f).replace(VIDEO, '')}.srt next to the video (same name), or add --srt my.srt (same timeline as the video). From your YouTube video: YouTube Studio > 자막 (Subtitles) > the language > ... > 다운로드 (Download) > .srt. 자막 파일(.srt)을 영상 옆에 같은 이름으로 두거나 --srt 로 알려 주세요.`);
      parts.push({kind: 'video', title: path.basename(f).replace(VIDEO, ''), origin: f, video: f, lines: parseSubtitles(fs.readFileSync(side, 'utf8')), subtitles: side});
      continue;
    }
    const text = fs.readFileSync(f, 'utf8');
    const lines = /\.(srt|vtt)$/i.test(f) ? parseSubtitles(text) : parseText(text);
    const title = (/\.md$/i.test(f) && text.match(/^#\s+(.+)$/m)?.[1]) || path.basename(f).replace(/\.[^.]+$/, '');
    parts.push({kind: /\.(srt|vtt)$/i.test(f) ? 'subtitles' : 'notes', title, origin: f, video: null, lines});
  }
  const first = parts[0];
  const src = {kind: first.kind, title: first.title, origin: parts.map((p) => p.origin), url: parts.find((p) => p.url)?.url || null, video: video ? path.resolve(video) : parts.find((p) => p.video)?.video || null, lines: parts.flatMap((p) => p.lines)};
  if (video && !fs.existsSync(src.video)) throw new Error(`video not found: ${video}`);
  if (!src.lines.length) throw new Error('The source has no text in it.');
  return src;
}

export function sourceText(src) {
  return src.lines.map((l) => (l.start != null ? `[${clock(l.start)}] ` : '') + l.text).join('\n');
}
