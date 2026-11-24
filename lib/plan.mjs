// plan: before writing, pick the angle, the title and the first line for each platform.
// `plan <run>` writes plan.md with hook and title shapes to fill; `plan <run> --score` ranks what you (or your agent) wrote:
// length for the platform, search words near the front, numbers only from the source, no AI-sounding or overclaiming words.
// Title and hook shapes adapted from coreyhaines31/marketingskills (MIT); the scoring is ours.
import fs from 'node:fs';
import path from 'node:path';
import {loadConfig} from './config.mjs';
import {numbersIn, sourceNumbers, length} from './check.mjs';

export const SHAPES = {
  titles: [
    '{search words}: {what you get} ({how / how long})',
    '{search words}, {number from the source} {thing} I {did}',
    'How I {did the thing} with {search words} (without {pain})',
    '{search words} for {who}: {the one thing that matters}',
  ],
  hooks: [
    'A result first: "{what happened, with the real number}"',
    'I was wrong about {thing}. {what changed}',
    'Stop {common habit}. {what I do instead}',
    '{surprising true detail}. {why it matters to the reader}',
    'Last {day / week}, {unexpected thing happened}',
    'Everyone says {X}. When I tried, {Y}',
  ],
  rules: [
    'A shape is only a shape: fill it with a specific fact, number or scene from the source.',
    'Can the reader picture it? Can it be checked? Could anyone else write this exact line? If yes, rewrite it.',
    'One or two strong moments per post; plain lines everywhere else.',
  ],
};

export function planTemplate({title, keys, platforms}) {
  return `# Plan: ${title}

<!-- Fill this before writing the posts. Then: plan <run> --score
     ${SHAPES.rules.join('\n     ')} -->

keyword:
angle:
for who:

## titles
<!-- 5 to 10. Shapes: ${SHAPES.titles.join(' | ')} -->
-

${keys.map((k) => `## hooks ${k}
<!-- ${platforms[k].name}: 3 to 5 first lines${platforms[k].hook?.firstLineMax ? `, about ${platforms[k].hook.firstLineMax} characters show` : ''}. Shapes: ${SHAPES.hooks.join(' | ')} -->
- `).join('\n\n')}
`;
}

export function parsePlan(md) {
  const body = md.replace(/<!--[\s\S]*?-->/g, '');
  const meta = {};
  for (const m of body.matchAll(/^(keyword|angle|for who)\s*:\s*(.*)$/gim)) meta[m[1].toLowerCase()] = m[2].trim();
  const groups = {};
  let cur = null;
  for (const l of body.split('\n')) {
    const h = l.match(/^##\s+(titles|hooks\s+(\w+))\s*$/i);
    if (h) { cur = h[2] ? h[2].toLowerCase() : 'titles'; groups[cur] = []; continue; }
    const it = l.match(/^\s*[-*]\s+(.+)$/);
    if (cur && it && it[1].trim()) groups[cur].push(it[1].trim());
  }
  return {meta, groups};
}

export function scoreLine(line, {kind, platform, keyword, srcNums, banned, claims}) {
  let score = 60;
  const why = [];
  const n = length(line, platform?.count || 'chars');
  const lo = kind === 'title' ? platform?.seo?.titleMin || 12 : 8;
  const hi = kind === 'title' ? platform?.seo?.titleMax || 40 : platform?.hook?.firstLineMax || 70;
  if (n > hi) { score -= Math.min(30, (n - hi) * 1.5); why.push(`${n} long, about ${hi} shows`); }
  else if (n < lo) { score -= 10; why.push('very short'); }
  else { score += 10; why.push('length fits'); }
  if (keyword) {
    const at = line.toLowerCase().replace(/\s+/g, '').indexOf(keyword.toLowerCase().replace(/\s+/g, ''));
    if (at < 0) { score -= kind === 'title' ? 20 : 0; if (kind === 'title') why.push('no search words'); }
    else if (at <= 10) { score += 12; why.push('search words up front'); }
    else { score += 4; why.push('search words late'); }
  }
  const nums = [...numbersIn(line)];
  if (nums.length) {
    const bad = nums.filter((x) => !srcNums.has(x));
    if (bad.length) { score -= 40; why.push(`number ${bad.join(', ')} not in your source`); }
    else { score += 12; why.push('a real number'); }
  }
  const lower = line.toLowerCase();
  for (const w of banned) if (lower.includes(w.toLowerCase())) { score -= 25; why.push(`"${w}" sounds like an AI`); }
  for (const w of claims) if (lower.includes(w.toLowerCase())) { score -= 15; why.push(`"${w}" overclaims`); }
  if (/[?？]$/.test(line.trim())) { score -= 3; why.push('a question (fine once)'); }
  if (/(?![©®™])\p{Extended_Pictographic}|[「」『』—―]/u.test(line)) { score -= 30; why.push('emoji, corner brackets or a long dash'); }
  return {line, score: Math.max(0, Math.min(100, Math.round(score))), why};
}

export function scorePlan(runDir) {
  const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
  const cfg = loadConfig(path.dirname(runDir));
  const src = JSON.parse(fs.readFileSync(path.join(runDir, 'source', 'source.json'), 'utf8'));
  const srcNums = sourceNumbers(src.lines.map((l) => l.text).join('\n'));
  const {meta, groups} = parsePlan(fs.readFileSync(path.join(runDir, 'plan.md'), 'utf8'));
  const banned = [...(cfg.banned.ko?.banned || []), ...(cfg.banned.en?.banned || [])];
  const claims = Object.values(cfg.rules.claims || {}).flat().filter((c) => !src.lines.some((l) => l.text.includes(c)));
  const titlePlatform = cfg.platforms[run.platforms.find((k) => cfg.platforms[k].seo) || 'naver'];
  const out = {keyword: meta.keyword || '', angle: meta.angle || '', groups: {}};
  for (const [g, lines] of Object.entries(groups)) {
    const platform = g === 'titles' ? titlePlatform : cfg.platforms[g];
    out.groups[g] = lines.map((l) => scoreLine(l, {kind: g === 'titles' ? 'title' : 'hook', platform, keyword: meta.keyword, srcNums, banned, claims})).sort((a, b) => b.score - a.score);
  }
  const md = [`# Plan scores`, '', `keyword: ${out.keyword}`, ''];
  for (const [g, rows] of Object.entries(out.groups)) {
    md.push(`## ${g}`, '');
    for (const r of rows) md.push(`- ${String(r.score).padStart(3)}  ${r.line}  (${r.why.join(', ')})`);
    md.push('');
  }
  fs.writeFileSync(path.join(runDir, 'plan-scores.md'), md.join('\n'));
  return out;
}
