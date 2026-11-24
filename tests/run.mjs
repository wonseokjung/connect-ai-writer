// node tests/run.mjs : parsing, checks, voice sheet, writer hand-off, installer, Ego Lite script safety, and (when Chrome / ffmpeg exist) pictures end to end.
// No network, no posting, no account.
process.removeAllListeners('warning');
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'caiw-test-'));
const imp = (f) => import(path.join(KIT, f));
const CFG = await imp('lib/config.mjs');
const PF = await imp('lib/postfile.mjs');
const CK = await imp('lib/check.mjs');
const SRC = await imp('lib/source.mjs');
const V = await imp('lib/voice.mjs');
const WR = await imp('lib/writer.mjs');
const EGO = await imp('lib/ego.mjs');
const {installSkill, removeSkill} = await imp('lib/install.mjs');
const {findChrome} = await imp('lib/chrome.mjs');
const {hasFfmpeg} = await imp('lib/frames.mjs');

let n = 0, skipped = 0;
const ok = (msg) => { n++; console.log(`  ok ${String(n).padStart(2)}  ${msg}`); };
const skip = (msg) => { skipped++; console.log(`  -- skip  ${msg}`); };
const quiet = () => {};
const cfg = CFG.loadConfig(null);
const P = cfg.platforms;

// ---------- presets ----------
for (const k of ['threads', 'naver', 'x', 'linkedin', 'instagram', 'tistory', 'brunch']) {
  const p = P[k];
  assert.ok(p, k);
  assert.ok(['chain', 'article', 'single', 'carousel'].includes(p.kind) && p.maxChars > 0 && p.maxImages > 0 && p.image.w && p.image.h && p.source && p.checked, k);
}
assert.equal(P.threads.maxChars, 500); assert.equal(P.x.maxChars, 280); assert.equal(P.x.count, 'x-weighted'); assert.equal(P.x.maxImages, 4); assert.equal(P.linkedin.maxChars, 3000);
assert.deepEqual(CFG.platformList(P, '쓰레드,블로그,twitter'), ['threads', 'naver', 'x']);
assert.throws(() => CFG.platformList(P, 'myspace'), /unknown platform/);
ok('platforms.json: 7 platforms with limits, picture size and where each limit came from');

// ---------- sources ----------
{
  const srt = '1\n00:00:01,000 --> 00:00:03,500\n안녕하세요\n\n2\n00:01:02,250 --> 00:01:04,000\n<i>초당 15회를</i> 측정해요\n';
  const s = SRC.parseSubtitles(srt);
  assert.equal(s.length, 2); assert.equal(s[1].start, 62.25); assert.equal(s[1].text, '초당 15회를 측정해요');
  const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nhello there\n\n00:00:02.000 --> 00:00:04.000\nhello there my friend\n\n00:00:04.000 --> 00:00:05.000\nhello there my friend\n';
  const v = SRC.parseSubtitles(vtt);
  assert.deepEqual(v.map((x) => x.text), ['hello there', 'my friend']);
  const t = SRC.parseText('[00:12] 첫 줄\n01:02:03 둘째 줄\n그냥 메모');
  assert.equal(t[0].start, 12); assert.equal(t[1].start, 3723); assert.equal(t[2].start, null);
  assert.equal(SRC.clock(3723), '1:02:03'); assert.equal(SRC.clock(65), '01:05');
  ok('sources: .srt, rolling YouTube .vtt (repeats dropped), timed notes');
  const f = path.join(tmp, 'notes.md');
  fs.writeFileSync(f, '# 제목\n첫 줄이에요\n둘째 줄이에요\n');
  const src = await SRC.readSource([f]);
  assert.equal(src.title, '제목'); assert.equal(src.kind, 'notes'); assert.equal(src.video, null);
  const vid = path.join(tmp, 'clip.mp4');
  fs.writeFileSync(vid, '');
  await assert.rejects(() => SRC.readSource([vid]), /No subtitles next to/);
  ok('sources: notes file; a video without subtitles asks for --srt');
}

