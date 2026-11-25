#!/usr/bin/env node
// connect-ai-writer: one source you own -> a post for every text platform, with pictures, checked, previewed, and put in the editor as a draft.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {KIT, KIT_NAME, VERSION} from '../lib/name.mjs';
import {banner, gold, dimmed} from '../lib/banner.mjs';

process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.name !== 'ExperimentalWarning') console.error(w.message); });

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['for', 'voice', 'srt', 'video', 'out', 'title', 'slug', 'theme', 'only', 'to', 'name', 'blog-id', 'frames', 'writer', 'agent', 'dir', 'age', 'pages', 'lang', 'geo', 'listen', 'screens', 'after', 'by', 'kw', 'from', 'files'];
const flag = (n) => argv.includes('--' + n);
const opt = (n, d = null) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && VALUE_FLAGS.includes(argv[i - 1].slice(2))));
const cmd = flag('help') || argv.includes('-h') ? 'help' : flag('version') || argv.includes('-v') ? 'version' : pos[0] || 'help';
const log = (...a) => console.log(...a);
// a path you can paste back into a terminal: quoted when it has spaces, 한글 or other special letters
const q = (f) => (/^[\w@%+=:,./-]+$/.test(f) ? f : JSON.stringify(f));
const show = (f) => { const r = path.relative(process.cwd(), f); return q(r.startsWith('..') || !r ? f : r); };

function hello() {
  log(banner());
  log('  ' + 'Your AI writing employee. ' + gold('One source in, a post for every platform out, with pictures.') + dimmed('  영상 하나로 플랫폼마다 글과 사진을'));
  log('');
}

function openFile(f) {
  if (!f || flag('no-open') || process.env.CI || !process.stdout.isTTY) return;
  const [c, a] = process.platform === 'darwin' ? ['open', [f]] : process.platform === 'win32' ? ['explorer.exe', [f]] : ['xdg-open', [f]];
  try { const p = spawn(c, a, {stdio: 'ignore', detached: true}); p.on('error', () => {}); p.unref(); } catch {}
}

function latestRun(dir) {
  const d = path.resolve(dir || '.');
  if (fs.existsSync(path.join(d, 'run.json'))) return d;
  for (const base of [path.join(d, 'out'), d]) {
    if (!fs.existsSync(base)) continue;
    const runs = fs.readdirSync(base).map((f) => path.join(base, f)).filter((f) => fs.existsSync(path.join(f, 'run.json'))).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (runs.length) return runs[0];
  }
  throw new Error(`No run folder in ${d}. Start one: npx ${KIT_NAME} start <your video, .srt, notes or link>`);
}

function summary(r) {
  const fails = r.findings.filter((f) => f.level === 'fail'), warns = r.findings.filter((f) => f.level === 'warn');
  log('');
  for (const x of r.results) {
    const f = x.findings.filter((y) => y.level === 'fail').length, w = x.findings.filter((y) => y.level === 'warn').length;
    log(`  ${x.platform.name.padEnd(12)} ${f ? `${f} to fix` : gold('ready')}${w ? dimmed(`, ${w} to look at`) : ''}   ${x.made.filter((m) => m.file).length} picture(s)   ${show(path.join(r.runDir, x.key, 'preview.html'))}`);
  }
  if (fails.length || warns.length) {
    log('');
    for (const f of [...fails, ...warns].slice(0, 14)) log(`  ${f.level === 'fail' ? 'FIX ' : dimmed('LOOK')} ${f.message}${f.fix ? dimmed('  ' + f.fix) : ''}`);
    if (fails.length + warns.length > 14) log(dimmed(`  ... all of it in ${show(path.join(r.runDir, 'check.md'))}`));
  }
  log('');
  log(`  result   ${q(r.runDir)}`);
  log(`  preview  ${q(path.join(r.runDir, 'index.html'))}`);
  if (r.sheet) log(`  sheet    ${q(r.sheet)}`);
  log(`  hand-off ${q(path.join(r.runDir, 'handoff'))}   (for connect-ai-marketer; nothing is posted)`);
  log(fails.length ? dimmed('  고칠 게 남아 있어요. 위에 FIX 줄을 고치고 build 를 한 번 더 돌려 주세요.') : dimmed('  다 됐어요. 미리보기를 한번 보세요. 올리는 건 직접 확인하신 다음에만 해요.'));
}

