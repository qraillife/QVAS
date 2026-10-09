/**
 * Shrinks the TransLink SEQ GTFS feed to what QVAS actually reads.
 * app.js keeps only trips whose service_id starts with "QR" (trains) and only reads a few columns,
 * so everything else (the bus network is the bulk of stop_times.txt) is dead weight on a phone.
 * Streams line by line, so multi-hundred-MB files are fine.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const isQR = (id) => (id || '').trim().toUpperCase().startsWith('QR');

function parseLine(line) {
  if (line.indexOf('"') === -1) return line.split(',');
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
const esc = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function* rowsOf(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  let header = null;
  for await (let line of rl) {
    if (!header) { header = parseLine(line.replace(/^\uFEFF/, '')).map(h => h.trim()); yield { header }; continue; }
    if (!line.trim()) continue;
    yield { row: parseLine(line) };
  }
}

// keepCols: array of column names (null = all); keep(rowObjFn): predicate on a value-getter
async function trimFile(src, dest, { keepCols = null, keep = null, onKept = null }) {
  const out = fs.createWriteStream(dest);
  let idx = null, outCols = null, header = null, total = 0, kept = 0;
  const write = (s) => out.write(s) || new Promise(r => out.once('drain', r));
  for await (const item of rowsOf(src)) {
    if (item.header) {
      header = item.header;
      outCols = keepCols ? keepCols.filter(c => header.includes(c)) : header;
      idx = Object.fromEntries(header.map((h, i) => [h, i]));
      await write(outCols.map(esc).join(',') + '\n');
      continue;
    }
    total++;
    const get = (c) => (idx[c] === undefined ? '' : (item.row[idx[c]] ?? ''));
    if (keep && !keep(get)) continue;
    kept++;
    if (onKept) onKept(get);
    await write(outCols.map(c => esc(get(c))).join(',') + '\n');
  }
  await new Promise(r => out.end(r));
  return { total, kept };
}

async function trimGTFS(srcDir, destDir, log = console.log) {
  fs.mkdirSync(destDir, { recursive: true });
  const stats = {};
  const t = (f) => path.join(srcDir, f), d = (f) => path.join(destDir, f);
  const exists = (f) => fs.existsSync(t(f));

  if (exists('routes.txt')) { fs.copyFileSync(t('routes.txt'), d('routes.txt')); }
  if (exists('feed_info.txt')) fs.copyFileSync(t('feed_info.txt'), d('feed_info.txt'));

  // All stops are kept (tiny), only unused columns are dropped, so nearest-station lookups behave exactly like desktop.
  if (exists('stops.txt')) stats.stops = await trimFile(t('stops.txt'), d('stops.txt'),
    { keepCols: ['stop_id', 'stop_code', 'stop_name', 'stop_lat', 'stop_lon'] });

  const tripIds = new Set();
  if (exists('trips.txt')) stats.trips = await trimFile(t('trips.txt'), d('trips.txt'),
    { keep: (g) => isQR(g('service_id')), onKept: (g) => tripIds.add(g('trip_id')) });

  if (exists('stop_times.txt')) stats.stop_times = await trimFile(t('stop_times.txt'), d('stop_times.txt'),
    { keepCols: ['trip_id', 'stop_id', 'stop_sequence', 'arrival_time', 'departure_time'], keep: (g) => tripIds.has(g('trip_id')) });

  // Calendar files are copied whole: app.js iterates ALL services (e.g. auto-selecting the Holiday button), and they're small.
  for (const f of ['calendar.txt', 'calendar_dates.txt']) if (exists(f)) fs.copyFileSync(t(f), d(f));

  for (const [f, s] of Object.entries(stats)) log(`  ${f}.txt: ${s.kept}/${s.total} rows kept`);
  if (!tripIds.size) log('  !! No trips with a QR service_id were found, so the app will have no train data.');
  return stats;
}

module.exports = { trimGTFS };
