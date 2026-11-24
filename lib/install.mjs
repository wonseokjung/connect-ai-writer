// Skill installer: copies skill/ into each agent's skills folder. Only a folder copy; agent settings are not touched.
// Same installer as connect-ai-motion, connect-ai-video-motion and connect-ai-product-photo (CONNECT AI LAB, MIT): marker file, no symlinks on the path, remove only our own folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {KIT, KIT_NAME, VERSION, REPO} from './name.mjs';

const MARKER = '.connect-ai-writer.json';

// ---------- the runtime: a copy of the kit that stays ----------
// npx keeps its download in a cache folder that npm may clean at any time. The skill must not point there.
// install-skill copies the kit to ~/.connect-ai/connect-ai-writer/<version>/ (or $CONNECT_AI_HOME/...), installs its
// dependencies there with `npm ci --omit=dev`, and the skill calls that folder's bin/cli.mjs by its full path.
export const runtimeRoot = ({home = os.homedir(), env = process.env} = {}) => path.join(env.CONNECT_AI_HOME || path.join(home, '.connect-ai'), KIT_NAME);
export const inNpxCache = (dir) => /[\\/]_npx[\\/]/.test(dir);

// which commit this copy came from: the npx lock (github install), a git checkout, or the version tag
export function sourceRef(kit = KIT) {
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(kit, '..', '.package-lock.json'), 'utf8'));
    const r = lock.packages?.['node_modules/' + KIT_NAME]?.resolved || '';
    const m = r.match(/#([0-9a-f]{40})$/);
    if (m) return m[1];
  } catch {}
  try {
    if (fs.existsSync(path.join(kit, '.git'))) {
      const r = spawnSync('git', ['-C', kit, 'rev-parse', 'HEAD'], {encoding: 'utf8', timeout: 5000});
      if (r.status === 0 && /^[0-9a-f]{40}$/.test(r.stdout.trim())) return r.stdout.trim();
    }
  } catch {}
  return 'v' + VERSION;
}

function defaultNpm(args, {cwd}) {
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {cwd, encoding: 'utf8', timeout: 10 * 60 * 1000, shell: process.platform === 'win32', windowsHide: true});
  return {code: r.error ? 1 : r.status, out: ((r.stdout || '') + (r.stderr || '') + (r.error ? r.error.message : '')).trim()};
}
const sha = (f) => (fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16) : '');

