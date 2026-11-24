// research: a topic -> a folder of sources (web pages, your files, your videos' subtitles), each with its dates,
// and a fact sheet your agent fills. `research check` traces every fact to the source it cites:
// numbers must be in that source, "quoted words" must be its words. A post started from this folder is then
// checked against the fact sheet and the sources.
// Method adapted from stanford-oval/storm (MIT): perspectives -> questions -> answers only from the sources,
// and from assafelovic/gpt-researcher (Apache-2.0): keep sources broad, prefer recent and reliable ones, never cite what you did not read.
import fs from 'node:fs';
import path from 'node:path';
import {readPage} from './web.mjs';
import {readSource, isUrl, isYouTube} from './source.mjs';
import {numbersIn, sourceNumbers, quoteMatch, norm} from './check.mjs';

export const today = () => new Date().toISOString().slice(0, 10);
const stamp = () => today().replace(/-/g, '');
export const slugify = (s) => String(s || 'topic').normalize('NFC').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'topic';
export const isResearch = (d) => { try { return fs.statSync(d).isDirectory() && fs.existsSync(path.join(d, 'research.json')); } catch { return false; } };
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

export function loadResearch(dir) {
  const r = readJson(path.join(dir, 'research.json'));
  for (const s of r.sources) s.body = fs.existsSync(path.join(dir, s.text)) ? fs.readFileSync(path.join(dir, s.text), 'utf8') : '';
  return r;
}

function save(dir, r) {
  const clean = {...r, sources: r.sources.map(({body, ...s}) => s)};
  fs.writeFileSync(path.join(dir, 'research.json'), JSON.stringify(clean, null, 2));
}

export async function addSources(dir, inputs, {log = () => {}} = {}) {
  const r = readJson(path.join(dir, 'research.json'));
  fs.mkdirSync(path.join(dir, 'sources'), {recursive: true});
  const added = [], failed = [];
  for (const input of inputs) {
    const key = isUrl(input) ? input : path.resolve(input);
    if (r.sources.some((s) => s.url === key || s.file === key)) { log(`    already in: ${input}`); continue; }
    const id = 'S' + (r.sources.length + 1);
    try {
      let s;
      if (isUrl(input) && !isYouTube(input)) {
        const p = await readPage(input);
        if (p.paras.join(' ').length < 200) throw new Error('almost no text on that page (it may need a browser or a login)');
        s = {id, kind: 'web', url: p.url, title: p.title, site: p.site, author: p.author, published: p.published, modified: p.modified, body: p.paras.join('\n')};
      } else {
        const src = await readSource([input], {workDir: dir});
        s = {id, kind: src.kind === 'youtube' ? 'youtube' : 'file', url: src.url || null, file: src.url ? null : key, title: src.title, site: src.url ? 'YouTube' : 'your file', published: null, modified: src.url ? null : fs.statSync(key).mtime.toISOString().slice(0, 10), body: src.lines.map((l) => l.text).join('\n')};
      }
      s.fetched = today();
      s.chars = s.body.length;
      s.text = `sources/${id}.txt`;
      fs.writeFileSync(path.join(dir, s.text), s.body + '\n');
      delete s.body;
      r.sources.push(s);
      added.push(s);
      log(`    ${id}  ${s.title.slice(0, 60)}  ${s.site}${s.published ? ', published ' + s.published : s.modified ? ', changed ' + s.modified : ''}`);
    } catch (e) {
      failed.push({input, error: e.message});
      log(`    could not read ${input}: ${e.message}`);
    }
  }
  save(dir, r);
  return {added, failed, research: r};
}

export async function startResearch({topic, inputs = [], out = 'out', lang = 'ko', log = () => {}}) {
  if (!topic) throw new Error('Give a topic: research "AI 1인 기업" [links or files...]');
  const dir = path.join(path.resolve(out), `${stamp()}_${slugify(topic)}-research`);
  fs.mkdirSync(path.join(dir, 'sources'), {recursive: true});
  if (!fs.existsSync(path.join(dir, 'research.json'))) fs.writeFileSync(path.join(dir, 'research.json'), JSON.stringify({kind: 'research', topic, lang, created: new Date().toISOString(), sources: []}, null, 2));
  if (!fs.existsSync(path.join(dir, 'questions.md'))) fs.writeFileSync(path.join(dir, 'questions.md'), questionsTemplate(topic));
  if (!fs.existsSync(path.join(dir, 'facts.md'))) fs.writeFileSync(path.join(dir, 'facts.md'), factsTemplate(topic));
  const res = inputs.length ? await addSources(dir, inputs, {log}) : {added: [], failed: []};
  return {dir, ...res};
}

