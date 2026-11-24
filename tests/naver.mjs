// Naver blog draft flow, fully mocked: no browser, no account, no network.
// 1) the Ego Lite script is driven by a fake SmartEditor page and must fill title, text, 소제목, pictures in order and #tags,
//    press 저장 (draft) and never anything that publishes; 2) logged out or an unfinished-post popup stops before typing;
// 3) post() builds the right blocks from a run folder and hands them to a fake `ego-browser` on PATH.
import fs from 'node:fs';
import path from 'node:path';

const MARK = '__CAIW_RESULT__';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// A pretend SmartEditor ONE. It answers the script's page.evaluate calls by what they look for.
function fakeEditor({loggedOut = false, popup = null, popupTitle = '', drafts = 2} = {}) {
  const log = [];
  let url = 'about:blank', images = 0, draftCount = drafts, finished = null, showing = false, cancelled = false, restored = '';
  const page = {
    goto: async (u) => { url = loggedOut ? 'https://nid.naver.com/nidlogin.login' : u; showing = !!popup && !cancelled; restored = ''; log.push(['goto', u]); },
    url: async () => url,
    waitForTimeout: async () => {},
    waitForSelector: async (s) => { log.push(['wait', s]); },
    screenshot: async ({path: p}) => { log.push(['shot', p]); return p; },
    click: async (s, o = {}) => {
      log.push(['click', s, o.label || '']);
      if (s === '[data-caiw="save"]') log.push(['saved']);
      if (s === '.se-popup-button-confirm') { showing = false; restored = popupTitle; }
      if (s === '.se-popup-button-cancel') { showing = false; cancelled = true; }
    },
    waitForFileChooser: async () => ({setFiles: async (f) => { log.push(['file', path.basename(f)]); images++; }}),
    waitForFunction: async (fn) => { const t = String(fn); if (t.includes('임시저장된 글 보기') && log.some((x) => x[0] === 'saved')) draftCount++; },
    keyboard: {
      insertText: async (t) => log.push(['type', t]),
      press: async (k) => log.push(['key', k]),
    },
    evaluate: async (fn) => {
      const t = String(fn);
      if (t.includes("'iframe#mainFrame, .se-documentTitle'")) return loggedOut;
      if (t.includes('iframe#mainFrame')) return null;
      if (t.includes('se-popup-alert')) return showing ? popup : null;
      if (t.includes('headings:')) return {pictures: images, headings: log.filter((x) => x[0] === 'click' && /sectionTitle/.test(x[1])).length, title: 'x', order: '', tagLine: true};
      if (t.includes('se-is-empty')) return false;
      if (t.includes("'.se-documentTitle')?.innerText.trim() || ''")) return restored;
      if (t.includes('se-help-panel-close-button') || t.includes('scrollIntoView')) return undefined;
      if (t.includes('querySelectorAll(s).length')) return images;
      if (t.includes('headings:')) return {pictures: images, headings: log.filter((x) => x[0] === 'click' && /sectionTitle/.test(x[1])).length, title: 'x'};
      if (t.includes('save_btn')) return true;
      if (t.includes('임시저장된 글 보기')) return draftCount;
      throw new Error('fake editor got an evaluate it does not know: ' + t.slice(0, 80));
    },
  };
  const taskSpace = async (name) => ({spaceId: 9001, name, page: () => page, finish: async (o) => { finished = o; }});
  return {page, taskSpace, log, get finished() { return finished; }, get drafts() { return draftCount; }};
}

async function drive(script, editor) {
  const out = [];
  const keep = console.log;
  console.log = (...a) => out.push(a.join(' '));
  try { await new AsyncFunction('taskSpace', script)(editor.taskSpace); } finally { console.log = keep; }
  const line = out.find((l) => l.startsWith(MARK));
  return JSON.parse(line.slice(MARK.length));
}

