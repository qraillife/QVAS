#!/usr/bin/env node
/**
 * Builds the phone site straight from the official QVAS releases on GitHub:
 *   - the Windows installer of the latest release (contains the app, CCTV images and the timetable)
 *   - the audio package published under the "asset" release (same place the desktop app downloads it from)
 *
 *   node scripts/build-from-release.js [outDir] [--repo=OWNER/REPO] [--skip-if-deployed=https://you.github.io/repo/]
 *                                      [--force] [--exclude-audio=NAME] [--work=DIR]
 * Test overrides: --installer=FILE --assets=FILE   QVAS_API=http://host   QVAS_ASSET_BASE=http://host/asset
 * Prints "UP TO DATE" and builds nothing when the deployed site already matches the latest release.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : ''; };
const flag = (n) => process.argv.includes(`--${n}`);
const outDir = path.resolve(process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) || 'site');
const repo = arg('repo') || 'SaltyPlayzYT/QVAS-Project';
const API = (process.env.QVAS_API || 'https://api.github.com').replace(/\/$/, '');
const ASSET_BASE = (process.env.QVAS_ASSET_BASE || `https://github.com/${repo}/releases/download/asset`).replace(/\/$/, '');
const work = path.resolve(arg('work') || fs.mkdtempSync(path.join(os.tmpdir(), 'qvas-build-')));
fs.mkdirSync(work, { recursive: true });

const headers = { 'User-Agent': 'qvas-phone-builder', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN && API.includes('api.github.com')) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function getJson(url) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`GET ${url} -> HTTP ${r.status}`);
  return r.json();
}
async function download(url, dest) {
  console.log(`downloading ${url}`);
  const r = await fetch(url, { headers: { 'User-Agent': headers['User-Agent'] } });
  if (!r.ok) throw new Error(`GET ${url} -> HTTP ${r.status}`);
  await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(dest));
  console.log(`  ${(fs.statSync(dest).size / 1048576).toFixed(1)} MB`);
}
function run7z(archive, dest) {
  const bin = require('7zip-bin').path7za;
  try { fs.chmodSync(bin, 0o755); } catch (e) {}
  // exit code 1/2 are warnings for installers (e.g. NSIS script entries); we check for the files we need instead
  spawnSync(bin, ['x', '-y', '-bso0', '-bsp0', `-o${dest}`, archive], { stdio: 'inherit' });
}
function findFirst(root, test) {
  const stack = [root];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (test(p, e)) return p;
      if (e.isDirectory()) stack.push(p);
    }
  }
  return null;
}
const versionOf = (tag) => String(tag || '').replace(/^v/i, '');

(async () => {
  // 1. what is the latest release, and is the deployed site already on it?
  const release = process.argv.some(a => a.startsWith('--installer=')) ? { tag_name: arg('release-tag') || 'local', assets: [] } : await getJson(`${API}/repos/${repo}/releases/latest`);
  const tag = release.tag_name;
  let assetManifest = {};
  try { assetManifest = await getJson(`${ASSET_BASE}/asset-version.json?t=${Date.now()}`); } catch (e) { console.warn(`(could not read asset-version.json: ${e.message})`); }
  const assetVersion = String(assetManifest.version || '');
  console.log(`latest release: ${tag} | audio assets version: ${assetVersion || 'unknown'}`);

  const deployedUrl = arg('skip-if-deployed');
  if (deployedUrl && !flag('force')) {
    try {
      const r = await fetch(`${deployedUrl.replace(/\/?$/, '/')}version.json?_=${Date.now()}`, { headers: { 'User-Agent': headers['User-Agent'] } });
      if (r.ok) {
        const d = await r.json();
        if (d.releaseTag === tag && String(d.assetVersion || '') === assetVersion) { console.log(`UP TO DATE (deployed site is on ${tag}, audio ${assetVersion || 'n/a'}). Nothing to build.`); return; }
        console.log(`deployed site: ${d.releaseTag || '?'} / audio ${d.assetVersion || '?'} -> rebuilding`);
      }
    } catch (e) { console.log('no deployed site found yet -> building'); }
  }

  // 2. installer
  let installer = arg('installer');
  if (!installer) {
    const asset = (release.assets || []).find(a => /setup.*\.exe$/i.test(a.name) && !/blockmap/i.test(a.name))
              || (release.assets || []).find(a => /\.exe$/i.test(a.name));
    if (!asset) throw new Error(`Release ${tag} has no .exe installer asset: ${(release.assets || []).map(a => a.name).join(', ')}`);
    installer = path.join(work, asset.name);
    await download(asset.browser_download_url, installer);
  }
  // 3. audio package
  let assetsZip = arg('assets');
  if (!assetsZip) {
    assetsZip = path.join(work, 'qvas-assets.zip');
    await download(assetManifest.downloadUrl || `${ASSET_BASE}/qvas-assets.zip`, assetsZip);
  }

  // 4. unpack the installer -> app.asar -> app files
  const inst = path.join(work, 'installer');
  run7z(installer, inst);
  let asarFile = findFirst(inst, (p, e) => e.isFile() && e.name === 'app.asar');
  if (!asarFile) { // real NSIS installers keep the app inside a nested 7z
    const nested = findFirst(inst, (p, e) => e.isFile() && /^app-(64|32)\.7z$/i.test(e.name));
    if (nested) { run7z(nested, path.join(work, 'installer-app')); asarFile = findFirst(path.join(work, 'installer-app'), (p, e) => e.isFile() && e.name === 'app.asar'); }
  }
  if (!asarFile) throw new Error('Could not find app.asar inside the installer.');
  const app = path.join(work, 'app');
  require('@electron/asar').extractAll(asarFile, app);
  for (const need of ['src/index.html', 'src/app.js']) if (!fs.existsSync(path.join(app, need))) throw new Error(`Release is missing ${need}`);
  console.log(`app version in package.json: ${JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8')).version}`);

  // 5. unpack the audio
  const audioTmp = path.join(work, 'audio');
  run7z(assetsZip, audioTmp);
  const audioDir = findFirst(audioTmp, (p, e) => e.isDirectory() && e.name === 'QR_PIDS_AudioFiles');
  if (!audioDir) throw new Error('Could not find a QR_PIDS_AudioFiles folder in the audio package.');

  // 6. assemble the same layout the manual build uses, then build
  const project = path.join(work, 'project');
  fs.mkdirSync(project, { recursive: true });
  for (const d of ['src', 'CCTV', 'SEQ_GTFS']) if (fs.existsSync(path.join(app, d))) fs.renameSync(path.join(app, d), path.join(project, d));
  fs.renameSync(audioDir, path.join(project, 'QR_PIDS_AudioFiles'));
  for (const f of ['gtfs-patterns.json']) { const p = path.join(__dirname, '..', 'data', f); if (fs.existsSync(p)) fs.copyFileSync(p, path.join(project, f)); }

  const extra = process.argv.filter(a => a.startsWith('--exclude-audio=') || a === '--no-trim');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'build-site.js'), project, outDir, `--release-tag=${tag}`, `--asset-version=${assetVersion}`, ...extra], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('build-site.js failed');
  if (!arg('work')) fs.rmSync(work, { recursive: true, force: true });
  console.log(`\nBUILT ${tag} -> ${outDir}`);
})().catch(e => { console.error(`\nFAILED: ${e.message}`); process.exit(1); });
