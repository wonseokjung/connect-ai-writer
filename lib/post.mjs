import {citeMarks} from './postfile.mjs';
// post: put a checked draft into the platform's editor in Ego Lite, with your logins, and STOP before the publish button.
// Default: fill, take a screenshot, save it as a draft where the platform has drafts, close our own space.
// --publish clicks the publish button, and only after you type the platform name in the terminal yourself.
// It never logs in and never types a password or a code. Logged out? It tells you and stops.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {wrap, run} from './ego.mjs';

export const POSTABLE = ['threads', 'x', 'naver'];
export const TESTED = {threads: 'tested on a live account (draft only)', x: 'not tested on a live account yet', naver: 'tested on a live account (draft only)'};

const THREADS = `
await page.goto('https://www.threads.com/', {timeout: 45000});
await W(4000);
const opener = await page.evaluate(() => {
  const el = document.querySelector('[role=button][aria-label^="Empty text field"], [role=button][aria-label*="compose"], [role=button][aria-label*="새 게시물"], [role=button][aria-label*="작성"]');
  if (el) { el.setAttribute('data-caiw', 'open'); return true; }
  return false;
});
if (!opener) {
  const loginLink = await page.evaluate(() => !!document.querySelector('a[href*="/login"]') || /log in|로그인/i.test(document.body.innerText.slice(0, 3000)));
  done({status: loginLink ? 'logged-out' : 'no-composer', url: await page.url()});
} else {
  await page.click('[data-caiw="open"]', {label: 'open the new post box'});
  await page.waitForSelector('[role=dialog] [contenteditable=true][role=textbox]', {timeout: 15000});
  const parts = [];
  for (let i = 0; i < P.parts.length; i++) {
    const part = P.parts[i];
    if (i > 0) {
      const before = await page.evaluate(() => document.querySelectorAll('[role=dialog] [contenteditable=true][role=textbox]').length);
      await page.evaluate(() => { const b = [...document.querySelectorAll('[role=dialog] [role=button], [role=dialog] button')].find((x) => /^(Add to thread|스레드에 추가)$/i.test(x.innerText.trim())); if (b) b.setAttribute('data-caiw', 'add'); });
      await page.click('[data-caiw="add"]', {label: 'add the next post'});
      await page.waitForFunction((n) => document.querySelectorAll('[role=dialog] [contenteditable=true][role=textbox]').length > n, before, {timeout: 8000});
      await page.evaluate(() => document.querySelector('[data-caiw="add"]')?.removeAttribute('data-caiw'));
    }
    await page.evaluate((k) => { document.querySelectorAll('[data-caiw="box"]').forEach((x) => x.removeAttribute('data-caiw')); document.querySelectorAll('[role=dialog] [contenteditable=true][role=textbox]')[k].setAttribute('data-caiw', 'box'); }, i);
    await page.click('[data-caiw="box"]', {label: 'type post ' + (i + 1)});
    await page.keyboard.insertText(part.text);
    await W(700);
    // a #tag at the end opens Threads' topic list; leave it as typed text and close the list
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    if (part.images.length) {
      const inputs = await page.evaluate(() => document.querySelectorAll('[role=dialog] input[type=file]').length);
      await page.evaluate((k) => { document.querySelectorAll('[data-caiw="file"]').forEach((x) => x.removeAttribute('data-caiw')); const all = document.querySelectorAll('[role=dialog] input[type=file]'); all[Math.min(k, all.length - 1)].setAttribute('data-caiw', 'file'); }, i);
      await page.setInputFiles('[data-caiw="file"]', part.images);
      await W(2500 + 600 * part.images.length);
      say('post', i + 1, 'pictures', part.images.length, 'file inputs', inputs);
    }
    const typed = await page.evaluate((k) => (document.querySelectorAll('[role=dialog] [contenteditable=true][role=textbox]')[k]?.innerText || ''), i);
    const imgs = await page.evaluate(() => document.querySelectorAll('[role=dialog] img[src^="blob:"], [role=dialog] img[src^="data:"]').length);
    parts.push({part: i + 1, typed: typed.replace(/\\s+/g, '').includes(part.text.replace(/\\s+/g, '').slice(0, 30)), picturesInBox: imgs});
  }
  await W(1500);
  const shot = await page.screenshot({path: P.shot});
  say('screenshot', shot);
  if (P.publish) {
    await page.evaluate(() => { const b = [...document.querySelectorAll('[role=dialog] [role=button], [role=dialog] button')].filter((x) => /^(Post|게시)$/i.test(x.innerText.trim())).pop(); if (b) b.setAttribute('data-caiw', 'publish'); });
    await page.click('[data-caiw="publish"]', {label: 'publish the thread'});
    await W(6000);
    done({status: 'published', parts, screenshot: shot});
  } else if (P.saveDraft) {
    await page.evaluate(() => { const b = [...document.querySelectorAll('[role=dialog] [role=button], [role=dialog] button')].find((x) => /^(Cancel|취소)$/i.test(x.innerText.trim())); if (b) b.setAttribute('data-caiw', 'cancel'); });
    await page.click('[data-caiw="cancel"]', {label: 'close the box to save a draft'});
    await W(1500);
    const asked = await page.evaluate(() => { const b = [...document.querySelectorAll('[role=dialog] [role=button], [role=dialog] button, [role=alertdialog] button')].find((x) => /^(Save|저장)$/i.test(x.innerText.trim())); if (b) { b.setAttribute('data-caiw', 'save'); return true; } return false; });
    if (asked) { await page.click('[data-caiw="save"]', {label: 'save as draft'}); await W(2000); }
    done({status: asked ? 'saved-as-draft' : 'filled-draft-not-saved', parts, screenshot: shot});
  } else done({status: 'filled-stopped-before-post', parts, screenshot: shot});
}
`;

