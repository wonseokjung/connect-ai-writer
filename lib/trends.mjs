// trends: what people search and talk about now, with where each signal came from and its date.
// No key needed:
//   - Google Trends "trending now" feed for a country (trends.google.com/trending/rss)
//   - what people type: Google, YouTube and Naver search suggestions for your words
//   - interest over time: Wikipedia page views (Wikimedia REST API, open data)
//   - Google Trends interest over time, the same request flow as GeneralMills/pytrends (Apache-2.0):
//     cookie -> explore token -> widgetdata. Google often answers 429 to scripts; then we say so and give the link.
// With your own key (off unless you set it): Naver DataLab search trend (official API, NAVER_CLIENT_ID / NAVER_CLIENT_SECRET).
// With Ego Lite (optional, read only): top posts on X, Threads and YouTube search for your words.
import fs from 'node:fs';
import path from 'node:path';
import {getText} from './web.mjs';
import {slugify, today} from './research.mjs';

const stripXssi = (t) => JSON.parse(t.slice(t.indexOf('{')));
const unxml = (s = '') => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
const tag = (x, n) => unxml((x.match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`)) || [])[1] || '');

export function parseTrendingRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, x]) => ({
    title: tag(x, 'title'),
    traffic: tag(x, 'ht:approx_traffic'),
    date: new Date(tag(x, 'pubDate')).toISOString(),
    news: [...x.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)].map(([, n]) => ({title: tag(n, 'ht:news_item_title'), url: tag(n, 'ht:news_item_url'), source: tag(n, 'ht:news_item_source')})).slice(0, 2),
  }));
}
export const trafficNumber = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;

export async function googleTrendingNow(geo = 'KR') {
  const r = await getText(`https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`);
  if (!r.ok) throw new Error(`Google Trends feed answered ${r.status}`);
  return parseTrendingRss(r.text);
}

export async function suggestions(q, {where = 'google', lang = 'ko'} = {}) {
  if (where === 'naver') {
    const r = await getText(`https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`);
    return cleanSuggestions(q, (JSON.parse(r.text).items?.[0] || []).map((x) => x[0]));
  }
  const r = await getText(`https://suggestqueries.google.com/complete/search?client=firefox${where === 'youtube' ? '&ds=yt' : ''}&hl=${lang}&q=${encodeURIComponent(q)}`);
  return cleanSuggestions(q, JSON.parse(r.text)[1] || []);
}
// drop the query itself and keyboard-typo lines (Korean typed on an English layout, like "qkdlqmzheld")
export const cleanSuggestions = (q, list) => list.filter((x) => x && x.replace(/\s+/g, '') !== q.replace(/\s+/g, '').toLowerCase() && x !== q && !(/[가-힣]/.test(q) && !/[가-힣\s]/.test(x)));

// Wikipedia: find the article for the words, then its monthly views
export async function wikiArticle(q, lang = 'ko') {
  const r = await getText(`https://${lang}.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&search=${encodeURIComponent(q)}`, {headers: {'api-user-agent': 'connect-ai-writer (open source writing tool)'}});
  const j = JSON.parse(r.text);
  return j[1]?.[0] ? {title: j[1][0], url: j[3][0], lang} : null;
}
export async function wikiViews(title, lang = 'ko', {months = 18} = {}) {
  const end = new Date(); end.setUTCDate(0); // end of last month
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months + 1, 1));
  const f = (d) => d.toISOString().slice(0, 10).replace(/-/g, '') + '00';
  const r = await getText(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/user/${encodeURIComponent(title.replace(/ /g, '_'))}/monthly/${f(start)}/${f(end)}`, {headers: {'api-user-agent': 'connect-ai-writer (open source writing tool)'}});
  if (!r.ok) return [];
  return (JSON.parse(r.text).items || []).map((x) => ({month: `${x.timestamp.slice(0, 4)}-${x.timestamp.slice(4, 6)}`, views: x.views}));
}

// pytrends flow (Apache-2.0, reimplemented): NID cookie -> POST api/explore (token) -> GET widgetdata/multiline
export async function googleInterest(keywords, {geo = 'KR', hl = 'ko', time = 'today 12-m', tz = -540} = {}) {
  const r0 = await fetch(`https://trends.google.com/trends/explore?geo=${geo}`, {headers: {'accept-language': hl}});
  const nid = (r0.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('NID=')) || '';
  const req = {comparisonItem: keywords.map((keyword) => ({keyword, geo, time})), category: 0, property: ''};
  const r1 = await fetch('https://trends.google.com/trends/api/explore?' + new URLSearchParams({hl, tz: String(tz), req: JSON.stringify(req)}), {method: 'POST', headers: {cookie: nid, 'accept-language': hl}});
  if (!r1.ok) return {blocked: r1.status};
  const w = stripXssi(await r1.text()).widgets.find((x) => x.id === 'TIMESERIES');
  for (let attempt = 0; attempt < 2; attempt++) {
    const r2 = await fetch('https://trends.google.com/trends/api/widgetdata/multiline?' + new URLSearchParams({hl, tz: String(tz), req: JSON.stringify(w.request), token: w.token}), {headers: {cookie: nid, 'accept-language': hl}});
    if (r2.ok) return {series: stripXssi(await r2.text()).default.timelineData.map((p) => ({date: new Date(Number(p.time) * 1000).toISOString().slice(0, 10), values: p.value}))};
    if (r2.status !== 429) return {blocked: r2.status};
    await new Promise((res) => setTimeout(res, 4000));
  }
  return {blocked: 429};
}

