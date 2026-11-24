// Dogfood gate: check our own Korean docs with our own tools before a release.
// node scripts/dogfood.mjs <out-folder> [--voice voice.md]
// humanize (AI tells, 번역투) and check's text rules (banned phrases, strong claims, emoji, corner brackets, long dashes)
// on README.ko.md, docs/guide.ko.md and the Korean text of docs/textbook/index.html. Exit 2 if anything is a FIX.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyze, loadPatterns, humanizeHtml, reportLines} from '../lib/humanize.mjs';
import {checkPost} from '../lib/check.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || 'dogfood');
const vi = process.argv.indexOf('--voice');
const own = vi > 0 ? fs.readFileSync(process.argv[vi + 1], 'utf8').replace(/<!--[\s\S]*?-->/g, '') : '';
fs.mkdirSync(out, {recursive: true});

const ent = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' '};
function textbookKo(html) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head[\s\S]*?<\/head>/g, '')
    .replace(/<(br|\/p|\/li|\/h\d|\/pre|\/dt|\/dd|\/figcaption|\/div)[^>]*>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&[#a-z0-9]+;/g, (e) => ent[e] ?? e).split('\n').map((l) => l.trim()).filter(Boolean).join('\n') + '\n';
}

const docs = [
  ['README.ko.md', fs.readFileSync(path.join(KIT, 'README.ko.md'), 'utf8')],
  ['guide.ko.md', fs.readFileSync(path.join(KIT, 'docs', 'guide.ko.md'), 'utf8')],
  ['textbook_ko.txt', textbookKo(fs.readFileSync(path.join(KIT, 'docs', 'textbook', 'index.html'), 'utf8'))],
];
const rules = JSON.parse(fs.readFileSync(path.join(KIT, 'rules.json'), 'utf8'));
for (const k of ['numbersInSource', 'quotesInSource', 'noImages', 'firstPartImage', 'limits', 'placeholder', 'hooks', 'seo', 'sources', 'email', 'generatedImages']) rules[k] = 'off';
const banned = JSON.parse(fs.readFileSync(path.join(KIT, 'banned.json'), 'utf8'));
const platform = {name: 'doc', kind: 'article', count: 'chars', maxChars: 1e9, maxImages: 1e9};
// a double-quoted example or quote is not our own sentence (the same rule humanize uses)
const unquoted = (t) => t.replace(/"[^"\n]+"|“[^”\n]+”/g, '""');

const patterns = loadPatterns(KIT);
const log = [];
let fixes = 0;
for (const [name, text] of docs) {
  fs.writeFileSync(path.join(out, name), text);
  const h = analyze(text, {patterns, own});
  const c = checkPost({key: name, post: {title: name, parts: [{text: unquoted(text), images: []}], tags: []}, platform, source: {lines: []}, rules, banned});
  const fix = h.findings.filter((f) => f.severity === 'strong').length + c.filter((f) => f.level === 'fail').length;
  fixes += fix;
  fs.writeFileSync(path.join(out, name.replace(/\.[^.]+$/, '') + '.humanize.html'), humanizeHtml({file: name, text, result: h}));
  log.push(`== ${name}`, `humanize  score ${h.score} per 1,000 letters (${h.grade}), ${h.findings.length} marks, ${h.quoted.length} quoted (not counted)`);
  for (const l of reportLines(h)) log.push('  ' + l);
  log.push(`check     ${c.filter((f) => f.level === 'fail').length} FIX, ${c.filter((f) => f.level === 'warn').length} LOOK`);
  for (const f of c) log.push(`  ${f.level === 'fail' ? 'FIX ' : 'LOOK'} ${f.message}`);
  log.push(`FIX total ${fix}`, '');
}
log.push(fixes ? `DOGFOOD FAIL: ${fixes} FIX` : 'DOGFOOD PASS: 0 FIX');
fs.writeFileSync(path.join(out, 'dogfood.txt'), log.join('\n') + '\n');
console.log(log.join('\n'));
if (fixes) process.exitCode = 2;
