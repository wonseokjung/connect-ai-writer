// v0.2 skills: research, trends, plan, humanize, story, shape checks, fact trace, engines. No network, no account.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export async function skillTests({ok, skip, assert, imp, tmp, KIT, findChrome}) {
  const CFG = await imp('lib/config.mjs');
  const PF = await imp('lib/postfile.mjs');
  const CK = await imp('lib/check.mjs');
  const R = await imp('lib/research.mjs');
  const T = await imp('lib/trends.mjs');
  const H = await imp('lib/humanize.mjs');
  const S = await imp('lib/story.mjs');
  const SC = await imp('lib/scenes.mjs');
  const PL = await imp('lib/plan.mjs');
  const E = await imp('lib/engines.mjs');
  const cfg = CFG.loadConfig(null);
  const P = cfg.platforms;

  // ---------- research ----------
  const rdir = path.join(tmp, 'r-research');
  fs.mkdirSync(path.join(rdir, 'sources'), {recursive: true});
  fs.writeFileSync(path.join(rdir, 'sources', 'S1.txt'), '홈페이지는 지난해 12월 5309개에서 올해 9월 1만3939개로 2.6배 증가했다.\n카페24 관계자는 "실제 사업 현장에서 활용되는 웹서비스로 이어지고 있다"고 말했다.\n');
  fs.writeFileSync(path.join(rdir, 'sources', 'S2.txt'), 'v0 플랫폼 사용자의 63%가 비개발자인 것으로 나타났습니다.\n');
  fs.writeFileSync(path.join(rdir, 'research.json'), JSON.stringify({kind: 'research', topic: '바이브코딩', sources: [
    {id: 'S1', kind: 'web', url: 'https://example.com/a', title: 'A', site: 'example.com', published: '2026-11-22', fetched: '2026-11-24', text: 'sources/S1.txt'},
    {id: 'S2', kind: 'web', url: 'https://example.com/%EB%B0%94', title: 'B', site: 'example.com', fetched: '2026-11-24', text: 'sources/S2.txt'},
  ]}));
  fs.writeFileSync(path.join(rdir, 'facts.md'), `# Fact sheet\n## Perspectives\n- 처음 들어 본 사람 1명\n## Facts\n- 홈페이지가 5309개에서 1만3939개로 2.6배 늘었다 [S1]\n- 사용자의 63%가 비개발자다 [S2]\n- 사용자의 70%가 비개발자다 [S2]\n- 관계자는 "실제 사업 현장에서 활용되는 웹서비스로 이어지고 있다"고 했다 [S1]\n- 관계자는 "모두가 부자가 된다"고 했다 [S1]\n- 출처 없는 사실\n- 없는 출처 [S9]\n`);
  assert.ok(R.isResearch(rdir));
  const checked = R.researchCheck(rdir);
  const byText = (t) => checked.facts.find((f) => f.text.includes(t));
  assert.equal(checked.facts.length, 7, 'notes under Perspectives are not facts');
  assert.ok(byText('5309').ok && byText('5309').evidence.some((e) => e.num === '5309' && /5309/.test(e.sentence)));
  assert.ok(byText('63%').ok);
  assert.ok(!byText('70%').ok && /70/.test(byText('70%').problems[0]));
  assert.ok(byText('실제 사업').ok);
  assert.ok(!byText('부자').ok && /quote/.test(byText('부자').problems.join()));
  assert.ok(!byText('출처 없는').ok && !byText('없는 출처').ok);
  assert.ok(fs.existsSync(path.join(rdir, 'research.html')) && fs.existsSync(path.join(rdir, 'facts.json')));
  ok('research: every fact traces to its source (numbers, quotes, unknown or missing source), with the source sentence; notes are not facts');

  // a run started from the research folder: posts are checked against facts and sources, links and sources section too
  fs.writeFileSync(path.join(rdir, 'facts.md'), '## Facts\n- 홈페이지가 5309개에서 1만3939개로 2.6배 늘었다 [S1]\n- 사용자의 63%가 비개발자다 [S2]\n');
  const {start} = await imp('lib/run.mjs');
  const s = await start({inputs: [rdir], out: path.join(tmp, 'r-out'), want: 'naver,newsletter', slug: 'rs', frames: 0, log: () => {}});
  assert.equal(s.src.kind, 'research');
  assert.ok(fs.readFileSync(path.join(s.runDir, 'brief.md'), 'utf8').includes('## 출처'));
  const src = JSON.parse(fs.readFileSync(path.join(s.runDir, 'source', 'source.json'), 'utf8'));
  const good = PF.parsePost('# 바이브코딩, 숫자로 보면 이래요\nkeyword: 바이브코딩\n\n바이브코딩 홈페이지가 2.6배 늘었어요 [S1].\n\n[image: stat "63%" "비개발자"]\n\n## 바이브코딩 쓰는 사람\n\n63%가 비개발자예요 [S2].\n\n[image: title "바이브코딩"]\n\n## 숫자 두 개\n\n[image: steps "말로" "확인"]\n\n## 출처\n\n[1] A, example.com, https://example.com/a\n[2] B, https://example.com/바\n\ntags: 바이브코딩', P.naver);
  const F = CK.checkPost({key: 'naver', post: good, platform: P.naver, source: src, rules: cfg.rules, banned: cfg.banned});
  assert.ok(!F.some((f) => f.level === 'fail'), JSON.stringify(F.filter((f) => f.level === 'fail')));
  const bad = PF.parsePost('# 바이브코딩 이야기\n\n바이브코딩 홈페이지가 3배 늘었어요 [S7]. https://made-up.example.com\n\n[image: title "바이브코딩"]\n\ntags: a', P.naver);
  const F2 = CK.checkPost({key: 'naver', post: bad, platform: P.naver, source: src, rules: cfg.rules, banned: cfg.banned});
  for (const re of [/number 3 /, /\[S7\]/, /made-up/, /no sources section/]) assert.ok(F2.some((f) => f.level === 'fail' && re.test(f.message)), String(re));
  assert.ok(F2.some((f) => f.rule === 'seo' && /keyword/.test(f.message)));
  const tr = CK.traceNumbers(good, src);
  assert.ok(tr.find((t) => t.num === '2.6').from === 'fact' && tr.every((t) => t.from));
  assert.equal(PF.plainText(good.parts[0], good, P.naver).includes('[1]'), true);
  ok('research -> post: numbers trace to the fact sheet, links only to sources read, a sources section, [S1] shows as [1], search words checked');

  // ---------- newsletter + hooks ----------
  const nl = PF.parsePost('subject: 바이브코딩, 숫자로 보면\npreview: 바이브코딩, 숫자로 보면\n# 제목\n\n본문이에요.\n\n[image: title "t"]', P.newsletter);
  assert.equal(nl.subject, '바이브코딩, 숫자로 보면');
  assert.ok(!nl.parts[0].text.includes('subject'));
  const nf = CK.shapeFindings({key: 'newsletter', post: nl, platform: P.newsletter, source: {lines: []}});
  assert.ok(nf.some((f) => /repeats the subject/.test(f.message)));
  const nl2 = PF.parsePost('# 제목\n\n본문\n\n[image: title "t"]', P.newsletter);
  assert.ok(CK.shapeFindings({key: 'newsletter', post: nl2, platform: P.newsletter, source: {lines: []}}).some((f) => f.rule === 'email' && f.level === 'fail'));
  const th = PF.parsePost('첫 줄이 아주아주 길어요 '.repeat(8) + '\n\n[image: title "t"]', P.threads);
  assert.ok(CK.shapeFindings({key: 'threads', post: th, platform: P.threads, source: {lines: []}}).some((f) => f.rule === 'hooks'));
  ok('newsletter needs a subject and a preview that adds to it; first lines longer than what shows before "more" are flagged');

  // ---------- plan ----------
  const nums = new Set(['63', '2.6']);
  const a = PL.scoreLine('바이브코딩, 비개발자 63%가 쓰는 이유', {kind: 'title', platform: P.naver, keyword: '바이브코딩', srcNums: nums, banned: ['혁신적인'], claims: ['최고']});
  const b = PL.scoreLine('혁신적인 최고의 코딩 방법 99가지', {kind: 'title', platform: P.naver, keyword: '바이브코딩', srcNums: nums, banned: ['혁신적인'], claims: ['최고']});
  assert.ok(a.score > 80 && b.score < 20, `${a.score} ${b.score}`);
  const pp = PL.parsePlan('keyword: 바이브코딩\n## titles\n- one\n- two\n## hooks threads\n- h1\n');
  assert.deepEqual(pp.groups.titles, ['one', 'two']); assert.equal(pp.meta.keyword, '바이브코딩');
  ok('plan: titles and first lines are scored (search words up front, real numbers, no AI words or overclaims)');

  // ---------- trends ----------
  const rss = `<rss><channel><item><title>바이브코딩</title><ht:approx_traffic>1,000+</ht:approx_traffic><pubDate>Tue, 24 Nov 2026 03:00:00 -0800</pubDate><ht:news_item><ht:news_item_title>경찰, &apos;의혹&apos; 기사</ht:news_item_title><ht:news_item_url>https://news.example/1</ht:news_item_url></ht:news_item></item></channel></rss>`;
  const it = T.parseTrendingRss(rss)[0];
  assert.equal(it.title, '바이브코딩'); assert.equal(T.trafficNumber(it.traffic), 1000); assert.equal(it.news[0].title, "경찰, '의혹' 기사"); assert.equal(it.date, '2026-11-24T11:00:00.000Z');
  assert.deepEqual(T.cleanSuggestions('바이브코딩', ['바이브코딩', '바이브코딩 강의', 'qkdlqmzheld', 'vibe coding app']), ['바이브코딩 강의', 'vibe coding app'], 'a real English search stays');
  const t = {made: '2026-11-24T00:00:00Z', geo: 'KR', seeds: ['바이브코딩'], notes: [], suggest: {}, wiki: {'바이브코딩|ko': {title: '바이브 코딩', lang: 'ko', url: 'u', views: [{month: '2026-09', views: 1185}, {month: '2026-10', views: 890}, {month: '2026-11', views: 900}]}}};
  const charts = T.chartsFor(t, {w: 1600, h: 900});
  assert.equal(charts.length, 1); assert.match(charts[0].svg, /viewBox="0 0 1600 900"/); assert.match(charts[0].svg, /<path d="M/);
  const w = await T.writeTrends(t, {out: path.join(tmp, 't-out')});
  assert.ok(fs.readFileSync(path.join(w.dir, 'trends.md'), 'utf8').includes('peak 2026-09 1185'));
  assert.match(T.LISTEN, /done\(\{status: 'ok', rows: out\}\)/);
  assert.doesNotMatch(T.LISTEN, /click|keyboard|type\(/, 'listening only reads');
  const off = await T.naverDatalab(['a'], {id: '', secret: ''});
  assert.equal(off, null, 'DataLab stays off without the user key');
  ok('trends: trending feed parsed with dates, typo suggestions dropped, charts and notes written, listening reads only, DataLab off without a key');

  // ---------- humanize ----------
  const before = '오늘은 바이브코딩에 대해 알아보겠습니다. 이를 통해 앱을 만드는 것이 가능합니다. 보고서에 의하면 63%가 증가되어졌습니다. 단순히 도구가 아니라 혁신적인 흐름입니다.';
  const an = H.analyze(before);
  for (const id of ['ko-about', 'ko-through', 'ko-possible', 'ko-by-agent', 'ko-double-passive', 'ko-not-but', 'ko-hype', 'ko-opener']) assert.ok(an.findings.some((f) => f.id === id), id);
  const after = '바이브코딩은 AI한테 말로 시켜서 앱을 만드는 거예요. 보고서를 보면 63%가 늘었어요.';
  const cmp = H.compare(before, after);
  assert.ok(cmp.kept && cmp.better && cmp.after.score === 0, JSON.stringify(cmp.lost));
  const lost = H.compare(before, '바이브코딩은 말로 만드는 거예요. 70%가 늘었어요.');
  assert.ok(!lost.kept && lost.lost.some((l) => l.value === '63') && lost.lost.some((l) => l.value === '70'));
  assert.equal(H.register('좋습니다.'), 'formal'); assert.equal(H.register('좋거든요.'), 'polite'); assert.equal(H.register('좋다.'), 'plain');
  const mixed = H.analyze('저는 갑니다. 너는 간다. 우리는 가요. 그는 갑니다. 그녀는 간다. 모두 가요.');
  assert.ok(mixed.rhythm.some((r) => r.id === 'mixed-register'));
  assert.ok(H.analyze('확장 가능성이 무궁무진해요.').findings.some((f) => f.id === 'ko-hype'));
  assert.equal(H.analyze('확장 가능성이 무궁무진해요.', {own: '진짜 19, 무궁무진 2'}).findings.length, 0, 'a word you really say is yours');
  assert.ok(H.analyze('We delve into a rich tapestry. It is not just a tool, it is a movement.').findings.some((f) => f.id === 'en-stock'));
  ok('humanize: Korean 번역투 and staging, English tells, mixed speech levels, your own words from the voice sheet are kept; --after proves every number was kept and nothing was added');

  // ---------- story ----------
  const md = `# 토토와 작은 별\nage: 7\nmood: bedtime\ncover: [scene: night moon | dino:green]\n---\n[scene: night hill moon stars | dino:green:happy]\n토토는 별을 세요.\n---\n[scene: room bed | 공룡:초록:졸린]\n달님이 웃었어요.\n---\n토토는 로켓을 탔어요.\n---\n[scene: space rocket unicorn | dino:green:excited]\n${'아주 긴 문장이 계속 이어지고 또 이어져서 아이가 읽기 어려워요. '.repeat(5)}\n---\n[scene: room bed moon | dino:green:sleepy]\n그래서 우리는 일찍 자야 해요. 이게 교훈이에요.`;
  const st = S.parseStory(md);
  assert.equal(st.meta.title, '토토와 작은 별'); assert.equal(st.meta.age, '7'); assert.equal(st.pages.length, 5);
  const sf = S.checkStory(st);
  const has = (re, lvl) => sf.some((f) => re.test(f.message) && (!lvl || f.level === lvl));
  assert.ok(has(/page 3 has no \[scene/, 'fail'));
  assert.ok(has(/page 2: the text names moon/));
  assert.ok(has(/unicorn/));
  assert.ok(has(/page 4: \d+ letters/));
  assert.ok(has(/lesson/));
  const sp = SC.parseScene('[scene: 밤 언덕 달 별 | 공룡:초록:졸린:왼쪽 owl:purple:calm:right:small]');
  assert.equal(sp.backdrop, 'night'); assert.deepEqual(sp.props.map((p) => p.name), ['hill', 'moon', 'stars']);
  assert.equal(sp.chars[0].name, 'dino'); assert.equal(sp.chars[0].mood, 'sleepy'); assert.equal(sp.chars[1].size, 'small');
  const svg1 = SC.sceneSvg(sp, {w: 800, h: 450, seed: 3}), svg2 = SC.sceneSvg(sp, {w: 800, h: 450, seed: 3});
  assert.equal(svg1, svg2); assert.match(svg1, /^<svg/); assert.doesNotMatch(svg1, /https?:\/\/(?!www\.w3\.org)/, 'no outside files');
  const sdir = S.startStory({idea: '7살, 공룡, 잠자리 동화', age: 7, out: path.join(tmp, 's-out'), title: '토토'}).dir;
  assert.ok(fs.readFileSync(path.join(sdir, 'brief.md'), 'utf8').includes('130 Korean letters'));
  fs.writeFileSync(path.join(sdir, 'story.md'), md.replace('토토는 로켓을 탔어요.', '[scene: space rocket | dino:green:excited]\n토토는 로켓을 탔어요.'));
  const built = await S.buildStory(sdir, {png: !!findChrome(), pdf: false});
  const html = fs.readFileSync(path.join(sdir, 'book.html'), 'utf8');
  assert.equal((html.match(/<section class="page/g) || []).length, st.pages.length + 2, 'cover + pages + end');
  if (findChrome()) assert.ok(built.files.length === st.pages.length + 2 && fs.existsSync(built.sheet));
  ok(`story: pages, scenes (Korean words too), age limits, the text-picture contract, no lesson ending; book.html${findChrome() ? ', page pictures and a sheet' : ''} from code-made scenes`);

  // ---------- engines ----------
  const thread = PF.parsePost('홈페이지가 2.6배 늘었어요. 긴 설명이 이어집니다.\n\n[image: stat "2.6배" "홈페이지"]\n---\n두 번째 글이에요.\n\n[image: steps "말로" "확인"]', P.threads);
  const script = E.scriptFromPost(thread);
  assert.deepEqual(script.slice(0, 3), ['홈페이지가 2.6배 늘었어요.', '2.6배. 홈페이지', '두 번째 글이에요.']);
  const sb = path.join(tmp, 'storyboard.json');
  fs.writeFileSync(sb, JSON.stringify({beats: [{id: 'b1', kind: 'kit/big-number', value: '2.6배'}, {id: 'b2', kind: 'remotion/shapes-pie', value: '84.6%'}, {id: 'b3', kind: 'remotion/shapes-pie', value: '63%'}]}));
  const mv = E.keepExactNumbers(sb);
  assert.equal(mv.length, 1); assert.equal(mv[0].id, 'b2'); assert.notEqual(mv[0].to, 'kit/big-number', 'a design already used is not reused');
  const fake = path.join(tmp, 'fake-motion');
  fs.mkdirSync(path.join(fake, 'bin'), {recursive: true});
  fs.writeFileSync(path.join(fake, 'bin', 'cli.mjs'), 'console.log("ok")');
  assert.equal(E.findEngine('motion', {CAIW_MOTION_KIT: fake}).where, fake);
  const runDir = path.join(tmp, 'eng-run');
  fs.mkdirSync(path.join(runDir, 'threads'), {recursive: true});
  fs.writeFileSync(path.join(runDir, 'threads', 'post.md'), '홈페이지가 99배 늘었어요.\n\n[image: title "t"]');
  const mp = E.motionProject(runDir, 'threads', {platform: P.threads, source: {lines: [{text: '홈페이지가 2.6배 늘었다'}]}});
  assert.ok(mp.bad.some((x) => x.num === '99'), 'a number not in the source stops the video script');
  ok('engines: our other employees found by PATH or kit folder; video script only from the post, numbers checked, decimals kept exact');

  // ---------- CLI ----------
  const cli = (args, cwd = tmp) => spawnSync(process.execPath, [path.join(KIT, 'bin', 'cli.mjs'), ...args], {cwd, encoding: 'utf8', env: {...process.env, CI: '1'}});
  const h = cli(['help']);
  for (const c of ['research', 'trends', 'plan', 'story', 'humanize', 'motion', 'engines', '--trace']) assert.ok(h.stdout.includes(c), c);
  const hz = path.join(tmp, 'h.md');
  fs.writeFileSync(hz, before); fs.writeFileSync(hz + '.after.md', after);
  const hr = cli(['humanize', hz, '--after', hz + '.after.md']);
  assert.equal(hr.status, 0); assert.match(hr.stdout, /facts\s+kept/); assert.ok(fs.existsSync(path.join(tmp, 'h.humanize.html')));
  assert.equal(cli(['research', 'check', rdir]).status, 0);
  assert.equal(cli(['engines']).status, 0);
  ok('CLI: help lists every skill; humanize and research check run end to end');
}