// Naver DataLab search trend: official, needs YOUR app key (developers.naver.com). Off unless both env vars are set.
export async function naverDatalab(keywords, {id = process.env.NAVER_CLIENT_ID, secret = process.env.NAVER_CLIENT_SECRET, months = 12} = {}) {
  if (!id || !secret) return null;
  const end = new Date(), start = new Date(); start.setMonth(start.getMonth() - months);
  const body = {startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), timeUnit: 'month', keywordGroups: keywords.slice(0, 5).map((k) => ({groupName: k, keywords: [k]}))};
  const r = await fetch('https://openapi.naver.com/v1/datalab/search', {method: 'POST', headers: {'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  if (!r.ok) return {error: `Naver DataLab answered ${r.status}`};
  return (await r.json()).results.map((g) => ({keyword: g.title, points: g.data.map((d) => ({date: d.period, ratio: d.ratio}))}));
}

// Listening in your browser (CONNECT AI Browser first, or Ego Lite), read only: same script as connect-ai-marketer's listener,
// plus YouTube search. Own task space, closed at the end.
export const LISTEN = `
const out = [];
async function scroll(n) { for (let i = 0; i < n; i++) { await page.mouse.wheel(0, 2200); await W(1500); } }
for (const q of P.queries) {
  if (P.sites.includes('x')) {
    await step('X 검색 읽기: ' + q);
    await page.goto('https://x.com/search?q=' + encodeURIComponent(q) + '&src=typed_query&f=top', {timeout: 40000}); await W(4000);
    for (let s = 0; s < P.screens; s++) {
      out.push(...await page.evaluate((q) => [...document.querySelectorAll('article[data-testid="tweet"]')].map(a => {
        const link = [...a.querySelectorAll('a[href*="/status/"]')].find(x => x.querySelector('time'));
        const g = a.querySelector('[role="group"]');
        return {site: 'x', q, url: link ? link.href.split('?')[0] : '', text: (a.querySelector('[data-testid="tweetText"]') || {}).innerText || '', time: (a.querySelector('time') || {}).dateTime || '', stats: g ? g.getAttribute('aria-label') || '' : ''};
      }), q));
      await scroll(1);
    }
  }
  if (P.sites.includes('threads')) {
    await step('스레드 검색 읽기: ' + q);
    await page.goto('https://www.threads.com/search?q=' + encodeURIComponent(q) + '&serp_type=default', {timeout: 40000}); await W(4000);
    for (let s = 0; s < P.screens; s++) {
      out.push(...await page.evaluate((q) => [...document.querySelectorAll('a[href*="/post/"]')].filter(a => a.querySelector('time')).map(a => {
        let b = a; for (let i = 0; i < 8 && b && (b.innerText || '').length < 80; i++) b = b.parentElement;
        return {site: 'threads', q, url: a.href.split('?')[0], text: (b && b.innerText || '').slice(0, 800), time: (a.querySelector('time') || {}).dateTime || '', stats: ''};
      }), q));
      await scroll(1);
    }
  }
  if (P.sites.includes('youtube')) {
    await step('유튜브 검색 읽기: ' + q);
    await page.goto('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), {timeout: 40000}); await W(4000);
    out.push(...await page.evaluate((q) => [...document.querySelectorAll('ytd-video-renderer')].slice(0, 15).map(v => {
      const a = v.querySelector('a#video-title');
      const meta = [...v.querySelectorAll('#metadata-line span')].map(s => s.innerText);
      return {site: 'youtube', q, url: a ? a.href.split('&')[0] : '', text: a ? a.getAttribute('title') || a.innerText : '', time: meta[1] || '', stats: meta[0] || '', channel: (v.querySelector('#channel-name a') || {}).innerText || ''};
    }), q));
  }
}
done({status: 'ok', rows: out});
`;

export async function listen(keywords, {sites = ['x', 'threads', 'youtube'], screens = 1, log = () => {}} = {}) {
  const {wrap, run, browser} = await import('./ego.mjs');
  const plan = keywords.flatMap((q) => [['x', 'X 검색 읽기: '], ['threads', '스레드 검색 읽기: '], ['youtube', '유튜브 검색 읽기: ']].filter(([s]) => sites.includes(s)).map(([, t]) => t + q));
  const res = await run(wrap(LISTEN, {queries: keywords, sites, screens, space: browser() === 'cab' ? `글쓰기 직원 트렌드 읽기 ${new Date().toTimeString().slice(0, 5)}` : `writer-trends-${Date.now()}`}, {plan}), {timeoutMs: 150000 * keywords.length, log});
  const rows = res?.rows;
  if (!Array.isArray(rows)) throw new Error(res?.error || 'the browser did not return posts');
  const seen = new Set();
  return rows.filter((r) => r.url && r.text && !seen.has(r.url) && seen.add(r.url));
}

export async function collectTrends({seeds = [], geo = 'KR', lang = 'ko', listenSites = null, screens = 1, google = true, log = () => {}} = {}) {
  const t = {made: new Date().toISOString(), geo, lang, seeds, signals: [], notes: []};
  const step = async (name, fn) => { try { const v = await fn(); log(`    ${name}: ok`); return v; } catch (e) { t.notes.push(`${name}: ${e.message}`); log(`    ${name}: ${e.message}`); return null; } };
  t.trendingNow = (await step('Google Trends, trending now ' + geo, () => googleTrendingNow(geo))) || [];
  t.suggest = {};
  t.wiki = {};
  for (const q of seeds) {
    t.suggest[q] = {
      google: (await step(`Google suggestions "${q}"`, () => suggestions(q, {where: 'google', lang}))) || [],
      youtube: (await step(`YouTube suggestions "${q}"`, () => suggestions(q, {where: 'youtube', lang}))) || [],
      naver: lang === 'ko' ? (await step(`Naver suggestions "${q}"`, () => suggestions(q, {where: 'naver'}))) || [] : [],
    };
    for (const L of [...new Set([lang, 'en'])]) {
      const a = await step(`Wikipedia (${L}) "${q}"`, () => wikiArticle(q, L));
      if (a) { a.views = (await step(`Wikipedia views ${a.title}`, () => wikiViews(a.title, L))) || []; if (a.views.length) t.wiki[`${q}|${L}`] = a; }
    }
  }
  if (google && seeds.length) {
    const g = await step('Google Trends interest over time', () => googleInterest(seeds.slice(0, 5), {geo, hl: lang}));
    if (g?.series) t.googleInterest = {keywords: seeds.slice(0, 5), series: g.series};
    else if (g?.blocked) t.notes.push(`Google Trends interest over time: Google answered ${g.blocked} (it often blocks scripts). Open it yourself: https://trends.google.com/trends/explore?geo=${geo}&q=${encodeURIComponent(seeds.slice(0, 5).join(','))}`);
  }
  const dl = process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET ? await step('Naver DataLab (your key)', () => naverDatalab(seeds)) : null;
  if (dl && !dl.error) t.datalab = dl; else if (!dl) t.notes.push('Naver DataLab: off (set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET from your own developers.naver.com app to turn it on).');
  if (listenSites?.length && seeds.length) t.listen = (await step('browser listening (read only)', () => listen(seeds, {sites: listenSites, screens, log}))) || [];
  return t;
}

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => (n >= 10000 ? Math.round(n / 1000) / 10 + '만' : n.toLocaleString('en-US'));

// one line chart per series group, code-made SVG
export function lineChart(series, {w = 1200, h = 520, title = '', unit = '', colors = ['#D6892A', '#7FB2E5', '#C7A6F0', '#8FD19E']} = {}) {
  const pad = {l: 84, r: 36, t: 104, b: 64};
  const xs = series[0]?.points.map((p) => p.x) || [];
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)));
  const X = (i) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, xs.length - 1);
  const Y = (v) => h - pad.b - (v / max) * (h - pad.t - pad.b);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(max * f)}" y2="${Y(max * f)}" stroke="#2a251e"/><text x="${pad.l - 12}" y="${Y(max * f) + 5}" text-anchor="end" fill="#8d8476" font-size="15">${fmt(Math.round(max * f))}</text>`).join('');
  // one label per new month, at most about 9 of them
  const firsts = xs.map((x, i) => (i === 0 || x !== xs[i - 1] ? i : -1)).filter((i) => i >= 0);
  const step = Math.ceil(firsts.length / 9);
  const labels = firsts.filter((_, k) => k % step === 0).map((i) => `<text x="${X(i)}" y="${h - pad.b + 30}" text-anchor="${i === 0 ? 'start' : 'middle'}" fill="#8d8476" font-size="15">${esc(xs[i])}</text>`).join('');
  const lines = series.map((s, k) => {
    const c = colors[k % colors.length];
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
    const area = `${d} L${X(s.points.length - 1).toFixed(1)},${h - pad.b} L${pad.l},${h - pad.b} Z`;
    const peak = s.points.reduce((a, p, i) => (p.y > a.y ? {...p, i} : a), {y: -1});
    return `<path d="${area}" fill="${c}" opacity=".10"/><path d="${d}" fill="none" stroke="${c}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${X(peak.i)}" cy="${Y(peak.y)}" r="6" fill="${c}"/><text x="${Math.min(X(peak.i), w - pad.r - 10)}" y="${Y(peak.y) - 14}" text-anchor="${X(peak.i) > w - 200 ? 'end' : 'middle'}" fill="${c}" font-size="16" font-weight="600">${fmt(peak.y)}${esc(unit)}</text>`;
  }).join('');
  const legend = series.map((s, k) => `<g transform="translate(${pad.l + k * 280},${pad.t - 40})"><rect width="22" height="4" y="-5" rx="2" fill="${colors[k % colors.length]}"/><text x="32" y="0" fill="#e9e1d3" font-size="16">${esc(s.name)}</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif"><rect width="${w}" height="${h}" fill="#0f0d0a"/>${title ? `<text x="${pad.l}" y="34" fill="#D6892A" font-size="15" letter-spacing="3">${esc(title)}</text>` : ''}${grid}${labels}${lines}${legend}</svg>`;
}

