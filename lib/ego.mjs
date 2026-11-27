// The bridge to the browser, same idea as connect-ai-marketer's: we write a short script and pipe it to
// `cab nodejs` (CONNECT AI Browser, ours, first) or `ego-browser nodejs` (Ego Lite). Which one: lib/browser.mjs
// (CONNECT_AI_BROWSER=cab|ego, or "browser" in your own ~/.connect-ai/connect-ai-writer/writer.config.json).
// Every run makes its OWN new task space (a unique name), works only there, and closes it at the end.
// In CONNECT AI Browser it works as the agent "writer" and the plan panel shows the steps while the window is on screen.
// It never lists, claims or takes over a space it did not create.
import fs from 'node:fs';
import {spawn, spawnSync} from 'node:child_process';
import * as B from './browser.mjs';
import {userConfigFile} from './config.mjs';

const MARK = '__CAIW_RESULT__';
export const AGENT = 'writer';
const CAB_FIRST = '// connect-ai-writer on CONNECT AI Browser';

// browser and cabPath come only from your own user folder (a downloaded project folder cannot pick a program to run)
export function userBrowserConfig() {
  try { const c = JSON.parse(fs.readFileSync(userConfigFile(), 'utf8')); return {browser: c.browser, cabPath: c.cabPath}; } catch { return {}; }
}
export const browser = () => B.choose({config: userBrowserConfig(), egoInstalled: () => !!egoInstalled()}).browser;

let found = null;
export function egoCommand(platform = process.platform) {
  if (platform !== 'win32') return {file: 'ego-browser', shell: false};
  if (found) return found;
  const hits = (spawnSync('where', ['ego-browser'], {encoding: 'utf8', windowsHide: true}).stdout || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const hit = hits.find((x) => /\.(exe|cmd|bat)$/i.test(x));
  if (hit && /\.exe$/i.test(hit)) return (found = {file: hit, shell: false});
  if (hit) return (found = {file: '"' + hit + '"', shell: true});
  return {file: 'ego-browser', shell: false};
}

export function egoInstalled() {
  const c = egoCommand();
  const r = spawnSync(c.file, ['--version'], {encoding: 'utf8', timeout: 15000, shell: c.shell, windowsHide: true});
  return !r.error && r.status === 0 ? ((r.stdout || '') + (r.stderr || '')).split('\n').map((l) => l.trim()).find((l) => /ego-browser/i.test(l)) || 'ego-browser' : null;
}

// body runs inside the browser's Node runtime with `task`, `page`, `P` (params), `W(ms)`, `say(...)`, `step(name)` and `done(value)`.
// The space is closed with finish({keep: []}) at the end, or finish({keep: ['p1']}) when P.leaveOpen is true.
// opts.plan: the steps the body marks with step(name), shown in CONNECT AI Browser's plan panel (Ego Lite ignores them).
export function wrap(body, params, {plan = [], browser: which = browser()} = {}) {
  const cab = which === 'cab';
  return `${cab ? CAB_FIRST + '\n' : ''}const P = ${JSON.stringify(cab ? {...params, __cab: {...B.cabStatus(), shot: B.shotFile('writer')}} : params)};
${cab ? B.CAB_SHIM : ''}let result = null;
const done = (v) => { result = v; };
const say = (...a) => console.log('[writer]', ...a);
const task = await ${cab ? 'newTaskSpace' : 'taskSpace'}(P.space);
say('task space', task.spaceId, P.space);
const page = ${cab ? '__fit(task.page(\'p1\'))' : 'task.page(\'p1\')'};
const W = (ms) => page.waitForTimeout(ms);
const step = ${cab ? 'async (s) => { try { await task.step(s); } catch {} }' : 'async () => {}'};
${cab && plan.length ? `await task.plan(${JSON.stringify(plan)});\n` : ''}try {
${body}
} catch (e) {
  result = {status: 'error', error: String(e && e.message || e).slice(0, 400)};
  try { if (P.shot) result.screenshot = await page.screenshot({path: P.shot.replace(/\\.png$/, '-error.png')}); } catch {}
}
${cab ? "if (P.__cab.shot) try { await page.screenshot({path: P.__cab.shot}); say('last screen', P.__cab.shot); } catch {}\ntry { await task.done(); } catch {}\n" : ''}if (result && result.status === 'logged-out') { await task.finish({keep: []}); }
else if (P.leaveOpen || (result && result.keepOpen)) { await task.finish({keep: ['p1']}); if (result) result.leftOpen = true; }
else { await task.finish({keep: []}); }
${cab ? 'await __print' : 'console.log'}(${JSON.stringify(MARK)} + JSON.stringify({...(result || {status: 'no-result'}), space: task.spaceId}));
`;
}

// Runs the script in ego-browser and returns the result line. Every way it can go wrong becomes a plain error:
// not installed, the pipe closed early (EPIPE), it exited without a result, a result that is not JSON, or a timeout.
// The browser comes from the script's first line (wrap writes it); command = {file, shell} replaces the program (tests).
export function run(script, {timeoutMs = 300000, log = () => {}, command = null} = {}) {
  const which = script.startsWith(CAB_FIRST) ? 'cab' : 'ego';
  const c = command ? {...command, args: ['nodejs']} : B.command(which, {agent: AGENT, cabPath: userBrowserConfig().cabPath, ego: egoCommand()});
  const name = which === 'cab' ? 'cab' : 'ego-browser';
  return new Promise((resolve, reject) => {
    if (!c.file) return reject(new Error(c.missing));
    let settled = false;
    const finish = (fn, v) => { if (!settled) { settled = true; clearTimeout(t); fn(v); } };
    let p;
    try { p = spawn(c.file, c.args, {stdio: ['pipe', 'pipe', 'pipe'], shell: c.shell, windowsHide: true, env: c.env || process.env}); } catch (e) { return reject(new Error(name + ' could not start: ' + e.message)); }
    let out = '', err = '';
    const t = setTimeout(() => { try { p.kill(); } catch {} finish(reject, new Error(name + ' timed out')); }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; for (const l of String(d).split('\n')) if (l.startsWith('[writer]')) log('    ' + l.slice(9)); });
    p.stderr.on('data', (d) => (err += d));
    p.stdin.on('error', (e) => { if (e.code !== 'EPIPE') err += '\n' + e.message; });
    p.on('error', () => finish(reject, new Error(which === 'cab' ? `CONNECT AI Browser is not installed (${c.file}). Install it once: ${B.INSTALL_CAB}` : 'ego-browser is not installed or not on PATH. Install Ego Lite first: https://lite.ego.app')));
    p.on('close', (code) => {
      const line = (out + '\n' + err).split('\n').reverse().map((l) => l.slice(Math.max(0, l.indexOf(MARK)))).find((l) => l.startsWith(MARK));
      if (line) {
        let v;
        try { v = JSON.parse(line.slice(MARK.length)); } catch { return finish(reject, new Error(name + ' sent a result that is not readable (bad JSON). Nothing was posted.')); }
        if (!v || typeof v !== 'object') return finish(reject, new Error(name + ' sent an empty result. Nothing was posted.'));
        return finish(resolve, {...v, notice: (out + err).includes('[ego-browser:notice]')});
      }
      const plain = which === 'cab' && B.cabError(err);
      finish(reject, new Error(plain ? `CONNECT AI Browser: ${plain}` : `${name} exited ${code} before it finished: ${(err || out).split('\n').filter((l) => !l.includes('[ego-browser:notice]')).slice(-6).join('\n') || 'no output'}`));
    });
    p.stdin.end(script);
  });
}
