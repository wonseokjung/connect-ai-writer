// Renders the CONNECT AI LAB 20x20 16-bit pixel Jiphyeonjeon Writer Scholar (4 expressions)
// Pixel-identical DNA to CONNECT AI HQ's PixelCrew (SEONBI silhouette x Jade-Teal Scholar palette).
// Run: node scripts/render-scholar.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'skill', 'assets', 'scholar');

export const SCHOLAR_SPRITE = {
  id: 'writer_scholar',
  name: '집현전 글쓰기 학사',
  pattern: 'changho',
  size: 20,
  pal: {
    O: '#0b2620', // deep jade-ink outline
    D: '#0f766e', // dark teal robe shade
    M: '#14b8a6', // main jade-teal scholar robe (청록 도포)
    L: '#5eead4', // bright jade highlight
    H: '#e6fffb', // crisp specular highlight
    Y: '#f6d575', // champagne gold accent
    y: '#d4a359', // connect-ai gold
    R: '#e11d48', // royal vermilion seal (낙관 도장)
    r: '#fb7185', // seal highlight
    C: '#ff8fa3', // warm cheek blush
    E: '#0f172a', // crisp dark eyes
    W: '#fffaf0', // hanji paper / collar
    w: '#cbd5e1', // scroll shadow / ink line
    F: '#6efbe0', // jade sparkle
    f: '#ffe87c', // gold sparkle
    K: '#181a24', // black horsehair gat (흑립 갓)
    k: '#525b76', // gat weave highlight
    P: '#ffd9bc', // warm skin tone
    p: '#f0b892', // skin shade
    bg: '#11221e', // matte dark jade changho backdrop
    pat: '#1a332d', // changho lattice lines
  },
  frames: {
    // 1. 인사 · 대기: 붓을 들고 반갑게 인사하는 집현전 학사
    greet: [
      '....................',
      '....................',
      '.......kkkkkk.......',
      '......OKkKKKKO......',
      '......OKKKKKKO......',
      '...kkkKKKKKKKKkkk...',
      '..OKkKKKKKKKKKKKkO..',
      '...OOOOPPPPPPOOOO...',
      '.....OOPPPPPPOO...f.',
      '.....OPPEPPPEPO..OY.',
      '.....OPPEPPPEPO..OY.',
      '....OYPCPPPPCPYO.OK.',
      '....OOMMWWWWMDO..OK.',
      '...OLLMMLWWMMMDO....',
      '...OLMMYWWWWYMDO....',
      '...OMMMDDDDDDMDO....',
      '....OODDDDDDDOO.....',
      '.....OO.....OO......',
      '....................',
      '....................',
    ],
    // 2. 리서치 · 팩트체크: 펼친 한지 두루마리와 금빛 반짝이로 자료 조사
    research: [
      '....................',
      '....................',
      '.......kkkkkk....f..',
      '......OKkKKKKO......',
      '......OKKKKKKO......',
      '...kkkKKKKKKKKkkk...',
      '..OKkKKKKKKKKKKKkO..',
      '...OOOOPPPPPPOOOO...',
      '.....OOPPPPPPOOyWWy.',
      '.....OPPEPPPEPOWkWW.',
      '.....OPPEPPPEPOWWkW.',
      '....OYPCPPPPCPYyWWy.',
      '....OOMMWWWWMDO.yy..',
      '...OLLMMLWWMMMDO....',
      '...OLMMYWWWWYMDO....',
      '...OMMMDDDDDDMDO....',
      '....OODDDDDDDOO.....',
      '.....OO.....OO......',
      '....................',
      '....................',
    ],
    // 3. 집필 중: 붓을 치켜들고 영감의 불꽃이 튀며 글 쓰는 모습
    write: [
      '....................',
      '................f...',
      '.......kkkkkk..fYf..',
      '......OKkKKKKO..f...',
      '......OKKKKKKO......',
      '...kkkKKKKKKKKkkk...',
      '..OKkKKKKKKKKKKKkO..',
      '...OOOOPPPPPPOOOOH..',
      '.....OOPPPPPPOO.OY..',
      '.....OPPEPPPEPO.OY..',
      '.....OPPEPPPEPO.OK..',
      '....OYPCPPPPCPYOOK..',
      '....OOMMWWWWMDO.O...',
      '...OLLMMLWWMMMDO....',
      '...OLMMYWWWWYMDO....',
      '...OMMMDDDDDDMDO....',
      '....OODDDDDDDOO.....',
      '.....OO.....OO......',
      '....................',
      '....................',
    ],
    // 4. 완성 · 임시저장 완료: 활짝 웃는 눈 + 붉은 낙관 도장 쾅!
    done: [
      '....................',
      '..f.................',
      '.......kkkkkk...f...',
      '......OKkKKKKO......',
      '......OKKKKKKO......',
      '...kkkKKKKKKKKkkk...',
      '..OKkKKKKKKKKKKKkO..',
      '...OOOOPPPPPPOOOO...',
      '.....OOPPPPPPOO.....',
      '.....OPPEPPPEPOORRO.',
      '.....OPEPEPEPEORYrR.',
      '....OYPCPPPPCPYORRO.',
      '....OOMMWWWWMDO.OO..',
      '...OLLMMLWWMMMDO....',
      '...OLMMYWWWWYMDO....',
      '...OMMMDDDDDDMDO....',
      '....OODDDDDDDOO.....',
      '.....OO.....OO......',
      '....................',
      '....................',
    ],
  },
};