// ---------- post.md ----------
{
  const md = `<!-- comment {{write}} -->
첫 글이에요.
[image: frame 03:12 "캡션"]
[image: quote "초당 15회를 측정해요" 01:02]

---

둘째 글이에요.
[image: steps "하나" "둘" "셋"]
tags: AI, 글쓰기`;
  const p = PF.parsePost(md, P.threads);
  assert.equal(p.placeholder, false);
  assert.equal(p.parts.length, 2);
  assert.deepEqual(p.tags, ['AI', '글쓰기']);
  assert.equal(p.parts[0].images.length, 2);
  assert.equal(p.parts[0].images[0].kind, 'frame'); assert.equal(p.parts[0].images[0].at, '03:12'); assert.equal(p.parts[0].images[0].caption, '캡션');
  assert.equal(p.parts[0].images[1].text, '초당 15회를 측정해요');
  assert.deepEqual(p.parts[1].images[0].items, ['하나', '둘', '셋']);
  assert.equal(PF.plainText(p.parts[1], p, P.threads, {last: true}), '둘째 글이에요.\n\n#AI');
  const a = PF.parsePost('# 제목\n\n## 소제목\n본문\n[image: title "표지"]\n\n본문 둘', P.naver);
  assert.equal(a.title, '제목'); assert.equal(a.parts.length, 1);
  assert.deepEqual(a.parts[0].blocks.map((b) => b.type), ['h2', 'text', 'image', 'text']);
  assert.equal(PF.parsePost(PF.skeleton('x', P.x), P.x).placeholder, true);
  ok('post.md: thread parts, pictures with times and captions, tags, blog title and headings, empty template detected');
}

// ---------- check ----------
const source = {lines: [{text: '쓰레드는 한 글에 500자까지 들어가요.'}, {text: '초당 15회를 측정해요'}, {text: '여덟 명의 직원을 만들 거예요'}, {text: '진짜 뭐든 한 번 연습을 해 보셨으면 좋겠어요'}]};
const run = (md, key = 'threads', rules = cfg.rules) => CK.checkPost({key, post: PF.parsePost(md, P[key]), platform: P[key], source, rules, banned: cfg.banned});
const rulesOf = (F, level = 'fail') => F.filter((f) => f.level === level).map((f) => f.rule);
{
  assert.deepEqual(rulesOf(run('쓰레드는 500자, 초당 15회예요. 직원 8명이요.\n[image: title "표지"]')), []);
  const bad = run('조회수가 3,000회 늘었어요.\n[image: stat "92%" "만족"]');
  assert.equal(bad.filter((f) => f.rule === 'numbersInSource').length, 2);
  assert.ok(bad.some((f) => f.message.includes('3000')));
  ok('check: every number must be in the source (8 from 여덟 명 counts; 3,000 and 92 do not)');
  assert.deepEqual(rulesOf(run('좋아요\n[image: quote "진짜 뭐든 한 번 연습을 해 보셨으면 좋겠어요"]')), []);
  assert.ok(rulesOf(run('좋아요\n[image: quote "AI가 세상을 바꿉니다"]')).includes('quotesInSource'));
  const close = run('좋아요\n[image: quote "진짜 뭐든 한번 연습해 보셨으면 좋겠어요"]');
  assert.ok(close.some((f) => f.rule === 'quotesInSource' && /close/.test(f.message)), 'close quote is flagged as close');
  assert.ok(CK.quoteMatch('초당 15회를 측정해요', CK.norm(source.lines.map((l) => l.text).join(' '))) === 1);
  ok('check: quote cards must be the source word for word; near matches are flagged as close');
  assert.ok(rulesOf(run('오늘은 이를 통해 혁신적인 방법을 알려드려요\n[image: title "표지"]')).includes('bannedPhrases'));
  assert.ok(rulesOf(run("Let's dive in.\n[image: title \"cover\"]")).includes('bannedPhrases'));
  assert.ok(rulesOf(run('좋아요 🔥\n[image: title "표지"]')).includes('emoji'));
  assert.ok(rulesOf(run('좋아요 「진짜」\n[image: title "표지"]')).includes('cornerBrackets'));
  assert.ok(rulesOf(run('좋아요 — 진짜\n[image: title "표지"]')).includes('emDash'));
  assert.deepEqual(rulesOf(run('좋아요 🔥\n[image: title "표지"]', 'threads', {...cfg.rules, emoji: 'off'})), []);
  ok('check: AI-sounding phrases (ko + en), emoji, corner brackets, long dash; each rule can be turned off');
  assert.ok(rulesOf(run('사진이 없는 글이에요')).includes('noImages'));
  assert.ok(rulesOf(run('첫 글\n\n---\n\n둘째\n[image: title "표지"]'), 'warn').includes('firstPartImage'));
  assert.ok(rulesOf(run(PF.skeleton('threads', P.threads))).includes('placeholder'));
  ok('check: a post with no picture fails; first post without a picture warns; empty template fails');
  assert.equal(CK.xLength('abc'), 3); assert.equal(CK.xLength('한글'), 4); assert.equal(CK.xLength('see https://example.com/very/long/link'), 4 + 23);
  const longKo = '가'.repeat(141);
  assert.ok(rulesOf(run(longKo + '\n[image: title "표지"]', 'x')).includes('limits'), '141 Korean letters = 282 weighted');
  assert.deepEqual(rulesOf(run('가'.repeat(140) + '\n[image: title "표지"]', 'x')), []);
  assert.ok(rulesOf(run('가'.repeat(501) + '\n[image: title "표지"]')).includes('limits'));
  const many = Array.from({length: 5}, (_, i) => `[image: title "${'표지'}"]`).join('\n');
  assert.ok(rulesOf(run('좋아요\n' + many, 'x')).includes('limits'), 'X takes 4 pictures');
  assert.ok(rulesOf(run('# 제목\n짧아요\n[image: title "표지"]\ntags: ' + Array.from({length: 31}, (_, i) => 't' + i).join(','), 'naver')).includes('limits'));
  ok('check: limits (X weighted length: Korean 2, link 23; Threads 500; pictures per post; tags)');
  assert.ok(rulesOf(run('최고의 도구예요\n[image: title "표지"]'), 'warn').includes('claimWords'));
  ok('check: strong claims not in the source warn');
}

