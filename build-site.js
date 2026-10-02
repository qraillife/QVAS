#!/usr/bin/env node
/**
 * Builds a static GitHub Pages site from the desktop (Electron) project.
 *   node scripts/build-site.js /path/to/electron [outDir]      (default outDir: ./site)
 * Then push the contents of outDir to a GitHub repo and enable Pages.
 */
const fs = require('fs');
const path = require('path');

const srcRoot = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'electron'));
const out = path.resolve(process.argv[3] || path.join(__dirname, '..', 'site'));
const CHUNK = Number(process.env.QVAS_CHUNK_BYTES) || 80 * 1024 * 1024; // GitHub hard limit is 100 MB/file
const AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.ogg', '.flac'];
const SKIP_AUDIO = new Set(['.ini', '.lnk']);

if (!fs.existsSync(path.join(srcRoot, 'src', 'index.html'))) {
  console.error(`Could not find src/index.html under ${srcRoot}\nPass the path to your unzipped "electron" folder.`); process.exit(1);
}
function copyDir(from, to, filter = () => true) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (!filter(a, e)) continue;
    e.isDirectory() ? copyDir(a, b, filter) : fs.copyFileSync(a, b);
  }
}
function splitFile(file, destDir, name) { // line-aware split so no CSV row is cut in half
  const size = fs.statSync(file).size;
  if (size <= CHUNK) { fs.copyFileSync(file, path.join(destDir, name)); return 0; }
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(CHUNK);
  let part = 0, carry = Buffer.alloc(0), pos = 0;
  while (pos < size) {
    const n = fs.readSync(fd, buf, 0, CHUNK, pos); pos += n;
    let chunk = Buffer.concat([carry, buf.subarray(0, n)]);
    if (pos < size) { const cut = chunk.lastIndexOf(0x0a) + 1; carry = Buffer.from(chunk.subarray(cut)); chunk = chunk.subarray(0, cut); } else carry = Buffer.alloc(0);
    fs.writeFileSync(path.join(destDir, `${name}.part${part++}`), chunk);
  }
  fs.closeSync(fd);
  return part;
}

const NO_TRIM = process.argv.includes('--no-trim');
const { trimGTFS } = require('./trim-gtfs');