const X = `
await page.goto('https://x.com/compose/post', {timeout: 45000});
await W(4500);
const box0 = await page.evaluate(() => !!document.querySelector('[data-testid="tweetTextarea_0"]'));
if (!box0) {
  done({status: /login|flow/.test(await page.url()) ? 'logged-out' : 'no-composer', url: await page.url()});
} else {
  const parts = [];
  for (let i = 0; i < P.parts.length; i++) {
    const part = P.parts[i];
    if (i > 0) { await page.click('[data-testid="addButton"]', {label: 'add the next post'}); await page.waitForSelector('[data-testid="tweetTextarea_' + i + '"]', {timeout: 8000}); }
    await page.click('[data-testid="tweetTextarea_' + i + '"]', {label: 'type post ' + (i + 1)});
    await page.keyboard.insertText(part.text);
    await W(600);
    if (part.images.length) { await page.setInputFiles('[data-testid="fileInput"]', part.images.slice(0, 4)); await W(2500 + 700 * part.images.length); }
    parts.push({part: i + 1});
  }
  const shot = await page.screenshot({path: P.shot});
  if (P.publish) { await page.click('[data-testid="tweetButton"]', {label: 'publish the post'}); await W(6000); done({status: 'published', parts, screenshot: shot}); }
  else if (P.saveDraft) {
    await page.click('[data-testid="app-bar-close"]', {label: 'close to save a draft'}); await W(1500);
    const asked = await page.evaluate(() => !!document.querySelector('[data-testid="confirmationSheetConfirm"]'));
    if (asked) { await page.click('[data-testid="confirmationSheetConfirm"]', {label: 'save as draft'}); await W(1500); }
    done({status: asked ? 'saved-as-draft' : 'filled-draft-not-saved', parts, screenshot: shot});
  } else done({status: 'filled-stopped-before-post', parts, screenshot: shot});
}
`;