const CHAT_META = {
  greet:    { tag: '집현전 학사', sub: '인사 · 대기 중', accent: '#5eead4' },
  research: { tag: '집현전 학사', sub: '자료 조사 · 팩트체크', accent: '#f6d575' },
  write:    { tag: '집현전 학사', sub: '글 집필 중', accent: '#5eead4' },
  done:     { tag: '집현전 학사', sub: '초안 완성 印', accent: '#fb7185' },
};

function buildSpriteInner(grid, pal, scale = 3, ox = 0, oy = 0) {
  const S = 20;
  const W = S * scale;
  const rects = [];
  rects.push(`<rect x="${ox}" y="${oy}" width="${W}" height="${W}" fill="${pal.bg}"/>`);
  for (const x of [3, 9, 15]) {
    rects.push(`<rect x="${ox + x * scale}" y="${oy}" width="${scale}" height="${W}" fill="${pal.pat}"/>`);
  }
  for (const y of [3, 9, 15]) {
    rects.push(`<rect x="${ox}" y="${oy + y * scale}" width="${W}" height="${scale}" fill="${pal.pat}"/>`);
  }
  for (let y = 0; y < S; y++) {
    const row = grid[y] || '';
    for (let x = 0; x < S; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const fill = pal[ch];
      if (!fill) continue;
      rects.push(`<rect x="${ox + x * scale}" y="${oy + y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`);
    }
  }
  return rects.join('');
}

function buildSvg(grid, pal, scale = 5) {
  const W = 20 * scale;
  const r = Math.round(3.5 * scale);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" shape-rendering="crispEdges">`,
    `<defs><clipPath id="c"><rect x="0" y="0" width="${W}" height="${W}" rx="${r}" ry="${r}"/></clipPath></defs>`,
    `<g clip-path="url(#c)">${buildSpriteInner(grid, pal, scale, 0, 0)}</g>`,
    `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="${r - 1}" ry="${r - 1}" fill="none" stroke="#d4a359" stroke-opacity="0.35" stroke-width="2"/>`,
    `</svg>`,
  ].join('');
}

// Wide transparent strip (760x76) so even chat UIs that force `width: 100%` on Markdown images
// display the pixel scholar at a cute, crisp ~56px avatar size instead of blowing up to full screen.
function buildChatStripSvg(mood, grid, pal) {
  const CW = 760;
  const CH = 76;
  const scale = 3; // 20 * 3 = 60x60 crisp pixel portrait
  const avSize = 20 * scale;
  const pad = 8;
  const pillW = 248;
  const pillH = 72;
  const meta = CHAT_META[mood] || CHAT_META.greet;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">`,
    `<defs><clipPath id="av"><rect x="${pad}" y="${pad}" width="${avSize}" height="${avSize}" rx="11" ry="11"/></clipPath></defs>`,
    `<rect x="1" y="2" width="${pillW}" height="${pillH}" rx="15" ry="15" fill="#101816" stroke="#d4a359" stroke-opacity="0.55" stroke-width="1.5"/>`,
    `<g clip-path="url(#av)" shape-rendering="crispEdges">${buildSpriteInner(grid, pal, scale, pad, pad)}</g>`,
    `<rect x="${pad}" y="${pad}" width="${avSize}" height="${avSize}" rx="11" ry="11" fill="none" stroke="#d4a359" stroke-opacity="0.45" stroke-width="1.2"/>`,
    `<circle cx="84" cy="27" r="4" fill="${meta.accent}"/>`,
    `<text x="95" y="32" font-family="Apple SD Gothic Neo, Pretendard, Noto Sans KR, sans-serif" font-size="16" font-weight="700" fill="#f7f2e8">${meta.tag}</text>`,
    `<text x="80" y="54" font-family="Apple SD Gothic Neo, Pretendard, Noto Sans KR, sans-serif" font-size="13" font-weight="500" fill="#d4a359">${meta.sub}</text>`,
    `</svg>`,
  ].join('');
}

async function main() {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  const scale = 5; // 20 * 5 = 100x100 square icon (README / HQ)
  for (const [mood, grid] of Object.entries(SCHOLAR_SPRITE.frames)) {
    const svg = buildSvg(grid, SCHOLAR_SPRITE.pal, scale);
    const pngPath = path.join(OUT_DIR, `${mood}.png`);
    await sharp(Buffer.from(svg))
      .png({compressionLevel: 9, palette: true})
      .toFile(pngPath);
    console.log(`rendered ${path.relative(ROOT, pngPath)} (${fs.statSync(pngPath).size} bytes)`);

    const stripSvg = buildChatStripSvg(mood, grid, SCHOLAR_SPRITE.pal);
    const stripPath = path.join(OUT_DIR, `chat-${mood}.png`);
    await sharp(Buffer.from(stripSvg))
      .png({compressionLevel: 9})
      .toFile(stripPath);
    console.log(`rendered ${path.relative(ROOT, stripPath)} (${fs.statSync(stripPath).size} bytes)`);
  }
  const metaPath = path.join(OUT_DIR, 'scholar.json');
  fs.writeFileSync(metaPath, JSON.stringify(SCHOLAR_SPRITE, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, metaPath)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
