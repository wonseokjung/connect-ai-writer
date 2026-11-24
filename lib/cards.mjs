// Card designs as plain HTML (your theme's colors and fonts). Chrome turns each one into a picture.
// Kinds: title, quote, stat, steps, frame (your video frame + a line), page (your page screenshot), file (your own image).
import {pathToFileURL} from 'node:url';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const src = (f) => (/^(https?|file|data):/.test(f) ? f : pathToFileURL(f).href);

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

function page({w, h, theme, body, css = '', inset = true}) {
  const u = Math.min(w, h) / 1080; // 1 at 1080 px
  const fonts = (theme.fontFiles || []).map((f, i) => `@font-face{font-family:'caiw${i}';src:url('${src(f.file || f)}');${f.weight ? `font-weight:${f.weight};` : ''}}`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{background:${theme.bg};color:${theme.fg};font-family:${theme.fontBody};word-break:keep-all;overflow-wrap:break-word;-webkit-font-smoothing:antialiased;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(120% 90% at 85% 0%,${theme.bg2} 0%,${theme.bg} 60%)}
.grain{position:absolute;inset:0;background-image:${theme.grain ? GRAIN : 'none'};opacity:.9;pointer-events:none}
.serif{font-family:${theme.fontHeadline};font-weight:600;letter-spacing:-.01em}
.gold{color:${theme.accent}}
.rule{width:${96 * u}px;height:${3 * u}px;background:${theme.accent}}
.foot{position:absolute;left:${72 * u}px;right:${72 * u}px;bottom:${56 * u}px;display:flex;justify-content:space-between;align-items:center;font-size:${24 * u}px;color:${theme.muted};letter-spacing:.08em}
.fit{overflow:hidden}
.inset{position:absolute;inset:${28 * u}px;border:${1.5 * u}px solid ${theme.line};pointer-events:none}
${css}</style></head><body><div class="bg"></div>${body}${inset ? '<div class="inset"></div>' : ''}<div class="grain"></div>
<script>
for (const el of document.querySelectorAll('.fit')) {
  let s = parseFloat(getComputedStyle(el).fontSize), min = s * 0.45;
  const over = () => el.scrollHeight > el.clientHeight * 1.06 + 4 || el.scrollWidth > el.clientWidth * 1.02 + 4;
  while (over() && s > min) { s -= 2; el.style.fontSize = s + 'px'; }
}
</script></body></html>`;
}

function foot(theme, u, right = '') {
  const left = theme.brand ? esc(theme.brand) : '';
  return left || right ? `<div class="foot"><span>${left}</span><span>${esc(right)}</span></div>` : '';
}

export function card(d, {w, h, theme, image = null, at = ''}) {
  const u = Math.min(w, h) / 1080;
  const pad = 72 * u;
  const wide = w / h > 1.3;
  if (d.kind === 'title') {
    return page({w, h, theme, body: `
<div style="position:absolute;left:${pad}px;right:${pad}px;top:${pad * 1.3}px;bottom:${pad * 2.2}px;display:flex;flex-direction:column;justify-content:${wide ? 'center' : 'flex-end'};gap:${36 * u}px">
  <div class="rule"></div>
  <div class="serif fit" style="font-size:${(wide ? 132 : 116) * u}px;line-height:1.18;max-height:${h * 0.62}px;max-width:${wide ? '82%' : '100%'}">${esc(d.text)}</div>
  ${d.sub ? `<div class="fit" style="font-size:${36 * u}px;line-height:1.45;color:${theme.muted};max-height:${150 * u}px">${esc(d.sub)}</div>` : ''}
</div>${foot(theme, u)}`});
  }
  if (d.kind === 'quote') {
    return page({w, h, theme, body: `
<div style="position:absolute;left:${pad}px;right:${pad}px;top:${pad}px;bottom:${pad * 2}px;display:flex;flex-direction:column;justify-content:center;gap:${28 * u}px">
  <div class="serif gold" style="font-size:${220 * u}px;line-height:.7;height:${120 * u}px">“</div>
  <div class="serif fit" style="font-size:${(wide ? 100 : 92) * u}px;line-height:1.32;max-height:${h * 0.55}px;max-width:${wide ? '84%' : '100%'}">${esc(d.text)}</div>
  <div class="rule" style="margin-top:${12 * u}px"></div>
</div>${foot(theme, u, at)}`});
  }
  if (d.kind === 'stat') {
    return page({w, h, theme, body: `
<div style="position:absolute;left:${pad}px;right:${pad}px;top:${pad}px;bottom:${pad * 2}px;display:flex;flex-direction:column;justify-content:center;gap:${24 * u}px">
  <div class="serif gold fit" style="font-size:${(wide ? 300 : 340) * u}px;line-height:1.1;max-height:${h * 0.42}px;white-space:nowrap">${esc(d.value)}</div>
  <div class="rule"></div>
  <div class="fit" style="font-size:${56 * u}px;line-height:1.35;max-height:${h * 0.25}px">${esc(d.label)}</div>
</div>${foot(theme, u, at)}`});
  }
  if (d.kind === 'steps') {
    const items = d.items.slice(0, 6);
    const row = wide && items.length <= 4;
    const box = items.map((t, i) => `<div class="step"><div class="n serif gold">${String(i + 1).padStart(2, '0')}</div><div class="t fit">${esc(t)}</div></div>`).join(`<div class="arrow"></div>`);
    return page({w, h, theme, css: `
.steps{position:absolute;left:${pad}px;right:${pad}px;top:${row ? pad * 2.2 : pad}px;bottom:${row ? pad * 2.6 : pad * 2}px;display:flex;flex-direction:${row ? 'row' : 'column'};align-items:stretch;justify-content:center;gap:0}
.step{flex:1;border:${2 * u}px solid ${theme.line};background:rgba(255,255,255,.02);padding:${30 * u}px ${34 * u}px;display:flex;${row ? 'flex-direction:column;justify-content:center;gap:' + 22 * u + 'px' : 'align-items:center;gap:' + 34 * u + 'px'};min-height:0}
.n{font-size:${(row ? 96 : 64) * u}px;line-height:1}
.t{font-size:${(row ? 54 : 56) * u}px;line-height:1.35;max-height:100%}
.arrow{flex:0 0 ${(row ? 36 : 30) * u}px;position:relative}
.arrow:after{content:'';position:absolute;${row ? `top:50%;left:${8 * u}px;right:${8 * u}px;height:${2 * u}px` : `left:50%;top:${4 * u}px;bottom:${4 * u}px;width:${2 * u}px`};background:${theme.accent}}`,
      body: `<div class="steps">${box}</div>${foot(theme, u)}`});
  }
  if (['frame', 'page', 'file', 'gen'].includes(d.kind)) {
    // the picture is never cropped (faces stay whole). Picture and line sit together in the middle of the card.
    const cap = d.caption || d.text || '';
    const ratio = image?.w && image?.h ? image.w / image.h : 16 / 9;
    const isPage = d.kind === 'page';
    const iw = isPage ? w - pad * 2 : w;
    const ih = Math.min(iw / ratio, h * (cap ? 0.62 : 0.8));
    const capH = cap ? Math.min(h - ih - pad * 3.2, 360 * u) : 0;
    const frameStyle = isPage ? `border:${2 * u}px solid ${theme.line};border-radius:${18 * u}px;` : '';
    return page({w, h, theme, inset: isPage, body: `
<div style="position:absolute;inset:0 0 ${pad * 1.4}px 0;display:flex;flex-direction:column;justify-content:center;gap:${48 * u}px">
  <div style="margin:0 ${isPage ? pad : 0}px;width:${iw}px;height:${ih}px;${frameStyle}overflow:hidden;background:${theme.bg2};flex:0 0 auto"><img src="${src(image.file)}" style="width:100%;height:100%;object-fit:contain;display:block"></div>
  ${cap ? `<div style="margin:0 ${pad}px;display:flex;flex-direction:column;gap:${24 * u}px"><div class="rule"></div><div class="serif fit" style="font-size:${84 * u}px;line-height:1.28;max-height:${capH}px">${esc(cap)}</div></div>` : ''}
</div>${foot(theme, u, at)}`});
  }
  throw new Error('unknown card kind ' + d.kind);
}