export function chartsFor(t, size = {}) {
  const charts = [];
  const wiki = Object.values(t.wiki || {}).filter((a) => a.views.length > 2);
  for (const L of [...new Set(wiki.map((a) => a.lang))]) {
    const group = wiki.filter((a) => a.lang === L);
    const months = [...new Set(group.flatMap((a) => a.views.map((v) => v.month)))].sort();
    charts.push({name: `wiki-${L}`, caption: `Wikipedia (${L}) page views a month, ${months[0]} to ${months[months.length - 1]}. Source: Wikimedia REST API`, svg: lineChart(group.map((a) => ({name: a.title, points: months.map((m) => ({x: m.slice(2).replace('-', '.'), y: a.views.find((v) => v.month === m)?.views || 0}))})), {...size, title: `WIKIPEDIA ${L.toUpperCase()} · MONTHLY VIEWS`})});
  }
  if (t.googleInterest) charts.push({name: 'google', caption: 'Google Trends interest over time (0 to 100, relative)', svg: lineChart(t.googleInterest.keywords.map((k, i) => ({name: k, points: t.googleInterest.series.map((p) => ({x: p.date.slice(2, 7).replace('-', '.'), y: p.values[i]}))})), {...size, title: 'GOOGLE TRENDS · INTEREST'})});
  if (t.datalab) charts.push({name: 'datalab', caption: 'Naver DataLab search trend (0 to 100, relative)', svg: lineChart(t.datalab.map((g) => ({name: g.keyword, points: g.points.map((p) => ({x: p.date.slice(2, 7).replace('-', '.'), y: p.ratio}))})), {...size, title: 'NAVER DATALAB · SEARCH'})});
  return charts;
}