export function installRuntime({home = os.homedir(), env = process.env, kit = KIT, npm = defaultNpm, log = console.log, dryRun = false} = {}) {
  const dir = path.join(runtimeRoot({home, env}), VERSION);
  const bin = path.join(dir, 'bin', 'cli.mjs');
  const ref = sourceRef(kit);
  if (dryRun) { log(`  runtime: ${dir}  (dry run)`); return {dir, bin, ref, dry: true}; }
  if (path.resolve(kit) !== path.resolve(dir)) {
    const pkg = JSON.parse(fs.readFileSync(path.join(kit, 'package.json'), 'utf8'));
    const keepModules = fs.existsSync(path.join(dir, 'node_modules')) && sha(path.join(dir, 'package-lock.json')) === sha(path.join(kit, 'package-lock.json'));
    for (const e of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (!(keepModules && e === 'node_modules')) fs.rmSync(path.join(dir, e), {recursive: true, force: true});
    fs.mkdirSync(dir, {recursive: true});
    for (const f of [...new Set([...(pkg.files || []), 'package.json', 'package-lock.json'])]) {
      const s = path.join(kit, f.replace(/\/$/, ''));
      if (!fs.existsSync(s)) continue;
      const d = path.join(dir, f.replace(/\/$/, ''));
      if (fs.statSync(s).isDirectory()) copyDir(s, d);
      else { fs.mkdirSync(path.dirname(d), {recursive: true}); fs.copyFileSync(s, d); }
    }
    if (!keepModules) {
      log(`  runtime: ${dir}`);
      log('    npm ci --omit=dev (the pictures library and friends, once)...');
      const r = npm(['ci', '--omit=dev', '--no-audit', '--no-fund', '--prefer-offline'], {cwd: dir});
      if (r.code !== 0) {
        fs.rmSync(dir, {recursive: true, force: true});
        throw new Error(`npm ci in ${dir} failed: ${String(r.out).split('\n').slice(-4).join(' ')}`);
      }
    } else log(`  runtime: ${dir}  (already there)`);
  }
  fs.writeFileSync(path.join(dir, '.runtime.json'), JSON.stringify({package: KIT_NAME, version: VERSION, ref, from: inNpxCache(kit) ? 'npx' : 'folder', made: new Date().toISOString()}, null, 2) + '\n');
  return {dir, bin, ref};
}

export function agentTable({home = os.homedir(), env = process.env} = {}) {
  const claude = env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
  const codex = env.CODEX_HOME || path.join(home, '.codex');
  const shared = path.join(home, '.agents', 'skills');
  return [
    {key: 'claude', label: 'Claude Code', detect: [claude], skills: path.join(claude, 'skills')},
    {key: 'codex', label: 'Codex', detect: [codex], skills: shared},
    {key: 'antigravity', label: 'Antigravity', detect: [path.join(home, '.gemini', 'config'), path.join(home, '.gemini', 'antigravity'), path.join(home, '.antigravity')], skills: path.join(home, '.gemini', 'config', 'skills')},
    {key: 'cursor', label: 'Cursor', detect: [path.join(home, '.cursor')], skills: path.join(home, '.cursor', 'skills')},
    {key: 'gemini', label: 'Gemini CLI', detect: [path.join(home, '.gemini', 'settings.json')], skills: shared},
  ];
}
const exists = (p) => {
  try { fs.lstatSync(p); return true; } catch { return false; }
};
const isLink = (p) => {
  try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; }
};
function linkOnPath(dest, home) {
  let p = path.resolve(dest);
  const stop = path.resolve(home);
  for (let i = 0; i < 12 && p !== stop && p !== path.dirname(p); i++) {
    if (isLink(p)) return p;
    p = path.dirname(p);
  }
  return '';
}
const mine = (dir) => {
  try { return JSON.parse(fs.readFileSync(path.join(dir, MARKER), 'utf8')).package === KIT_NAME; } catch { return false; }
};
function copyDir(src, dst) {
  fs.mkdirSync(dst, {recursive: true});
  let n = 0;
  for (const e of fs.readdirSync(src, {withFileTypes: true})) {
    if (e.name === '.DS_Store') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) n += copyDir(s, d);
    else if (e.isFile()) { fs.copyFileSync(s, d); n++; }
  }
  return n;
}

function targets({agent = 'all', dir = null, project = false, home = os.homedir(), env = process.env} = {}) {
  const table = agentTable({home, env});
  let picked = [];
  if (dir) picked.push({label: 'folder you gave', skills: path.resolve(dir)});
  if (project) picked.push({label: 'this project', skills: path.join(process.cwd(), '.claude', 'skills')});
  if (!picked.length) {
    let keys = agent === 'all' ? table.filter((a) => a.detect.some(exists)).map((a) => a.key) : agent.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    const unknown = agent === 'all' ? [] : keys.filter((k) => !table.some((a) => a.key === k));
    if (unknown.length) throw new Error(`unknown agent: ${unknown.join(', ')}. Use ${table.map((a) => a.key).join(', ')}, or --dir <folder>.`);
    if (agent === 'all' && !keys.length) {
      // Fresh computer: no agent folder yet (e.g. Antigravity just installed). Use the agent that is running us,
      // or else the three folders a beginner most likely has. Only our own folder is created, nothing else is touched.
      const caller = env.CLAUDECODE ? 'claude' : Object.keys(env).some((k) => k.startsWith('CODEX_')) ? 'codex'
        : Object.keys(env).some((k) => /^ANTIGRAVITY|^GEMINI_CLI/.test(k)) ? 'antigravity' : '';
      keys = caller ? [caller] : ['antigravity', 'claude', 'codex'];
    }
    picked = keys.map((k) => table.find((a) => a.key === k)).filter(Boolean);
  }
  const merged = [];
  for (const p of picked) {
    const hit = merged.find((m) => m.skills === p.skills);
    if (hit) hit.label += ', ' + p.label;
    else merged.push({...p});
  }
  return merged.map((m) => ({...m, dest: path.join(m.skills, KIT_NAME)}));
}