// Naver SmartEditor ONE (checked on a live account 2026-11-24, draft only):
// title, then the body in order: text, 소제목 (the editor's own paragraph style), pictures through the editor's own 사진 button,
// tags as #tags on the last line, then 저장 (the draft button) and STOP. It never clicks 발행.
// If Naver offers to restore an older unfinished post, it stops and leaves that choice to you (nothing of yours is thrown away).
const NAVER = `
const start = P.blogId ? 'https://blog.naver.com/PostWriteForm.naver?blogId=' + encodeURIComponent(P.blogId) : 'https://blog.naver.com/GoBlogWrite.naver';
await page.goto(start, {timeout: 60000});
await W(5000);
const loggedOut = async () => /nid\\.naver\\.com|\\/login/.test(await page.url()) || await page.evaluate(() => !document.querySelector('iframe#mainFrame, .se-documentTitle') && /로그인|log in/i.test(document.body.innerText.slice(0, 2000)));
if (await loggedOut()) { done({status: 'logged-out', url: await page.url()}); }
else {
  const frame = await page.evaluate(() => document.querySelector('iframe#mainFrame')?.src || null);
  const editorUrl = frame || await page.url();
  const openEditor = async () => {
    await page.goto(editorUrl, {timeout: 60000});
    await page.waitForSelector('.se-documentTitle .se-text-paragraph', {timeout: 30000});
    await W(2500);
    return page.evaluate(() => { const p = document.querySelector('.se-popup-alert-confirm, .se-popup-alert'); return p && p.offsetParent ? p.innerText.trim().slice(0, 200) : null; });
  };
  let restore = await openEditor();
  // Naver offers to continue an unfinished post. We look at what it would bring back (확인 only opens it, it deletes nothing).
  // If it is this same post (same title, e.g. an earlier run of ours, already in your saved drafts), we start fresh with 취소.
  // Anything else is yours: we stop and leave that choice to you.
  if (restore && P.freshIfSameTitle !== false) {
    await page.click('.se-popup-button-confirm', {label: 'look at the unfinished post'});
    await W(3000);
    const was = await page.evaluate(() => document.querySelector('.se-documentTitle')?.innerText.trim() || '');
    say('Naver unfinished post:', was.slice(0, 60));
    if (was === String(P.title).trim()) {
      restore = await openEditor();
      if (restore) { await page.click('.se-popup-button-cancel', {label: 'start fresh (same post is saved)'}); await W(1500); restore = null; }
      const left = await page.evaluate(() => !document.querySelector('.se-documentTitle .se-is-empty') || document.querySelectorAll('.se-component.se-image').length > 0);
      if (left) restore = 'the editor did not open empty';
    } else restore = 'a different unfinished post: ' + was.slice(0, 60);
  }
  if (restore) { done({status: 'error', restorePopup: true, error: 'Naver asks whether to continue an unfinished post (' + restore.split('\\n')[0] + '). That choice is yours: open Ego Lite, pick 확인 or 취소 in the Naver editor yourself, then run this again. Nothing was typed.'}); }
  else {
    await page.evaluate(() => { const b = document.querySelector('.se-help-panel-close-button'); if (b && b.offsetParent) b.click(); });
    const fmt = async (kind) => {
      await page.click('button.se-text-format-toolbar-button', {label: 'open paragraph style'});
      await page.waitForSelector('.se-toolbar-option-text-format-' + kind + '-button', {timeout: 5000});
      await page.click('.se-toolbar-option-text-format-' + kind + '-button', {label: kind === 'text' ? 'body text style' : 'subheading style'});
      await W(250);
    };
    const lines = async (t) => { const ls = String(t).split('\\n'); for (let i = 0; i < ls.length; i++) { if (i) await page.keyboard.press('Enter'); if (ls[i]) await page.keyboard.insertText(ls[i]); } };
    const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
    await page.click('.se-documentTitle .se-text-paragraph', {label: 'click the title'});
    await page.keyboard.insertText(P.title);
    await page.click('.se-component.se-text .se-text-paragraph', {label: 'click the body'});
    let prev = null, pictures = 0, headings = 0;
    for (const b of P.blocks) {
      if (b.type === 'image') {
        const before = await count('.se-component.se-image');
        const chooser = page.waitForFileChooser({timeout: 15000});
        await page.click('button.se-image-toolbar-button', {label: 'add a picture'});
        const c = await chooser; await c.setFiles(b.file);
        await page.waitForFunction((n) => document.querySelectorAll('.se-component.se-image').length > n, before, {timeout: 40000});
        await W(1200);
        pictures++;
      } else if (b.type === 'h2') {
        if (prev === 'text') await page.keyboard.press('Enter');
        await fmt('sectionTitle');
        await page.keyboard.insertText(b.text);
        await page.keyboard.press('Enter');
        await fmt('text');
        headings++;
      } else {
        if (prev === 'text') { await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); }
        await lines(b.text);
      }
      prev = b.type;
    }
    if (P.tags && P.tags.length) {
      if (prev === 'text') { await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); }
      await page.keyboard.insertText(P.tags.map((t) => '#' + String(t).replace(/[^\\p{L}\\p{N}_]+/gu, '')).filter((t) => t.length > 1).join(' '));
    }
    await W(1500);
    const filled = await page.evaluate(() => ({pictures: document.querySelectorAll('.se-component.se-image').length, headings: document.querySelectorAll('.se-component.se-sectionTitle').length, title: document.querySelector('.se-documentTitle')?.innerText.trim() || '', order: [...document.querySelectorAll('.se-component')].map((e) => ({documentTitle: 'T', text: 't', sectionTitle: 'H', image: 'I'})[(e.className.match(/se-(documentTitle|text|sectionTitle|image)\\b/) || [])[1]] || '?').join(''), tagLine: /#\\S+ #\\S+/.test([...document.querySelectorAll('.se-component.se-text')].pop()?.innerText || '')}));
    await page.evaluate(() => { const s = document.querySelector('.se-documentTitle'); if (s) s.scrollIntoView({block: 'start'}); });
    await W(800);
    const shot = await page.screenshot({path: P.shot});
    say('screenshot', shot);
    const drafts = () => page.evaluate(() => Number((document.querySelector('button[aria-label^="임시저장된 글 보기"]')?.getAttribute('aria-label') || '').replace(/\\D+/g, '') || 0));
    if (P.publish) { done({status: 'error', error: 'Publishing on Naver goes through its own publish panel (category, tags). Do that step yourself in the editor; nothing was posted.', filled, screenshot: shot}); }
    else if (P.saveDraft) {
      const before = await drafts();
      const found = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^저장$/.test(x.innerText.trim()) || /save_btn/.test(x.className)); if (b) { b.setAttribute('data-caiw', 'save'); return true; } return false; });
      if (found) { await page.click('[data-caiw="save"]', {label: 'save as draft (저장)'}); await page.waitForFunction((n) => Number((document.querySelector('button[aria-label^="임시저장된 글 보기"]')?.getAttribute('aria-label') || '').replace(/\\D+/g, '') || 0) > n, before, {timeout: 15000}).catch(() => {}); }
      const after = await drafts();
      let list = null;
      if (found && P.listShot) {
        await page.click('button[aria-label^="임시저장된 글 보기"]', {label: 'open the saved drafts list'});
        await W(1500);
        list = await page.screenshot({path: P.listShot});
      }
      done({status: found && after > before ? 'saved-as-draft' : 'filled-draft-not-saved', filled, drafts: {before, after}, screenshot: shot, draftsList: list});
    } else done({status: 'filled-stopped-before-post', filled, screenshot: shot});
  }
}
`;