(async function main() {
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// UI + data (no server, no GPS-transmitter page; 45 MB patterns file is renamed below)
const skip = new Set(['server.js', 'gps-transmitter.html', '2gtfs-patterns.json']);
copyDir(path.join(srcRoot, 'src'), out, (p, e) => e.isDirectory() || !skip.has(e.name));

// On-screen buttons send keys through the app's own polling path (/api/state). That path handles 3, 4 and 6
// but not 7 ("The next station is"), so add it. Fails loudly if the app's code ever changes shape.
{
  const appJs = path.join(out, 'app.js');
  let code = fs.readFileSync(appJs, 'utf8');
  const re = /(case '6':\s*case 'numpad 6':[\s\S]*?doorsLock\(\);\s*break;)/;
  if (!re.test(code)) { console.error('Could not find the key-6 polling case in app.js to add key 7 after.'); process.exit(1); }
  if (!/\[POLLING\] Key 7/.test(code)) {
    code = code.replace(re, `$1
              case '7':
              case 'numpad 7':
                console.log('\u{1F4E3} [POLLING] Key 7 - Next station is');
                if (typeof playNextStation === 'function') playNextStation();
                break;`);
    fs.writeFileSync(appJs, code);
  }
}

const patterns = [path.join(srcRoot, 'gtfs-patterns.json'), path.join(srcRoot, 'src', '2gtfs-patterns.json')].find(fs.existsSync);
if (!patterns) { console.error('No gtfs-patterns.json / 2gtfs-patterns.json found'); process.exit(1); }
const parts = {};
// minify: the source is pretty-printed (45 MB -> ~25 MB, identical data)
const minified = path.join(out, '.patterns.tmp.json');
fs.writeFileSync(minified, JSON.stringify(JSON.parse(fs.readFileSync(patterns, 'utf8'))));
const pParts = splitFile(minified, out, 'gtfs-patterns.json');
fs.rmSync(minified);
if (pParts) { parts['gtfs-patterns.json'] = pParts; console.log(`split gtfs-patterns.json into ${pParts} parts`); }

// Audio
const audioOut = path.join(out, 'audio', 'QR_PIDS_AudioFiles');
copyDir(path.join(srcRoot, 'QR_PIDS_AudioFiles'), audioOut, (p, e) => e.isDirectory() || !SKIP_AUDIO.has(path.extname(e.name).toLowerCase()));
const manifest = {};
(function walk(abs, rel) {
  const folders = [], files = [];
  for (const name of fs.readdirSync(abs)) {
    const full = path.join(abs, name), r = rel ? `${rel}/${name}` : name;
    if (fs.statSync(full).isDirectory()) { folders.push({ name, path: r }); walk(full, r); }
    else if (AUDIO_EXT.includes(path.extname(name).toLowerCase())) files.push({ name, path: r, ext: path.extname(name).toLowerCase() });
  }
  folders.sort((a, b) => a.name.localeCompare(b.name)); files.sort((a, b) => a.name.localeCompare(b.name));
  manifest[rel] = { folders, files };
})(audioOut, '');
fs.writeFileSync(path.join(out, 'audio-manifest.json'), JSON.stringify(manifest));

if (fs.existsSync(path.join(srcRoot, 'CCTV'))) copyDir(path.join(srcRoot, 'CCTV'), path.join(out, 'CCTV'));

// GTFS (chunked when needed)
const gtfsSrc = path.join(srcRoot, 'SEQ_GTFS'), gtfsOut = path.join(out, 'SEQ_GTFS');
fs.mkdirSync(gtfsOut, { recursive: true });
const required = ['routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt', 'calendar.txt', 'calendar_dates.txt'];
const missing = required.filter(f => !fs.existsSync(path.join(gtfsSrc, f)));
let gtfsReady = gtfsSrc;
if (!missing.length && !NO_TRIM) {
  console.log('Trimming GTFS to train services...');
  gtfsReady = path.join(out, '.gtfs-trimmed');
  await trimGTFS(gtfsSrc, gtfsReady);
}
for (const f of [...required, 'feed_info.txt']) {
  const p = path.join(gtfsReady, f);
  if (!fs.existsSync(p)) continue;
  const n = splitFile(p, gtfsOut, f);
  if (n) { parts[f] = n; console.log(`split ${f} into ${n} parts`); }
}
if (gtfsReady !== gtfsSrc) fs.rmSync(gtfsReady, { recursive: true, force: true });
fs.writeFileSync(path.join(gtfsOut, '_parts.json'), JSON.stringify(parts));
if (missing.length) console.warn(`\n!! SEQ_GTFS is missing: ${missing.join(', ')}\n   Download https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip into ${gtfsSrc} and re-run, or the app stays on its loading screen.\n`);

// PWA bits + shim
fs.copyFileSync(path.join(__dirname, '..', 'shim', 'qvas-web-shim.js'), path.join(out, 'qvas-web-shim.js'));
for (const f of fs.readdirSync(path.join(__dirname, 'assets'))) fs.copyFileSync(path.join(__dirname, 'assets', f), path.join(out, f));
fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify({
  name: 'VAS HMI-C', short_name: 'VAS', start_url: './', scope: './', display: 'fullscreen', orientation: 'landscape',
  background_color: '#000000', theme_color: '#000000',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }]
}, null, 2));
fs.writeFileSync(path.join(out, '.nojekyll'), '');

let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace(/<head>/i, `<head>
  <script src="qvas-web-shim.js"></script>
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="VAS HMI-C">`);
html = html.replace(/<meta name="viewport"[^>]*>/i, '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">');
fs.writeFileSync(path.join(out, 'index.html'), html);

// Sanity: nothing over GitHub's limit
let big = [];
(function scan(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) scan(p); else if (fs.statSync(p).size > 100 * 1024 * 1024) big.push(p); } })(out);
if (big.length) console.warn('Files over 100 MB (GitHub will reject):\n' + big.join('\n'));
console.log(`\nSite built in ${out}`);
})().catch(e => { console.error(e); process.exit(1); });