// ---------- voice ----------
{
  const lines = [];
  const ends = ['거든요', '잖아요', '거예요', '거죠', '습니다'];
  for (let i = 0; i < 60; i++) lines.push(`${['그래서', '근데', '자', '그리고'][i % 4]} 제가 여러분들한테 이걸 굉장히 쉽게 알려드리는 ${ends[i % 5]}`);
  const f = path.join(tmp, 'me.srt');
  fs.writeFileSync(f, lines.map((l, i) => `${i + 1}\n00:00:${String(i % 60).padStart(2, '0')},000 --> 00:00:${String(i % 60).padStart(2, '0')},900\n${l}\n`).join('\n'));
  const {analysis: a, markdown} = V.buildVoice([f], {banned: cfg.banned, name: 'Jay'});
  assert.equal(a.ko, true); assert.equal(a.sentences, 60);
  assert.ok(a.ends.some(([e]) => e.startsWith('~거든요')));
  assert.ok(a.opens.some(([o]) => o === '그래서'));
  assert.ok(a.never.includes('혁신적인'));
  assert.match(markdown, /<!-- never: .*혁신적인/);
  assert.match(markdown, /Five-line brief/);
  assert.throws(() => V.buildVoice([f.replace('me', 'nobody')], {banned: cfg.banned}), /not found/);
  ok('voice: endings, openers, words and a never-list counted from your own transcript');
}

// ---------- writer hand-off ----------
{
  const out = WR.parseWriterOutput('some talk\n=== threads ===\n첫 글\n[image: title "a"]\n=== x ===\n```markdown\nX 글\n```\n=== evil ===\nno', ['threads', 'x']);
  assert.deepEqual(Object.keys(out), ['threads', 'x']);
  assert.equal(out.x.trim(), 'X 글');
  ok('writer: a headless agent answer is split per platform; unknown sections are ignored');
}

