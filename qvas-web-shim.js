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
      const track = Math.max(30, Math.min(280, windowHeight() - 241));
      return (sizes = { track, handle: track < 120 ? 26 : 40, phone: true });
    };
    Object.defineProperty(window, '__QV_SLIDER', { configurable: true, get: compute });
    const applyCss = () => {
      const z = compute();
      if (!z.phone) return;
      const st = document.createElement('style');
      st.textContent = `
        /* tall desktop header/footer, compacted so a framed phone screen keeps room for the content */
        .header{padding:2px 12px !important}
        .footer,.footer-btn{min-height:64px !important}
        .footer-btn{padding:4px 8px !important;font-size:1em !important}
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

  // ---------- display frame (bezel) ----------
  // The LARPTransit "QVAS Mobile" System frame. The picture is embedded here (so it also works with no signal) and is
  // drawn behind the app, scaled as large as will fit the screen with nothing cut off. The app sits exactly in its
  // window. On an iPhone 15 Pro held sideways (852 x 393) it fills the screen edge to edge.
  const FRAME = { w: 1704, h: 786, l: 91, t: 90, r: 91, b: 91 };   // picture size and gaps around the window
  const FRAME_IMG = 'data:image/png;base64,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P+I/NFR/AfB/hFABIFRCBYBQASBUQgWAUAkVAEIFgFAJFQBCBYBQCRUAQiVUAAgVAEIlVAAIlVABCJVQASBUQgWAUAEgVEIFgFAJFYBQCRUAQiVUAAgVAEIlVAAIlVABCJVQASBUQgWAUAEgVEIFgFAJFQBCBYBQCRUAQgWAUAkVAEIlVAAIFQBCJVQACJVQAQiVUAEgVEIFgFABIFRCBYBQCRWAUAkVAEIlVAAIFQBCJVQACJVQAQiVUAEgVEIFgFABIFRCBYBQCRUAQgWAUAkVAEIFgFAJFQBCJVQACBUAQiVUAAiVUAEIlVABIFRCBYBQASBUQgWAUAkVgFAJFQBCJVQACBUAQiVUAAiVUAEIlVABIFRCBYBQASBUQgWAUAkVAEIFgFAJFQBCBYBQCRUAQiVUAAgVAEIlVAAIlRcOQKiECgChEioAhAoAoRIqAIRKqACESqgAECqhAkCoABAqoQJAqIQKQKiECgChEioAhAoAoRIqAIRKqAAQKgCESqgAECoAhEqoABAqoQJAqAAQKqECQKgAECqhAkCohAoAoQJAqIQKAKESKgChEioAhEqoABAqAIRKqAAQKqECECqhAkCohAoAoQJAqIQKAKESKgCECgChEioAhAoAoRIqAIRKqAAQKgCESqgAECoAhEqoABAqoQJAqAAQKqECQKiECkCohAoAoRIqAIQKAKESKgCESqgAhEqoABAqoQJAqAAQKqECQKiECgChAkCohAoAoQJAqIQKAKESKgCECgChEioAhAoAoRIqAIRKqAAQKgCESqgAECqhAhAqoQJAqIQKAKECQKiECgChEioAoRIqAIRKqAAQKgCESqgAECqhAkCoABAqoQJAqAAQKqECQKiECgChAkCohAoAoQJAqIQKAKESKgCECgChEioAhEqoAIRKqAAQKqECQKgAECqhAkCohApAqIQKAKESKgCECgChEioAhEqoABAqAIRKqAAQKgCESqgAECqhAkCoABAqoQJAqAAQKqECQKiECgChAkCohAoAoRIqAKESKgCESqgAECoAhEqoABAqoQIQKqECQKiECgChAkCohAoAoRIqAIQKAKESKgCECgChEioAhEqoABAqAIRKqAAQKgCESqgAECqhAkCoABAqoQJAqIQKQKiECgChEioAhAoAoRIqAIRKqACESqgAECqhAkCoABAqoQJAqIQKAKECQKiECgChAkCohAoAoRIqAIQKAKESKgCECgChEioAhEqoABAqAIRKqAAQKqECECqhAkCohAoAoQJAqIQKAKESKgChEioAhEqoABAqAIRKqAAQKqECQKgAECqhAkCoABAqoQJAqIQKAKECQKiECgChAkCohAoAoRIqAIQKAKESKgCESqgAhEqoABAqoQJAqAAQKqECQKiECkCohAoAoRIqAIQKAKESKgCESqgAhEqoABAqoQJAqAAQKqECQKiECgChAkCohAoAoQJAqIQKAKESKgCECgChEioAhEqoAIRKqAAQKqECQKgAECqhAkCohApAqIQKAKESKgCECgChEioAhEqoAIRKqAAQKqECQKgAECqhAkCohAoAoQJAqIQKAKECQKiECgChEioAhAoAoRIqAIRKqACESqgAECqhAkCoABAqoQJAqIQKQKiECgChEioAhAoAoRIqAIRKqACESqgAECqhAkCoABAqoQJAqIQKAKECQKiECgChAkCohAoAoRIqAIQKAKESKgCEygsHIFRCBYBQCRUAQgWAUAkVAEIlVABCJVQACJVQASBUAAiVUAEgVEIFIFRCBYBQCRUAQgWAUAkVAEIlVAAIFQBCJVQACBUAQiVUAAiVUAEgVAAIlVABIFQACJVQASBUQgWAUAEgVEIFgFAJFYBQCRUAQiVUAAgVAEIlVAAIlVABCJVQASBUQgWAUAEgVEIFgFAJFQBCBYBQCRUAQgWAUAkVAEIlVAAIFQBCJVQACBUAQiVUAAiVUAEgVAAIlVABIFRCBSBUQgWAUAkVAEIFgFAJFQBCJVQAQiVUAAiVUAEgVAAIlVABIFRCBYBQASBUQgWAUAEgVEIFgFAJFQBCBYBQCRUAQgWAUAkVAEIlVAAIFQBCJVQACJVQAQiVUAEgVEIFgFABIFRCBYBQCRWAUAkVAEIlVAAIFQBCJVQACJVQASBUAAiVUAEgVAAIlVABIFRCBYBQASBUQgWAUAEgVEIFgFAJFQBCBYBQCRUAQiVUAEIlVAAIlVABIFQACJVQASBUQgUgVEIFgFAJFQBCBYBQCRUAQiVUAAgVAEIlVAAIFQBCJVQACJVQASBUAAiVUAEgVAAIlVABIFRCBYBQASBUQgWAUAkVgFAJFQBCJVQACBUAQiVUAAiVUAEIlVABIFRCBYBQASBUQgWAUAkVAEIFgFAJFQBCBYBQCRUAQiVUAAgVAEIlVAAIFQBCJVQACJVQASBUAAiVUAEgVEIFIFRCBYBQCRUAQgWAUAkVAEIlVABCJVQACJVQASBUAAiVUAEgVEIFgFABIFRCBYBQASBUQgWAUAkVAEIFgFAJFQBCBYBQCRUAQiVUAAgVAEIlVAAIlVABCJVQASBUQgWAUAEgVEIFgFAJFYBQCRUAQiVUAAgVAEIlVAAIlVABIFQACJVQASBUAAiVUAEgVEIFgFABIFRCBYBQASBUQgWAUAkVAEIFgFAJFQBCJVQAQiVUAAiVUAEgVAAIlVABIFRCBSBUQgWAUAkVAEIFgFAJFQBCJVQAQiVUAAiVUAEgVAAIlVABIFRCBYBQASBUQgWAUAEgVEIFgFAJFQBCBYBQCRUAQiVUAEIlVAAIlVABIFQACJVQASBUQgUgVEIFgFAJFQBCBYBQCRUAQiVUAEIlVAAIlVABIFQACJVQASBUQgWAUAEgVEIFgFABIFRCBYBQCRUAQgWAUAkVAEIlVABCJVQACJVQASBUAAiVUAEgVEIFIFRCBYBQCRUAQgWAUAkVAEIlVABCJVQACJVQASBUAAiVUAEgVEIFgFABIFRCBYBQASBUQgWAUAkVAEIFgFAJFQBC5YUDECqhAkCohAoAoQJAqIQKAKESKgChEioAhAoA/gRCBYBQAYBQASBUACBUACBUAAgVAAgVAEIFAEIFAEIFgFABgFABIFQAIFQAIFQACBUACBUAQgUAQgUAQgWAUAGAUAEgVDYBAEIFAEIFgFABgFABgFABIFQAIFQACBUACBUACBUA/9WhWkII3WKTAfB3dFtNfkeolnns+36cGqkC4PNiTeYvD9Uyr2/RMNrKAHzSj1ST/5m+NlTL+Fassy0NwGf0VU36rwzVqVO3QZVSAfA3O3Ub93xdqJbpCNQwfOi5AeB+1JNr8o+XZj28NKLan3HY5lHMsYajGRUAfNAcxzpT0zVTPFX10gG6F0IVEzjE6X7pLwDwIV0fz0zFoc7+l/WVYc8rI6q9e3O3/Xvqlv25J0MqAD5m2Ac63Ty8DbemDK/Oefjrxaful3m6/fsfUxy6jZ0tDsAHLP+Op45+bEfmxh/xAN0rw54XQhXLFI65Gke3gm0OwEdCtU/Mm8M/44SKbo/L9MKw59VQTTlUi1AB8GHdEarhN4SqiSOqcb09+bDGbgkVAJ8YUU1dv018WPvjr19z6O84/bVPqpiOaX/mpwPwMXGcs+z/nps4NW/+mlDFJxu7Zuz7Y57Gm7UpAPigNZ5JutVkbMKPly92eiVU8RKt29OGsMzDUUQA+IhjYYppq0kzvb58xEtLKMV5FMO/xvGYUWFABcCHxQl/6ziNcWGK11aPeG319OG0jKDLfQH4hPkckxdHPa+Fav5n/cxmUgDwCcuP4ROjnlfv8FuWZh+MpwD4XKnyXXi3mxu+WJO/Xn7yf+yz1Ff3ogfg86Z+r0n/8g1+Xw5Vs9z6NM+NTAHwdwZVt3/m5iM1+ctGA+BPJlQACBUACBUAQgUAQgUAQgWAUAGAUAEgVAAgVAAgVAAIFQAIFQBCBQBCBQBCBYBQAYBQASBUACBUACBUAAgVAAgVAEJlEwAgVAAgVAAIFQAIFQAIFQBCBQBCBYBQAYBQAcBD/x/XHzNOCnjfbgAAAABJRU5ErkJggg==';
  const frameGeom = () => {
    const W = window.innerWidth || 852, H = window.innerHeight || 393;
    const s = Math.min(W / FRAME.w, H / FRAME.h);
    const fw = FRAME.w * s, fh = FRAME.h * s, ox = (W - fw) / 2, oy = (H - fh) / 2;
    return {
      fw, fh, ox, oy,
      left: Math.floor(ox + FRAME.l * s), top: Math.floor(oy + FRAME.t * s),
      right: Math.floor(ox + FRAME.r * s), bottom: Math.floor(oy + FRAME.b * s), H
    };
  };
  const windowHeight = () => { const g = frameGeom(); return g.H - g.top - g.bottom; };
  const applyFrame = () => {
    const g = frameGeom(), d = document.documentElement.style;
    d.setProperty('--qv-l', g.left + 'px'); d.setProperty('--qv-t', g.top + 'px');
    d.setProperty('--qv-r', g.right + 'px'); d.setProperty('--qv-bm', g.bottom + 'px');
    d.setProperty('--qv-fx', g.ox + 'px'); d.setProperty('--qv-fy', g.oy + 'px');
    d.setProperty('--qv-fw', g.fw + 'px'); d.setProperty('--qv-fh', g.fh + 'px');
  };
  applyFrame();
  window.addEventListener('resize', applyFrame);
  window.addEventListener('orientationchange', () => setTimeout(applyFrame, 300));
  document.addEventListener('DOMContentLoaded', applyFrame);
  window.addEventListener('load', applyFrame);
  (function () {
    const st = document.createElement('style');
    st.textContent = `
      html{height:100% !important;margin:0 !important;padding:0 !important;background-color:#76787b !important;
        background-image:url("${FRAME_IMG}") !important;background-repeat:no-repeat !important;
        background-size:var(--qv-fw,100%) var(--qv-fh,100%) !important;background-position:var(--qv-fx,0) var(--qv-fy,0) !important}
      body{position:fixed !important;left:var(--qv-l,0);top:var(--qv-t,0);right:var(--qv-r,0);bottom:var(--qv-bm,0);
        width:auto !important;height:auto !important;max-width:none !important;min-height:0 !important;margin:0 !important;
        overflow:hidden;border-radius:0;box-shadow:none !important}
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
  const GPS_MAX_AGE_MS = 25000;

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
  // The app's "This PC" GPS source asks the Windows desktop shell for a location; on a phone it must be "phone".
  try { if (localStorage.getItem('gpsSourceMode') !== 'phone') localStorage.setItem('gpsSourceMode', 'phone'); } catch (e) {}
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && appGpsMode() && gpsWatchId !== null) { stopGPS(); startGPS(); } });
  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('#status-gps-source-btn')) {
      e.stopImmediatePropagation(); e.preventDefault();
      toast("On the iPhone the GPS source is always the phone's own GPS.");
    }
  }, true);
  const appGpsMode = () => { try { return localStorage.getItem('gpsModeEnabled') === 'true'; } catch (e) { return false; } };
  // iOS only pushes a new watchPosition fix when the phone MOVES, but the app treats 15 s without a fix as "GPS lost".
  // So: keep a watch running AND ask for a fix every 2 s (cached fixes are fine), and re-stamp when each one arrives.
  let gpsPollTimer = null, gpsPollBusy = false, gpsPermWarned = false;
  function onFix(pos) {
    gpsError = '';
    phoneGPS = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      speed: pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed : null,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp || Date.now(),
      receivedAt: Date.now()
    };
  }
  function onGpsErr(err) {
    gpsError = (err && err.message) || 'Location unavailable';
    if (err && err.code === 1 && !gpsPermWarned) {
      gpsPermWarned = true;
      toast('Location is blocked. On the iPhone: Settings > Privacy & Security > Location Services > Safari Websites > While Using the App, with Precise Location on.');
    }
  }
  function startGPS() {
    if (!navigator.geolocation || gpsWatchId !== null) return;
    gpsWatchId = navigator.geolocation.watchPosition(onFix, onGpsErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    const poll = () => {
      if (gpsPollBusy) return;
      gpsPollBusy = true;
      navigator.geolocation.getCurrentPosition(
        (p) => { gpsPollBusy = false; onFix(p); },
        (e) => { gpsPollBusy = false; onGpsErr(e); },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }); // a recent saved fix is fine when standing still
    };
    poll();
    gpsPollTimer = setInterval(poll, 2000);
  }
  function stopGPS() {
    if (gpsWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null; clearInterval(gpsPollTimer); gpsPollTimer = null; gpsPollBusy = false; phoneGPS = null;
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
      #qvas-keybar.top{top:calc(var(--qv-t,45px) + 4px)}
      #qvas-keybar.bottom{bottom:calc(var(--qv-bm,45px) + 4px)}
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
    const dl = mk('\u2B07', 'Download audio for offline use', async function () {
      const s = await offline.refresh();
      if (s.busy) { toast('Downloading audio\u2026 ' + s.pct + '%'); return; }
      if (s.ready && !s.missing) { toast('Offline audio is ready' + (s.total ? ' (' + s.total + ' files)' : '') + '. The app works without signal.'); return; }
      if (!s.known) { toast('Connect to the internet to download the audio.'); return; }
      const mb = Math.max(1, Math.round((s.bytes || 0) / 1048576));
      if (confirm('Download the announcement audio (about ' + mb + ' MB for everything, less if you already have part of it) so the app works without signal? Use Wi-Fi.')) offline.download();
    });
    const border = mk('\u25A2', 'Frame', () => {
      applyFrame();
      toast('The frame is sized to fit this screen automatically.');
    });
    border.style.flexBasis = 'auto'; border.style.padding = '0 8px';
    bar.appendChild(border);
    dl.style.flexBasis = 'auto'; dl.style.padding = '0 8px';
    const syncDl = (s) => {
      dl.textContent = s.busy ? s.pct + '%' : '\u2B07';
      dl.style.background = s.busy ? '#8a6d00' : (s.ready ? '#1d6b3a' : (s.known && s.hadAny ? '#8a6d00' : ''));
      dl.title = s.ready ? 'Offline audio ready' : 'Download audio for offline use';
    };
    offline.onChange(syncDl); syncDl(offline.st);
    bar.appendChild(dl);
    gps.style.flexBasis = 'auto'; gps.style.padding = '0 8px'; gps.style.fontSize = '11px';
    function syncGps() {
      const on = appGpsMode();
      gps.textContent = on ? 'GPS On' : 'GPS Off';
      gps.style.background = on ? '#1d6b3a' : '';
      bar.classList.toggle('gps-on', on);
      if (on) startGPS(); else if (gpsWatchId !== null) stopGPS();
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
      dim.style.cssText = 'position:fixed;left:var(--qv-l,0);top:var(--qv-t,0);right:var(--qv-r,0);bottom:var(--qv-bm,0);background:#000;pointer-events:none;z-index:2147483646;transition:opacity .1s';
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

  // ---------- offline ----------
  // sw.js (generated by the build) caches the app, timetable, CCTV and data automatically. The announcement audio is
  // large, so it is downloaded once with the bar's download button; after that only new or changed files download.
  const offline = (function () {
    const AUDIO_CACHE = 'qvas-audio-v1', IDX_KEY = '__audio-index__';
    const ok = !!(window.caches && navigator.serviceWorker);
    const st = { ready: false, missing: 0, total: 0, bytes: 0, busy: false, pct: 0, hadAny: false, known: false };
    const listeners = [];
    const emit = () => listeners.forEach(f => { try { f(st); } catch (e) {} });
    const enc = (u) => u.split('/').map(encodeURIComponent).join('/');
    if (ok) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {}); });

    async function readIndex() { try { const r = await (await caches.open(AUDIO_CACHE)).match(IDX_KEY); return r ? await r.json() : {}; } catch (e) { return {}; } }
    async function writeIndex(idx) { await (await caches.open(AUDIO_CACHE)).put(IDX_KEY, new Response(JSON.stringify(idx))); }
    async function hashes() { try { const r = await realFetch('audio-hashes.json', { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } }

    async function refresh() {
      if (!ok) return st;
      const idx = await readIndex();
      st.hadAny = Object.keys(idx).length > 0;
      const h = await hashes();
      if (h) {
        let missing = 0;
        for (const u in h.files) if (idx[u] !== h.files[u]) missing++;
        Object.assign(st, { total: h.count, bytes: h.bytes, missing, ready: missing === 0, known: true });
      } else if (st.hadAny) { Object.assign(st, { ready: true, missing: 0, known: false }); }   // offline: trust what is stored
      emit(); return st;
    }

    async function download() {
      if (!ok || st.busy) return;
      const h = await hashes();
      if (!h) { toast('Connect to the internet to download the audio.'); return; }
      const cache = await caches.open(AUDIO_CACHE);
      const idx = await readIndex();
      for (const u of Object.keys(idx)) if (!(u in h.files)) { await cache.delete(enc(u)); delete idx[u]; }   // removed upstream
      const todo = Object.keys(h.files).filter(u => idx[u] !== h.files[u]);
      if (!todo.length) { await writeIndex(idx); await refresh(); toast('Audio is already downloaded.'); return; }
      const need = todo.reduce((a, u) => a + Number(h.files[u].split(':')[1] || 0), 0);
      try { const e = await navigator.storage.estimate(); if (e.quota && e.quota - e.usage < need * 1.05) { toast('Not enough free space for the audio (' + Math.round(need / 1048576) + ' MB needed).'); return; } } catch (e) {}
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
      st.busy = true; st.pct = 0; emit();
      let done = 0, failed = 0, next = 0, sinceSave = 0;
      const worker = async () => {
        while (next < todo.length) {
          const u = todo[next++];
          try {
            const r = await realFetch(enc(u), { cache: 'reload' });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            await cache.put(enc(u), r);
            idx[u] = h.files[u];
          } catch (e) { failed++; }
          done++; st.pct = Math.round(done / todo.length * 100); emit();
          if (++sinceSave >= 40) { sinceSave = 0; try { await writeIndex(idx); } catch (e) {} }   // so an interrupted download resumes
        }
      };
      try { await Promise.all([worker(), worker(), worker(), worker()]); } finally { try { await writeIndex(idx); } catch (e) {} st.busy = false; }
      await refresh();
      toast(failed ? `Downloaded with ${failed} problem files. Tap the download button again to retry.` : 'Audio downloaded. Announcements now work without signal.');
    }
    refresh();
    return { st, refresh, download, onChange: (f) => listeners.push(f) };
  })();
  window.__qvasOffline = offline;
  // tell people once that the audio can be downloaded
  setTimeout(async () => {
    try {
      if (localStorage.getItem('qvas-offline-tip') || !navigator.onLine) return;
      const s = await offline.refresh();
      if (s.known && !s.ready) { localStorage.setItem('qvas-offline-tip', '1'); toast('Tip: tap the download button in the key bar to save the audio for use without signal.'); }
    } catch (e) {}
  }, 12000);

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
      let usedSW = false;
      try {
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();                       // downloads only the files that changed, then the new worker takes over
          const sw = reg.installing || reg.waiting;
          if (sw && !['activated', 'redundant'].includes(sw.state)) {
            await new Promise((res) => {
              sw.addEventListener('statechange', () => { if (['activated', 'redundant'].includes(sw.state)) res(); });
              setTimeout(res, 180000);
            });
          }
          usedSW = true;
        }
      } catch (e) {}
      if (!usedSW) {
        const files = ['./', 'index.html', 'app.js', 'style.css', 'qvas-web-shim.js', 'file-index.js', 'version.json'];
        try { await Promise.all(files.map(f => realFetch(f, { cache: 'reload' }))); } catch (e) {}
      }
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
      if (v.buildId !== mine) { snoozedUntil = 0; showBanner(v); return; }
      if (!manual) return;
      // same build as the site: also ask SaltyPlayzYT's releases whether something newer has been published
      let note = '';
      try {
        const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
        const r = await realFetch('https://api.github.com/repos/SaltyPlayzYT/QVAS-Project/releases/latest', { signal: ctl.signal, headers: { Accept: 'application/vnd.github+json' } });
        if (r.ok) {
          const tag = String((await r.json()).tag_name || '');
          const num = (t) => String(t).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
          const cmp = (a, b) => { for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0); } return 0; };
          if (tag && cmp(num(tag), num(window.__QVAS_RELEASE || window.__QVAS_VERSION || '0')) > 0)
            note = ' SaltyPlayzYT has released ' + tag + '. It will appear here automatically once the phone app has been rebuilt.';
        }
      } catch (e) {}
      toast("You're up to date" + (window.__QVAS_VERSION ? ' (v' + window.__QVAS_VERSION + ')' : '') + '.' + note);
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
