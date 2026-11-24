// Picture-book scenes made by code: one line in, one illustration (SVG) out. No image model, no files, no network.
//   [scene: night hill moon stars | dino:green:sleepy:left bear:brown:happy:right:small]
// Before "|": a backdrop and props. After "|": animal characters as name:color:mood:pos:size (any order after the name).
// Korean words work too: "밤 언덕 달 별 | 공룡:초록:졸린 곰:갈색:웃는:오른쪽".
// Animals and things only, never people. All original CONNECT AI LAB code (MIT).

export const BACKDROPS = ['day', 'night', 'sunset', 'space', 'sea', 'forest', 'room', 'snow', 'rain'];
export const PROPS = ['moon', 'stars', 'star-big', 'sun', 'cloud', 'rainbow', 'comet', 'planet', 'rocket', 'mountain', 'volcano', 'hill', 'tree', 'pine', 'house', 'flower', 'egg', 'bed', 'lamp', 'book', 'boat', 'blanket', 'snowflakes', 'raindrops'];
export const CHARACTERS = ['dino', 'rabbit', 'bear', 'cat', 'owl', 'whale', 'fish', 'bird', 'robot'];
export const COLORS = ['green', 'blue', 'pink', 'orange', 'purple', 'yellow', 'brown', 'gray', 'white', 'red', 'teal', 'gold'];
export const MOODS = ['happy', 'sleepy', 'sad', 'surprised', 'excited', 'calm'];

const HEX = {green: '#6CC08B', blue: '#5E9DE6', pink: '#F291B5', orange: '#F4A15D', purple: '#9C83E0', yellow: '#F5CF5E', brown: '#B47E58', gray: '#A0A8B4', white: '#F3EFE6', red: '#E86A62', teal: '#3FB8AF', gold: '#D9A441'};
const DEFAULT_COLOR = {dino: 'green', rabbit: 'white', bear: 'brown', cat: 'orange', owl: 'purple', whale: 'blue', fish: 'orange', bird: 'yellow', robot: 'gray'};

const ALIAS = {
  // backdrops
  낮: 'day', 아침: 'day', morning: 'day', 밤: 'night', evening: 'sunset', 저녁: 'sunset', 노을: 'sunset', 우주: 'space',
  바다: 'sea', 바닷속: 'sea', 물속: 'sea', ocean: 'sea', underwater: 'sea', 숲: 'forest', woods: 'forest', 방: 'room', 침실: 'room', bedroom: 'room',
  눈: 'snow', 겨울: 'snow', winter: 'snow', 비: 'rain', rainy: 'rain',
  // props
  달: 'moon', 별: 'stars', star: 'stars', 큰별: 'star-big', bigstar: 'star-big', 해: 'sun', 태양: 'sun', 구름: 'cloud', clouds: 'cloud', 무지개: 'rainbow',
  혜성: 'comet', 별똥별: 'comet', 행성: 'planet', 로켓: 'rocket', 산: 'mountain', mountains: 'mountain', 화산: 'volcano', 언덕: 'hill', hills: 'hill',
  나무: 'tree', trees: 'tree', 소나무: 'pine', 집: 'house', 꽃: 'flower', flowers: 'flower', 알: 'egg', 침대: 'bed', 램프: 'lamp', 등: 'lamp',
  책: 'book', 배: 'boat', 담요: 'blanket', 이불: 'blanket', 눈송이: 'snowflakes', snowflake: 'snowflakes', 빗방울: 'raindrops',
  // characters
  공룡: 'dino', dinosaur: 'dino', 토끼: 'rabbit', bunny: 'rabbit', 곰: 'bear', 곰돌이: 'bear', 고양이: 'cat', kitty: 'cat', 부엉이: 'owl', 올빼미: 'owl',
  고래: 'whale', 물고기: 'fish', 새: 'bird', 로봇: 'robot',
  // colors
  초록: 'green', 초록색: 'green', 파랑: 'blue', 파란: 'blue', 파란색: 'blue', 분홍: 'pink', 분홍색: 'pink', 주황: 'orange', 주황색: 'orange', 보라: 'purple', 보라색: 'purple',
  노랑: 'yellow', 노란: 'yellow', 노란색: 'yellow', 갈색: 'brown', 회색: 'gray', grey: 'gray', 하양: 'white', 흰: 'white', 흰색: 'white', 빨강: 'red', 빨간: 'red', 빨간색: 'red',
  청록: 'teal', 금색: 'gold',
  // moods
  행복: 'happy', 웃는: 'happy', 기쁜: 'happy', 졸린: 'sleepy', 졸려: 'sleepy', 자는: 'sleepy', sleeping: 'sleepy', 슬픈: 'sad', 놀란: 'surprised', scared: 'surprised',
  신난: 'excited', 용감한: 'excited', brave: 'excited', 차분한: 'calm', 편안한: 'calm',
  // place, size
  왼쪽: 'left', 가운데: 'center', middle: 'center', 오른쪽: 'right', 작은: 'small', 큰: 'big', large: 'big', 보통: 'normal',
};
const alias = (w) => ALIAS[w] || w;

export function parseScene(str) {
  if (str && typeof str === 'object') return str;
  const s = String(str || '').trim().replace(/^\[\s*/, '').replace(/^(scene|장면)\s*:\s*/i, '').replace(/\s*\]$/, '');
  const [left, right = ''] = s.split('|');
  const out = {backdrop: null, props: [], chars: [], unknown: []};
  const addProp = (name) => { if (!out.props.some((p) => p.name === name)) out.props.push({name}); };
  const addChar = (tok) => {
    const parts = tok.split(':').map((x) => alias(x.trim().toLowerCase())).filter(Boolean);
    const name = parts.find((p) => CHARACTERS.includes(p));
    if (!name) { out.unknown.push(tok); return; }
    const c = {name, color: null, mood: 'happy', pos: null, size: 'normal'};
    for (const p of parts) {
      if (p === name) continue;
      if (COLORS.includes(p)) c.color = p;
      else if (MOODS.includes(p)) c.mood = p;
      else if (['left', 'center', 'right'].includes(p)) c.pos = p;
      else if (['small', 'normal', 'big'].includes(p)) c.size = p;
      else out.unknown.push(p);
    }
    c.color = c.color || DEFAULT_COLOR[name];
    out.chars.push(c);
  };
  for (const raw of left.trim().split(/[\s,]+/).filter(Boolean)) {
    const w = alias(raw.toLowerCase());
    if (BACKDROPS.includes(w)) {
      if (!out.backdrop) out.backdrop = w;
      else if (w === 'rain') addProp('raindrops');
      else if (w === 'snow') addProp('snowflakes');
      continue;
    }
    if (PROPS.includes(w)) { addProp(w); continue; }
    if (CHARACTERS.includes(alias(w.split(':')[0]))) { addChar(raw); continue; }
    out.unknown.push(raw);
  }
  for (const tok of right.trim().split(/[\s,]+/).filter(Boolean)) addChar(tok);
  out.backdrop = out.backdrop || 'day';
  return out;
}

