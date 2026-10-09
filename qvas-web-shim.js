/*
 * QVAS web/PWA shim
 * Replaces what server.js (Node) and main.js (Electron) provided, so the UI runs
 * standalone inside a WKWebView. Loaded before app.js.
 */
(function () {
  'use strict';

  const realFetch = window.fetch.bind(window);

  // index.html switches into "remote device" mode in any browser (no `require`). That mode starts a second
  // /api/state poller that consumes key presses it cannot act on (and has no case for key 7) and re-requests
  // audio from a server endpoint that doesn't exist here. This app IS the host, so declare it as such.
  window.electronApp = true;

  // ---------- sliders sized for a phone screen ----------
  // The Fn screen's brightness/volume sliders are built for a tall desktop window (280px bars + big padding), so on a
  // landscape phone (~393px high) the handles end up off-screen under the footer buttons. Compact the layout and size
  // the bars from the screen height; app.js reads the sizes from window.__QV_SLIDER (patched in by the build).
  (function () {
    // Sizes are computed once, lazily, because window.innerHeight is only right after the page's viewport tag has
    // been applied (this script runs before it). app.js reads window.__QV_SLIDER when it starts; the CSS is applied at
    // DOMContentLoaded. Whichever comes first fixes the numbers so the CSS and app.js always agree.
    let sizes = null;
    const compute = () => {
      if (sizes) return sizes;
      const H = window.innerHeight;
      if (!H || H >= 700) return (sizes = { track: 280, handle: 40, phone: false });
      const track = Math.max(50, Math.min(280, H - 320));
      return (sizes = { track, handle: track < 120 ? 26 : 40, phone: true });
    };
    Object.defineProperty(window, '__QV_SLIDER', { configurable: true, get: compute });
    const applyCss = () => {
      const z = compute();
      if (!z.phone) return;
      const st = document.createElement('style');
      st.textContent = `
        .fn-panel-left{padding:6px 10px !important}
        .fn-sliders{padding:2px 20px !important;align-items:center !important}
        .fn-slider-group{width:150px !important}
        .fn-slider-value{font-size:18px !important;margin-bottom:4px !important}
        .fn-slider-label{font-size:13px !important;margin-top:4px !important}
        .fn-slider-track{height:${z.track}px !important}
        .fn-slider-handle{height:${z.handle}px !important;touch-action:none}`;
      document.head.appendChild(st);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyCss); else applyCss();
  })();

  // ---------- black border / iPhone safe areas ----------
  // The app draws edge to edge (viewport-fit=cover), so on an iPhone the Dynamic Island, rounded corners and home
  // indicator would overlap it. Pad the page with the safe-area insets (min 10px/6px) on a black background.
  (function () {
    const st = document.createElement('style');
    st.textContent = `
      html{background:#000 !important;height:100%;box-sizing:border-box;
        padding:max(env(safe-area-inset-top,0px),6px) max(env(safe-area-inset-right,0px),10px)
                max(env(safe-area-inset-bottom,0px),6px) max(env(safe-area-inset-left,0px),10px)}
      body{height:100% !important;border-radius:10px;overflow:hidden}
      /* keys shrink to fit the narrower screen instead of wrapping (which clipped the bottom row) */
      .touch-keyboard .keyboard-row{flex-wrap:nowrap !important}
      .touch-keyboard .key-btn{flex:1 1 0;min-width:0 !important;max-width:84px;padding-left:2px !important;padding-right:2px !important}`;
    (document.head || document.documentElement).appendChild(st);
  })();

  // ---------- GitHub Pages base path ----------
  // On https://user.github.io/repo/ the app lives under /repo/, but app.js uses root-absolute URLs
  // like /audio/... and /api/... . Rewrite same-origin root-absolute URLs to include the base.
  const BASE = window.location.pathname.replace(/[^/]*$/, ''); // e.g. "/repo/" or "/"
  // The site keeps audio under audio/QR_PIDS_AudioFiles/; the desktop server also answered /QR_PIDS_AudioFiles/...
  function fixUrl(u) {
    try {
      if (typeof u !== 'string' || /^(blob:|data:)/i.test(u)) return u;
      const url = new URL(u, window.location.href);
      if (url.origin !== window.location.origin) return u;
      let rel = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname.replace(/^\//, '');
      if (/^QR_PIDS_AudioFiles\//i.test(rel)) rel = 'audio/' + rel;
      // GitHub Pages is case-sensitive, Windows isn't (the desktop server also matched audio names ignoring case).
      if (/^audio\//i.test(rel) && window.__QVAS_AUDIO_INDEX) {
        let dec = rel; try { dec = decodeURIComponent(rel); } catch (e) {}
        const real = window.__QVAS_AUDIO_INDEX[dec.toLowerCase()];
        if (real && real !== dec) rel = real.split('/').map(encodeURIComponent).join('/');
      }
      const fixed = BASE + rel;
      if (fixed === url.pathname) return u;
      url.pathname = fixed;
      return url.toString();
    } catch (e) {}
    return u;
  }
  function relPath(pathname) { // strip the base so route matching sees "/api/..." again
    return BASE !== '/' && pathname.startsWith(BASE) ? '/' + pathname.slice(BASE.length) : pathname;
  }
  {
    const NativeAudio = window.Audio;
    window.Audio = function (src) { const a = new NativeAudio(); if (src !== undefined) a.src = src; return a; };
    window.Audio.prototype = NativeAudio.prototype;
    [[HTMLMediaElement, 'src'], [HTMLImageElement, 'src'], [HTMLSourceElement, 'src']].forEach(([C, prop]) => {
      const d = Object.getOwnPropertyDescriptor(C.prototype, prop);
      if (d && d.set) Object.defineProperty(C.prototype, prop, { get: d.get, set(v) { d.set.call(this, fixUrl(v)); }, configurable: true });
    });
  }

  // ---------- big GTFS files are stored as <1 chunk><N> parts (GitHub 100 MB file limit) ----------
  let partsPromise = null;
  const loadParts = () => partsPromise || (partsPromise = realFetch('SEQ_GTFS/_parts.json').then(r => r.ok ? r.json() : {}).catch(() => ({})));
  async function assemble(name, dir) {
    const parts = await loadParts();
    if (!parts[name]) return null;
    const blobs = [];
    for (let i = 0; i < parts[name]; i++) {
      const r = await realFetch(`${dir}${name}.part${i}`);
      if (!r.ok) throw new Error(`missing ${name}.part${i}`);
      blobs.push(await r.blob());
    }
    return new Response(new Blob(blobs), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  const gtfsFile = (name) => assemble(name, 'SEQ_GTFS/');

  // ---------- in-memory state (was appState / phoneGPSData in server.js) ----------
  let appState = {
    doorCycle: 0, route: '', station: '', pid: '', DI: '',
    inputValue: '', lastKeyPress: null, timestamp: Date.now()
  };
  let phoneGPS = null;
  const GPS_MAX_AGE_MS = 10000;

  // ---------- cached static data ----------
  let patternsPromise = null;
  let manifestPromise = null;
  const loadPatterns = () => patternsPromise || (patternsPromise = assemble('gtfs-patterns.json', '').then(r => r || realFetch('gtfs-patterns.json')).then(r => r.json()));
  const loadManifest = () => manifestPromise || (manifestPromise = realFetch('audio-manifest.json').then(r => r.json()));

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  async function bodyOf(init, input) {
    try {
      if (init && typeof init.body === 'string') return JSON.parse(init.body);
      if (input && typeof input.text === 'function') return JSON.parse(await input.text());
    } catch (e) { /* fall through */ }
    return {};
  }

  // ---------- route handlers (ported from server.js) ----------
  async function handle(pathname, search, method, init, input) {
    // v17 startup check: "are the audio + GTFS assets installed?" Everything is bundled in the site, so yes.
    // (Returning ready:true also means the app never tries the desktop-only asset downloader.)
    if (pathname === '/api/assets-status') {
      return json({ ready: true, missing: [], missingGTFSFiles: [] });
    }

    if (pathname === '/api/routes') {
      const gtfs = await loadPatterns();
      const routes = Object.keys(gtfs.routes || {}).map(id => ({
        route_id: id,
        route_name: gtfs.routes[id].route_name,
        route_long_name: gtfs.routes[id].route_long_name,
        pattern_count: (gtfs.routes[id].patterns || []).length
      }));
      return json({ success: true, total_routes: routes.length, routes });
    }

    if (pathname.startsWith('/api/route/')) {
      const gtfs = await loadPatterns();
      const code = decodeURIComponent(pathname.split('/api/route/')[1].split('?')[0]).toUpperCase();
      let route = gtfs.routes[code];
      if (!route) {
        for (const [id, data] of Object.entries(gtfs.routes)) {
          if (id.startsWith(code + '-') || id.toUpperCase() === code) { route = data; break; }
        }
      }
      if (!route) return json({ error: `Route ${code} not found` }, 404);
      return json({ success: true, route_name: route.route_name, route_long_name: route.route_long_name, patterns: route.patterns || [] });
    }

    if (pathname.startsWith('/api/search/run/')) {
      const gtfs = await loadPatterns();
      const run = decodeURIComponent(pathname.split('/api/search/run/')[1].split('?')[0]).toUpperCase();
      const found = [];
      for (const [tripId, routeId] of Object.entries(gtfs.tripIdMap || {})) {
        if (tripId.includes(run)) {
          const route = gtfs.routes[routeId];
          if (route && !found.find(r => r.route_id === routeId)) {
            found.push({ route_id: routeId, route_name: route.route_name, route_long_name: route.route_long_name, trip_id: tripId });
          }
        }
      }
      if (!found.length) return json({ success: false, message: `Run code ${run} not found`, results: [] }, 404);
      return json({ success: true, search_term: run, results_count: found.length, results: found });
    }

    if (pathname === '/api/audio-files') {
      const manifest = await loadManifest();
      const dir = new URLSearchParams(search).get('path') || '';
      const entry = manifest[decodeURIComponent(dir)];
      if (!entry) return json({ error: 'Directory not found' }, 404);
      return json(entry);
    }

    if (pathname === '/api/state') {
      const snapshot = { ...appState, timestamp: Date.now() };
      appState.lastKeyPress = null; // one-time delivery, as on the server
      return json(snapshot);
    }

    if (pathname === '/api/state-update' && method === 'POST') {
      appState = { ...appState, ...(await bodyOf(init, input)) };
      return json({ success: true });
    }

    if (pathname === '/api/key-press' && method === 'POST') {
      appState.lastKeyPress = await bodyOf(init, input);
      return json({ success: true });
    }

    if (pathname === '/api/phone-gps' && method === 'POST') {
      const p = await bodyOf(init, input);
      const lat = Number(p.lat), lon = Number(p.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return json({ success: false, error: 'Invalid GPS coordinates' }, 400);
      phoneGPS = { lat, lon, speed: p.speed ?? null, accuracy: p.accuracy ?? null, timestamp: Date.now(), receivedAt: Date.now() };
      return json({ success: true });
    }

    // On the phone the "train position" is simply the phone's own GPS.
    if (pathname === '/api/tsw/player-position') {
      if (!appGpsMode()) return json({ success: false, error: 'GPS Mode is off' });
      startGPS();
      if (phoneGPS && Date.now() - phoneGPS.receivedAt <= GPS_MAX_AGE_MS) {
        return json({ success: true, source: 'Phone GPS', ...phoneGPS });
      }
      return json({ success: false, error: gpsError || 'Waiting for a GPS fix' });
    }

    if (pathname === '/api/manual-routes' && method === 'POST') {
      // No writable project folder on iOS; keep edits for the session via localStorage.
      try { localStorage.setItem('qvas-manual-routes', JSON.stringify(await bodyOf(init, input))); } catch (e) {}
      return json({ success: true });
    }

    return null; // not ours -> real fetch (static files)
  }

  // ---------- GPS (replaces gps-transmitter.html + /api/phone-gps) ----------
  let gpsWatchId = null;
  let gpsError = '';
  // v17 ignores the 3/4/6/7 keys while its own "GPS Mode" is on (default on), and in that mode it auto-selects the
  // station nearest to the phone, which jumps the list around when you aren't on the route. So the phone starts in
  // manual mode (GPS Mode off). Turn it on from the GPS button in the key bar (or the app's Status screen) when riding.
  try { if (localStorage.getItem('gpsModeEnabled') === null) localStorage.setItem('gpsModeEnabled', 'false'); } catch (e) {}
  const appGpsMode = () => { try { return localStorage.getItem('gpsModeEnabled') === 'true'; } catch (e) { return false; } };
  function startGPS() {
    if (gpsWatchId !== null || !navigator.geolocation) return;
    gpsWatchId = navigator.geolocation.watchPosition(
      pos => {
        gpsError = '';
        phoneGPS = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          speed: pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed : null,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp || Date.now(),
          receivedAt: Date.now()
        };
      },
      err => { gpsError = err.message || 'Location unavailable'; },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  }

  // ---------- fetch interception ----------
  window.fetch = async function (input, init) {
    try {
      const raw = typeof input === 'string' ? input : (input && input.url) || String(input);
      const u = new URL(raw, window.location.href);
      const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      const sameOrigin = u.origin === window.location.origin;
      const path = sameOrigin ? relPath(u.pathname) : u.pathname;
      // Match by path only, so hard-coded hosts like http://localhost:5000/api/key-press also resolve here.
      if (path.startsWith('/api/')) {
        const res = await handle(path, u.search, method, init, input);
        if (res) return res;
      }
      const g = path.match(/^\/SEQ_GTFS\/([a-z_]+\.txt)$/);
      if (g) { const res = await gtfsFile(g[1]); if (res) return res; }
      if (typeof input === 'string' && sameOrigin) return realFetch(fixUrl(input), init);
      if (input && input.url && sameOrigin && typeof input !== 'string') return realFetch(fixUrl(input.url), init);
    } catch (e) {
      console.error('[qvas-shim]', e);
      return json({ error: String(e.message || e) }, 500);
    }
    return realFetch(input, init);
  };

  // ---------- iOS audio: unlock, silent switch, and a working volume control ----------
  // iPhone Safari ignores HTMLMediaElement.volume (it always reads 1), so the app's volume sliders do nothing there.
  // Route elements through a Web Audio GainNode instead. Web Audio normally obeys the ring/silent switch, so ask iOS
  // (16.4+) to treat the page as "playback" audio.
  const AC = window.AudioContext || window.webkitAudioContext;
  let actx = null;
  const getCtx = () => (AC ? (actx || (actx = (window.__qvasAudioCtx = new AC()))) : null);
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

  const unlock = () => {
    try {
      const ctx = getCtx();
      if (ctx) { ctx.resume && ctx.resume(); const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); }
    } catch (e) {}
  };
  // keep trying on every touch: iOS can suspend the context again (phone call, app switch)
  ['touchend', 'click'].forEach(ev => window.addEventListener(ev, () => { try { if (actx && actx.state !== 'running') actx.resume(); else if (!actx) unlock(); } catch (e) {} }, true));

  function nativeVolumeWorks() {
    try { if (localStorage.getItem('qvasForceGain') === '1') return false; } catch (e) {}
    try { const p = new Audio(); p.volume = 0.25; return Math.abs(p.volume - 0.25) < 0.001; } catch (e) { return true; }
  }
  if (AC && typeof HTMLMediaElement !== 'undefined' && !nativeVolumeWorks()) {
    const wired = new WeakMap();
    const wire = (el) => {
      let w = wired.get(el);
      if (w) return w;
      w = { v: 1, gain: null };
      try {
        const ctx = getCtx();
        const node = ctx.createMediaElementSource(el);
        w.gain = ctx.createGain();
        node.connect(w.gain); w.gain.connect(ctx.destination);
        el.addEventListener('play', () => { try { if (ctx.state !== 'running') ctx.resume(); } catch (e) {} });
      } catch (e) { w.gain = null; }
      wired.set(el, w);
      return w;
    };
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      configurable: true,
      get() { const w = wired.get(this); return w ? w.v : 1; },
      set(val) {
        let v = Number(val); if (!isFinite(v)) return;
        v = Math.max(0, Math.min(1, v));
        const w = wire(this); w.v = v;
        if (w.gain) w.gain.gain.value = v;
      }
    });
  }

  // Output-device selection (setSinkId) doesn't exist on iOS; make it a harmless no-op.
  if (typeof HTMLMediaElement !== 'undefined' && !HTMLMediaElement.prototype.setSinkId) {
    HTMLMediaElement.prototype.setSinkId = function () { return Promise.resolve(); };
  }

  // Keep the screen awake while driving the display.
  if (navigator.wakeLock && navigator.wakeLock.request) {
    const lock = () => navigator.wakeLock.request('screen').catch(() => {});
    lock();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') lock(); });
  }


  // ---------- on-screen keys (iPhone has no physical keyboard) ----------
  // Same effect as pressing 3 / 4 / 6 / 7 on the desktop keyboard: posts the key to /api/key-press,
  // which app.js picks up through its /api/state polling.
  const KEYS = [
    { key: '3', label: 'Open Doors' },
    { key: '4', label: 'Now Arriving At' },
    { key: '6', label: 'Close Doors' },
    { key: '7', label: 'The Next Station Is' }
  ];
  let lastKeyTs = 0;
  function sendKey(key) {
    lastKeyTs = Math.max(Date.now(), lastKeyTs + 1); // app ignores timestamps that don't increase
    return window.fetch('/api/key-press', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, timestamp: lastKeyTs })
    });
  }
  function buildKeyBar() {
    if (document.getElementById('qvas-keybar')) return;
    const css = document.createElement('style');
    css.textContent = `
      #qvas-keybar{position:fixed;left:calc(50% - 40px);transform:translateX(-50%);z-index:2147483647;display:flex;gap:6px;padding:5px;
        border-radius:12px;background:rgba(0,0,0,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
        font-family:-apple-system,Helvetica,Arial,sans-serif;width:min(500px,calc(100vw - 300px));
        user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
      #qvas-keybar.top{top:calc(env(safe-area-inset-top,0px) + 4px)}
      #qvas-keybar.bottom{bottom:calc(env(safe-area-inset-bottom,0px) + 4px)}
      #qvas-keybar button{flex:1 1 0;min-width:0;min-height:44px;padding:3px 4px;border:1px solid rgba(255,255,255,.35);
        border-radius:9px;background:#1f2a44;color:#fff;font-size:11px;line-height:1.1;touch-action:manipulation;
        -webkit-tap-highlight-color:transparent;cursor:pointer}
      #qvas-keybar button b{display:block;font-size:17px}
      #qvas-keybar button:active,#qvas-keybar button.hit{background:#3d5a99}
      #qvas-keybar .qk-ctl{flex:0 0 34px;background:#333;font-size:16px;padding:0}
      #qvas-keybar.gps-on .qk-key{opacity:.45}
      #qvas-keybar.collapsed{width:auto}
      #qvas-keybar.collapsed button.qk-key{display:none}`;
    document.head.appendChild(css);
    const bar = document.createElement('div');
    bar.id = 'qvas-keybar';
    KEYS.forEach(({ key, label }) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<b>${key}</b>${label}`;
      b.setAttribute('aria-label', `${key} ${label}`);
      b.addEventListener('click', (e) => {
        e.preventDefault();
        b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 150);
        if (navigator.vibrate) navigator.vibrate(15);
        sendKey(key);
      });
      b.addEventListener('mousedown', (e) => e.preventDefault()); // don't steal focus from the run-number field
      bar.appendChild(b);
    });
    const store = {
      get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
      set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    const setPos = (p) => { bar.classList.remove('top', 'bottom'); bar.classList.add(p); store.set('qvas-keybar-pos', p); };
    const mk = (txt, label, fn) => {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'qk-ctl'; c.textContent = txt; c.setAttribute('aria-label', label);
      c.addEventListener('click', fn); return c;
    };
    bar.querySelectorAll('button').forEach(b => b.classList.add('qk-key'));
    const gps = mk('GPS Off', 'Turn GPS Mode on or off', function () {
      const appBtn = document.getElementById('status-gps-mode-btn');
      if (appBtn) appBtn.click();                       // the app's own toggle (also stops/starts its GPS automation)
      else { try { localStorage.setItem('gpsModeEnabled', String(!appGpsMode())); } catch (e) {} location.reload(); }
      setTimeout(syncGps, 50);
    });
    gps.style.flexBasis = 'auto'; gps.style.padding = '0 8px'; gps.style.fontSize = '11px';
    function syncGps() {
      const on = appGpsMode();
      gps.textContent = on ? 'GPS On' : 'GPS Off';
      gps.style.background = on ? '#1d6b3a' : '';
      bar.classList.toggle('gps-on', on);
      if (!on && gpsWatchId !== null && navigator.geolocation) { navigator.geolocation.clearWatch(gpsWatchId); gpsWatchId = null; phoneGPS = null; }
    }
    syncGps(); setInterval(syncGps, 800);
    bar.appendChild(gps);
    bar.appendChild(mk('\u21C5', 'Move keys to top or bottom', () => setPos(bar.classList.contains('top') ? 'bottom' : 'top')));
    bar.appendChild(mk('\u2013', 'Hide or show keys', function () {
      bar.classList.toggle('collapsed'); this.textContent = bar.classList.contains('collapsed') ? '3 4 6 7' : '\u2013';
      if (bar.classList.contains('collapsed')) this.style.flexBasis = 'auto', this.style.padding = '0 10px'; else this.style.flexBasis = '', this.style.padding = '';
    }));
    setPos(store.get('qvas-keybar-pos', 'top'));
    document.body.appendChild(bar);
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildKeyBar);
    else buildKeyBar();
  }

  // Desktop-only IPC (GTFS download via PowerShell, Windows brightness) is unavailable here.
  function savedBrightness() { try { const v = Number(localStorage.getItem('qvas-brightness')); return Number.isFinite(v) && localStorage.getItem('qvas-brightness') !== null ? v : 100; } catch (e) { return 100; } }
  function applyBrightness(v) {
    v = Math.max(0, Math.min(100, Number(v)));
    if (!Number.isFinite(v)) return;
    try { localStorage.setItem('qvas-brightness', String(v)); } catch (e) {}
    let dim = document.getElementById('qvas-dim');
    if (!dim && document.body) {
      dim = document.createElement('div'); dim.id = 'qvas-dim';
      dim.style.cssText = 'position:fixed;inset:0;background:#000;pointer-events:none;z-index:2147483646;transition:opacity .1s';
      document.body.appendChild(dim);
    }
    if (dim) dim.style.opacity = String(((100 - v) / 100) * 0.8); // never fully black
  }
  const initBrightness = () => applyBrightness(savedBrightness());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBrightness); else initBrightness();

  // "Restart in Frameless Full Screen" is an Electron feature. On iPhone the equivalent of frameless full screen is
  // running from the Home Screen icon, so: from the icon it restarts (reloads) the app; in a Safari tab it explains how.
  function toast(msg) {
    let t = document.getElementById('qvas-toast');
    if (!t) { t = document.createElement('div'); t.id = 'qvas-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 70px);transform:translateX(-50%);max-width:80vw;z-index:2147483647;background:rgba(0,0,0,.85);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:10px;padding:10px 14px;font:14px -apple-system,Helvetica,Arial,sans-serif;text-align:center';
      document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.style.display = 'none'; }, 6000);
  }
  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('#restart-app-btn');
    if (!btn) return;
    e.stopImmediatePropagation(); e.preventDefault();
    const standalone = window.navigator.standalone === true || (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches));
    if (standalone) { toast('Restarting\u2026'); setTimeout(() => location.reload(), 400); return; }
    const el = document.documentElement;
    if (el.requestFullscreen) { el.requestFullscreen().then(() => toast('Full screen on')).catch(() => toast('Full screen was blocked by the browser.')); return; }
    toast('For full screen: tap Share, then Add to Home Screen, and open VAS HMI-C from the Home Screen icon.');
  }, true);

  // ---------- updater ----------
  // The desktop app updates through an installer; a web app updates by being re-published. Each time a new build is
  // pushed to GitHub Pages, version.json changes. Check on start, every 10 minutes and whenever the app comes back to
  // the screen, and offer "Update now" (refreshes the cached files, then reloads).
  (function () {
    const mine = window.__QVAS_BUILD;
    if (!mine) return;
    let banner = null, snoozedUntil = 0;
    async function latest() {
      try {
        const r = await realFetch('version.json?_=' + Date.now(), { cache: 'no-store' });
        return r.ok ? await r.json() : null;
      } catch (e) { return null; }
    }
    async function applyUpdate(btn) {
      if (btn) { btn.disabled = true; btn.textContent = 'Updating\u2026'; }
      const files = ['./', 'index.html', 'app.js', 'style.css', 'qvas-web-shim.js', 'file-index.js', 'version.json'];
      try { await Promise.all(files.map(f => realFetch(f, { cache: 'reload' }))); } catch (e) {}
      try { if (window.caches) (await caches.keys()).forEach(k => caches.delete(k)); } catch (e) {}
      location.reload();
    }
    function showBanner(v) {
      if (banner || Date.now() < snoozedUntil) return;
      banner = document.createElement('div');
      banner.id = 'qvas-update';
      banner.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);transform:translateX(-50%);z-index:2147483647;background:rgba(0,0,0,.9);color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:12px;padding:8px 12px;font:14px -apple-system,Helvetica,Arial,sans-serif;display:flex;gap:10px;align-items:center';
      const t = document.createElement('span'); t.textContent = 'Update available' + (v && v.appVersion ? ' (v' + v.appVersion + ')' : '');
      const go = document.createElement('button'); go.textContent = 'Update now';
      const later = document.createElement('button'); later.textContent = 'Later';
      [go, later].forEach(b => { b.style.cssText = 'min-height:38px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.4);background:#1d6b3a;color:#fff;font-size:14px'; });
      later.style.background = '#333';
      go.addEventListener('click', () => applyUpdate(go));
      later.addEventListener('click', () => { snoozedUntil = Date.now() + 30 * 60 * 1000; banner.remove(); banner = null; });
      banner.append(t, go, later);
      document.body.appendChild(banner);
    }
    async function check(manual) {
      const v = await latest();
      if (!v) { if (manual) toast('Could not check for updates. Are you online?'); return; }
      if (v.buildId !== mine) { snoozedUntil = 0; showBanner(v); }
      else if (manual) toast("You're up to date" + (window.__QVAS_VERSION ? ' (v' + window.__QVAS_VERSION + ')' : '') + '.');
    }
    window.__qvasCheckUpdate = check;
    setTimeout(check, 5000);
    setInterval(check, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    // the Status screen's buttons call the desktop updater; point them at this one
    document.addEventListener('click', (e) => {
      const el = e.target && e.target.closest && e.target.closest('#check-application-update-btn, #check-assets-update-btn, #reinstall-audio-assets-btn');
      if (!el) return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (el.id === 'check-application-update-btn') { toast('Checking for updates\u2026'); check(true); }
      else toast('Audio is built into this app. It updates together with the app (use Check for Application Updates).');
    }, true);
  })();

  window.electron = {
    platform: 'web',
    updateGTFS: async () => ({ success: false, message: 'Update GTFS on the desktop app, then re-run the site build.' }),
    getGTFSStatus: async () => ({ success: false, updatedAt: 'Bundled with app', dueAt: 'Unavailable' }),
    // A web page can't change iPhone brightness, so the slider dims the app with a black overlay instead.
    getSystemBrightness: async () => ({ success: true, value: savedBrightness() }),
    setSystemBrightness: async (v) => { applyBrightness(v); return { success: true, value: savedBrightness() }; },
    onGTFSUpdateProgress: () => {},
    onDoorStateChanged: () => {},
    onGlobalKey: () => {},
    doorUnlock: () => {},
    doorLock: () => {}
  };
})();