// ---------- Ego Lite script safety ----------
{
  const s = EGO.wrap('done({status: "x"});', {space: 'connect-ai-writer threads test', leaveOpen: false});
  assert.match(s, /taskSpace\(P\.space\)/);
  assert.match(s, /finish\(\{keep: \[\]\}\)/);
  assert.doesNotMatch(s, /claimTaskSpace|takeOverTaskSpace|listTaskSpaces/);
  const {POSTABLE} = await imp('lib/post.mjs');
  const src = fs.readFileSync(path.join(KIT, 'lib/post.mjs'), 'utf8');
  assert.doesNotMatch(src, /type=.?password|\.fill\([^)]*pass|otp|verification code/i);
  assert.match(src, /if \(P\.publish\)/);
  assert.deepEqual(POSTABLE, ['threads', 'x', 'naver']);
  ok('post: a new space of our own each time, closed with finish({keep: []}); never claims another space; publish only behind P.publish');
  const {post, confirmPublish} = await imp('lib/post.mjs');
  const rd = path.join(tmp, 'run');
  fs.mkdirSync(path.join(rd, 'threads'), {recursive: true});
  fs.writeFileSync(path.join(rd, 'threads', 'post.json'), JSON.stringify({parts: [{text: 'a', images: []}]}));
  fs.writeFileSync(path.join(rd, 'threads', 'check.md'), '# c\n\nFIX the number 3 is not in your source.\n');
  await assert.rejects(() => post(rd, 'threads', {log: quiet}), /still has things to fix/);
  await assert.rejects(() => post(rd, 'instagram', {log: quiet}), /works for threads, x, naver/);
  if (!process.stdin.isTTY) await assert.rejects(() => confirmPublish('threads'), /needs a person/);
  ok('post: refuses a draft that has FIX lines, refuses unknown platforms, --publish needs a person typing');
}

