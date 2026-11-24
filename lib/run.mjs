// start: read the source, make the run folder, a brief for the writer and one post.md per platform.
// build: post.md -> pictures, check, preview.html, post.txt (and post.html for blogs), a hand-off file for the marketer.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {loadConfig, platformList} from './config.mjs';
import {readSource, sourceText, clock} from './source.mjs';
import {parsePost, skeleton, plainText, citeMarks} from './postfile.mjs';
import {checkPost, imageFindings, reportText} from './check.mjs';
import {makeImages} from './images.mjs';
import {previewHtml, indexHtml, contactSheet} from './preview.mjs';
import {hasFfmpeg, candidates} from './frames.mjs';
import {KIT} from './name.mjs';
import {isResearch, researchLines} from './research.mjs';
import {motionFilms} from './engines.mjs';
import {writeSeal} from './seal.mjs';

export const slugify = (s) => String(s || 'post').normalize('NFC').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post';
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
export const SLUG_RE = /^[a-z0-9가-힣][a-z0-9가-힣_-]{0,59}$/i;
export function checkSlug(slug) {
  if (slug != null && !SLUG_RE.test(String(slug))) throw new Error(`--slug "${slug}" is not a folder name: letters, numbers, 한글, - and _ only (no / or ..), up to 60.`);
  return slug;
}
// a new folder every time; the same name gets -2, -3 ... unless you ask to resume that folder (--resume)
export function runFolder(workRoot, name, {resume = false} = {}) {
  const base = path.join(workRoot, name);
  if (resume) {
    if (!fs.existsSync(path.join(base, 'run.json'))) throw new Error(`--resume: there is no run folder ${base} to continue.`);
    return base;
  }
  let dir = base;
  for (let i = 2; fs.existsSync(dir); i++) dir = `${base}-${i}`;
  return dir;
}

function neverList(voiceMd) {
  const m = voiceMd.match(/<!--\s*never:\s*([\s\S]*?)-->/);
  return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
}

