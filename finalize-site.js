#!/usr/bin/env node
// Usage: node finalize-site.js <siteDir> <version>
// Adds what build-site.js does not: file-index.js (audio lookup + build id), version.json, and the index.html hook.
const fs = require('fs');
const path = require('path');

const site = path.resolve(process.argv[2] || '_site');
const version = String(process.argv[3] || '').replace(/^v/i, '') || '0';
const buildId = String(Date.now());

const index = {};
(function walk(abs, rel) {
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const r = rel + '/' + e.name;
    if (e.isDirectory()) walk(path.join(abs, e.name), r);
    else index[r.toLowerCase()] = r;
  }
})(path.join(site, 'audio'), 'audio');

fs.writeFileSync(path.join(site, 'file-index.js'),
  `window.__QVAS_AUDIO_INDEX=${JSON.stringify(index)};window.__QVAS_BUILD=${JSON.stringify(buildId)};window.__QVAS_VERSION=${JSON.stringify(version)};`);

fs.writeFileSync(path.join(site, 'version.json'),
  JSON.stringify({ appVersion: version, buildId, builtAt: new Date().toISOString() }));

const f = path.join(site, 'index.html');
let html = fs.readFileSync(f, 'utf8');
if (!/file-index\.js/.test(html)) {
  if (!/<script src="qvas-web-shim\.js"><\/script>/.test(html)) throw new Error('index.html has no shim script tag');
  html = html.replace('<script src="qvas-web-shim.js"></script>', '<script src="file-index.js"></script>\n  <script src="qvas-web-shim.js"></script>');
  fs.writeFileSync(f, html);
}
console.log(`finalized: version ${version}, build ${buildId}, ${Object.keys(index).length} audio files indexed`);
