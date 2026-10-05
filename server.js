// ==================== HTTP WEB SERVER FOR REMOTE DEVICE ACCESS ====================
// This is the Node.js server extracted from app.js to run as a separate process
// It serves the web interface and API endpoints for the Electron app

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const selfsigned = require('selfsigned');
const manualRoutesFile = process.env.QVAS_MANUAL_ROUTES_FILE || path.join(__dirname, 'manual-routes.json');
const announcementTextsFile = process.env.QVAS_ANNOUNCEMENT_TEXTS_FILE || path.join(__dirname, 'announcement-texts.json');
const announcementDisableRulesFile = process.env.QVAS_ANNOUNCEMENT_DISABLE_RULES_FILE || path.join(__dirname, 'announcement-disable-rules.json');
const mtgOnlyRoutesFile = process.env.QVAS_MTG_ONLY_ROUTES_FILE || path.join(__dirname, 'mtg-only-routes.json');
const customAudioDirectory = process.env.QVAS_CUSTOM_AUDIO_DIR
  || path.join(process.env.LOCALAPPDATA || path.join(__dirname, '..'), 'QVAS', 'custom-audio');
const REQUIRED_GTFS_FILES = ['routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt', 'calendar.txt', 'calendar_dates.txt'];

// Store reference to app state for remote devices
let appState = {
  doorCycle: 0,
  route: '',
  station: '',
  pid: '',
  DI: '',
  inputValue: '',
  lastKeyPress: null,
  pei: {
    calls: [],
    selectedCallId: null,
    activeCallId: null,
    connectedCabs: [],
    selectedCabId: 'A',
    cctvOwnerCabId: null,
    cctvViewers: [],
    sharedCameraId: null,
    nextCallNumber: 1,
    revision: 0
  },
  timestamp: Date.now()
};
let phoneGPSData = null;
const PHONE_GPS_MAX_AGE_MS = 10000;

function resolvePathCaseInsensitive(rootPath, relativePath) {
  let currentPath = rootPath;
  const segments = relativePath.split(/[\\/]+/).filter(Boolean);

  for (const segment of segments) {
    const exactPath = path.join(currentPath, segment);
    if (fs.existsSync(exactPath)) {
      currentPath = exactPath;
      continue;
    }

    if (!fs.existsSync(currentPath)) return null;
    const matchingEntry = fs.readdirSync(currentPath).find(entry => entry.toLowerCase() === segment.toLowerCase());
    if (!matchingEntry) return null;
    currentPath = path.join(currentPath, matchingEntry);
  }

  return fs.existsSync(currentPath) ? currentPath : null;
}

// ==================== TSW6 API HELPERS ====================
let cachedTSWKey = '';
let cachedTSWKeyMtime = 0;

function getTSWKeyFilePath() {
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(userProfile, 'Documents', 'My Games', 'TrainSimWorld6', 'Saved', 'Config', 'CommAPIKey.txt');
}

function loadTSWCommKey() {
  const keyFilePath = getTSWKeyFilePath();
  if (!fs.existsSync(keyFilePath)) {
    return null;
  }

  const stats = fs.statSync(keyFilePath);
  const mtimeMs = stats.mtimeMs || 0;
  if (cachedTSWKey && cachedTSWKeyMtime === mtimeMs) {
    return cachedTSWKey;
  }

  const key = fs.readFileSync(keyFilePath, 'utf8').trim();
  cachedTSWKey = key;
  cachedTSWKeyMtime = mtimeMs;
  return key || null;
}

function requestTSWApi(apiPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const commKey = loadTSWCommKey();
    if (!commKey) {
      reject(new Error('CommAPIKey.txt not found or empty'));
      return;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 31270,
        path: apiPath,
        method,
        headers: {
          DTGCommKey: commKey,
          Accept: 'application/json'
        },
        timeout: 1500
      },
      (tswRes) => {
        let body = '';
        tswRes.on('data', (chunk) => {
          body += chunk.toString();
        });
        tswRes.on('end', () => {
          let parsed = null;
          try {
            parsed = body ? JSON.parse(body) : null;
          } catch (err) {
            reject(new Error(`Invalid JSON from TSW API (${apiPath}): ${err.message}`));
            return;
          }

          resolve({
            statusCode: tswRes.statusCode || 0,
            payload: parsed
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('TSW API request timeout'));
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.end();
  });
}

function extractLatLonFromTSWPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const values = payload.Values;
  if (values && typeof values === 'object') {
    if (typeof values.Lat === 'number' && typeof values.Lon === 'number') {
      return { lat: values.Lat, lon: values.Lon };
    }

    const geoLocation = values.geolocation;
    if (geoLocation && typeof geoLocation === 'object' && typeof geoLocation.latitude === 'number' && typeof geoLocation.longitude === 'number') {
      return { lat: geoLocation.latitude, lon: geoLocation.longitude };
    }
  }

  return null;
}

function extractSpeedFromTSWPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const values = payload.Values;
  if (!values || typeof values !== 'object') return null;

  const speedKeys = ['Speed', 'speed', 'Velocity', 'velocity', 'SpeedMps', 'speedMps'];
  for (const key of speedKeys) {
    const speed = Number(values[key]);
    if (Number.isFinite(speed) && speed >= 0) return speed;
  }
  return null;
}

