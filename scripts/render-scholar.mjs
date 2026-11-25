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

function buildSvg(grid, pal, scale = 6) {
  const S = 20;
  const W = S * scale;
  const rects = [];

  // Changho lattice background matching HQ PixelCrew
  rects.push(`<rect x="0" y="0" width="${W}" height="${W}" fill="${pal.bg}"/>`);
  for (const x of [3, 9, 15]) {
    rects.push(`<rect x="${x * scale}" y="0" width="${scale}" height="${W}" fill="${pal.pat}"/>`);
  }
  for (const y of [3, 9, 15]) {
    rects.push(`<rect x="0" y="${y * scale}" width="${W}" height="${scale}" fill="${pal.pat}"/>`);
  }

  // Crisp integer pixel blocks
  for (let y = 0; y < S; y++) {
    const row = grid[y] || '';
    for (let x = 0; x < S; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const fill = pal[ch];
      if (!fill) continue;
      rects.push(`<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`);
    }
  }

  const r = Math.round(3.5 * scale);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" shape-rendering="crispEdges">`,
    `<defs><clipPath id="c"><rect x="0" y="0" width="${W}" height="${W}" rx="${r}" ry="${r}"/></clipPath></defs>`,
    `<g clip-path="url(#c)">${rects.join('')}</g>`,
    `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="${r - 1}" ry="${r - 1}" fill="none" stroke="#d4a359" stroke-opacity="0.35" stroke-width="2"/>`,
    `</svg>`,
  ].join('');
}

async function main() {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  const scale = 5; // 20 * 5 = 100x100 crisp RPG dialogue portrait
  for (const [mood, grid] of Object.entries(SCHOLAR_SPRITE.frames)) {
    const svg = buildSvg(grid, SCHOLAR_SPRITE.pal, scale);
    const pngPath = path.join(OUT_DIR, `${mood}.png`);
    await sharp(Buffer.from(svg))
      .png({compressionLevel: 9, palette: true})
      .toFile(pngPath);
    console.log(`rendered ${path.relative(ROOT, pngPath)} (${fs.statSync(pngPath).size} bytes)`);
  }
  const metaPath = path.join(OUT_DIR, 'scholar.json');
  fs.writeFileSync(metaPath, JSON.stringify(SCHOLAR_SPRITE, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, metaPath)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
