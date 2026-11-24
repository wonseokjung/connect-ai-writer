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
const VALUE_FLAGS = ['for', 'voice', 'srt', 'video', 'out', 'title', 'slug', 'theme', 'only', 'to', 'name', 'blog-id', 'frames', 'writer', 'agent', 'dir'];
const flag = (n) => argv.includes('--' + n);
const opt = (n, d = null) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && VALUE_FLAGS.includes(argv[i - 1].slice(2))));
const cmd = flag('help') || argv.includes('-h') ? 'help' : flag('version') || argv.includes('-v') ? 'version' : pos[0] || 'help';
const log = (...a) => console.log(...a);
const show = (f) => { const r = path.relative(process.cwd(), f); return r.startsWith('..') ? f : r; };

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
  log(`  preview  ${path.join(r.runDir, 'index.html')}`);
  if (r.sheet) log(`  sheet    ${r.sheet}`);
  log(`  hand-off ${path.join(r.runDir, 'handoff')}   (for connect-ai-marketer; nothing is posted)`);
  log(fails.length ? dimmed('  고칠 게 남아 있어요. 위에 FIX 줄을 고치고 build 를 한 번 더 돌려 주세요.') : dimmed('  다 됐어요. 미리보기를 한번 보세요. 올리는 건 직접 확인하신 다음에만 해요.'));
}