export async function naverTests({ok, assert, imp, tmp}) {
  const {SCRIPTS, post, TESTED} = await imp('lib/post.mjs');
  const {wrap} = await imp('lib/ego.mjs');
  const NAVER = SCRIPTS.naver;

  // the script itself: draft button only, never the publish button
  assert.ok(!/발행/.test(NAVER) && !/publish_btn|publishBtn/i.test(NAVER), 'the Naver script must not touch 발행');
  assert.match(NAVER, /data-caiw="save"/);
  assert.match(NAVER, /GoBlogWrite\.naver/);
  assert.match(NAVER, /nid\\\.naver\\\.com/);
  assert.match(TESTED.naver, /live account/);
  ok('naver: the Ego Lite script saves with 저장 and has no path to 발행');

  const blocks = [
    {type: 'image', file: '/run/naver/images/01_frame.jpg'},
    {type: 'text', text: '첫 문단 첫 줄\n첫 문단 둘째 줄'},
    {type: 'h2', text: '소제목 하나'},
    {type: 'text', text: '둘째 문단'},
    {type: 'image', file: '/run/naver/images/02_steps.png'},
    {type: 'text', text: '마지막 문단'},
  ];
  const params = {space: 'test', title: '제목이에요', blocks, tags: ['바이브코딩', 'connect-ai-video-motion', 'CONNECT AI LAB'], publish: false, saveDraft: true, shot: '/run/naver/editor.png', listShot: '/run/naver/editor-drafts.png', blogId: null};
  {
    const ed = fakeEditor();
    const r = await drive(wrap(NAVER, params), ed);
    assert.equal(r.status, 'saved-as-draft');
    assert.deepEqual(r.drafts, {before: 2, after: 3});
    assert.deepEqual(ed.finished, {keep: []});
    const steps = ed.log.filter((x) => ['type', 'file', 'saved'].includes(x[0]) || (x[0] === 'click' && /sectionTitle-button|text-button/.test(x[1])))
      .map((x) => (x[0] === 'click' ? (/sectionTitle/.test(x[1]) ? 'H2-STYLE' : 'TEXT-STYLE') : x[0] === 'saved' ? 'SAVE' : x[0] + ':' + x[1]));
    assert.deepEqual(steps, [
      'type:제목이에요',
      'file:01_frame.jpg',
      'type:첫 문단 첫 줄', 'type:첫 문단 둘째 줄',
      'H2-STYLE', 'type:소제목 하나', 'TEXT-STYLE',
      'type:둘째 문단',
      'file:02_steps.png',
      'type:마지막 문단',
      'type:#바이브코딩 #connectaivideomotion #CONNECTAILAB',
      'SAVE',
    ]);
    assert.ok(!ed.log.some((x) => x[0] === 'click' && /발행|publish/i.test(x[1] + x[2])), 'never clicks publish');
    assert.ok(ed.log.some((x) => x[0] === 'goto' && /GoBlogWrite/.test(x[1])), 'no blog id: opens your own blog writer');
    ok('naver (mocked editor): title, text, 소제목, pictures between paragraphs, #tags, then 저장 and stop');
  }
  {
    const ed = fakeEditor();
    const r = await drive(wrap(NAVER, {...params, publish: true}), ed);
    assert.equal(r.status, 'error');
    assert.ok(!ed.log.some((x) => x[0] === 'saved' || (x[0] === 'click' && /publish|발행/i.test(x[1] + x[2]))));
    ok('naver (mocked editor): --publish still never publishes; it fills and tells you to do that step yourself');
  }
  {
    const ed = fakeEditor({loggedOut: true});
    const r = await drive(wrap(NAVER, params), ed);
    assert.equal(r.status, 'logged-out');
    assert.ok(!ed.log.some((x) => x[0] === 'type' || x[0] === 'click'), 'logged out: nothing typed or clicked');
    const pop = '작성 중인 글이 있습니다.\n이어서 작성하시겠습니까?';
    const ed2 = fakeEditor({popup: pop, popupTitle: '손으로 쓰던 다른 글'});
    const r2 = await drive(wrap(NAVER, params), ed2);
    assert.equal(r2.status, 'error'); assert.ok(r2.restorePopup);
    assert.ok(!ed2.log.some((x) => x[0] === 'type' || x[0] === 'saved' || (x[0] === 'click' && x[1] === '.se-popup-button-cancel')), 'another unfinished post: only looked at (확인), never thrown away, nothing typed');
    const ed3 = fakeEditor({popup: pop, popupTitle: '제목이에요'});
    const r3 = await drive(wrap(NAVER, params), ed3);
    assert.equal(r3.status, 'saved-as-draft');
    assert.ok(ed3.log.some((x) => x[0] === 'click' && x[1] === '.se-popup-button-cancel'), 'same post from an earlier run: start fresh');
    ok('naver (mocked editor): logged out stops; an unfinished post of yours is left alone; the same post from an earlier run starts fresh');
  }

  // post(): a run folder -> blocks with the right picture files, handed to a fake ego-browser on PATH
  if (process.platform === 'win32') return;
  const run = path.join(tmp, 'naver-run');
  const dir = path.join(run, 'naver');
  fs.mkdirSync(path.join(dir, 'images'), {recursive: true});
  for (const f of ['01_frame_0001.jpg', '02_quote.png']) fs.writeFileSync(path.join(dir, 'images', f), 'x');
  fs.writeFileSync(path.join(dir, 'post.md'), '# 테스트 제목\n\n[image: frame 00:01]\n\n첫 문단이에요.\n\n## 소제목\n\n둘째 문단이에요.\n\n[image: quote "한 줄" 00:02]\n\n끝 문단이에요.\n\ntags: 하나, 둘\n');
  fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify({platform: 'naver', title: '테스트 제목', tags: ['하나', '둘'], parts: [{text: '', images: ['images/01_frame_0001.jpg', 'images/02_quote.png']}]}));
  fs.writeFileSync(path.join(dir, 'check.md'), 'Ready to post\n');
  const bin = path.join(tmp, 'fake-bin');
  fs.mkdirSync(bin, {recursive: true});
  const got = path.join(tmp, 'ego-script.js');
  fs.writeFileSync(path.join(bin, 'ego-browser'), `#!/bin/sh\ncat > "${got}"\necho '${MARK}{"status":"saved-as-draft","space":1}'\n`, {mode: 0o755});
  const oldPath = process.env.PATH;
  process.env.PATH = bin + path.delimiter + oldPath;
  try {
    const r = await post(run, 'naver', {log: () => {}});
    assert.equal(r.status, 'saved-as-draft');
  } finally { process.env.PATH = oldPath; }
  const sent = fs.readFileSync(got, 'utf8');
  const P = JSON.parse(sent.split('\n')[0].replace(/^const P = /, '').replace(/;$/, ''));
  assert.equal(P.title, '테스트 제목'); assert.deepEqual(P.tags, ['하나', '둘']);
  assert.equal(P.publish, false); assert.equal(P.saveDraft, true); assert.equal(P.blogId, null);
  assert.match(P.listShot, /-drafts\.png$/);
  assert.deepEqual(P.blocks.map((b) => (b.type === 'image' ? 'img:' + path.basename(b.file) : b.type)), ['img:01_frame_0001.jpg', 'text', 'h2', 'text', 'img:02_quote.png', 'text']);
  ok('naver post(): run folder -> blocks in order with the right pictures, sent to Ego Lite as a draft job (fake ego-browser)');
}
