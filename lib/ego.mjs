// The bridge to Ego Lite (ego-browser), same idea as connect-ai-marketer's: we write a short script and pipe it to
// `ego-browser nodejs`. Every run makes its OWN new TaskSpace (a unique name), works only there, and closes it at the end.
// It never lists, claims or takes over a space it did not create.
import {spawn, spawnSync} from 'node:child_process';

const MARK = '__CAIW_RESULT__';

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

// body runs inside ego-browser's Node runtime with `task`, `page`, `P` (params), `W(ms)`, `say(...)` and `done(value)`.
// The space is closed with finish({keep: []}) at the end, or finish({keep: ['p1']}) when P.leaveOpen is true.
export function wrap(body, params) {
  return `const P = ${JSON.stringify(params)};
let result = null;
const done = (v) => { result = v; };
const say = (...a) => console.log('[writer]', ...a);
const task = await taskSpace(P.space);
say('task space', task.spaceId, P.space);
const page = task.page('p1');
const W = (ms) => page.waitForTimeout(ms);
try {
${body}
} catch (e) {
  result = {status: 'error', error: String(e && e.message || e).slice(0, 400)};
  try { if (P.shot) result.screenshot = await page.screenshot({path: P.shot.replace(/\\.png$/, '-error.png')}); } catch {}
}
if (result && result.status === 'logged-out') { await task.finish({keep: []}); }
else if (P.leaveOpen) { await task.finish({keep: ['p1']}); if (result) result.leftOpen = true; }
else { await task.finish({keep: []}); }
console.log(${JSON.stringify(MARK)} + JSON.stringify({...(result || {status: 'no-result'}), space: task.spaceId}));
`;
}

export function run(script, {timeoutMs = 300000, log = () => {}} = {}) {
  return new Promise((resolve, reject) => {
    const c = egoCommand();
    const p = spawn(c.file, ['nodejs'], {stdio: ['pipe', 'pipe', 'pipe'], shell: c.shell, windowsHide: true});
    let out = '', err = '';
    const t = setTimeout(() => { p.kill(); reject(new Error('ego-browser timed out')); }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; for (const l of String(d).split('\n')) if (l.startsWith('[writer]')) log('    ' + l.slice(9)); });
    p.stderr.on('data', (d) => (err += d));
    p.on('error', () => { clearTimeout(t); reject(new Error('ego-browser is not installed or not on PATH. Install Ego Lite first: https://lite.ego.app')); });
    p.on('close', (code) => {
      clearTimeout(t);
      const line = (out + '\n' + err).split('\n').reverse().map((l) => l.slice(Math.max(0, l.indexOf(MARK)))).find((l) => l.startsWith(MARK));
      if (line) return resolve({...JSON.parse(line.slice(MARK.length)), notice: (out + err).includes('[ego-browser:notice]')});
      reject(new Error(`ego-browser exited ${code}: ${(err || out).split('\n').filter((l) => !l.includes('[ego-browser:notice]')).slice(-6).join('\n')}`));
    });
    p.stdin.end(script);
  });
}
