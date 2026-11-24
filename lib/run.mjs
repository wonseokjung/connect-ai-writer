// start: read the source, make the run folder, a brief for the writer and one post.md per platform.
// build: post.md -> pictures, check, preview.html, post.txt (and post.html for blogs), a hand-off file for the marketer.
import fs from 'node:fs';
import path from 'node:path';
import {loadConfig, platformList} from './config.mjs';
import {readSource, sourceText, clock} from './source.mjs';
import {parsePost, skeleton, plainText} from './postfile.mjs';
import {checkPost, imageFindings, reportText} from './check.mjs';
import {makeImages} from './images.mjs';
import {previewHtml, indexHtml, contactSheet} from './preview.mjs';
import {hasFfmpeg, candidates} from './frames.mjs';
import {KIT} from './name.mjs';

export const slugify = (s) => String(s || 'post').normalize('NFC').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post';
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

function neverList(voiceMd) {
  const m = voiceMd.match(/<!--\s*never:\s*([\s\S]*?)-->/);
  return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
}

export async function start({inputs, out = 'out', want, voice, srt, video, title, slug, frames = 16, downloadVideo = false, log = console.log}) {
  const workRoot = path.resolve(out);
  fs.mkdirSync(workRoot, {recursive: true});
  const src = await readSource(inputs, {srt, video, downloadVideo, workDir: workRoot});
  if (title) src.title = title;
  const cfg = loadConfig(workRoot);
  const keys = platformList(cfg.platforms, want);
  const runDir = path.join(workRoot, `${today()}_${slug || slugify(src.title)}`);
  fs.mkdirSync(path.join(runDir, 'source'), {recursive: true});
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
  fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify({title: src.title, platforms: keys, created: new Date().toISOString(), theme: null}, null, 2));
  return {runDir, src, keys, frameList};
}

function brief({src, keys, cfg, voiceText, frameList, runDir}) {
  const P = cfg.platforms;
  return `# Writing brief: ${src.title}

You write one post.md per platform folder below, in the user's own voice, from this source only. Then run \`build\`.

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
- \`[image: page https://their.site "caption"]\` a screenshot of the user's own page
- \`[image: file their-photo.jpg "caption"]\` the user's own picture
${frameList.length ? `\nSharp frames to choose from: source/frames.jpg (time under each). Times: ${frameList.map((f) => clock(f.t)).join(', ')}\n` : ''}
## Platforms
${keys.map((k) => `### ${P[k].name} (${k}/post.md)
- ${P[k].kind === 'chain' ? `A thread: posts separated by a line with only ---. Each post up to ${P[k].maxChars} ${P[k].count === 'x-weighted' ? 'weighted characters (Korean letters count 2, a link 23)' : 'characters'}, up to ${P[k].maxImages} pictures, ${P[k].maxParts} posts at most.` : P[k].kind === 'article' ? `An article: "# Title", "## Heading" sections, a picture between paragraphs (at least ${P[k].minImages}), ${P[k].minChars}+ characters, "tags: a, b" at the end (up to ${P[k].tags.max}).` : P[k].kind === 'carousel' ? `Slides = the [image: ...] lines in order (up to ${P[k].maxImages}). Caption up to ${P[k].maxChars} characters. Up to ${P[k].tags.max} hashtags in "tags:".` : `One post up to ${P[k].maxChars} characters, pictures in [image: ...] lines, up to ${P[k].tags.max} hashtags in "tags:".`}
- Picture size ${P[k].image.w}x${P[k].image.h} (${P[k].image.ratio}). Language: ${P[k].lang}.
- ${P[k].tone}`).join('\n')}

## Source
${src.kind}${src.video ? `, video ${path.basename(src.video)}` : ''}. Full text with times: source/source.txt (${src.lines.length} lines).
${voiceText ? '\n## Voice sheet\nsource/voice.md\n' : ''}`;
}

