// Settings: platforms.json, rules.json, banned.json, theme. A file with the same name in your project folder wins.
import fs from 'node:fs';
import path from 'node:path';
import {KIT} from './name.mjs';

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')));

export function pick(name, dirs = []) {
  for (const d of dirs.filter(Boolean)) {
    const f = path.join(d, name);
    if (fs.existsSync(f)) return f;
  }
  return path.join(KIT, name);
}

export function loadConfig(dir = null, {theme = null} = {}) {
  const dirs = [dir, dir && path.dirname(dir)];
  const files = {platforms: pick('platforms.json', dirs), rules: pick('rules.json', dirs), banned: pick('banned.json', dirs)};
  const platforms = strip(read(files.platforms));
  const rules = read(files.rules);
  const banned = read(files.banned);
  let themeFile = theme && fs.existsSync(theme) ? path.resolve(theme) : null;
  if (!themeFile && theme) themeFile = path.join(KIT, 'themes', theme.replace(/\.json$/, '') + '.json');
  if (!themeFile) themeFile = [dir, dir && path.dirname(dir)].filter(Boolean).map((d) => path.join(d, 'theme.json')).find((f) => fs.existsSync(f)) || path.join(KIT, 'themes', 'default.json');
  if (!fs.existsSync(themeFile)) throw new Error(`theme not found: ${theme}. Built in: ${fs.readdirSync(path.join(KIT, 'themes')).map((f) => f.replace('.json', '')).join(', ')}`);
  files.theme = themeFile;
  const settingsFile = [dir, dir && path.dirname(dir)].filter(Boolean).map((d) => path.join(d, 'writer.config.json')).find((f) => fs.existsSync(f));
  const settings = settingsFile ? {...read(settingsFile), _dir: path.dirname(settingsFile)} : {};
  files.settings = settingsFile || null;
  return {platforms, rules, banned, theme: {...read(path.join(KIT, 'themes', 'default.json')), ...read(themeFile)}, settings, files};
}

export function platformList(platforms, want = 'threads,naver,x') {
  if (!want || want === 'all') return Object.keys(platforms).filter((k) => !platforms[k].optional);
  const keys = want.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).map((k) => ({blog: 'naver', twitter: 'x', ig: 'instagram', insta: 'instagram', 쓰레드: 'threads', 스레드: 'threads', 네이버: 'naver', 블로그: 'naver', 링크드인: 'linkedin', 인스타: 'instagram', 인스타그램: 'instagram', 티스토리: 'tistory', 브런치: 'brunch', 뉴스레터: 'newsletter', email: 'newsletter', 메일: 'newsletter', 이메일: 'newsletter', 롱폼: 'article', 아티클: 'article', longform: 'article', 칼럼: 'article'}[k] || k));
  const bad = keys.filter((k) => !platforms[k]);
  if (bad.length) throw new Error(`unknown platform: ${bad.join(', ')}. Known: ${Object.keys(platforms).join(', ')}`);
  return [...new Set(keys)];
}