const HELP = `
  skills    research · trends · plan · write · story · humanize · check (fact-check) · repurpose

  npx ${KIT_NAME} demo                       try it on the example notes (no video, no AI, no account; no Chrome needed)
  npx ${KIT_NAME} start <source> --for threads,naver,x
                                             read your source, make out/<date>_<name>/ with a brief and one post.md per platform
  npx ${KIT_NAME} build [run]                post.md -> pictures, check, preview.html, post.txt (latest run if no folder)
  npx ${KIT_NAME} check [run]                only the text checks, fast
  npx ${KIT_NAME} brief [run] (--check)      the editorial brief: reader, purpose, claims to keep, what may be public, next action
  npx ${KIT_NAME} post [run] --to threads    put the draft in the editor in Ego Lite and stop before the post button
  npx ${KIT_NAME} voice <your transcripts...> --out voice.md   a voice sheet from your own words
  npx ${KIT_NAME} research "topic" [links or files...]   sources with dates + a fact sheet (research add | research check)
  npx ${KIT_NAME} trends "words" ["more words"]           what people search and post now, with sources and dates
  npx ${KIT_NAME} plan [run] (--score)        titles and first lines to choose from, scored
  npx ${KIT_NAME} story "7살, 공룡, 잠자리 동화" --age 7   a picture book: story.md -> book.html, pages, PDF
  npx ${KIT_NAME} humanize <file> [--after rewrite.md]  what sounds like an AI; with --after, checks numbers, quotes, names and up/down words were kept
  npx ${KIT_NAME} check [run] --trace         where every number in your posts comes from (numbers, quotes and up/down words; not a meaning check)
  npx ${KIT_NAME} motion [run] --from threads (--render)   a motion graphics video from the post, made by connect-ai-motion
  npx ${KIT_NAME} engines                    our other AI employees it works with, found or not
  npx ${KIT_NAME} install-skill              add the agent skill (Claude Code, Codex, Antigravity, Cursor)
  npx ${KIT_NAME} platforms | themes | doctor

  sources   a video (its .srt next to it, or --srt), .srt / .vtt / .txt / .md, a YouTube link (needs yt-dlp), or your own page's link
  start     --for threads,naver,x,linkedin,instagram,tistory,brunch | all | all,newsletter     --voice voice.md
            --srt my.srt (subtitles of the video; or my.srt next to my.mp4)   --video my.mp4 (frames for a transcript)
            --files photo.jpg,page.html (your own pictures/pages, copied into the run folder)   --resume (continue the same run folder)
            --title "..."  --slug name  --out out  --frames 16 (sharp frames to choose from, 0 = none)  --download-video (YouTube, for frames)
  write     [run] --writer "claude -p"       optional: a headless agent writes every post.md (normally your agent in chat does)
            runs without a shell; a writer command is read only from this flag or ~/.connect-ai/connect-ai-writer/writer.config.json
  build     --theme default|paper|my-theme.json   --only threads,x   --no-pictures (text, check and preview only; needs no Chrome)
  post      --to threads|x|naver  --blog-id <naver id>  --leave-open (keep the filled editor open for you)
            --no-save (do not press the draft save)  --drafts-shot (Naver: also a screenshot of your drafts list)
            --publish (press the platform's publish button too, only when you asked to publish)
            only a draft that build checked and that has not changed since
            exit codes: 0 done, 1 error, 3 logged out, 4 no post box found, 5 waiting for your choice in the editor
  research  start a run from it: start <research folder> --for naver,newsletter (posts are checked against the fact sheet)
  trends    --geo KR  --lang ko  --listen x,threads,youtube (Ego Lite, read only)  --no-google
            Naver DataLab turns on with your own NAVER_CLIENT_ID and NAVER_CLIENT_SECRET
  story     --age 3..8  --pages 12  --lang ko|en   then: build <story folder>
`;

