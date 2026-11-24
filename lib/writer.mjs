// Optional: let a headless agent write the drafts (for example "claude -p" or "codex exec"), when no chat is open.
// The usual way is simpler: your agent reads brief.md and writes each post.md itself (see skill/SKILL.md).
// The command gets one prompt on stdin and must print each post as "=== <platform> ===" followed by the post.md text.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export function writerPrompt(runDir, keys) {
  const read = (f) => (fs.existsSync(path.join(runDir, f)) ? fs.readFileSync(path.join(runDir, f), 'utf8') : '');
  return `You write social posts for the person whose source is below. Follow the brief exactly. Do not use tools; answer with text only.
For each platform print a line "=== <platform> ===" and then the full post.md for it. Platforms: ${keys.join(', ')}.

${read('brief.md')}

## Voice sheet
${read('source/voice.md') || '(none: write plainly, first person, spoken)'}

## Source (source/source.txt)
${read('source/source.txt').slice(0, 60000)}
`;
}

export function parseWriterOutput(text, keys) {
  const out = {};
  const re = /^===\s*([a-z]+)\s*===\s*$/gim;
  const marks = [...text.matchAll(re)];
  marks.forEach((m, i) => {
    const k = m[1].toLowerCase();
    if (!keys.includes(k)) return;
    out[k] = text.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : undefined).replace(/^\s*```(?:markdown|md)?\s*\n|\n```\s*$/g, '').trim() + '\n';
  });
  return out;
}

export function writeWithCommand(runDir, keys, command, {overwrite = false, log = console.log} = {}) {
  log(`  asking: ${command}`);
  const r = spawnSync(command, {shell: true, input: writerPrompt(runDir, keys), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 15 * 60 * 1000});
  if (r.status !== 0) throw new Error(`the writer command failed: ${(r.stderr || '').split('\n').slice(-4).join(' ')}`);
  const posts = parseWriterOutput(r.stdout || '', keys);
  const wrote = [];
  for (const [k, md] of Object.entries(posts)) {
    const f = path.join(runDir, k, 'post.md');
    if (fs.existsSync(f) && !fs.readFileSync(f, 'utf8').includes('{{write}}') && !overwrite) { log(`  kept your ${k}/post.md (use --overwrite to replace it)`); continue; }
    fs.writeFileSync(f, md);
    wrote.push(k);
  }
  if (!wrote.length && !Object.keys(posts).length) throw new Error('the writer printed no "=== platform ===" sections');
  return wrote;
}