const HELP = `
  npx ${KIT_NAME} demo                       try it on the example notes (no video, no AI, no account)
  npx ${KIT_NAME} start <source> --for threads,naver,x
                                             read your source, make out/<date>_<name>/ with a brief and one post.md per platform
  npx ${KIT_NAME} build [run]                post.md -> pictures, check, preview.html, post.txt (latest run if no folder)
  npx ${KIT_NAME} check [run]                only the text checks, fast
  npx ${KIT_NAME} post [run] --to threads    put the draft in the editor in Ego Lite and stop before the post button
  npx ${KIT_NAME} voice <your transcripts...> --out voice.md   a voice sheet from your own words
  npx ${KIT_NAME} install-skill              add the agent skill (Claude Code, Codex, Antigravity, Cursor)
  npx ${KIT_NAME} platforms | themes | doctor

  sources   a video (its .srt next to it, or --srt), .srt / .vtt / .txt / .md, a YouTube link (needs yt-dlp), or your own page's link
  start     --for threads,naver,x,linkedin,instagram,tistory,brunch | all     --voice voice.md     --video my.mp4 (frames for a transcript)
            --title "..."  --out out  --frames 16 (sharp frames to choose from, 0 = none)  --download-video (YouTube, for frames)
  write     [run] --writer "claude -p"       optional: a headless agent writes every post.md (normally your agent in chat does)
  build     --theme default|paper|my-theme.json   --only threads,x
  post      --to threads|x|naver  --blog-id <naver id>  --leave-open (keep the filled editor open for you)
            --no-save (do not press the draft save)  --publish (asks you to type the platform name first)
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
      const s = await start({inputs: [path.join(dir, 'source', 'notes.md')], out: path.join(dir, 'out'), want: 'threads,naver,x,linkedin,instagram', slug: 'demo', frames: 0, log});
      for (const k of s.keys) {
        const ex = path.join(KIT, 'examples', 'posts', `${k}.md`);
        if (fs.existsSync(ex)) fs.copyFileSync(ex, path.join(s.runDir, k, 'post.md'));
      }
      log(`  demo: example notes -> ${s.keys.join(', ')}  (the posts were written from the notes in advance; with your agent they are written for you)`);
      const r = await build(s.runDir, {log});
      summary(r);
      openFile(path.join(r.runDir, 'index.html'));
      log('');
      log(`  Next: npx ${KIT_NAME} start <your video or transcript> --for threads,naver,x   then let your agent write (install-skill)`);
      return;
    }
    case 'start': {
      hello();
      const inputs = pos.slice(1);
      if (!inputs.length) throw new Error('Give a source: a video, .srt, .txt / .md notes, a YouTube link or your page link.');
      const {start} = await import('../lib/run.mjs');
      const s = await start({inputs, out: opt('out', 'out'), want: opt('for', 'threads,naver,x'), voice: opt('voice'), srt: opt('srt'), video: opt('video'), title: opt('title'), slug: opt('slug'), frames: Number(opt('frames', '16')), downloadVideo: flag('download-video'), log});
      log(`  source   ${s.src.kind}, ${s.src.lines.length} lines${s.src.video ? ', video ' + path.basename(s.src.video) : ''}`);
      log(`  run      ${s.runDir}`);
      log(`  brief    ${path.join(s.runDir, 'brief.md')}`);
      if (s.frameList.length) log(`  frames   ${path.join(s.runDir, 'source', 'frames.jpg')}   (${s.frameList.length} sharp frames with their times)`);
      for (const k of s.keys) log(`  write    ${path.join(s.runDir, k, 'post.md')}`);
      log('');
      log(`  Next: your agent writes each post.md from the brief (or: npx ${KIT_NAME} write --writer "claude -p"), then  npx ${KIT_NAME} build ${path.relative(process.cwd(), s.runDir)}`);
      return;
    }
    case 'write': {
      hello();
      const runDir = latestRun(pos[1]);
      const {loadConfig} = await import('../lib/config.mjs');
      const command = opt('writer') || loadConfig(path.dirname(runDir)).settings.writer?.command;
      if (!command) throw new Error('No writer command. Use --writer "claude -p" (or "codex exec"), or let your agent in chat write the post.md files from brief.md.');
      const {writeWithCommand} = await import('../lib/writer.mjs');
      const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
      const wrote = writeWithCommand(runDir, run.platforms, command, {overwrite: flag('overwrite'), log});
      log(`  wrote ${wrote.join(', ') || 'nothing new'}. Next: npx ${KIT_NAME} build ${path.relative(process.cwd(), runDir)}`);
      return;
    }
    case 'build': {
      hello();
      const {build} = await import('../lib/run.mjs');
      const r = await build(latestRun(pos[1]), {theme: opt('theme'), only: opt('only'), log});
      summary(r);
      openFile(path.join(r.runDir, 'index.html'));
      if (r.findings.some((f) => f.level === 'fail')) process.exitCode = 2;
      return;
    }
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
      if (all.some((f) => f.level === 'fail')) process.exitCode = 2;
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
      log(dimmed('  Give it to start with --voice. Your transcripts stay on your computer.'));
      return;
    }
    case 'post': {
      hello();
      const runDir = latestRun(pos[1]);
      const to = opt('to');
      if (!to) throw new Error('Say where: --to threads (or x, naver)');
      const {post, confirmPublish} = await import('../lib/post.mjs');
      let publish = false;
      if (flag('publish')) {
        publish = await confirmPublish(to);
        if (!publish) { log('  Stopped. Nothing was posted.'); return; }
      }
      const r = await post(runDir, to, {publish, saveDraft: !flag('no-save'), leaveOpen: flag('leave-open'), blogId: opt('blog-id'), log});
      const said = {
        'logged-out': `You are not logged in to ${to} in Ego Lite. Open Ego Lite, log in yourself, then run this again. Nothing was typed.`,
        'saved-as-draft': `Filled and saved as a draft in ${to}. Nothing was posted. Open your drafts there to look and post it yourself.`,
        'filled-draft-not-saved': `Filled, but ${to} did not offer to save a draft. Nothing was posted.${r.leftOpen ? ' The editor is still open in Ego Lite.' : ' Use --leave-open to keep the filled editor open for you.'}`,
        'filled-stopped-before-post': `Filled and stopped before the post button. Nothing was posted.${r.leftOpen ? ' The editor is open in Ego Lite for you.' : ''}`,
        published: `Published to ${to}.`,
        error: `Stopped: ${r.error}`,
      }[r.status] || `Result: ${r.status}`;
      log(`  ${said}`);
      if (r.parts) for (const p of r.parts) log(dimmed(`  post ${p.part}: text ${p.typed === false ? 'NOT confirmed' : 'in'}${p.picturesInBox != null ? `, pictures in the box ${p.picturesInBox}` : ''}`));
      if (r.shot) log(`  screenshot ${r.shot}`);
      if (r.notice) log(dimmed('  Ego Lite says an update is available (ego-browser upgrade, when you want).'));
      if (r.status === 'error') process.exitCode = 1;
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
      await doctor({settings: loadConfig(process.cwd()).settings});
      return;
    }
    case 'install-skill': {
      hello();
      const {installSkill} = await import('../lib/install.mjs');
      const list = installSkill({agent: opt('agent', 'all'), dir: opt('dir'), project: flag('project'), dryRun: flag('dry-run')});
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