export async function writeTrends(t, {out = 'out', log = () => {}} = {}) {
  const dir = path.join(path.resolve(out), `${today().replace(/-/g, '')}_${slugify(t.seeds[0] || 'now')}-trends`);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'trends.json'), JSON.stringify(t, null, 2));
  const charts = chartsFor(t);
  for (const c of charts) fs.writeFileSync(path.join(dir, `chart-${c.name}.svg`), c.svg);
  fs.writeFileSync(path.join(dir, 'trends.md'), trendsMd(t));
  fs.writeFileSync(path.join(dir, 'ideas.md'), `# Topic ideas from trends ${today()}\n\n<!-- Your agent: 3 to 5 ideas. Each: the idea in one line, the evidence (which signal, its date, its link), and who it is for.\n     Evidence only from trends.md. -->\n`);
  fs.writeFileSync(path.join(dir, 'trends.html'), trendsHtml(t, charts));
  const png = [];
  try {
    const sharp = (await import('sharp')).default;
    // 16:9 pictures, so a blog post can use them whole: [image: file chart-google.png "caption"]
    for (const c of chartsFor(t, {w: 1600, h: 900})) { const f = path.join(dir, `chart-${c.name}.png`); await sharp(Buffer.from(c.svg)).png().toFile(f); png.push(f); }
  } catch (e) { log(`    chart png: ${e.message}`); }
  return {dir, charts: charts.length, png};
}

