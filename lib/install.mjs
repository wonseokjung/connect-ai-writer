// Skill installer: copies skill/ into each agent's skills folder. Only a folder copy; agent settings are not touched.
// Same installer as connect-ai-motion, connect-ai-video-motion and connect-ai-product-photo (CONNECT AI LAB, MIT): marker file, no symlinks on the path, remove only our own folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {KIT, KIT_NAME, VERSION} from './name.mjs';

const MARKER = '.connect-ai-writer.json';

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
    let keys = agent === 'all' ? table.filter((a) => a.detect.some(exists)).map((a) => a.key) : agent.split(',');
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

export function installSkill({agent, dir, project, dryRun, log = console.log, home = os.homedir(), env = process.env} = {}) {
  const ver = VERSION;
  const list = targets({agent, dir, project, home, env});
  if (!list.length) log('  No agent found. Use --agent claude|codex|antigravity|cursor or --dir <folder>.');
  for (const t of list) {
    let action = !exists(t.dest) ? 'install' : mine(t.dest) ? 'update' : 'skip';
    if (linkOnPath(t.dest, home)) action = 'blocked';
    log(`  ${t.label}: ${t.dest}  ${action}${action === 'skip' ? ' (another folder with this name is there)' : action === 'blocked' ? ' (symbolic link on the path, not touched)' : ''}`);
    t.action = action;
    if (dryRun || action === 'skip' || action === 'blocked') continue;
    if (action === 'update') fs.rmSync(t.dest, {recursive: true, force: true});
    const n = copyDir(path.join(KIT, 'skill'), t.dest);
    fs.writeFileSync(path.join(t.dest, MARKER), JSON.stringify({package: KIT_NAME, version: ver, kit: KIT, installedAt: new Date().toISOString(), run: `npx ${KIT_NAME}@${ver}`}, null, 2) + '\n');
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