export async function start({inputs, out = 'out', want, voice, srt, video, title, slug, frames = 16, downloadVideo = false, files = [], resume = false, log = console.log}) {
  checkSlug(slug);
  // check what you named before any folder is made, so a typo does not leave a half-made run behind
  if (voice && !fs.existsSync(path.resolve(voice))) throw new Error(`--voice: not found: ${voice}. Make one first: voice <your .srt files> --out voice.md`);
  for (const f of files) if (!fs.existsSync(path.resolve(f)) || !fs.statSync(path.resolve(f)).isFile()) throw new Error(`--files: not a file: ${f}`);
  const workRoot = path.resolve(out);
  fs.mkdirSync(workRoot, {recursive: true});
  let src;
  if (inputs.length >= 1 && isResearch(path.resolve(inputs[0]))) {
    // a research folder: the fact sheet and every source you read become the source
    const dir = path.resolve(inputs[0]);
    const R = researchLines(dir);
    if (!R.facts) throw new Error(`The fact sheet in ${dir} is empty. Fill facts.md and run: research check ${dir}`);
    const more = inputs.length > 1 ? await readSource(inputs.slice(1), {srt, video, downloadVideo, workDir: workRoot}) : null;
    src = {kind: 'research', title: R.topic, origin: [dir, ...(more?.origin || [])], url: null, video: more?.video || (video ? path.resolve(video) : null), lines: [...R.lines, ...R.sources.map((x) => ({start: null, end: null, text: `${x.title} ${x.site || ''} ${x.published || ''} ${x.modified || ''}`, ref: x.id})), ...(more?.lines || [])], research: {dir, sources: R.sources}};
  } else src = await readSource(inputs, {srt, video, downloadVideo, workDir: workRoot});
  if (title) src.title = title;
  const cfg = loadConfig(workRoot);
  const keys = platformList(cfg.platforms, want);
  const runDir = runFolder(workRoot, `${today()}_${slug || slugify(src.title)}`, {resume});
  fs.mkdirSync(path.join(runDir, 'source'), {recursive: true});
  // your own pictures and pages for [image: file ...] / [image: page ...]: copied into the run folder, the only place they are read from
  const named = [];
  for (const f of files) {
    const abs = path.resolve(f);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(`--files: not a file: ${f}`);
    fs.mkdirSync(path.join(runDir, 'source', 'files'), {recursive: true});
    const dest = path.join(runDir, 'source', 'files', path.basename(abs));
    fs.copyFileSync(abs, dest);
    named.push(dest);
  }
  if (named.length) src.files = named;
  fs.writeFileSync(path.join(runDir, 'source', 'source.json'), JSON.stringify(src, null, 2));
  fs.writeFileSync(path.join(runDir, 'source', 'source.txt'), sourceText(src) + '\n');
  let voiceText = '';
  if (voice) {
    voiceText = fs.readFileSync(path.resolve(voice), 'utf8');
    fs.writeFileSync(path.join(runDir, 'source', 'voice.md'), voiceText);
  }
  let frameList = [];
  if (src.video && frames > 0 && hasFfmpeg()) {
    log(`  looking for sharp frames across the video (${frames})...`);
    frameList = await candidates(src.video, path.join(runDir, 'source', 'frames'), {count: frames});
    const {default: sharp} = await import('sharp');
    const cols = 4, tw = 400, th = 225;
    const comps = [];
    for (const [i, f] of frameList.entries()) {
      comps.push({input: await sharp(f.file).resize(tw, th, {fit: 'cover'}).toBuffer(), left: (i % cols) * (tw + 8), top: Math.floor(i / cols) * (th + 34)});
      comps.push({input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="30"><text x="4" y="22" font-family="Helvetica, Arial" font-size="20" fill="#F2B45A">${clock(f.t)}</text></svg>`), left: (i % cols) * (tw + 8), top: Math.floor(i / cols) * (th + 34) + th + 2});
    }
    await sharp({create: {width: cols * (tw + 8), height: Math.ceil(frameList.length / cols) * (th + 34), channels: 3, background: '#0b0a08'}}).composite(comps).jpeg({quality: 82}).toFile(path.join(runDir, 'source', 'frames.jpg'));
  }
  for (const k of keys) {
    const d = path.join(runDir, k);
    fs.mkdirSync(d, {recursive: true});
    const f = path.join(d, 'post.md');
    if (!fs.existsSync(f)) fs.writeFileSync(f, skeleton(k, cfg.platforms[k]));
  }
  fs.writeFileSync(path.join(runDir, 'brief.md'), brief({src, keys, cfg, voiceText, frameList, runDir}));
  const prev = resume && fs.existsSync(path.join(runDir, 'run.json')) ? JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8')) : null;
  fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify({id: prev?.id || crypto.randomUUID().slice(0, 8), title: src.title, platforms: keys, created: prev?.created || new Date().toISOString(), theme: prev?.theme || null}, null, 2));
  return {runDir, src, keys, frameList};
}

function brief({src, keys, cfg, voiceText, frameList, runDir}) {
  const P = cfg.platforms;
  return `# Writing brief: ${src.title}

You write one post.md per platform folder below, in the user's own voice, from this source only. Then run \`build\`.
First fill editorial-brief.md (run \`brief\`): who reads this, what it is for, the claims you must keep, what may be public, and the one next action. Every post follows it.

## Rules
- Only what is in the source. No number, result, price, date or promise that is not in source/source.txt. \`check\` fails on numbers it cannot find there.
- The user's voice, not an AI's: read the voice sheet${voiceText ? ' (source/voice.md)' : ' (none given; write plainly, first person, spoken)'}. No phrases from banned.json.
- No emoji, no corner brackets, no long dash (em dash). Use commas, periods, colons.
- Every post has pictures, made from real material only: frames of the user's video, quote cards with their exact words, stat cards with numbers from the source, simple step diagrams, their own page. Never a made-up person, screenshot or number.
- Nothing is posted by writing. Posting is a separate step the user starts.

## Pictures (one line each, where the picture goes)
- \`[image: frame 03:12]\` a sharp frame from the video near 03:12${src.video ? '' : ' (this source has no video, so do not use frames)'}. Add a "caption" to put a line under it.
- \`[image: quote "exact words from source.txt" 03:12]\` a quote card
- \`[image: stat "15" "what the number is" 11:49]\` a number card (the number must be in the source)
- \`[image: title "headline" "small line"]\` a cover
- \`[image: steps "one" "two" "three"]\` a simple diagram
- \`[image: page https://their.site "caption"]\` a screenshot of the user's own page (a local page only from this run folder)
- \`[image: file their-photo.jpg "caption"]\` the user's own picture (it must be in this run folder: give it with --files when you start)
${frameList.length ? `\nSharp frames to choose from: source/frames.jpg (time under each). Times: ${frameList.map((f) => clock(f.t)).join(', ')}\n` : ''}
## Platforms
${keys.map((k) => `### ${P[k].name} (${k}/post.md)
- ${P[k].kind === 'chain' ? `A thread: posts separated by a line with only ---. Each post up to ${P[k].maxChars} ${P[k].count === 'x-weighted' ? 'weighted characters (Korean letters count 2, a link 23)' : 'characters'}, up to ${P[k].maxImages} pictures, ${P[k].maxParts} posts at most.` : P[k].kind === 'article' ? `An article: "# Title", "## Heading" sections, a picture between paragraphs (at least ${P[k].minImages}), ${P[k].minChars}+ characters, "tags: a, b" at the end (up to ${P[k].tags.max}).` : P[k].kind === 'carousel' ? `Slides = the [image: ...] lines in order (up to ${P[k].maxImages}). Caption up to ${P[k].maxChars} characters. Up to ${P[k].tags.max} hashtags in "tags:".` : `One post up to ${P[k].maxChars} characters, pictures in [image: ...] lines, up to ${P[k].tags.max} hashtags in "tags:".`}
- Picture size ${P[k].image.w}x${P[k].image.h} (${P[k].image.ratio}). Language: ${P[k].lang}.
- ${P[k].tone}${P[k].hook?.firstLineMax ? `\n- First line: about ${P[k].hook.firstLineMax} characters show before "more". Put the point there.` : ''}${P[k].seo ? `\n- Add a line "keyword: <search words>" (not posted). Title ${P[k].seo.titleMin} to ${P[k].seo.titleMax} characters with the words near the front; the words once in the first paragraph and in one heading.` : ''}${P[k].email ? `\n- Start with "subject: ..." (about ${P[k].email.subjectMax} characters, clear before clever) and "preview: ..." (about ${P[k].email.previewMax}, adds to the subject). One mail, one job, one next step.` : ''}`).join('\n')}

${src.research ? `## Research
This post is built from a research folder: ${src.research.dir}
- Read its facts.md (every fact has its source id) and research.html. Use only those facts and the source texts in source/source.txt.
- You may mark where a fact came from with [S1] in the text (it shows as [1]). Articles and newsletters end with "## 출처" (or "## Sources"): one line per source you used, title, site, date, link. Link nothing you did not read.
- Sources: ${src.research.sources.map((x) => `${x.id} ${x.title} (${x.site || ''}${x.published ? ', ' + x.published : x.modified ? ', ' + x.modified : ''}) ${x.url || ''}`).join('; ')}
` : ''}
## Source
${src.kind}${src.video ? `, video ${path.basename(src.video)}` : ''}. Full text with times: source/source.txt (${src.lines.length} lines).
${voiceText ? '\n## Voice sheet\nsource/voice.md\n' : ''}`;
}

const escHtml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function build(runDir, {theme, only, pictures = true, log = console.log} = {}) {
  runDir = path.resolve(runDir);
  const src = JSON.parse(fs.readFileSync(path.join(runDir, 'source', 'source.json'), 'utf8'));
  const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
  const cfg = loadConfig(path.dirname(runDir), {theme: theme || run.theme});
  if (theme) run.theme = theme;
  const voiceFile = path.join(runDir, 'source', 'voice.md');
  const never = fs.existsSync(voiceFile) ? neverList(fs.readFileSync(voiceFile, 'utf8')) : [];
  const keys = (only ? only.split(',') : run.platforms).filter((k) => fs.existsSync(path.join(runDir, k, 'post.md')));
  const results = [];
  for (const key of keys) {
    const platform = cfg.platforms[key];
    if (!platform) continue;
    const dir = path.join(runDir, key);
    const post = parsePost(fs.readFileSync(path.join(dir, 'post.md'), 'utf8'), platform);
    log(`  ${platform.name}: ${post.parts.length} ${platform.kind === 'chain' ? 'post(s)' : 'part'}, ${post.parts.reduce((a, p) => a + p.images.length, 0)} picture line(s)`);
    const made = post.placeholder ? [] : pictures ? await makeImages({post, platform, runDir, outDir: path.join(dir, 'images'), source: src, theme: cfg.theme, settings: cfg.settings, log})
      : post.parts.flatMap((p, pi) => p.images.map((d) => ({part: pi, kind: d.kind, raw: d.raw, alt: d.caption || d.text || '', skipped: true})));
    const findings = [...checkPost({key, post, platform, source: src, rules: cfg.rules, banned: cfg.banned, never}), ...imageFindings(key, platform, made)];
    // copy-ready text
    const texts = post.parts.map((p, i) => plainText(p, post, platform, {last: i === post.parts.length - 1}));
    const mail = platform.email ? {subject: post.subject || '', preview: post.preview || ''} : null;
    const txt = (mail ? `subject: ${mail.subject}\npreview: ${mail.preview}\n\n` : '') + (platform.kind === 'chain' ? texts.map((t, i) => `----- ${i + 1}/${texts.length} -----\n${t}`).join('\n\n') : (post.title ? post.title + '\n\n' : '') + texts.join('\n\n') + (platform.kind === 'article' && post.tags.length ? '\n\ntags: ' + post.tags.join(', ') : ''));
    fs.writeFileSync(path.join(dir, 'post.txt'), txt + '\n');
    if (platform.kind === 'article') fs.writeFileSync(path.join(dir, 'post.html'), await articleHtml(post, made, dir, mail));
    fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify({platform: key, title: post.title, ...(mail || {}), tags: post.tags, parts: post.parts.map((p, i) => ({text: texts[i], images: made.filter((m) => m.part === i && m.file).map((m) => path.relative(dir, m.file).split(path.sep).join('/'))}))}, null, 2));
    fs.writeFileSync(path.join(dir, 'check.md'), `# ${platform.name} check\n\n${reportText(findings)}\n`);
    let html = previewHtml({key, platform, post, made, findings, dir, settings: cfg.settings, theme: cfg.theme});
    const films = motionFilms(runDir, key);
    if (films.length) {
      // a motion graphics video made by connect-ai-motion for this post (CW motion): shown first, listed in the hand-off
      html = html.replace(/(<body>)/, `$1<div style="max-width:720px;margin:24px auto 0;padding:0 16px;display:flex;gap:12px;flex-wrap:wrap">${films.map((f) => `<figure style="margin:0;flex:1 1 ${f.ratio === '9:16' ? '200px' : '420px'}"><video src="${path.relative(dir, f.file)}" controls muted playsinline style="width:100%;border-radius:10px;background:#000"></video><figcaption style="font:12px sans-serif;color:#9a9183;margin-top:4px">motion graphics ${f.ratio} · connect-ai-motion</figcaption></figure>`).join('')}</div>`);
      const pj = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
      pj.videos = films.map((f) => ({file: path.relative(dir, f.file), ratio: f.ratio, by: 'connect-ai-motion'}));
      fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify(pj, null, 2));
    }
    fs.writeFileSync(path.join(dir, 'preview.html'), html);
    writeSeal(dir, findings);
    results.push({key, platform, post, made, findings});
  }
  fs.writeFileSync(path.join(runDir, 'index.html'), indexHtml({run: {title: run.title, sourceLabel: `${src.kind}${src.video ? ' · ' + path.basename(src.video) : ''}`}, results, dir: runDir}));
  const sheet = await contactSheet(results, path.join(runDir, 'sheet.jpg'));
  const all = results.flatMap((r) => r.findings);
  fs.writeFileSync(path.join(runDir, 'check.md'), `# Check\n\n${reportText(all)}\n`);
  writeHandoff(runDir, results, src);
  fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(run, null, 2));
  return {runDir, results, findings: all, sheet};
}

// post.html: what you paste into a blog editor. Your words are escaped before markdown runs, so no HTML or script
// from a post.md gets through; links and pictures keep only http(s), mailto or a picture next to the file.
export async function articleHtml(post, made, dir, mail = null) {
  const {marked} = await import('marked');
  let ii = 0;
  const md = [];
  for (const p of post.parts) for (const b of p.blocks) {
    if (b.type === 'h2') md.push('## ' + escHtml(b.text));
    else if (b.type === 'text') md.push(escHtml(citeMarks(b.text)).replace(/\n/g, '  \n'));
    else { const m = made[ii++]; if (m?.file) md.push(`![${escHtml((m.alt || '').replace(/[[\]]/g, ''))}](${encodeURI(path.relative(dir, m.file).split(path.sep).join('/'))})`); }
  }
  const html = sanitizeHtml(marked.parse(md.join('\n\n')));
  const pre = mail?.preview ? `<div style="display:none;max-height:0;overflow:hidden">${escHtml(mail.preview)}</div>\n` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(mail?.subject || post.title)}</title></head><body>\n${pre}<h1>${escHtml(post.title)}</h1>\n${html}\n<p>${post.tags.map((t) => '#' + escHtml(t)).join(' ')}</p>\n</body></html>\n`;
}
export function sanitizeHtml(html) {
  return html
    .replace(/<\/?(script|style|iframe|object|embed|form|input|button|textarea|link|meta|base|svg|math)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*"([^"]*)"/gi, (m, a, v) => (/^(https?:|mailto:|#)/i.test(v) || (a.toLowerCase() === 'src' && !/^[a-z][a-z0-9+.-]*:/i.test(v)) ? m : ` ${a}="#"`));
}

// a package for connect-ai-marketer's crossposter (it posts finished words; it does not write them)
function writeHandoff(runDir, results, src) {
  const dir = path.join(runDir, 'handoff');
  fs.mkdirSync(dir, {recursive: true});
  const channels = {};
  for (const r of results) if (['x', 'threads', 'linkedin'].includes(r.key) && r.post.parts.length) channels[r.key] = plainText(r.post.parts[0], r.post, r.platform, {last: r.post.parts.length === 1});
  fs.writeFileSync(path.join(dir, 'marketer-post.json'), JSON.stringify({url: src.url || '', channels, note: 'For connect-ai-marketer crossposter: first post of each thread only, text only. The full threads with pictures are in writer-package.json.'}, null, 2));
  // every path in the package is relative to this run folder (no home folder or user name in it)
  const relRun = (f) => path.relative(runDir, f).split(path.sep).join('/');
  fs.writeFileSync(path.join(dir, 'writer-package.json'), JSON.stringify({
    made: new Date().toISOString(), status: 'needs human OK', source: src.title, paths: 'relative to the run folder (the folder that holds handoff/)',
    platforms: results.map((r) => {
      const pj = JSON.parse(fs.readFileSync(path.join(runDir, r.key, 'post.json'), 'utf8'));
      return {platform: r.key, ready: !r.findings.some((f) => f.level === 'fail'), title: r.post.title, ...(pj.subject != null ? {subject: pj.subject, preview: pj.preview} : {}), tags: r.post.tags, videos: motionFilms(runDir, r.key).map((v) => ({...v, file: relRun(v.file)})), parts: pj.parts.map((p) => ({...p, images: p.images.map((f) => relRun(path.join(runDir, r.key, f)))}))};
    }),
  }, null, 2));
}

export const EXAMPLES = path.join(KIT, 'examples');