function trendsMd(t) {
  const L = [`# Trends ${t.made.slice(0, 10)} (${t.geo})`, '', `Words: ${t.seeds.join(', ') || '(none, trending now only)'}`, ''];
  if (t.trendingNow?.length) {
    L.push('## Trending now on Google (' + t.geo + ')', '', 'Source: https://trends.google.com/trending/rss?geo=' + t.geo, '');
    for (const x of t.trendingNow.slice(0, 15)) L.push(`- ${x.title} (${x.traffic} searches, ${x.date.slice(0, 16).replace('T', ' ')} UTC)${x.news[0] ? ` · ${x.news[0].title} ${x.news[0].url}` : ''}`);
    L.push('');
  }
  for (const [q, s] of Object.entries(t.suggest || {})) {
    L.push(`## What people type after "${q}"`, '', `Google: ${s.google.join(', ') || '-'}`, `YouTube: ${s.youtube.join(', ') || '-'}`, `Naver: ${s.naver.join(', ') || '-'}`, `(search suggestions, read ${t.made.slice(0, 10)})`, '');
  }
  const wiki = Object.values(t.wiki || {});
  if (wiki.length) {
    L.push('## Interest over time: Wikipedia page views a month', '');
    for (const a of wiki) {
      const last = a.views.slice(-3).map((v) => `${v.month} ${v.views}`).join(', ');
      const peak = a.views.reduce((m, v) => (v.views > m.views ? v : m), {views: -1});
      L.push(`- ${a.title} (${a.lang}.wikipedia) ${a.url}: peak ${peak.month} ${peak.views}, last three months ${last}`);
    }
    L.push('');
  }
  if (t.googleInterest) L.push('## Google Trends interest', '', ...t.googleInterest.keywords.map((k, i) => `- ${k}: last ${t.googleInterest.series.slice(-1)[0]?.values[i]} (0 to 100)`), '');
  if (t.datalab) L.push('## Naver DataLab', '', ...t.datalab.map((g) => `- ${g.keyword}: ${g.points.slice(-3).map((p) => `${p.date} ${p.ratio}`).join(', ')}`), '');
  if (t.listen?.length) {
    L.push('## What people post (Ego Lite, read only)', '');
    for (const r of t.listen.slice(0, 24)) L.push(`- ${r.site} ${r.time ? r.time.slice(0, 10) + ' ' : ''}${r.stats ? '(' + r.stats.slice(0, 60) + ') ' : ''}${r.text.replace(/\s+/g, ' ').slice(0, 140)} ${r.url}`);
    L.push('', 'Numbers are what each site showed when read. Claims inside posts are the authors\' own.', '');
  }
  if (t.notes.length) L.push('## Notes', '', ...t.notes.map((n) => '- ' + n), '');
  return L.join('\n');
}