function questionsTemplate(topic) {
  return `# Questions: ${topic}

<!-- Step 1 (perspectives): who reads this and who knows it? 3 to 5 people, one line each, for example
     a beginner who just heard the word, someone already doing it, a skeptic, someone paying for it.
     Step 2: each one asks 2 to 4 questions, one at a time, no repeats.
     Step 3: search for each question in plain words (no site: or quotes), open the pages, add them:
       research add <this folder> <link> <link> ...
     Answer only from what the pages say. If no page answers it, write "no source" and move on. -->

## Perspectives
-

## Questions
-
`;
}

function factsTemplate(topic) {
  return `# Fact sheet: ${topic}

<!-- One fact per line: "- what the source says [S1]". Copy numbers exactly as the source writes them.
     "Quoted words" must be the source's own words. Two sources for one fact: [S1][S3].
     Then: research check <this folder> -->
`;
}

// "- text [S1][S2]"
export function parseFacts(md) {
  const out = [];
  let skip = false; // bullets under "## Perspectives" or "## Questions" are notes, not facts
  for (const raw of md.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const h = raw.match(/^#{2,}\s+(.+)$/);
    if (h) { skip = /perspective|question|관점|질문|메모|notes?/i.test(h[1]); continue; }
    const m = raw.match(/^\s*[-*]\s+(.+)$/);
    if (!m || skip) continue;
    const cites = [...m[1].matchAll(/\[(S\d+)\]/g)].map((x) => x[1]);
    const text = m[1].replace(/\s*\[S\d+\]/g, '').trim();
    if (text) out.push({text, cites});
  }
  return out;
}

const sentences = (body) => body.split(/\n+|(?<=[.!?。])\s+(?=\S)/).map((s) => s.trim()).filter(Boolean);

// every fact -> ok / problems, with the source sentence that holds each number
export function checkFacts(facts, sources) {
  const byId = Object.fromEntries(sources.map((s) => [s.id, s]));
  return facts.map((f) => {
    const problems = [], evidence = [];
    if (!f.cites.length) problems.push('no source: add [S1] (the source it came from)');
    const bad = f.cites.filter((c) => !byId[c]);
    if (bad.length) problems.push(`unknown source ${bad.join(', ')}`);
    const cited = f.cites.map((c) => byId[c]).filter(Boolean);
    for (const num of numbersIn(f.text)) {
      const hit = cited.find((s) => sourceNumbers(s.body).has(num));
      if (!hit) problems.push(`the number ${num} is not in ${f.cites.join(', ') || 'any cited source'}`);
      else {
        const sent = sentences(hit.body).find((x) => numbersIn(x).has(num) || sourceNumbers(x).has(num));
        evidence.push({num, source: hit.id, sentence: (sent || '').slice(0, 240)});
      }
    }
    for (const q of [...f.text.matchAll(/"([^"]{6,})"|“([^”]{6,})”/g)].map((x) => x[1] || x[2])) {
      const best = Math.max(0, ...cited.map((s) => quoteMatch(q, norm(s.body))));
      if (best < 0.8) problems.push(`the quote "${q.slice(0, 30)}" is not the source's own words`);
    }
    if (!evidence.length && cited.length) {
      // no number: show the closest source sentence so a person can see where it came from
      const words = norm(f.text);
      let best = {score: 0};
      for (const s of cited) for (const x of sentences(s.body)) { const sc = quoteMatch(x.length > words.length ? words : x, norm(x.length > words.length ? x : words)); if (sc > best.score) best = {score: sc, source: s.id, sentence: x.slice(0, 240)}; }
      if (best.sentence) evidence.push({num: null, source: best.source, sentence: best.sentence, closeness: Math.round(best.score * 100)});
    }
    return {...f, ok: !problems.length, problems, evidence};
  });
}

export function researchCheck(dir) {
  const r = loadResearch(dir);
  const facts = parseFacts(fs.readFileSync(path.join(dir, 'facts.md'), 'utf8'));
  const checked = checkFacts(facts, r.sources);
  const used = new Set(checked.flatMap((f) => f.cites));
  const out = {topic: r.topic, checkedAt: new Date().toISOString(), sources: r.sources.map(({body, ...s}) => ({...s, used: used.has(s.id)})), facts: checked};
  fs.writeFileSync(path.join(dir, 'facts.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(dir, 'research.html'), researchHtml(out));
  return out;
}

// the lines a post can use: every fact (with its source id) and every source line
export function researchLines(dir) {
  const r = loadResearch(dir);
  const facts = fs.existsSync(path.join(dir, 'facts.md')) ? parseFacts(fs.readFileSync(path.join(dir, 'facts.md'), 'utf8')) : [];
  const lines = facts.map((f) => ({start: null, end: null, text: f.text + (f.cites.length ? ' [' + f.cites.join('][') + ']' : ''), ref: f.cites[0] || null, fact: true}));
  for (const s of r.sources) for (const t of s.body.split('\n').filter(Boolean)) lines.push({start: null, end: null, text: t, ref: s.id});
  return {topic: r.topic, lines, sources: r.sources.map(({body, ...s}) => s), facts: facts.length};
}

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function researchHtml(d) {
  const ok = d.facts.filter((f) => f.ok).length;
  const src = d.sources.map((s) => `<li id="${s.id}"><b class="id">${s.id}</b><div><a href="${esc(s.url || '')}">${esc(s.title)}</a><span class="meta">${esc(s.site || '')}${s.published ? ' · published ' + s.published : ''}${s.modified ? ' · changed ' + s.modified : ''} · read ${s.fetched}${s.used ? '' : ' · not used'}</span></div></li>`).join('');
  const facts = d.facts.map((f, i) => `<li class="${f.ok ? 'ok' : 'bad'}"><span class="n">${String(i + 1).padStart(2, '0')}</span><div><p>${esc(f.text)} ${f.cites.map((c) => `<a class="chip" href="#${c}">${c}</a>`).join('')}</p>${f.evidence.map((e) => `<p class="ev">${e.num ? `<b>${esc(e.num)}</b> ` : ''}${e.source}: ${esc(e.sentence)}</p>`).join('')}${f.problems.map((p) => `<p class="pr">FIX ${esc(p)}</p>`).join('')}</div></li>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fact sheet: ${esc(d.topic)}</title>
<style>
:root{--bg:#0b0a08;--fg:#f3ede2;--mute:#9a9183;--gold:#D6892A;--line:#2a251e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;word-break:keep-all}
main{max-width:980px;margin:0 auto;padding:56px 24px 80px}
.k{color:var(--gold);letter-spacing:.2em;font-size:12px;text-transform:uppercase}
h1{font-family:"Bodoni 72","Didot","Noto Serif KR",serif;font-weight:500;font-size:44px;line-height:1.15;margin:10px 0 6px}
.sum{color:var(--mute);margin:0 0 36px}.sum b{color:var(--gold);font-weight:600}
h2{font-family:"Bodoni 72","Didot","Noto Serif KR",serif;font-weight:500;color:var(--gold);font-size:22px;border-top:1px solid var(--line);padding-top:22px;margin-top:36px}
ol{list-style:none;padding:0;margin:0}
.facts li{display:grid;grid-template-columns:44px 1fr;gap:12px;padding:16px 0;border-bottom:1px solid var(--line)}
.n{font-family:"Bodoni 72",serif;color:var(--gold);font-size:22px}
.facts p{margin:0 0 6px}.ev{color:var(--mute);font-size:13.5px;border-left:2px solid var(--line);padding-left:10px}.ev b{color:var(--gold)}
.pr{color:#ff8a65;font-size:14px}.bad .n{color:#ff8a65}
.chip{display:inline-block;font-size:12px;border:1px solid var(--gold);color:var(--gold);border-radius:99px;padding:0 8px;margin-left:4px;text-decoration:none;vertical-align:2px}
.src li{display:grid;grid-template-columns:44px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
.src a{color:var(--fg)}.id{color:var(--gold);font-weight:600}.meta{display:block;color:var(--mute);font-size:13px}
@media(max-width:600px){h1{font-size:32px}main{padding:36px 16px}}
</style></head><body><main>
<div class="k">connect-ai-writer · research</div>
<h1>${esc(d.topic)}</h1>
<p class="sum"><b>${ok}/${d.facts.length}</b> facts trace to their source · ${d.sources.length} sources · checked ${d.checkedAt.slice(0, 10)}</p>
<h2>Facts</h2><ol class="facts">${facts}</ol>
<h2>Sources</h2><ol class="src">${src}</ol>
</main></body></html>`;
}
