// check.json: the result of build's check for one platform, sealed with a hash of what was checked
// (post.md, post.json and every picture post.json lists). post refuses a draft whose files changed after the check.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function sealOf(dir) {
  const h = crypto.createHash('sha256');
  for (const f of ['post.md', 'post.json']) {
    const p = path.join(dir, f);
    h.update(f + '\0');
    if (fs.existsSync(p)) h.update(fs.readFileSync(p));
  }
  let images = [];
  try { images = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8')).parts.flatMap((p) => p.images || []); } catch {}
  for (const f of images) {
    const p = path.join(dir, f);
    h.update('\0' + f + '\0');
    if (fs.existsSync(p)) h.update(fs.readFileSync(p));
    else h.update('missing');
  }
  return h.digest('hex');
}

export function writeSeal(dir, findings) {
  const fails = findings.filter((f) => f.level === 'fail'), warns = findings.filter((f) => f.level === 'warn');
  const images = findings.filter((f) => f.image).map((f) => ({line: f.image.raw, ok: false, error: f.image.error}));
  const skipped = findings.some((f) => f.rule === 'picturesSkipped');
  const out = {ok: !fails.length && !skipped, ...(skipped ? {why: 'pictures were not drawn (--no-pictures)'} : {}), fails: fails.length, warns: warns.length, findings: findings.map(({platform, rule, level, part, message, fix}) => ({platform, rule, level, part, message, fix})), images, checkedAt: new Date().toISOString(), hash: sealOf(dir)};
  fs.writeFileSync(path.join(dir, 'check.json'), JSON.stringify(out, null, 2) + '\n');
  return out;
}

export function readSeal(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'check.json'), 'utf8')); } catch { return null; }
}
