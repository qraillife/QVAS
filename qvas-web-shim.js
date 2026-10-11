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
  const FRAME = { w: 1704, h: 786, l: 50, t: 76, r: 50, b: 50 };   // picture size and gaps around the window
  const FRAME_IMG = 'data:image/png;base64,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SqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqAIRKqAAQKgAQKgCESqgAECoAhEqoABAqABAqAIRKqAAQKgCESqgAECoAECoAhEqoABAqABAqAITKywyAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABIFRCBYBQAYBQASBUQgWAUAEgVEIFgFABgFABIFRCBYBQASBUQgWAUAGAUAEgVEIFgFABgFABIFReZgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAoRIqAIQKAIQKAKESKgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAoRIqAIQKAIQKAKESKgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAoRIqAIQKAIQKAKESKgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAoRIqAIQKAIQKAKESKgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAoRIqAIQKAIQKAKESKgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAoRIqAIQKAIQKAKESKgCECgChEioAhAoAhAoAoRIqAIQKAKESKgCECgCECgChEioAhAoAfi5UAPBzhAoAoQIAoQJAqABAqABAqAAQKgD4tlBd0uTi9QHg+71ZnZNQpartxuZm7NrbfwDAN3qvOodQXaruz9C/TPrhd1cZVgHwfYOpd6tzCFXbvBSa1ssIwHd5vzr7UHX9y07feR0B+B5PVGcXqublROOVBOA7PFOdX+9/hlIB8HOd2lenCFX38oDZPwC+3HPVCaG6tnmmcPg9jr+HPGPYXr2gAHylZ6vz62wI1nRtdblUbdeY/APgmzxZnRyqtA3Bft8+/nK93v6n+rMtwnDlLwBf6OnqhBHV7/UzLlXVTqrq8md7GAD4Qs9WJ4eqHcJ4a7z/agwjs8F1vwB8oaers4Xqsl501V3ip1y6dRRmKyUAvszz1dlClcY1Ytd2HKfODeN4+48leaOTVAB8meerk0PVbOe02ryUvb2sk4iNUAHwdaF6ujqHUI2Xy7/yp/zrchmFCoDvCtX71REqAP5vhcrUHwA/F6qPTP1ZTAHAz4Xq44spLE8H4Od8Ynm6C34B+EEfv+A3b2bxxxZKAHy7Z6tztintn+P2gC82pQXgKz1dHbf5AOC/48O3+XDjRAB+0GdunOhW9AD8oA/fij4Ow0om/gD4Bk9V59cTn6NTAPxcqXbV+bUfh/X7T+jN+wHwTZ6ozj5UVbvLW+NKXwC+zfvVOYTqWnV/hiVw/fC7q6z3A+DbvF+dX8dPSlXbjc3N2LWV63wB+FbvVefX6Wdd0sQ+tAD8gDer88vrA8A/mVABIFQAIFQACBUACBUACBUAQgUAX+B/ALMoUt4VJSCUAAAAAElFTkSuQmCC';
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

  // Fit by measuring: shrink the keyboard rows, the day buttons and the side buttons until nothing is cut off inside
  // the frame's window. It checks again whenever the screen changes, so every screen fits.
  let fitKh = 34, fitDay = 40, fitSide = null;
  const applyFit = () => {
    let st = document.getElementById('qvas-kbfit');
    if (!st) { st = document.createElement('style'); st.id = 'qvas-kbfit'; (document.head || document.documentElement).appendChild(st); }
    const kf = Math.max(10, Math.min(16, fitKh - 16)), df = Math.max(9, Math.min(14, fitDay - 22));
    st.textContent = `
      .left-panel{padding-top:4px !important}
      .touch-keyboard{margin-top:2px !important;padding-top:2px !important;padding-bottom:0 !important;justify-content:flex-start !important}
      .touch-keyboard .keyboard-row{margin:0 0 2px 0 !important}
      .touch-keyboard .key-btn{height:${fitKh}px !important;min-height:0 !important;padding-top:0 !important;padding-bottom:0 !important;font-size:${kf}px !important;line-height:1 !important}
      .touch-keyboard .day-selector{margin:2px 0 0 0 !important}
      .touch-keyboard .day-btn{height:${fitDay}px !important;min-height:0 !important;padding:0 4px !important;font-size:${df}px !important;line-height:1.05 !important}` +
      (fitSide ? `
      .right-panel .side-btn{min-height:${fitSide}px !important;flex:1 1 ${fitSide}px !important}` : '');
  };
  const fitKeyboard = () => {
    if ((window.innerHeight || 0) >= 700) return;            // only on a phone-sized screen
    applyFit();
    const kb = document.getElementById('touch-keyboard');
    if (kb && kb.offsetParent && kb.clientHeight > 40) {
      for (let i = 0; i < 40 && kb.scrollHeight > kb.clientHeight + 1 && fitKh > 14; i++) {
        fitKh--; fitDay = Math.max(22, Math.round(fitKh * 1.15)); applyFit();
      }
    }
    document.querySelectorAll('.right-panel').forEach((rp) => {
      if (!rp.offsetParent || rp.clientHeight < 40 || rp.scrollHeight <= rp.clientHeight + 1) return;
      const n = Array.from(rp.children).filter((c) => c.classList.contains('side-btn') && getComputedStyle(c).display !== 'none').length || 1;
      fitSide = Math.max(24, Math.floor(rp.clientHeight / n) - 1);
      applyFit();
    });
  };
  fitKeyboard();
  document.addEventListener('DOMContentLoaded', fitKeyboard);
  window.addEventListener('load', fitKeyboard);
  window.addEventListener('resize', () => { fitKh = 34; fitDay = 40; fitSide = null; fitKeyboard(); });
  window.addEventListener('orientationchange', () => setTimeout(() => { fitKh = 34; fitDay = 40; fitSide = null; fitKeyboard(); }, 300));
  document.addEventListener('click', () => setTimeout(fitKeyboard, 120), true);
  setInterval(fitKeyboard, 700);
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