export async function build(runDir, {theme, only, log = console.log} = {}) {
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
    const made = post.placeholder ? [] : await makeImages({post, platform, runDir, outDir: path.join(dir, 'images'), source: src, theme: cfg.theme, settings: cfg.settings, log});
    const findings = [...checkPost({key, post, platform, source: src, rules: cfg.rules, banned: cfg.banned, never}), ...imageFindings(key, platform, made)];
    // copy-ready text
    const texts = post.parts.map((p, i) => plainText(p, post, platform, {last: i === post.parts.length - 1}));
    const txt = platform.kind === 'chain' ? texts.map((t, i) => `----- ${i + 1}/${texts.length} -----\n${t}`).join('\n\n') : (post.title ? post.title + '\n\n' : '') + texts.join('\n\n') + (platform.kind === 'article' && post.tags.length ? '\n\ntags: ' + post.tags.join(', ') : '');
    fs.writeFileSync(path.join(dir, 'post.txt'), txt + '\n');
    if (platform.kind === 'article') fs.writeFileSync(path.join(dir, 'post.html'), await articleHtml(post, made, dir));
    fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify({platform: key, title: post.title, tags: post.tags, parts: post.parts.map((p, i) => ({text: texts[i], images: made.filter((m) => m.part === i && m.file).map((m) => path.relative(dir, m.file))}))}, null, 2));
    fs.writeFileSync(path.join(dir, 'check.md'), `# ${platform.name} check\n\n${reportText(findings)}\n`);
    fs.writeFileSync(path.join(dir, 'preview.html'), previewHtml({key, platform, post, made, findings, dir, settings: cfg.settings, theme: cfg.theme}));
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

async function articleHtml(post, made, dir) {
  const {marked} = await import('marked');
  let ii = 0;
  const md = [];
  for (const p of post.parts) for (const b of p.blocks) {
    if (b.type === 'h2') md.push('## ' + b.text);
    else if (b.type === 'text') md.push(b.text.replace(/\n/g, '  \n'));
    else { const m = made[ii++]; if (m?.file) md.push(`![${(m.alt || '').replace(/[[\]]/g, '')}](${path.relative(dir, m.file)})`); }
  }
  const html = marked.parse(md.join('\n\n'));
  return `<!doctype html><html><head><meta charset="utf-8"><title>${post.title}</title></head><body>\n<h1>${post.title}</h1>\n${html}\n<p>${post.tags.map((t) => '#' + t).join(' ')}</p>\n</body></html>\n`;
}

// a package for connect-ai-marketer's crossposter (it posts finished words; it does not write them)
function writeHandoff(runDir, results, src) {
  const dir = path.join(runDir, 'handoff');
  fs.mkdirSync(dir, {recursive: true});
  const channels = {};
  for (const r of results) if (['x', 'threads', 'linkedin'].includes(r.key) && r.post.parts.length) channels[r.key] = plainText(r.post.parts[0], r.post, r.platform, {last: r.post.parts.length === 1});
  fs.writeFileSync(path.join(dir, 'marketer-post.json'), JSON.stringify({url: src.url || '', channels, note: 'For connect-ai-marketer crossposter: first post of each thread only, text only. The full threads with pictures are in writer-package.json.'}, null, 2));
  fs.writeFileSync(path.join(dir, 'writer-package.json'), JSON.stringify({
    made: new Date().toISOString(), status: 'needs human OK', source: src.title,
    platforms: results.map((r) => ({platform: r.key, ready: !r.findings.some((f) => f.level === 'fail'), title: r.post.title, tags: r.post.tags, parts: JSON.parse(fs.readFileSync(path.join(runDir, r.key, 'post.json'), 'utf8')).parts.map((p) => ({...p, images: p.images.map((f) => path.join(runDir, r.key, f))}))})),
  }, null, 2));
}

export const EXAMPLES = path.join(KIT, 'examples');