// Create HTTP server
const requestHandler = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Enable CORS for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route: GET / - Serve main HMI-C interface
  if (pathname === '/' || pathname === '/index.html') {
    try {
      const filePath = path.join(__dirname, 'index.html');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving index.html:', err);
      res.writeHead(404);
      res.end('index.html not found');
    }
    return;
  }

  // Route: GET /assets/qvas-project-logo.png - Serve the standby logo
  if (pathname === '/assets/qvas-project-logo.png') {
    try {
      const filePath = path.join(__dirname, 'assets', 'qvas-project-logo.png');
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(content);
    } catch (err) {
      console.error('Error serving standby logo:', err);
      res.writeHead(404);
      res.end('Standby logo not found');
    }
    return;
  }

  // Route: GET /gps-transmitter.html - Serve the phone GPS transmitter
  if (pathname === '/gps-transmitter.html') {
    try {
      const filePath = path.join(__dirname, 'gps-transmitter.html');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('gps-transmitter.html not found');
    }
    return;
  }

  // Route: GET /remote-audio.html - Serve the remote audio receiver
  if (pathname === '/remote-audio.html') {
    try {
      const filePath = path.join(__dirname, 'remote-audio.html');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('remote-audio.html not found');
    }
    return;
  }

  // Route: GET /pei-call-simulator.html - Serve the standalone PEI simulator
  if (pathname === '/pei-call-simulator.html') {
    try {
      const filePath = path.join(__dirname, 'pei-call-simulator.html');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('pei-call-simulator.html not found');
    }
    return;
  }

  // Route: GET /gps-transmitter-manifest.json - Installable mobile transmitter metadata
  if (pathname === '/gps-transmitter-manifest.json') {
    try {
      const filePath = path.join(__dirname, 'gps-transmitter-manifest.json');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('gps-transmitter-manifest.json not found');
    }
    return;
  }

  // Route: GET /qvas-local.crt - Download the local HTTPS certificate for phones
  if (pathname === '/qvas-local.crt' && req.method === 'GET') {
    try {
      const certificatePath = process.env.QVAS_HTTPS_CERT || path.join(os.homedir(), '.qvas-pids', 'https', 'qvas-local.crt');
      res.writeHead(200, { 'Content-Type': 'application/x-x509-ca-cert' });
      res.end(fs.readFileSync(certificatePath));
    } catch (error) {
      res.writeHead(404);
      res.end('Local HTTPS certificate not found');
    }
    return;
  }

  // Route: GET /app.js - Serve application JavaScript
  if (pathname === '/app.js') {
    try {
      const filePath = path.join(__dirname, 'app.js');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving app.js:', err);
      res.writeHead(404);
      res.end('app.js not found');
    }
    return;
  }

  // Route: GET /style.css - Serve stylesheet
  if (pathname === '/style.css') {
    try {
      const filePath = path.join(__dirname, 'style.css');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving style.css:', err);
      res.writeHead(404);
      res.end('style.css not found');
    }
    return;
  }

  if (pathname === '/manual-routes.html') {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'manual-routes.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('manual-routes.html not found');
    }
    return;
  }

  if (pathname === '/custom-announcements.html') {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'custom-announcements.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('custom-announcements.html not found');
    }
    return;
  }

  if (pathname === '/announcement-disable-rules.html') {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'announcement-disable-rules.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('announcement-disable-rules.html not found');
    }
    return;
  }

  if (pathname === '/api/custom-announcements' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 80 * 1024 * 1024) req.destroy();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const types = ['form', 'tns', 'naa', 'mtg'];
        const announcementType = types.includes(payload.announcementType) ? payload.announcementType : null;
        const station = typeof payload.station === 'string' ? payload.station.trim() : '';
        const routes = Array.isArray(payload.routes) ? payload.routes : [];
        if (!announcementType || routes.length === 0 || typeof payload.audioBase64 !== 'string' || (announcementType !== 'form' && !station)) {
          throw new Error('Choose an audio file, announcement type, station, and at least one route.');
        }
        const audioBuffer = Buffer.from(payload.audioBase64, 'base64');
        if (audioBuffer.length === 0 || audioBuffer.length > 50 * 1024 * 1024) {
          throw new Error('Invalid or oversized audio file.');
        }
        console.log(`\n🎙️ [CUSTOM ANNOUNCEMENT] ${announcementType.toUpperCase()} upload started`);
        console.log(`   Station: ${station || '(route-level Form)'}`);
        console.log(`   Selected routes: ${routes.length}`);
        console.log(`   Audio size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);

        const normalizeRoutePath = (value, fallback) => {
          const normalized = String(value || fallback || '').replace(/\\/g, '/').replace(/^\/+/, '');
          const routePath = normalized.startsWith('QR_PIDS_AudioFiles/')
            ? normalized
            : `QR_PIDS_AudioFiles/Route Audio Files/${normalized}`;
          if (routePath.split('/').includes('..')) throw new Error('Invalid route audio path.');
          return routePath;
        };
        const audioWriteRoot = path.resolve(process.env.QVAS_ASSETS_DIR || path.join(__dirname, '..'));
        const root = audioWriteRoot;
        console.log(`   Audio write root: ${root}`);
        const makeDestination = relativePath => {
          const target = path.resolve(root, relativePath);
          if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid audio destination.');
          return target;
        };

        const result = { copied: 0, skipped: 0, overwritten: 0, routes: 0 };
        for (const route of routes) {
          if (!route || typeof route.name !== 'string') continue;
          const folder = normalizeRoutePath('', route.name);
          console.log(`   Route: ${route.name}`);
          console.log(`   Target folder: ${folder}`);
          const destinations = announcementType === 'form'
            ? [`${folder}/Form.mp3`]
            : (Array.isArray(route.stations) ? route.stations : []).filter(name => String(name).trim() === station).map(name => {
              const stationName = String(name).trim();
              const filename = announcementType === 'tns'
                ? `TNS_${stationName}.mp3`
                : announcementType === 'naa'
                  ? `${stationName}.mp3`
                  : `${stationName} MTG.mp3`;
              return `${folder}/${filename}`;
            });

          let changed = false;
          for (const relativePath of destinations) {
            const target = makeDestination(relativePath);
            const exists = fs.existsSync(target);
            await fs.promises.mkdir(path.dirname(target), { recursive: true });
            await fs.promises.writeFile(target, audioBuffer);
            result[exists ? 'overwritten' : 'copied'] += 1;
            console.log(`     ${exists ? 'Updated' : 'Added'}: ${relativePath}`);
            changed = true;
          }
          if (changed) result.routes += 1;
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        console.log(`✅ [CUSTOM ANNOUNCEMENT] Complete: ${result.copied} added, ${result.overwritten} updated, ${result.routes} routes`);
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        console.error(`❌ [CUSTOM ANNOUNCEMENT] Failed: ${err.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  if (pathname === '/manual-routes.json' && req.method === 'GET') {
    try {
      const content = fs.readFileSync(manualRoutesFile, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ routes: [], error: err.message }));
    }
    return;
  }

  if (pathname === '/announcement-disable-rules.json' && req.method === 'GET') {
    try {
      const content = fs.readFileSync(announcementDisableRulesFile, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ routes: {}, error: err.message }));
    }
    return;
  }

  if ((pathname === '/api/announcement-disable-rules' || pathname === '/announcement-disable-rules.json') && (req.method === 'POST' || req.method === 'PUT')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1 * 1024 * 1024) req.destroy();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const normalized = payload && typeof payload === 'object' ? payload : { routes: {} };
        if (!normalized.routes || typeof normalized.routes !== 'object') normalized.routes = {};
        const targetPath = path.resolve(announcementDisableRulesFile);
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.promises.writeFile(targetPath, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, file: targetPath }));
      } catch (err) {
        console.error(`❌ [ANNOUNCEMENT RULES] Save failed: ${err.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  if (pathname === '/mtg-only-routes.html') {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'mtg-only-routes.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('mtg-only-routes.html not found');
    }
    return;
  }

  if (pathname === '/mtg-only-routes.json' && req.method === 'GET') {
    try {
      const content = fs.readFileSync(mtgOnlyRoutesFile, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ routes: [], error: err.message }));
    }
    return;
  }

  if (pathname === '/api/mtg-only-routes' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 100000) req.destroy();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed || !Array.isArray(parsed.routes)) throw new Error('Invalid MTG-only route data');
        const routes = [...new Set(parsed.routes.map(route => String(route).trim().toUpperCase()).filter(Boolean))].sort();
        fs.mkdirSync(path.dirname(mtgOnlyRoutesFile), { recursive: true });
        fs.writeFileSync(mtgOnlyRoutesFile, JSON.stringify({ routes }, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/manual-routes' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed || !Array.isArray(parsed.routes)) throw new Error('Invalid manual route data');
        fs.mkdirSync(path.dirname(manualRoutesFile), { recursive: true });
        fs.writeFileSync(manualRoutesFile, JSON.stringify(parsed, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  if (pathname === '/announcement-texts.html' || pathname === '/announcement-text.html') {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'announcement-texts.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('announcement-texts.html not found');
    }
    return;
  }

  if (pathname === '/announcement-texts.json' && req.method === 'GET') {
    try {
      const content = fs.readFileSync(announcementTextsFile, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ version: 1, defaults: {}, routes: [], specialMessages: [], error: err.message }));
    }
    return;
  }

  if (pathname === '/api/announcement-texts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed !== 'object'
          || !parsed.defaults || typeof parsed.defaults !== 'object'
          || !Array.isArray(parsed.routes)
          || !Array.isArray(parsed.specialMessages)) {
          throw new Error('Invalid announcement text data');
        }
        fs.mkdirSync(path.dirname(announcementTextsFile), { recursive: true });
        fs.writeFileSync(announcementTextsFile, JSON.stringify(parsed, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // Route: GET /destinations.json - Serve destinations list
  if (pathname === '/destinations.json') {
    try {
      const filePath = path.join(__dirname, 'destinations.json');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving destinations.json:', err);
      res.writeHead(404);
      res.end('destinations.json not found');
    }
    return;
  }

  // Route: GET /station-codes.json - Serve station name/code mappings
  if (pathname === '/station-codes.json') {
    try {
      const filePath = path.join(__dirname, 'station-codes.json');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving station-codes.json:', err);
      res.writeHead(404);
      res.end('station-codes.json not found');
    }
    return;
  }

  // Route: GET /route-topology.json - Serve map-derived rail infrastructure
  if (pathname === '/route-topology.json') {
    try {
      const filePath = path.join(__dirname, 'route-topology.json');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving route-topology.json:', err);
      res.writeHead(404);
      res.end('route-topology.json not found');
    }
    return;
  }

  // Route: GET /peakruns.json - Serve peak time run codes
  if (pathname === '/peakruns.json') {
    try {
      const filePath = path.join(__dirname, '../QR_PIDS_AudioFiles/peakruns.json');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving peakruns.json:', err);
      res.writeHead(404);
      res.end('peakruns.json not found');
    }
    return;
  }

  // Route: GET /gtfs-patterns.json - Serve GTFS patterns
  if (pathname === '/gtfs-patterns.json') {
    try {
      const filePath = path.join(__dirname, '..', 'gtfs-patterns.json');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving gtfs-patterns.json:', err);
      res.writeHead(404);
      res.end('gtfs-patterns.json not found');
    }
    return;
  }

  // Route: GET /SEQ_GTFS/* - Serve SEQ_GTFS CSV files
  if (pathname.startsWith('/SEQ_GTFS/')) {
    try {
      const filename = pathname.replace(/^\/SEQ_GTFS\//, '');
      // Security: only allow alphanumeric and underscore in filename
      if (!/^[a-zA-Z0-9_]+\.txt$/.test(filename)) {
        res.writeHead(400);
        res.end('Invalid filename');
        return;
      }
      
      const bundledGTFSDir = path.resolve(path.join(__dirname, '..', 'SEQ_GTFS'));
      const updatedGTFSDir = process.env.QVAS_GTFS_DIR ? path.resolve(process.env.QVAS_GTFS_DIR) : null;
      const updatedFilePath = updatedGTFSDir ? path.join(updatedGTFSDir, filename) : null;
      const filePath = updatedFilePath && fs.existsSync(updatedFilePath)
        ? updatedFilePath
        : path.join(bundledGTFSDir, filename);

      // Security: prevent directory traversal
      const realPath = path.resolve(filePath);
      const gtfsDir = path.resolve(path.dirname(filePath));
      if (!realPath.startsWith(gtfsDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      
      if (!fs.existsSync(filePath)) {
        console.warn(`SEQ_GTFS file not found: ${filename}`);
        res.writeHead(404);
        res.end(`File not found: ${filename}`);
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(content);
      console.log(`✅ Served SEQ_GTFS/${filename} (${content.length} bytes)`);
    } catch (err) {
      console.error('Error serving SEQ_GTFS file:', err);
      res.writeHead(500);
      res.end('Error reading file');
    }
    return;
  }

  // Route: GET /special-messages.json - Serve special messages
  if (pathname === '/special-messages.json') {
    try {
      const filePath = path.join(__dirname, 'special-messages.json');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving special-messages.json:', err);
      res.writeHead(404);
      res.end('special-messages.json not found');
    }
    return;
  }

  // Route: GET /emergency-messages.json - Serve emergency messages
  if (pathname === '/emergency-messages.json') {
    try {
      const filePath = path.join(__dirname, 'emergency-messages.json');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('Error serving emergency-messages.json:', err);
      res.writeHead(404);
      res.end('emergency-messages.json not found');
    }
    return;
  }

  // Route: GET /stopping-patterns.json - Serve stopping patterns for run codes
  if (pathname === '/stopping-patterns.json') {
    try {
      console.log('📋 [REQUEST] GET /stopping-patterns.json');
      const filePath = path.join(__dirname, 'stopping-patterns.json');
      const content = fs.readFileSync(filePath, 'utf8');
      const patterns = JSON.parse(content);
      console.log(`✅ [RESPONSE] Serving /stopping-patterns.json with ${Object.keys(patterns).length} patterns (${content.length} bytes)`);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(content);
    } catch (err) {
      console.error('❌ [ERROR] Error serving stopping-patterns.json:', err.message);
      res.writeHead(404);
      res.end('stopping-patterns.json not found');
    }
    return;
  }

  // ==================== VAS GTFS API ENDPOINTS ====================
  // Load GTFS patterns once at server start for API use
  let gtfsCache = null;
  const loadGTFSCache = () => {
    if (!gtfsCache) {
      try {
        const filePath = path.join(__dirname, '..', 'gtfs-patterns.json');
        const content = fs.readFileSync(filePath, 'utf8');
        gtfsCache = JSON.parse(content);
        console.log(`✅ [GTFS-API] Loaded ${Object.keys(gtfsCache.routes || {}).length} routes into cache`);
      } catch (err) {
        console.error('❌ [GTFS-API] Error loading GTFS cache:', err.message);
      }
    }
    return gtfsCache;
  };

  // Route: GET /api/routes - Get all available routes
  if (pathname === '/api/routes') {
    try {
      const gtfs = loadGTFSCache();
      if (!gtfs || !gtfs.routes) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GTFS data not available' }));
        return;
      }

      const routes = Object.keys(gtfs.routes).map(routeId => {
        const route = gtfs.routes[routeId];
        return {
          route_id: routeId,
          route_name: route.route_name,
          route_long_name: route.route_long_name,
          pattern_count: (route.patterns || []).length
        };
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        total_routes: routes.length,
        routes: routes
      }));
    } catch (err) {
      console.error('Error in /api/routes:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Route: GET /api/route/:code - Get stopping patterns for a route
  if (pathname.startsWith('/api/route/')) {
    try {
      const routeCode = decodeURIComponent(pathname.split('/api/route/')[1].split('?')[0]).toUpperCase();
      const gtfs = loadGTFSCache();
      
      if (!gtfs || !gtfs.routes) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GTFS data not available' }));
        return;
      }

      // Try exact match first
      let route = gtfs.routes[routeCode];
      
      // If not found, try to find by route code prefix (e.g., "IPBR" matches "IPBR-4730")
      if (!route) {
        for (const [routeId, routeData] of Object.entries(gtfs.routes)) {
          if (routeId.startsWith(routeCode + '-') || routeId.toUpperCase() === routeCode) {
            route = routeData;
            break;
          }
        }
      }

      if (!route) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Route ${routeCode} not found` }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        route_name: route.route_name,
        route_long_name: route.route_long_name,
        patterns: route.patterns || []
      }));
    } catch (err) {
      console.error('Error in /api/route/', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Route: GET /api/search/run/:runCode - Search for a run code in GTFS
  if (pathname.startsWith('/api/search/run/')) {
    try {
      const runCode = decodeURIComponent(pathname.split('/api/search/run/')[1].split('?')[0]).toUpperCase();
      const gtfs = loadGTFSCache();
      
      if (!gtfs) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GTFS data not available' }));
        return;
      }

      // Search in trip ID map for the run code
      let foundRoutes = [];
      for (const [tripId, routeId] of Object.entries(gtfs.tripIdMap || {})) {
        if (tripId.includes(runCode)) {
          const route = gtfs.routes[routeId];
          if (route && !foundRoutes.find(r => r.route_id === routeId)) {
            foundRoutes.push({
              route_id: routeId,
              route_name: route.route_name,
              route_long_name: route.route_long_name,
              trip_id: tripId
            });
          }
        }
      }

      if (foundRoutes.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Run code ${runCode} not found`, results: [] }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        search_term: runCode,
        results_count: foundRoutes.length,
        results: foundRoutes
      }));
    } catch (err) {
      console.error('Error in /api/search/run/', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Route: GET /api/audio-files - Get directory structure of audio files
  if (pathname === '/api/audio-files') {
    try {
      let audioBasePath = path.join(__dirname, '..', 'QR_PIDS_AudioFiles');
      
      // Debug: log the path being checked
      console.log(`📂 [AUDIO-FILES] Checking path: ${audioBasePath}`);
      
      // If primary path doesn't exist, try audio folder
      if (!fs.existsSync(audioBasePath)) {
        const altPath = path.join(__dirname, '..', 'audio', 'QR_PIDS_AudioFiles');
        console.log(`📂 [AUDIO-FILES] Primary path not found, trying: ${altPath}`);
        if (fs.existsSync(altPath)) {
          audioBasePath = altPath;
          console.log(`✓ [AUDIO-FILES] Using alternate path`);
        } else {
          console.log(`✗ [AUDIO-FILES] Neither path exists`);
          res.writeHead(404);
          res.end(JSON.stringify({ 
            error: 'Audio directory not found',
            checked_paths: [
              path.join(__dirname, '..', 'QR_PIDS_AudioFiles'),
              altPath
            ]
          }));
          return;
        }
      }
      
      const dirPath = query.path ? decodeURIComponent(query.path) : '';
      const fullPath = path.join(audioBasePath, dirPath);
      
      console.log(`📂 [AUDIO-FILES] Full path: ${fullPath}`);
      
      // Security: prevent directory traversal
      if (!path.resolve(fullPath).startsWith(path.resolve(audioBasePath))) {
        console.log(`⚠️ [AUDIO-FILES] Security check failed`);
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }
      
      if (!fs.existsSync(fullPath)) {
        console.log(`⚠️ [AUDIO-FILES] Directory not found: ${fullPath}`);
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Directory not found' }));
        return;
      }
      
      const items = fs.readdirSync(fullPath);
      console.log(`📂 [AUDIO-FILES] Found ${items.length} items`);
      
      const structure = {
        folders: [],
        files: []
      };
      
      items.forEach(item => {
        const itemPath = path.join(fullPath, item);
        try {
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            structure.folders.push({
              name: item,
              path: dirPath ? `${dirPath}/${item}` : item
            });
          } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            // Include audio files
            if (['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(ext)) {
              structure.files.push({
                name: item,
                path: dirPath ? `${dirPath}/${item}` : item,
                ext: ext
              });
            }
          }
        } catch (e) {
          console.log(`   Skipping item ${item}: ${e.message}`);
        }
      });
      
      // Sort folders first, then files
      structure.folders.sort((a, b) => a.name.localeCompare(b.name));
      structure.files.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`✓ [AUDIO-FILES] Returning ${structure.folders.length} folders and ${structure.files.length} files`);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(structure));
    } catch (err) {
      console.error('❌ [AUDIO-FILES] Error reading audio files:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error', details: err.message }));
    }
    return;
  }

  // Route: GET /api/state - Get current app state and pending key presses
  if (pathname === '/api/state') {
    const state = {
      ...appState,
      timestamp: Date.now()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(state));
    
    // Clear lastKeyPress after sending (one-time delivery)
    if (appState.lastKeyPress) {
      appState.lastKeyPress = null;
    }
    
    return;
  }

  // Route: GET /api/tsw/player-position - Poll current train position from TSW6 External API
  if (pathname === '/api/tsw/player-position') {
    (async () => {
      try {
        const requestedSource = query.source === 'onboard' ? 'onboard' : 'phone';
        if (requestedSource === 'phone' && phoneGPSData && Date.now() - phoneGPSData.receivedAt <= PHONE_GPS_MAX_AGE_MS) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, source: 'Phone GPS', ...phoneGPSData }));
          return;
        }

        if (requestedSource === 'phone') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            unavailable: true,
            source: 'Phone GPS',
            error: 'No recent phone GPS data'
          }));
          return;
        }

        const primary = await requestTSWApi('/get/CurrentFormation/0.LatLon');
        let latLon = extractLatLonFromTSWPayload(primary.payload);
        let speed = extractSpeedFromTSWPayload(primary.payload);
        if (speed === null) {
          try {
            const speedResponse = await requestTSWApi('/get/CurrentFormation/0.Speed');
            speed = extractSpeedFromTSWPayload(speedResponse.payload);
          } catch (error) {}
        }

        // Fallback to DriverAid.PlayerInfo when CurrentFormation/0.LatLon is not available.
        if (!latLon) {
          const fallback = await requestTSWApi('/get/DriverAid.PlayerInfo');
          latLon = extractLatLonFromTSWPayload(fallback.payload);
          if (speed === null) speed = extractSpeedFromTSWPayload(fallback.payload);
          if (!latLon) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(
              JSON.stringify({
                success: false,
                unavailable: true,
                error: 'Unable to parse Lat/Lon from TSW API responses',
                primaryStatus: primary.statusCode,
                fallbackStatus: fallback.statusCode
              })
            );
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              success: true,
              source: requestedSource === 'onboard' ? 'Onboard speed + DriverAid.PlayerInfo' : 'DriverAid.PlayerInfo',
              lat: latLon.lat,
              lon: latLon.lon,
              speed
            })
          );
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            success: true,
            source: requestedSource === 'onboard' ? 'Onboard speed + CurrentFormation/0.LatLon' : 'CurrentFormation/0.LatLon',
            lat: latLon.lat,
            lon: latLon.lon,
            speed
          })
        );
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            success: false,
            unavailable: true,
            error: err.message
          })
        );
      }
    })();
    return;
  }

  // Route: POST /api/phone-gps - Receive GPS data from the driver's phone
  if (pathname === '/api/phone-gps' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10000) req.destroy();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const lat = Number(payload.lat);
        const lon = Number(payload.lon);
        const speed = payload.speed === null || payload.speed === undefined ? null : Number(payload.speed);
        const accuracy = Number(payload.accuracy);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid GPS coordinates' }));
          return;
        }

        phoneGPSData = {
          lat,
          lon,
          speed: speed !== null && Number.isFinite(speed) && speed >= 0 ? speed : null,
          accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
          timestamp: Number(payload.timestamp) || Date.now(),
          receivedAt: Date.now()
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (pathname === '/api/pei-state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(appState.pei));
    return;
  }

  if (pathname === '/api/pei-state' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        if (!incoming || !Array.isArray(incoming.calls)) throw new Error('Invalid PEI state');
        appState.pei = {
          ...appState.pei,
          ...incoming,
          calls: incoming.calls,
          connectedCabs: Array.isArray(incoming.connectedCabs) ? incoming.connectedCabs : [],
          cctvViewers: Array.isArray(incoming.cctvViewers) ? incoming.cctvViewers : [],
          revision: (appState.pei.revision || 0) + 1,
          updatedAt: Date.now()
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, state: appState.pei }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: error.message }));
      }
    });
    return;
  }

  // Route: POST /api/key-press - Receive key presses from keyboard listener
  if (pathname === '/api/key-press' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        appState.lastKeyPress = data;
        console.log(`📍 Key press received: ${data.key}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Error parsing key press data:', err);
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  // Route: POST /api/state-update - Update door cycle state from app
  if (pathname === '/api/state-update' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const currentAnnouncementTime = Number(appState.announcement?.startedAt || 0);
        const incomingAnnouncementTime = Number(data.announcement?.startedAt || data.announcementClearedAt || 0);
        const isOlderAnnouncementUpdate = incomingAnnouncementTime > 0
          && currentAnnouncementTime > incomingAnnouncementTime;
        const previousAnnouncement = appState.announcement;

        appState = { ...appState, ...data };
        if (isOlderAnnouncementUpdate) {
          appState.announcement = previousAnnouncement;
        }
        console.log(`📊 State updated: ${JSON.stringify(data)}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Error parsing state update:', err);
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  // Route: GET /api/assets-status - Check required runtime asset folders
  if (pathname === '/api/assets-status') {
    const configuredAudioPath = process.env.QVAS_ASSETS_DIR
      ? path.join(process.env.QVAS_ASSETS_DIR, 'QR_PIDS_AudioFiles')
      : null;
    const audioPath = path.join(__dirname, '..', 'QR_PIDS_AudioFiles');
    const alternateAudioPath = path.join(__dirname, '..', 'audio', 'QR_PIDS_AudioFiles');
    const configuredGTFSPath = process.env.QVAS_GTFS_DIR
      ? path.resolve(process.env.QVAS_GTFS_DIR)
      : null;
    const bundledGTFSPath = path.join(__dirname, '..', 'SEQ_GTFS');
    const audioRoots = [configuredAudioPath, audioPath, alternateAudioPath].filter(Boolean);
    const audioReady = audioRoots.some(root => Boolean(resolvePathCaseInsensitive(root, 'StartUp.MP3')));
    const getMissingGTFSFiles = (rootPath) => {
      if (!rootPath || !fs.existsSync(rootPath)) return REQUIRED_GTFS_FILES;
      return REQUIRED_GTFS_FILES.filter(file => {
        const filePath = path.join(rootPath, file);
        return !fs.existsSync(filePath) || !fs.statSync(filePath).isFile();
      });
    };
    const configuredMissingGTFSFiles = configuredGTFSPath ? getMissingGTFSFiles(configuredGTFSPath) : [];
    const gtfsReady = configuredGTFSPath
      ? configuredMissingGTFSFiles.length === 0
      : getMissingGTFSFiles(bundledGTFSPath).length === 0;
    const missing = [];
    if (!audioReady) missing.push('QR_PIDS_AudioFiles');
    if (!gtfsReady) missing.push('SEQ_GTFS');

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ready: missing.length === 0,
      missing,
      missingGTFSFiles: configuredGTFSPath ? configuredMissingGTFSFiles : getMissingGTFSFiles(bundledGTFSPath)
    }));
    return;
  }

  // Routes: GET /QR_PIDS_AudioFiles/* and /audio/* - Serve audio files
  if (pathname.startsWith('/QR_PIDS_AudioFiles/') || pathname.startsWith('/audio/')) {
    const isLegacyAudioRoute = pathname.startsWith('/audio/');
    let audioPath = decodeURIComponent(pathname.replace(isLegacyAudioRoute ? /^\/audio\// : /^\//, ''));
    let filePath = '';
    
    console.log(`\n🔊 [AUDIO REQUEST]`);
    console.log(`   Requested path: ${audioPath}`);
    
    const audioRoots = [
      process.env.QVAS_ASSETS_DIR,
      customAudioDirectory,
      path.join(__dirname, '..'),
      path.join(__dirname, '..', 'audio')
    ].filter(Boolean).map(root => path.resolve(root));
    const candidatePaths = [];

    // If path already starts with QR_PIDS_AudioFiles, try audio folder first, then root
    if (audioPath.startsWith('QR_PIDS_AudioFiles/')) {
      candidatePaths.push(...audioRoots.map(root => ({ root, relativePath: audioPath })));
      
      // Debug: Show if this is a TNS_Special request
      if (audioPath.includes('TNS_Special')) {
        console.log(`   Mode: TNS_Special route-specific file`);
      }
    } else {
      candidatePaths.push(...audioRoots.flatMap(root => [
        { root, relativePath: path.join('audio', audioPath) },
        { root, relativePath: path.join('QR_PIDS_AudioFiles', audioPath) }
      ]));
    }

    filePath = candidatePaths
      .map(candidate => resolvePathCaseInsensitive(candidate.root, candidate.relativePath))
      .find(Boolean) || path.join(candidatePaths[0].root, candidatePaths[0].relativePath);
    
    console.log(`   Full path: ${filePath}`);
    
    // Security: prevent directory traversal (allow both audio and QR_PIDS_AudioFiles)
    const resolvedFilePath = path.resolve(filePath);
    const isAllowedAudioPath = audioRoots.some(root =>
      resolvedFilePath === root || resolvedFilePath.startsWith(`${root}${path.sep}`)
    );
    if (!isAllowedAudioPath) {
      console.error(`   ✗ Security check failed - path outside root`);
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`   ✗ File not found at: ${filePath}`);
      
      // Debug: List nearby files if in QR_PIDS_AudioFiles
      if (filePath.includes('QR_PIDS_AudioFiles')) {
        const directory = path.dirname(filePath);
        if (fs.existsSync(directory)) {
          try {
            const files = fs.readdirSync(directory);
            console.log(`   Debug - Files in ${directory}:`);
            files.slice(0, 10).forEach(f => console.log(`     • ${f}`));
            if (files.length > 10) console.log(`     ... and ${files.length - 10} more`);
          } catch (e) {
            console.log(`   Debug - Could not list directory`);
          }
        } else {
          console.log(`   Debug - Directory does not exist: ${directory}`);
          
          // List parent directory to help debug
          const parentDir = path.dirname(directory);
          if (fs.existsSync(parentDir)) {
            try {
              const parentFiles = fs.readdirSync(parentDir);
              console.log(`   Debug - Files in parent (${parentDir}):`);
              parentFiles.slice(0, 5).forEach(f => console.log(`     • ${f}`));
            } catch (e) {}
          }
        }
      }
      
      res.writeHead(404);
      res.end('Audio file not found');
      return;
    }
    
    console.log(`   ✓ File found, serving...`);
    
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'audio/mpeg';
      if (ext === '.mp3') {
        contentType = 'audio/mpeg';
      } else if (ext === '.wav') {
        contentType = 'audio/wav';
      } else if (ext === '.mp4') {
        contentType = 'video/mp4';
      }
      
      // For video files, add range request support and proper headers
      if (ext === '.mp4') {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': stats.size,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Cache-Control': 'public, max-age=31536000'
        });
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
      res.end(content);
    } catch (err) {
      console.error('Error serving audio:', err);
      res.writeHead(500);
      res.end('Error serving audio');
    }
    return;
  }

  // Route: GET /CCTV/* - Serve CCTV images
  if (pathname.startsWith('/CCTV/')) {
    let cctvPath = decodeURIComponent(pathname.replace(/^\/CCTV\//, ''));
    const cctvRoot = path.resolve(path.join(__dirname, '..', 'CCTV'));
    const filePath = resolvePathCaseInsensitive(cctvRoot, cctvPath);
    
    console.log(`\n📷 [CCTV REQUEST]`);
    console.log(`   Requested path: ${cctvPath}`);
    console.log(`   Full path: ${filePath}`);
    
    // Security: prevent directory traversal
    const electronRoot = path.resolve(path.join(__dirname, '..'));
    if (!filePath || !path.resolve(filePath).startsWith(`${cctvRoot}${path.sep}`)) {
      console.error(`   ✗ Security check failed - path outside root`);
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    // Check if file exists
    if (!filePath || !fs.existsSync(filePath)) {
      console.error(`   ✗ File not found at: ${filePath}`);
      res.writeHead(404);
      res.end('CCTV image not found');
      return;
    }
    
    console.log(`   ✓ File found, serving...`);
    
    try {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentTypeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      };
      const contentType = contentTypeMap[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      console.error('Error serving CCTV image:', err);
      res.writeHead(500);
      res.end('Error serving CCTV image');
    }
    return;
  }

  // Default 404
  console.log(`⚠️ [DEFAULT-404] No handler matched for: ${pathname}`);
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not found', path: pathname }));
};

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(address => address && address.family === 'IPv4' && !address.internal)
    .map(address => address.address);
}

async function getCertificatePaths() {
  if (process.env.QVAS_HTTPS_KEY && process.env.QVAS_HTTPS_CERT) {
    return {
      key: process.env.QVAS_HTTPS_KEY,
      cert: process.env.QVAS_HTTPS_CERT
    };
  }

  const certificateDirectory = path.join(os.homedir(), '.qvas-pids', 'https');
  const keyPath = path.join(certificateDirectory, 'qvas-local.key');
  const certPath = path.join(certificateDirectory, 'qvas-local.crt');
  const certificateVersionPath = path.join(certificateDirectory, 'qvas-local-ca-v2');
  if (!fs.existsSync(certificateVersionPath)) {
    fs.mkdirSync(certificateDirectory, { recursive: true });
    if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
    if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
    const lanAddresses = getLanAddresses();
    const attributes = [{ name: 'commonName', value: 'QVAS PIDS local server' }];
    const { private: privateKey, cert } = await selfsigned.generate(attributes, {
      days: 825,
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [
        { name: 'basicConstraints', cA: true, critical: true },
        { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, keyCertSign: true },
        { name: 'extKeyUsage', serverAuth: true },
        { name: 'subjectAltName', altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          ...lanAddresses.map(ip => ({ type: 7, ip }))
        ] }
      ]
    });
    fs.writeFileSync(keyPath, privateKey);
    fs.writeFileSync(certPath, cert);
    fs.writeFileSync(certificateVersionPath, '2');
    console.log(`🔐 Generated local HTTPS certificate: ${certPath}`);
    console.log('   Install this certificate on the phone before opening the GPS transmitter.');
  }
  return { key: keyPath, cert: certPath };
}

// HTTPS is required by phone browsers for geolocation. A local certificate removes
// the need for a public tunnel when the phone and computer share a LAN.
const PORT = 3000;
let server;
const protocol = 'https';

async function startServer() {
  const certificatePaths = await getCertificatePaths();
  server = https.createServer({
    key: fs.readFileSync(certificatePaths.key),
    cert: fs.readFileSync(certificatePaths.cert)
  }, requestHandler);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ QR PIDS Announcement System server listening on ${protocol}://0.0.0.0:${PORT}`);
    getLanAddresses().forEach(address => {
      console.log(`📱 GPS Transmitter: ${protocol}://${address}:${PORT}/gps-transmitter.html`);
      console.log(`📜 Phone certificate: ${protocol}://${address}:${PORT}/qvas-local.crt`);
    });
    console.log(`   Running in Electron app`);
  });
}

startServer().catch(error => {
  console.error(`❌ HTTPS server could not start: ${error.message}`);
  process.exitCode = 1;
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