// ---------- installer ----------
{
  const home = path.join(tmp, 'home');
  fs.mkdirSync(path.join(home, '.claude'), {recursive: true});
  fs.mkdirSync(path.join(home, '.codex'), {recursive: true});
  const list = installSkill({home, env: {}, log: quiet});
  const dest = path.join(home, '.claude', 'skills', 'connect-ai-writer');
  assert.ok(fs.existsSync(path.join(dest, 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.agents', 'skills', 'connect-ai-writer', 'SKILL.md')));
  assert.ok(list.every((t) => t.done));
  const other = path.join(home, '.cursor', 'skills', 'connect-ai-writer');
  fs.mkdirSync(other, {recursive: true});
  fs.writeFileSync(path.join(other, 'SKILL.md'), 'someone else');
  const l2 = installSkill({agent: 'cursor', home, env: {}, log: quiet});
  assert.equal(l2[0].action, 'skip');
  removeSkill({home, env: {}, log: quiet});
  assert.ok(!fs.existsSync(dest));
  assert.equal(fs.readFileSync(path.join(other, 'SKILL.md'), 'utf8'), 'someone else');
  ok('install-skill: copies into Claude Code and the shared agents folder; never touches a folder that is not ours');
}

// ---------- pictures end to end ----------
if (!findChrome()) skip('demo end to end (no Chrome on this computer)');
else {
  const dir = path.join(tmp, 'demo');
  const r = spawnSync(process.execPath, [path.join(KIT, 'bin/cli.mjs'), 'demo', dir, '--no-open'], {encoding: 'utf8', env: {...process.env, CI: '1'}});
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const run = fs.readdirSync(path.join(dir, 'out')).map((f) => path.join(dir, 'out', f))[0];
  for (const k of ['threads', 'naver', 'x', 'linkedin', 'instagram']) {
    assert.ok(fs.existsSync(path.join(run, k, 'preview.html')), k);
    const imgs = fs.readdirSync(path.join(run, k, 'images'));
    assert.ok(imgs.length >= 2, k + ' pictures');
  }
  const sharp = (await import('sharp')).default;
  const m = await sharp(path.join(run, 'threads', 'images', fs.readdirSync(path.join(run, 'threads', 'images'))[0])).metadata();
  assert.deepEqual([m.width, m.height], [1080, 1350]);
  assert.ok(fs.existsSync(path.join(run, 'sheet.jpg')) && fs.existsSync(path.join(run, 'index.html')));
  const hand = JSON.parse(fs.readFileSync(path.join(run, 'handoff', 'marketer-post.json'), 'utf8'));
  assert.ok(hand.channels.threads && hand.channels.x && hand.channels.linkedin);
  assert.match(fs.readFileSync(path.join(run, 'check.md'), 'utf8'), /Ready to post/);
  ok('demo: 5 platforms, pictures at platform size, previews, sheet, hand-off for the marketer, every check passed');
}
// ---------- pictures fill the card, face kept whole ----------
{
  const {cropBox} = await imp('lib/focus.mjs');
  // a 16:9 frame into a 4:5 card: full height kept, face inside the crop
  const face = {x: 0.37, y: 0.25, w: 0.14, h: 0.26};
  const b = cropBox({sw: 1920, sh: 1080, tw: 1080, th: 1350, faces: [face]});
  assert.equal(b.top, 0); assert.equal(b.height, 1080); assert.equal(b.width, 864);
  assert.ok(b.left <= face.x * 1920 && b.left + b.width >= (face.x + face.w) * 1920, 'face inside the crop');
  // a face near the right edge (a screen on the left): still whole, kept off-centre so the screen stays in
  const edge = {x: 0.78, y: 0.32, w: 0.14, h: 0.24};
  const e = cropBox({sw: 1920, sh: 1080, tw: 1080, th: 1350, faces: [edge]});
  assert.ok(e.left <= edge.x * 1920 && e.left + e.width >= (edge.x + edge.w) * 1920 && e.left + e.width <= 1920);
  assert.ok((edge.x + edge.w / 2) * 1920 - e.left > e.width * 0.55, 'face sits right of centre');
  // nobody found: the middle
  const c = cropBox({sw: 1920, sh: 1080, tw: 1080, th: 1350});
  assert.equal(c.left, Math.round((1920 - 864) / 2));
  // your own x= wins
  assert.equal(cropBox({sw: 1920, sh: 1080, tw: 1080, th: 1350, x: 0}).left, 0);
  // a tall picture into a wide card: full width, head kept with room above it
  const t = cropBox({sw: 1080, sh: 1920, tw: 1200, th: 1200, faces: [{x: 0.4, y: 0.3, w: 0.2, h: 0.12}]});
  assert.equal(t.width, 1080); assert.ok(t.top <= 0.3 * 1920 && t.top + t.height >= 0.42 * 1920);
  const d = PF.directive('[image: frame 05:45 "얼굴" x=0.3]');
  assert.equal(d.x, 0.3); assert.equal(d.caption, '얼굴'); assert.equal(d.at, '05:45');
  const {card} = await imp('lib/cards.mjs');
  const html = card({kind: 'frame', caption: '한 줄'}, {w: 1080, h: 1350, theme: cfg.theme || {bg: '#000', bg2: '#111', fg: '#fff', muted: '#999', accent: '#D6892A', line: '#333', fontBody: 'sans-serif', fontHeadline: 'serif'}, image: {file: path.join(tmp, 'x.jpg'), w: 1080, h: 1350, filled: true, face: {top: 0.2, bottom: 0.45}}});
  assert.match(html, /center\/cover/); assert.match(html, /linear-gradient\(to top/); assert.doesNotMatch(html, /object-fit:contain/);
  ok('fill-crop: frames fill the card, the face stays whole (centred, or off-centre near an edge), x= to choose, caption on a soft shadow');
}
{
  const {naverTests} = await import(path.join(KIT, 'tests', 'naver.mjs'));
  await naverTests({ok, assert, imp, tmp});
}
if (!hasFfmpeg()) skip('frames from a video (no ffmpeg)');
else {
  const {bestFrame} = await imp('lib/frames.mjs');
  const clip = path.join(tmp, 'clip2.mp4');
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=10:duration=4', '-pix_fmt', 'yuv420p', clip]);
  const f = await bestFrame(clip, 2, path.join(tmp, 'f.jpg'));
  assert.ok(fs.existsSync(f.file) && f.tried >= 5 && f.t >= 0.5 && f.t <= 3.5);
  ok('frames: tries several moments around the time and keeps the sharpest');
}

fs.rmSync(tmp, {recursive: true, force: true});
console.log(`\n  ${n} passed${skipped ? `, ${skipped} skipped` : ''}`);
