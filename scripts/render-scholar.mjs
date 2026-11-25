// Renders the CONNECT AI LAB 20x20 16-bit pixel Jiphyeonjeon Writer Scholar
// (4 expressions, gentle idle/action animated GIFs + static PNG fallbacks + HQ PixelCrew scholar.json)
// Run: node scripts/render-scholar.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'skill', 'assets', 'scholar');

const PAL = {
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
};

// Gentle 4-frame micro-animations per mood (subtle breathing, blink, brush sway, sparkle)
const ANIM_FRAMES = {
  // 1. 인사 · 대기 중: 붓 들고 살포시 숨쉬기 + 눈 깜빡
  greet: {
    delays: [520, 420, 520, 180],
    grids: [
      [
        '....................',
        '....................',
        '.......kkkkkk.......',
        '......OKkKKKKO......',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOO...',
        '.....OOPPPPPPOO..f..',
        '.....OPPEPPPEPO.OY..',
        '.....OPPEPPPEPO.OY..',
        '....OYPCPPPPCPYOOK..',
        '....OOMMWWWWMDO.OK..',
        '...OLLMMLWWMMMDO....',
        '...OLMMYWWWWYMDO....',
        '...OMMMDDDDDDMDO....',
        '....OODDDDDDDOO.....',
        '.....OO.....OO......',
        '....................',
        '....................',
      ],
      [
        '....................',
        '.......kkkkkk.......',
        '......OKkKKKKO......',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOO...',
        '.....OOPPPPPPOO..f..',
        '.....OPPEPPPEPO.OY..',
        '.....OPPEPPPEPO.OY..',
        '....OYPCPPPPCPYOOK..',
        '....OOMMWWWWMDO.OK..',
        '...OLLMMLWWMMMDO....',
        '...OLMMYWWWWYMDO....',
        '...OMMMDDDDDDMDO....',
        '....OODDDDDDDOO.....',
        '.....OO.....OO......',
        '....................',
        '....................',
        '....................',
      ],
      [
        '....................',
        '....................',
        '.......kkkkkk.......',
        '......OKkKKKKO......',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOOf..',
        '.....OOPPPPPPOO.OY..',
        '.....OPPEPPPEPO.OY..',
        '.....OPPEPPPEPO.OK..',
        '....OYPCPPPPCPYOOK..',
        '....OOMMWWWWMDO.....',
        '...OLLMMLWWMMMDO....',
        '...OLMMYWWWWYMDO....',
        '...OMMMDDDDDDMDO....',
        '....OODDDDDDDOO.....',
        '.....OO.....OO......',
        '....................',
        '....................',
      ],
      // gentle blink
      [
        '....................',
        '....................',
        '.......kkkkkk.......',
        '......OKkKKKKO......',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOO...',
        '.....OOPPPPPPOO..f..',
        '.....OPPPPPPPPO.OY..',
        '.....OPEEPPEEPO.OY..',
        '....OYPCPPPPCPYOOK..',
        '....OOMMWWWWMDO.OK..',
        '...OLLMMLWWMMMDO....',
        '...OLMMYWWWWYMDO....',
        '...OMMMDDDDDDMDO....',
        '....OODDDDDDDOO.....',
        '.....OO.....OO......',
        '....................',
        '....................',
      ],
    ],
  },

  // 2. 자료 조사 · 팩트체크: 두루마리 톡톡 들며 읽기 + 금빛 반짝이
  research: {
    delays: [460, 420, 460, 220],
    grids: [
      [
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
      [
        '....................',
        '................f...',
        '.......kkkkkk..fYf..',
        '......OKkKKKKO..f...',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOyWWy.',
        '.....OOPPPPPPOOWkWW.',
        '.....OPPEPPPEPOWWkW.',
        '.....OPPEPPPEPOyWWy.',
        '....OYPCPPPPCPYOyy..',
        '....OOMMWWWWMDO.....',
        '...OLLMMLWWMMMDO....',
        '...OLMMYWWWWYMDO....',
        '...OMMMDDDDDDMDO....',
        '....OODDDDDDDOO.....',
        '.....OO.....OO......',
        '....................',
        '....................',
      ],
      [
        '....................',
        '....................',
        '.......kkkkkk...F...',
        '......OKkKKKKO......',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOO...',
        '.....OOPPPPPPOOyWWy.',
        '.....OPPEPPPEPOWWkW.',
        '.....OPPEPPPEPOWkWW.',
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
      [
        '....................',
        '....................',
        '.......kkkkkk....f..',
        '......OKkKKKKO......',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOO...',
        '.....OOPPPPPPOOyWWy.',
        '.....OPPPPPPPPOkWWW.',
        '.....OPEEPPEEPOWWkW.',
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
    ],
  },

  // 3. 글 집필 중: 붓 쓱쓱 글 쓰는 리듬 + 영감 별빛 반짝
  write: {
    delays: [260, 260, 260, 260],
    grids: [
      [
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
      [
        '....................',
        '....................',
        '.......kkkkkk...Y...',
        '......OKkKKKKO......',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOO...',
        '.....OOPPPPPPOO..H..',
        '.....OPPEPPPEPO.OY..',
        '.....OPPEPPPEPO.OY..',
        '....OYPCPPPPCPYOOK..',
        '....OOMMWWWWMDO.OK..',
        '...OLLMMLWWMMMDO....',
        '...OLMMYWWWWYMDO....',
        '...OMMMDDDDDDMDO....',
        '....OODDDDDDDOO.....',
        '.....OO.....OO......',
        '....................',
        '....................',
      ],
      [
        '....................',
        '.......kkkkkk...F...',
        '......OKkKKKKO.FYF..',
        '......OKKKKKKO..F...',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOOH..',
        '.....OOPPPPPPOO.OY..',
        '.....OPPEPPPEPO.OY..',
        '.....OPPEPPPEPO.OK..',
        '....OYPCPPPPCPYOOK..',
        '....OOMMWWWWMDO.....',
        '...OLLMMLWWMMMDO....',
        '...OLMMYWWWWYMDO....',
        '...OMMMDDDDDDMDO....',
        '....OODDDDDDDOO.....',
        '.....OO.....OO......',
        '....................',
        '....................',
        '....................',
      ],
      [
        '....................',
        '....................',
        '.......kkkkkk...f...',
        '......OKkKKKKO......',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOO...',
        '.....OOPPPPPPOO.H...',
        '.....OPPEPPPEPO.OY..',
        '.....OPPEPPPEPO.OY..',
        '....OYPCPPPPCPYOOK..',
        '....OOMMWWWWMDO.OK..',
        '...OLLMMLWWMMMDO....',
        '...OLMMYWWWWYMDO....',
        '...OMMMDDDDDDMDO....',
        '....OODDDDDDDOO.....',
        '.....OO.....OO......',
        '....................',
        '....................',
      ],
    ],
  },

  // 4. 초안 완성 印: ^ ^ 웃으며 살짝 통통 + 낙관 도장 쾅 + 별빛 교차 반짝
  done: {
    delays: [360, 320, 360, 320],
    grids: [
      [
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
      [
        '..f.................',
        '.fYf...kkkkkk...F...',
        '..f...OKkKKKKO......',
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
        '....................',
      ],
      [
        '....................',
        '..F.............f...',
        '.......kkkkkk..fYf..',
        '......OKkKKKKO..f...',
        '......OKKKKKKO......',
        '...kkkKKKKKKKKkkk...',
        '..OKkKKKKKKKKKKKkO..',
        '...OOOOPPPPPPOOOO...',
        '.....OOPPPPPPOO.....',
        '.....OPPEPPPEPOORRO.',
        '.....OPEPEPEPEORRYR.',
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
      [
        '....................',
        '.......kkkkkk.......',
        '......OKkKKKKO..f...',
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
        '....................',
      ],
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

function buildSquareSvg(grid, pal, scale = 5) {
  const W = 20 * scale;
  const r = Math.round(3.5 * scale);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" shape-rendering="crispEdges">`,
    `<defs><clipPath id="c"><rect x="0" y="0" width="${W}" height="${W}" rx="${r}" ry="${r}"/></clipPath></defs>`,
    `<g clip-path="url(#c)">${buildSpriteInner(grid, pal, scale, 0, 0)}</g>`,
    `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="${r - 1}" ry="${r - 1}" fill="none" stroke="#d4a359" stroke-opacity="0.38" stroke-width="2"/>`,
    `</svg>`,
  ].join('');
}

// Ultra-compact wide transparent strip (1080x72, exact 3x integer pixel scale = 60x60 avatar)
// Even when Antigravity/IDE chats stretch Markdown images to 100% width, it stays tiny & crisp (~45px tall)!
function buildChatStripSvg(mood, grid, pal, frameIdx = 0) {
  const CW = 1080;
  const CH = 72;
  const sInt = 3; // exact integer 3x scale of 20x20 = 60x60 razor-sharp pixel art
  const avSize = 60;
  const pad = 6;
  const pillW = 246;
  const pillH = 68;
  const meta = CHAT_META[mood] || CHAT_META.greet;
  const dotOp = frameIdx % 2 === 0 ? '1' : '0.45';
  const subDots = mood === 'write' || mood === 'research'
    ? ['', '.', '..', '...'][frameIdx % 4]
    : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">`,
    `<defs><clipPath id="av"><rect x="${pad}" y="${pad}" width="${avSize}" height="${avSize}" rx="11" ry="11"/></clipPath></defs>`,
    `<rect x="1" y="2" width="${pillW}" height="${pillH}" rx="15" ry="15" fill="#101816" stroke="#d4a359" stroke-opacity="0.58" stroke-width="1.5"/>`,
    `<g clip-path="url(#av)" shape-rendering="crispEdges">${buildSpriteInner(grid, pal, sInt, pad, pad)}</g>`,
    `<rect x="${pad}" y="${pad}" width="${avSize}" height="${avSize}" rx="11" ry="11" fill="none" stroke="#d4a359" stroke-opacity="0.45" stroke-width="1.2"/>`,
    `<circle cx="81" cy="27" r="4" fill="${meta.accent}" fill-opacity="${dotOp}"/>`,
    `<text x="92" y="32" font-family="Apple SD Gothic Neo, Pretendard, Noto Sans KR, sans-serif" font-size="16" font-weight="700" fill="#f7f2e8">${meta.tag}</text>`,
    `<text x="77" y="53" font-family="Apple SD Gothic Neo, Pretendard, Noto Sans KR, sans-serif" font-size="12.5" font-weight="500" fill="#d4a359">${meta.sub}${subDots}</text>`,
    `</svg>`,
  ].join('');
}

async function writeAnimatedGif(svgs, width, height, delays, outPath) {
  const rawFrames = [];
  for (const svg of svgs) {
    const buf = await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer();
    rawFrames.push(buf);
  }
  const stacked = Buffer.concat(rawFrames);
  await sharp(stacked, {
    raw: {
      width,
      height: height * rawFrames.length,
      channels: 4,
      pages: rawFrames.length,
      pageHeight: height,
    },
  })
    .gif({
      delay: delays,
      loop: 0,
      effort: 7,
      dither: 0,
    })
    .toFile(outPath);
}

async function main() {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  const hqExport = {
    id: 'writer_scholar',
    name: '집현전 글쓰기 학사',
    pattern: 'changho',
    size: 20,
    pal: PAL,
    frames: {},
  };

  for (const [mood, cfg] of Object.entries(ANIM_FRAMES)) {
    hqExport.frames[mood] = cfg.grids[0];

    // 1) Static 100x100 PNG icon (fallback / HQ)
    const sqSvgs = cfg.grids.map((g) => buildSquareSvg(g, PAL, 5));
    const pngPath = path.join(OUT_DIR, `${mood}.png`);
    await sharp(Buffer.from(sqSvgs[0])).png({compressionLevel: 9, palette: true}).toFile(pngPath);

    // 2) Animated 100x100 GIF icon (README)
    const sqGifPath = path.join(OUT_DIR, `${mood}.gif`);
    await writeAnimatedGif(sqSvgs, 100, 100, cfg.delays, sqGifPath);

    // 3) Static 880x64 PNG strip (fallback)
    const stripSvgs = cfg.grids.map((g, i) => buildChatStripSvg(mood, g, PAL, i));
    const stripPngPath = path.join(OUT_DIR, `chat-${mood}.png`);
    await sharp(Buffer.from(stripSvgs[0])).png({compressionLevel: 9}).toFile(stripPngPath);

    // 4) Animated 1080x72 transparent GIF strip (Antigravity / Cursor / IDE chats!)
    const stripGifPath = path.join(OUT_DIR, `chat-${mood}.gif`);
    await writeAnimatedGif(stripSvgs, 1080, 72, cfg.delays, stripGifPath);

    console.log(
      `${mood.padEnd(8)} icon-gif=${fs.statSync(sqGifPath).size}B  chat-gif=${fs.statSync(stripGifPath).size}B`,
    );
  }

  const metaPath = path.join(OUT_DIR, 'scholar.json');
  fs.writeFileSync(metaPath, JSON.stringify(hqExport, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, metaPath)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
