// node scripts/switch-license.mjs commons-clause | mit
// Rewrites LICENSE and package.json "license" in one step. Not part of the npm package.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
const MIT = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8').split('\n"Commons Clause"')[0].trimEnd() + '\n';
const CLAUSE = `
"Commons Clause" License Condition v1.0

The Software is provided to you by the Licensor under the License, as defined below, subject to the following condition.

Without limiting other conditions in the License, the grant of rights under the License will not include, and the License does not grant to you, the right to Sell the Software.

For purposes of the foregoing, "Sell" means practicing any or all of the rights granted to you under the License to provide to third parties, for a fee or other consideration (including without limitation fees for hosting or consulting/ support services related to the Software), a product or service whose value derives, entirely or substantially, from the functionality of the Software. Any license notice or attribution required by the License must also include this Commons Clause License Condition notice.

Software: connect-ai-writer
License: MIT
Licensor: CONNECT AI LAB
`;
const pkgFile = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
if (mode === 'commons-clause') { fs.writeFileSync(path.join(root, 'LICENSE'), MIT + CLAUSE); pkg.license = 'SEE LICENSE IN LICENSE'; }
else if (mode === 'mit') { fs.writeFileSync(path.join(root, 'LICENSE'), MIT); pkg.license = 'MIT'; }
else { console.log('usage: node scripts/switch-license.mjs commons-clause | mit'); process.exit(1); }
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
console.log(`LICENSE and package.json now: ${pkg.license}`);
