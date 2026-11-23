// Turns the raw toolkit bundle into an immutable, content-hashed file and
// generates loader.js + version.json pointing at it.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dist = join(root, 'dist');
const raw = join(dist, '_toolkit', 'toolkit.js');
if (!existsSync(raw)) throw new Error('toolkit bundle missing — run build:toolkit first');

const code = readFileSync(raw);
const hash = createHash('sha256').update(code).digest('hex').slice(0, 10);
const version = pkg.version;
const file = `toolkit/toolkit.${version}.${hash}.js`;
const protocol = pkg.itsmToolkit?.bookmarkletProtocol ?? 2;
const builtAt = new Date().toISOString();

mkdirSync(join(dist, 'toolkit'), { recursive: true });
writeFileSync(join(dist, file), code);
// Stable alias for self-hosting the bundle as a ServiceNow UI Script (CSP fallback).
copyFileSync(join(dist, file), join(dist, 'toolkit', 'toolkit.latest.js'));
rmSync(join(dist, '_toolkit'), { recursive: true, force: true });

const loader = `/* ITSM Toolkit loader v${version} (${builtAt}) */
(function () {
  var VERSION = ${JSON.stringify(version)};
  var FILE = ${JSON.stringify(file)};
  var MIN_BOOKMARKLET = ${protocol};
  var w = window;
  var cur = document.currentScript;
  var base = (w.__SNTK_BOOT && w.__SNTK_BOOT.base) || (cur && cur.src ? cur.src.replace(/loader\\.js.*$/, '') : '');
  if (typeof w.__SNTK_CHECK === 'function') { w.__SNTK_CHECK(VERSION); return; }
  var boot = w.__SNTK_BOOT || (w.__SNTK_BOOT = { base: base, bv: 0, domains: [] });
  boot.latestVersion = VERSION;
  boot.bookmarkletOutdated = (boot.bv || 0) < MIN_BOOKMARKLET;
  if (w.__SNTK && w.__SNTK.version === VERSION && !w.__SNTK_FORCE) { w.__SNTK.toggle(); return; }
  w.__SNTK_FORCE = false;
  var s = document.createElement('script');
  s.src = base + FILE;
  s.async = true;
  s.onerror = function () { alert('ITSM Toolkit: failed to load ' + base + FILE); };
  (document.head || document.documentElement).appendChild(s);
})();
`;
writeFileSync(join(dist, 'loader.js'), loader);
writeFileSync(join(dist, 'version.json'), JSON.stringify({ version, file, bookmarkletProtocol: protocol, builtAt }, null, 2));
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`✓ toolkit ${version} → dist/${file} (${(code.length / 1024).toFixed(0)} KB)`);
