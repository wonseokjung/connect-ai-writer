// Which browser this AI employee works in. CONNECT AI Browser (`cab`, ours) comes first; Ego Lite (`ego-browser`) when cab is not here.
//   choose:  CONNECT_AI_BROWSER=cab|ego, else "browser": "cab" | "ego" in config, else cab when it is installed, else Ego Lite.
//   find cab: CONNECT_AI_CAB (cab.mjs or a cab command), else "cabPath" in config, else a `cab` command on PATH,
//            else the copy `cab setup` keeps (~/.connect-ai/connect-ai-browser/<version>), else the kit of the browser that is running now.
// Both browsers get the same short script on stdin (`cab nodejs` / `ego-browser nodejs`). In cab the employee works under its own
// agent name, in a new space of its own, and the plan panel shows its steps while the window is on screen.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export const CAB_HOME = process.env.CAB_HOME || path.join(os.homedir(), '.connect-ai', 'browser');
const win = process.platform === 'win32';
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const script = (p) => ({file: process.execPath, args: [p], shell: false, path: p});

function fromValue(v) {
  if (!v) return null;
  if (/\.m?js$/i.test(v)) return fs.existsSync(v) ? script(v) : null;
  return fs.existsSync(v) || !v.includes(path.sep) ? {file: v, args: [], shell: win && /\.cmd$/i.test(v), path: v} : null;
}
function onPath() {
  const r = spawnSync(win ? 'where' : 'which', ['cab'], {encoding: 'utf8', windowsHide: true});
  const hit = r.status === 0 ? (r.stdout || '').split(/\r?\n/).map((x) => x.trim()).find(Boolean) : null;
  return hit ? {file: hit, args: [], shell: win && /\.cmd$/i.test(hit), path: hit} : null;
}
function setupCopy(home = os.homedir()) {
  const dir = path.join(process.env.CONNECT_AI_HOME || path.join(home, '.connect-ai'), 'connect-ai-browser');
  let vs = [];
  try { vs = fs.readdirSync(dir).filter((v) => fs.existsSync(path.join(dir, v, 'bin', 'cab.mjs'))); } catch {}
  const num = (v) => v.split('.').map((x) => +x || 0);
  vs.sort((a, b) => { const x = num(a), y = num(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; });
  return vs.length ? script(path.join(dir, vs[0], 'bin', 'cab.mjs')) : null;
}
// The browser that runs now was started as `node <kit>/bin/cab.mjs __daemon`: the same kit can run our scripts.
function runningKit() {
  const run = readJson(path.join(CAB_HOME, 'run.json'));
  if (win || !run?.daemonPid || !alive(run.daemonPid)) return null;
  const r = spawnSync('ps', ['-ww', '-o', 'command=', '-p', String(run.daemonPid)], {encoding: 'utf8', env: {...process.env, LC_ALL: 'en_US.UTF-8'}});
  const cmd = (r.stdout || '').trim();
  const end = cmd.lastIndexOf('/bin/cab.mjs');
  if (end < 0) return null;
  for (let i = 0; i < end; i++) if (cmd[i] === '/' && (i === 0 || cmd[i - 1] === ' ')) { const p = cmd.slice(i, end + 12); if (fs.existsSync(p)) return script(p); }
  return null;
}

export function findCab({cabPath = null, env = process.env} = {}) {
  const tries = [['CONNECT_AI_CAB', () => fromValue(env.CONNECT_AI_CAB)], ['config cabPath', () => fromValue(cabPath)], ['cab on PATH', onPath], ['cab setup copy', () => setupCopy()], ['running browser', runningKit]];
  for (const [how, f] of tries) { const c = f(); if (c) return {...c, how}; }
  return null;
}

// installed = the kit is here and this computer has its profile folder (cab setup or cab start made it)
export function cabInstalled(o = {}) { return Boolean(fs.existsSync(CAB_HOME) && findCab(o)); }

export function cabStatus() {
  const run = readJson(path.join(CAB_HOME, 'run.json'));
  return run && alive(run.daemonPid) ? {running: true, mode: run.mode || 'cdp', headless: Boolean(run.headless)} : {running: false};
}

export function choose({config = {}, env = process.env, egoInstalled = () => false} = {}) {
  const want = String(env.CONNECT_AI_BROWSER || config.browser || 'auto').toLowerCase();
  if (want === 'cab' || want === 'ego') return {browser: want, why: env.CONNECT_AI_BROWSER ? 'CONNECT_AI_BROWSER=' + want : 'config browser: ' + want};
  if (cabInstalled({cabPath: config.cabPath, env})) return {browser: 'cab', why: 'CONNECT AI Browser is installed'};
  if (egoInstalled()) return {browser: 'ego', why: 'CONNECT AI Browser is not installed here; Ego Lite is'};
  return {browser: 'cab', why: 'no browser found yet; CONNECT AI Browser is the one to install'};
}

export const LABEL = {cab: 'CONNECT AI Browser', ego: 'Ego Lite'};
export const INSTALL_CAB = 'npx github:wonseokjung/connect-ai-browser setup';

// How to start `<browser> nodejs` for this employee. agent = the employee's name in cab (marketer, writer, ...).
export function command(browser, {agent, cabPath = null, env = process.env, ego = null} = {}) {
  if (browser === 'ego') return {...(ego || {file: 'ego-browser', shell: false}), args: ['nodejs'], env, label: LABEL.ego};
  const c = findCab({cabPath, env});
  if (!c) return {file: null, args: [], env, label: LABEL.cab, missing: `CONNECT AI Browser is not installed. Install it once: ${INSTALL_CAB}`};
  return {file: c.file, args: [...c.args, 'nodejs'], shell: c.shell, env: {...env, CAB_AGENT: agent}, label: LABEL.cab, how: c.how};
}

// CONNECT_AI_BROWSER_SHOTS=<folder>: each cab run keeps a picture of its last screen there (for checking a run afterwards)
export function shotFile(name, env = process.env) {
  const dir = env.CONNECT_AI_BROWSER_SHOTS;
  if (!dir) return null;
  fs.mkdirSync(dir, {recursive: true});
  return path.join(path.resolve(dir), `${String(name).replace(/[^\w.-]+/g, '-')}-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}.png`);
}

// `[cab] CAB_NOT_RUNNING: ...` on stderr -> one plain sentence
export function cabError(text) {
  const m = /\[cab\] (CAB_[A-Z_]+|error): ([^\n]*)/.exec(String(text || ''));
  if (!m) return null;
  const say = {
    CAB_NOT_RUNNING: 'CONNECT AI Browser is not running. Start it (cab start), then run this again.',
    CAB_BLOCKED: 'that site is on your deny list in CONNECT AI Browser (cab config). Nothing was opened.',
    CAB_SENSITIVE_FIELD: 'the page asked for a password or a code. That is yours to type; nothing was typed.',
    CAB_USER_CONTROL: 'the space is with you right now. Press Done in the gold banner, then run this again.',
    CAB_TOKEN: 'CONNECT AI Browser refused the connection (token). Run cab doctor.',
  }[m[1]];
  return say ? `${say} (${m[1]})` : `${m[1]}: ${m[2]}`;
}

// Runs first in every cab script: a few Ego Lite calls the kits use, on cab's page object. P.__cab = cabStatus() (+ shot).
export const CAB_SHIM = String.raw`
const __ext = (P.__cab && P.__cab.mode) === 'ext';
// the result line waits until it is written: cab ends its process right after the script, and a long line could be cut
const __print = (line) => new Promise((r) => process.stdout.write(line + '\n', r));
const __fit = (page) => {
  if (!page || page.__fitted) return page;
  page.__fitted = true;
  // page.$(selector): the first match of a CSS list (":has-text()" allowed per part), with click(); null when none
  if (!page.$) page.$ = async (sel) => {
    const parts = []; let d = 0, q = null, cur = '';
    for (const ch of String(sel)) { if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; else if ('([' .includes(ch)) d++; else if (')]'.includes(ch)) d--; if (ch === ',' && !q && !d) { parts.push(cur.trim()); cur = ''; } else cur += ch; }
    if (cur.trim()) parts.push(cur.trim());
    const hit = await page.evaluate((parts) => {
      for (const p of parts) {
        const m = p.match(/^(.*):has-text\((["'])(.*)\2\)$/);
        let els = []; try { els = [...document.querySelectorAll(m ? (m[1] || '*') : p)]; } catch { continue; }
        if (m) els = els.filter((e) => (e.innerText || '').toLowerCase().includes(m[3].toLowerCase()));
        const i = els.findIndex((e) => e.getClientRects().length);
        if (els.length) return {p, i: i < 0 ? 0 : i};
      }
      return null;
    }, parts);
    return hit ? {click: (o) => page.click(hit.p + ' >> nth=' + hit.i, o)} : null;
  };
  // screenshot({clip}) as well as {fullPage}. Extension mode on a screen: the space comes forward first, since a window
  // behind another one gives no picture (it waited up to 60 s in our tests).
  const shot = page.screenshot && page.screenshot.bind(page);
  if (shot && page.cdp) page.screenshot = async (o = {}) => {
    if (__ext && !(P.__cab && P.__cab.headless)) await page.cdp('Page.bringToFront').catch(() => {});
    if (!o.clip || !o.path) return shot(o);
    const fs = await import('node:fs');
    const {data} = await page.cdp('Page.captureScreenshot', {format: 'png', clip: {...o.clip, scale: 1}});
    fs.writeFileSync(o.path, Buffer.from(data, 'base64'));
    return o.path;
  };
  // Select all (Cmd/Ctrl+A) also selects inside the box in extension mode
  const press = page.keyboard && page.keyboard.press.bind(page.keyboard);
  if (press) page.keyboard.press = async (key) => { await press(key); if (/^(ControlOrMeta|Meta|Control)\+a$/i.test(key)) await page.evaluate(() => document.execCommand('selectAll')); };
  // waitForFileChooser in extension mode: the file box the page opens is caught, then setFiles puts the files in it
  if (__ext) page.waitForFileChooser = async ({timeout = 30000} = {}) => {
    await page.evaluate(() => {
      document.querySelectorAll('[data-cab-chooser]').forEach((e) => e.removeAttribute('data-cab-chooser'));
      if (window.__cabChooserHook) return;
      window.__cabChooserHook = true;
      const click = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this.type !== 'file') return click.call(this);
        if (!this.isConnected) { this.style.display = 'none'; document.body.appendChild(this); }
        this.setAttribute('data-cab-chooser', '1');
      };
    });
    return {setFiles: async (files) => {
      await page.waitForSelector('[data-cab-chooser]', {state: 'attached', timeout});
      await page.setInputFiles('[data-cab-chooser]', [].concat(files));
      await page.evaluate(() => document.querySelectorAll('[data-cab-chooser]').forEach((e) => e.removeAttribute('data-cab-chooser')));
    }};
  };
  return page;
};
`;
