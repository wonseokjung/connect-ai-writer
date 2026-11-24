// post: put a checked draft into the platform's editor in Ego Lite, with your logins, and STOP before the publish button.
// Default: fill, take a screenshot, save it as a draft where the platform has drafts, close our own space.
// --publish clicks the publish button, and only after you type the platform name in the terminal yourself.
// It never logs in and never types a password or a code. Logged out? It tells you and stops.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {wrap, run} from './ego.mjs';

export const POSTABLE = ['threads', 'x', 'naver'];
export const TESTED = {threads: 'tested on a live account (draft only)', x: 'not tested on a live account yet', naver: 'not tested on a live account yet'};

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

// Naver SmartEditor ONE: title, then text and pictures in order (pictures through the editor's own photo button), then 저장 (save draft).
const NAVER = `
if (!P.blogId) { done({status: 'error', error: 'Naver needs your blog id: --blog-id <id> (the part after blog.naver.com/)'}); }
else {
  await page.goto('https://blog.naver.com/' + P.blogId + '/postwrite', {timeout: 60000});
  await W(6000);
  if (/nid\\.naver\\.com/.test(await page.url())) { done({status: 'logged-out', url: await page.url()}); }
  else {
    const frame = await page.evaluate(() => !!document.querySelector('iframe#mainFrame'));
    if (frame) { const src = await page.evaluate(() => document.querySelector('iframe#mainFrame').src); await page.goto(src, {timeout: 60000}); await W(5000); }
    await page.evaluate(() => { const b = document.querySelector('.se-popup-button-cancel, .se-help-panel-close-button'); if (b) b.click(); });
    await W(800);
    await page.click('.se-documentTitle .se-text-paragraph, .se-title-text', {label: 'click the title'});
    await page.keyboard.insertText(P.title);
    await page.click('.se-component.se-text .se-text-paragraph, .se-section-text .se-text-paragraph', {label: 'click the body'});
    for (const b of P.blocks) {
      if (b.type === 'text') { await page.keyboard.insertText(b.text); await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); }
      else if (b.type === 'h2') { await page.keyboard.insertText(b.text); await page.keyboard.press('Enter'); }
      else if (b.type === 'image') {
        const chooser = page.waitForFileChooser({timeout: 10000});
        await page.click('.se-image-toolbar-button, button[data-name="image"]', {label: 'add a picture'});
        const c = await chooser; await c.setFiles(b.file); await W(3500);
        await page.keyboard.press('ArrowDown'); await page.keyboard.press('End'); await page.keyboard.press('Enter');
      }
    }
    if (P.tags && P.tags.length) say('tags to add in the publish panel:', P.tags.join(', '));
    const shot = await page.screenshot({path: P.shot});
    if (P.publish) { done({status: 'error', error: 'Publishing on Naver goes through its publish panel (tags, category). Do that step yourself; the draft is saved.'}); }
    else if (P.saveDraft) {
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^저장/.test(x.innerText.trim())); if (b) b.setAttribute('data-caiw', 'save'); });
      const ok = await page.evaluate(() => !!document.querySelector('[data-caiw="save"]'));
      if (ok) { await page.click('[data-caiw="save"]', {label: 'save as draft (저장)'}); await W(2500); }
      done({status: ok ? 'saved-as-draft' : 'filled-draft-not-saved', screenshot: shot});
    } else done({status: 'filled-stopped-before-post', screenshot: shot});
  }
}
`;

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
  const params = {space: `connect-ai-writer ${key} ${path.basename(runDir)} ${Date.now().toString(36)}`, publish, saveDraft, leaveOpen, shot, parts: data.parts.map((p) => ({text: p.text, images: p.images.map(abs)}))};
  if (key === 'naver') {
    const md = fs.readFileSync(path.join(dir, 'post.md'), 'utf8');
    const {parsePost} = await import('./postfile.mjs');
    const parsed = parsePost(md, {kind: 'article'});
    const files = data.parts.flatMap((p) => p.images.map(abs));
    let ii = 0;
    params.blogId = blogId;
    params.title = data.title;
    params.tags = data.tags;
    params.blocks = parsed.parts.flatMap((p) => p.blocks).map((b) => (b.type === 'image' ? {type: 'image', file: files[ii++]} : {type: b.type, text: b.text})).filter((b) => b.type !== 'image' || b.file);
  }
  const body = {threads: THREADS, x: X, naver: NAVER}[key];
  log(`  Ego Lite: a new task space of our own for ${key} (${TESTED[key]})`);
  const r = await run(wrap(body, params), {log, timeoutMs: 300000});
  return {...r, shot: r.screenshot || (fs.existsSync(shot) ? shot : null)};
}
