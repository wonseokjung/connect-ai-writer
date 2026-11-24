// v0.3 fixes from the public review: no shell for your tools, project folders cannot run commands, posting only
// what was checked, no-Chrome builds, up/down words next to numbers, local files only from the run folder,
// escaped HTML, run folders that never mix, `all` inside a list, newsletter subject + preview everywhere, the editorial brief.
// No network, no account, no posting.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export async function v03Tests({ok, skip, assert, imp, tmp, KIT, findChrome}) {
  const CFG = await imp('lib/config.mjs');
  const CK = await imp('lib/check.mjs');
  const PF = await imp('lib/postfile.mjs');
  const R = await imp('lib/research.mjs');
  const H = await imp('lib/humanize.mjs');
  const TOOL = await imp('lib/tool.mjs');
  const RUN = await imp('lib/run.mjs');
  const IMG = await imp('lib/images.mjs');
  const B = await imp('lib/brief.mjs');
  const cfg = CFG.loadConfig(null, {env: {CONNECT_AI_HOME: path.join(tmp, 'nohome')}});
  const P = cfg.platforms;
  const cli = (args, opts = {}) => spawnSync(process.execPath, [path.join(KIT, 'bin', 'cli.mjs'), ...args], {encoding: 'utf8', ...opts, env: {...process.env, CI: '1', CONNECT_AI_HOME: path.join(tmp, 'cahome'), ...(opts.env || {})}});

  // ---------- 2. no shell; commands only from you ----------
  {
    assert.deepEqual(TOOL.splitCommand('claude -p'), ['claude', '-p']);
    assert.deepEqual(TOOL.splitCommand(`my-tool --out "{out}" 'a b'`), ['my-tool', '--out', '{out}', 'a b']);
    assert.deepEqual(TOOL.splitCommand(['x', '--y']), ['x', '--y']);
    assert.throws(() => TOOL.splitCommand('a "b'), /open quote/);
    const env = TOOL.smallEnv(['MY_KEY'], {PATH: '/bin', HOME: '/h', MY_KEY: 'k', GITHUB_TOKEN: 'secret', AWS_SECRET_ACCESS_KEY: 's'});
    assert.deepEqual(Object.keys(env).sort(), ['HOME', 'MY_KEY', 'PATH']);
    // a prompt full of shell tricks reaches the program as plain stdin, never as a command
    const marker = path.join(tmp, 'pwned');
    const evil = `"; touch ${marker}; echo "$(touch ${marker})\`touch ${marker}\``;
    const r = TOOL.runTool([process.execPath, '-e', 'process.stdin.pipe(process.stdout)'], {input: evil});
    assert.equal(r.status, 0); assert.equal(r.stdout, evil); assert.ok(!fs.existsSync(marker), 'nothing ran');
    const r2 = TOOL.runTool(`${JSON.stringify(process.execPath)} -e "require('fs').writeFileSync(process.argv[1], 'x')" {out}`, {vars: {out: path.join(tmp, 'a b; touch pwned $(touch pwned)')}});
    assert.equal(r2.status, 0, r2.stderr); assert.ok(fs.existsSync(path.join(tmp, 'a b; touch pwned $(touch pwned)')) && !fs.existsSync(path.join(tmp, 'pwned')) && !fs.existsSync('pwned'), '{out} is one word, even with spaces, ; and $()');
    // a writer.config.json inside a project folder cannot set a command; your own user config can
    const proj = path.join(tmp, 'proj-evil');
    fs.mkdirSync(proj, {recursive: true});
    fs.writeFileSync(path.join(proj, 'writer.config.json'), JSON.stringify({name: 'Jay', imageHook: {enabled: true, command: 'touch ' + marker}, writer: {command: 'touch ' + marker}}));
    const home = path.join(tmp, 'user-home');
    const c1 = CFG.loadConfig(proj, {home, env: {}});
    assert.equal(c1.settings.name, 'Jay'); assert.equal(c1.settings.imageHook, undefined); assert.equal(c1.settings.writer, undefined);
    assert.deepEqual(c1.settings._ignored, ['imageHook', 'writer']);
    fs.mkdirSync(path.join(home, '.connect-ai', 'connect-ai-writer'), {recursive: true});
    fs.writeFileSync(path.join(home, '.connect-ai', 'connect-ai-writer', 'writer.config.json'), JSON.stringify({writer: {command: ['claude', '-p']}}));
    assert.deepEqual(CFG.loadConfig(proj, {home, env: {}}).settings.writer, {command: ['claude', '-p']});
    // the image hook: no shell, prompt on stdin
    const hookOut = path.join(tmp, 'hook-prompt.txt');
    const hook = [process.execPath, '-e', `const fs=require('fs');const sharp=require(${JSON.stringify(path.join(KIT, 'node_modules', 'sharp'))});let s='';process.stdin.on('data',d=>s+=d).on('end',async()=>{fs.writeFileSync(${JSON.stringify(hookOut)},s);await sharp({create:{width:Number(process.argv[2]),height:Number(process.argv[3]),channels:3,background:'#333'}}).png().toFile(process.argv[1]);})`, '{out}', '{w}', '{h}'];
    const run = path.join(tmp, 'hook-run');
    fs.mkdirSync(run, {recursive: true});
    const post = PF.parsePost(`좋아요\n[image: gen a cat "; touch ${marker}; $(touch ${marker})]`, P.threads);
    const made = fs.existsSync(path.join(KIT, 'node_modules', 'sharp')) ? await IMG.makeImages({post, platform: P.threads, runDir: run, outDir: path.join(run, 'threads', 'images'), source: {lines: [], origin: []}, theme: cfg.theme, settings: {imageHook: {enabled: true, command: hook}}}) : null;
    if (made) {
      assert.ok(made[0].file && !made[0].error, made[0].error);
      assert.match(fs.readFileSync(hookOut, 'utf8'), /a cat "; touch .*\$\(touch/);
      assert.ok(!fs.existsSync(marker));
    }
    ok('tools run without a shell: words split once, {out} is one word, the prompt goes on stdin, a small env (no tokens), nothing in a prompt can run');
    ok('a writer.config.json in a project folder cannot set imageHook or writer.command (ignored, and doctor says so); only your user config or a flag can');
  }

  // ---------- 8. up / down next to the same number ----------
  {
    const source = {lines: [{text: '구독자가 한 달 만에 15% 늘었어요.'}, {text: 'Sales rose 20% in October.'}, {text: '한 줄로 15개 만들었어요.'}]};
    const run = (md, key = 'threads') => CK.checkPost({key, post: PF.parsePost(md, P[key]), platform: P[key], source, rules: cfg.rules, banned: cfg.banned});
    const dir = (md) => run(md + '\n[image: title "표지"]').filter((f) => f.rule === 'directionInSource');
    assert.equal(dir('구독자가 15% 줄었어요').length, 1);
    assert.equal(dir('구독자가 15% 늘었어요').length, 0);
    assert.equal(dir('구독자가 15% 증가했어요').length, 0, 'a different word for the same direction is fine');
    assert.equal(dir('sales fell 20% last month').length, 1);
    assert.equal(dir('20% more sales').length, 0);
    assert.equal(dir('한 줄에 15개씩 써요').length, 0, '줄 as "a line" is not a direction');
    assert.equal(dir('[image: stat "15" "구독자 줄었다"]').length, 1, 'inside a picture too');
    // research: a fact with the number going the other way
    const facts = R.checkFacts([{text: '홈페이지가 2.6배 줄었다', cites: ['S1']}, {text: '홈페이지가 2.6배 늘었다', cites: ['S1']}], [{id: 'S1', body: '홈페이지는 1년 만에 2.6배 증가했다.'}]);
    assert.ok(!facts[0].ok && facts[0].problems.some((p) => /2\.6 goes down/.test(p)));
    assert.ok(facts[1].ok);
    // humanize --after: the same number now going the other way is a changed fact
    const cmp = H.compare('구독자가 15% 늘었어요.', '구독자가 15% 줄었어요.');
    assert.ok(!cmp.kept && cmp.lost.some((l) => l.kind === 'direction'));
    assert.ok(H.compare('구독자가 15% 늘었어요.', '구독자가 15%나 늘었거든요.').kept);
    ok('direction check: up/down words next to the same number must match the source (post check, pictures, research facts, humanize --after); "한 줄" is not "줄었다"');
  }

  // ---------- 9. local files only from the run folder; escaped HTML; no home paths in the hand-off ----------
  {
    const runDir = path.join(tmp, 'paths-run');
    fs.mkdirSync(path.join(runDir, 'source', 'files'), {recursive: true});
    const outside = path.join(tmp, 'secret.txt');
    fs.writeFileSync(outside, 'secret');
    fs.writeFileSync(path.join(runDir, 'mine.jpg'), 'x');
    fs.writeFileSync(path.join(runDir, 'source', 'files', 'photo.jpg'), 'x');
    fs.symlinkSync(outside, path.join(runDir, 'link.jpg'));
    const src = {origin: [path.join(tmp, 'notes.md')], lines: []};
    fs.writeFileSync(path.join(tmp, 'notes.md'), '# n');
    assert.equal(IMG.localFile('mine.jpg', {runDir, source: src}), fs.realpathSync(path.join(runDir, 'mine.jpg')));
    assert.equal(IMG.localFile('photo.jpg', {runDir, source: src}), fs.realpathSync(path.join(runDir, 'source', 'files', 'photo.jpg')));
    assert.throws(() => IMG.localFile('../secret.txt', {runDir, source: src}), /outside the run folder/);
    assert.throws(() => IMG.localFile(outside, {runDir, source: src}), /outside the run folder/);
    assert.throws(() => IMG.localFile('link.jpg', {runDir, source: src}), /outside the run folder/, 'a link out of the run folder is followed and refused');
    assert.throws(() => IMG.localFile('secret.txt', {runDir, source: src}), /outside the run folder/, 'next to your notes is not enough: name it with --files');
    assert.equal(IMG.localFile('notes.md', {runDir, source: src}), fs.realpathSync(path.join(tmp, 'notes.md')), 'a file you named is fine');
    // post.html escapes title, tags and your words; drops scripts and javascript: links
    const post = PF.parsePost('# 제목 <script>alert(1)</script>\n\n본문 <img src=x onerror=alert(1)> 이에요 [링크](javascript:alert(1)) [ok](https://example.com)\n\n[image: title "a"]\n\ntags: <b>x</b>, 둘', P.naver);
    const html = await RUN.articleHtml(post, [{file: path.join(runDir, 'naver', 'images', '01.png'), alt: 'a"b'}], path.join(runDir, 'naver'));
    assert.doesNotMatch(html, /<script|onerror=|javascript:|<b>x<\/b>|<img src=x/);
    assert.match(html, /&lt;script&gt;/); assert.match(html, /href="https:\/\/example\.com"/);
    assert.match(html, /<img src="images\/01\.png"/);
    assert.equal(RUN.sanitizeHtml('<a href="javascript:x" onclick="y">a</a><iframe src="z"></iframe>'), '<a href="#">a</a>');
    ok('local pictures and pages: only from the run folder (links followed) or files you named; post.html escapes your title, tags and words, no script or javascript: link');
  }

  // ---------- 11. run folders never mix; --slug is one folder name; frame cache per video ----------
  {
    const notes = path.join(tmp, 'run-notes.md');
    fs.writeFileSync(notes, '# 같은 제목\n첫 줄이에요\n');
    const out = path.join(tmp, 'runs-out');
    const a = await RUN.start({inputs: [notes], out, want: 'threads', frames: 0, log: () => {}});
    fs.writeFileSync(path.join(a.runDir, 'threads', 'post.md'), '내가 쓴 글\n');
    const b = await RUN.start({inputs: [notes], out, want: 'threads', frames: 0, log: () => {}});
    assert.notEqual(a.runDir, b.runDir); assert.match(b.runDir, /-2$/);
    assert.equal(fs.readFileSync(path.join(a.runDir, 'threads', 'post.md'), 'utf8'), '내가 쓴 글\n', 'the first run is untouched');
    const ida = JSON.parse(fs.readFileSync(path.join(a.runDir, 'run.json'), 'utf8')).id, idb = JSON.parse(fs.readFileSync(path.join(b.runDir, 'run.json'), 'utf8')).id;
    assert.ok(ida && idb && ida !== idb);
    const c = await RUN.start({inputs: [notes], out, want: 'threads', frames: 0, slug: path.basename(a.runDir).slice(9), resume: true, log: () => {}});
    assert.equal(c.runDir, a.runDir); assert.equal(fs.readFileSync(path.join(a.runDir, 'threads', 'post.md'), 'utf8'), '내가 쓴 글\n', 'resume keeps your post.md');
    assert.equal(JSON.parse(fs.readFileSync(path.join(a.runDir, 'run.json'), 'utf8')).id, ida, 'resume keeps the id');
    for (const bad of ['../x', 'a/b', '..', '', ' x', 'a\\b']) await assert.rejects(() => RUN.start({inputs: [notes], out, slug: bad, frames: 0, log: () => {}}), /is not a folder name/, bad);
    await assert.rejects(() => RUN.start({inputs: [notes], out, slug: 'nothere', resume: true, frames: 0, log: () => {}}), /no run folder/);
    const v1 = path.join(tmp, 'v1.mp4'), v2 = path.join(tmp, 'v2.mp4');
    fs.writeFileSync(v1, 'aaaa'); fs.writeFileSync(v2, 'bbbbbb');
    assert.notEqual(IMG.sourceId(v1), IMG.sourceId(v2)); assert.equal(IMG.sourceId(v1), IMG.sourceId(v1));
    const imgSrc = fs.readFileSync(path.join(KIT, 'lib', 'images.mjs'), 'utf8');
    assert.match(imgSrc, /\$\{sourceId\(source\.video\)\}_t\$\{t\.toFixed\(2\)\}\.jpg/);
    // printed paths are quoted when they have spaces or 한글, so you can paste them back
    const sp = path.join(tmp, '내 폴더 with space');
    fs.mkdirSync(sp, {recursive: true});
    const r = cli(['start', notes, '--for', 'threads', '--out', sp, '--frames', '0']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /build "[^"]*내 폴더 with space[^"]*"/);
    ok('run folders: a new folder (and id) every time, -2 for the same name, --resume to continue; --slug must be one folder name; frame cache keyed by the video; printed paths quoted');
  }

  // ---------- 12. all inside a list; doctor and engines say Node 20.19 ----------
  {
    const all = CFG.platformList(P, 'all');
    assert.deepEqual(CFG.platformList(P, 'all,newsletter'), [...all, 'newsletter']);
    assert.deepEqual(CFG.platformList(P, 'threads,ALL'), [...new Set(['threads', ...all])]);
    const pkg = JSON.parse(fs.readFileSync(path.join(KIT, 'package.json'), 'utf8'));
    assert.equal(pkg.engines.node, '>=20.19');
    const D = await imp('lib/doctor.mjs');
    assert.ok(D.nodeOk('20.19.0') && D.nodeOk('22.1.0') && !D.nodeOk('20.18.3') && !D.nodeOk('18.20.0'));
    ok('--for all,newsletter works (all inside a list); Node 20.19+ in package.json and doctor');
  }

  // ---------- 4. no Chrome: text, check and preview still made; each picture says why ----------
  {
    const dir = path.join(tmp, 'nochrome');
    const r = cli(['demo', dir, '--no-open'], {env: {CHROME_PATH: 'none'}});
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /No Chrome here/);
    const run = path.join(dir, 'out', fs.readdirSync(path.join(dir, 'out'))[0]);
    assert.ok(fs.existsSync(path.join(run, 'index.html')) && fs.existsSync(path.join(run, 'threads', 'preview.html')) && fs.existsSync(path.join(run, 'naver', 'post.html')) && fs.existsSync(path.join(run, 'naver', 'post.txt')));
    const seal = JSON.parse(fs.readFileSync(path.join(run, 'threads', 'check.json'), 'utf8'));
    assert.ok('ok' in seal && seal.hash && Array.isArray(seal.images));
    // a full build without Chrome: no crash, every card listed as not drawn, with why
    const r1 = cli(['build', run, '--no-open'], {env: {CHROME_PATH: 'none'}});
    assert.equal(r1.status, 2, r1.stderr);
    const s1 = JSON.parse(fs.readFileSync(path.join(run, 'naver', 'check.json'), 'utf8'));
    assert.equal(s1.ok, false); assert.ok(s1.images.length >= 2 && s1.images.every((i) => /no chrome/i.test(i.error)));
    // force the no-Chrome path inside build: --no-pictures
    const r2 = cli(['build', run, '--no-pictures', '--no-open']);
    assert.notEqual(r2.status, 1, r2.stderr);
    const s2 = JSON.parse(fs.readFileSync(path.join(run, 'threads', 'check.json'), 'utf8'));
    assert.equal(s2.ok, false); assert.match(s2.why, /not drawn/);
    assert.ok(s2.images.length >= 1 && s2.images.every((i) => i.line && i.error));
    // a story without Chrome still writes book.html and says where it is
    const st = cli(['story', '7살, 공룡, 잠자리', '--out', path.join(tmp, 'st')]);
    assert.equal(st.status, 0, st.stderr);
    const sdir = path.join(tmp, 'st', fs.readdirSync(path.join(tmp, 'st'))[0]);
    fs.writeFileSync(path.join(sdir, 'story.md'), '---\ntitle: 공룡 잠자리\nage: 7\nlang: ko\n---\n\n[scene: dinosaur, moon, night]\n공룡이 달을 봐요.\n\n[scene: dinosaur, bed, night]\n공룡이 침대에 누워요.\n');
    const sb = cli(['build', sdir, '--no-open'], {env: {CHROME_PATH: 'none'}});
    assert.match(sb.stdout, /book\s+\S*book\.html/); assert.match(sb.stdout, /No Chrome/);
    assert.ok(fs.existsSync(path.join(sdir, 'book.html')), 'book.html is always written');
    ok('no Chrome: build writes text, post.html, previews and check.json first; each picture that was not drawn is listed with why; a story always gets book.html');
  }

  // ---------- 14. newsletter: subject and preview in post.txt, post.html, post.json and an inbox preview ----------
  {
    const notes = path.join(tmp, 'nl-notes.md');
    fs.writeFileSync(notes, '# 뉴스레터\n쓰레드는 한 글에 500자까지 들어가요.\n사진이 같이 있어야 돼요.\n');
    const s = await RUN.start({inputs: [notes], out: path.join(tmp, 'nl-out'), want: 'newsletter', frames: 0, log: () => {}});
    fs.writeFileSync(path.join(s.runDir, 'newsletter', 'post.md'), 'subject: 쓰레드 500자, 이렇게 써요\npreview: 사진이랑 같이 올리는 법\n# 쓰레드 500자\n\n쓰레드는 한 글에 500자까지 들어가요. 사진이 같이 있어야 돼요.\n\n[image: steps "쓰고" "검사하고" "올려요"]\n');
    const b = await RUN.build(s.runDir, {pictures: false, log: () => {}});
    const d = path.join(s.runDir, 'newsletter');
    assert.match(fs.readFileSync(path.join(d, 'post.txt'), 'utf8'), /^subject: 쓰레드 500자, 이렇게 써요\npreview: 사진이랑 같이 올리는 법\n/);
    const j = JSON.parse(fs.readFileSync(path.join(d, 'post.json'), 'utf8'));
    assert.equal(j.subject, '쓰레드 500자, 이렇게 써요'); assert.equal(j.preview, '사진이랑 같이 올리는 법');
    const h = fs.readFileSync(path.join(d, 'post.html'), 'utf8');
    assert.match(h, /<title>쓰레드 500자, 이렇게 써요<\/title>/); assert.match(h, /display:none[^>]*>사진이랑 같이 올리는 법</);
    const pv = fs.readFileSync(path.join(d, 'preview.html'), 'utf8');
    assert.match(pv, /class="inbox"/); assert.match(pv, /data-copy="t_subject"/); assert.match(pv, /data-copy="t_preview"/); assert.match(pv, /data-copy="t0"/);
    const pkg = JSON.parse(fs.readFileSync(path.join(s.runDir, 'handoff', 'writer-package.json'), 'utf8'));
    assert.equal(pkg.platforms[0].subject, '쓰레드 500자, 이렇게 써요');
    assert.ok(!JSON.stringify(pkg).includes(tmp) && !JSON.stringify(pkg).includes(process.env.HOME || '/nohome'), 'no absolute or home paths in the hand-off');
    assert.ok(b.results.length === 1);
    ok('newsletter: subject and preview line kept in post.txt, post.html (title + hidden preheader), post.json, the hand-off, and an inbox preview with its own copy buttons; hand-off paths are relative');
  }

  // ---------- 15. editorial brief ----------
  {
    const notes = path.join(tmp, 'brief-notes.md');
    fs.writeFileSync(notes, '# 글쓰기 직원\n쓰레드는 한 글에 500자까지 들어가요.\n구독자가 한 달에 15% 늘었어요.\n');
    const s = await RUN.start({inputs: [notes], out: path.join(tmp, 'brief-out'), want: 'threads', frames: 0, log: () => {}});
    const st = B.startBrief(s.runDir);
    assert.ok(st.made && fs.existsSync(st.file));
    const empty = B.checkBrief(fs.readFileSync(st.file, 'utf8'), s.src);
    assert.equal(empty.problems.length, 5);
    const filled = '# Editorial brief\n## reader (누가 읽나요)\n영상 찍는 1인 사업가\n## purpose (무엇을 위한 글인가요)\n플랫폼마다 글자 수가 다르다는 걸 알게\n## claims to keep (꼭 지킬 내용)\n- 쓰레드는 한 글에 500자\n- 구독자가 15% 줄었다\n## what may be public (공개해도 되는 것)\n- 내 영상 장면\n## next action (다음 행동)\n영상 보러 가기\n';
    fs.writeFileSync(st.file, filled);
    const c1 = B.checkBrief(filled, s.src);
    assert.ok(!c1.ok && c1.problems.length === 1 && /15 goes down/.test(c1.problems[0]), 'a claim going the other way from the source');
    const fixed = filled.replace('15% 줄었다', '15% 늘었다').replace('500자', '500자, 300자도');
    const c2 = B.checkBrief(fixed, s.src);
    assert.ok(c2.problems.some((p) => /300 is not in your source/.test(p)));
    fs.writeFileSync(st.file, filled.replace('15% 줄었다', '15% 늘었다'));
    assert.ok(B.checkBrief(fs.readFileSync(st.file, 'utf8'), s.src).ok);
    // plan and write use it
    const PL = await imp('lib/plan.mjs');
    const plan = PL.planTemplate({title: 't', keys: ['threads'], platforms: P, brief: B.readBrief(s.runDir)});
    assert.match(plan, /for who: 영상 찍는 1인 사업가/); assert.match(plan, /next action: 영상 보러 가기/);
    const WR = await imp('lib/writer.mjs');
    assert.match(WR.writerPrompt(s.runDir, ['threads']), /Editorial brief[\s\S]*영상 찍는 1인 사업가/);
    assert.match(fs.readFileSync(path.join(s.runDir, 'brief.md'), 'utf8'), /editorial-brief\.md/);
    const r = cli(['brief', s.runDir, '--check']);
    assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /brief ok/);
    assert.ok(fs.existsSync(path.join(KIT, 'skill', 'skills', 'editorial-brief.md')));
    ok('editorial brief: reader, purpose, claims to keep (numbers and up/down checked against the source), what may be public, one next action; plan prefills from it, write follows it');
  }

  // humanize dogfood fixes: the plain locative is not translationese; quoted examples are shown, not counted
  {
    const H = await imp('lib/humanize.mjs');
    const ids = (t, o) => H.analyze(t, o).findings.map((f) => f.id);
    assert.ok(!ids('도구는 내 컴퓨터 그 자리에 있어요.').includes('ko-in-regard'), '그 자리에 있어요 is a place');
    assert.ok(!ids('결과 폴더 안에 있어야 돼요.').includes('ko-in-regard'));
    assert.ok(!ids('집에 있어요. 회사에 있었어요.').includes('ko-in-regard'));
    assert.ok(ids('교육에 있어서 중요한 건 반복이에요.').includes('ko-in-regard'), '교육에 있어서 is still flagged');
    assert.ok(ids('글을 작성함에 있어 주의할 점이 있어요.').includes('ko-in-regard'));
    const q = H.analyze('이런 말은 빼요. "~에 대해 알아보겠습니다", "단순히 ~가 아니라", "혁신적인" 같은 거요.');
    assert.equal(q.findings.length, 0, JSON.stringify(q.findings));
    assert.ok(q.quoted.length >= 3 && q.quoted.every((f) => f.hint === 'quoted (not counted)'));
    assert.ok(H.reportLines(q).some((l) => /^QUOTE .*quoted \(not counted\)/.test(l)));
    assert.ok(ids('이건 혁신적인 도구예요.').includes('ko-hype'), 'the same word outside quotes still counts');
    assert.equal(H.analyze('“무궁무진”').findings.length, 0);
    assert.match(H.humanizeHtml({file: 'a.md', text: '"혁신적인"', result: H.analyze('"혁신적인"')}), /mark class="quoted"/);
    ok('humanize: 그 자리에 있어요 / 안에 있어야 not flagged, 교육에 있어서 / 함에 있어 flagged; quoted examples shown as quoted (not counted)');
  }

  // the bundled sample.srt makes a try-out voice sheet (textbook prompt 2-2), not an error
  {
    const V = await imp('lib/voice.mjs');
    const r = V.buildVoice([path.join(KIT, 'examples', 'source', 'sample.srt')], {banned: {}, name: 'sample'});
    assert.ok(r.analysis.thin && r.analysis.lines >= 10, String(r.analysis.lines));
    assert.match(r.markdown, /Try-out sheet: only \d+ lines/);
    const few = path.join(tmp, 'few.srt');
    fs.writeFileSync(few, '1\n00:00:01,000 --> 00:00:02,000\n안녕하세요.\n');
    assert.throws(() => V.buildVoice([few], {banned: {}, name: 'x'}), /Only 1 lines/);
    ok('voice: the bundled sample.srt gives a try-out sheet (marked thin); fewer than 10 lines is still refused');
  }

  {
    const R = await imp('lib/run.mjs');
    const out = path.join(tmp, 'novoice-out');
    await assert.rejects(R.start({inputs: [path.join(KIT, 'examples', 'source', 'notes.md')], out, voice: path.join(tmp, 'missing-voice.md'), log: () => {}}), /--voice: not found/);
    assert.ok(!fs.existsSync(out), 'no half-made run folder');
    ok('start: a missing --voice or --files is refused before any folder is made');
  }
}
