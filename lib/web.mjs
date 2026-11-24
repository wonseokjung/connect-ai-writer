// Read one web page into plain text with its title, site and dates (Mozilla Readability on a light DOM).
// Used by `research` (sources the user or their agent picked) and by the page source in `start`.
const UA = 'Mozilla/5.0 (compatible; connect-ai-writer)';

export async function getText(url, {timeoutMs = 20000, headers = {}} = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {headers: {'user-agent': UA, 'accept-language': 'ko,en;q=0.8', ...headers}, signal: ctl.signal, redirect: 'follow'});
    const text = await res.text();
    return {ok: res.ok, status: res.status, url: res.url || url, text, headers: res.headers};
  } finally { clearTimeout(t); }
}

const pickDate = (s) => {
  if (!s) return null;
  const m = String(s).match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
};

// the date a page says it was published or changed: meta tags, JSON-LD, <time>, then Wikipedia's "last edited" line
export function pageDates(document, html = '') {
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content');
  let published = pickDate(meta('meta[property="article:published_time"]') || meta('meta[name="article:published_time"]') || meta('meta[itemprop="datePublished"]') || meta('meta[name="date"]') || meta('meta[name="pubdate"]'));
  let modified = pickDate(meta('meta[property="article:modified_time"]') || meta('meta[itemprop="dateModified"]'));
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const j = JSON.parse(s.textContent);
      for (const o of [].concat(j['@graph'] || j)) {
        published = published || pickDate(o?.datePublished);
        modified = modified || pickDate(o?.dateModified);
      }
    } catch {}
  }
  if (!published) published = pickDate(document.querySelector('time[datetime]')?.getAttribute('datetime'));
  if (!modified) {
    const m = html.match(/"wgRevisionTimestamp"|id="footer-info-lastmod"[^>]*>([^<]+)/);
    if (m && m[1]) modified = pickDate(m[1].replace(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/, '$1-$2-$3'));
  }
  return {published, modified};
}

export async function readPage(url) {
  const r = await getText(url);
  if (!r.ok) throw new Error(`could not open ${url} (${r.status})`);
  const {parseHTML} = await import('linkedom');
  const {Readability} = await import('@mozilla/readability');
  const {document} = parseHTML(r.text);
  const dates = pageDates(document, r.text);
  const site = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || new URL(r.url).hostname.replace(/^www\./, '');
  const author = document.querySelector('meta[name="author"]')?.getAttribute('content') || '';
  const art = new Readability(document).parse();
  const paras = (art?.textContent || '').split(/\n+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 1);
  if (!dates.published && !dates.modified) {
    // "최종 업데이트: 2026년 10월 13일" / "Last updated: 2026-10-13" in the text itself
    const m = paras.slice(0, 6).join(' ').match(/(최종\s?업데이트|업데이트|수정일|작성일|Last updated|Updated|Published)\s*:?\s*(\d{4})\s?[년.\-/]\s?(\d{1,2})\s?[월.\-/]\s?(\d{1,2})/i);
    if (m) dates[/작성|Published/i.test(m[1]) ? 'published' : 'modified'] = `${m[2]}-${m[3].padStart(2, '0')}-${m[4].padStart(2, '0')}`;
  }
  return {url: r.url, title: (art?.title || url).trim(), site, author, ...dates, paras};
}
