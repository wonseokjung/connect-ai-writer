// The kit's name, folder and version, in one place.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const KIT_NAME = 'connect-ai-writer';
export const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION = JSON.parse(fs.readFileSync(path.join(KIT, 'package.json'), 'utf8')).version;
export const REPO = 'wonseokjung/connect-ai-writer';
