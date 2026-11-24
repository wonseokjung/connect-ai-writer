// post.md: the words for one platform, written by you or your agent. This file reads it.
//   # Title                (blog platforms)
//   text ...
//   [image: frame 03:12 "caption"]     a sharp frame from your video near 03:12, filling the card (face kept whole)
//   [image: frame 03:12 "caption" x=0.3]  same, but you choose where to look (0 = left, 1 = right)
//   [image: quote "your exact words" 03:12]
//   [image: stat "15" "times a second" 11:49]
//   [image: title "headline" "small line"]
//   [image: steps "first" "second" "third"]
//   [image: page https://your.site "caption"]
//   [image: file my-photo.jpg "caption"]
//   ---                    next post in a thread (Threads, X)
//   tags: one, two, three
export const PLACEHOLDER = '{{write}}';
export const KINDS = ['frame', 'quote', 'stat', 'title', 'steps', 'page', 'file', 'gen'];

export function args(s) {
  const out = [];
  const re = /"([^"]*)"|“([^”]*)”|(\S+)/g;
  let m;
  while ((m = re.exec(s))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

const TIME = /^(\d{1,2}:)?\d{1,2}:\d{2}(\.\d+)?$/;
export function directive(line) {
  const m = line.trim().match(/^\[(?:image|img|이미지)\s*:\s*(\w+)\s*(.*)\]$/i);
  if (!m) return null;
  const kind = m[1].toLowerCase();
  const a = args(m[2]);
  const d = {kind, raw: line.trim(), args: a};
  const t = a.find((x) => TIME.test(x));
  if (t) d.at = t;
  const fx = a.find((x) => /^x=(0(\.\d+)?|1(\.0+)?)$/.test(x));
  if (fx) d.x = Number(fx.slice(2));
  const words = a.filter((x) => x !== t && x !== fx);
  if (kind === 'frame') d.caption = words[0] || '';
  else if (kind === 'quote') d.text = words[0] || '';
  else if (kind === 'stat') { d.value = words[0] || ''; d.label = words[1] || ''; }
  else if (kind === 'title') { d.text = words[0] || ''; d.sub = words[1] || ''; }
  else if (kind === 'steps') d.items = words;
  else if (kind === 'page') { d.url = words[0] || ''; d.caption = words[1] || ''; }
  else if (kind === 'file') { d.file = words[0] || ''; d.caption = words[1] || ''; }
  else if (kind === 'gen') d.prompt = words.join(' ');
  return d;
}

// the words that end up inside a picture (checked like the post text)
export function imageWords(d) {
  return [d.caption, d.text, d.sub, d.value, d.label, ...(d.items || [])].filter(Boolean).join('\n');
}

export function parsePost(md, platform) {
  const body = md.replace(/<!--[\s\S]*?-->/g, '').replace(/\r/g, '');
  const res = {title: '', tags: [], parts: [], placeholder: body.includes(PLACEHOLDER)};
  let lines = body.split('\n');
  // meta lines: keyword (the search words a blog post is for), subject + preview (a newsletter)
  const META = {keyword: 'keyword', 키워드: 'keyword', subject: 'subject', 제목줄: 'subject', 메일제목: 'subject', preview: 'preview', 미리보기: 'preview'};
  lines = lines.filter((l) => {
    const m = l.match(/^\s*(keyword|키워드|subject|제목줄|메일제목|preview|미리보기)\s*:\s*(.*)$/i);
    if (!m) return true;
    res[META[m[1].toLowerCase()]] = m[2].trim();
    return false;
  });
  const tagLine = lines.findIndex((l) => /^\s*(tags|태그)\s*:/i.test(l));
  if (tagLine >= 0) {
    res.tags = lines[tagLine].replace(/^\s*(tags|태그)\s*:/i, '').split(/[,，]/).map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
    lines.splice(tagLine, 1);
  }
  const ti = lines.findIndex((l) => /^#\s+/.test(l));
  if (ti >= 0 && ['article', 'single', 'carousel'].includes(platform.kind)) { res.title = lines[ti].replace(/^#\s+/, '').trim(); lines.splice(ti, 1); }
  const chunks = platform.kind === 'chain' ? lines.join('\n').split(/\n\s*---+\s*\n/) : [lines.join('\n')];
  for (const c of chunks) {
    const blocks = []; // in order: {type: 'text'|'h2'|'image', ...}
    let para = [];
    const flush = () => { if (para.length) { blocks.push({type: 'text', text: para.join('\n').trim()}); para = []; } };
    for (const l of c.split('\n')) {
      const d = directive(l);
      if (d) { flush(); blocks.push({type: 'image', ...d}); continue; }
      if (/^##+\s+/.test(l)) { flush(); blocks.push({type: 'h2', text: l.replace(/^##+\s+/, '').trim()}); continue; }
      if (!l.trim()) { flush(); continue; }
      para.push(l.replace(/\s+$/, ''));
    }
    flush();
    if (!blocks.length) continue;
    const text = blocks.filter((b) => b.type !== 'image').map((b) => b.text).join('\n\n');
    res.parts.push({blocks, text, images: blocks.filter((b) => b.type === 'image')});
  }
  return res;
}

// what you would paste: text of the part, with the tags where the platform wants them
export const citeMarks = (t) => t.replace(/\[S(\d+)\]/g, '[$1]');
export function plainText(part, post, platform, {last = false} = {}) {
  let t = citeMarks(part.text);
  if (last && post.tags.length && ['hashtag', 'topic'].includes(platform.tags?.style)) t += '\n\n' + post.tags.slice(0, platform.tags.max).map((x) => '#' + x.replace(/\s+/g, '')).join(' ');
  return t;
}

export function skeleton(key, platform) {
  const how = {
    chain: `Write one post, then a line with only --- , then the next post (a thread). Up to ${platform.maxChars} ${platform.count === 'x-weighted' ? 'weighted characters (Korean letters count 2)' : 'characters'} and ${platform.maxImages} images per post.`,
    article: `Start with "# Title". Use "## Heading" for sections. Put an [image: ...] line between paragraphs. End with "tags: a, b, c" (up to ${platform.tags.max}).`,
    single: `One post, up to ${platform.maxChars} characters. Images go in [image: ...] lines. End with "tags: a, b" (up to ${platform.tags.max}).`,
    carousel: `The [image: ...] lines are the slides, in order (up to ${platform.maxImages}). The text is the caption (up to ${platform.maxChars} characters). End with "tags: a, b" (up to ${platform.tags.max}).`,
  }[platform.kind];
  return `<!-- ${platform.name}. ${how}
Pictures: [image: frame 03:12 "caption"]  [image: quote "exact words from the source" 03:12]  [image: stat "15" "label" 11:49]
          [image: title "headline" "small line"]  [image: steps "one" "two" "three"]  [image: page https://your.site]  [image: file photo.jpg]
Every post needs at least one picture. Numbers and quotes must be in the source. Replace the line below. -->
${PLACEHOLDER}
`;
}
