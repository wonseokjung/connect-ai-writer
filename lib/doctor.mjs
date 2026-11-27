// doctor: what is ready on this computer, one line each. Never prints a key or a login.
import {spawnSync} from 'node:child_process';
import {findChrome} from './chrome.mjs';
import {hasFfmpeg} from './frames.mjs';
import {egoInstalled, browser, userBrowserConfig, AGENT} from './ego.mjs';
import {findCab, cabStatus, INSTALL_CAB} from './browser.mjs';
import {userConfigFile} from './config.mjs';
const dimmed = (t) => (process.stdout.isTTY ? `\x1b[2m${t}\x1b[0m` : t);

const has = (cmd, args = ['--version']) => { try { const r = spawnSync(cmd, args, {stdio: 'pipe', timeout: 8000}); return !r.error && r.status === 0; } catch { return false; } };

export const NODE_MIN = [20, 19];
export const nodeOk = (v = process.versions.node) => { const [ma, mi] = v.split('.').map(Number); return ma > NODE_MIN[0] || (ma === NODE_MIN[0] && mi >= NODE_MIN[1]); };

export async function doctor({log = console.log, settings = {}, files = {}} = {}) {
  const row = (ok, what, how = '') => log(`  ${ok ? 'ok  ' : '--  '} ${what}${how ? '   ' + how : ''}`);
  const nok = nodeOk();
  row(nok, `Node ${process.versions.node}`, nok ? '' : 'needs Node 20.19 or newer (https://nodejs.org, the LTS button)');
  let sharpOk = false;
  try { await import('sharp'); sharpOk = true; } catch {}
  row(sharpOk, 'sharp (pictures)');
  const chrome = findChrome();
  row(!!chrome, 'Chrome for cards and page screenshots', chrome || 'install Chrome (or Edge / Chromium), or set CHROME_PATH');
  row(hasFfmpeg(), 'ffmpeg for frames from your video', hasFfmpeg() ? '' : 'only needed for [image: frame ...]: brew install ffmpeg / winget install ffmpeg');
  row(has('yt-dlp'), 'yt-dlp for YouTube links (optional)', has('yt-dlp') ? '' : 'only needed to read a YouTube link: brew install yt-dlp');
  const use = browser();
  const cab = findCab({cabPath: userBrowserConfig().cabPath});
  const ego = egoInstalled();
  row(!!cab && cabStatus().running, `CONNECT AI Browser (cab) for post and listening${use === 'cab' ? ', in use' : ''}`, !cab ? `our own browser, to put drafts in the editor for you: ${INSTALL_CAB}` : cabStatus().running ? `works as the agent "${AGENT}" (${cab.how})` : 'installed, not running: cab start');
  row(!!ego, `Ego Lite (ego-browser)${use === 'ego' ? ', in use' : ''}`, ego || 'optional: https://lite.ego.app ("browser": "ego" in your settings, or CONNECT_AI_BROWSER=ego)');
  log('');
  row(!(settings.imageHook?.enabled), `image hook ${settings.imageHook?.enabled ? 'ON (your own tool makes [image: gen ...] pictures)' : 'off (default: every picture is made from your own material)'}`);
  row(true, `writer: ${settings.writer?.command ? [].concat(settings.writer.command).join(' ') : 'your agent writes post.md (install-skill), or --writer "claude -p"'}`);
  if (settings._ignored?.length) row(false, `ignored in ${files.settings}: ${settings._ignored.join(', ')}`, 'commands are read only from your own user config, never from a project folder');
  log(dimmed(`  your settings: ${files.user || userConfigFile() + ' (not made yet; only needed for an image hook or a writer command)'}`));
}