// the skill file says where the kit lives on THIS computer, so the agent never depends on the npx cache
export function pinSkill(skillMd, {bin, fallback, kit}) {
  const q = JSON.stringify(bin);
  const where = kit ? ` The kit folder (\`<kit>\` below) is \`${kit}\`.` : '';
  const block = `<!-- connect-ai-writer:runtime -->\nOn this computer the kit runs as: \`node ${q}\` (that is \`CW\` below). If that file is gone, use \`${fallback}\`.${where}\n<!-- /connect-ai-writer:runtime -->`;
  return /<!-- connect-ai-writer:runtime -->[\s\S]*?<!-- \/connect-ai-writer:runtime -->/.test(skillMd) ? skillMd.replace(/<!-- connect-ai-writer:runtime -->[\s\S]*?<!-- \/connect-ai-writer:runtime -->/, block) : skillMd;
}

export function installSkill({agent, dir, project, dryRun, log = console.log, home = os.homedir(), env = process.env, runtime = true, npm, kit = KIT} = {}) {
  const ver = VERSION;
  const list = targets({agent, dir, project, home, env});
  if (!list.length) { log('  No agent found. Use --agent claude|codex|antigravity|cursor or --dir <folder>.'); return list; }
  const rt = runtime ? installRuntime({home, env, kit, npm, log, dryRun}) : {dir: kit, bin: path.join(kit, 'bin', 'cli.mjs'), ref: sourceRef(kit)};
  const fallback = `npx github:${REPO}#${rt.ref}`;
  for (const t of list) {
    let action = !exists(t.dest) ? 'install' : mine(t.dest) ? 'update' : 'skip';
    if (linkOnPath(t.dest, home)) action = 'blocked';
    log(`  ${t.label}: ${t.dest}  ${action}${action === 'skip' ? ' (another folder with this name is there)' : action === 'blocked' ? ' (symbolic link on the path, not touched)' : ''}`);
    t.action = action;
    if (dryRun || action === 'skip' || action === 'blocked') continue;
    if (action === 'update') fs.rmSync(t.dest, {recursive: true, force: true});
    let n = copyDir(path.join(kit, 'skill'), t.dest);
    if (fs.existsSync(path.join(kit, 'NOTICE.md'))) { fs.copyFileSync(path.join(kit, 'NOTICE.md'), path.join(t.dest, 'NOTICE.md')); n++; }
    const skillMd = path.join(t.dest, 'SKILL.md');
    fs.writeFileSync(skillMd, pinSkill(fs.readFileSync(skillMd, 'utf8'), {bin: rt.bin, fallback, kit: rt.dir}));
    fs.writeFileSync(path.join(t.dest, MARKER), JSON.stringify({package: KIT_NAME, version: ver, kit: rt.dir, bin: rt.bin, installedAt: new Date().toISOString(), run: `node ${JSON.stringify(rt.bin)}`, fallback}, null, 2) + '\n');
    log(`    ${n} file${n === 1 ? '' : 's'} (the skill your agent reads)`);
    t.done = true;
  }
  return list;
}

export function removeSkill({agent, dir, project, dryRun, log = console.log, home = os.homedir(), env = process.env} = {}) {
  for (const t of targets({agent, dir, project, home, env})) {
    if (!exists(t.dest)) continue;
    const ok = mine(t.dest) && !linkOnPath(t.dest, home);
    log(`  ${t.dest}  ${ok ? 'remove' : 'keep (not ours)'}`);
    if (ok && !dryRun) fs.rmSync(t.dest, {recursive: true, force: true});
  }
}
