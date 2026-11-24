// doctor: what is ready on this computer, one line each. Never prints a key or a login.
import {spawnSync} from 'node:child_process';
import {findChrome} from './chrome.mjs';
import {hasFfmpeg} from './frames.mjs';
import {egoInstalled} from './ego.mjs';

const has = (cmd, args = ['--version']) => { try { const r = spawnSync(cmd, args, {stdio: 'pipe', timeout: 8000}); return !r.error && r.status === 0; } catch { return false; } };

export async function doctor({log = console.log, settings = {}} = {}) {
  const row = (ok, what, how = '') => log(`  ${ok ? 'ok  ' : '--  '} ${what}${how ? '   ' + how : ''}`);
  const [ma, mi] = process.versions.node.split('.').map(Number);
  const nodeOk = ma > 20 || (ma === 20 && mi >= 9);
  row(nodeOk, `Node ${process.versions.node}`, nodeOk ? '' : 'needs Node 20.9 or newer');
  let sharpOk = false;
  try { await import('sharp'); sharpOk = true; } catch {}
  row(sharpOk, 'sharp (pictures)');
  const chrome = findChrome();
  row(!!chrome, 'Chrome for cards and page screenshots', chrome || 'install Chrome (or Edge / Chromium), or set CHROME_PATH');
  row(hasFfmpeg(), 'ffmpeg for frames from your video', hasFfmpeg() ? '' : 'only needed for [image: frame ...]: brew install ffmpeg / winget install ffmpeg');
  row(has('yt-dlp'), 'yt-dlp for YouTube links (optional)', has('yt-dlp') ? '' : 'only needed to read a YouTube link: brew install yt-dlp');
  const ego = egoInstalled();
  row(!!ego, 'Ego Lite (ego-browser) for post', ego || 'optional, to put drafts in the editor for you: https://lite.ego.app');
  log('');
  row(!(settings.imageHook?.enabled), `image hook ${settings.imageHook?.enabled ? 'ON (your own tool makes [image: gen ...] pictures)' : 'off (default: every picture is made from your own material)'}`);
  row(true, `writer: ${settings.writer?.command ? settings.writer.command : 'your agent writes post.md (install-skill), or set writer.command in writer.config.json'}`);
}