async function main() {
  switch (cmd) {
    case 'version': log(VERSION); return;
    case 'help': hello(); log(HELP); return;
    case 'demo': {
      hello();
      const dir = path.resolve(pos[1] || `${KIT_NAME}-demo`);
      fs.mkdirSync(path.join(dir, 'source'), {recursive: true});
      for (const f of fs.readdirSync(path.join(KIT, 'examples', 'source'))) fs.copyFileSync(path.join(KIT, 'examples', 'source', f), path.join(dir, 'source', f));
      const {start, build} = await import('../lib/run.mjs');
      const s = await start({inputs: [path.join(dir, 'source', 'notes.md')], out: path.join(dir, 'out'), want: 'threads,naver,x,linkedin,instagram', slug: 'demo', frames: 0, files: [path.join(dir, 'source', 'page.html')], log});
      for (const k of s.keys) {
        const ex = path.join(KIT, 'examples', 'posts', `${k}.md`);
        if (fs.existsSync(ex)) fs.copyFileSync(ex, path.join(s.runDir, k, 'post.md'));
      }
      log(`  demo: example notes -> ${s.keys.join(', ')}  (the posts were written from the notes in advance; with your agent they are written for you)`);
      const {findChrome} = await import('../lib/chrome.mjs');
      const pictures = !flag('no-pictures') && !!findChrome();
      if (!pictures) log(dimmed('  No Chrome here (or --no-pictures): the posts, the check and the previews are made; the picture cards are skipped. 크롬이 없어서 그림 카드만 건너뛰어요.'));
      const r = await build(s.runDir, {log, pictures});
      summary(r);
      openFile(path.join(r.runDir, 'index.html'));
      log('');
      log(`  Next: npx ${KIT_NAME} start <your video> --srt <its subtitles .srt> --for threads,naver,x   then let your agent write (install-skill)`);
      return;
    }
    case 'start': {
      hello();
      const inputs = pos.slice(1);
      if (!inputs.length) throw new Error('Give a source: a video, .srt, .txt / .md notes, a YouTube link or your page link.');
      const {start} = await import('../lib/run.mjs');
      const s = await start({inputs, out: opt('out', 'out'), want: opt('for', 'threads,naver,x'), voice: opt('voice'), srt: opt('srt'), video: opt('video'), title: opt('title'), slug: opt('slug'), frames: Number(opt('frames', '16')), downloadVideo: flag('download-video'), files: (opt('files') || '').split(',').map((x) => x.trim()).filter(Boolean), resume: flag('resume'), log});
      log(`  source   ${s.src.kind}, ${s.src.lines.length} lines${s.src.video ? ', video ' + path.basename(s.src.video) : ''}`);
      log(`  run      ${q(s.runDir)}`);
      log(`  brief    ${q(path.join(s.runDir, 'brief.md'))}`);
      if (s.frameList.length) log(`  frames   ${q(path.join(s.runDir, 'source', 'frames.jpg'))}   (${s.frameList.length} sharp frames with their times)`);
      for (const k of s.keys) log(`  write    ${q(path.join(s.runDir, k, 'post.md'))}`);
      log('');
      log(`  Next: npx ${KIT_NAME} brief ${show(s.runDir)} (reader, purpose, next action), your agent writes each post.md from the brief (or: npx ${KIT_NAME} write --writer "claude -p"), then  npx ${KIT_NAME} build ${show(s.runDir)}`);
      return;
    }
    case 'write': {
      hello();
      const runDir = latestRun(pos[1]);
      const {loadConfig} = await import('../lib/config.mjs');
      const settings = loadConfig(path.dirname(runDir)).settings;
      if (!opt('writer') && settings._ignored?.includes('writer')) log(dimmed('  A writer.config.json in this project folder has a writer command. It is ignored: commands come only from --writer or your own ~/.connect-ai/connect-ai-writer/writer.config.json.'));
      const command = opt('writer') || settings.writer?.command;
      if (!command) throw new Error('No writer command. Use --writer "claude -p" (or "codex exec"), or let your agent in chat write the post.md files from brief.md.');
      const {writeWithCommand} = await import('../lib/writer.mjs');
      const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
      const wrote = writeWithCommand(runDir, run.platforms, command, {overwrite: flag('overwrite'), passEnv: settings.writer?.passEnv || [], log});
      log(`  wrote ${wrote.join(', ') || 'nothing new'}. Next: npx ${KIT_NAME} build ${show(runDir)}`);
      return;
    }
    case 'build': {
      hello();
      const target = latestRun(pos[1]);
      if (JSON.parse(fs.readFileSync(path.join(target, 'run.json'), 'utf8')).kind === 'story') {
        const {buildStory} = await import('../lib/story.mjs');
        const r = await buildStory(target, {log});
        const fails = r.findings.filter((f) => f.level === 'fail');
        log(`  ${r.story.meta.title || 'story'}: ${r.story.pages.length} pages, ${r.files.length} pictures`);
        for (const f of r.findings.slice(0, 16)) log(`  ${f.level === 'fail' ? 'FIX ' : dimmed('LOOK')} ${f.message}`);
        if (r.book) { log(''); log(`  book     ${q(r.book)}`); }
        if (r.files.length) { log(`  pages    ${q(path.join(r.dir, 'pages'))}`); log(`  sheet    ${q(r.sheet)}`); if (r.pdf) log(`  pdf      ${q(r.pdf)}`); }
        else if (r.book) log(dimmed(`  ${r.pictureError || 'No Chrome here, so the page pictures and the PDF were not made'}. book.html has the whole book; open it in any browser.`));
        if (r.book) openFile(r.book);
        if (fails.length) process.exitCode = 2;
        return;
      }
      const {build} = await import('../lib/run.mjs');
      const r = await build(target, {theme: opt('theme'), only: opt('only'), pictures: !flag('no-pictures'), log});
      summary(r);
      openFile(path.join(r.runDir, 'index.html'));
      if (r.findings.some((f) => f.level === 'fail')) process.exitCode = 2;
      return;
    }
    case 'factcheck':
    case 'check': {
      const runDir = latestRun(pos[1]);
      const {loadConfig} = await import('../lib/config.mjs');
      const {parsePost} = await import('../lib/postfile.mjs');
      const {checkPost, reportText} = await import('../lib/check.mjs');
      const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
      const src = JSON.parse(fs.readFileSync(path.join(runDir, 'source', 'source.json'), 'utf8'));
      const cfg = loadConfig(path.dirname(runDir));
      const all = [];
      for (const key of run.platforms) {
        const f = path.join(runDir, key, 'post.md');
        if (!fs.existsSync(f)) continue;
        all.push(...checkPost({key, post: parsePost(fs.readFileSync(f, 'utf8'), cfg.platforms[key]), platform: cfg.platforms[key], source: src, rules: cfg.rules, banned: cfg.banned}));
      }
      log(reportText(all));
      if (flag('trace') || cmd === 'factcheck') {
        const {traceNumbers} = await import('../lib/check.mjs');
        log('\n  where every number comes from');
        for (const key of run.platforms) {
          const f = path.join(runDir, key, 'post.md');
          if (!fs.existsSync(f)) continue;
          for (const t of traceNumbers(parsePost(fs.readFileSync(f, 'utf8'), cfg.platforms[key]), src)) log(`  ${key.padEnd(10)} ${String(t.num).padEnd(8)} ${t.from ? gold(t.from.padEnd(10)) + ' ' + dimmed(t.line) : 'NOT FOUND in your source'}`);
        }
      }
      if (all.some((f) => f.level === 'fail')) process.exitCode = 2;
      return;
    }
    case 'brief': {
      hello();
      const runDir = latestRun(pos[1]);
      const B = await import('../lib/brief.mjs');
      if (flag('check')) {
        const src = JSON.parse(fs.readFileSync(path.join(runDir, 'source', 'source.json'), 'utf8'));
        if (!fs.existsSync(B.briefFile(runDir))) throw new Error(`No editorial-brief.md yet. Run: brief ${show(runDir)}`);
        const r = B.checkBrief(fs.readFileSync(B.briefFile(runDir), 'utf8'), src);
        for (const s of B.SECTIONS) log(`  ${s.en.padEnd(18)} ${(r.brief[s.key] || []).join(' / ').slice(0, 90) || dimmed('(empty)')}`);
        log('');
        for (const p of r.problems) log(`  FIX ${p}`);
        const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
        const html = path.join(runDir, 'editorial-brief.html');
        fs.writeFileSync(html, B.briefHtml({title: (fs.readFileSync(B.briefFile(runDir), 'utf8').match(/^#\s+Editorial brief:\s*(.+)$/m) || [])[1] || run.title, result: r}));
        log(r.ok ? gold('  brief ok') + dimmed(`  Next: plan ${show(runDir)}  (titles and first lines for this reader)`) : '');
        log(`  page     ${q(html)}`);
        if (!r.ok) process.exitCode = 2;
        return;
      }
      const r = B.startBrief(runDir);
      log(`  brief    ${q(r.file)}${r.made ? '' : '  (already there; --check to check it)'}`);
      log(`  Fill: reader, purpose, claims to keep, what may be public, next action. Then: brief ${show(runDir)} --check`);
      return;
    }
    case 'research': {
      hello();
      const R = await import('../lib/research.mjs');
      const sub = pos[1];
      if (sub === 'add') {
        const dir = path.resolve(pos[2] || '.');
        if (!R.isResearch(dir)) throw new Error(`${dir} is not a research folder (no research.json).`);
        const r = await R.addSources(dir, pos.slice(3), {log});
        log(`  added ${r.added.length}${r.failed.length ? `, could not read ${r.failed.length}` : ''}. Sources now: ${r.research.sources.length}. Next: fill facts.md, then  research check ${show(dir)}`);
        return;
      }
      if (sub === 'check') {
        const dir = path.resolve(pos[2] || '.');
        if (!R.isResearch(dir)) throw new Error(`${dir} is not a research folder (no research.json).`);
        const r = R.researchCheck(dir);
        const bad = r.facts.filter((f) => !f.ok);
        log(`  ${r.facts.length - bad.length}/${r.facts.length} facts trace to their source, ${r.sources.length} sources (${r.sources.filter((x) => x.used).length} used)`);
        for (const f of bad) for (const p of f.problems) log(`  FIX ${f.text.slice(0, 50)}...  ${p}`);
        log(`  fact sheet ${path.join(dir, 'research.html')}`);
        if (!bad.length && r.facts.length) log(dimmed(`  Next: npx ${KIT_NAME} start ${show(dir)} --for naver,threads,newsletter`));
        if (bad.length || !r.facts.length) process.exitCode = 2;
        openFile(path.join(dir, 'research.html'));
        return;
      }
      const topic = sub;
      const r = await R.startResearch({topic, inputs: pos.slice(2), out: opt('out', 'out'), lang: opt('lang', 'ko'), log});
      log(`  research ${r.dir}`);
      log(`  sources  ${r.added.length} read${r.failed.length ? `, ${r.failed.length} could not be read` : ''}`);
      log(`  next     questions.md (who asks what) -> research add ${show(r.dir)} <links> -> facts.md -> research check ${show(r.dir)}`);
      return;
    }
    case 'trends': {
      hello();
      const T = await import('../lib/trends.mjs');
      const seeds = pos.slice(1);
      const listen = opt('listen');
      log(`  reading signals${seeds.length ? ' for ' + seeds.join(', ') : ''} (${opt('geo', 'KR')})`);
      const t = await T.collectTrends({seeds, geo: opt('geo', 'KR'), lang: opt('lang', 'ko'), listenSites: listen ? listen.split(',') : null, screens: Number(opt('screens', '1')), google: !flag('no-google'), log});
      const w = await T.writeTrends(t, {out: opt('out', 'out'), log});
      log('');
      if (t.trendingNow?.length) log(`  trending now  ${t.trendingNow.slice(0, 6).map((x) => x.title).join(', ')}`);
      for (const [q, s] of Object.entries(t.suggest)) log(`  "${q}"  ${[...s.naver.slice(0, 3), ...s.youtube.slice(0, 3)].join(', ')}`);
      for (const a of Object.values(t.wiki)) log(`  wikipedia     ${a.title} (${a.lang}) last month ${a.views.slice(-1)[0]?.views ?? '-'} views`);
      for (const n of t.notes) log(dimmed('  note  ' + n));
      log('');
      log(`  trends   ${path.join(w.dir, 'trends.html')}`);
      log(`  notes    ${path.join(w.dir, 'trends.md')}   (ideas.md for your agent)`);
      for (const f of w.png) log(`  chart    ${f}`);
      openFile(path.join(w.dir, 'trends.html'));
      return;
    }
    case 'plan': {
      hello();
      const runDir = latestRun(pos[1]);
      const P = await import('../lib/plan.mjs');
      const f = path.join(runDir, 'plan.md');
      if (flag('score') || (fs.existsSync(f) && !flag('new'))) {
        if (!fs.existsSync(f)) throw new Error('No plan.md yet. Run: plan <run> first.');
        const r = P.scorePlan(runDir);
        for (const [g, rows] of Object.entries(r.groups)) {
          log(`  ${gold(g)}`);
          for (const x of rows.slice(0, 6)) log(`  ${String(x.score).padStart(3)}  ${x.line}  ${dimmed(x.why.join(', '))}`);
        }
        log(`\n  scores   ${path.join(runDir, 'plan-scores.md')}`);
        return;
      }
      const {loadConfig} = await import('../lib/config.mjs');
      const {readBrief} = await import('../lib/brief.mjs');
      const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
      const brief = readBrief(runDir);
      if (!brief) log(dimmed(`  No editorial brief yet (who reads it, what for, next action). Better first: brief ${show(runDir)}`));
      fs.writeFileSync(f, P.planTemplate({title: run.title, keys: run.platforms, platforms: loadConfig(path.dirname(runDir)).platforms, brief}));
      log(`  plan     ${f}\n  Fill titles and first lines (or let your agent), then: plan ${show(runDir)} --score`);
      return;
    }
    case 'engines': {
      hello();
      const {engineTable} = await import('../lib/engines.mjs');
      log('  Our other AI employees the writer works with (optional, never installed for you):\n');
      for (const e of engineTable()) log(`  ${e.found ? gold('found ') : dimmed('  -   ')} ${e.pkg.padEnd(26)} ${e.what}${e.found ? dimmed('  ' + e.found.where) : dimmed('  get it: ' + e.get)}`);
      log(dimmed('\n  A kit folder of your own works too: CAIW_MOTION_KIT=/path/to/connect-ai-motion (and CAIW_VIDEO_MOTION_KIT, CAIW_PRODUCT_PHOTO_KIT, CAIW_MARKETER_KIT).'));
      return;
    }
    case 'motion': {
      hello();
      const runDir = latestRun(pos[1]);
      const E = await import('../lib/engines.mjs');
      const {loadConfig} = await import('../lib/config.mjs');
      const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
      const key = opt('from', run.platforms[0]);
      const cfg = loadConfig(path.dirname(runDir));
      const src = JSON.parse(fs.readFileSync(path.join(runDir, 'source', 'source.json'), 'utf8'));
      const m = E.motionProject(runDir, key, {platform: cfg.platforms[key], source: src});
      log(`  script   ${m.script}  (${m.lines.length} beats from your ${cfg.platforms[key].name} post; change it, one line = one scene)`);
      for (const l of m.lines) log(dimmed('    ' + l));
      if (m.bad.length) { for (const b of m.bad) log(`  FIX the number ${b.num} in "${b.line}" is not in your source.`); process.exitCode = 2; return; }
      const eng = E.findEngine('motion');
      if (!eng) { log(`\n  connect-ai-motion is not on this computer. Get it: ${E.ENGINES[0].get}  (${E.ENGINES[0].repo})\n  Then run this again. Nothing else was done.`); return; }
      const short = !flag('wide');
      log(`\n  connect-ai-motion ${dimmed(eng.where)}`);
      if (!fs.existsSync(path.join(m.dir, 'storyboard.json')) || flag('redraft')) {
        const d = await E.runEngine(eng, ['draft', m.script, m.dir], {cwd: m.dir, log});
        if (d.code) { log(`  draft stopped: ${d.out.split('\n').slice(-4).join(' ')}`); process.exitCode = 1; return; }
      } else log(dimmed('    keeping your storyboard.json (--redraft makes a new one from script.md)'));
      for (const mv of E.keepExactNumbers(path.join(m.dir, 'storyboard.json'))) log(`    ${mv.id}: ${mv.value} moved from ${mv.from} to ${mv.to} (that scene would round it)`);
      const c = await E.runEngine(eng, ['check', m.dir, ...(short ? ['--short'] : [])], {cwd: m.dir, log});
      if (!flag('render')) { log(`\n  storyboard ${path.join(m.dir, 'storyboard.json')}\n  Next: motion ${show(runDir)} --from ${key} --render   (renders ${short ? '16:9 and 9:16' : '16:9'}; it takes a few minutes)`); return; }
      const r = await E.runEngine(eng, ['run', m.dir, ...(short ? ['--short'] : [])], {cwd: m.dir, log, env: {CONNECT_AI_MOTION_CONCURRENCY: process.env.CONNECT_AI_MOTION_CONCURRENCY || '2'}});
      const sbTime = fs.statSync(path.join(m.dir, 'storyboard.json')).mtimeMs;
      const films = E.motionFilms(runDir, key).filter((f) => fs.statSync(f.file).mtimeMs >= sbTime);
      for (const f of films) log(`  video    ${f.file}  (${f.ratio})`);
      log(films.length ? dimmed(`  build ${show(runDir)} puts the video in the preview and in handoff/ for the marketer.`) : `  render stopped: ${r.out.split('\n').slice(-5).join(' ')}`);
      if (!films.length) process.exitCode = 1;
      return;
    }
    case 'story': {
      hello();
      const S = await import('../lib/story.mjs');
      const idea = pos.slice(1).join(' ');
      const r = S.startStory({idea, age: Number(opt('age', '6')), pages: opt('pages'), lang: opt('lang', 'ko'), out: opt('out', 'out'), title: opt('title')});
      log(`  story    ${r.file}`);
      log(`  brief    ${path.join(r.dir, 'brief.md')}`);
      log(`  Next: your agent writes story.md page by page (one [scene: ...] line each), then  npx ${KIT_NAME} build ${show(r.dir)}`);
      return;
    }
    case 'humanize': {
      hello();
      const file = pos[1];
      if (!file) throw new Error('Give a text file: humanize draft.md   (or a run\'s post.md)');
      const H = await import('../lib/humanize.mjs');
      const text = fs.readFileSync(path.resolve(file), 'utf8');
      let never = [], own = '';
      if (opt('voice')) { const v = fs.readFileSync(path.resolve(opt('voice')), 'utf8'); const m = v.match(/<!--\s*never:\s*([\s\S]*?)-->/); never = m ? m[1].split(',').map((x) => x.trim()) : []; own = v.replace(/<!--[\s\S]*?-->/g, ''); }
      const patterns = H.loadPatterns(path.dirname(path.resolve(file)));
      const result = H.analyze(text, {patterns, never, own});
      let cmp = null, afterText = null;
      if (opt('after')) { afterText = fs.readFileSync(path.resolve(opt('after')), 'utf8'); cmp = H.compare(text, afterText, {patterns, never, own}); }
      for (const l of H.reportLines(result).slice(0, 24)) log('  ' + l);
      log('');
      log(`  score    ${result.score} per 1,000 letters (${result.grade})${cmp ? `  ->  after ${cmp.after.score} (${cmp.after.grade})` : ''}`);
      if (cmp) log(cmp.kept ? `  facts    ${gold('kept')}: every number, quote and name is still there, nothing new added` : `  facts    CHANGED: ${cmp.lost.map((l) => l.kind + ' ' + l.value).join(', ')}`);
      const out = path.resolve(opt('out', path.join(path.dirname(path.resolve(file)), path.basename(file).replace(/\.[^.]+$/, '') + '.humanize.html')));
      fs.writeFileSync(out, H.humanizeHtml({file, text, result, afterText, cmp}));
      log(`  report   ${out}`);
      if (cmp && !cmp.kept) process.exitCode = 2;
      return;
    }
    case 'voice': {
      hello();
      const files = pos.slice(1);
      if (!files.length) throw new Error('Give your own transcripts: npx connect-ai-writer voice live1.srt lecture2.srt --out voice.md');
      const {loadConfig} = await import('../lib/config.mjs');
      const {buildVoice} = await import('../lib/voice.mjs');
      const {analysis, markdown} = buildVoice(files, {banned: loadConfig(process.cwd()).banned, name: opt('name', 'you')});
      const out = path.resolve(opt('out', 'voice.md'));
      fs.writeFileSync(out, markdown);
      log(`  ${analysis.lines} lines, ${analysis.sentences} sentences from ${files.length} file(s)`);
      log(`  endings  ${analysis.ends.slice(0, 5).map(([e, n]) => `${e.split(' ')[0]} ${n}`).join(', ')}`);
      log(`  voice    ${out}`);
      if (analysis.thin) log(`  LOOK only ${analysis.lines} lines: a try-out sheet. Give a few of your own lives or lectures for a real one.`);
      log(dimmed('  Give it to start with --voice. Your transcripts stay on your computer.'));
      return;
    }
    case 'post': {
      hello();
      const {post, EXIT} = await import('../lib/post.mjs');
      const runDir = latestRun(pos[1]);
      const to = opt('to');
      if (!to) throw new Error('Say where: --to threads (or x, naver)');
      const r = await post(runDir, to, {publish: flag('publish'), saveDraft: !flag('no-save'), leaveOpen: flag('leave-open'), blogId: opt('blog-id'), draftsShot: flag('drafts-shot'), log});
      const said = {
        'logged-out': `You are not logged in to ${to} in Ego Lite. Open Ego Lite, log in yourself, then run this again. Nothing was typed.`,
        'no-composer': `Could not find the post box on ${to} (the page may have changed). Nothing was typed.`,
        'needs-you': `Waiting for you: ${r.error || 'a choice in the editor'}`,
        'saved-as-draft': `Filled and saved as a draft in ${to}. Nothing was posted. Open your drafts there to look and post it yourself.`,
        'filled-draft-not-saved': `Filled, but ${to} did not offer to save a draft. Nothing was posted.${r.leftOpen ? ' The editor is still open in Ego Lite.' : ' Use --leave-open to keep the filled editor open for you.'}`,
        'filled-stopped-before-post': `Filled and stopped before the post button. Nothing was posted.${r.leftOpen ? ' The editor is open in Ego Lite for you.' : ''}`,
        published: `Published on ${to}.${r.url ? ' ' + r.url : ''}`,
        'publish-not-confirmed': `Pressed publish on ${to}, but could not confirm it went out. Check ${to} yourself before running it again (it may already be posted).`,
        'no-publish-button': `Filled, but could not find the publish button on ${to}. Nothing was posted.`,
        error: `Stopped: ${r.error}`,
      }[r.status] || `Result: ${r.status}`;
      log(`  ${said}`);
      if (r.parts) for (const p of r.parts) log(dimmed(`  post ${p.part}: text ${p.typed === false ? 'NOT confirmed' : 'in'}${p.picturesInBox != null ? `, pictures in the box ${p.picturesInBox}` : ''}`));
      if (r.shot) log(`  screenshot ${q(r.shot)}`);
      if (r.notice) log(dimmed('  Ego Lite says an update is available (ego-browser upgrade, when you want).'));
      if (EXIT[r.status]) process.exitCode = EXIT[r.status];
      return;
    }
    case 'platforms': {
      const {loadConfig} = await import('../lib/config.mjs');
      const {platforms, files} = loadConfig(process.cwd());
      log(`  from ${files.platforms}\n`);
      for (const [k, p] of Object.entries(platforms)) log(`  ${k.padEnd(10)} ${p.kind.padEnd(9)} ${String(p.maxChars).padStart(5)} ${p.count === 'x-weighted' ? 'weighted' : 'chars   '}  ${String(p.maxImages).padStart(2)} pictures  ${p.image.w}x${p.image.h}  ${p.post === 'ego' ? 'post: Ego Lite' : 'hand-off'}${p.verified ? '' : dimmed('  limits: check again')}${p.optional ? dimmed('  optional') : ''}`);
      return;
    }
    case 'themes': {
      for (const f of fs.readdirSync(path.join(KIT, 'themes'))) { const t = JSON.parse(fs.readFileSync(path.join(KIT, 'themes', f), 'utf8')); log(`  ${f.replace('.json', '').padEnd(10)} ${t.name}  bg ${t.bg}  accent ${t.accent}`); }
      log(dimmed('  Your own: copy one to theme.json in your project folder and change colors, fonts and brand.'));
      return;
    }
    case 'doctor': {
      hello();
      const {doctor} = await import('../lib/doctor.mjs');
      const {loadConfig} = await import('../lib/config.mjs');
      const cfg = loadConfig(process.cwd());
      await doctor({settings: cfg.settings, files: cfg.files});
      return;
    }
    case 'install-skill': {
      hello();
      const {installSkill} = await import('../lib/install.mjs');
      const list = installSkill({agent: opt('agent', 'all'), dir: opt('dir'), project: flag('project'), dryRun: flag('dry-run'), runtime: !flag('no-runtime')});
      if (!flag('dry-run') && !list.some((t) => t.done)) { log('  Nothing was installed.'); process.exitCode = 1; return; }
      if (list.some((t) => t.done)) log(`\n  Open your agent in the folder with your video or transcript and say: "${gold('write a Threads post and a Naver blog post from this video')}"` + dimmed('\n  영상이 있는 폴더에서 에이전트를 열고 "이 영상으로 쓰레드랑 네이버 블로그 글 써 줘" 라고 말해 보세요'));
      return;
    }
    case 'remove-skill': {
      const {removeSkill} = await import('../lib/install.mjs');
      removeSkill({agent: opt('agent', 'all'), dir: opt('dir'), project: flag('project'), dryRun: flag('dry-run')});
      return;
    }
    default:
      log(`  unknown command "${cmd}".`);
      log(HELP);
      process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`\n  ${e.message}`);
  if (process.env.DEBUG) console.error(e.stack);
  process.exitCode = 1;
});