function trendsHtml(t, charts) {
  const chips = (arr) => arr.map((x) => `<span class="chip">${esc(x)}</span>`).join('');
  const maxT = Math.max(1, ...(t.trendingNow || []).map((x) => trafficNumber(x.traffic)));
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trends ${esc(t.seeds.join(', '))}</title>
<style>
:root{--bg:#0b0a08;--fg:#f3ede2;--mute:#9a9183;--gold:#D6892A;--line:#2a251e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;word-break:keep-all}
main{max-width:1080px;margin:0 auto;padding:56px 24px 80px}.k{color:var(--gold);letter-spacing:.2em;font-size:12px;text-transform:uppercase}
h1{font-family:"Bodoni 72","Didot","Noto Serif KR",serif;font-weight:500;font-size:44px;margin:10px 0 4px}.sum{color:var(--mute);margin:0 0 30px}
h2{font-family:"Bodoni 72","Didot","Noto Serif KR",serif;font-weight:500;color:var(--gold);font-size:22px;border-top:1px solid var(--line);padding-top:22px;margin-top:34px}
figure{margin:0 0 18px}figure svg{width:100%;height:auto;border:1px solid var(--line)}figcaption{color:var(--mute);font-size:13px;margin-top:6px}
.chip{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:3px 12px;margin:0 6px 8px 0;font-size:14px}
.row{display:grid;grid-template-columns:110px 1fr;gap:10px;margin:6px 0}.lab{color:var(--mute);font-size:14px}
.bar{display:grid;grid-template-columns:minmax(120px,260px) 1fr 70px;gap:12px;align-items:center;padding:5px 0;font-size:15px}
.bar i{display:block;height:8px;background:linear-gradient(90deg,#8a5518,var(--gold));border-radius:4px}.bar small{color:var(--mute)}
.post{border-bottom:1px solid var(--line);padding:10px 0;font-size:14.5px}.post a{color:var(--gold)}.note{color:var(--mute);font-size:14px}
@media(max-width:600px){h1{font-size:32px}main{padding:36px 16px}.bar{grid-template-columns:1fr 60px}.bar i{display:none}}
</style></head><body><main>
<div class="k">connect-ai-writer · trends</div><h1>${esc(t.seeds.join(' · ') || 'Trending now')}</h1>
<p class="sum">${t.made.slice(0, 10)} · ${esc(t.geo)} · every signal with its source and date</p>
${charts.map((c) => `<figure>${c.svg}<figcaption>${esc(c.caption)}</figcaption></figure>`).join('')}
${Object.entries(t.suggest || {}).map(([q, s]) => `<h2>What people type after "${esc(q)}"</h2><div class="row"><span class="lab">Google</span><div>${chips(s.google)}</div></div><div class="row"><span class="lab">YouTube</span><div>${chips(s.youtube)}</div></div>${s.naver.length ? `<div class="row"><span class="lab">Naver</span><div>${chips(s.naver)}</div></div>` : ''}`).join('')}
${t.trendingNow?.length ? `<h2>Trending now on Google (${esc(t.geo)})</h2>${t.trendingNow.slice(0, 12).map((x) => `<div class="bar"><span>${esc(x.title)}</span><i style="width:${Math.max(4, (100 * trafficNumber(x.traffic)) / maxT)}%"></i><small>${esc(x.traffic)}</small></div>`).join('')}` : ''}
${t.listen?.length ? `<h2>What people post</h2>${t.listen.slice(0, 12).map((r) => `<div class="post"><b>${esc(r.site)}</b> ${esc(r.text.replace(/\s+/g, ' ').slice(0, 160))} <a href="${esc(r.url)}">link</a></div>`).join('')}` : ''}
${t.notes.length ? `<h2>Notes</h2>${t.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}` : ''}
</main></body></html>`;
}