export const SCRIPTS = {threads: THREADS, x: X, naver: NAVER};

export async function confirmPublish(name) {
  if (!process.stdin.isTTY) throw new Error('--publish needs a person at the terminal to type the confirmation. Nothing was posted.');
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  const a = await rl.question(`\n  This will PUBLISH to ${name} for everyone to see. Type ${name.toUpperCase()} to go ahead, anything else to stop: `);
  rl.close();
  return a.trim() === name.toUpperCase();
}

export async function post(runDir, key, {publish = false, saveDraft = true, leaveOpen = false, blogId = null, log = console.log} = {}) {
  if (!POSTABLE.includes(key)) throw new Error(`post works for ${POSTABLE.join(', ')} in v0.1. For ${key}, open ${key}/preview.html and copy, or hand handoff/writer-package.json to connect-ai-marketer.`);
  runDir = path.resolve(runDir);
  const dir = path.join(runDir, key);
  const pj = path.join(dir, 'post.json');
  if (!fs.existsSync(pj)) throw new Error(`No ${key}/post.json. Run build first.`);
  const checkMd = fs.existsSync(path.join(dir, 'check.md')) ? fs.readFileSync(path.join(dir, 'check.md'), 'utf8') : '';
  if (/^FIX /m.test(checkMd)) throw new Error(`${key} still has things to fix (${key}/check.md). Fix them and run build again; post only takes a draft that passed.`);
  const data = JSON.parse(fs.readFileSync(pj, 'utf8'));
  const abs = (f) => path.join(dir, f);
  const shot = path.join(dir, `editor-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}.png`);
  const params = {listShot: key === 'naver' ? shot.replace(/\.png$/, '-drafts.png') : null, space: `connect-ai-writer ${key} ${path.basename(runDir)} ${Date.now().toString(36)}`, publish, saveDraft, leaveOpen, shot, parts: data.parts.map((p) => ({text: p.text, images: p.images.map(abs)}))};
  if (key === 'naver') {
    const md = fs.readFileSync(path.join(dir, 'post.md'), 'utf8');
    const {parsePost} = await import('./postfile.mjs');
    const parsed = parsePost(md, {kind: 'article'});
    const files = data.parts.flatMap((p) => p.images.map(abs));
    let ii = 0;
    params.blogId = blogId;
    params.title = data.title;
    params.tags = data.tags;
    params.blocks = parsed.parts.flatMap((p) => p.blocks).map((b) => (b.type === 'image' ? {type: 'image', file: files[ii++]} : {type: b.type, text: citeMarks(b.text)})).filter((b) => b.type !== 'image' || b.file);
  }
  const body = SCRIPTS[key];
  log(`  Ego Lite: a new task space of our own for ${key} (${TESTED[key]})`);
  const r = await run(wrap(body, params), {log, timeoutMs: 300000});
  return {...r, shot: r.screenshot || (fs.existsSync(shot) ? shot : null)};
}
