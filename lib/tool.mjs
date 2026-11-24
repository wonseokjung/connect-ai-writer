// Running a program you set up (a writer command, an image hook) without a shell.
// The command is split into words once, run with shell:false, gets the prompt on stdin (never in its arguments),
// and sees only a small set of environment variables plus the ones you name in "passEnv".
import {spawnSync} from 'node:child_process';

// "claude -p" -> ['claude', '-p'];  'my tool "a b"' -> ['my', 'tool', 'a b'];  an array stays as it is
export function splitCommand(cmd) {
  if (Array.isArray(cmd)) return cmd.map(String).filter((x) => x.length);
  const out = [];
  let cur = '', q = null, any = false;
  for (const ch of String(cmd || '')) {
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; any = true; continue; }
    if (/\s/.test(ch)) { if (cur || any) out.push(cur); cur = ''; any = false; continue; }
    cur += ch;
  }
  if (q) throw new Error(`the command has an open quote: ${cmd}`);
  if (cur || any) out.push(cur);
  return out;
}

const BASE_ENV = ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TMPDIR', 'TEMP', 'TMP', 'SHELL', 'TERM', 'SYSTEMROOT', 'SystemRoot', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'PROGRAMFILES', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME'];
export function smallEnv(pass = [], env = process.env) {
  const out = {};
  for (const k of [...BASE_ENV, ...(pass || [])]) if (env[k] != null) out[k] = env[k];
  return out;
}

export function runTool(cmd, {input = '', vars = {}, passEnv = [], timeout = 15 * 60 * 1000, env = process.env, stdio} = {}) {
  const words = splitCommand(cmd).map((w) => w.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)));
  if (!words.length) throw new Error('empty command');
  const [file, ...args] = words;
  const o = {input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout, env: smallEnv(passEnv, env), shell: false, windowsHide: true};
  if (stdio) o.stdio = stdio;
  let r = spawnSync(file, args, o);
  // Windows: npm-style .cmd shims only start through cmd.exe. The words are yours (a flag or your user config), the prompt is still on stdin.
  if (r.error && r.error.code === 'ENOENT' && process.platform === 'win32') r = spawnSync(file, args, {...o, shell: true});
  return r;
}
