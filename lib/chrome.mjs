// Pictures from HTML: your own Chrome (or Edge / Chromium) in headless mode takes a screenshot at the exact size.
// No browser is downloaded; set CHROME_PATH if yours is somewhere else.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const CANDIDATES = {
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
  win32: [process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'), process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft/Edge/Application/msedge.exe'), process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')],
  linux: ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'],
};

let cached;
export function findChrome() {
  if (cached !== undefined) return cached;
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return (cached = process.env.CHROME_PATH);
  for (const c of (CANDIDATES[process.platform] || CANDIDATES.linux).filter(Boolean)) {
    if (c.includes('/') || c.includes('\\')) { if (fs.existsSync(c)) return (cached = c); continue; }
    const r = spawnSync('which', [c], {encoding: 'utf8'});
    if (r.status === 0) return (cached = r.stdout.trim());
  }
  return (cached = null);
}

// a busy computer sometimes makes Chrome exit before it writes the file: try once more before giving up
async function once(job) {
  try { return await onceRaw(job); } catch (e) {
    if (/did not write/.test(e.message)) return onceRaw(job);
    throw e;
  }
}

function onceRaw({target, w, h, out, wait = 2500}) {
  const chrome = findChrome();
  if (!chrome) return Promise.reject(new Error('No Chrome, Edge or Chromium found. Install Chrome, or set CHROME_PATH.'));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'caiw-chrome-'));
  const a = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio', `--user-data-dir=${profile}`, `--window-size=${w},${h}`, '--force-device-scale-factor=1', `--virtual-time-budget=${wait}`, `--screenshot=${out}`, target];
  return new Promise((resolve, reject) => {
    const p = spawn(chrome, a, {stdio: 'ignore'});
    const t = setTimeout(() => p.kill(), 60000);
    p.on('error', reject);
    p.on('close', () => {
      clearTimeout(t);
      fs.rmSync(profile, {recursive: true, force: true});
      fs.existsSync(out) ? resolve(out) : reject(new Error('Chrome did not write ' + path.basename(out)));
    });
  });
}

// jobs: [{html | url, w, h, out}] -> runs up to 4 at a time
export async function shoot(jobs, {parallel = 4, tmp = os.tmpdir()} = {}) {
  const queue = jobs.map((j, i) => ({...j, i}));
  const done = [];
  async function worker() {
    while (queue.length) {
      const j = queue.shift();
      let target = j.url;
      if (!target) {
        const f = path.join(tmp, `card-${process.pid}-${j.i}-${Date.now()}.html`);
        fs.writeFileSync(f, j.html);
        target = pathToFileURL(f).href;
        try { await once({target, w: j.w, h: j.h, out: j.out, wait: j.wait}); } finally { fs.rmSync(f, {force: true}); }
      } else await once({target, w: j.w, h: j.h, out: j.out, wait: j.wait || 5000});
      done.push(j.out);
    }
  }
  await Promise.all(Array.from({length: Math.min(parallel, jobs.length)}, worker));
  return done;
}