// ---------- small helpers ----------
const r1 = (n) => Math.round(n * 10) / 10;
function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).slice(0, 6); }
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const pal = (c) => ({base: c, light: mix(c, '#ffffff', 0.38), lighter: mix(c, '#ffffff', 0.68), dark: mix(c, '#2a1840', 0.22), darker: mix(c, '#2a1840', 0.42)});
// smooth line through points (Catmull-Rom as cubic Bezier)
function smooth(pts) {
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

function makeCtx(prefix) {
  const defs = [];
  let n = 0;
  const ctx = {
    defs,
    id: (name) => `${prefix}${name}`,
    lin(stops, {x1 = 0, y1 = 0, x2 = 0, y2 = 1} = {}) {
      const id = `${prefix}l${n++}`;
      defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`);
      return `url(#${id})`;
    },
    rad(stops, {cx = 0.5, cy = 0.5, r = 0.5, fx, fy} = {}) {
      const id = `${prefix}r${n++}`;
      defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fx != null ? ` fx="${fx}" fy="${fy}"` : ''}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`);
      return `url(#${id})`;
    },
    uid: (p = 'u') => `${prefix}${p}${n++}`,
  };
  return ctx;
}

// ---------- faces (shared by every animal) ----------
const INK = '#2B2340';
function face({x = 0, ey, dx, r, my, mood, ink = INK, mouth = true, cheeks = true, tearSide = 1}) {
  const sw = r * 0.34;
  const st = (d, w = sw, c = ink) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${r1(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const open = (cx, rr = r) => `<ellipse cx="${r1(cx)}" cy="${r1(ey)}" rx="${r1(rr * 0.86)}" ry="${r1(rr)}" fill="${ink}"/><circle cx="${r1(cx - rr * 0.3)}" cy="${r1(ey - rr * 0.38)}" r="${r1(rr * 0.36)}" fill="#fff"/><circle cx="${r1(cx + rr * 0.3)}" cy="${r1(ey + rr * 0.32)}" r="${r1(rr * 0.15)}" fill="#fff" opacity=".85"/>`;
  const eyes = [x - dx, x + dx];
  const mw = r * 1.05;
  let s = '';
  if (mood === 'sleepy') {
    s += eyes.map((cx) => st(`M${r1(cx - r * 0.9)} ${r1(ey)} Q${r1(cx)} ${r1(ey + r * 0.85)} ${r1(cx + r * 0.9)} ${r1(ey)}`)).join('');
    if (mouth) s += `<ellipse cx="${r1(x)}" cy="${r1(my + r * 0.1)}" rx="${r1(r * 0.32)}" ry="${r1(r * 0.4)}" fill="${ink}" opacity=".85"/>`;
  } else if (mood === 'excited') {
    s += eyes.map((cx) => st(`M${r1(cx - r * 0.9)} ${r1(ey + r * 0.35)} Q${r1(cx)} ${r1(ey - r * 0.95)} ${r1(cx + r * 0.9)} ${r1(ey + r * 0.35)}`)).join('');
    if (mouth) s += `<path d="M${r1(x - mw)} ${r1(my - r * 0.15)} Q${r1(x)} ${r1(my + mw * 1.55)} ${r1(x + mw)} ${r1(my - r * 0.15)} Z" fill="${ink}"/><ellipse cx="${r1(x)}" cy="${r1(my + mw * 0.6)}" rx="${r1(mw * 0.45)}" ry="${r1(mw * 0.24)}" fill="#F27C8E"/>`;
  } else if (mood === 'surprised') {
    s += eyes.map((cx) => open(cx, r * 1.12)).join('');
    s += eyes.map((cx, i) => st(`M${r1(cx - r * 0.8)} ${r1(ey - r * 1.75)} Q${r1(cx)} ${r1(ey - r * 2.25)} ${r1(cx + r * 0.8)} ${r1(ey - r * 1.75)}`, sw * 0.8)).join('');
    if (mouth) s += `<ellipse cx="${r1(x)}" cy="${r1(my + r * 0.2)}" rx="${r1(r * 0.42)}" ry="${r1(r * 0.58)}" fill="${ink}"/>`;
  } else if (mood === 'sad') {
    s += eyes.map((cx) => open(cx, r * 0.95)).join('');
    s += st(`M${r1(eyes[0] - r * 0.95)} ${r1(ey - r * 1.35)} L${r1(eyes[0] + r * 0.7)} ${r1(ey - r * 1.9)}`, sw * 0.8) + st(`M${r1(eyes[1] + r * 0.95)} ${r1(ey - r * 1.35)} L${r1(eyes[1] - r * 0.7)} ${r1(ey - r * 1.9)}`, sw * 0.8);
    if (mouth) s += st(`M${r1(x - mw * 0.8)} ${r1(my + r * 0.45)} Q${r1(x)} ${r1(my - r * 0.35)} ${r1(x + mw * 0.8)} ${r1(my + r * 0.45)}`);
    const tx = eyes[tearSide > 0 ? 1 : 0] + r * 0.2, ty = ey + r * 1.35;
    s += `<path d="M${r1(tx)} ${r1(ty - r * 0.7)} Q${r1(tx + r * 0.5)} ${r1(ty)} ${r1(tx)} ${r1(ty + r * 0.35)} Q${r1(tx - r * 0.5)} ${r1(ty)} ${r1(tx)} ${r1(ty - r * 0.7)} Z" fill="#8FD3F4"/>`;
  } else if (mood === 'calm') {
    // content: softly closed smiling eyes and a small closed smile
    s += eyes.map((cx) => st(`M${r1(cx - r * 0.85)} ${r1(ey + r * 0.2)} Q${r1(cx)} ${r1(ey - r * 0.6)} ${r1(cx + r * 0.85)} ${r1(ey + r * 0.2)}`, sw * 0.9)).join('');
    if (mouth) s += st(`M${r1(x - mw * 0.5)} ${r1(my)} Q${r1(x)} ${r1(my + mw * 0.5)} ${r1(x + mw * 0.5)} ${r1(my)}`);
  } else { // happy
    s += eyes.map((cx) => open(cx)).join('');
    if (mouth) s += st(`M${r1(x - mw * 0.8)} ${r1(my)} Q${r1(x)} ${r1(my + mw * 0.95)} ${r1(x + mw * 0.8)} ${r1(my)}`);
  }
  if (cheeks && mood !== 'sad') s += eyes.map((cx, i) => `<ellipse cx="${r1(cx + (i ? 1 : -1) * r * 0.55)}" cy="${r1(ey + r * 1.55)}" rx="${r1(r * 0.75)}" ry="${r1(r * 0.45)}" fill="#FF8FA3" opacity=".5"/>`).join('');
  return s;
}
// three little z's for a sleepy friend (drawn outside any flip, so they always read the right way)
function zzz(x, y, k, color = '#FFFFFF') {
  return [[0, 0, 26], [34, -40, 20], [60, -74, 14]].map(([dx, dy, s]) => {
    const a = x + dx * k, b = y + dy * k, z = s * k;
    return `<path d="M${r1(a - z / 2)} ${r1(b - z / 2)} L${r1(a + z / 2)} ${r1(b - z / 2)} L${r1(a - z / 2)} ${r1(b + z / 2)} L${r1(a + z / 2)} ${r1(b + z / 2)}" fill="none" stroke="${color}" stroke-width="${r1(z * 0.22)}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
  }).join('');
}

// ---------- characters: feet at (0,0), facing the reader, about 320 units tall ----------
const C = {
  dino(ctx, p, mood) {
    const body = ctx.lin([[0, p.light], [0.55, p.base], [1, p.dark]]);
    const plate = (x, y, a, z = 1) => `<path d="M${-22 * z} ${14 * z} Q0 ${-46 * z} ${22 * z} ${14 * z} Z" transform="translate(${x} ${y}) rotate(${a})" fill="${p.dark}" stroke="${p.dark}" stroke-width="${6 * z}" stroke-linejoin="round"/>`;
    const plates = [[-200, -40, -64, 0.62], [-142, -72, -56, 0.8], [-104, -162, -60, 1], [-72, -194, -36, 1.05], [-30, -210, -12, 1], [-44, -266, -70, 0.9], [-18, -296, -42, 0.8]].map(([x, y, a, z]) => plate(x, y, a, z)).join('');
    return {h: 310, zz: [100, -300], svg: `${plates}
<path d="M-60 -95 C-150 -85 -215 -45 -262 -8 C-205 -2 -135 -18 -55 -38 Z" fill="${body}"/>
<rect x="-78" y="-72" width="56" height="74" rx="26" fill="${p.dark}"/><rect x="12" y="-72" width="56" height="74" rx="26" fill="${p.dark}"/>
<ellipse cx="-50" cy="-4" rx="10" ry="6" fill="${p.lighter}" opacity=".7"/><ellipse cx="40" cy="-4" rx="10" ry="6" fill="${p.lighter}" opacity=".7"/>
<ellipse cx="-12" cy="-112" rx="108" ry="98" fill="${body}"/>
<ellipse cx="14" cy="-92" rx="62" ry="70" fill="${p.lighter}" opacity=".9"/>
<ellipse cx="22" cy="-178" rx="62" ry="58" fill="${body}"/>
<ellipse cx="40" cy="-238" rx="88" ry="72" fill="${body}"/>
<ellipse cx="18" cy="-276" rx="34" ry="14" fill="#fff" opacity=".16"/>
<path d="M72 -122 q34 8 40 34" fill="none" stroke="${p.dark}" stroke-width="20" stroke-linecap="round"/><path d="M-62 -118 q-30 12 -32 38" fill="none" stroke="${p.dark}" stroke-width="20" stroke-linecap="round"/>
<circle cx="98" cy="-252" r="4" fill="${p.darker}"/><circle cx="112" cy="-246" r="4" fill="${p.darker}"/>
${face({x: 34, ey: -246, dx: 32, r: 15, my: -210, mood})}`};
  },
  rabbit(ctx, p, mood) {
    const body = ctx.lin([[0, p.lighter], [0.5, p.base], [1, p.dark]]);
    const droop = mood === 'sad' || mood === 'sleepy';
    const ear = (sx) => `<g transform="rotate(${sx * (droop ? 32 : 9)} ${sx * 26} -262)"><ellipse cx="${sx * 26}" cy="-322" rx="26" ry="66" fill="${body}"/><ellipse cx="${sx * 26}" cy="-318" rx="13" ry="48" fill="#F6B3C2"/></g>`;
    return {h: 360, zz: [70, -300], svg: `${ear(-1)}${ear(1)}
<circle cx="-74" cy="-58" r="24" fill="${p.lighter}"/>
<ellipse cx="0" cy="-96" rx="80" ry="92" fill="${body}"/>
<ellipse cx="0" cy="-80" rx="48" ry="60" fill="${p.lighter}" opacity=".85"/>
<ellipse cx="-40" cy="-10" rx="36" ry="17" fill="${p.light}"/><ellipse cx="40" cy="-10" rx="36" ry="17" fill="${p.light}"/>
<ellipse cx="-66" cy="-110" rx="18" ry="36" transform="rotate(18 -66 -110)" fill="${p.base}"/><ellipse cx="66" cy="-110" rx="18" ry="36" transform="rotate(-18 66 -110)" fill="${p.base}"/>
<circle cx="0" cy="-212" r="76" fill="${body}"/>
<ellipse cx="0" cy="-190" rx="30" ry="21" fill="${p.lighter}"/>
<path d="M-8 -200 Q0 -192 8 -200 Q0 -206 -8 -200 Z" fill="#E98FA3"/>
${face({x: 0, ey: -224, dx: 30, r: 13, my: -184, mood})}`};
  },
  bear(ctx, p, mood) {
    const body = ctx.lin([[0, p.light], [0.55, p.base], [1, p.dark]]);
    return {h: 305, zz: [80, -290], svg: `
<circle cx="-58" cy="-272" r="30" fill="${p.base}"/><circle cx="58" cy="-272" r="30" fill="${p.base}"/><circle cx="-58" cy="-272" r="15" fill="${p.lighter}"/><circle cx="58" cy="-272" r="15" fill="${p.lighter}"/>
<ellipse cx="0" cy="-102" rx="98" ry="100" fill="${body}"/>
<ellipse cx="0" cy="-86" rx="58" ry="64" fill="${p.lighter}" opacity=".8"/>
<ellipse cx="-88" cy="-122" rx="27" ry="50" transform="rotate(20 -88 -122)" fill="${p.base}"/><ellipse cx="88" cy="-122" rx="27" ry="50" transform="rotate(-20 88 -122)" fill="${p.base}"/>
<ellipse cx="-48" cy="-14" rx="40" ry="24" fill="${p.dark}"/><ellipse cx="48" cy="-14" rx="40" ry="24" fill="${p.dark}"/>
<ellipse cx="-48" cy="-12" rx="18" ry="11" fill="${p.lighter}" opacity=".8"/><ellipse cx="48" cy="-12" rx="18" ry="11" fill="${p.lighter}" opacity=".8"/>
<circle cx="0" cy="-212" r="82" fill="${body}"/>
<ellipse cx="0" cy="-184" rx="36" ry="27" fill="${p.lighter}"/>
<ellipse cx="0" cy="-196" rx="13" ry="9" fill="${INK}"/>
${face({x: 0, ey: -228, dx: 34, r: 13, my: -178, mood})}`};
  },
  cat(ctx, p, mood) {
    const body = ctx.lin([[0, p.light], [0.55, p.base], [1, p.dark]]);
    const ear = (sx) => `<path d="M${sx * 76} -228 L${sx * 64} -306 L${sx * 18} -264 Z" fill="${p.base}" stroke="${p.base}" stroke-width="16" stroke-linejoin="round"/><path d="M${sx * 62} -240 L${sx * 58} -284 L${sx * 32} -262 Z" fill="#F6B3C2" stroke="#F6B3C2" stroke-width="6" stroke-linejoin="round"/>`;
    const wh = (sx) => [-6, 4, 14].map((dy) => `<path d="M${sx * 52} ${-192 + dy} L${sx * 104} ${-200 + dy * 1.6}" stroke="${p.lighter}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`).join('');
    return {h: 300, zz: [80, -290], svg: `
<path d="M50 -40 C150 -40 170 -150 128 -206 C116 -222 96 -210 104 -194 C134 -140 122 -78 52 -74 Z" fill="${p.dark}"/>
<ellipse cx="0" cy="-94" rx="76" ry="92" fill="${body}"/>
<ellipse cx="0" cy="-80" rx="44" ry="60" fill="${p.lighter}" opacity=".85"/>
<ellipse cx="-38" cy="-10" rx="30" ry="16" fill="${p.light}"/><ellipse cx="38" cy="-10" rx="30" ry="16" fill="${p.light}"/>
${ear(-1)}${ear(1)}
<ellipse cx="0" cy="-208" rx="88" ry="74" fill="${body}"/>
<path d="M-10 -250 L0 -272 L10 -250 Z" fill="${p.dark}" stroke="${p.dark}" stroke-width="6" stroke-linejoin="round" opacity=".5"/><path d="M-86 -214 L-66 -212 M-84 -198 L-64 -200 M86 -214 L66 -212 M84 -198 L64 -200" stroke="${p.dark}" stroke-width="6" stroke-linecap="round" opacity=".45"/>
<path d="M-9 -196 L9 -196 L0 -186 Z" fill="#E98FA3" stroke="#E98FA3" stroke-width="4" stroke-linejoin="round"/>
${wh(-1)}${wh(1)}
${face({x: 0, ey: -214, dx: 33, r: 13, my: -180, mood})}`};
  },
  owl(ctx, p, mood) {
    const body = ctx.lin([[0, p.light], [0.6, p.base], [1, p.dark]]);
    const scal = [[-30, -120], [0, -112], [30, -120], [-15, -88], [15, -88], [-30, -58], [0, -52], [30, -58]].map(([x, y]) => `<path d="M${x - 11} ${y} Q${x} ${y + 12} ${x + 11} ${y}" fill="none" stroke="${p.base}" stroke-width="5" stroke-linecap="round" opacity=".6"/>`).join('');
    return {h: 300, zz: [90, -270], svg: `
<path d="M-76 -232 L-92 -296 L-34 -258 Z" fill="${p.dark}" stroke="${p.dark}" stroke-width="12" stroke-linejoin="round"/><path d="M76 -232 L92 -296 L34 -258 Z" fill="${p.dark}" stroke="${p.dark}" stroke-width="12" stroke-linejoin="round"/>
<ellipse cx="0" cy="-132" rx="98" ry="132" fill="${body}"/>
<ellipse cx="-92" cy="-118" rx="30" ry="72" transform="rotate(14 -92 -118)" fill="${p.dark}"/><ellipse cx="92" cy="-118" rx="30" ry="72" transform="rotate(-14 92 -118)" fill="${p.dark}"/>
<ellipse cx="0" cy="-92" rx="62" ry="78" fill="${p.lighter}" opacity=".9"/>${scal}
<circle cx="-42" cy="-190" r="40" fill="#FFF4E2"/><circle cx="42" cy="-190" r="40" fill="#FFF4E2"/>
<path d="M-12 -170 L12 -170 L0 -148 Z" fill="#F2A541" stroke="#F2A541" stroke-width="8" stroke-linejoin="round"/>
<g fill="#F2A541"><ellipse cx="-32" cy="-4" rx="20" ry="9"/><ellipse cx="32" cy="-4" rx="20" ry="9"/></g>
${face({x: 0, ey: -190, dx: 42, r: 19, my: -150, mood, mouth: mood === 'surprised' || mood === 'excited'})}`};
  },
  whale(ctx, p, mood) {
    const body = ctx.lin([[0, p.light], [0.6, p.base], [1, p.dark]]);
    const spout = mood === 'happy' || mood === 'excited' ? `<g fill="none" stroke="#C9F0FA" stroke-width="10" stroke-linecap="round"><path d="M118 -206 Q112 -262 74 -280"/><path d="M118 -206 L118 -292"/><path d="M118 -206 Q124 -262 162 -280"/></g><g fill="#C9F0FA"><circle cx="66" cy="-288" r="9"/><circle cx="118" cy="-304" r="10"/><circle cx="170" cy="-288" r="9"/></g>` : '';
    return {h: 230, zz: [190, -210], svg: `${spout}
<path d="M-190 -92 C-226 -100 -250 -128 -272 -168 C-246 -166 -230 -150 -222 -134 C-236 -150 -270 -150 -300 -138 C-268 -112 -236 -82 -186 -60 Z" fill="${p.dark}"/>
<path d="M-205 -92 C-205 -186 -60 -212 44 -204 C162 -194 214 -132 214 -76 C214 -24 160 0 66 0 L-120 0 C-176 0 -205 -42 -205 -92 Z" fill="${body}"/>
<path d="M-120 -2 C-60 22 120 20 196 -40 C170 -10 120 -2 66 -2 Z" fill="${p.lighter}" opacity=".85"/>
${[-60, -20, 20, 60, 100].map((x) => `<path d="M${x} -6 q6 -10 12 -22" stroke="${p.base}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".5"/>`).join('')}
<ellipse cx="30" cy="-46" rx="42" ry="18" transform="rotate(28 30 -46)" fill="${p.dark}"/>
<ellipse cx="-20" cy="-170" rx="60" ry="16" fill="#fff" opacity=".18"/>
${face({x: 120, ey: -112, dx: 34, r: 13, my: -74, mood})}`};
  },
  fish(ctx, p, mood) {
    const body = ctx.lin([[0, p.light], [0.6, p.base], [1, p.dark]]);
    return {h: 130, zz: [60, -130], svg: `
<path d="M-62 -62 L-128 -110 Q-112 -62 -128 -14 Z" fill="${p.dark}" stroke="${p.dark}" stroke-width="14" stroke-linejoin="round"/>
<path d="M-10 -108 Q20 -150 54 -104 Z" fill="${p.dark}"/>
<ellipse cx="0" cy="-62" rx="86" ry="56" fill="${body}"/>
<path d="M-30 -112 Q-14 -62 -30 -12 M-2 -116 Q14 -62 -2 -8" stroke="${p.lighter}" stroke-width="10" fill="none" opacity=".7" stroke-linecap="round"/>
<ellipse cx="10" cy="-44" rx="16" ry="9" transform="rotate(-20 10 -44)" fill="${p.dark}"/>
${face({x: 44, ey: -72, dx: 18, r: 10, my: -46, mood})}`};
  },
  bird(ctx, p, mood) {
    const body = ctx.lin([[0, p.light], [0.6, p.base], [1, p.dark]]);
    return {h: 220, zz: [70, -210], svg: `
<path d="M-6 -6 L-6 -34 M18 -6 L18 -34" stroke="#E8963C" stroke-width="7" stroke-linecap="round"/><path d="M-20 -4 L8 -4 M4 -4 L32 -4" stroke="#E8963C" stroke-width="7" stroke-linecap="round"/>
<path d="M-70 -80 L-128 -112 L-120 -70 Z" fill="${p.dark}" stroke="${p.dark}" stroke-width="12" stroke-linejoin="round"/>
<path d="M-4 -176 Q-10 -206 8 -214 Q4 -196 12 -180 Z M8 -178 Q18 -204 36 -204 Q22 -192 22 -176 Z" fill="${p.dark}"/>
<circle cx="0" cy="-98" r="84" fill="${body}"/>
<ellipse cx="8" cy="-70" rx="54" ry="48" fill="${p.lighter}" opacity=".85"/>
<ellipse cx="-50" cy="-96" rx="34" ry="52" transform="rotate(-22 -50 -96)" fill="${p.dark}"/>
<path d="M-12 -112 L12 -112 L0 -92 Z" fill="#F2A541" stroke="#F2A541" stroke-width="8" stroke-linejoin="round"/>
${face({x: 0, ey: -128, dx: 30, r: 12, my: -96, mood, mouth: false})}`};
  },
  robot(ctx, p, mood) {
    const body = ctx.lin([[0, p.lighter], [0.5, p.base], [1, p.dark]]);
    const glow = '#86F2E4';
    return {h: 350, zz: [110, -340], svg: `
<rect x="-66" y="-34" width="48" height="34" rx="14" fill="${p.darker}"/><rect x="18" y="-34" width="48" height="34" rx="14" fill="${p.darker}"/>
<path d="M-76 -128 q-40 10 -44 56" fill="none" stroke="${p.dark}" stroke-width="20" stroke-linecap="round"/><circle cx="-120" cy="-66" r="16" fill="${p.darker}"/>
<path d="M76 -128 q40 10 44 56" fill="none" stroke="${p.dark}" stroke-width="20" stroke-linecap="round"/><circle cx="120" cy="-66" r="16" fill="${p.darker}"/>
<rect x="-78" y="-172" width="156" height="142" rx="34" fill="${body}"/>
<rect x="-46" y="-140" width="92" height="66" rx="16" fill="${p.lighter}" opacity=".75"/>
<circle cx="-22" cy="-107" r="10" fill="#F5C451"/><circle cx="2" cy="-107" r="10" fill="#4CC9B8"/><circle cx="26" cy="-107" r="10" fill="#F27C8E"/>
<rect x="-18" y="-190" width="36" height="24" rx="8" fill="${p.dark}"/>
<path d="M0 -318 L0 -350" stroke="${p.dark}" stroke-width="8" stroke-linecap="round"/><circle cx="0" cy="-356" r="14" fill="#F5C451"/><circle cx="0" cy="-356" r="26" fill="#F5C451" opacity=".25"/>
<rect x="-92" y="-322" width="184" height="138" rx="44" fill="${body}"/>
<rect x="-70" y="-300" width="140" height="94" rx="28" fill="#1C2742"/>
<rect x="-60" y="-294" width="70" height="12" rx="6" fill="#fff" opacity=".12"/>
${face({x: 0, ey: -258, dx: 32, r: 14, my: -228, mood, ink: glow})}`};
  },
};

// ---------- backdrops: sky part and land part, with the ground line ----------
function hills(w, h, baseY, amp, n, rand) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([-60 + (w + 120) * i / n, baseY - amp * (0.35 + 0.65 * rand())]);
  return `${smooth(pts)} L${w + 60} ${h + 10} L-60 ${h + 10} Z`;
}
function starField(w, top, bottom, rand, count, color = '#FFF6DA', alpha = 1) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = top + rand() * (bottom - top), big = rand() < 0.16, r = big ? 7 + rand() * 7 : 1.6 + rand() * 2.6;
    s += big
      ? `<path d="M${r1(x)} ${r1(y - r)} Q${r1(x)} ${r1(y)} ${r1(x + r)} ${r1(y)} Q${r1(x)} ${r1(y)} ${r1(x)} ${r1(y + r)} Q${r1(x)} ${r1(y)} ${r1(x - r)} ${r1(y)} Q${r1(x)} ${r1(y)} ${r1(x)} ${r1(y - r)} Z" fill="${color}" opacity="${r1(alpha * (0.75 + rand() * 0.25) * 100) / 100}"/>`
      : `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${color}" opacity="${r1(alpha * (0.45 + rand() * 0.5) * 100) / 100}"/>`;
  }
  return s;
}

const LOOK = {
  day: {sky: ['#9CD2EE', '#CBE8F3', '#F7F0DA'], far: '#BFE0B8', mid: '#97CB90', near: ['#86C47B', '#6AA662'], tree: ['#5FAE6E', '#7CC482', '#4C985C'], cloud: '#FFFFFF', gy: 0.78},
  night: {sky: ['#0A1330', '#1B2B58', '#3A4A7C'], far: '#2B3C69', mid: '#22325B', near: ['#1E2C50', '#16213F'], tree: ['#2D4A6A', '#3A5B7E', '#25405E'], cloud: '#3E4F82', gy: 0.78},
  sunset: {sky: ['#5D4C8C', '#D0738F', '#F7A86E', '#FBD593'], far: '#9A6390', mid: '#79507F', near: ['#64446F', '#4F3659'], tree: ['#6B4A78', '#83598C', '#5A3D66'], cloud: '#F9CDB6', gy: 0.78},
  space: {sky: ['#06061A', '#141038', '#2A1F5E'], far: '#3B3270', mid: '#2C2559', near: ['#4A4180', '#2E275C'], tree: ['#3B3270', '#4A4180', '#2C2559'], cloud: '#5A4F96', gy: 0.9, float: true},
  sea: {sky: ['#8FE0E6', '#3FA7C4', '#1D5E8E'], far: '#2E7DA6', mid: '#25709A', near: ['#F2DCA8', '#E1C186'], tree: ['#3FA77A', '#58BF8C', '#2F8F68'], cloud: '#FFFFFF', gy: 0.9},
  forest: {sky: ['#F4ECC8', '#DDE9C0', '#C3DCA8'], far: '#AFCB97', mid: '#8DB67B', near: ['#77A55B', '#5E8A47'], tree: ['#4F8F52', '#6AAE62', '#3E7A45'], cloud: '#FFFFFF', gy: 0.8},
  room: {sky: ['#13214A', '#24376A', '#34497E'], far: '#F5E5CF', mid: '#EAD2B3', near: ['#C99A6E', '#A87650'], tree: ['#5FAE6E', '#7CC482', '#4C985C'], cloud: '#3E4F82', gy: 0.88},
  snow: {sky: ['#B8CDE6', '#DFE9F4', '#F6F8FC'], far: '#E4ECF6', mid: '#EEF3FA', near: ['#FBFDFF', '#E4ECF6'], tree: ['#5E8C7A', '#73A08D', '#4C7868'], cloud: '#FFFFFF', gy: 0.78},
  rain: {sky: ['#6B7B92', '#93A3B7', '#B8C3CF'], far: '#7A9586', mid: '#62816E', near: ['#547560', '#435F4E'], tree: ['#4F7A62', '#618D73', '#3F6853'], cloud: '#8A97AA', gy: 0.8},
};

function skyLayer(ctx, b, L, w, h, rand) {
  const st = L.sky.map((c, i) => [i / (L.sky.length - 1), c]);
  if (b === 'space') {
    return `<rect width="${w}" height="${h}" fill="${ctx.rad([[0, L.sky[2]], [0.55, L.sky[1]], [1, L.sky[0]]], {cx: 0.35, cy: 0.35, r: 0.9})}"/>
<g filter="url(#${ctx.id('soft')})" opacity=".55"><ellipse cx="${w * 0.72}" cy="${h * 0.3}" rx="${w * 0.22}" ry="${h * 0.12}" fill="#C45BA0"/><ellipse cx="${w * 0.25}" cy="${h * 0.55}" rx="${w * 0.2}" ry="${h * 0.1}" fill="#3FA7B8"/></g>
${starField(w, 0, h, rand, 140)}`;
  }
  if (b === 'sea') {
    const rays = [0.15, 0.4, 0.62, 0.85].map((x) => `<path d="M${w * x - 40} 0 L${w * x + 40} 0 L${w * x + 160} ${h} L${w * x - 60} ${h} Z" fill="#FFFFFF" opacity=".07"/>`).join('');
    const surf = smooth(Array.from({length: 13}, (_, i) => [-40 + (w + 80) * i / 12, h * 0.06 + (i % 2 ? 10 : -6)]));
    return `<rect width="${w}" height="${h}" fill="${ctx.lin(st)}"/>${rays}<path d="${surf} L${w + 40} 0 L-40 0 Z" fill="#CFF4F6" opacity=".55"/>`;
  }
  if (b === 'room') {
    const stripes = Array.from({length: Math.ceil(w / 90)}, (_, i) => `<rect x="${i * 90}" y="0" width="36" height="${h}" fill="#E8D3B5" opacity=".35"/>`).join('');
    return `<rect width="${w}" height="${h}" fill="${ctx.lin([[0, L.far], [1, L.mid]])}"/>${stripes}`;
  }
  let s = `<rect width="${w}" height="${h}" fill="${ctx.lin(st)}"/>`;
  if (b === 'night') s += starField(w, 0, h * 0.55, rand, 46, '#FFF6DA', 0.7) + `<ellipse cx="${w / 2}" cy="${h * 0.78}" rx="${w * 0.7}" ry="${h * 0.22}" fill="#5D6FA8" opacity=".25" filter="url(#${ctx.id('soft')})"/>`;
  if (b === 'sunset') s += `<circle cx="${w * 0.5}" cy="${h * 0.74}" r="${h * 0.16}" fill="#FFE2A0" opacity=".85"/><circle cx="${w * 0.5}" cy="${h * 0.74}" r="${h * 0.3}" fill="#FFD08A" opacity=".25"/>`;
  if (b === 'forest') s += [0.2, 0.55, 0.8].map((x) => `<path d="M${w * x} 0 L${w * x + 90} 0 L${w * x + 260} ${h} L${w * x + 60} ${h} Z" fill="#FFF3C0" opacity=".16"/>`).join('');
  return s;
}

function landLayer(ctx, b, L, w, h, rand) {
  const gy = h * L.gy;
  if (b === 'space') {
    // the curve of a small planet at the bottom, with craters
    const R = w * 1.4;
    const craters = [0.18, 0.42, 0.7, 0.88].map((x) => `<ellipse cx="${w * x}" cy="${gy + h * 0.06 + rand() * h * 0.02}" rx="${40 + rand() * 40}" ry="${12 + rand() * 8}" fill="#2B2458" opacity=".7"/>`).join('');
    return `<circle cx="${w / 2}" cy="${gy + R - h * 0.04}" r="${R}" fill="${ctx.lin([[0, L.near[0]], [0.15, L.near[1]]])}"/><circle cx="${w / 2}" cy="${gy + R - h * 0.04}" r="${R}" fill="none" stroke="#8C80D8" stroke-width="4" opacity=".5"/>${craters}`;
  }
  if (b === 'room') {
    const winX = w * 0.6, winY = h * 0.12, winW = w * 0.28, winH = h * 0.38;
    const planks = Array.from({length: 7}, (_, i) => `<path d="M0 ${r1(h * 0.74 + i * h * 0.04 + i * i * 1.5)} L${w} ${r1(h * 0.74 + i * h * 0.04 + i * i * 1.5)}" stroke="#8E5E3E" stroke-width="2" opacity=".25"/>`).join('');
    return `<rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="${ctx.lin(L.near.map((c, i) => [i, c]))}"/>${planks}
<rect x="0" y="${h * 0.70}" width="${w}" height="${h * 0.03}" fill="#E2C49F"/>
<ellipse cx="${w * 0.5}" cy="${h * 0.9}" rx="${w * 0.36}" ry="${h * 0.07}" fill="#D6892A" opacity=".55"/><ellipse cx="${w * 0.5}" cy="${h * 0.9}" rx="${w * 0.3}" ry="${h * 0.05}" fill="none" stroke="#F3D7A6" stroke-width="5" stroke-dasharray="14 12" opacity=".7"/>
<g><rect x="${winX - 7}" y="${winY - 7}" width="${winW + 14}" height="${winH + 14}" rx="14" fill="none" stroke="#FFF8EE" stroke-width="16"/><path d="M${winX + winW / 2} ${winY} L${winX + winW / 2} ${winY + winH} M${winX} ${winY + winH / 2} L${winX + winW} ${winY + winH / 2}" stroke="#FFF8EE" stroke-width="12"/></g>
<path d="M${winX - 40} ${winY - 30} Q${winX - 10} ${winY + winH * 0.6} ${winX - 60} ${winY + winH + 40} L${winX - 90} ${winY + winH + 40} L${winX - 90} ${winY - 30} Z" fill="#C9735E"/>
<path d="M${winX + winW + 40} ${winY - 30} Q${winX + winW + 10} ${winY + winH * 0.6} ${winX + winW + 60} ${winY + winH + 40} L${winX + winW + 90} ${winY + winH + 40} L${winX + winW + 90} ${winY - 30} Z" fill="#C9735E"/>
<rect x="${winX - 100}" y="${winY - 40}" width="${winW + 200}" height="16" rx="8" fill="#8E5E3E"/>`;
  }
  let s = `<path d="${hills(w, h, gy - h * 0.12, h * 0.16, 5, rand)}" fill="${L.far}"/>`;
  if (b === 'forest') {
    for (let i = 0; i < 12; i++) { const x = (i + rand() * 0.6) * w / 11, s2 = 0.6 + rand() * 0.5; s += pineShape(x, gy - h * 0.06, s2 * h / 1200, [L.far, mix(L.far, '#3E6B45', 0.25), L.far]); }
  }
  s += `<path d="${hills(w, h, gy - h * 0.05, h * 0.09, 4, rand)}" fill="${L.mid}"/>`;
  if (b === 'sea') {
    s += `<path d="${hills(w, h, gy, h * 0.05, 5, rand)}" fill="${ctx.lin(L.near.map((c, i) => [i, c]))}"/>`;
    for (const x of [0.06, 0.13, 0.9, 0.96]) s += seaweed(x * w, gy + h * 0.02, h / 1200, rand);
    return s;
  }
  s += `<path d="${smooth(Array.from({length: 7}, (_, i) => [-60 + (w + 120) * i / 6, gy + (i % 2 ? -h * 0.012 : h * 0.008)]))} L${w + 60} ${h + 10} L-60 ${h + 10} Z" fill="${ctx.lin(L.near.map((c, i) => [i, c]))}"/>`;
  if (b === 'snow') s += `<path d="${smooth(Array.from({length: 7}, (_, i) => [-60 + (w + 120) * i / 6, gy + h * 0.02 + (i % 2 ? -h * 0.01 : h * 0.01)]))}" fill="none" stroke="#C9D8EC" stroke-width="5" opacity=".7"/>`;
  return s;
}

function seaweed(x, y, k, rand) {
  let s = '';
  for (let j = 0; j < 3; j++) {
    const hh = (180 + rand() * 160) * k, ox = (j - 1) * 22 * k, pts = [];
    for (let i = 0; i <= 5; i++) pts.push([x + ox + Math.sin(i * 1.3 + j) * 18 * k, y - hh * i / 5]);
    s += `<path d="${smooth(pts)}" fill="none" stroke="${['#3FA77A', '#58BF8C', '#2F8F68'][j]}" stroke-width="${r1(16 * k)}" stroke-linecap="round"/>`;
  }
  return s;
}

// ---------- props ----------
function pineShape(x, y, k, cols, snowy = false) {
  const tiers = [[0, 150, 120], [-80, 120, 96], [-150, 90, 72]];
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${r1(k * 100) / 100})"><rect x="-12" y="-30" width="24" height="40" rx="8" fill="#7A5236"/>` + tiers.map(([dy, wd, ht], i) => `<path d="M${-wd} ${dy - 10} L0 ${dy - 10 - ht * 1.5} L${wd} ${dy - 10} Z" fill="${cols[i % cols.length]}" stroke="${cols[i % cols.length]}" stroke-width="22" stroke-linejoin="round"/>${snowy ? `<path d="M${-wd * 0.45} ${dy - 10 - ht * 0.85} L0 ${dy - 10 - ht * 1.5} L${wd * 0.45} ${dy - 10 - ht * 0.85} Q0 ${dy - ht * 0.9} ${-wd * 0.45} ${dy - 10 - ht * 0.85} Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="14" stroke-linejoin="round"/>` : ''}`).join('') + '</g>';
}
const G = (x, y, k, body) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${r1(k * 1000) / 1000})">${body}</g>`;

const PROP = {
  moon(ctx, x, y, k) {
    const m = ctx.uid('m');
    ctx.defs.push(`<mask id="${m}"><rect x="-200" y="-200" width="400" height="400" fill="#fff"/><circle cx="34" cy="-22" r="64" fill="#000"/></mask>`);
    return G(x, y, k, `<circle r="190" fill="${ctx.rad([[0, '#FFF3CF', 0.55], [1, '#FFF3CF', 0]])}"/><circle r="74" fill="${ctx.lin([[0, '#FFF8E0'], [1, '#F3D58A']])}" mask="url(#${m})"/><circle cx="-34" cy="22" r="9" fill="#E8C878" opacity=".5"/><circle cx="-14" cy="44" r="6" fill="#E8C878" opacity=".5"/>`);
  },
  sun(ctx, x, y, k) { return G(x, y, k, `<circle r="230" fill="${ctx.rad([[0, '#FFE9A8', 0.75], [1, '#FFE9A8', 0]])}"/><circle r="84" fill="${ctx.rad([[0, '#FFF6CF'], [1, '#FFC24D']])}"/>`); },
  'star-big'(ctx, x, y, k) {
    const pts = Array.from({length: 10}, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 34 : 80; return `${r1(Math.cos(a) * r)} ${r1(Math.sin(a) * r)}`; }).join(' L');
    return G(x, y, k, `<circle r="170" fill="${ctx.rad([[0, '#FFF0B8', 0.6], [1, '#FFF0B8', 0]])}"/><path d="M${pts} Z" fill="#FFE07A" stroke="#FFE07A" stroke-width="22" stroke-linejoin="round"/><path d="M${pts} Z" transform="scale(.55)" fill="#FFF4C8" opacity=".6"/>`);
  },
  cloud(ctx, x, y, k, L) {
    const c = L.cloud;
    return G(x, y, k, `<g fill="${c}" opacity=".95"><circle cx="0" cy="0" r="58"/><circle cx="-62" cy="18" r="42"/><circle cx="62" cy="16" r="46"/><circle cx="28" cy="-30" r="44"/><rect x="-100" y="10" width="205" height="50" rx="25"/></g><path d="M-100 44 Q0 70 105 44 L105 60 L-100 60 Z" fill="${mix(c, '#7C8DB5', 0.18)}" opacity=".55"/>`);
  },
  rainbow(ctx, x, y, k) {
    const cols = ['#F28B82', '#F6B26B', '#FFE08A', '#9FD8A0', '#8EC5E8', '#B39DDB'];
    return G(x, y, k, cols.map((c, i) => { const R = 520 - i * 26; return `<path d="M${-R} 0 A${R} ${R} 0 0 1 ${R} 0" fill="none" stroke="${c}" stroke-width="27" opacity=".62"/>`; }).join(''));
  },
  comet(ctx, x, y, k) { return G(x, y, k, `<path d="M0 -16 L-320 -110 Q-330 -100 -322 -92 L0 16 Z" fill="${ctx.lin([[0, '#FFF6DA', 0], [1, '#FFF6DA', 0.85]], {x1: 0, y1: 0, x2: 1, y2: 0})}"/><circle r="60" fill="${ctx.rad([[0, '#FFFFFF', 0.7], [1, '#FFFFFF', 0]])}"/><circle r="18" fill="#FFFDF2"/>`); },
  planet(ctx, x, y, k) {
    const ring = (sweep) => `<path d="M-128 0 A128 28 0 0 ${sweep} 128 0" fill="none" stroke="#FFE3B0" stroke-width="12" opacity=".9"/>`;
    return G(x, y, k, `<g transform="rotate(-18)">${ring(1)}<circle r="72" fill="${ctx.lin([[0, '#F9C77E'], [1, '#C65E86']], {x1: 0, y1: 0, x2: 1, y2: 1})}"/><path d="M-70 -14 Q0 -2 70 -16 M-62 22 Q0 34 62 20" stroke="#fff" stroke-width="8" opacity=".18" fill="none"/>${ring(0)}</g><circle cx="190" cy="80" r="26" fill="${ctx.lin([[0, '#9FE3E0'], [1, '#4C8FB8']])}"/>`);
  },
  rocket(ctx, x, y, k) {
    return G(x, y, k, `<g transform="rotate(32)"><path d="M-24 54 Q0 170 24 54 Z" fill="${ctx.lin([[0, '#FFE58A'], [0.5, '#F7A14A'], [1, '#F26B5B', 0]])}"/><path d="M-14 54 Q0 120 14 54 Z" fill="#FFF6C8"/>
<path d="M0 -112 C42 -82 46 -20 40 52 L-40 52 C-46 -20 -42 -82 0 -112 Z" fill="${ctx.lin([[0, '#FFFFFF'], [1, '#D9D2EC']], {x1: 0, y1: 0, x2: 1, y2: 0})}"/>
<path d="M0 -112 C24 -94 34 -72 38 -56 L-38 -56 C-34 -72 -24 -94 0 -112 Z" fill="#E86A62"/>
<path d="M-40 14 L-74 72 L-40 54 Z M40 14 L74 72 L40 54 Z" fill="#E86A62" stroke="#E86A62" stroke-width="8" stroke-linejoin="round"/>
<circle cy="-18" r="22" fill="#6CC6E6" stroke="#A9B2C3" stroke-width="7"/><circle cx="-7" cy="-25" r="7" fill="#fff" opacity=".8"/><rect x="-26" y="50" width="52" height="12" rx="6" fill="#8C95A8"/></g>`);
  },
  mountain(ctx, x, y, k, L, w, h) {
    const c1 = mix(L.far, L.sky[L.sky.length - 1], 0.35), c2 = mix(L.far, '#4A5A7E', 0.12);
    const peaks = [[0.18, 0.36, c1], [0.5, 0.46, c2], [0.8, 0.34, c1]];
    return peaks.map(([px, ph, c]) => { const bx = px * w, top = y - ph * h, half = h * 0.42; return `<path d="M${r1(bx - half)} ${r1(y)} L${r1(bx - 30)} ${r1(top + 20)} Q${r1(bx)} ${r1(top - 6)} ${r1(bx + 30)} ${r1(top + 20)} L${r1(bx + half)} ${r1(y)} Z" fill="${c}"/><path d="M${r1(bx - 30 - half * 0.16)} ${r1(top + 20 + ph * h * 0.16)} L${r1(bx - 30)} ${r1(top + 20)} Q${r1(bx)} ${r1(top - 6)} ${r1(bx + 30)} ${r1(top + 20)} L${r1(bx + 30 + half * 0.16)} ${r1(top + 20 + ph * h * 0.16)} Q${r1(bx)} ${r1(top + 20 + ph * h * 0.08)} ${r1(bx - 30 - half * 0.16)} ${r1(top + 20 + ph * h * 0.16)} Z" fill="#FFFFFF" opacity=".88"/>`; }).join('');
  },
  volcano(ctx, x, y, k) {
    return G(x, y, k, `<g fill="#B9B2C2" opacity=".85"><circle cx="-10" cy="-330" r="40"/><circle cx="34" cy="-380" r="52"/><circle cx="-24" cy="-430" r="44"/></g>
<path d="M-230 0 L-66 -268 Q0 -284 66 -268 L230 0 Z" fill="${ctx.lin([[0, '#9B776A'], [1, '#6B4F47']])}"/>
<ellipse cy="-270" rx="66" ry="16" fill="#F25F3A"/><ellipse cy="-270" rx="120" ry="40" fill="#FF8A3D" opacity=".25"/>
<path d="M-40 -266 Q-60 -200 -34 -170 Q-20 -200 -12 -262 Z M26 -266 Q44 -220 30 -190 Q16 -220 8 -262 Z" fill="#F7843B"/>`);
  },
  tree(ctx, x, y, k, L) {
    const [a, b2, c] = L.tree;
    return G(x, y, k, `<rect x="-18" y="-160" width="36" height="166" rx="14" fill="#8A5A3B"/><circle cx="0" cy="-250" r="105" fill="${c}"/><circle cx="-72" cy="-200" r="72" fill="${a}"/><circle cx="74" cy="-206" r="76" fill="${a}"/><circle cx="-10" cy="-290" r="82" fill="${b2}"/><circle cx="30" cy="-210" r="64" fill="${b2}" opacity=".8"/><circle cx="-36" cy="-316" r="30" fill="#fff" opacity=".12"/>`);
  },
  pine(ctx, x, y, k, L, w, h, b) { return pineShape(x, y, k * 1.3, L.tree, b === 'snow'); },
  house(ctx, x, y, k, L, w, h, b) {
    const lit = ['night', 'sunset', 'snow', 'rain'].includes(b);
    return G(x, y, k, `${lit ? `<circle cx="-40" cy="-90" r="120" fill="${ctx.rad([[0, '#FFD77A', 0.45], [1, '#FFD77A', 0]])}"/>` : ''}<rect x="54" y="-250" width="34" height="70" rx="6" fill="#A2553F"/>
<rect x="-110" y="-150" width="220" height="152" rx="10" fill="#F3E2C7"/>
<path d="M-136 -146 L0 -262 L136 -146 Z" fill="#C8644E" stroke="#C8644E" stroke-width="20" stroke-linejoin="round"/>${b === 'snow' ? '<path d="M-136 -146 L0 -262 L136 -146 Q0 -210 -136 -146 Z" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"/>' : ''}
<rect x="22" y="-92" width="50" height="94" rx="25" fill="#8A5A3B"/><rect x="-80" y="-112" width="66" height="56" rx="10" fill="${lit ? '#FFD77A' : '#BFE3F2'}"/><path d="M-47 -112 L-47 -56 M-80 -84 L-14 -84" stroke="#F3E2C7" stroke-width="6"/>`);
  },
  flower(ctx, x, y, k, L, w, h, b, rand) {
    const cols = ['#F291B5', '#FFE08A', '#FFFFFF', '#B39DDB', '#F6A26B'];
    let s = '';
    for (let i = 0; i < 5; i++) {
      const fx = (i - 2) * 46 + (rand() - 0.5) * 20, hh = 40 + rand() * 40, c = cols[(i + Math.floor(rand() * 5)) % 5];
      s += `<path d="M${r1(fx)} 0 Q${r1(fx - 6)} ${r1(-hh / 2)} ${r1(fx)} ${r1(-hh)}" stroke="#4E9A5F" stroke-width="5" fill="none"/><ellipse cx="${r1(fx + 10)}" cy="${r1(-hh / 2)}" rx="10" ry="5" fill="#5FAE6E" transform="rotate(-30 ${r1(fx + 10)} ${r1(-hh / 2)})"/>`;
      s += Array.from({length: 5}, (_, j) => { const a = j * 1.2566; return `<circle cx="${r1(fx + Math.cos(a) * 11)}" cy="${r1(-hh + Math.sin(a) * 11)}" r="10" fill="${c}"/>`; }).join('') + `<circle cx="${r1(fx)}" cy="${r1(-hh)}" r="7" fill="#F5B83D"/>`;
    }
    return G(x, y, k, s);
  },
  egg(ctx, x, y, k) {
    return G(x, y, k, `<ellipse cy="4" rx="70" ry="12" fill="#000" opacity=".16"/><path d="M0 -150 C52 -150 74 -70 70 -40 C66 -8 38 4 0 4 C-38 4 -66 -8 -70 -40 C-74 -70 -52 -150 0 -150 Z" fill="${ctx.lin([[0, '#FFFBF1'], [1, '#E9D9BD']], {x1: 0, y1: 0, x2: 1, y2: 1})}"/>
<g fill="#93CFA4" opacity=".8"><circle cx="-26" cy="-96" r="12"/><circle cx="24" cy="-60" r="16"/><circle cx="-34" cy="-34" r="9"/><circle cx="30" cy="-118" r="8"/></g>
<path d="M-48 -78 L-26 -90 L-12 -72 L6 -92 L22 -74 L44 -86" fill="none" stroke="#8C7B66" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`);
  },
  bed(ctx, x, y, k) {
    return G(x, y, k, `<rect x="-200" y="-230" width="40" height="232" rx="18" fill="#9C6A48"/><rect x="-196" y="-226" width="30" height="40" rx="12" fill="#B9845E"/>
<rect x="-180" y="-110" width="370" height="82" rx="22" fill="#F7F1E6"/><rect x="178" y="-130" width="30" height="132" rx="14" fill="#9C6A48"/>
<rect x="-170" y="-150" width="92" height="52" rx="24" fill="#FFFFFF"/>
<path d="M-70 -122 L176 -122 Q186 -60 176 -30 L-70 -30 Q-82 -76 -70 -122 Z" fill="#6F8FD6"/>
<path d="M-40 -122 L-40 -30 M10 -122 L10 -30 M60 -122 L60 -30 M110 -122 L110 -30 M160 -122 L160 -30" stroke="#F5CF5E" stroke-width="9" opacity=".7"/>
<rect x="-176" y="-30" width="20" height="32" rx="6" fill="#7E5236"/><rect x="164" y="-30" width="20" height="32" rx="6" fill="#7E5236"/>`);
  },
  lamp(ctx, x, y, k) {
    return G(x, y, k, `<circle cy="-300" r="240" fill="${ctx.rad([[0, '#FFD98A', 0.5], [1, '#FFD98A', 0]])}"/><ellipse cy="0" rx="56" ry="12" fill="#6E4A33"/><rect x="-7" y="-290" width="14" height="290" fill="#6E4A33"/>
<path d="M-74 -270 L-46 -360 L46 -360 L74 -270 Z" fill="#F6CF8A" stroke="#F6CF8A" stroke-width="12" stroke-linejoin="round"/><ellipse cy="-270" rx="74" ry="12" fill="#FFF1C9"/>`);
  },
  book(ctx, x, y, k) {
    const lines = (sx) => [0, 1, 2, 3].map((i) => `<path d="M${sx * 20} ${-48 + i * 12} L${sx * 78} ${-52 + i * 12}" stroke="#C9BFAE" stroke-width="4" stroke-linecap="round"/>`).join('');
    return G(x, y, k, `<ellipse cy="2" rx="110" ry="12" fill="#000" opacity=".15"/><path d="M-104 -8 L0 0 L104 -8 L100 -70 L0 -60 L-100 -70 Z" fill="#B5473F"/>
<path d="M0 -4 Q-50 -26 -96 -16 L-92 -78 Q-46 -88 0 -64 Z" fill="#FFFBF2"/><path d="M0 -4 Q50 -26 96 -16 L92 -78 Q46 -88 0 -64 Z" fill="#F6F0E4"/>${lines(-1)}${lines(1)}`);
  },
  boat(ctx, x, y, k) {
    return G(x, y, k, `<path d="M-120 -40 L120 -40 Q100 10 70 14 L-70 14 Q-100 10 -120 -40 Z" fill="#E86A62"/><path d="M-110 -34 L110 -34" stroke="#FFFFFF" stroke-width="7" opacity=".6"/><rect x="-5" y="-210" width="10" height="172" fill="#7A5236"/>
<path d="M10 -200 Q90 -120 100 -52 L10 -52 Z" fill="#FFFFFF"/><path d="M-10 -170 Q-70 -110 -80 -56 L-10 -56 Z" fill="#F5CF5E"/>`);
  },
  blanket(ctx, x, y, k) {
    const cols = ['#D6892A', '#3FB8AF', '#F291B5', '#F3E2C7'];
    let s = '<g transform="skewX(-12)">';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) s += `<rect x="${-150 + c * 60}" y="${-84 + r * 28}" width="60" height="28" fill="${cols[(r + c) % 4]}" opacity=".95"/>`;
    return G(x, y, k, `<ellipse cy="4" rx="190" ry="16" fill="#000" opacity=".14"/>${s}<rect x="-150" y="-84" width="300" height="84" fill="none" stroke="#FFF8EE" stroke-width="4" stroke-dasharray="10 8"/></g>`);
  },
  hill(ctx, x, y, k, L, w, h) {
    const top = y - h * 0.07;
    return `<path d="M-40 ${r1(y + h * 0.03)} C${r1(w * 0.18)} ${r1(y + h * 0.02)} ${r1(w * 0.3)} ${r1(top)} ${r1(w * 0.5)} ${r1(top)} C${r1(w * 0.7)} ${r1(top)} ${r1(w * 0.82)} ${r1(y + h * 0.02)} ${r1(w + 40)} ${r1(y + h * 0.03)} L${w + 40} ${h + 10} L-40 ${h + 10} Z" fill="${ctx.lin([[0, mix(L.near[0], L.sky[L.sky.length - 1], 0.4)], [0.3, mix(L.near[0], L.sky[L.sky.length - 1], 0.12)], [1, L.near[1]]])}"/>`;
  },
};
const SKY = ['stars', 'moon', 'sun', 'star-big', 'cloud', 'rainbow', 'comet', 'planet', 'rocket'];
const FAR = ['mountain', 'volcano'];
const BACK = ['tree', 'pine', 'house', 'bed', 'lamp'];
const FRONT = ['flower', 'egg', 'book', 'blanket', 'boat'];

function overlay(kind, w, h, rand) {
  let s = '';
  if (kind === 'snowflakes') for (let i = 0; i < 90; i++) s += `<circle cx="${r1(rand() * w)}" cy="${r1(rand() * h)}" r="${r1(2 + rand() * 6)}" fill="#FFFFFF" opacity="${r1((0.5 + rand() * 0.5) * 100) / 100}"/>`;
  if (kind === 'raindrops') for (let i = 0; i < 110; i++) { const x = rand() * w, y = rand() * h, l = 18 + rand() * 26; s += `<path d="M${r1(x)} ${r1(y)} l${r1(-l * 0.25)} ${r1(l)}" stroke="#E3ECF7" stroke-width="3" stroke-linecap="round" opacity=".55"/>`; }
  return s;
}

const SIZE = {small: 0.72, normal: 1, big: 1.28};
const SLOTS = {1: [0.5], 2: [0.34, 0.66], 3: [0.25, 0.5, 0.75], 4: [0.18, 0.39, 0.61, 0.82]};
const POS = {left: 0.28, center: 0.5, right: 0.72};
const SWIM = new Set(['whale', 'fish']);

export function sceneSvg(spec, {w = 1600, h = 1200, seed = 1} = {}) {
  const S = parseScene(spec);
  const b = BACKDROPS.includes(S.backdrop) ? S.backdrop : 'day';
  const L = LOOK[b];
  const P = 'sc' + hash(`${seed}|${JSON.stringify(S)}|${w}x${h}`) + '_';
  const ctx = makeCtx(P);
  const rand = rng(seed * 7919 + 13);
  const k = h / 1200; // size of things
  const gy = h * L.gy;
  const has = (n) => S.props.some((p) => p.name === n);
  ctx.defs.push(`<filter id="${P}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r1(40 * k)}"/></filter>`,
    `<filter id="${P}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r1(7 * k)}"/></filter>`,
    `<filter id="${P}grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed % 97}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.4 0 0 0 -0.12"/></filter>`);

  // sky props: in the room they go inside the window, smaller
  const room = b === 'room';
  const win = room ? {x: w * 0.6, y: h * 0.12, w: w * 0.28, h: h * 0.38} : null;
  const skyBox = room ? win : {x: 0, y: h * 0.04, w, h: gy - h * 0.2};
  const sk = room ? k * 0.5 : k;
  let sky = '';
  const at = (fx, fy) => [skyBox.x + skyBox.w * fx, skyBox.y + skyBox.h * fy];
  const moonSpot = has('sun') ? [0.82, 0.3] : [0.78, 0.3];
  for (const p of S.props.filter((x) => SKY.includes(x.name))) {
    const n = p.name;
    if (n === 'stars') sky += starField(skyBox.w, 0, skyBox.h, rand, room ? 20 : 60, '#FFF6DA', b === 'day' || b === 'forest' || b === 'snow' ? 0.0 : 1).replace(/^/, `<g transform="translate(${r1(skyBox.x)} ${r1(skyBox.y)})">`) + '</g>';
    else if (n === 'moon') sky += PROP.moon(ctx, ...at(...moonSpot), sk * (room ? 1.4 : 1.1));
    else if (n === 'sun') sky += PROP.sun(ctx, ...at(0.18, 0.32), sk);
    else if (n === 'star-big') sky += PROP['star-big'](ctx, ...at(has('moon') ? 0.5 : 0.62, 0.22), sk);
    else if (n === 'cloud') { const spots = has('moon') || has('sun') ? [[0.42, 0.28], [0.62, 0.62], [0.12, 0.7]] : [[0.22, 0.3], [0.6, 0.22], [0.86, 0.58]]; for (const [fx, fy] of spots) sky += PROP.cloud(ctx, ...at(fx, fy), sk * (0.75 + rand() * 0.4), L); }
    else if (n === 'rainbow') sky += room ? '' : PROP.rainbow(ctx, w * 0.5, gy - h * 0.06, k * 1.25);
    else if (n === 'comet') sky += PROP.comet(ctx, ...at(0.34, 0.2), sk);
    else if (n === 'planet') sky += PROP.planet(ctx, ...at(b === 'space' ? 0.76 : 0.2, b === 'space' ? 0.3 : 0.28), sk * (b === 'space' ? 1.4 : 0.9));
    else if (n === 'rocket') sky += PROP.rocket(ctx, ...at(b === 'space' ? 0.22 : 0.3, b === 'space' ? 0.3 : 0.36), sk * (b === 'space' ? 1.5 : 1.1));
  }
  if (room) {
    const clip = ctx.uid('c');
    ctx.defs.push(`<clipPath id="${clip}"><rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" rx="10"/></clipPath>`);
    sky = `<g clip-path="url(#${clip})"><rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="${ctx.lin(L.sky.map((c, i) => [i / (L.sky.length - 1), c]))}"/>${starField(win.w, 0, win.h, rand, 14).replace(/^/, `<g transform="translate(${r1(win.x)} ${r1(win.y)})">`)}</g>${sky}</g>`;
  }
  const far = S.props.filter((x) => FAR.includes(x.name)).map((p) => p.name === 'volcano' ? PROP.volcano(ctx, w * 0.72, gy - h * 0.08, k * 1.1) : PROP.mountain(ctx, 0, gy - h * 0.04, k, L, w, h)).join('');

  // characters: where they go
  const chars = S.chars.slice(0, 4);
  const slots = SLOTS[chars.length] || [];
  const free = slots.filter((s) => !chars.some((c) => c.pos && Math.abs(POS[c.pos] - s) < 0.12));
  const xs = chars.map((c) => (c.pos ? POS[c.pos] : free.shift() ?? 0.5));
  // ground props: as far from the characters as they can be
  const used = [];
  const spot = (cands) => {
    const pick = cands.find((x) => !used.includes(x) && xs.every((cx) => Math.abs(cx - x) > 0.14)) ?? cands.find((x) => !used.includes(x)) ?? cands[0];
    used.push(pick);
    return pick;
  };
  const backCands = room ? [0.16, 0.9, 0.08, 0.3] : [0.1, 0.9, 0.2, 0.8, 0.35, 0.65];
  const frontCands = [0.86, 0.14, 0.7, 0.3, 0.5];
  let back = '', front = '';
  if (has('hill')) back += PROP.hill(ctx, 0, gy, k, L, w, h);
  for (const p of S.props.filter((x) => BACK.includes(x.name))) {
    const fx = p.name === 'bed' ? (room ? 0.2 : spot(backCands)) : p.name === 'lamp' && room ? 0.92 : spot(backCands);
    const scale = {tree: 1.25, pine: 1.15, house: 1.05, bed: 1.25, lamp: 1.15}[p.name] * k;
    back += PROP[p.name](ctx, w * fx, gy - h * 0.01, scale, L, w, h, b, rand);
  }
  for (const p of S.props.filter((x) => FRONT.includes(x.name))) {
    if (p.name === 'boat' && b === 'sea') { back = PROP.boat(ctx, w * 0.7, h * 0.07, k * 0.9) + back; continue; }
    const fx = p.name === 'blanket' ? (room ? 0.5 : Math.min(0.8, Math.max(0.2, spot(frontCands)))) : spot(frontCands);
    front += PROP[p.name](ctx, w * fx, gy + h * (p.name === 'blanket' ? 0.02 : 0.045), k * ({flower: 1.1, blanket: 1.2}[p.name] || 1), L, w, h, b, rand);
  }

  let people = '';
  chars.forEach((c, i) => {
    const draw = C[c.name](ctx, pal(HEX[c.color] || HEX[DEFAULT_COLOR[c.name]]), c.mood);
    const unit = (h * 0.3) / 320;
    const ks = unit * SIZE[c.size || 'normal'] * ({whale: 1.05, fish: 0.95, bird: 0.95}[c.name] || 1);
    const x = w * xs[i];
    const floating = L.float || (b === 'sea' && SWIM.has(c.name));
    let y = floating ? (b === 'sea' ? h * 0.6 : h * (0.7 + (i % 2 ? -0.05 : 0.02))) : gy + h * 0.035 + (i % 2) * h * 0.012;
    if (!floating && has('hill')) y -= h * 0.06 * Math.max(0, 1 - Math.abs(xs[i] - 0.5) / 0.32);
    if (SWIM.has(c.name) && !floating) y = gy + h * 0.035;
    const flip = xs[i] > 0.55 && ['dino', 'whale', 'fish', 'bird', 'cat'].includes(c.name) ? -1 : 1;
    const tilt = L.float ? (i % 2 ? 8 : -6) : 0;
    if (!floating) people += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(115 * ks)}" ry="${r1(16 * ks)}" fill="#000" opacity=".2" filter="url(#${P}blur)"/>`;
    people += `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${tilt}) scale(${r1(ks * flip * 1000) / 1000} ${r1(ks * 1000) / 1000})">${draw.svg}</g>`;
    if (c.mood === 'sleepy') people += zzz(x + draw.zz[0] * ks * flip, y + draw.zz[1] * ks, ks * 1.2, b === 'day' || b === 'snow' || b === 'forest' ? '#6A6390' : '#FFFFFF');
  });

  const weather = (b === 'snow' || has('snowflakes') ? overlay('snowflakes', w, h, rand) : '') + (b === 'rain' || has('raindrops') ? overlay('raindrops', w, h, rand) : '');
  const bubbles = b === 'sea' ? Array.from({length: 18}, () => `<circle cx="${r1(rand() * w)}" cy="${r1(h * 0.1 + rand() * h * 0.7)}" r="${r1((4 + rand() * 12) * k)}" fill="none" stroke="#E6FBFF" stroke-width="${r1(3 * k)}" opacity=".5"/>`).join('') : '';
  const vignette = `<rect width="${w}" height="${h}" fill="${ctx.rad([[0.55, '#1A1030', 0], [1, '#1A1030', b === 'night' || b === 'space' ? 0.45 : 0.22]], {r: 0.75})}"/>`;

  // layers first: they add gradients to the defs
  const skyL = skyLayer(ctx, b, L, w, h, rand);
  const landL = landLayer(ctx, b, L, w, h, rand);
  const body = `${skyL}\n${room ? sky + landL : sky + far + landL}\n${back}${bubbles}${people}${front}${weather}${vignette}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${ctx.defs.join('')}</defs>
${body}
<rect width="${w}" height="${h}" filter="url(#${P}grain)" opacity=".55"/></svg>`;
}
