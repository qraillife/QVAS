// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('❌ UNCAUGHT ERROR:', event.error);
  console.error(event.error.stack);
});

// Global async error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ UNHANDLED PROMISE REJECTION:', event.reason);
});

const HARDWARE_INPUT_DELAY_MS = 70;

document.addEventListener('click', (event) => {
  if (event.qvasHardwareReplay) return;

  const target = event.target instanceof Element
    ? event.target.closest('button, [role="button"], a')
    : null;
  if (!target) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  window.setTimeout(() => {
    const replay = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: event.detail,
      screenX: event.screenX,
      screenY: event.screenY,
      clientX: event.clientX,
      clientY: event.clientY,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      button: event.button,
      buttons: event.buttons
    });
    replay.qvasHardwareReplay = true;
    target.dispatchEvent(replay);
  }, HARDWARE_INPUT_DELAY_MS);
}, true);

// Run Code Parser - Queensland Rail Run Number Guide
const runCodeGuide = {
  firstChar: {
    '1': { type: '6-car SMU train', revenue: true },
    '2': { type: '6-car SMU train', revenue: false, empty: true },
    'A': { type: '6-car IMU train', revenue: false, empty: true },
    'B': { type: '3-car IMU train', revenue: false, empty: true },
    'C': { type: '3-car SMU train', revenue: false, empty: true },
    'D': { type: '6-Car NGR', revenue: true },
    'H': { type: 'Electric Hauled non-revenue train', revenue: false },
    'J': { type: '3-car SMU', revenue: true },
    'L': { type: 'Diesel Light Engine', revenue: false },
    'M': { type: 'Steam hauled train', revenue: true },
    'Q': { type: 'Electric Multiple Unit Tilt', revenue: true },
    'S': { type: 'Steam light engine/hauled empty carriages', revenue: false },
    'T': { type: '6-car IMU', revenue: true },
    'U': { type: '3-car IMU', revenue: true },
    'V': { type: 'Diesel Tilt', revenue: true }
  },
  secondChar: {
    '0': { route: 'Bowen Hills and Electric Train Depot via Main Lines', destinations: ['Bowen Hills', 'Electric Train Depot'] },
    '1': { route: 'Caboolture Line', destinations: ['Caboolture', 'Elimbah', 'Dakabin'] },
    '4': { route: 'Sunshine Coast Line', destinations: ['Gympie North', 'Yandina'] },
    '5': { route: 'Ipswich Line', destinations: ['Ipswich', 'Riverview'] },
    '6': { route: 'Rosewood Line', destinations: ['Thomas Street', 'Rosewood'] },
    '7': { route: 'Beenleigh Line', destinations: ['Beenleigh', 'Trinder Park'] },
    '8': { route: 'Cleveland Line', destinations: ['Lota', 'Cleveland'] },
    '9': { route: 'Roma Street - Electric Train Shed South', destinations: ['Roma Street', 'Electric Train Shed South'] },
    'A': { route: 'Shorncliffe Line', destinations: ['Shorncliffe', 'Bindha'] },
    'B': { route: 'Doomben Line', destinations: ['Doomben', 'Clayfield'] },
    'D': { route: 'Milton - Redbank', destinations: ['Redbank', 'Milton'] },
    'E': { route: 'Ferny Grove Line', destinations: ['Ferny Grove', 'Windsor'] },
    'F': { route: 'Brisbane Various', destinations: ['Roma Street', 'Central', 'Fortitude Valley'] },
    'G': { route: 'Gold Coast Line', destinations: ['Varsity Lakes', 'Ormeau'] },
    'H': { route: 'Buranda - Manly', destinations: ['Manly', 'Buranda'] },
    'K': { route: 'Springfield Line', destinations: ['Springfield Central', 'Richlands'] },
    'L': { route: 'Nambour Line', destinations: ['Nambour', 'Elimbah'] },
    'M': { route: 'Electric Train Flyover', destinations: ['Bowen Hills'] },
    'P': { route: 'Airport Line', destinations: ['Domestic Airport', 'International Airport'] },
    'Q': { route: 'Electric Train Shed South', destinations: ['Electric Train Shed South'] },
    'R': { route: 'Roma Street - Electric Train Shed South', destinations: ['Roma Street', 'Electric Train Shed South'] },
    'S': { route: 'Park Road Line', destinations: ['Park Road', 'South Brisbane'] },
    'U': { route: 'Wulkuraka NGR Maintenance', destinations: ['Wulkuraka'] },
    'V': { route: 'Dutton Park - Kuraby', destinations: ['Kuraby', 'Dutton Park'] },
    'W': { route: 'Albion - Northgate', destinations: ['Northgate', 'Albion'] },
    'X': { route: 'Exhibition', destinations: ['Exhibition'] },
    'Y': { route: 'Redcliffe Peninsula Line', destinations: ['Kippa-Ring', 'Virginia'] },
    'Z': { route: 'Exhibition', destinations: ['Exhibition'] }
  },
  thirdChar: {
    '0': { pattern: 'Standard running (all stations)', express: false },
    '1': { pattern: 'Standard running (all stations)', express: false },
    '2': { pattern: 'Standard running (all stations)', express: false },
    '3': { pattern: 'Standard running (all stations)', express: false },
    '4': { pattern: 'Standard running (all stations)', express: false },
    '5': { pattern: 'Standard running (all stations)', express: false },
    '6': { pattern: 'Standard running (all stations)', express: false },
    '7': { pattern: 'Standard running (all stations)', express: false },
    '8': { pattern: 'Standard running (all stations)', express: false },
    '9': { pattern: 'Standard running (all stations)', express: false },
    'T': { pattern: 'Express running (AM standardised)', express: true },
    'V': { pattern: 'Express running (AM standardised)', express: true },
    'X': { pattern: 'PM Express running', express: true },
    'Y': { pattern: 'PM Express running', express: true },
    'Z': { pattern: 'PM Express running', express: true },
    'M': { pattern: 'PM peak short-finishing', express: false, shortFinish: true },
    'N': { pattern: 'PM peak short-finishing', express: false, shortFinish: true }
  },
  fourthChar: {
    even: 'Service concludes in UP direction (towards city)',
    odd: 'Service concludes in DOWN direction (away from city)'
  }
};

// Global variable to store current trip info from GTFS
let currentGTFSTrip = null;

// Global variables for GTFS data access
let globalGTFSData = null;
let tripIdMap = {}; // Map trip_id to route_id for fast lookup
let currentManualRoute = null;
let currentManualFormFile = null;
let routeTopologyPaths = [];
let mtgOnlyRouteCodes = new Set();

async function loadMtgOnlyRouteConfig() {
  try {
    const response = await fetch('/mtg-only-routes.json');
    if (!response.ok) throw new Error(`MTG-only route configuration unavailable (${response.status})`);
    const data = await response.json();
    mtgOnlyRouteCodes = new Set(
      (Array.isArray(data.routes) ? data.routes : [])
        .map(route => String(route).trim().toUpperCase())
        .filter(Boolean)
    );
    console.log(`[MTG] Loaded ${mtgOnlyRouteCodes.size} MTG-only route codes`);
  } catch (error) {
    console.warn('[MTG] Could not load MTG-only route configuration:', error.message);
  }
}

let announcementDisableRules = { routes: {} };

async function loadAnnouncementDisableRules() {
  try {
    const response = await fetch('/announcement-disable-rules.json');
    if (!response.ok) throw new Error(`Announcement disable rules unavailable (${response.status})`);
    const data = await response.json();
    announcementDisableRules = data && typeof data === 'object' ? data : { routes: {} };
    if (!announcementDisableRules.routes) announcementDisableRules.routes = {};
    console.log(`[ANNOUNCEMENTS] Loaded route disable rules for ${Object.keys(announcementDisableRules.routes).length} route(s)`);
  } catch (error) {
    console.warn('[ANNOUNCEMENTS] Could not load route disable rules:', error.message);
    announcementDisableRules = { routes: {} };
  }
}

function normalizeRuleKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeAnnouncementTypeKey(value) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '');
  const aliases = {
    tns: 'tns',
    nextstation: 'tns',
    arrival: 'naa',
    naa: 'naa',
    nowarriving: 'naa',
    mtg: 'mtg',
    mindthegap: 'mtg',
    form: 'form',
    station: 'form'
  };
  return aliases[raw] || raw;
}

function getAnnouncementRuleForStation(routeName, stationName) {
  const routeKeys = [];
  if (routeName) routeKeys.push(String(routeName).trim());
  if (currentRouteFormCode) routeKeys.push(String(currentRouteFormCode).trim());
  if (currentRouteLongName) routeKeys.push(String(currentRouteLongName).trim());

  const stationEntries = [];
  if (stationName) {
    stationEntries.push(String(stationName).trim());
    stationEntries.push(normalizeRuleKey(stationName));
  }

  const routes = announcementDisableRules?.routes || {};
  for (const routeKey of routeKeys) {
    const routeRules = routes[routeKey] || routes[normalizeRuleKey(routeKey)];
    if (!routeRules || typeof routeRules !== 'object') continue;

    for (const candidate of stationEntries) {
      if (routeRules[candidate]) return routeRules[candidate];
      const directMatch = Object.keys(routeRules).find(key => normalizeRuleKey(key) === normalizeRuleKey(candidate));
      if (directMatch) return routeRules[directMatch];
    }
  }

  return null;
}

function isAnnouncementTypeDisabledForStation(stationName, announcementType) {
  const typeKey = normalizeAnnouncementTypeKey(announcementType);
  const rule = getAnnouncementRuleForStation(currentManualRoute?.name || currentRouteLongName || currentRouteFormCode || '', stationName);
  if (!rule) return false;

  if (rule === true) return true;
  if (Array.isArray(rule)) return rule.some(item => normalizeAnnouncementTypeKey(item) === typeKey);
  if (typeof rule === 'object') {
    if (Object.prototype.hasOwnProperty.call(rule, typeKey)) return !!rule[typeKey];
    if (Array.isArray(rule.disabled)) return rule.disabled.some(item => normalizeAnnouncementTypeKey(item) === typeKey);
    if (Array.isArray(rule.types)) return rule.types.some(item => normalizeAnnouncementTypeKey(item) === typeKey);
    if (Array.isArray(rule.announcements)) return rule.announcements.some(item => normalizeAnnouncementTypeKey(item) === typeKey);
    for (const [key, value] of Object.entries(rule)) {
      if (normalizeAnnouncementTypeKey(key) === typeKey) return !!value;
    }
  }

  return false;
}

function resolveAnnouncementTypeForStation(stationName, announcementType) {
  const baseType = normalizeAnnouncementTypeKey(announcementType);
  let resolvedType = baseType;
  const seen = new Set();

  while (!seen.has(resolvedType)) {
    seen.add(resolvedType);
    const ruleValues = getAnnouncementRuleForStation(currentManualRoute?.name || currentRouteLongName || currentRouteFormCode || '', stationName);
    const disabledTypes = [];

    if (Array.isArray(ruleValues)) {
      disabledTypes.push(...ruleValues);
    } else if (typeof ruleValues === 'boolean') {
      if (ruleValues) disabledTypes.push('tns', 'naa', 'mtg', 'form');
    } else if (ruleValues && typeof ruleValues === 'object') {
      if (Array.isArray(ruleValues.disabled)) disabledTypes.push(...ruleValues.disabled);
      else if (Array.isArray(ruleValues.types)) disabledTypes.push(...ruleValues.types);
      else if (Array.isArray(ruleValues.announcements)) disabledTypes.push(...ruleValues.announcements);
      else {
        Object.entries(ruleValues)
          .filter(([, enabled]) => !!enabled)
          .forEach(([key]) => disabledTypes.push(key));
      }
    }

    const disabledSet = new Set(disabledTypes.map(normalizeAnnouncementTypeKey));
    if (!disabledSet.has(resolvedType)) return resolvedType;

    const fallbackMap = {
      tns: 'naa',
      naa: 'form',
      form: 'naa',
      mtg: 'naa'
    };
    const fallback = fallbackMap[resolvedType];
    if (!fallback || fallback === resolvedType) return resolvedType;
    resolvedType = fallback;
  }

  return resolvedType;
}

function isMtgOnlyRoute(routeCode) {
  return !!currentManualRoute?.tnsMtgOnly
    || (!!routeCode && mtgOnlyRouteCodes.has(String(routeCode).trim().toUpperCase()));
}

loadMtgOnlyRouteConfig();
loadAnnouncementDisableRules();
window.addEventListener('focus', () => {
  loadMtgOnlyRouteConfig();
  loadAnnouncementDisableRules();
});

// ==================== STATION NAME NORMALIZATION ====================
// Normalize station names: "Beenleigh station, platform 2" -> "Beenleigh"
function normalizeStationName(fullName) {
  if (!fullName) return fullName;
  
  // Remove "station" and everything after it, including commas
  let normalized = fullName.replace(/\s+station.*$/i, '').trim();
  
  // Remove any trailing commas or platform info
  normalized = normalized.replace(/,.*$/, '').trim();
  
  return normalized;
}

// ==================== GTFS CSV PARSER ====================
// Parse CSV data and return array of objects
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted fields that might contain commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || '';
    });
    rows.push(obj);
  }
  
  return rows;
}

// Load and parse SEQ_GTFS files
async function loadSEQGTFSFromFiles() {
  console.log('📂 Loading SEQ_GTFS files from server...');
  try {
    const results = {
      routes: {},
      trips: [],
      tripIdMap: {},
      tripServiceMap: {},
      calendar: {},
      calendarDates: {},
      stops: {},
      totalRoutes: 0,
      loadTime: new Date().toLocaleTimeString()
    };
    
    // List of GTFS files to load
    const files = ['routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt', 'calendar.txt', 'calendar_dates.txt'];
    const fileData = {};
    
    for (const file of files) {
      console.log(`📄 Loading ${file}...`);
      
      // Use the current server origin so HTTPS remains consistent.
      let response = await fetch(`${window.location.origin}/SEQ_GTFS/${file}`);
      
      if (!response.ok) {
        // Fallback to relative path
        console.log(`   ⚠️ Local server origin failed, trying relative path...`);
        response = await fetch(`../SEQ_GTFS/${file}`);
      }
      
      if (!response.ok) {
        // Try alternate path
        console.log(`   ⚠️ Relative path failed, trying ./`);
        response = await fetch(`./SEQ_GTFS/${file}`);
      }
      
      if (!response.ok) {
        throw new Error(`${file} not found - status ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error(`${file} is empty`);
      }
      
      fileData[file] = parseCSV(text);
      
      if (fileData[file].length === 0) {
        throw new Error(`${file} parsed but contains no data`);
      }
      
      console.log(`✅ Loaded ${fileData[file].length} rows from ${file}`);
    }
    
    // Process routes.txt
    fileData['routes.txt'].forEach(route => {
      results.routes[route.route_id] = {
        ...route,
        patterns: [] // Will be populated below
      };
    });
    
    // Process stops.txt
    fileData['stops.txt'].forEach(stop => {
      results.stops[stop.stop_id] = stop;
    });
    
    // Process trips.txt - retain only Queensland Rail train services.
    const qrTrips = fileData['trips.txt'].filter(trip =>
      (trip.service_id || '').trim().toUpperCase().startsWith('QR')
    );

    qrTrips.forEach(trip => {
      results.trips.push(trip);
      results.tripIdMap[trip.trip_id] = trip.route_id;
      results.tripServiceMap[trip.trip_id] = trip.service_id;
    });

    console.log(`🚆 Filtered trips.txt to QR services: ${qrTrips.length} kept, ${fileData['trips.txt'].length - qrTrips.length} skipped`);

    // Process calendar.txt and calendar_dates.txt for service-day filtering
    if (fileData['calendar.txt']) {
      fileData['calendar.txt'].forEach(service => {
        results.calendar[service.service_id] = {
          monday: service.monday === '1',
          tuesday: service.tuesday === '1',
          wednesday: service.wednesday === '1',
          thursday: service.thursday === '1',
          friday: service.friday === '1',
          saturday: service.saturday === '1',
          sunday: service.sunday === '1'
        };
      });
    }

    if (fileData['calendar_dates.txt']) {
      fileData['calendar_dates.txt'].forEach(entry => {
        if (!results.calendarDates[entry.service_id]) {
          results.calendarDates[entry.service_id] = [];
        }
        results.calendarDates[entry.service_id].push({
          date: entry.date,
          exception_type: Number(entry.exception_type) || 0
        });
      });
    }
    
    // Build patterns from stop_times.txt
    console.log('🔨 Building patterns from stop_times.txt...');
    const stopTimesByTrip = {};
    fileData['stop_times.txt'].forEach(stopTime => {
      if (!stopTimesByTrip[stopTime.trip_id]) {
        stopTimesByTrip[stopTime.trip_id] = [];
      }
      stopTimesByTrip[stopTime.trip_id].push(stopTime);
    });
    
    // For each trip, create a pattern (one pattern per unique stop sequence per trip)
    const patternsByRoute = {};
    
    Object.entries(stopTimesByTrip).forEach(([tripId, stopTimes]) => {
      // Find which route this trip belongs to
      const route_id = results.tripIdMap[tripId];
      if (!route_id) return;
      
      if (!patternsByRoute[route_id]) {
        patternsByRoute[route_id] = [];
      }
      
      // Sort stops by sequence
      stopTimes.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
      
      // Convert to pattern format
      const pattern = {
        trip_id: tripId,
        form_code: tripId.substring(tripId.lastIndexOf('-') + 1), // Extract form code from trip ID
        stops: stopTimes.map(st => {
          const stopInfo = results.stops[st.stop_id];
          return {
            id: st.stop_id,
            code: stopInfo ? stopInfo.stop_code : '',
            name: stopInfo ? stopInfo.stop_name : st.stop_id,
            stop_sequence: st.stop_sequence,
            arrival_time: st.arrival_time,
            departure_time: st.departure_time
          };
        })
      };
      
      // Add pattern if not duplicate
      const exists = patternsByRoute[route_id].some(p => 
        p.stops.length === pattern.stops.length &&
        p.stops.every((s, idx) => s.id === pattern.stops[idx].id)
      );
      
      if (!exists) {
        patternsByRoute[route_id].push(pattern);
      }
    });
    
    // Attach patterns to routes
    Object.entries(patternsByRoute).forEach(([routeId, patterns]) => {
      if (results.routes[routeId]) {
        results.routes[routeId].patterns = patterns;
      }
    });
    
    console.log(`✅ Built ${Object.keys(patternsByRoute).length} routes with patterns`);
    console.log(`✅ Built tripIdMap with ${Object.keys(results.tripIdMap).length} entries`);
    
    results.totalRoutes = Object.keys(results.routes).length;
    console.log(`📊 SEQ_GTFS Data Summary: ${results.totalRoutes} routes, ${Object.keys(results.stops).length} stops, ${results.trips.length} trips`);
    
    return results;
  } catch (error) {
    console.error('❌ Error loading SEQ_GTFS files:', error.message);
    console.error('   Stack:', error.stack);
    return null;
  }
}

// ==================== PERFORMANCE OPTIMIZATION ====================
// Cache for GTFS results to avoid repeated lookups
const gtfsCache = new Map();
const MAX_CACHE_SIZE = 50; // Only keep last 50 routes cached
let lastRouteEnterTime = 0; // For debouncing rapid route changes

function getGTFSCacheKey(runCode) {
  return `${(runCode || '').toUpperCase()}|${getSelectedDayType()}`;
}

// Function to add to cache with size limit (LRU-like behavior)
function setCacheWithLimit(key, value) {
  if (gtfsCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry when cache is full
    const firstKey = gtfsCache.keys().next().value;
    gtfsCache.delete(firstKey);
  }
  gtfsCache.set(key, value);
}

// Wrapper to add timeout to GTFS requests (2 second timeout)
async function searchRunInGTFSWithTimeout(runCode, timeoutMs = 2000) {
  const cacheKey = getGTFSCacheKey(runCode);

  // Check cache first
  if (gtfsCache.has(cacheKey)) {
    console.log(`✓ [CACHE HIT] GTFS data for ${runCode} on ${getSelectedDayType()}`);
    return gtfsCache.get(cacheKey);
  }
  
  // Search in local stoppingPatterns instead of calling Flask
  try {
    const upperCode = runCode.toUpperCase();
    const stoppingPatterns = window.stoppingPatterns || {};
    
    // First try direct lookup in runCodeIndex
    if (runCodeIndex && runCodeIndex[upperCode]) {
      const data = runCodeIndex[upperCode];
      const result = {
        found: true,
        routeId: upperCode,
        tripId: upperCode,
        destination: data.route_long_name || 'Unknown',
        data: data
      };
      setCacheWithLimit(cacheKey, result);
      console.log(`✓ [GTFS] Found ${runCode} in route code index`);
      return result;
    }
    
    // Search trip ID map for matching run code
    // Trip IDs contain the run code, e.g., "34773333-QR 25_26-40890-DR26"
    // Try to use the tripIdMap from globalGTFSData if the global tripIdMap is empty
    let currentTripMap = tripIdMap;
    if (globalGTFSData && globalGTFSData.tripIdMap && Object.keys(currentTripMap).length === 0) {
      currentTripMap = globalGTFSData.tripIdMap;
      console.log(`📌 Using tripIdMap from globalGTFSData (${Object.keys(currentTripMap).length} entries)`);
    }
    
    if (currentTripMap && Object.keys(currentTripMap).length > 0) {
      console.log(`🔍 Searching ${Object.keys(currentTripMap).length} trip IDs for "${upperCode}"...`);
      for (const [tripId, routeId] of Object.entries(currentTripMap)) {
        if (!tripId.includes(upperCode)) continue;
        if (!isTripServiceActiveForSelectedDay(tripId, globalGTFSData)) continue;

        console.log(`✓ [GTFS] Found ${runCode} in trip ID: ${tripId} => ${routeId}`);
        // Return the route data for this trip
        if (globalGTFSData && globalGTFSData.routes && globalGTFSData.routes[routeId]) {
          const data = globalGTFSData.routes[routeId];
          const result = {
            found: true,
            routeId: routeId,
            tripId: tripId,
            destination: data.route_long_name || 'Unknown',
            data: data
          };
          setCacheWithLimit(cacheKey, result);
          return result;
        }
      }
      console.log(`⚠️  No matching trip ID found for "${upperCode}"`);
    } else {
      console.log(`⚠️  tripIdMap is empty! (${Object.keys(currentTripMap).length} entries)`);
    }
    
    // Try extracting route code (remove digits)
    const routeCodePrefix = upperCode.replace(/[0-9]/g, '').substring(0, 4);
    if (routeCodePrefix && routeCodePrefix.length >= 2 && runCodeIndex[routeCodePrefix]) {
      const data = runCodeIndex[routeCodePrefix];
      const result = {
        found: true,
        routeId: routeCodePrefix,
        tripId: routeCodePrefix,
        destination: data.route_long_name || 'Unknown',
        data: data
      };
      setCacheWithLimit(cacheKey, result);
      console.log(`✓ [GTFS] Found ${runCode} by prefix ${routeCodePrefix}`);
      return result;
    }
    
    // Then search stoppingPatterns with multiple strategies
    for (const [key, pattern] of Object.entries(stoppingPatterns)) {
      const keyUpper = key.toUpperCase();
      if (keyUpper === upperCode || 
          keyUpper.startsWith(upperCode) || 
          keyUpper.includes(upperCode)) {
        const result = {
          found: true,
          routeId: key,
          tripId: key,
          destination: pattern.route_long_name || 'Unknown',
          data: pattern
        };
        setCacheWithLimit(cacheKey, result);
        console.log(`✓ [GTFS] Found ${runCode} in stoppingPatterns as ${key}`);
        return result;
      }
    }
    
    console.log(`⏱️ [GTFS] Run code ${runCode} not found in local patterns`);
    return null;
  } catch (err) {
    console.debug('Error searching local GTFS:', err);
    return null;
  }
}

// Function to search for a run code in GTFS data (local version)
async function searchRunInGTFS(runCode) {
  try {
    const upperCode = runCode.toUpperCase();
    
    // Try direct lookup first (exact match in route codes)
    if (runCodeIndex && runCodeIndex[upperCode]) {
      console.log(`✅ Found run code ${runCode} in route code index`);
      const data = runCodeIndex[upperCode];
      currentGTFSTrip = data;
      return data;
    }
    
    // Search trip ID map for matching run code
    // Trip IDs contain the run code, e.g., "34773333-QR 25_26-40890-DR26"
    if (tripIdMap && Object.keys(tripIdMap).length > 0) {
      for (const [tripId, routeId] of Object.entries(tripIdMap)) {
        if (!tripId.includes(upperCode)) continue;
        if (!isTripServiceActiveForSelectedDay(tripId, globalGTFSData)) continue;

        console.log(`✅ Found run code ${runCode} in trip ID: ${tripId} => ${routeId}`);
        // Return the route data for this trip
        if (globalGTFSData && globalGTFSData.routes && globalGTFSData.routes[routeId]) {
          const data = globalGTFSData.routes[routeId];
          currentGTFSTrip = data;
          return data;
        }
      }
    }
    
    // Try extracting route code if input includes extra digits
    // e.g., "DR26" should extract "DR" to search index
    const routeCodePrefix = upperCode.replace(/[0-9]/g, '').substring(0, 4);
    if (routeCodePrefix && routeCodePrefix.length >= 2 && runCodeIndex[routeCodePrefix]) {
      console.log(`✅ Found run code ${runCode} by route prefix ${routeCodePrefix}`);
      const data = runCodeIndex[routeCodePrefix];
      currentGTFSTrip = data;
      return data;
    }
    
    // Search in stoppingPatterns - look for any key that contains the route pattern
    const stoppingPatterns = window.stoppingPatterns || {};
    for (const [key, pattern] of Object.entries(stoppingPatterns)) {
      const keyUpper = key.toUpperCase();
      // Try multiple match strategies
      if (keyUpper === upperCode || 
          keyUpper.startsWith(upperCode) || 
          keyUpper.includes(upperCode)) {
        console.log(`✅ Found run code ${runCode} in stoppingPatterns as ${key}`);
        currentGTFSTrip = pattern;
        return pattern;
      }
    }
    
    console.log(`❌ Run code ${runCode} not found in local patterns`);
    return null;
  } catch (err) {
    console.error('Error searching local GTFS:', err);
    return null;
  }
}

// Function to get stopping pattern from GTFS data
async function getStoppingPatternFromGTFS(tripId) {
  try {
    // tripId might be the trip ID from the map, e.g., "34773333-QR 25_26-40890-DR26"
    // or it might be a route ID like "BNFG-4483"
    
    // First check if it's a trip ID that maps to a route
    let routeId = null;
    if (tripIdMap && tripIdMap[tripId]) {
      routeId = tripIdMap[tripId];
    } else if (globalGTFSData && globalGTFSData.tripIdMap && globalGTFSData.tripIdMap[tripId]) {
      routeId = globalGTFSData.tripIdMap[tripId];
    } else if (globalGTFSData && globalGTFSData.routes && globalGTFSData.routes[tripId]) {
      // It's already a route ID
      routeId = tripId;
    }
    
    if (!routeId || !globalGTFSData || !globalGTFSData.routes) {
      console.log(`⚠️  No pattern found for trip ${tripId}`);
      return null;
    }
    
    const routeData = globalGTFSData.routes[routeId];
    if (!routeData || !routeData.patterns || routeData.patterns.length === 0) {
      console.log(`⚠️  No patterns in route ${routeId}`);
      return null;
    }
    
    // Extract form code from trip ID for matching
    // Trip ID format: "36278112-QR 25_26-41937-18S4" -> form_code = "18S4"
    const formCode = tripId.includes('-') ? tripId.substring(tripId.lastIndexOf('-') + 1) : null;
    
    // Find pattern matching both trip_id and form_code
    let mainPattern = null;
    if (formCode) {
      for (const pattern of routeData.patterns) {
        if (pattern.trip_id === tripId && pattern.form_code === formCode) {
          mainPattern = pattern;
          console.log(`✓ Found exact pattern match by trip_id="${tripId}" and form_code="${formCode}"`);
          break;
        }
      }
    }
    
    // Fallback: match by form_code only
    if (!mainPattern && formCode) {
      for (const pattern of routeData.patterns) {
        if (pattern.form_code === formCode) {
          mainPattern = pattern;
          console.log(`⚠️ Matched pattern by form_code="${formCode}" (trip_id mismatch)`);
          break;
        }
      }
    }
    
    // Final fallback: use first pattern
    if (!mainPattern) {
      mainPattern = routeData.patterns[0];
      console.log(`⚠️ Using first available pattern for trip ${tripId}`);
    }
    
    if (!mainPattern.stops || mainPattern.stops.length === 0) {
      console.log(`⚠️  No stops in pattern for ${routeId}`);
      return null;
    }
    
    const stoppingPattern = mainPattern.stops.map(station => {
      const normalizedName = normalizeStationName(station.name);
      return {
        name: normalizedName,
        stopId: station.id,
        code: station.code,
        platform: station.name.split('platform').pop().trim().replace(/[,\s]/g, ''),
        sequence: station.stop_sequence,
        announcements: {
          mindTheGap: {
            text: normalizedName,
            audio: ''
          }
        }
      };
    });
    
    console.log(`✅ Extracted ${stoppingPattern.length} stations from GTFS pattern for ${routeId}`);
    return stoppingPattern;
  } catch (err) {
    console.error('Error getting stopping pattern from GTFS:', err);
    return null;
  }
}

// Function to search gtfs-patterns.json by run number suffix
// Example: searchRoutesByRunNumber("18S4") finds all trip IDs ending with "18S4"
// Returns array of {routeId, tripId, destination, stoppingPattern, formCode} objects
// IMPORTANT: Matches patterns by FORM_CODE and TRIP_ID to ensure correct stopping pattern
async function searchRoutesByRunNumber(runNumber) {
  try {
    if (!runNumber || runNumber.length === 0) {
      console.warn('⚠️ Empty run number provided');
      return [];
    }

    const upperRunNumber = runNumber.toUpperCase();
    let currentTripMap = tripIdMap;

    if (globalGTFSData && globalGTFSData.tripIdMap && Object.keys(currentTripMap).length === 0) {
      currentTripMap = globalGTFSData.tripIdMap;
      console.log(`📌 Using tripIdMap from globalGTFSData (${Object.keys(currentTripMap).length} entries)`);
    }

    if (!currentTripMap || Object.keys(currentTripMap).length === 0) {
      console.warn('⚠️ No trip ID map available');
      return [];
    }

    console.log(`🔍 Searching ${Object.keys(currentTripMap).length} trip IDs for run number "${upperRunNumber}"...`);

    const matches = [];
    const selectedDayType = getSelectedDayType();
    const activeServiceIds = getActiveServiceIdsForDay(selectedDayType, globalGTFSData);

    for (const [tripId, routeId] of Object.entries(currentTripMap)) {
      if (!tripId.toUpperCase().endsWith(upperRunNumber)) continue;

      const serviceId = globalGTFSData?.tripServiceMap?.[tripId];
      if (activeServiceIds && serviceId && !activeServiceIds.has(serviceId)) {
        continue;
      }

      console.log(`✓ Found trip ID match: ${tripId} => ${routeId}`);

      if (globalGTFSData && globalGTFSData.routes && globalGTFSData.routes[routeId]) {
        const routeData = globalGTFSData.routes[routeId];
        const tripIdFormCode = tripId.substring(tripId.lastIndexOf('-') + 1);

        let matchedPattern = null;
        if (routeData.patterns && Array.isArray(routeData.patterns)) {
          for (const pattern of routeData.patterns) {
            if (pattern.form_code === tripIdFormCode && pattern.trip_id === tripId) {
              matchedPattern = pattern;
              console.log(`✓ Matched pattern with form_code="${pattern.form_code}" and trip_id="${pattern.trip_id}"`);
              break;
            }
          }

          if (!matchedPattern) {
            for (const pattern of routeData.patterns) {
              if (pattern.form_code === tripIdFormCode) {
                matchedPattern = pattern;
                console.log(`⚠️ Partial match by form_code="${pattern.form_code}" (trip_id mismatch)`);
                break;
              }
            }
          }
        }

        let stoppingPattern = [];
        if (matchedPattern) {
          if (matchedPattern.stops && Array.isArray(matchedPattern.stops)) {
            stoppingPattern = matchedPattern.stops.map(station => {
              const normalizedName = normalizeStationName(station.name);
              return {
                name: normalizedName,
                stopId: station.id,
                code: station.code,
                platform: station.name.split('platform').pop().trim().replace(/[\s,]/g, ''),
                sequence: station.stop_sequence,
                announcements: {
                  mindTheGap: {
                    text: normalizedName,
                    audio: ''
                  }
                }
              };
            });
          } else if (matchedPattern.stopping_pattern && Array.isArray(matchedPattern.stopping_pattern)) {
            stoppingPattern = matchedPattern.stopping_pattern.map((patternStr, index) => {
              const parts = patternStr.split('|');
              const stationName = parts.length > 3 ? parts.slice(3).join('|') : '';
              const normalizedName = normalizeStationName(stationName);
              return {
                name: normalizedName,
                stopId: parts[2] || '',
                code: parts[2] || '',
                sequence: index + 1,
                announcements: {
                  mindTheGap: {
                    text: normalizedName,
                    audio: ''
                  }
                }
              };
            });
          }
        }

        matches.push({
          tripId: tripId,
          routeId: routeId,
          formCode: tripIdFormCode,
          destination: matchedPattern?.destination || routeData.route_long_name || 'Unknown',
          routeName: routeData.route_name || routeId,
          directionId: matchedPattern?.direction_id || '',
          stoppingPattern: stoppingPattern
        });
      }
    }

    console.log(`✅ Found ${matches.length} routes for run number "${upperRunNumber}"`);
    return matches;
  } catch (error) {
    console.error('Error searching routes by run number:', error);
    return [];
  }
}

// Global index for fast run code lookup (populated when GTFS loads)

let runCodeIndex = {};

function getSelectedDayType() {
  const selectedBtn = document.querySelector('.day-btn.selected');
  if (selectedBtn) {
    if (selectedBtn.id === 'mf-btn') return 'M-F';
    if (selectedBtn.id === 'sat-btn') return 'SAT';
    if (selectedBtn.id === 'sun-btn') return 'SUN';
    if (selectedBtn.id === 'holiday-btn') return 'PH';
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 6) return 'SAT';
  if (dayOfWeek === 0) return 'SUN';
  return 'M-F';
}

function getRoutePreviewDayCode() {
  const dayCode = getSelectedDayType();
  if (dayCode === 'SAT') return 'SA';
  if (dayCode === 'SUN') return 'SU';
  if (dayCode === 'M-F') return 'MF';
  return dayCode;
}

function getActiveServiceIdsForDay(dayType, gtfsData = globalGTFSData) {
  if (!gtfsData || !gtfsData.calendar) {
    return null;
  }

  const serviceIds = new Set();
  const calendarEntries = gtfsData.calendar || {};
  const calendarDates = gtfsData.calendarDates || {};

  if (dayType === 'PH') {
    Object.keys(calendarDates).forEach(serviceId => {
      const exceptions = calendarDates[serviceId] || [];
      if (exceptions.some(entry => Number(entry.exception_type) === 1)) {
        serviceIds.add(serviceId);
      }
    });
    return serviceIds;
  }

  Object.entries(calendarEntries).forEach(([serviceId, service]) => {
    if (!service) return;

    const matches = {
      'M-F': service.monday || service.tuesday || service.wednesday || service.thursday || service.friday,
      SAT: service.saturday,
      SUN: service.sunday
    };

    if (matches[dayType]) {
      serviceIds.add(serviceId);
    }
  });

  return serviceIds;
}

function isTripServiceActiveForSelectedDay(tripId, gtfsData = globalGTFSData) {
  if (!tripId || !gtfsData || !gtfsData.calendar) {
    return true;
  }

  const selectedDayType = getSelectedDayType();
  const activeServiceIds = getActiveServiceIdsForDay(selectedDayType, gtfsData);
  if (!activeServiceIds) {
    return true;
  }

  const serviceId = gtfsData.tripServiceMap?.[tripId] || gtfsData.tripIdServiceMap?.[tripId];
  if (!serviceId) {
    return true;
  }

  return activeServiceIds.has(serviceId);
}

function parseRunCode(runCode) {
  if (!runCode || runCode.length !== 4) {
    return null;
  }
  
  const code = runCode.toUpperCase();
  
  // First, try to find the route using fast lookup index from GTFS data
  if (runCodeIndex && runCodeIndex[code]) {
    const gtfsRoute = runCodeIndex[code];
    const patterns = Array.isArray(gtfsRoute.patterns) ? gtfsRoute.patterns : [];
    
    if (patterns.length > 0) {
      // Find pattern that matches the run code (form_code)
      let mainPattern = null;
      
      // First try: find pattern with matching form_code
      for (const pattern of patterns) {
        if (pattern.form_code === code) {
          mainPattern = pattern;
          console.log(`✓ Found exact form_code match: ${code}`);
          break;
        }
      }
      
      // Fallback: if no exact form_code match, prefer main destination pattern
      if (!mainPattern) {
        mainPattern = patterns[0];
        const long_name = gtfsRoute.route_long_name || '';
        
        if (patterns.length > 1 && long_name.includes('-')) {
          const expectedDestination = long_name.split('-')[1].trim().toLowerCase();
          const matchedPattern = patterns.find(p => {
            const patternDest = (p.destination || '').toLowerCase();
            return patternDest.includes(expectedDestination);
          });
          if (matchedPattern) {
            mainPattern = matchedPattern;
          }
        }
        console.log(`⚠️ No exact form_code match for ${code}, using pattern with destination: ${mainPattern.destination}`);
      }
      
      // Use the new stops format (replaces old stations)
      const stops = mainPattern.stops || [];
      
      // Use destination from JSON (from trips.txt headsign)
      let destination = mainPattern.destination || 'Unknown';
      
      // Get stopping pattern - formatted as: <run_code>|<form_code>|<station_id>|<station_name>
      const stoppingPattern = mainPattern.stopping_pattern || [];
      const stoppingPatternDisplay = `${stops.length} stops`;
      
      // Determine direction and other info from run code structure
      const fourth = parseInt(code[3]);
      const direction = (fourth % 2 === 0) ? 'UP (towards city)' : 'DOWN (away from city)';
      
      console.log(`✅ Found GTFS route for ${code}: ${gtfsRoute.route_name || 'Route'} to ${destination}`);
      
      return {
        runCode: code,
        trainType: 'Train',
        isRevenue: true,
        isEmpty: false,
        route: gtfsRoute.route_name || code,
        destination: destination,
        allDestinations: stops.map(s => s.name),
        stoppingPattern: stoppingPatternDisplay,
        stoppingPatternArray: stoppingPattern,
        stoppingPatternDirect: stops, // Also include detailed stops
        isExpress: false,
        isShortFinish: false,
        direction: direction,
        description: `Service to ${destination}`,
        isGTFS: true
      };
    }
  }
  
  // For run codes that start with known route codes, try to match by route_short_name from GTFS
  // Extract the first two characters as potential route code
  const potentialRouteCode = code.substring(0, 2).toUpperCase();
  if (globalGTFSData && globalGTFSData.routes) {
    for (const [routeId, routeData] of Object.entries(globalGTFSData.routes)) {
      const routeShortName = routeData.route_name || routeId.split('-')[0];
      if (routeShortName.toUpperCase() === potentialRouteCode && routeData.patterns && routeData.patterns.length > 0) {
        // Find pattern with matching form_code first
        let mainPattern = null;
        
        for (const pattern of routeData.patterns) {
          if (pattern.form_code === code) {
            mainPattern = pattern;
            console.log(`✓ Found exact form_code match for ${code}`);
            break;
          }
        }
        
        // Fallback: use best destination pattern
        if (!mainPattern) {
          mainPattern = routeData.patterns[0];
          const long_name = routeData.route_long_name || '';
          
          if (routeData.patterns.length > 1 && long_name.includes('-')) {
            const expectedDestination = long_name.split('-')[1].trim().toLowerCase();
            const matchedPattern = routeData.patterns.find(p => {
              const patternDest = (p.destination || '').toLowerCase();
              return patternDest.includes(expectedDestination);
            });
            if (matchedPattern) {
              mainPattern = matchedPattern;
            }
          }
        }
        
        const stops = mainPattern.stops || [];
        
        // Use destination from JSON (from trips.txt headsign)
        let destination = mainPattern.destination || 'Unknown';
        
        const stoppingPattern = mainPattern.stopping_pattern || [];
        const stoppingPatternDisplay = `${stops.length} stops`;
        const fourth = parseInt(code[3]);
        const direction = (fourth % 2 === 0) ? 'UP (towards city)' : 'DOWN (away from city)';
        
        console.log(`✅ Found partial GTFS match for ${code}: ${routeShortName} to ${destination}`);
        
        runCodeIndex[code] = routeData; // Cache for next time
        
        return {
          runCode: code,
          trainType: 'Train',
          isRevenue: true,
          isEmpty: false,
          route: routeShortName,
          destination: destination,
          allDestinations: stops.map(s => s.name),
          stoppingPattern: stoppingPatternDisplay,
          stoppingPatternArray: stoppingPattern,
          stoppingPatternDirect: stops,
          isExpress: false,
          isShortFinish: false,
          direction: direction,
          description: `Service to ${destination}`,
          isGTFS: true
        };
      }
    }
  }
  
  // Only fall back to hardcoded runCodeGuide if absolutely necessary
  const first = code[0];
  const second = code[1];
  const third = code[2];
  const fourth = parseInt(code[3]);
  
  const trainInfo = runCodeGuide.firstChar[first];
  const routeInfo = runCodeGuide.secondChar[second];
  const patternInfo = runCodeGuide.thirdChar[third];
  const direction = (fourth % 2 === 0) ? 'UP (towards city)' : 'DOWN (away from city)';
  
  if (!trainInfo || !routeInfo || !patternInfo) {
    console.warn(`⚠️ Could not parse run code ${code} - missing info`);
    return null;
  }
  
  console.log(`⚠️ Using hardcoded fallback for ${code} (GTFS data not available)`);
  
  // Determine destination based on direction
  let destination;
  if (fourth % 2 === 0) {
    // Even = UP direction (towards city) - use first destination (typically city-bound)
    destination = routeInfo.destinations[0];
  } else {
    // Odd = DOWN direction (away from city) - use last destination (typically outbound)
    destination = routeInfo.destinations[routeInfo.destinations.length - 1];
  }
  
  return {
    runCode: code,
    trainType: trainInfo.type,
    isRevenue: trainInfo.revenue,
    isEmpty: trainInfo.empty || false,
    route: routeInfo.route,
    destination: destination,
    allDestinations: routeInfo.destinations,
    stoppingPattern: patternInfo.pattern,
    isExpress: patternInfo.express || false,
    isShortFinish: patternInfo.shortFinish || false,
    direction: direction,
    description: `${trainInfo.type} ${trainInfo.revenue ? 'revenue' : 'non-revenue'} service on ${routeInfo.route} to ${destination}`
  };
}

// Global audio instance for tracking and stopping
let currentAudio = null;
let selectedAudioDevice = localStorage.getItem('selectedAudioDevice') || ''; // Audio output device selection
let runInput = null; // Global reference to run number input field

// Announcement looping system
let currentAnnouncementType = null; // Track current announcement type (TNS, NAA, MTG, form, etc.)
let currentAnnouncementAudioPath = null; // Track audio path for looping
let currentAnnouncementDisplayText = null; // Track display text for looping
let currentAnnouncementStation = null;
let currentAnnouncementSpecialMessageId = null;
const pendingStatusAlerts = [];
let announcementLoopTimer = null; // Timer ID for announcement loop
let isLoopingAnnouncement = false; // Flag to indicate if we're currently looping
let isPlayingArrivalAnnouncement = false; // Flag to track if we're playing an arrival announcement (NAA)
let shouldPlayExitButtons = false; // Flag to track if current train number starts with "D"
let ngrButtonMessageEnabled = false; // Flag to track NGR Button Message toggle state

function queueAlertSoundTest() {
  const testSequence = [
    { audioPath: 'QR_PIDS_AudioFiles/GPS.mp3', displayText: 'GPS signal acquired', announcementType: 'GPS' },
    { audioPath: 'QR_PIDS_AudioFiles/NO_GPS.MP3', displayText: 'GPS signal lost', announcementType: 'GPS' },
    { audioPath: 'QR_PIDS_AudioFiles/Battery Low.MP3', displayText: 'Battery low', announcementType: 'BATTERY' },
    { audioPath: 'QR_PIDS_AudioFiles/Battery Critical.MP3', displayText: 'Battery critical', announcementType: 'BATTERY' },
    { audioPath: 'QR_PIDS_AudioFiles/System Ready.MP3', displayText: 'System ready', announcementType: 'SYSTEM_READY' }
  ];

  pendingStatusAlerts.push(...testSequence);
  playNextStatusAlert();
}

function clearPendingAnnouncement() {
  pendingAnnouncementPath = null;
  if (announcementLoopTimer) {
    clearInterval(announcementLoopTimer);
    announcementLoopTimer = null;
  }
  currentAnnouncementAudioPath = null;
  currentAnnouncementDisplayText = null;
  currentAnnouncementType = null;
  currentAnnouncementStation = null;
  currentAnnouncementSpecialMessageId = null;
  isLoopingAnnouncement = false;
  isPlayingArrivalAnnouncement = false;
  shouldPlayExitButtons = false;
  stopAudio();
  if (typeof updateAppState === 'function') {
    updateAppState({ announcement: null, announcementClearedAt: Date.now() });
  }
}

// Function to stop any currently playing audio
function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
    console.log('Audio stopped');
  }
  // Stop announcement looping if active
  if (announcementLoopTimer) {
    clearInterval(announcementLoopTimer);
    announcementLoopTimer = null;
    isLoopingAnnouncement = false;
    console.log('Announcement looping stopped');
  }
  // NOTE: We do NOT reset isPlayingArrivalAnnouncement here because playAudio() calls stopAudio()
  // at the start, and we need to preserve the flag for when the audio ends
  updateStopButtonColor(); // Update button color when audio is stopped
}

function queueStatusAlert(audioPath, displayText, announcementType = 'GPS') {
  pendingStatusAlerts.push({ audioPath, displayText, announcementType });
  playNextStatusAlert();
}

function playNextStatusAlert(endedAudio = null) {
  if (endedAudio && currentAudio !== endedAudio) return;
  if (currentAudio && !currentAudio.paused && !currentAudio.ended) return;

  const alert = pendingStatusAlerts.shift();
  if (!alert) return;

  currentAnnouncementType = alert.announcementType;
  currentAnnouncementAudioPath = alert.audioPath;
  currentAnnouncementDisplayText = alert.displayText;
  currentAnnouncementStation = '';
  currentAnnouncementSpecialMessageId = null;
  playAudio(alert.audioPath);
}

let lastBatteryAlertBand = null;
let batteryAlertMonitoringStarted = false;

function startBatteryAlertMonitoring() {
  if (batteryAlertMonitoringStarted || !navigator.getBattery) return;
  batteryAlertMonitoringStarted = true;

  navigator.getBattery().then(battery => {
    const updateBatteryAlert = () => {
      const level = battery.level * 100;
      const nextBand = level < 10 ? 'critical' : level < 30 ? 'low' : 'normal';
      const previousBand = lastBatteryAlertBand;
      lastBatteryAlertBand = nextBand;

      if (nextBand === 'critical' && previousBand !== 'critical') {
        queueStatusAlert('QR_PIDS_AudioFiles/Battery Critical.MP3', 'Battery critical', 'BATTERY');
      } else if (nextBand === 'low' && (previousBand === 'normal' || previousBand === null)) {
        queueStatusAlert('QR_PIDS_AudioFiles/Battery Low.MP3', 'Battery low', 'BATTERY');
      }
    };

    updateBatteryAlert();
    battery.addEventListener('levelchange', updateBatteryAlert);
  }).catch(error => {
    console.warn('Could not monitor battery level:', error.message);
  });
}

// Function to manually stop audio (used by stop button clicks)
function manualStopAudio() {
  stopAudio();
  isPlayingArrivalAnnouncement = false; // Only reset when manually stopped
  if (typeof updateAppState === 'function') {
    updateAppState({ announcement: null, announcementClearedAt: Date.now() });
  }
  console.log('Audio manually stopped - reset flags');
}

function updateStopButtonColor() {
  // Determine if audio is currently playing
  const isPlaying = currentAudio && !currentAudio.paused && !currentAudio.ended;
  
  // Get all stop buttons
  const stopButtons = [
    document.getElementById('stop-btn'),
    document.getElementById('startup-stop-btn'),
    document.getElementById('station-stop-btn'),
    document.getElementById('normal-stop-btn'),
    document.getElementById('special-stop-btn'),
    document.getElementById('cctv-stop-btn'),
    document.getElementById('cctv-select-stop-btn'),
    document.getElementById('station-code-stop-btn'),
    document.getElementById('route-selection-stop-btn')
  ];

  const playButtons = [
    document.getElementById('play-btn'),
    document.getElementById('special-play-btn'),
    document.getElementById('emergency-play-btn')
  ];
  
  // Update color for all stop buttons
  stopButtons.forEach(btn => {
    if (btn) {
      if (isPlaying) {
        btn.classList.add('footer-btn-green');
        btn.classList.remove('footer-btn-grey');
      } else {
        btn.classList.remove('footer-btn-green');
        btn.classList.add('footer-btn-grey');
      }
    }
  });

  playButtons.forEach(btn => {
    if (btn) {
      btn.disabled = isPlaying;
      btn.classList.toggle('footer-btn-grey', isPlaying);
    }
  });
}

// Start announcement looping - repeats current announcement until next one is triggered
function startAnnouncementLoop(audioPath, displayText, announcementType) {
  // Store the announcement details for looping
  currentAnnouncementAudioPath = audioPath;
  currentAnnouncementDisplayText = displayText;
  currentAnnouncementType = announcementType;
  
  // Stop any existing loop
  if (announcementLoopTimer) {
    clearInterval(announcementLoopTimer);
  }
  
  // Flag that we're looping
  isLoopingAnnouncement = true;
  
  console.log(`🔄 Starting announcement loop for: ${announcementType} - will repeat until next announcement`);
  
  // Wait for current audio to finish, then replay
  const checkAndReplay = () => {
    if (!currentAudio || currentAudio.paused || currentAudio.ended) {
      // Audio finished, replay if still looping
      if (isLoopingAnnouncement && currentAnnouncementAudioPath) {
        console.log(`🔄 Replaying announcement: ${currentAnnouncementType}`);
        playAudio(currentAnnouncementAudioPath);
      }
    }
  };
  
  // Check every 500ms if audio has finished
  announcementLoopTimer = setInterval(checkAndReplay, 500);
}

// Audio playing function for Electron with proper file:// URL handling
function playAudio(audioPath) {
  // Stop any currently playing audio first
  stopAudio();
  
  if (!audioPath) {
    console.log('No audio path provided');
    return;
  }
  
  // Determine fallback path for Form announcements
  let fallbackPath = null;
  if (audioPath.includes('/Form/')) {
    // Extract station name from Form path: Form/{FormCode}/{StationName}/{RouteLongName}.mp3
    const formPathMatch = audioPath.match(/\/Form\/[^\/]+\/([^\/]+)\/[^\/]+\.mp3$/);
    if (formPathMatch) {
      const stationName = formPathMatch[1];
      const mtgFolder = isMtgOnlyRoute(currentRouteFormCode) ? 'Stations' : 'mind the gap';
      fallbackPath = `QR_PIDS_AudioFiles/${mtgFolder}/${stationName} MTG.mp3`;
    }
  }
  
  playAudioInternal(audioPath, fallbackPath);
}

function playAudioInternal(audioPath, fallbackPath) {
  if (!audioPath) return;
  
  console.log(`🎵 Playing audio: ${audioPath}`);
  
  // Broadcast audio to remote devices
  if (typeof updateAppState === 'function') {
    const announcementStartedAt = Date.now();
    updateAppState({
      audioPath,
      announcement: {
        id: `${announcementStartedAt}-${Math.random().toString(36).slice(2, 8)}`,
        type: currentAnnouncementType || '',
        text: currentAnnouncementDisplayText || '',
        specialMessageId: currentAnnouncementType === 'special' ? currentAnnouncementSpecialMessageId : '',
        audioPath,
        station: currentAnnouncementType === 'form' && currentStation
          ? currentStation
          : currentAnnouncementStation || currentStation || '',
        destination: currentDestinationStation || '',
        formCode: currentRouteFormCode || '',
        routeName: currentManualRoute?.name || '',
        ngrButtonMessage: currentAnnouncementType === 'NAA' && ngrButtonMessageEnabled,
        startedAt: announcementStartedAt
      }
    });
  }
  
  try {
    let fileUrl = audioPath;
    let isElectron = false;
    let usingCache = false;
    
    // Route-specific files can be replaced while the app is running, so do not
    // reuse a blob that was preloaded before the replacement.
    const isRouteAudio = /QR_PIDS_AudioFiles\/Route Audio Files\//i.test(audioPath);
    if (audioFileCache[audioPath] && !isRouteAudio) {
      fileUrl = audioFileCache[audioPath];
      usingCache = true;
      console.log(`   ✓ [CACHED] Using preloaded blob URL (instant playback)`);
    } else {
      console.log(`   ⚠️  Not in cache, fetching on demand...`);
      
      // ALWAYS use the local server endpoint for audio files
      // This avoids file:// URL issues with spaces and special characters
      // The local server is already running on the current page origin
      const normalizedPath = audioPath.replace(/\\/g, '/');
      
      // Check if running in Electron
      if (typeof window !== 'undefined' && typeof window.require !== 'undefined') {
        try {
          // In Electron: use the current local server origin
          // This works around file:// URL encoding issues
          fileUrl = `${window.location.origin}/${encodeURI(normalizedPath)}?v=${audioCacheVersion}`;
          isElectron = true;
          console.log('   [Electron] Using local HTTPS server for audio');
        } catch (e) {
          console.log('   Electron detection failed, trying browser mode');
          // Fallback to browser path
          fileUrl = `/${encodeURI(normalizedPath)}?v=${audioCacheVersion}`;
        }
      } else {
        // Browser mode: use relative path
        fileUrl = `/${encodeURI(normalizedPath)}?v=${audioCacheVersion}`;
        console.log('   [Browser] Using local audio path');
      }
    }
    
    const audio = new Audio(fileUrl);
    currentAudio = audio; // Track the audio instance
    // GPS status alerts use Alert Volume; all other announcements use cabin volume.
    audio.volume = currentAnnouncementType === 'GPS'
      ? (window.gpsAlertVolume !== undefined ? window.gpsAlertVolume : 0.5)
      : (window.vasVolume !== undefined ? window.vasVolume : 0.5);
    
    // Set audio output device if one is selected
    if (selectedAudioDevice && typeof audio.setSinkId === 'function') {
      audio.setSinkId(selectedAudioDevice).then(() => {
        console.log('   ✓ Audio routed to device:', selectedAudioDevice);
      }).catch((err) => {
        console.warn('   ⚠️ Failed to set audio sink:', err.message);
      });
    } else if (selectedAudioDevice) {
      console.log('   ℹ️ Browser does not support setSinkId API, using default device');
    }
    
    // Flag to track if we've already tried fallback
    audio.fallbackAttempted = false;
    
    // Add comprehensive event listeners for debugging
    audio.addEventListener('loadstart', () => {
      if (usingCache) {
        console.log('   ✓ Audio loading from cache');
      } else {
        console.log('   ✓ Audio loading from HTTP');
      }
    });
    audio.addEventListener('loadeddata', () => console.log('   ✓ Audio data loaded'));
    audio.addEventListener('canplay', () => console.log('   ✓ Audio ready to play'));
    audio.addEventListener('playing', () => {
      console.log('   ✓ Audio is playing');
      updateStopButtonColor();
    });
    audio.addEventListener('ended', () => {
      console.log('   ✓ Audio finished');
      console.log(`   DEBUG: isPlayingArrivalAnnouncement=${isPlayingArrivalAnnouncement}, ngrButtonMessageEnabled=${ngrButtonMessageEnabled}`);
      updateStopButtonColor();
      
      // If we just finished playing an arrival announcement and ngrButtonMessageEnabled is set, play exit buttons sound
      if (isPlayingArrivalAnnouncement && ngrButtonMessageEnabled) {
        isPlayingArrivalAnnouncement = false;
        
        console.log(`   🎵 Playing exit buttons sound immediately`);
        // Play exit buttons sound immediately when arrival audio ends
        playAudioInternal('QR_PIDS_AudioFiles/Special Messages/exit buttons.MP3', null);
      } else {
        isPlayingArrivalAnnouncement = false;
        if (!isPlayingArrivalAnnouncement || !ngrButtonMessageEnabled) {
          console.log(`   ℹ️ Not playing exit buttons - isPlayingArrivalAnnouncement: ${isPlayingArrivalAnnouncement}, ngrButtonMessageEnabled: ${ngrButtonMessageEnabled}`);
        }
      }
      playNextStatusAlert(audio);
    });
    audio.addEventListener('error', (e) => {
      console.error('   ✗ Audio error:', {
        error: e.error,
        message: e.message,
        type: e.type,
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
      
      // Try fallback if available and not already tried
      if (fallbackPath && !audio.fallbackAttempted) {
        audio.fallbackAttempted = true;
        console.log(`   ➜ Attempting fallback: ${fallbackPath}`);
        playAudioInternal(fallbackPath, null);
      } else if (/(?:^|[\\/])(?:TNS_Special|Route Audio Files|Manual Route files)[\\/]/i.test(audioPath) && !audio.fallbackAttempted) {
        // Auto-fallback: route-specific file not found, try the standard folder
        audio.fallbackAttempted = true;
        const normalizedAudioPath = audioPath.replace(/\\/g, '/');
        const match = normalizedAudioPath.match(/([^/]+\.mp3)$/);
        
        if (match) {
          const filename = match[1]; // e.g., "TNS_Central.mp3" or "Walloon MTG.mp3" or "Walloon.mp3"
          
          if (filename.includes('TNS_')) {
            // TNS file fallback
            const tnsPath = `QR_PIDS_AudioFiles/TNS/${filename}`;
            console.log(`   ➜ Route-specific TNS not found, falling back to TNS: ${tnsPath}`);
            playAudioInternal(tnsPath, null);
          } else if (filename.toLowerCase().includes(' mtg')) {
            // MTG file fallback
            const mtgFolder = isMtgOnlyRoute(currentRouteFormCode) ? 'Stations' : 'mind the gap';
            const mtgPath = `QR_PIDS_AudioFiles/${mtgFolder}/${filename}`;
            console.log(`   ➜ Route-specific MTG not found, falling back to ${mtgFolder}: ${mtgPath}`);
            playAudioInternal(mtgPath, null);
          } else {
            // NAA file fallback (just station name)
            const naaPath = `QR_PIDS_AudioFiles/now arriving at/NAA ${filename}`;
            console.log(`   ➜ Route-specific NAA not found, falling back to NAA: ${naaPath}`);
            playAudioInternal(naaPath, null);
          }
        }
      } else {
        // File not found - provide suggestions
        console.warn(`\n   📁 === FILE NOT FOUND HELP ===`);
        console.warn(`   Requested file: ${audioPath}`);
        console.warn(`   Expected location: QR_PIDS_AudioFiles/`);
        
        // Provide helpful suggestions based on the type of file
        if (audioPath.includes('/TNS/')) {
          console.warn(`\n   💡 This looks like a TNS (Next Station) file.`);
          console.warn(`   📂 Check if the file exists at:`);
          console.warn(`      • QR_PIDS_AudioFiles/TNS_Special/{FormCode}/{DestinationStation} station/TNS_{StationName}.mp3`);
          console.warn(`      • QR_PIDS_AudioFiles/TNS/TNS_{StationName}.mp3 (auto-fallback)`);
          console.warn(`\n   ℹ️  If TNS_Special file not found, system automatically tries standard TNS folder.`);
          console.warn(`   To fix: Add the file to either TNS_Special or TNS folder.`);
          console.warn(`   Example: TNS_Special/FGBR/Boggo Road station/TNS_Central.mp3`);
          console.warn(`   Example: TNS/TNS_Central.mp3`);
        } else if (audioPath.includes('/Form/')) {
          console.warn(`\n   💡 This looks like a Form announcement file.`);
          console.warn(`   📂 Check if the file exists at:`);
          console.warn(`      • QR_PIDS_AudioFiles/Form/{FormCode}/{CurrentStation}/{DestinationStation} station.mp3`);
          console.warn(`\n   To fix: Ensure Form files use the route DESTINATION (last station).`);
          console.warn(`   Example: Form/FGBR/Roma Street/Boggo Road station.mp3`);
        } else if (audioPath.includes('/mind the gap/') || audioPath.includes('/Stations/')) {
          console.warn(`\n   💡 This looks like a Mind The Gap (MTG) file.`);
          console.warn(`   📂 Check if the file exists at:`);
          console.warn(`      • QR_PIDS_AudioFiles/mind the gap/{StationName} MTG.mp3 (normal routes)`);
          console.warn(`      • QR_PIDS_AudioFiles/Stations/{StationName} MTG.mp3 (configured MTG-only routes)`);
        }
        console.warn(`   ===========================\n`);
      }
      
      // Check if file exists (Electron only)
      if (typeof require !== 'undefined') {
        try {
          const fs = require('fs');
          const path = require('path');
          const absolutePath = path.resolve(audioPath);
          if (fs.existsSync(absolutePath)) {
            console.log('   ✓ File exists:', absolutePath);
          } else {
            console.error('   ✗ File does not exist:', absolutePath);
          }
        } catch (e) {
          // Not in Electron
        }
      }
    });
    
    console.log('   Attempting to play:', audio.src);
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('   ✓ Audio play succeeded');
          updateStopButtonColor();
        })
        .catch(error => {
          // Try fallback if available and not already tried
          if (fallbackPath && !audio.fallbackAttempted) {
            audio.fallbackAttempted = true;
            console.log(`   ➜ Play failed, attempting fallback: ${fallbackPath}`);
            playAudioInternal(fallbackPath, null);
          } else {
            console.error('   ✗ Audio play promise failed:', error);
            // Show user-friendly error
            console.error(`   Audio playback failed: ${error.message}`);
          }
        });
    }
    
  } catch (error) {
    console.error('   ✗ Audio creation failed:', error);
    console.error(`   Audio creation failed: ${error.message}`);
  }
}
// ============================================================================
// ANNOUNCEMENT SYSTEM - Advanced Route-Specific Announcement Scanning
// ============================================================================

// Current route form code (e.g., FGBR for Ferny Grove - Boggo Road)
let currentRouteFormCode = null;
let currentRouteLongName = null; // Full route name (e.g., "Ferny Grove to Boggo Road")

function updateAppState(stateUpdate) {
  if (!stateUpdate || typeof fetch !== 'function') return;

  fetch('/api/state-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stateUpdate)
  }).catch((error) => {
    console.warn('Could not update QVAS state:', error.message);
  });
}
let currentDestinationStation = null; // Last station on the route (e.g., "Boggo Road")
let currentStation = null; // Current/previous station (for Form message generation)
let currentStations = []; // Current list of stations for the route
let routeAnnouncementCache = {}; // Cache of available announcements per route
let audioFileCache = {}; // Cache of pre-loaded audio files (filepath -> object URL or blob)
let audioCacheVersion = Date.now();
let announcementScanInterval = null; // Interval for periodic scanning
let pendingAnnouncementPath = null; // Announcement to play when doors unlock

// Route to form code mapping (maps run code to route short code)
const routeFormCodeMap = {
  '1S24': 'FGBR',  // Ferny Grove - Boggo Road
  '1S28': 'FGBGPR', // Ferny Grove - Boggo Road - Park Road
  '1E35': 'BRFG',   // Brisbane - Ferny Grove
  '1E37': 'BRFG',   // Brisbane - Ferny Grove  
  'D840': 'RWBR',   // Rosewood - Bowen Hills/Brisbane
  // Add more mappings as needed
};

// Function to get form code for a route
function getFormCodeForRoute(runCode) {
  return routeFormCodeMap[runCode] || null;
}

// Function to extract form code from GTFS routeId (e.g., "FGBR-4483" -> "FGBR")
function extractFormCodeFromGTFS(routeId) {
  if (!routeId) return null;
  const parts = routeId.split('-');
  return parts[0] || null;
}

// Function to build route long name from first and last station
function buildRouteLongName(stations) {
  if (stations && stations.length >= 2) {
    const first = stations[0].name;
    const last = stations[stations.length - 1].name;
    return `${first} to ${last}`;
  }
  return null;
}

// Function to load all route-specific announcements (MTG, NAA, TNS)
async function loadRouteAnnouncements(formCode, longName) {
  if (!formCode || !longName) {
    console.log('! No form code or long name for route-specific announcements');
    return {};
  }
  
  const cacheKey = `${formCode}/${longName}`;
  console.log(`\n📂 === SCANNING ROUTE ANNOUNCEMENTS ===`);
  console.log(`   Form Code: ${formCode}`);
  console.log(`   Route Name: ${longName}`);
  console.log(`   Looking in: TNS_Special/${formCode}/${longName}/`);
  
  try {
    // Extract destination name from "Ferny Grove - Brisbane City" -> "Ferny Grove"
    const destinationName = longName.includes(' - ') ? longName.split(' - ')[0].trim() : longName;
    const apiUrl = `http://localhost:5000/api/route-announcements/${encodeURIComponent(formCode)}/${encodeURIComponent(destinationName)}`;
    console.log(`   API URL: ${apiUrl}`);
    console.log(`   Fetching...`);
    const response = await fetch(apiUrl);
    console.log(`   ✓ Response received`);
    
    if (response.ok) {
      const data = await response.json();
      routeAnnouncementCache[cacheKey] = data.announcements || {};
      const announcements = routeAnnouncementCache[cacheKey];
      const fileCount = Object.keys(announcements).length;
      
      console.log(`✓ Successfully scanned route folder`);
      console.log(`   Total files found: ${fileCount}`);
      
      if (fileCount > 0) {
        // Group by type for display
        const mtgFiles = Object.keys(announcements).filter(k => k.startsWith('MTG_'));
        const naaFiles = Object.keys(announcements).filter(k => k.startsWith('NAA_'));
        const tnsFiles = Object.keys(announcements).filter(k => k.startsWith('TNS_'));
        
        console.log(`   ├─ MTG (Mind the Gap): ${mtgFiles.length}`);
        mtgFiles.forEach(f => console.log(`   │  • ${f}`));
        console.log(`   ├─ NAA (Now Arriving): ${naaFiles.length}`);
        naaFiles.forEach(f => console.log(`   │  • ${f}`));
        console.log(`   └─ TNS (Next Station): ${tnsFiles.length}`);
        tnsFiles.forEach(f => console.log(`      • ${f}`));
      }
      
      return announcements;
    } else {
      console.log(`✗ Route folder not found (HTTP ${response.status})`);
      
      // Try to get error details from response
      try {
        const errorData = await response.json();
        if (errorData.debug) {
          console.log(`   Debug - Path checked: ${errorData.debug.searched_path}`);
          console.log(`   Debug - Path exists: ${errorData.debug.path_exists}`);
        }
      } catch (parseError) {
        // Ignore parse errors, just log what we know
      }
      
      console.log(`   This is normal if route-specific files haven't been created yet`);
      routeAnnouncementCache[cacheKey] = {};
      return {};
    }
  } catch (error) {
    console.error(`✗ Error scanning route announcements:`);
    console.error(`   ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    routeAnnouncementCache[cacheKey] = {};
    return {};
  }
}

// Function to set up periodic scanning (every 5 minutes)
async function startAnnouncementScanning(formCode, longName) {
  console.log(`\n🚀 === STARTING ANNOUNCEMENT SCANNING ===`);
  console.log(`   Form Code: ${formCode}`);
  console.log(`   Route Name: ${longName}`);
  console.log(`   Function: startAnnouncementScanning() called\n`);
  
  // Clear existing interval
  if (announcementScanInterval) {
    console.log(`   Clearing previous scan interval`);
    clearInterval(announcementScanInterval);
  }
  
  // Clear old cached audio files to free memory and pick up replaced files
  Object.values(audioFileCache).forEach(fileUrl => {
    if (typeof fileUrl === 'string' && fileUrl.startsWith('blob:')) URL.revokeObjectURL(fileUrl);
  });
  audioFileCache = {};
  audioCacheVersion = Date.now();
  console.log(`   Cleared audio cache`);
  
  // Scan immediately and preload files
  await loadRouteAnnouncements(formCode, longName);
  await preloadAnnouncementFiles();
  
  // Scan every 5 minutes (300000 ms) and refresh preload
  announcementScanInterval = setInterval(async () => {
    console.log(`🔄 Refreshing route announcements for ${formCode}/${longName}`);
    await loadRouteAnnouncements(formCode, longName);
    Object.values(audioFileCache).forEach(fileUrl => {
      if (typeof fileUrl === 'string' && fileUrl.startsWith('blob:')) URL.revokeObjectURL(fileUrl);
    });
    audioFileCache = {};
    audioCacheVersion = Date.now();
    await preloadAnnouncementFiles();
  }, 300000); // 5 minutes
}

// Function to generate announcement audio paths with route-specific priority
function isFirstStation(station) {
  // Helper function to check if a station is the first station in the route
  try {
    if (!station || typeof currentStations === 'undefined' || !currentStations || currentStations.length === 0) {
      return false;
    }
    const firstStation = currentStations[0];
    if (station === firstStation) return true;
    if (station.stopId && firstStation.stopId) return station.stopId === firstStation.stopId;
    return normalizeStationName(station.name) === normalizeStationName(firstStation.name);
  } catch (e) {
    // If currentStations is not accessible, assume it's not the first station
    return false;
  }
}

function getAnnouncementAudioPath(stationName, type) {
  // Uses global currentStation and currentRouteFormCode for Form messages
  // currentStation: the station we're at (for Form path generation)
  // currentRouteFormCode: the form code of the current route (for Form path)
  // currentDestinationStation: the destination of the current route (for Form filename)
  
  if (!stationName) return '';
  
  let normalizedName = stationName.trim();

  if (currentManualRoute) {
    const manualStation = currentStations.find(station =>
      station && normalizeStationName(station.name).toLowerCase() === normalizeStationName(normalizedName).toLowerCase()
    );
    const manualAnnouncements = manualStation?.announcements || {};
    const manualRouteAudioFolder = currentManualRoute.tnsFolder && !/\.mp3$/i.test(String(currentManualRoute.tnsFolder).trim())
      ? normalizeManualAudioPath(currentManualRoute.tnsFolder)
      : (currentManualRoute.name ? `QR_PIDS_AudioFiles/Route Audio Files/${String(currentManualRoute.name).trim()}` : '');
    if (type === 'form') return currentManualFormFile || '';
    if (type === 'next' || type === 'nextStation') {
      return manualRouteAudioFolder
        ? `${manualRouteAudioFolder}/TNS_${normalizedName}.mp3`
        : (manualAnnouncements.next?.audio || '');
    }
    if (type === 'arrival' || type === 'nowArrivingAt') {
      return currentManualRoute.tnsMtgOnly ? '' : (manualRouteAudioFolder
        ? `${manualRouteAudioFolder}/${normalizedName}.mp3`
        : (manualAnnouncements.arrival?.audio || manualAnnouncements.next?.audio || ''));
    }
    if (type === 'mindTheGap') {
      return manualRouteAudioFolder
        ? `${manualRouteAudioFolder}/${normalizedName} MTG.mp3`
        : (manualAnnouncements.mindTheGap?.audio || '');
    }
  }

  const cacheKey = `${currentRouteFormCode}/${currentRouteLongName}`;
  const routeAnnouncements = routeAnnouncementCache[cacheKey] || {};
  
  if (type === 'mindTheGap') {
    if (isMtgOnlyRoute(currentRouteFormCode)) {
      if (currentRouteFormCode && currentDestinationStation) {
        let destinationFolder = currentDestinationStation;
        if (!destinationFolder.toLowerCase().includes('station')) {
          destinationFolder = `${destinationFolder} station`;
        }
        const tnsSpecialPath = `QR_PIDS_AudioFiles/TNS_Special/${currentRouteFormCode}/${destinationFolder}/${normalizedName} MTG.mp3`;
        console.log(`   [MTG-ONLY] Checking TNS_Special for MTG: ${tnsSpecialPath}`);
        return tnsSpecialPath;
      }

      console.log(`   [MTG-ONLY] Using Stations audio for ${normalizedName}`);
      return `QR_PIDS_AudioFiles/Stations/${normalizedName} MTG.mp3`;
    }

    return `QR_PIDS_AudioFiles/mind the gap/${normalizedName} MTG.mp3`;
    
  } else if (type === 'arrival' || type === 'nowArrivingAt') {
    // Priority 1: Check for route-specific NAA in TNS_Special folder
    if (currentRouteFormCode && currentDestinationStation) {
      // NAA format: "{StationName}" (no prefix, no suffix - just station name)
      const naaLabel = normalizedName;
      
      // Destination folder format: "{DestinationStation} station"
      let destinationFolder = currentDestinationStation;
      if (!destinationFolder.toLowerCase().includes('station')) {
        destinationFolder = `${destinationFolder} station`;
      }
      
      const tnsSpecialPath = `QR_PIDS_AudioFiles/TNS_Special/${currentRouteFormCode}/${destinationFolder}/${naaLabel}.mp3`;
      console.log(`   Checking TNS_Special for NAA: ${tnsSpecialPath}`);
      return tnsSpecialPath;
    }
    // Fallback: Check for route-specific NAA in routeAnnouncements
    if (routeAnnouncements[`NAA_${normalizedName}`]) {
      return routeAnnouncements[`NAA_${normalizedName}`];
    }
    // Otherwise use standard path
    return `QR_PIDS_AudioFiles/now arriving at/NAA ${normalizedName}.mp3`;
    
  } else if (type === 'form') {
    if (currentManualRoute?.formFile) {
      return currentManualRoute.formFile;
    }
    // Form path: directly generate without checking TNS_Special first
    // Format: QR_PIDS_AudioFiles/Form/{RouteShortName}/{CurrentStation}/{DestinationStation} station.mp3
    if (!currentStation || !currentRouteFormCode || !currentDestinationStation) {
      console.log(`   ⚠️  Form path missing globals: station="${currentStation}", form="${currentRouteFormCode}", dest="${currentDestinationStation}"`);
      return '';
    }
    
    let destinationLabel = currentDestinationStation;
    if (!destinationLabel.toLowerCase().includes('station')) {
      destinationLabel = `${destinationLabel} station`;
    }
    console.log(`   ✓ [FORM] Using Form announcement: current="${currentStation}", destination="${destinationLabel}"`);
    const formPath = `QR_PIDS_AudioFiles/Form/${currentRouteFormCode}/${currentStation}/${destinationLabel}.mp3`;
    return formPath;
    
  } else if (type === 'next' || type === 'nextStation') {
    // Priority 1: Check for route-specific TNS_Special (organized by FormCode and Destination Station)
    // Path: TNS_Special/{FormCode}/{DestinationStation} station/TNS_{StationName}.mp3
    if (currentRouteFormCode && currentDestinationStation) {
      // Next station label with "TNS_" prefix
      let nextStationLabel = normalizedName;
      if (!nextStationLabel.toLowerCase().startsWith('tns_')) {
        nextStationLabel = `TNS_${nextStationLabel}`;
      }
      
      // Destination folder format: "{DestinationStation} station"
      let destinationFolder = currentDestinationStation;
      if (!destinationFolder.toLowerCase().includes('station')) {
        destinationFolder = `${destinationFolder} station`;
      }
      
      const tnsSpecialPath = `QR_PIDS_AudioFiles/TNS_Special/${currentRouteFormCode}/${destinationFolder}/${nextStationLabel}.mp3`;
      console.log(`   Checking TNS_Special: ${tnsSpecialPath}`);
      console.log(`   [TNS_SPECIAL] Using path for all stations on route`);
      return tnsSpecialPath;
    }
    
    // Priority 2: Try Form path if we have current station and destination
    if (currentStation && currentRouteFormCode && currentDestinationStation) {
      // Form path uses the DESTINATION station (last station), not the next station
      // Format: QR_PIDS_AudioFiles/Form/{RouteShortName}/{CurrentStation}/{DestinationStation}.mp3
      let destinationLabel = currentDestinationStation;
      // Add "station" suffix if not already present
      if (!destinationLabel.toLowerCase().includes('station')) {
        destinationLabel = `${destinationLabel} station`;
      }
      console.log(`   ✓ [FORM] Using Form announcement: current="${currentStation}", destination="${destinationLabel}"`);
      const formPath = `QR_PIDS_AudioFiles/Form/${currentRouteFormCode}/${currentStation}/${destinationLabel}.mp3`;
      return formPath;
    }
    
    // Priority 3: Use standard TNS path (fallback)
    console.log(`   ◇ [TNS] Trying standard TNS path for: ${normalizedName}`);
    return `QR_PIDS_AudioFiles/TNS/TNS_${normalizedName}.mp3`;
  }
  
  return '';
}

function normalizeManualAudioPath(audioPath) {
  const normalizedPath = String(audioPath || '').replace(/\\/g, '/').replace(/"$/, '');
  const legacyRoutePath = normalizedPath.match(/^QR_PIDS_AudioFiles\/(?!Route Audio Files\/|mind the gap\/|now arriving at\/|Special Messages\/|Stations\/|TNS\/)(.+)$/i);
  return legacyRoutePath
    ? `QR_PIDS_AudioFiles/Route Audio Files/${legacyRoutePath[1]}`
    : normalizedPath;
}

function getFormOrMtgAudioPath(stationName) {
  return getAnnouncementAudioPath(stationName, 'form')
    || getAnnouncementAudioPath(stationName, 'mindTheGap');
}

// Function to preload all announcement audio files for current route (route-specific + fallbacks)
async function preloadAnnouncementFiles() {
  const cacheKey = `${currentRouteFormCode}/${currentRouteLongName}`;
  const routeAnnouncements = routeAnnouncementCache[cacheKey] || {};
  const filesToPreload = {};
  
  // Count files by type for summary
  let routeSpecificCount = { mtg: 0, naa: 0, tns: 0 };
  let formMtgCount = 0;
  let fallbackCount = { mtg: 0, naa: 0, tns: 0 };
  
  // 1. Add route-specific announcements (MTG, NAA, TNS from TNS_Special folder)
  for (const [key, path] of Object.entries(routeAnnouncements)) {
    filesToPreload[key] = path;
    if (key.startsWith('MTG_')) routeSpecificCount.mtg++;
    else if (key.startsWith('NAA_')) routeSpecificCount.naa++;
    else if (key.startsWith('TNS_')) routeSpecificCount.tns++;
  }
  
  // 2. Extract unique station names from route-specific announcements
  // This ensures we preload Form and Fallback files for all stations with route-specific files
  const stationNames = new Set();
  
  for (const key of Object.keys(routeAnnouncements)) {
    // Extract station name from keys like "MTG_Boggo Road", "NAA_Boggo Road", "TNS_Boggo Road"
    const match = key.match(/^(?:MTG|NAA|TNS)_(.+)$/);
    if (match) {
      stationNames.add(match[1].trim());
    }
  }
  
  // If no stations found in route announcements, try using currentStations as fallback
  let stationsToProcess = Array.from(stationNames);
  if (stationsToProcess.length === 0 && currentStations && currentStations.length > 0) {
    stationsToProcess = currentStations.map(s => s.name.trim());
  }
  
  // 3. Add Fallback announcements for all identified stations
  if (stationsToProcess.length > 0) {
    stationsToProcess.forEach(stationName => {
      // Fallback MTG (mind the gap)
      const mtgFolder = isMtgOnlyRoute(currentRouteFormCode) ? 'Stations' : 'mind the gap';
      const mtgPath = `QR_PIDS_AudioFiles/${mtgFolder}/${stationName} MTG.mp3`;
      if (!filesToPreload[`FALLBACK_MTG_${stationName}`]) {
        filesToPreload[`FALLBACK_MTG_${stationName}`] = mtgPath;
        fallbackCount.mtg++;
      }
      
      // Fallback NAA (now arriving at) - only if route-specific NAA not already added
      if (!routeAnnouncements[`NAA_${stationName}`]) {
        const naaPath = `QR_PIDS_AudioFiles/now arriving at/NAA ${stationName}.mp3`;
        if (!filesToPreload[`FALLBACK_NAA_${stationName}`]) {
          filesToPreload[`FALLBACK_NAA_${stationName}`] = naaPath;
          fallbackCount.naa++;
        }
      }
      
      // Fallback TNS (next station) - only if route-specific TNS not already added
      if (!routeAnnouncements[`TNS_${stationName}`]) {
        const tnsPath = `QR_PIDS_AudioFiles/TNS/${stationName} TNS.mp3`;
        if (!filesToPreload[`FALLBACK_TNS_${stationName}`]) {
          filesToPreload[`FALLBACK_TNS_${stationName}`] = tnsPath;
          fallbackCount.tns++;
        }
      }
    });
  }
  
  const totalFiles = Object.keys(filesToPreload).length;
  if (totalFiles === 0) {
    console.log('\n📥 === PRELOAD AUDIO FILES ===');
    console.log('! No announcements found to preload');
    console.log('   (This is normal if route folder doesn\'t exist yet)');
    return;
  }
  
  console.log(`\n📥 === PRELOAD AUDIO FILES ===`);
  console.log(`Route: ${currentRouteFormCode}/${currentRouteLongName}`);
  console.log(`Stations: ${currentStations ? currentStations.length : 0}`);
  console.log(`Total files to load: ${totalFiles}`);
  console.log(`\n📋 Breakdown:`);
  console.log(`  🔹 Route-Specific Announcements (TNS_Special folder):`);
  console.log(`     • MTG (Mind the Gap): ${routeSpecificCount.mtg}`);
  console.log(`     • NAA (Now Arriving): ${routeSpecificCount.naa}`);
  console.log(`     • TNS (Next Station):  ${routeSpecificCount.tns}`);
  console.log(`     Total route-specific: ${routeSpecificCount.mtg + routeSpecificCount.naa + routeSpecificCount.tns}`);
  console.log(`  🔹 Form Announcements (QR_PIDS_AudioFiles/Form):`);
  console.log(`     • MTG (Mind the Gap): ${formMtgCount}`);
  console.log(`  🔹 Fallback Announcements:`);
  console.log(`     • MTG (Mind the Gap): ${fallbackCount.mtg}`);
  console.log(`     • NAA (Now Arriving): ${fallbackCount.naa}`);
  console.log(`     • TNS (Next Station):  ${fallbackCount.tns}`);
  console.log(`     Total fallback: ${fallbackCount.mtg + fallbackCount.naa + fallbackCount.tns}`);
  
  let successCount = 0;
  let failCount = 0;
  let cachedCount = 0;
  let fileIndex = 1;
  
  for (const [announcementKey, audioPath] of Object.entries(filesToPreload)) {
    try {
      // Check if already cached
      if (audioFileCache[audioPath]) {
        cachedCount++;
        continue;  // Skip logging for cached files to reduce clutter
      }
      
      // Detect if running in Electron
      let isElectron = false;
      let fileUrl = audioPath;
      
      if (typeof window !== 'undefined' && typeof window.require !== 'undefined') {
        try {
          const path = window.require('path');
          const absolutePath = path.resolve(audioPath);
          fileUrl = `file://${absolutePath.replace(/\\/g, '/')}?v=${audioCacheVersion}`;
          isElectron = true;
          // In Electron, just verify the file exists by creating an Audio object
          const testAudio = new Audio(fileUrl);
          audioFileCache[audioPath] = fileUrl;
          console.log(`   ✓ [Electron] Cached: ${announcementKey}`);
          successCount++;
          continue;
        } catch (e) {
          // Continue to browser mode
        }
      }
      
      // Browser mode: fetch and cache as blob URL
      if (!isElectron) {
        const normalizedPath = audioPath.replace(/\\/g, '/');
            const apiUrl = `/${encodeURI(normalizedPath)}?v=${audioCacheVersion}`;
        
        try {
          const response = await fetch(apiUrl);
          
          if (response.ok) {
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            audioFileCache[audioPath] = objectUrl;
            console.log(`   ✓ [Browser] Cached: ${announcementKey} (${blob.size} bytes)`);
            successCount++;
          } else {
            console.log(`   ✗ [Browser] Failed: ${announcementKey} (HTTP ${response.status})`);
            failCount++;
          }
        } catch (fetchError) {
          console.log(`   ✗ [Browser] Error: ${announcementKey} - ${fetchError.message}`);
          failCount++;
        }
      }
    } catch (error) {
      console.log(`   ✗ Exception: ${announcementKey} - ${error.message}`);
      failCount++;
    }
    fileIndex++;
  }
  
  console.log(`\n📥 === PRELOAD COMPLETE ===`);
  console.log(`✓ Successfully loaded: ${successCount}`);
  console.log(`! Already cached: ${cachedCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total ready to play: ${successCount + cachedCount}/${totalFiles}`);
  console.log(`\n✅ All announcements preloaded and ready for playback:`);
  console.log(`   • ${routeSpecificCount.mtg + routeSpecificCount.naa + routeSpecificCount.tns} Route-specific (MTG/NAA/TNS)`);
  console.log(`   • ${formMtgCount} Form Mind the Gap`);
  console.log(`   • ${fallbackCount.mtg + fallbackCount.naa + fallbackCount.tns} Fallback (MTG/NAA/TNS)`);
  console.log(`Cache contains ${Object.keys(audioFileCache).length} entries\n`);
}

// Map of run codes to stopping patterns (station lists)
// Each run code maps to an array of station objects: { name }
// Patterns are loaded from stopping-patterns.json via the server
let stoppingPatterns = {};
let patternsLoadedPromise = null;
let patternsLoadedSuccessfully = false;

// Load stopping patterns from JSON file via HTTP server
const loadStoppingPatterns = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 [ATTEMPT ${attempt}/${retries}] Fetching stopping patterns from /stopping-patterns.json...`);
      const response = await fetch('/stopping-patterns.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      stoppingPatterns = await response.json();
      patternsLoadedSuccessfully = true;
      console.log(`✅ Successfully loaded ${Object.keys(stoppingPatterns).length} stopping patterns from server`);
      console.log(`   Available patterns: ${Object.keys(stoppingPatterns).join(', ')}`);
      return stoppingPatterns;
    } catch (error) {
      console.error(`❌ [ATTEMPT ${attempt}/${retries}] Error loading stopping patterns:`, error.message || error);
      if (attempt < retries) {
        console.log(`   Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  console.error('❌ Failed to load stopping patterns after all retries. Run codes from external file will not work.');
  patternsLoadedSuccessfully = false;
  return {};
};

// Load patterns immediately and set promise
console.log('🚀 Initializing stopping patterns loader...');
patternsLoadedPromise = loadStoppingPatterns();

// Helper function to safely get stopping patterns
// Ensures patterns are loaded before accessing them
const getStoppingPattern = async (runCode) => {
  try {
    if (window.daySelectionWasManuallyChanged && globalGTFSData?.trips?.length) {
      return null;
    }

    // Ensure patterns are loaded before returning
    if (!patternsLoadedSuccessfully) {
      console.log(`⏳ Waiting for patterns to load before accessing run code: ${runCode}`);
      await patternsLoadedPromise;
    }
    
    // Check if pattern exists
    if (stoppingPatterns[runCode]) {
      console.log(`✅ Found pattern for run code: ${runCode}`);
      return stoppingPatterns[runCode];
    } else {
      console.log(`⚠️ Pattern not found for run code: ${runCode}`);
      console.log(`   Available patterns: ${Object.keys(stoppingPatterns).join(', ')}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error getting stopping pattern for ${runCode}:`, error);
    return null;
  }
};

// Also try to reload patterns when page fully loads (as backup)
if (document.readyState === 'complete') {
  console.log('📄 Document already loaded, patterns should be loading...');
} else {
  window.addEventListener('load', () => {
    console.log('📄 Page fully loaded, patterns loader should be active');
  });
}

// Default fallback stations (if run code not found)
const defaultStations = [
  "Roma Street",
  "Central",
  "Fortitude Valley",
  "Bowen Hills",
  "Windsor",
  "Wilston",
  "Newmarket",
  "Alderley",
  "Enoggera",
  "Gaythorne",
  "Mitchelton",
  "Oxford Park"
];

function validateRunNumber(run) {
  // Must be 4 characters: 1st is [0-9A-Z], 2nd is [0-9A-Z], 3rd is [0-9A-Z], 4th is [0-9]
  const upperRun = run.toUpperCase();
  const pattern = /^[0-9A-Z]{3}[0-9]$/;
  const isValid = pattern.test(upperRun);
  
  console.log(`Validating run: "${run}" -> "${upperRun}"`);
  console.log(`Pattern test result:`, isValid);
  console.log(`Length: ${upperRun.length}, Expected: 4`);
  
  // Also allow our specific test patterns
  const knownPatterns = ['T6X1', 'D6X1', '16X1', 'J6X1', 'U6X1'];
  const isKnownPattern = knownPatterns.includes(upperRun);
  
  console.log(`Is known pattern:`, isKnownPattern);
  
  return isValid || isKnownPattern;
}

// ==================== GTFS Patterns Loading System ====================
// Load extracted GTFS patterns from JSON file for instant route availability
let gtfsPatterns = null;
const loadRouteTopology = async () => {
  try {
    const response = await fetch('/route-topology.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const topology = await response.json();
    routeTopologyPaths = Array.isArray(topology.paths) ? topology.paths : [];
    console.log(`✅ Loaded ${routeTopologyPaths.length} route infrastructure paths`);
    if (typeof updateRouteDisplay === 'function') updateRouteDisplay();
  } catch (error) {
    routeTopologyPaths = [];
    console.warn('Route infrastructure data unavailable:', error.message);
  }
};

loadRouteTopology();

const loadGTFSPatterns = async () => {
  try {
    console.log('🔄 Starting GTFS data load from SEQ_GTFS files...');
    
    // Load from SEQ_GTFS CSV files
    const gtfsData = await loadSEQGTFSFromFiles();
    
    if (!gtfsData) {
      console.log('❌ Failed to load SEQ_GTFS files - using hardcoded patterns only');
      return null;
    }
    
    console.log(`✅ Successfully loaded GTFS data from SEQ_GTFS files`);
    console.log(`✅ Loaded ${gtfsData.totalRoutes} routes and ${Object.keys(gtfsData.tripIdMap).length} trip mappings`);
    console.log(`📊 Load completed at ${gtfsData.loadTime}`);
    
    return gtfsData;
  } catch (error) {
    console.error('❌ Error loading GTFS patterns:', error.message);
    return null;
  }
};

// Merge GTFS patterns with hardcoded stoppingPatterns
const mergeGTFSPatterns = (gtfsData) => {
  if (!gtfsData || !gtfsData.routes) return;
  
  let mergedCount = 0;
  for (const [routeId, routeData] of Object.entries(gtfsData.routes)) {
    // Skip if route already has hardcoded patterns (hardcoded takes precedence)
    if (stoppingPatterns[routeId]) {
      continue;
    }
    
    // For each pattern in the route, create a simplified station list
    const patterns = Array.isArray(routeData.patterns) ? routeData.patterns : [];
    if (patterns.length > 0) {
      // Use the first pattern as a representative
      const mainPattern = patterns[0];
      if (mainPattern.stops && Array.isArray(mainPattern.stops)) {
        // Convert GTFS stop format to stoppingPatterns format
        stoppingPatterns[routeId] = mainPattern.stops.map(station => {
          const normalizedName = normalizeStationName(station.name);
          return {
            name: normalizedName,
            code: station.code,
            announcements: {
              mindTheGap: {
                text: normalizedName,
                audio: ''
              }
            }
          };
        });
        mergedCount++;
      }
    }
  }
  
  console.log(`📦 Merged ${mergedCount} GTFS routes into stoppingPatterns`);
};

// ==================== Audio Preloading System ====================
const audioCache = new Map();
let totalAudioFiles = 0;
let loadedAudioFiles = 0;

async function checkRequiredAssets() {
  try {
    const response = await fetch('/api/assets-status');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const status = await response.json();
    const loadingText = document.getElementById('loading-text');
    const updateSettings = typeof require === 'function'
      ? await require('electron').ipcRenderer.invoke('get-update-settings')
      : { automaticAssets: true, automaticGTFS: true };
    const assetIPC = window.electron?.ensureAudioAssets
      ? window.electron
      : (typeof require === 'function'
        ? {
          isOnline: () => require('electron').ipcRenderer.invoke('is-online'),
            ensureAudioAssets: () => require('electron').ipcRenderer.invoke('ensure-audio-assets'),
          onAudioAssetsProgress: (callback) => require('electron').ipcRenderer.on('audio-assets-progress', (event, data) => callback(data)),
          checkAudioAssets: () => require('electron').ipcRenderer.invoke('check-audio-assets'),
          ensureGTFSData: () => require('electron').ipcRenderer.invoke('ensure-gtfs-data'),
          updateGTFS: () => require('electron').ipcRenderer.invoke('update-gtfs'),
          onGTFSUpdateProgress: (callback) => require('electron').ipcRenderer.on('gtfs-update-progress', (event, data) => callback(data))
          }
        : null);

    const isOnline = assetIPC?.isOnline
      ? await assetIPC.isOnline()
      : navigator.onLine !== false;
    if (!isOnline) {
      console.log('Offline: skipping asset and GTFS update checks.');
      return status;
    }

    if (updateSettings.automaticAssets && status.missing?.includes('QR_PIDS_AudioFiles') && assetIPC?.ensureAudioAssets) {
      assetIPC.onAudioAssetsProgress?.(({ status: progressStatus, percent }) => {
        if (loadingText) loadingText.textContent = `Installing Assets... ${percent}%`;
        console.log(progressStatus);
      });
      const assetResult = await assetIPC.ensureAudioAssets();
      if (!assetResult.success) throw new Error(assetResult.message);
    }

    if (updateSettings.automaticGTFS && assetIPC?.ensureGTFSData) {
      loadingText.textContent = 'Checking GTFS data...';
      assetIPC.onGTFSUpdateProgress?.(({ status: progressStatus, percent }) => {
        if (loadingText) loadingText.textContent = `Installing GTFS data... ${percent}%`;
        console.log(progressStatus);
      });
      const gtfsResult = await assetIPC.ensureGTFSData();
      if (!gtfsResult.success) throw new Error(gtfsResult.message);
    }

    const refreshedResponse = await fetch('/api/assets-status');
    const refreshedStatus = await refreshedResponse.json();
    if (updateSettings.automaticAssets && refreshedStatus.ready && assetIPC?.checkAudioAssets) {
      const assetUpdate = await assetIPC.checkAudioAssets();
      if (assetUpdate.success && assetUpdate.updateAvailable && !window.qvasStartupBypassed) {
        const prompt = document.getElementById('asset-update-prompt');
        const downloadButton = document.getElementById('asset-update-download-btn');
        const continueButton = document.getElementById('asset-update-continue-btn');
        if (prompt && downloadButton && continueButton) {
          prompt.classList.remove('hide');
          const shouldDownload = await new Promise((resolve) => {
            let settled = false;
            const finish = (download) => {
              if (settled) return;
              settled = true;
              prompt.classList.add('hide');
              downloadButton.removeEventListener('click', downloadHandler);
              continueButton.removeEventListener('click', continueHandler);
              window.removeEventListener('qvas-startup-bypass', bypassHandler);
              resolve(download);
            };
            const downloadHandler = () => finish(true);
            const continueHandler = () => finish(false);
            const bypassHandler = () => finish(false);
            downloadButton.addEventListener('click', downloadHandler);
            continueButton.addEventListener('click', continueHandler);
            window.addEventListener('qvas-startup-bypass', bypassHandler);
          });

          if (shouldDownload) {
            loadingText.textContent = 'Installing Assets... 0%';
            assetIPC.onAudioAssetsProgress?.(({ status: progressStatus, percent }) => {
              loadingText.textContent = `Installing Assets... ${percent}%`;
              console.log(progressStatus);
            });
            const result = await assetIPC.ensureAudioAssets();
            if (!result.success) throw new Error(result.message);
          }
        }
      }
    }

    if (!refreshedStatus.ready && loadingText) {
      loadingText.textContent = 'Installing Assets... 0%';
      console.warn(`Required assets missing: ${refreshedStatus.missing.join(', ')}`);

      if (updateSettings.automaticAssets && refreshedStatus.missing.includes('QR_PIDS_AudioFiles') && assetIPC?.ensureAudioAssets) {
        let lastPercent = 0;
        let progressHeartbeat = 0;
        const progressTimer = setInterval(() => {
          progressHeartbeat = Math.min(progressHeartbeat + 1, 87);
          loadingText.textContent = `Installing Assets... ${Math.max(lastPercent, progressHeartbeat)}%`;
        }, 2000);
        try {
          const result = await assetIPC.ensureAudioAssets();
          if (!result.success) throw new Error(result.message);
          loadingText.textContent = 'Installing Assets... 100%';
        } finally {
          clearInterval(progressTimer);
        }
      }

      if (updateSettings.automaticGTFS && refreshedStatus.missing.includes('SEQ_GTFS') && assetIPC?.updateGTFS) {
        loadingText.textContent = 'Installing GTFS data... 0%';
        assetIPC.onGTFSUpdateProgress?.(({ status: progressStatus, percent }) => {
          loadingText.textContent = `Installing GTFS data... ${percent}%`;
          console.log(progressStatus);
        });
        const result = await assetIPC.updateGTFS();
        if (!result.success) throw new Error(result.message);
      }

      const finalResponse = await fetch('/api/assets-status');
      return await finalResponse.json();
    }
    return status;
  } catch (error) {
    console.error('Unable to check required assets:', error);
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = 'Installing Assets...';
    return { ready: false, missing: ['asset status unavailable'] };
  }
}

async function preloadAllAudioFiles() {
  // Startup screens removed - keyboard is shown immediately on load
  // Audio files will load on-demand when needed
  console.log('ℹ️ Startup screens disabled - showing keyboard immediately');
}

// Start preloading when page loads
window.addEventListener('load', preloadAllAudioFiles);

document.addEventListener("DOMContentLoaded", function () {
  const requiredAssetsPromise = checkRequiredAssets();
  
  try {
    console.log('✅ DOMContentLoaded fired - app.js initializing');
    
    runInput = document.getElementById("run-number");
    const setRunBtn = document.getElementById("set-run");
    const runError = document.getElementById("run-error");
    const runNumberDisplay = document.getElementById("run-number-display");
    const stationList = document.getElementById("station-list");
    const stationListContainer = document.getElementById("station-list-container");
    const dateDisplay = document.getElementById("date-display");
    const timeDisplay = document.getElementById("time-display");
    const pidDisplay = document.getElementById("pid-display");
    const diDisplay = document.getElementById("di-display");
  const doorCycleDisplay = document.getElementById("door-cycle-display");
  const headerRow2 = document.querySelector(".header-row-2");
  const systemReadyScreen = document.getElementById("system-ready-screen");
  const leftPanel = document.getElementById("left-panel");
  const initialFooter = document.getElementById("initial-footer");

  function setPidDiIndicatorVisible(visible) {
    if (headerRow2) headerRow2.classList.toggle('hide', !visible);
  }

  function setPidDiIndicatorTextVisible(visible) {
    if (headerRow2) headerRow2.classList.toggle('hide-indicator-text', !visible);
  }
  
  // Toggle DoorCycle visibility when header-row-2 is clicked
  if (headerRow2) {
    headerRow2.addEventListener('click', function(e) {
      // Only toggle if clicking on the header-row-2 itself, not on specific content
      headerRow2.classList.toggle('hide-door-cycle');
      console.log('🔄 DoorCycle visibility toggled:', headerRow2.classList.contains('hide-door-cycle') ? 'hidden' : 'shown');
    });
  }
  let currentStations = [];
  let selectedStation = null;
  let currentDestination = null;

  function getDiDisplayDestination(destination) {
    const normalizedDestination = String(destination || '').replace(/\s+station$/i, '').trim().toLowerCase();
    if (normalizedDestination === 'varsity lakes') return 'Gold Coast';
    if (normalizedDestination === 'kippa-ring') return 'Redcliffe';
    return destination;
  }

  const displayWindow = {
    closed: false,
    postMessage() {}
  };
  let destinationWindow = null;
  let doorsCycled = false; // Track if doors have been cycled (unlock then lock)
  let cctvOnDoorUnlockEnabled = false; // Toggle for CCTV on door unlock feature
  let cctvDisplayTimer = null; // Timer for CCTV display delay
  let cctvAutoOpenTimer = null;
  
  // Closest Station Feature
  let manualClosestStationMode = false; // Toggle for manual closest station selection
  let closestStationIndex = 0; // Index of current closest station (default first station)
  let closestStationAutoChangeAt = 0;
  let stationSelectionConfirmed = false;

  // Station Code Mapping
  const stationCodeMap = {
    'AJN': 'Airport Junction', 'EGJ': 'Eagle Junction', 'AIN': 'Albion', 'EIP': 'East Ipswich',
    'ADY': 'Alderley', 'EBV': 'Ebbw Vale', 'ATI': 'Altandi', 'EDL': 'Edens Landing',
    'ACO': 'Ascot', 'AHF': 'Auchenflower', 'EMH': 'Elimbah', 'EMY': 'Elimbah Yard',
    'BDS': 'Bald Hills', 'EGE': 'Ellen Grove', 'BQO': 'Banoon', 'EGG': 'Enoggera',
    'BDT': 'Brisbane Domestic Airport', 'EUD': 'Eudlo', 'BQY': 'Banyo', 'EUM': 'Eumundi',
    'BYY': 'Banyo Yard', 'EXH': 'Exhibition', 'BNH': 'Beenleigh', 'BNY': 'Beenleigh Yard',
    'BNT': 'Beenleigh Middle Road', 'FFI': 'Fairfield', 'BEB': 'Beerburrum', 'FYG': 'Ferny Grove',
    'BWH': 'Beerwah', 'BTI': 'Bethania', 'BRC': 'Fortitude Valley', 'BHA': 'Bindha',
    'BDE': 'Birkdale', 'BZL': 'Boondall', 'BOV': 'Booval', 'GAI': 'Gailes',
    'BHI': 'Bowen Hills', 'GAO': 'Gaythorne', 'BOX': 'Box Flat', 'GEB': 'Geebung',
    'BPR': 'Bray Park', 'BDX': 'Bundamba', 'GSS': 'Glass House Mtns', 'GDQ': 'Goodna',
    'BRD': 'Buranda', 'GVQ': 'Graceville', 'BPY': 'Burpengary', 'GOQ': 'Grovely',
    'GYN': 'Gympie North', 'CAB': 'Caboolture', 'CNQ': 'Cannon Hill', 'HLN': 'Helensvale',
    'CDE': 'Carseldine', 'HMM': 'Hemmant', 'BNC': 'Central', 'HDR': 'Hendra',
    'CMZ': 'Chelmer', 'HVW': 'Holmview', 'CPM': 'Clapham', 'CYF': 'Clayfield',
    'CVN': 'Cleveland', 'IDP': 'Indooroopilly', 'CXM': 'Coomera', 'BIT': 'International Terminal',
    'CEP': 'Coopers Plains', 'IPS': 'Ipswich', 'COZ': 'Cooran', 'IPW': 'Ipswich Workshops',
    'COO': 'Cooroy', 'CRO': 'Coorparoo', 'CQD': 'Corinda', 'KGR': 'Kallangur',
    'KRA': 'Karrabin', 'DKB': 'Dakabin', 'KEP': 'Keperra', 'DAR': 'Darra',
    'KGT': 'Kingston', 'DEG': 'Deagon', 'DIR': 'Dinmore', 'KPR': 'Kippa-Ring',
    'DBN': 'Doomben', 'KRY': 'Kuraby', 'DUP': 'Dutton Park', 'LSH': 'Landsborough',
    'RDK': 'Redbank', 'LWO': 'Lawnton', 'LDM': 'Lindum', 'LGL': 'Loganlea',
    'RHD': 'Richlands', 'LOT': 'Lota', 'RVV': 'Riverview', 'ROB': 'Robina',
    'RKE': 'Rocklea', 'MGH': 'Mango Hill', 'MGE': 'Mango Hill East', 'RST': 'Roma Street',
    'MNY': 'Manly', 'RSW': 'Rosewood', 'RWL': 'Rothwell', 'SLY': 'Salisbury',
    'MYD': 'Old Mayne Yard', 'SGE': 'Sandgate', 'YNY': 'Mayne Yard North', 'SHW': 'Sherwood',
    'MTZ': 'Milton', 'SHC': 'Shorncliffe', 'MHQ': 'Mitchelton', 'SBA': 'South Bank',
    'MOH': 'Mooloolah', 'SBE': 'South Brisbane', 'MQK': 'Moorooka', 'SFD': 'Springfield',
    'MYE': 'Morayfield', 'SFC': 'Springfield Central', 'MGS': 'Morningside', 'SPN': 'Strathpine',
    'MJE': 'Murarrie', 'SYK': 'Sunnybank', 'MRD': 'Murrumba Downs', 'SSN': 'Sunshine',
    'NBS': 'Nambour Yard', 'TIQ': 'Taringa', 'NRB': 'Narangba', 'TNY': 'Tennyson',
    'NRG': 'Nerang', 'TAO': 'Thagoona', 'NWM': 'Newmarket', 'THS': 'Thomas Street',
    'NPR': 'Norman Park', 'TNS': 'Thorneside', 'NBY': 'Normanby', 'TBU': 'Toombul',
    'NCW': 'Normanby Car Wash', 'TWG': 'Toowong', 'NBD': 'North Boondall', 'TRA': 'Traveston',
    'NTG': 'Northgate', 'TDP': 'Trinder Park', 'NUD': 'Nudgee', 'VYS': 'Varsity Lakes',
    'NND': 'Nundah', 'VGI': 'Virginia', 'ORM': 'Ormeau', 'WAC': 'Wacol',
    'ORO': 'Ormiston', 'WOQ': 'Walloon', 'OXP': 'Oxford Park', 'WPT': 'Wellington Point',
    'OXL': 'Oxley', 'PAL': 'Palmwoods', 'PKR': 'Park Road', 'PET': 'Petrie',
    'WLQ': 'Wilston', 'WID': 'Windsor', 'WOI': 'Woodridge'
  };

  // TSW6 automation mode (distance-based announcements)
  const TSW_POLL_INTERVAL_MS = 500;
  const GPS_POLL_INTERVAL_MS = 100;
  const GPS_MAX_ACCURACY_METERS = 1000;
  const GPS_STALE_AFTER_MS = 15000;
  const GPS_UNAVAILABLE_GRACE_MS = 15000;
  const GPS_ACQUIRED_AUDIO_PATH = 'QR_PIDS_AudioFiles/GPS.mp3';
  const GPS_LOSS_AUDIO_PATH = 'QR_PIDS_AudioFiles/NO_GPS.MP3';
  function loadGPSThreshold(storageKey, fallback) {
    const storedValue = localStorage.getItem(storageKey);
    const threshold = Number(storedValue);
    return storedValue !== null && Number.isInteger(threshold) && threshold >= 1 && threshold <= 10000
      ? threshold
      : fallback;
  }
  let TSW_TNS_TRIGGER_METERS = loadGPSThreshold('gpsTnsTriggerMeters', 320);
  let TSW_NAA_TRIGGER_METERS = loadGPSThreshold('gpsNaaTriggerMeters', 280);
  let TSW_MTG_TRIGGER_METERS = loadGPSThreshold('gpsMtgTriggerMeters', 100);
  const TSW_MTG_MAX_SPEED_KMH = 5;
  let TSW_MTG_MAX_MOVEMENT_METERS = loadGPSThreshold('gpsMtgMovementMeters', 10);
  const TSW_MTG_DWELL_MS = 2000;
  const TSW_RETRY_COOLDOWN_MS = 15000;
  let tswPollTimer = null;
  let gpsPollTimer = null;
  let gpsRequestInFlight = false;
  let gpsAvailable = false;
  let gpsLastUpdateAt = 0;
  let gpsFailureStartedAt = 0;
  let gpsModeEnabled = localStorage.getItem('gpsModeEnabled') !== 'false';
  const savedGPSSourceMode = localStorage.getItem('gpsSourceMode');
  let gpsSourceMode = ['phone', 'this-pc'].includes(savedGPSSourceMode) ? savedGPSSourceMode : 'phone';
  let tswLiveModeActive = false;
  let tswLastSuccessfulPollAt = 0;
  let tswUnavailableUntil = 0;
  let tswTargetStationIndex = -1;
  let tswPassedStationIndex = -1;
  let tswStartStationIndex = -1;
  let tswStartStationPhaseActive = false;
  let tswTnsTriggeredIndices = new Set();
  let tswArrivalTriggeredIndices = new Set();
  let tswMtgTriggeredIndices = new Set();
  let tswMtgDwellStartedAt = 0;
  let tswMtgStationaryPosition = null;
  let tswMtgDwellStationIndex = -1;
  let tswMtgMovementViolationCount = 0;
  let mtgTestTimer = null;
  let tswLastNearestStationIndex = -1;
  let tswLastPosition = null;
  let tswPositionSource = null;

  function pollGPSPosition() {
    if (!gpsModeEnabled) return;
    if (gpsSourceMode !== 'this-pc') return;
    if (gpsRequestInFlight) return;
    gpsRequestInFlight = true;
    console.log('[GPS] Requesting Windows location');
    require('electron').ipcRenderer.invoke('get-windows-location')
      .then((location) => {
        if (!location.success) {
          console.error(`[GPS] Windows location failed: ${location.message || 'Unknown error'}`);
          setGPSUnavailable();
          return;
        }
        console.log(`[GPS] Windows location received: ${location.latitude}, ${location.longitude} (${location.accuracy} m)`);
        processGPSPosition({
          coords: {
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            accuracy: Number(location.accuracy),
            speed: Number.isFinite(Number(location.speed)) ? Number(location.speed) : null
          },
          timestamp: Date.now(),
          source: 'This PC'
        });
      })
      .catch((error) => {
        console.error(`[GPS] Location IPC failed: ${error.message}`);
        setGPSUnavailable();
      })
      .finally(() => {
        gpsRequestInFlight = false;
      });
  }

  function updateStatusGPSDisplay() {
    const naaDistanceElement = document.getElementById('status-naa-distance');
    const tnsDistanceElement = document.getElementById('status-tns-distance');
    const mtgDistanceElement = document.getElementById('status-mtg-distance');
    const mtgCountdownElement = document.getElementById('status-mtg-countdown');
    const gpsStateElement = document.getElementById('status-gps-state');
    const gpsSourceElement = document.getElementById('status-gps-source');
    const gpsLatitudeElement = document.getElementById('status-gps-latitude');
    const gpsLongitudeElement = document.getElementById('status-gps-longitude');
    const gpsSpeedElement = document.getElementById('status-gps-speed');
    const gpsAccuracyElement = document.getElementById('status-gps-accuracy');
    const closestStationElement = document.getElementById('status-closest-station');
    const closestStationRow = document.getElementById('status-closest-station-row');
    const currentStationElement = document.getElementById('status-current-station');
    const targetStationElement = document.getElementById('status-target-station');
    const passedStationElement = document.getElementById('status-passed-station');
    const triggerStateElement = document.getElementById('status-trigger-state');
    const coordinatesBody = document.getElementById('status-station-coordinates-body');

    if (gpsStateElement) {
      gpsStateElement.textContent = gpsAvailable ? 'Available' : 'Unavailable';
      gpsStateElement.classList.toggle('ok', gpsAvailable);
    }
    if (gpsSourceElement) gpsSourceElement.textContent = tswPositionSource || 'Unavailable';
    if (gpsLatitudeElement) gpsLatitudeElement.textContent = tswLastPosition ? tswLastPosition.latitude.toFixed(6) : 'Unavailable';
    if (gpsLongitudeElement) gpsLongitudeElement.textContent = tswLastPosition ? tswLastPosition.longitude.toFixed(6) : 'Unavailable';
    if (gpsSpeedElement) {
      gpsSpeedElement.textContent = tswLastPosition && tswLastPosition.speedKmh !== null
        ? `${tswLastPosition.speedKmh.toFixed(1)} km/h`
        : 'Unavailable';
    }
    if (gpsAccuracyElement) {
      gpsAccuracyElement.textContent = tswLastPosition && tswLastPosition.accuracy !== null
        ? `${Math.round(tswLastPosition.accuracy)} m`
        : 'Unavailable';
    }
    if (closestStationElement) {
      const closestStation = getClosestStationToPosition();
      if (closestStationRow) closestStationRow.hidden = !(gpsAvailable && closestStation);
      closestStationElement.textContent = closestStation
        ? `${closestStation.name} (${Math.round(closestStation.distance)} m)`
        : 'Unavailable';
    }
    updateClosestStationTag();
    if (currentStationElement) {
      currentStationElement.textContent = selectedStation ? normalizeStationName(selectedStation.name) : 'Unavailable';
    }

    const targetIndex = stationSelectionConfirmed ? tswTargetStationIndex : closestStationIndex;
    const targetStation = targetIndex >= 0 && currentStations[targetIndex] ? currentStations[targetIndex] : null;
    if (targetStationElement) {
      targetStationElement.textContent = targetStation ? normalizeStationName(targetStation.name) : 'Unavailable';
    }
    if (passedStationElement) {
      const passedStation = tswPassedStationIndex >= 0 && currentStations[tswPassedStationIndex]
        ? currentStations[tswPassedStationIndex]
        : null;
      passedStationElement.textContent = passedStation ? normalizeStationName(passedStation.name) : 'None';
    }
    if (triggerStateElement) {
      const stateParts = [];
      if (tswPassedStationIndex >= 0) stateParts.push('passed');
      if (tswArrivalTriggeredIndices.size > 0) stateParts.push(isMtgOnlyRoute(currentRouteFormCode) ? 'TNS' : 'NAA');
      if (tswMtgTriggeredIndices.size > 0) stateParts.push('MTG');
      if (tswTnsTriggeredIndices.size > 0) stateParts.push('TNS');
      triggerStateElement.textContent = stateParts.length > 0 ? stateParts.join(' / ') : 'idle';
    }

    if (naaDistanceElement) {
      if (isMtgOnlyRoute(currentRouteFormCode)) {
        naaDistanceElement.textContent = 'Disabled for this route';
        naaDistanceElement.title = '';
      } else if (tswLastPosition && targetStation && Number.isFinite(targetStation.lat) && Number.isFinite(targetStation.lon)) {
        const distanceToStation = haversineDistanceMeters(
          tswLastPosition.latitude,
          tswLastPosition.longitude,
          targetStation.lat,
          targetStation.lon
        );
        const remaining = Math.max(0, Math.ceil(TSW_NAA_TRIGGER_METERS - distanceToStation));
        naaDistanceElement.textContent = distanceToStation <= TSW_NAA_TRIGGER_METERS
          ? 'NAA reached'
          : `${Math.round(distanceToStation - TSW_NAA_TRIGGER_METERS)} m`;
        if (distanceToStation > TSW_NAA_TRIGGER_METERS) {
          naaDistanceElement.title = `Target: ${Math.round(distanceToStation)} m away, NAA at ${TSW_NAA_TRIGGER_METERS} m`;
        }
      } else {
        naaDistanceElement.textContent = 'Awaiting station';
      }
    }

    if (tnsDistanceElement) {
      const passedStation = tswPassedStationIndex >= 0 && currentStations[tswPassedStationIndex]
        ? currentStations[tswPassedStationIndex]
        : null;
      const tnsUsesArrivalThreshold = isMtgOnlyRoute(currentRouteFormCode);
      const tnsReferenceStation = tnsUsesArrivalThreshold ? targetStation : passedStation;
      const tnsThresholdMeters = tnsUsesArrivalThreshold ? TSW_NAA_TRIGGER_METERS : TSW_TNS_TRIGGER_METERS;
      if (tswLastPosition && tnsReferenceStation && Number.isFinite(tnsReferenceStation.lat) && Number.isFinite(tnsReferenceStation.lon)) {
        const departureDistance = haversineDistanceMeters(
          tswLastPosition.latitude,
          tswLastPosition.longitude,
          tnsReferenceStation.lat,
          tnsReferenceStation.lon
        );
        const remaining = Math.max(0, tnsThresholdMeters - departureDistance);
        tnsDistanceElement.textContent = departureDistance >= tnsThresholdMeters
          ? 'TNS due'
          : `${Math.round(remaining)} m`;
      } else {
        tnsDistanceElement.textContent = 'Awaiting departure';
      }
    }

    const mtgStationIndex = stationSelectionConfirmed ? tswTargetStationIndex : closestStationIndex;
    let targetDistance = null;
    if (tswLastPosition && mtgStationIndex >= 0 && currentStations[mtgStationIndex]) {
      const targetStationForMtg = currentStations[mtgStationIndex];
      targetDistance = haversineDistanceMeters(
        tswLastPosition.latitude,
        tswLastPosition.longitude,
        targetStationForMtg.lat,
        targetStationForMtg.lon
      );
    }
    if (mtgDistanceElement) {
      mtgDistanceElement.textContent = targetDistance === null
        ? 'Awaiting GPS position'
        : targetDistance <= TSW_MTG_TRIGGER_METERS
          ? 'MTG zone reached'
          : `${Math.round(targetDistance - TSW_MTG_TRIGGER_METERS)} m`;
    }
    if (mtgCountdownElement) {
      const countdownSeconds = tswMtgDwellStartedAt
        ? Math.max(0, Math.ceil((TSW_MTG_DWELL_MS - (Date.now() - tswMtgDwellStartedAt)) / 1000))
        : Math.ceil(TSW_MTG_DWELL_MS / 1000);
      mtgCountdownElement.textContent = `${countdownSeconds} s`;
      mtgCountdownElement.classList.toggle('ok', countdownSeconds === 0);
    }

    if (coordinatesBody) {
      if (!currentStations || currentStations.length === 0) {
        coordinatesBody.innerHTML = '<tr><td colspan="3">No route loaded</td></tr>';
      } else {
        coordinatesBody.innerHTML = currentStations.map((station) => {
          const latitude = Number.isFinite(station.lat) ? station.lat.toFixed(6) : 'Unavailable';
          const longitude = Number.isFinite(station.lon) ? station.lon.toFixed(6) : 'Unavailable';
          return `<tr><td>${normalizeStationName(station.name)}</td><td>${latitude}</td><td>${longitude}</td></tr>`;
        }).join('');
      }
    }
  }

  setInterval(updateStatusGPSDisplay, 1000);

  function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const earthRadiusMeters = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  function getClosestStationToPosition() {
    if (!tswLastPosition) return null;

    const routeStations = currentStations && currentStations.length > 0
      ? currentStations
      : Object.values(globalGTFSData?.stops || {}).map(stop => ({
          name: normalizeStationName(stop.stop_name),
          lat: Number(stop.stop_lat),
          lon: Number(stop.stop_lon)
        }));
    let closest = null;
    for (const station of routeStations) {
      if (!station || !station.name || !Number.isFinite(station.lat) || !Number.isFinite(station.lon)) continue;
      const distance = haversineDistanceMeters(
        tswLastPosition.latitude,
        tswLastPosition.longitude,
        station.lat,
        station.lon
      );
      if (!closest || distance < closest.distance) {
        closest = { name: normalizeStationName(station.name), distance };
      }
    }
    return closest;
  }

  function getStationCoordinatesByName(stationName) {
    if (!stationName || !globalGTFSData || !globalGTFSData.stops) {
      return null;
    }

    const normalizedTarget = normalizeStationName(stationName).toLowerCase();
    const coordinateLookupName = normalizedTarget === 'park road' ? 'boggo road' : normalizedTarget;
    const matchingStops = [];
    for (const stop of Object.values(globalGTFSData.stops)) {
      if (!stop || !stop.stop_name) continue;
      const normalizedStopName = normalizeStationName(stop.stop_name).toLowerCase();
      if (normalizedStopName !== coordinateLookupName) continue;

      const lat = Number(stop.stop_lat);
      const lon = Number(stop.stop_lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        matchingStops.push({ lat, lon });
      }
    }

    if (matchingStops.length === 0) return null;
    return {
      lat: matchingStops.reduce((sum, coords) => sum + coords.lat, 0) / matchingStops.length,
      lon: matchingStops.reduce((sum, coords) => sum + coords.lon, 0) / matchingStops.length
    };
  }

  function enrichStationsWithCoordinates(stations) {
    if (!Array.isArray(stations)) return [];

    const boggoRoadStation = stations.find(station =>
      station && normalizeStationName(station.name).toLowerCase() === 'boggo road'
    );
    const boggoRoadStop = boggoRoadStation?.stopId && globalGTFSData?.stops?.[boggoRoadStation.stopId];
    const boggoRoadLatitude = Number(boggoRoadStation?.lat ?? boggoRoadStation?.latitude ?? boggoRoadStop?.stop_lat);
    const boggoRoadLongitude = Number(boggoRoadStation?.lon ?? boggoRoadStation?.longitude ?? boggoRoadStop?.stop_lon);
    const boggoRoadCoordinates = Number.isFinite(boggoRoadLatitude) && Number.isFinite(boggoRoadLongitude)
      ? { lat: boggoRoadLatitude, lon: boggoRoadLongitude }
      : getStationCoordinatesByName('Boggo Road');

    return stations.map((station) => {
      if (!station || !station.name) return station;

      let lat = Number(station.lat ?? station.latitude);
      let lon = Number(station.lon ?? station.longitude);

      if (normalizeStationName(station.name).toLowerCase() === 'park road') {
        lat = boggoRoadCoordinates?.lat ?? null;
        lon = boggoRoadCoordinates?.lon ?? null;
      } else if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        const stop = station.stopId && globalGTFSData?.stops?.[station.stopId];
        const stopLat = Number(stop?.stop_lat);
        const stopLon = Number(stop?.stop_lon);
        const coords = Number.isFinite(stopLat) && Number.isFinite(stopLon)
          ? { lat: stopLat, lon: stopLon }
          : getStationCoordinatesByName(station.name);
        if (coords) {
          lat = coords.lat;
          lon = coords.lon;
        }
      }

      return {
        ...station,
        lat: Number.isFinite(lat) ? lat : null,
        lon: Number.isFinite(lon) ? lon : null
      };
    });
  }

  function findNextNonSkippedStationIndex(startIndex) {
    for (let i = startIndex; i < currentStations.length; i++) {
      if (!currentStations[i].skipped) return i;
    }
    return -1;
  }

  function resetTSWAutomationState() {
    tswTargetStationIndex = -1;
    tswPassedStationIndex = -1;
    tswStartStationIndex = -1;
    tswStartStationPhaseActive = false;
    tswTnsTriggeredIndices = new Set();
    tswArrivalTriggeredIndices = new Set();
    tswMtgTriggeredIndices = new Set();
    tswMtgDwellStartedAt = 0;
    tswMtgStationaryPosition = null;
    tswMtgDwellStationIndex = -1;
    tswMtgMovementViolationCount = 0;
    tswLastNearestStationIndex = -1;
    updateStatusGPSDisplay();
    tswLiveModeActive = false;
    tswLastSuccessfulPollAt = 0;
    tswUnavailableUntil = 0;
  }

  function stopTSWAutomation() {
    if (tswPollTimer) {
      clearInterval(tswPollTimer);
      tswPollTimer = null;
    }
    tswLiveModeActive = false;
    if (mtgTestTimer !== null) {
      clearTimeout(mtgTestTimer);
      mtgTestTimer = null;
    }
    updateStatusGPSDisplay();
  }

  function setGPSUnavailable() {
    const now = Date.now();
    if (!gpsFailureStartedAt) gpsFailureStartedAt = now;
    if (now - gpsFailureStartedAt < GPS_UNAVAILABLE_GRACE_MS) return;

    const wasGpsAvailable = gpsAvailable;
    gpsAvailable = false;
    if (wasGpsAvailable) {
      queueStatusAlert(GPS_LOSS_AUDIO_PATH, 'GPS signal lost');
    }
    if (!tswLastPosition || now - tswLastPosition.receivedAt > GPS_STALE_AFTER_MS) {
      tswPositionSource = null;
    }
    updateClosestStationTag();
    updateStatusGPSDisplay();
    if (!stationSelectionConfirmed && currentStations.length > 0) {
      closestStationIndex = 0;
      currentHighlightIndex = 0;
      currentStationPage = 0;
      updateStationDisplayPage();
    }
  }

  function getNextAutomationStationIndex(index) {
    return findNextNonSkippedStationIndex(index + 1);
  }

  function updateGPSStationHighlight(index) {
    if (manualClosestStationMode || index < 0 || index >= currentStations.length) return;

    closestStationIndex = index;
    currentHighlightIndex = index;
    currentStationPage = Math.floor(index / STATION_ITEMS_PER_PAGE);

    const stationItems = document.querySelectorAll('#station-list li');
    stationItems.forEach((item, itemIndex) => {
      item.classList.toggle('selected', itemIndex === index);
      item.classList.toggle('visible', itemIndex >= currentStationPage * STATION_ITEMS_PER_PAGE && itemIndex < (currentStationPage + 1) * STATION_ITEMS_PER_PAGE);
    });
    updateClosestStationTag();
  }

  function processGPSPosition(position) {
    if (!gpsModeEnabled) return;
    const accuracy = Number(position.coords?.accuracy);
    if (Number.isFinite(accuracy) && accuracy > GPS_MAX_ACCURACY_METERS) return;

    const latitude = Number(position.coords?.latitude);
    const longitude = Number(position.coords?.longitude);
    const timestamp = Number(position.timestamp) || Date.now();
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const rawSpeedMps = position.coords?.speed;
    const reportedSpeedMps = Number(rawSpeedMps);
    let speedKmh = rawSpeedMps !== null && rawSpeedMps !== undefined && Number.isFinite(reportedSpeedMps) && reportedSpeedMps >= 0
      ? reportedSpeedMps * 3.6
      : null;
    if (speedKmh === null && tswLastPosition) {
      const elapsedSeconds = (timestamp - tswLastPosition.timestamp) / 1000;
      if (elapsedSeconds > 0) {
        speedKmh = haversineDistanceMeters(latitude, longitude, tswLastPosition.latitude, tswLastPosition.longitude) / elapsedSeconds * 3.6;
      }
    }
    tswLastPosition = {
      latitude,
      longitude,
      timestamp,
      receivedAt: Date.now(),
      speedKmh,
      accuracy: Number.isFinite(accuracy) ? accuracy : null
    };

    const isMtgAnnouncement = currentAnnouncementType === 'MTG' || currentAnnouncementType === 'mindTheGap';
    if (speedKmh > 10 && isMtgAnnouncement && pidDisplay && pidDisplay.textContent !== '-') {
      pidDisplay.textContent = '-';
      queuedDvaSelection = null;
      updateAppState({ pid: '-' });
      if (displayWindow && !displayWindow.closed) {
        displayWindow.postMessage({ type: 'STOP' }, '*');
      }
    }

    const wasGpsUnavailable = !gpsAvailable;
    gpsAvailable = true;
    gpsLastUpdateAt = Date.now();
    gpsFailureStartedAt = 0;
    tswLiveModeActive = true;
    tswLastSuccessfulPollAt = Date.now();
    tswPositionSource = position.source || 'Phone GPS';
    if (wasGpsUnavailable) {
      queueStatusAlert(GPS_ACQUIRED_AUDIO_PATH, 'GPS signal acquired');
    }
    updateClosestStationTag();
    updateStatusGPSDisplay();
    const stationItems = currentStations
      .map((station, index) => ({ station, index }))
      .filter(item => Number.isFinite(item.station.lat) && Number.isFinite(item.station.lon));
    if (stationItems.length === 0) return;

    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const item of stationItems) {
      const distance = haversineDistanceMeters(latitude, longitude, item.station.lat, item.station.lon);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = item.index;
      }
    }
    if (nearestIndex < 0) return;

    const canAutoChangeClosestStation = Date.now() >= closestStationAutoChangeAt;
    if (!manualClosestStationMode) {
      closestStationIndex = nearestIndex;
      updateClosestStationTag();
    }
    if (!stationSelectionConfirmed) {
      if (canAutoChangeClosestStation) updateGPSStationHighlight(nearestIndex);
      highlightStation(nearestIndex);
      tswTargetStationIndex = nearestIndex;
    } else {
      const currentSpeedKmh = tswLastPosition.speedKmh;
      if (currentSpeedKmh === null || currentSpeedKmh <= 10) {
        tswTargetStationIndex = nearestIndex;
      }
    }

    const targetIndex = tswTargetStationIndex;
    const target = currentStations[targetIndex];
    if (!target || !Number.isFinite(target.lat) || !Number.isFinite(target.lon)) return;
    const targetDistance = haversineDistanceMeters(latitude, longitude, target.lat, target.lon);

    // A two-second GPS interval can skip the 150 m fix. Only start the post-departure
    // TNS countdown once the train is actually 200 m clear of the departed station.
    if (stationSelectionConfirmed && tswLastNearestStationIndex >= 0 && nearestIndex > tswLastNearestStationIndex) {
      const crossedStationIndex = Math.min(nearestIndex - 1, currentStations.length - 1);
      if (crossedStationIndex >= 0 && crossedStationIndex <= targetIndex) {
        const crossedStation = currentStations[crossedStationIndex];
        const crossedStationDistance = crossedStation && Number.isFinite(crossedStation.lat) && Number.isFinite(crossedStation.lon)
          ? haversineDistanceMeters(latitude, longitude, crossedStation.lat, crossedStation.lon)
          : null;

        if (crossedStationDistance !== null && crossedStationDistance >= TSW_TNS_TRIGGER_METERS) {
          tswPassedStationIndex = crossedStationIndex;
        }
      }
    }
    tswLastNearestStationIndex = nearestIndex;

    const selectedStationIndex = stationSelectionConfirmed && selectedStation
      ? currentStations.findIndex((station) => normalizeStationName(station.name) === normalizeStationName(selectedStation.name))
      : -1;

    const currentSpeedKmh = tswLastPosition.speedKmh;
    const startStation = tswStartStationIndex >= 0 ? currentStations[tswStartStationIndex] : null;
    const startStationDistance = startStation && Number.isFinite(startStation.lat) && Number.isFinite(startStation.lon)
      ? haversineDistanceMeters(latitude, longitude, startStation.lat, startStation.lon)
      : null;
    if (tswStartStationPhaseActive
      && currentSpeedKmh !== null
      && currentSpeedKmh > 10
      && startStationDistance !== null
      && startStationDistance >= TSW_TNS_TRIGGER_METERS) {
      tswStartStationPhaseActive = false;
    }

    // The station is only considered passed once the train has actually moved
    // beyond it, which keeps the TNS transition aligned with the real geometry.
    if (stationSelectionConfirmed
      && !tswStartStationPhaseActive
      && targetDistance <= TSW_NAA_TRIGGER_METERS
      && !tswArrivalTriggeredIndices.has(targetIndex)) {
      tswArrivalTriggeredIndices.add(targetIndex);
      if (isMtgOnlyRoute(currentRouteFormCode)) {
        selectStationForAutomation(targetIndex, 'nextStation');
        playNextStation();
      } else {
        selectStationForAutomation(targetIndex, 'arrival');
        playArrivalAnnouncement();
      }
    }

    const fallbackMtgStationIndex = stationSelectionConfirmed ? targetIndex : nearestIndex;
    const mtgStationIndex = stationSelectionConfirmed && selectedStationIndex >= 0
      ? selectedStationIndex
      : fallbackMtgStationIndex;
    const mtgStation = currentStations[mtgStationIndex];
    const mtgDistance = mtgStation && Number.isFinite(mtgStation.lat) && Number.isFinite(mtgStation.lon)
      ? haversineDistanceMeters(latitude, longitude, mtgStation.lat, mtgStation.lon)
      : null;

    const isStationaryEnoughForMtg = currentSpeedKmh !== null && currentSpeedKmh < TSW_MTG_MAX_SPEED_KMH;
    if (stationSelectionConfirmed
      && mtgDistance !== null
      && mtgDistance <= TSW_MTG_TRIGGER_METERS
      && isStationaryEnoughForMtg) {
      if (tswMtgDwellStationIndex !== mtgStationIndex) {
        tswMtgDwellStationIndex = mtgStationIndex;
        tswMtgStationaryPosition = { latitude, longitude };
        tswMtgDwellStartedAt = Date.now();
        tswMtgMovementViolationCount = 0;
      } else if (!tswMtgStationaryPosition) {
        tswMtgStationaryPosition = { latitude, longitude };
        tswMtgDwellStartedAt = Date.now();
        tswMtgMovementViolationCount = 0;
      } else if (haversineDistanceMeters(
        latitude,
        longitude,
        tswMtgStationaryPosition.latitude,
        tswMtgStationaryPosition.longitude
      ) > TSW_MTG_MAX_MOVEMENT_METERS) {
        tswMtgMovementViolationCount += 1;
        if (tswMtgMovementViolationCount >= 2) {
          tswMtgStationaryPosition = { latitude, longitude };
          tswMtgDwellStartedAt = Date.now();
          tswMtgMovementViolationCount = 0;
        }
      } else {
        tswMtgMovementViolationCount = 0;
      }
      if (!tswMtgDwellStartedAt) tswMtgDwellStartedAt = Date.now();
      if (Date.now() - tswMtgDwellStartedAt >= TSW_MTG_DWELL_MS && !tswMtgTriggeredIndices.has(mtgStationIndex)) {
        tswMtgTriggeredIndices.add(mtgStationIndex);
        selectStationForAutomation(mtgStationIndex, 'mindTheGap');
        playMindTheGap(true);
      }
    } else {
      tswMtgDwellStartedAt = 0;
      tswMtgStationaryPosition = null;
      tswMtgDwellStationIndex = -1;
      tswMtgMovementViolationCount = 0;
    }

    const stationHasDeparted = currentSpeedKmh !== null && currentSpeedKmh > 10;
    if (stationHasDeparted) {
      if (selectedStationIndex >= 0 && isFirstStation(selectedStation)) {
        tswPassedStationIndex = selectedStationIndex;
      }
      if (tswMtgTriggeredIndices.has(mtgStationIndex)) {
        tswPassedStationIndex = mtgStationIndex;
        tswMtgTriggeredIndices.delete(mtgStationIndex);
      }
    }

    const passedStation = tswPassedStationIndex >= 0 ? currentStations[tswPassedStationIndex] : null;
    const passedStationDistance = passedStation && Number.isFinite(passedStation.lat) && Number.isFinite(passedStation.lon)
      ? haversineDistanceMeters(latitude, longitude, passedStation.lat, passedStation.lon)
      : null;
    if (stationSelectionConfirmed
      && !tswStartStationPhaseActive
      && passedStationDistance !== null
      && passedStationDistance >= TSW_TNS_TRIGGER_METERS
      && !tswTnsTriggeredIndices.has(tswPassedStationIndex)) {
      const passedStationIndex = tswPassedStationIndex;
      const nextIndex = getNextAutomationStationIndex(passedStationIndex);
      tswTnsTriggeredIndices.add(passedStationIndex);
      tswPassedStationIndex = -1;
      tswMtgDwellStartedAt = 0;
      tswMtgStationaryPosition = null;
      tswMtgDwellStationIndex = -1;
      tswMtgMovementViolationCount = 0;
      if (nextIndex >= 0) {
        // Reset the current station's NAA/MTG threshold state before engaging the
        // next station, so the next station starts with a fresh trigger window.
        tswArrivalTriggeredIndices.clear();
        tswMtgTriggeredIndices.clear();
        tswTargetStationIndex = nextIndex;
        const skipStartStationTns = passedStationIndex === tswStartStationIndex;
        const skipFirstStationTns = passedStationIndex === selectedStationIndex && isFirstStation(selectedStation);
        if (!skipStartStationTns && !skipFirstStationTns) {
          selectStationForAutomation(nextIndex, 'nextStation');
          if (!isMtgOnlyRoute(currentRouteFormCode)) playNextStation();
        }
      } else {
        tswTargetStationIndex = -1;
      }
    }
  }

  function startGPSTracking() {
    if (!gpsModeEnabled || gpsSourceMode !== 'this-pc') return;
    if (!navigator.geolocation) {
      setGPSUnavailable();
      return;
    }
    pollGPSPosition();
    gpsPollTimer = setInterval(pollGPSPosition, GPS_POLL_INTERVAL_MS);
  }

  function setGPSMode(enabled) {
    gpsModeEnabled = enabled;
    localStorage.setItem('gpsModeEnabled', String(enabled));
    syncGlobalShortcutsWithGPSMode();
    if (!enabled && gpsPollTimer !== null) {
      clearInterval(gpsPollTimer);
      gpsPollTimer = null;
    }
    if (!enabled) {
      gpsAvailable = false;
      gpsFailureStartedAt = 0;
      gpsLastUpdateAt = 0;
      tswLastPosition = null;
      tswPositionSource = null;
      resetTSWAutomationState();
    }
    if (enabled && gpsSourceMode === 'this-pc') startGPSTracking();
    updateStatusGPSDisplay();
  }

  function syncGlobalShortcutsWithGPSMode() {
    if (typeof require === 'undefined') return;
    try {
      require('electron').ipcRenderer.send('set-gps-mode', gpsModeEnabled);
    } catch (error) {
      console.warn('Unable to sync GPS Mode with global shortcuts:', error.message);
    }
  }

  syncGlobalShortcutsWithGPSMode();

  function setGPSSourceMode(source) {
    gpsSourceMode = ['phone', 'this-pc'].includes(source) ? source : 'phone';
    console.log(`[GPS] Source changed to ${gpsSourceMode}`);
    localStorage.setItem('gpsSourceMode', gpsSourceMode);
    if (gpsPollTimer !== null) {
      clearInterval(gpsPollTimer);
      gpsPollTimer = null;
    }
    gpsAvailable = false;
    gpsFailureStartedAt = 0;
    gpsLastUpdateAt = 0;
    tswLastPosition = null;
    tswPositionSource = null;
    resetTSWAutomationState();
    if (gpsModeEnabled && gpsSourceMode === 'this-pc') startGPSTracking();
    updateStatusGPSDisplay();
  }

  function selectStationForAutomation(index, mode = 'next') {
    if (index < 0 || index >= currentStations.length) return;

    const station = currentStations[index];
    selectedStation = station;
    currentHighlightIndex = index;
    selectedStation.currentMode = mode;
    currentStation = index > 0 ? currentStations[index - 1].name : currentStations[0].name;
    currentStationPage = Math.floor(index / STATION_ITEMS_PER_PAGE);
    updateStationDisplayPage();
  }

  async function pollTSWForDistanceTriggers() {
    if (!['phone', 'onboard'].includes(gpsSourceMode)) return;
    if (!currentStations || currentStations.length === 0) return;
    if (gpsAvailable) setGPSUnavailable();

    if (Date.now() < tswUnavailableUntil) {
      if (Date.now() - tswLastSuccessfulPollAt > 5000) {
        tswLiveModeActive = false;
      }
      return;
    }

    const stationsWithCoords = currentStations
      .map((station, index) => ({ station, index }))
      .filter((item) => Number.isFinite(item.station.lat) && Number.isFinite(item.station.lon));

    if (stationsWithCoords.length === 0) {
      return;
    }

    try {
      const response = await fetch(`/api/tsw/player-position?source=${encodeURIComponent(gpsSourceMode)}`);
      if (!response.ok) {
        tswUnavailableUntil = Date.now() + TSW_RETRY_COOLDOWN_MS;
        if (Date.now() - tswLastSuccessfulPollAt > 5000) {
          tswLiveModeActive = false;
        }
        return;
      }

      const data = await response.json();
      if (!data || !data.success || !Number.isFinite(data.lat) || !Number.isFinite(data.lon)) {
        tswUnavailableUntil = Date.now() + TSW_RETRY_COOLDOWN_MS;
        if (Date.now() - tswLastSuccessfulPollAt > 5000) {
          tswLiveModeActive = false;
        }
        return;
      }

      tswLastSuccessfulPollAt = Date.now();
      tswLiveModeActive = true;
      tswUnavailableUntil = 0;

      processGPSPosition({
        coords: {
          latitude: data.lat,
          longitude: data.lon,
          accuracy: Number.isFinite(data.accuracy) ? data.accuracy : 0,
          speed: Number.isFinite(data.speed) ? data.speed : null
        },
        timestamp: Number(data.timestamp) || Date.now(),
        source: data.source || 'TSW fallback'
      });
    } catch (error) {
      tswUnavailableUntil = Date.now() + TSW_RETRY_COOLDOWN_MS;
      if (Date.now() - tswLastSuccessfulPollAt > 5000) {
        tswLiveModeActive = false;
      }
    }
  }

  function startTSWAutomation() {
    stopTSWAutomation();
    resetTSWAutomationState();
    tswTargetStationIndex = currentStations.length > 0 ? currentHighlightIndex : -1;
    startGPSTracking();
    tswPollTimer = setInterval(pollTSWForDistanceTriggers, TSW_POLL_INTERVAL_MS);
    pollTSWForDistanceTriggers().catch(() => {});
  }

  if (gpsModeEnabled && gpsSourceMode === 'this-pc') startGPSTracking();

  // ==================== KEYBOARD POLLING FROM SERVER (FALLBACK) ====================
  let lastProcessedKeyTime = 0;
  let keyPollingInterval = null;
  
  function startKeyboardPolling() {
    // Poll server every 100ms for new key presses from Python listener
    keyPollingInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/state');
        const state = await response.json();
        
        if (state.lastKeyPress) {
          const keyTimestamp = state.lastKeyPress.timestamp || 0;
          
          // Only process if this is a new key press (not processed before)
          if (keyTimestamp > lastProcessedKeyTime) {
            lastProcessedKeyTime = keyTimestamp;
            if (gpsModeEnabled) return;
            const key = state.lastKeyPress.key;
            
            console.log(`⌨️ [POLLING] Received key press from server: ${key}`);
            
            // Process the key
            switch(key) {
              case '3':
              case 'numpad 3':
                console.log('🔓 [POLLING] Key 3 - Unlocking doors');
                doorsUnlock();
                break;
              case '4':
              case 'numpad 4':
                console.log('📢 [POLLING] Key 4 - Playing announcement');
                if (typeof playArrivalAnnouncement === 'function') {
                  playArrivalAnnouncement();
                }
                break;
              case '6':
              case 'numpad 6':
                console.log('🔒 [POLLING] Key 6 - Locking doors');
                doorsLock();
                break;
              case '7':
              case 'numpad 7':
                console.log('📣 [POLLING] Advancing DVA selection');
                document.getElementById('normal-down-btn')?.click();
                break;
            }
          }
        }
      } catch (err) {
        // Silently fail - server might not be ready yet
      }
    }, 100); // Poll every 100ms
  }
  
  // Start polling as fallback for when Electron shortcuts don't work
  startKeyboardPolling();

  // Initialize UI for keyboard-first mode (startup screens removed)
  {
    const initialFooter = document.getElementById('initial-footer');
    const startupFooter = document.getElementById('startup-footer');
    const headerTitle = document.getElementById('header-title');
    const headerRoute = document.getElementById('header-route');
    
    if (initialFooter) initialFooter.classList.add('hide');
    if (startupFooter) startupFooter.classList.remove('hide');
    if (headerTitle) headerTitle.classList.add('hide');
    if (headerRoute) headerRoute.classList.remove('hide');
    
    console.log('✅ UI initialized for keyboard-first mode');
  }

  // Play startup audio on page load
  setTimeout(() => {
    console.log('🎵 Playing startup audio');
    playAudio('QR_PIDS_AudioFiles/StartUp.MP3');
    const startupAudio = currentAudio;
    startupAudio?.addEventListener('ended', () => {
      queueStatusAlert('QR_PIDS_AudioFiles/System Ready.MP3', 'System ready', 'SYSTEM_READY');
    }, { once: true });
    startBatteryAlertMonitoring();
  }, 500);

  // Set date and time
  function updateDateTime() {
    const now = new Date();
    dateDisplay.textContent = now.toLocaleDateString('en-AU');
    timeDisplay.textContent = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Load GTFS patterns for extended route support
  loadGTFSPatterns().then(gtfsData => {
    if (gtfsData) {
      globalGTFSData = gtfsData;
      
      // Store trip ID map for searching by run codes
      if (gtfsData.tripIdMap) {
        tripIdMap = gtfsData.tripIdMap;
        console.log(`✅ Loaded ${Object.keys(tripIdMap).length} trip ID mappings`);
      }
      if (gtfsData.tripServiceMap) {
        globalGTFSData.tripServiceMap = gtfsData.tripServiceMap;
      }
      if (gtfsData.calendar) {
        globalGTFSData.calendar = gtfsData.calendar;
      }
      if (gtfsData.calendarDates) {
        globalGTFSData.calendarDates = gtfsData.calendarDates;
      }
      
      // Build fast lookup index for run codes from routes
      // GTFS data uses route_id like "IPBR-4483" where "IPBR" is the route code
      if (gtfsData.routes) {
        for (const [routeId, routeData] of Object.entries(gtfsData.routes)) {
          // Extract the route code from routeId (e.g., "IPBR" from "IPBR-4483")
          const routeCode = routeId.split('-')[0].toUpperCase();
          runCodeIndex[routeCode] = routeData;
          
          // Also index the full routeId
          runCodeIndex[routeId.toUpperCase()] = routeData;
        }
      }
      console.log(`✅ Built fast lookup index for ${Object.keys(runCodeIndex).length} route codes`);
      
      mergeGTFSPatterns(gtfsData);
      if (typeof updateRouteDisplay === 'function') updateRouteDisplay();
      manualRouteDatabasePromise.then(() => logMatchingManualRoutes(gtfsData));
    }
  }).finally(async () => {
    const assetStatus = await requiredAssetsPromise;
    if (assetStatus.ready) {
      hideLoadingScreen();
    } else {
      console.warn('Keeping startup screen visible until required assets are installed.');
    }
  });

  // Handle run number input changes - show/hide manual button and change enter button color
  function updateRouteInputUI() {
    const isFull = runInput && runInput.value && runInput.value.trim().length === 4;
    const hasText = runInput && runInput.value && runInput.value.trim().length > 0;
    const manualBtn = document.getElementById('manual-btn');
    const enterBtn = document.getElementById('enter-btn');
    const backBtn = document.getElementById('back-btn');
    const ngrToggle = document.getElementById('ngr-button-message-toggle');
    
    console.log(`📝 updateRouteInputUI called - Value: "${runInput ? runInput.value : 'N/A'}" - isFull: ${isFull}`);
    
    // Check if train number starts with "D" when a full 4-character number is entered
    if (isFull && runInput) {
      const trainNumber = runInput.value.trim().toUpperCase();
      shouldPlayExitButtons = trainNumber.startsWith('D');
      ngrButtonMessageEnabled = trainNumber.startsWith('D');
      console.log(`✅ Train number "${trainNumber}" entered - shouldPlayExitButtons: ${shouldPlayExitButtons}, ngrButtonMessageEnabled: ${ngrButtonMessageEnabled}`);
      
      // Update the NGR toggle display
      if (ngrToggle) {
        if (ngrButtonMessageEnabled) {
          ngrToggle.textContent = 'ON';
          ngrToggle.classList.add('enabled');
          ngrToggle.classList.remove('disabled');
        } else {
          ngrToggle.textContent = 'OFF';
          ngrToggle.classList.remove('enabled');
          ngrToggle.classList.add('disabled');
        }
      }
    } else {
      shouldPlayExitButtons = false;
      ngrButtonMessageEnabled = false;
      if (ngrToggle) {
        ngrToggle.textContent = 'OFF';
        ngrToggle.classList.remove('enabled');
        ngrToggle.classList.add('disabled');
      }
    }
    
    if (isFull) {
      // Show manual button and make enter button green when fully occupied (4 characters)
      if (manualBtn) {
        manualBtn.classList.remove('hidden');
        manualBtn.textContent = currentStations.length === 0 ? 'Manual' : 'Skip';
      }
      if (enterBtn) enterBtn.classList.add('footer-btn-green');
    } else {
      // Hide manual button and make enter button grey when not fully occupied
      if (manualBtn) {
        manualBtn.classList.add('hidden');
        manualBtn.textContent = 'Manual';
      }
      if (enterBtn) enterBtn.classList.remove('footer-btn-green');
    }
    
    // Back button: green when text exists, grey when empty
    if (backBtn) {
      if (hasText) {
        backBtn.classList.remove('footer-btn-grey');
        backBtn.classList.add('footer-btn-green');
      } else {
        backBtn.classList.remove('footer-btn-green');
        backBtn.classList.add('footer-btn-grey');
      }
    }
  }
  
  if (runInput) {
    console.log('✅ Attaching event listeners to runInput element');
    const refreshRunPreview = () => {
      routeConfirmed = false;
      currentManualRoute = null;
      currentManualFormFile = null;
      updateRouteDisplay();
      updateRouteInputUI();
    };
    runInput.addEventListener('input', refreshRunPreview);
    runInput.addEventListener('change', refreshRunPreview);
    console.log('✅ Event listeners attached - input and change');
  } else {
    console.error('❌ runInput element not found!');
  }

  const routeSelectionPanel = document.getElementById('route-selection-panel');
  const routeSelectionList = document.getElementById('route-selection-list');
  const routeSelectionTitle = document.getElementById('route-selection-title');
  const routeSelectionFooter = document.getElementById('route-selection-footer');
  const routeSelectionFooterTopGap = document.getElementById('route-selection-footer-top-gap');
  const routeSelectionUpBtn = document.getElementById('route-selection-up-btn');
  const routeSelectionDownBtn = document.getElementById('route-selection-down-btn');
  const routeSelectionSelectBtn = document.getElementById('route-selection-select-btn');
  const routeSelectionResetBtn = document.getElementById('route-selection-reset-btn');
  const routeSelectionStopBtn = document.getElementById('route-selection-stop-btn');
  const routeSelectionSpecialBtn = document.getElementById('route-selection-special-btn');
  const routeSelectionMorePrev = document.getElementById('route-selection-more-prev');
  const routeSelectionMoreNext = document.getElementById('route-selection-more-next');
  let routeSelectionLines = [];
  let manualRouteEntries = [];
  let manualRouteMatchesLogged = false;
  let routeSelectionLevel = 'lines';
  let routeSelectionIndex = 0;
  let routeSelectionLineIndex = 0;
  let routeSelectionOptions = [];
  const ROUTE_SELECTION_ITEMS_PER_PAGE = 10;
  let routeSelectionPage = 0;

  async function loadManualRouteDatabase() {
    const response = await fetch('/manual-routes.json');
    if (!response.ok) throw new Error(`Manual route database unavailable (${response.status})`);
    const database = await response.json();
    routeSelectionLines = Array.isArray(database.routes) ? database.routes : [];
    manualRouteEntries = routeSelectionLines.flatMap(line =>
      Array.isArray(line?.runs) ? line.runs : []
    );
  }

  const manualRouteDatabasePromise = loadManualRouteDatabase()
    .then(() => {
      if (typeof updateRouteDisplay === 'function') updateRouteDisplay();
      if (globalGTFSData) logMatchingManualRoutes(globalGTFSData);
    })
    .catch(error => console.warn('Could not preload manual route database:', error));

  function buildManualRoutePattern(manualRoute) {
    if (!manualRoute) return [];
    const manualTnsFolder = manualRoute.tnsFolder && !/\.mp3$/i.test(String(manualRoute.tnsFolder).trim())
      ? normalizeManualAudioPath(manualRoute.tnsFolder)
      : (manualRoute.name ? `QR_PIDS_AudioFiles/Route Audio Files/${String(manualRoute.name).trim()}` : '');
    const stationEntries = (Array.isArray(manualRoute.stations) ? manualRoute.stations : [manualRoute.stations || ''])
      .flatMap(station => typeof station === 'string' ? station.split(/\r?\n|\\n/) : [station])
      .filter(station => station && (typeof station !== 'string' || station.trim()));

    const manualFormFile = getManualFormFile(manualRoute);

    return stationEntries.map((station, index) => ({
      name: typeof station === 'string' ? station : station.name,
      code: typeof station === 'string' ? '' : (station.code || ''),
      stopId: typeof station === 'string' ? `manual-${index}` : (station.stopId || `manual-${index}`),
      announcements: typeof station === 'string' ? {
        next: { audio: manualTnsFolder ? `${manualTnsFolder}/TNS_${station}.mp3` : '' },
        arrival: { audio: manualTnsFolder ? `${manualTnsFolder}/${station}.mp3` : '' },
        mindTheGap: { audio: manualRoute.tnsMtgOnly
          ? `QR_PIDS_AudioFiles/Stations/${station} MTG.mp3`
          : (manualTnsFolder ? `${manualTnsFolder}/${station} MTG.mp3` : '') },
        form: { audio: manualFormFile }
      } : (station.announcements || {})
    }));
  }

  function getManualFormFile(manualRoute) {
    if (!manualRoute) return '';
    if (manualRoute.formFile) {
      return normalizeManualAudioPath(manualRoute.formFile);
    }
    if (manualRoute.name) {
      return `QR_PIDS_AudioFiles/Route Audio Files/${String(manualRoute.name).trim()}/Form.mp3`;
    }
    return '';
  }

  function getRouteSelectionOptions() {
    if (routeSelectionLevel === 'lines') return routeSelectionLines;

    const line = routeSelectionLines[routeSelectionLineIndex];
    return Array.isArray(line?.runs) ? line.runs.map(run => ({
      name: run.name,
      manualRoute: run
    })) : [];
  }

  function renderRouteSelectionPage() {
    if (!routeSelectionList) return;
    routeSelectionOptions = getRouteSelectionOptions();
    routeSelectionIndex = Math.min(routeSelectionIndex, Math.max(0, routeSelectionOptions.length - 1));
    routeSelectionPage = Math.floor(routeSelectionIndex / ROUTE_SELECTION_ITEMS_PER_PAGE);
    routeSelectionList.innerHTML = '';
    routeSelectionOptions.forEach((option, index) => {
      const item = document.createElement('div');
      item.className = 'special-item';
      item.textContent = option.name;
      const pageStart = routeSelectionPage * ROUTE_SELECTION_ITEMS_PER_PAGE;
      const pageEnd = pageStart + ROUTE_SELECTION_ITEMS_PER_PAGE;
      if (index >= pageStart && index < pageEnd) item.classList.add('visible');
      item.classList.toggle('selected', index === routeSelectionIndex);
      item.addEventListener('click', () => {
        routeSelectionIndex = index;
        renderRouteSelectionPage();
      });
      routeSelectionList.appendChild(item);
    });
    const totalPages = Math.ceil(routeSelectionOptions.length / ROUTE_SELECTION_ITEMS_PER_PAGE);
    const pageIndicator = document.getElementById('route-selection-page-indicator');
    const routeSelectionPageText = `Page: ${routeSelectionOptions.length > 0 ? routeSelectionPage + 1 : 1}/${Math.max(1, totalPages)}`;
    if (pageIndicator) pageIndicator.textContent = routeSelectionPageText;
    document.getElementById('route-selection-page-indicator-bottom')?.replaceChildren(routeSelectionPageText);
    if (routeSelectionMorePrev) routeSelectionMorePrev.style.visibility = routeSelectionPage > 0 ? 'visible' : 'hidden';
    if (routeSelectionMoreNext) routeSelectionMoreNext.style.visibility = routeSelectionPage < totalPages - 1 ? 'visible' : 'hidden';
    if (routeSelectionUpBtn) {
      routeSelectionUpBtn.classList.toggle('footer-btn-grey', routeSelectionIndex === 0);
      routeSelectionUpBtn.classList.toggle('footer-btn-green', routeSelectionIndex !== 0);
    }
    if (routeSelectionDownBtn) {
      routeSelectionDownBtn.classList.toggle('footer-btn-grey', routeSelectionIndex >= routeSelectionOptions.length - 1);
      routeSelectionDownBtn.classList.toggle('footer-btn-green', routeSelectionIndex < routeSelectionOptions.length - 1);
    }
  }

  function getVisibleResetFooterPair() {
    const candidates = [
      { special: document.getElementById('startup-special-btn'), reset: document.getElementById('reset-btn'), footer: document.getElementById('startup-footer') },
      { special: document.getElementById('station-special-btn'), reset: document.getElementById('station-reset-btn'), footer: document.getElementById('station-footer') },
      { special: document.getElementById('normal-special-btn'), reset: document.getElementById('normal-reset-btn'), footer: document.getElementById('normal-footer') },
      { special: document.getElementById('staff-emergency-btn'), reset: document.getElementById('staff-reset-btn'), footer: document.getElementById('staff-footer') },
      { special: document.getElementById('route-selection-special-btn'), reset: document.getElementById('route-selection-reset-btn'), footer: document.getElementById('route-selection-footer') }
    ];

    return candidates.find(({ footer }) => footer && !footer.classList.contains('hide')) || null;
  }

  function setResetConfirmationState(active) {
    const pair = getVisibleResetFooterPair();
    if (!pair) return;

    const specialEl = pair.special;
    const resetEl = pair.reset;
    if (specialEl) {
      const defaultHtml = specialEl.dataset.defaultHtml || specialEl.innerHTML || 'Special/<br>Emergency';
      if (!specialEl.dataset.defaultHtml) {
        specialEl.dataset.defaultHtml = defaultHtml;
      }
      specialEl.innerHTML = active ? 'Confirm' : defaultHtml;
    }

    if (resetEl) {
      const defaultLabel = resetEl.dataset.defaultLabel || resetEl.textContent || 'Reset';
      if (!resetEl.dataset.defaultLabel) {
        resetEl.dataset.defaultLabel = defaultLabel;
      }
      resetEl.textContent = active ? 'Cancel' : defaultLabel;
    }
  }

  function cancelResetConfirmation() {
    setResetConfirmationState(false);
  }

  function beginResetConfirmation() {
    setResetConfirmationState(true);
  }

  function restoreNormalFooterLabels() {
    const footerMap = [
      { special: document.getElementById('startup-special-btn'), reset: document.getElementById('reset-btn') },
      { special: document.getElementById('station-special-btn'), reset: document.getElementById('station-reset-btn') },
      { special: document.getElementById('normal-special-btn'), reset: document.getElementById('normal-reset-btn') },
      { special: document.getElementById('staff-emergency-btn'), reset: document.getElementById('staff-reset-btn') },
      { special: document.getElementById('route-selection-special-btn'), reset: document.getElementById('route-selection-reset-btn') }
    ];

    footerMap.forEach(({ special, reset }) => {
      if (special && special.dataset.defaultHtml) {
        special.innerHTML = special.dataset.defaultHtml;
      }
      if (reset && reset.dataset.defaultLabel) {
        reset.textContent = reset.dataset.defaultLabel;
      }
    });
  }

  async function showRouteSelectionPanel() {
    try {
      await loadManualRouteDatabase();
    } catch (error) {
      console.error('Could not load manual route database:', error);
      return;
    }
    clearAllUiPanels();
    setPidDiIndicatorVisible(true);
    setPidDiIndicatorTextVisible(false);
    document.getElementById('touch-keyboard')?.classList.add('hide');
    document.querySelectorAll('.footer').forEach(footer => footer.classList.add('hide'));
    document.querySelectorAll('.footer-top-gap').forEach(gap => gap.classList.add('hide'));
    if (helperBar) helperBar.classList.add('hide');
    routeSelectionLevel = 'lines';
    routeSelectionIndex = 0;
    routeSelectionLineIndex = 0;
    routeSelectionPage = 0;
    if (mainPanel) mainPanel.classList.add('hide');
    if (routeSelectionPanel) routeSelectionPanel.classList.remove('hide');
    if (routeSelectionFooterTopGap) routeSelectionFooterTopGap.classList.remove('hide');
    if (routeSelectionFooter) routeSelectionFooter.classList.remove('hide');
    if (routeSelectionTitle) routeSelectionTitle.textContent = 'List Of Routes';
    cancelResetConfirmation();
    renderRouteSelectionPage();
  }

  function closeRouteSelectionPanel() {
    if (routeSelectionPanel) routeSelectionPanel.classList.add('hide');
    if (routeSelectionFooterTopGap) routeSelectionFooterTopGap.classList.add('hide');
    cancelResetConfirmation();
    showKeyboardMode();
  }

  async function selectRouteSelectionItem() {
    const option = routeSelectionOptions[routeSelectionIndex];
    if (!option) return;
    if (routeSelectionLevel === 'lines') {
      routeSelectionLineIndex = routeSelectionIndex;
      routeSelectionLevel = 'runs';
      routeSelectionIndex = 0;
      routeSelectionPage = 0;
      if (routeSelectionTitle) routeSelectionTitle.textContent = 'List Of Routes';
      renderRouteSelectionPage();
      return;
    }

    if (!option.manualRoute || !runInput) return;
    const manualRoute = option.manualRoute;
    const pattern = buildManualRoutePattern(manualRoute);
    if (pattern.length === 0) return;

    const typedRunNumber = runInput.value.trim().toUpperCase();
    if (!typedRunNumber && manualRoute.id) {
      runInput.value = String(manualRoute.id).slice(0, 4).toUpperCase();
    }
    currentStations = enrichStationsWithCoordinates(pattern);
    const destination = currentStations[currentStations.length - 1]?.name || '';
    currentDestination = destination;
    currentDestinationStation = destination;
    const diDestination = getDiDisplayDestination(destination);
    if (diDisplay) diDisplay.textContent = diDestination;
    if (typeof updateAppState === 'function') {
      updateAppState({ DI: diDestination });
    }
    selectedStation = null;
    stationSelectionConfirmed = false;
    currentHighlightIndex = 0;
    const formCode = manualRoute.formCode || null;
    currentManualRoute = manualRoute;
    currentManualFormFile = getManualFormFile(manualRoute);
    routeConfirmed = true;
    updateRouteInputUI();
    updateRouteDisplay();
    const routeLongName = buildRouteLongName(currentStations);
    currentRouteFormCode = formCode;
    currentRouteLongName = routeLongName;
      if (formCode && routeLongName && !currentManualRoute) {
      startAnnouncementScanning(formCode, routeLongName)
        .catch(error => console.log('Could not load manually selected route announcements:', error));
    }
    updateClosestStationTag();
    closeRouteSelectionPanel();
    switchToStationSelectMode();
    renderStationsAfterHardwareDelay(currentStations);
    startTSWAutomation();
  }

  if (routeSelectionUpBtn) routeSelectionUpBtn.addEventListener('click', () => {
    routeSelectionIndex = Math.max(0, routeSelectionIndex - 1);
    renderRouteSelectionPage();
  });
  if (routeSelectionDownBtn) routeSelectionDownBtn.addEventListener('click', () => {
    routeSelectionIndex = Math.min(routeSelectionOptions.length - 1, routeSelectionIndex + 1);
    renderRouteSelectionPage();
  });
  if (routeSelectionMorePrev) routeSelectionMorePrev.addEventListener('click', () => {
    if (routeSelectionPage > 0) {
      routeSelectionPage--;
      routeSelectionIndex = routeSelectionPage * ROUTE_SELECTION_ITEMS_PER_PAGE;
      renderRouteSelectionPage();
    }
  });
  if (routeSelectionMoreNext) routeSelectionMoreNext.addEventListener('click', () => {
    const totalPages = Math.ceil(routeSelectionOptions.length / ROUTE_SELECTION_ITEMS_PER_PAGE);
    if (routeSelectionPage < totalPages - 1) {
      routeSelectionPage++;
      routeSelectionIndex = routeSelectionPage * ROUTE_SELECTION_ITEMS_PER_PAGE;
      renderRouteSelectionPage();
    }
  });
  if (routeSelectionSelectBtn) routeSelectionSelectBtn.addEventListener('click', selectRouteSelectionItem);
  if (routeSelectionResetBtn) routeSelectionResetBtn.addEventListener('click', () => {
    if (routeSelectionResetBtn.textContent === 'Cancel') {
      cancelResetConfirmation();
      return;
    }
    if (routeSelectionSpecialBtn && routeSelectionSpecialBtn.textContent === 'Confirm') {
      performReset();
      return;
    }
    beginResetConfirmation();
  });
  if (routeSelectionStopBtn) routeSelectionStopBtn.addEventListener('click', () => {});
  if (routeSelectionSpecialBtn) routeSelectionSpecialBtn.addEventListener('click', () => {
    if (routeSelectionSpecialBtn.textContent === 'Confirm') {
      performReset();
      return;
    }
    document.getElementById('special-btn')?.click();
  });
  const routeSelectionPeiBtn = document.getElementById('route-selection-pei-btn');
  const routeSelectionCctvBtn = document.getElementById('route-selection-cctv-btn');
  const routeSelectionFnBtn = document.getElementById('route-selection-fn-btn');
  if (routeSelectionPeiBtn) routeSelectionPeiBtn.addEventListener('click', () => showPeiPanel('route-selection'));
  if (routeSelectionCctvBtn) routeSelectionCctvBtn.addEventListener('click', showCctvPanel);
  if (routeSelectionFnBtn) routeSelectionFnBtn.addEventListener('click', showFnPanel);

  // Click on left panel (not buttons) to show keyboard
  if (leftPanel) {
    leftPanel.addEventListener('click', function(e) {
      // Check if click is on the system ready screen or its children
      let isSystemReadyClick = false;
      
      // Check if target is the system ready screen itself
      if (e.target === systemReadyScreen) {
        isSystemReadyClick = true;
      }
      // Check if target is a child of system ready screen (text elements)
      else if (systemReadyScreen && systemReadyScreen.contains(e.target)) {
        isSystemReadyClick = true;
      }
      // Check if target has the system-ready classes
      else if (e.target.classList && (e.target.classList.contains('system-ready-text') || 
          e.target.classList.contains('system-ready-subtext'))) {
        isSystemReadyClick = true;
      }
      
      // Only trigger for system ready screen clicks, not other buttons or areas
      if (isSystemReadyClick) {
        showKeyboardMode();
      }
    });
    
    // Also listen for touch events as backup on touchscreen devices
    if (systemReadyScreen) {
      systemReadyScreen.addEventListener('touchstart', function(e) {
        console.log('📱 [TOUCH] System ready screen tapped');
        showKeyboardMode();
      });
    }
  }
  
  function clearAllUiPanels() {
    const panels = [
      document.getElementById('fn-panel'),
      document.getElementById('status-panel'),
      document.getElementById('set2-panel'),
      document.getElementById('set3-panel'),
      document.getElementById('route-selection-panel'),
      document.getElementById('system-info-panel'),
      document.getElementById('pei-panel'),
      document.getElementById('cctv-panel'),
      document.getElementById('special-panel'),
      document.getElementById('emergency-panel'),
      document.getElementById('manual-panel')
    ];

    panels.forEach((panel) => {
      if (panel) panel.classList.add('hide');
    });

    document.querySelectorAll('.footer, .footer-top-gap').forEach((footer) => {
      footer.classList.add('hide');
    });
  }

  function showKeyboardMode() {
    console.log('🎯 [showKeyboardMode] Called - hiding system ready and showing keyboard');
    headerRow2.classList.remove('station-select-mode');
    clearAllUiPanels();
    setPidDiIndicatorVisible(true);
    setPidDiIndicatorTextVisible(false);

    const mainPanel = document.querySelector('.main-panel');
    if (mainPanel) {
      mainPanel.classList.remove('hide');
      console.log('✓ Main panel restored');
    }
    document.getElementById('main-right-panel')?.classList.remove('hide');
    document.getElementById('fn-right-panel')?.classList.add('hide');
    
    // Hide system ready screen
    if (systemReadyScreen) {
      systemReadyScreen.classList.add('hide');
      console.log('✓ System ready screen hidden');
    }
    
    // Show keyboard - CRITICAL for visibility
    const touchKeyboard = document.getElementById('touch-keyboard');
    if (touchKeyboard) {
      touchKeyboard.classList.remove('hide');
      console.log('✓ Touch keyboard shown');
    } else {
      console.error('❌ Touch keyboard element not found!');
    }
    stationListContainer.classList.remove('show');
    stationListContainer.classList.add('hide');
    document.getElementById('manual-list-container')?.classList.add('hide');
    document.getElementById('station-code-mode-container')?.classList.add('hide');
    modeTitle.classList.add('hide');
    
    // Switch from initial footer to startup footer
    const initialFooter = document.getElementById('initial-footer');
    const startupFooter = document.getElementById('startup-footer');
    if (initialFooter) {
      initialFooter.classList.add('hide');
      console.log('✓ Initial footer hidden');
    }
    if (startupFooter) {
      startupFooter.classList.remove('hide');
      console.log('✓ Startup footer shown');
    }
    
    // Switch header to route display
    const headerTitle = document.getElementById('header-title');
    const headerRoute = document.getElementById('header-route');
    if (headerTitle) {
      headerTitle.classList.add('hide');
      console.log('✓ Header title hidden');
    }
    if (headerRoute) {
      headerRoute.classList.remove('hide');
      console.log('✓ Header route shown');
    }
    
    // Update helper bar if it exists
    const helperBar = document.getElementById('helper-bar');
    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = '"Enter" to verify. "Back" to edit.';
      console.log('✓ Helper bar updated');
    }
    
    console.log('✅ [showKeyboardMode] Complete - keyboard should now be visible');
  }

  function hideKeyboardOverlay() {
    const touchKeyboard = document.getElementById('touch-keyboard');
    const systemReadyScreen = document.getElementById('system-ready-screen');
    const systemInitScreen = document.getElementById('system-init-screen');

    if (touchKeyboard) touchKeyboard.classList.add('hide');
    if (systemReadyScreen) systemReadyScreen.classList.add('hide');
    if (systemInitScreen) systemInitScreen.classList.add('hide');
  }

  // Buttons will be accessed later via event listeners

  function renderStations(stations) {
    stationList.innerHTML = "";
    if (!stations || stations.length === 0) {
      stationListContainer.classList.remove('show');
      return;
    }
    stationListContainer.classList.remove('hide');
    stations.forEach((stationObj, index) => {
      const li = document.createElement("li");
      
      // Create station name span
      const nameSpan = document.createElement("span");
      // Normalize station name for display
      nameSpan.textContent = normalizeStationName(stationObj.name);
      li.appendChild(nameSpan);
      
      // Add skip tag if station is skipped
      if (stationObj.skipped) {
        const skipTag = document.createElement("span");
        skipTag.className = "skip-tag";
        skipTag.textContent = "(skipped)";
        li.appendChild(skipTag);
        li.classList.add("skipped");
      }
      
      li.addEventListener("click", function () {
        document.querySelectorAll("#station-list li").forEach((el) => el.classList.remove("selected"));
        li.classList.add("selected");
        selectedStation = stationObj;
        currentHighlightIndex = index;
        const isFirst = isFirstStation(selectedStation);
        selectedStation.currentMode = isFirst ? 'form' : (currentAnnouncementType === 'form' || !currentAnnouncementType ? 'next' : selectedStation.currentMode || 'next');
        if (isFirst) {
          currentAnnouncementType = 'form';
        } else if (currentAnnouncementType === 'form' || !currentAnnouncementType) {
          currentAnnouncementType = 'TNS';
        }
        currentAnnouncementAudioPath = null;
        currentAnnouncementDisplayText = null;
        
        // Set the current station for TNS_Special path generation
        if (index > 0) {
          currentStation = currentStations[index - 1].name;
        } else {
          currentStation = currentStations[0].name;
        }
        
        // Update page when clicking an item
        currentStationPage = Math.floor(index / STATION_ITEMS_PER_PAGE);
        updateStationDisplayPage();
        updateSkipButton();
        updateNormalUpButtonLabel();
        
        // If doors are already unlocked and CCTV feature enabled, show CCTV
        const doorCycleState = doorCycleDisplay.textContent.trim();
        if (doorCycleState === 'Y' && cctvOnDoorUnlockEnabled) {
          const isNormalMode = !normalFooter.classList.contains('hide');
          const isCctvVisible = !cctvPanel.classList.contains('hide');
          if (isNormalMode && !isCctvVisible) {
            scheduleCctvAutoOpen(100);
          }
        }
        
        // When first station is selected, press the play button
        if (index === 0) {
          const playBtn = document.getElementById("play-btn");
          if (playBtn) {
            setTimeout(() => {
              playBtn.click();
            }, 100);
          }
        }
      });
      stationList.appendChild(li);
    });
    // Preserve the page containing the currently highlighted station instead of resetting to page 1
    currentStationPage = Math.floor((currentHighlightIndex >= 0 ? currentHighlightIndex : 0) / STATION_ITEMS_PER_PAGE);
    updateStationDisplayPage();
    
    // Update closest station tag
    updateClosestStationTag();
  }
  let stationListRenderTimer = null;
  function renderStationsAfterHardwareDelay(stations) {
    if (stationListRenderTimer) {
      clearTimeout(stationListRenderTimer);
    }
    stationList.innerHTML = '';
    stationListContainer.classList.remove('hide');
    stationListContainer.classList.add('show');
    const revealDelay = 250 + Math.floor(Math.random() * 301);
    stationListRenderTimer = setTimeout(() => {
      renderStations(stations);
      stationListRenderTimer = null;
    }, revealDelay);
  }

  // Initial render: hide station list
  renderStations([]);

  if (setRunBtn) setRunBtn.addEventListener("click", async function () {
    currentManualRoute = null;
    currentManualFormFile = null;
    const run = runInput.value.trim().toUpperCase();
    console.log('Setting run:', run, 'Length:', run.length);
    
    selectedStation = null;
    stationSelectionConfirmed = false;
    const isValid = validateRunNumber(run);
    console.log('Run validation result:', isValid);
    
    if (!isValid) {
      console.log('Run validation failed for:', run);
      runError.textContent = '';
      runNumberDisplay.textContent = "ROUTE NOT SET";
      currentStations = [];
      renderStations(currentStations);
      // Reset destination board
      if (destinationWindow && !destinationWindow.closed) {
        destinationWindow.postMessage({ type: 'RESET' }, '*');
      }
      return;
    }
    runError.textContent = "";
    routeConfirmed = true;
    simulateRouteHardwareDelay();
    stopTSWAutomation();
    resetTSWAutomationState();
    console.log('Run validation passed, proceeding with:', run);
    
    // ==================== PEAK TIME RUN DETECTION ====================
    // Check if this run code is in peakruns.json (loaded on startup)
    console.log('🔍 Checking peakRunsArray:', peakRunsArray, 'against run:', run);
    if (peakRunsArray && peakRunsArray.includes(run)) {
      const secondChar = run.charAt(1); // Get second character for route code
      const routeInfo = runCodeGuide.secondChar[secondChar];
      const shortRouteCode = secondChar; // Short route code is the second character
      console.log(`\n🎯 PEAK TIME RUN DETECTED!`);
      console.log(`   Run Code: ${run}`);
      console.log(`   Short Route Code: ${shortRouteCode}`);
      if (routeInfo) {
        console.log(`   Route: ${routeInfo.route}`);
      }
    } else {
      console.log(`ℹ️ Run "${run}" is not in peak runs list`);
    }
    
    // Parse the run code to get route and destination info
    const runInfo = parseRunCode(run);
    console.log('Parsed run info:', runInfo);
    
    // If run code matches a stopping pattern, use it
    console.log('Checking stoppingPatterns for:', run);
    const pattern = await getStoppingPattern(run);
    const routeDataForRun = getRouteDataForRunCode(run);
    const gtfsPatternForRun = pattern || (routeDataForRun ? getGtfsPreviewPattern(routeDataForRun, run) : null);
    const matchingManualRoute = getBestMatchingManualRoute(gtfsPatternForRun);
    
    if (pattern || matchingManualRoute) {
      const matchedManualPattern = matchingManualRoute
        ? buildManualRoutePattern(matchingManualRoute)
        : [];
      currentManualRoute = matchingManualRoute;
      currentManualFormFile = getManualFormFile(matchingManualRoute);
      console.log(`✅ Matched Manual Mode Form file: ${currentManualFormFile || '(none)'}`);
      updateRouteDisplay();
      currentStations = enrichStationsWithCoordinates(matchedManualPattern.length > 0 ? matchedManualPattern : (pattern || gtfsPatternForRun));
      const origin = currentStations[0].name;
      const dest = currentStations[currentStations.length-1].name;
      
      // Load route-specific announcements for this route (5-minute refresh)
      const formCode = getFormCodeForRoute(run);
      const routeLongName = buildRouteLongName(currentStations);
      console.log(`\nChecking if route has special announcements:`);
      console.log(`  formCode: ${formCode}`);
      console.log(`  routeLongName: ${routeLongName}`);
      if (formCode && routeLongName && !matchingManualRoute) {
        console.log(`  ✓ Calling startAnnouncementScanning()`);
        currentRouteFormCode = formCode;
        currentRouteLongName = routeLongName;
        startAnnouncementScanning(formCode, routeLongName).catch(err => console.log('Could not load route announcements:', err));
      } else {
        console.log(`  ℹ️ Manual Mode route active or route data incomplete - skipping form-code announcement scanning`);
      }
      
      // Display run info with parsed details
      if (runInfo) {
        runNumberDisplay.textContent = `${run} - ${runInfo.trainType} | ${origin} to ${dest} | ${runInfo.stoppingPattern}`;
      } else {
        runNumberDisplay.textContent = run + " - " + origin + " to " + dest;
      }
      
      // Open destination window if not already open or closed
      if (!destinationWindow || destinationWindow.closed) {
        destinationWindow = window.open(`${window.location.origin}/destination.html`, 'DestinationBoard', 'width=1200,height=400');
      }
      // Send destination and stopping pattern
      setTimeout(() => {
        destinationWindow.postMessage({
          type: 'DEST_BOARD',
          payload: {
            destination: dest,
            stations: currentStations.map(s => s.name)
          }
        }, '*');
      }, 300);
    } else {
      // No stopping pattern defined, but we can still show route info from run code
      currentStations = [];
      if (runInfo) {
        runNumberDisplay.textContent = `${run} - ${runInfo.trainType} | ${runInfo.route} to ${runInfo.destination} | ${runInfo.stoppingPattern}`;
        
        // Open destination window and show parsed destination
        if (!destinationWindow || destinationWindow.closed) {
          destinationWindow = window.open(`${window.location.origin}/destination.html`, 'DestinationBoard', 'width=1200,height=400');
        }
        setTimeout(() => {
          destinationWindow.postMessage({
            type: 'DEST_BOARD',
            payload: {
              destination: runInfo.destination,
              stations: []
            }
          }, '*');
        }, 300);
      } else {
        runNumberDisplay.textContent = run + " - Pattern Not Defined";
        // Reset destination board
        if (destinationWindow && !destinationWindow.closed) {
          destinationWindow.postMessage({ type: 'RESET' }, '*');
        }
      }
    }
    renderStationsAfterHardwareDelay(currentStations);
    updateRouteInputUI();
    if (currentStations.length > 0) {
      startTSWAutomation();
    }
  });

  // Enter button (HMI footer) - validates run and enters station selection mode
  const enterBtn = document.getElementById("enter-btn");
  const startupFooter = document.getElementById("startup-footer");
  const stationFooter = document.getElementById("station-footer");
  const normalFooter = document.getElementById("normal-footer");
  const modeTitle = document.getElementById("mode-title");
  const helperBar = document.getElementById("helper-bar");
  const stationMorePrev = document.getElementById("station-more-prev");
  const stationMoreNext = document.getElementById("station-more-next");
  
  let currentHighlightIndex = 0;
  
  // Station pagination settings
  const STATION_ITEMS_PER_PAGE = 10;
  let currentStationPage = 0;
  
  function updateStationDisplayPage() {
    // Hide all items first
    const items = document.querySelectorAll('#station-list li');
    items.forEach(item => item.classList.remove('visible'));
    
    // Calculate page range
    const startIndex = currentStationPage * STATION_ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + STATION_ITEMS_PER_PAGE, currentStations.length);
    const stationPageIndicator = document.getElementById('station-page-indicator');
    const stationTotalPages = Math.ceil(currentStations.length / STATION_ITEMS_PER_PAGE);
    const stationPageText = `Page: ${currentStations.length > 0 ? currentStationPage + 1 : 1}/${Math.max(1, stationTotalPages)}`;
    if (stationPageIndicator) stationPageIndicator.textContent = stationPageText;
    document.getElementById('station-page-indicator-bottom')?.replaceChildren(stationPageText);
    
    // Show items for current page
    for (let i = startIndex; i < endIndex; i++) {
      if (items[i]) items[i].classList.add('visible');
    }
    
    // Update -more- button visibility
    stationMorePrev.style.visibility = currentStationPage > 0 ? 'visible' : 'hidden';
    stationMoreNext.style.visibility = endIndex < currentStations.length ? 'visible' : 'hidden';
    
    // Update up/down button colors based on position
    const upBtn = document.getElementById("up-btn");
    const downBtn = document.getElementById("down-btn");
    const normalDownBtn = document.getElementById("normal-down-btn");
    
    if (upBtn) {
      if (currentHighlightIndex === 0) {
        upBtn.classList.add('footer-btn-grey');
        upBtn.classList.remove('footer-btn-green');
      } else {
        upBtn.classList.remove('footer-btn-grey');
        upBtn.classList.add('footer-btn-green');
      }
    }
    
    if (downBtn) {
      if (currentHighlightIndex >= currentStations.length - 1) {
        downBtn.classList.add('footer-btn-grey');
        downBtn.classList.remove('footer-btn-green');
      } else {
        downBtn.classList.remove('footer-btn-grey');
        downBtn.classList.add('footer-btn-green');
      }
    }

    if (normalDownBtn) {
      normalDownBtn.classList.toggle('footer-btn-grey', currentHighlightIndex >= currentStations.length - 1);
      normalDownBtn.classList.toggle('footer-btn-green', currentHighlightIndex < currentStations.length - 1);
    }
    
    // Highlight appropriate item on current page
    highlightStation(currentHighlightIndex);
  }
  
  function switchToStartupMode() {
    // Show system ready screen, hide keyboard
    if (systemReadyScreen) systemReadyScreen.classList.remove('hide');
    document.getElementById('touch-keyboard').classList.add('hide');
    
    // Hide all panels
    const fnPanel = document.getElementById('fn-panel');
    const manualPanel = document.getElementById('manual-panel');
    const mainPanel = document.querySelector('.main-panel');
    if (fnPanel) fnPanel.classList.add('hide');
    if (manualPanel) manualPanel.classList.add('hide');
    if (mainPanel) mainPanel.classList.remove('hide');
    
    // Hide all footers and show only initial footer
    const allFooters = document.querySelectorAll('.footer');
    allFooters.forEach(footer => {
      if (footer.id === 'initial-footer') {
        footer.classList.remove('hide');
      } else {
        footer.classList.add('hide');
      }
    });
    
    modeTitle.classList.add('hide');
    if (helperBar) helperBar.classList.add('hide');
    helperBar.textContent = 'Select starting station';
    stationListContainer.classList.remove('show');

    const manualBtn = document.getElementById('manual-btn');
    if (manualBtn) {
      manualBtn.classList.add('hidden');
      manualBtn.textContent = 'Manual';
      manualBtn.classList.remove('side-btn-red', 'side-btn-green');
    }
    
    // Show CCTV button (it may have been hidden in station mode)
    const cctvBtn = document.getElementById('cctv-btn');
    if (cctvBtn) cctvBtn.classList.remove('station-select-hidden');
    
  }
  
  function switchToStationSelectMode() {
    document.getElementById('main-right-panel')?.classList.remove('hide');
    document.getElementById('fn-right-panel')?.classList.add('hide');
    setPidDiIndicatorVisible(true);
    setPidDiIndicatorTextVisible(true);
    headerRow2.classList.add('station-select-mode');
    startupFooter.classList.add('hide');
    stationFooter.classList.remove('hide');
    normalFooter.classList.add('hide');
    modeTitle.classList.remove('hide');
    modeTitle.textContent = 'Select Start Station Mode';
    if (helperBar) {
      helperBar.textContent = 'Select starting station';
      helperBar.classList.remove('hide');
    }
    document.getElementById('touch-keyboard').classList.add('hide');
    stationListContainer.classList.remove('hide');
    stationListContainer.classList.add('show');
    
    // Hide the manual and skip buttons in station select mode, but keep their layout space.
    const manualBtn = document.getElementById('manual-btn');
    const cctvBtn = document.getElementById('cctv-btn');
    if (manualBtn) manualBtn.classList.add('hidden');
    if (cctvBtn) cctvBtn.classList.remove('station-select-hidden');

    const cctvPanel = document.getElementById('cctv-panel');
    if (cctvPanel) cctvPanel.classList.add('hide');
    document.body.classList.remove('cctv-active');
    
    // Automatically highlight closest station (if stations exist)
    if (currentStations && currentStations.length > 0) {
      // Calculate which page the closest station is on
      currentStationPage = Math.floor(closestStationIndex / STATION_ITEMS_PER_PAGE);
      // Update the display page to show the closest station
      updateStationDisplayPage();
      // Set highlight index and highlight the station
      currentHighlightIndex = closestStationIndex;
      highlightStation(closestStationIndex);
    }
    
    updateNormalUpButtonLabel();
  }

  function getNormalModeHeaderText() {
    return tswLiveModeActive ? 'Normal Mode (GPS)' : 'Normal Mode';
  }
  
  function switchToNormalMode() {
    document.getElementById('main-right-panel')?.classList.remove('hide');
    document.getElementById('fn-right-panel')?.classList.add('hide');
    setPidDiIndicatorVisible(true);
    setPidDiIndicatorTextVisible(true);
    headerRow2.classList.remove('station-select-mode');
    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.remove('hide');
    modeTitle.classList.remove('hide');
    modeTitle.textContent = getNormalModeHeaderText();
    if (helperBar) {
      helperBar.textContent = '';
      helperBar.classList.remove('hide');
    }
    document.getElementById('touch-keyboard').classList.add('hide');
    stationListContainer.classList.add('show');
    
    // Show CCTV button (it was hidden in station select mode)
    const cctvBtn = document.getElementById('cctv-btn');
    const manualBtn = document.getElementById('manual-btn');
    if (cctvBtn) cctvBtn.classList.remove('station-select-hidden');
    
    // Check if manual button should be shown (only if route input has 4 characters)
    if (manualBtn) {
      const isFull = runInput && runInput.value && runInput.value.trim().length === 4;
      if (isFull) {
        manualBtn.classList.remove('hidden');
      } else {
        manualBtn.classList.add('hidden');
      }
    }
    
    // Update skip button visibility
    updateSkipButton();
    updateNormalUpButtonLabel();
  }
  
  function highlightStation(index) {
    const items = document.querySelectorAll('#station-list li');
    items.forEach((el, i) => {
      if (i === index) {
        el.classList.add('selected');
        if (el.classList.contains('visible')) {
          el.scrollIntoView({ block: 'nearest' });
        }
      } else {
        el.classList.remove('selected');
      }
    });
    if (currentStations[index]) {
      selectedStation = currentStations[index];
      const isFirst = isFirstStation(selectedStation);
      selectedStation.currentMode = isFirst ? 'form' : (currentAnnouncementType === 'form' || !currentAnnouncementType ? 'next' : selectedStation.currentMode || 'next');
      if (isFirst) {
        currentAnnouncementType = 'form';
      } else if (currentAnnouncementType === 'form' || !currentAnnouncementType) {
        currentAnnouncementType = 'TNS';
      }
      currentAnnouncementAudioPath = null;
      currentAnnouncementDisplayText = null;
      
      // Set the current station for TNS_Special path generation
      // currentStation is the PREVIOUS station (where announcer is)
      if (index > 0) {
        currentStation = currentStations[index - 1].name;
      } else {
        // For first station, set to first station itself
        currentStation = currentStations[0].name;
      }
      
      console.log(`🎯 Station highlighted: ${selectedStation.name}, CurrentStation set to: ${currentStation}`);
      
      // Update remote state
      if (typeof updateAppState === 'function') {
        updateAppState({ station: selectedStation.name, pid: selectedStation.name });
      }
      // Update skip button state
      updateSkipButton();
      updateNormalUpButtonLabel();
      
      // NOTE: Announcement logic is now ONLY triggered by explicit user clicks in renderStations()
      // This highlightStation() function only handles visual highlighting and state updates
    }
  }

  // Global variables for manual announcement mode
  let manualAnnouncementHighlightIndex = 0;
  let manualAnnouncements = []; // Array of {station, type, text, audioPath}
  let queuedDvaSelection = null;
  
  // Manual announcement pagination settings
  const MANUAL_ITEMS_PER_PAGE = 10;
  let currentManualPage = 0;
  const manualMorePrev = document.getElementById("manual-more-prev");
  const manualMoreNext = document.getElementById("manual-more-next");
  
  function updateManualDisplayPage() {
    // Hide all items first
    const items = document.querySelectorAll('#manual-list li');
    items.forEach(item => item.classList.remove('visible'));
    
    // Calculate page range
    const startIndex = currentManualPage * MANUAL_ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + MANUAL_ITEMS_PER_PAGE, manualAnnouncements.length);
    
    // Show items for current page
    for (let i = startIndex; i < endIndex; i++) {
      if (items[i]) items[i].classList.add('visible');
    }
    
    // Update -more- button visibility
    if (manualMorePrev) manualMorePrev.style.visibility = currentManualPage > 0 ? 'visible' : 'hidden';
    if (manualMoreNext) manualMoreNext.style.visibility = endIndex < manualAnnouncements.length ? 'visible' : 'hidden';
    const manualPageIndicator = document.getElementById('manual-page-indicator');
    const manualTotalPages = Math.ceil(manualAnnouncements.length / MANUAL_ITEMS_PER_PAGE);
    const manualPageText = `Page: ${manualAnnouncements.length > 0 ? currentManualPage + 1 : 1}/${Math.max(1, manualTotalPages)}`;
    if (manualPageIndicator) manualPageIndicator.textContent = manualPageText;
    document.getElementById('manual-page-indicator-bottom')?.replaceChildren(manualPageText);
    
    // Update up/down button colors based on position (when in manual mode)
    const manualListContainer = document.getElementById('manual-list-container');
    const isManualMode = !manualListContainer.classList.contains('hide');
    
    if (isManualMode) {
      const normalUpBtn = document.getElementById("normal-up-btn");
      const normalDownBtn = document.getElementById("normal-down-btn");
      
      if (normalUpBtn) {
        const atFirstManualOption = manualAnnouncementHighlightIndex === 0;
        normalUpBtn.classList.toggle('footer-btn-grey', atFirstManualOption);
        normalUpBtn.classList.toggle('footer-btn-green', !atFirstManualOption);
      }
      
      if (normalDownBtn) {
        if (manualAnnouncementHighlightIndex >= manualAnnouncements.length - 1) {
          normalDownBtn.classList.add('footer-btn-grey');
          normalDownBtn.classList.remove('footer-btn-green');
        } else {
          normalDownBtn.classList.remove('footer-btn-grey');
          normalDownBtn.classList.add('footer-btn-green');
        }
      }
    }
    
    // Highlight appropriate item on current page
    highlightManualAnnouncement(manualAnnouncementHighlightIndex);
  }

  // Function to render manual announcement options
  function renderManualAnnouncements() {
    if (currentStations.length === 0) return;

    manualAnnouncements = [];
    const manualList = document.getElementById('manual-list');
    manualList.innerHTML = '';

    // For each station, add announcement options
    currentStations.forEach((station, index) => {
      const isFirstStation = (index === 0);

      if (isFirstStation) {
        // At first station, the manual list starts with the Form announcement.
        const firstStationName = currentStations[0].name;
        const destinationStation = currentStations[currentStations.length - 1].name;

        if (!isAnnouncementTypeDisabledForStation(destinationStation, 'form')) {
          // Ensure currentStation is set for Form path generation
          currentStation = firstStationName;

          const formPath = getFormOrMtgAudioPath(destinationStation);
          console.log(`📋 [MANUAL] First station Form: dest="${destinationStation}", path="${formPath}"`);

          manualAnnouncements.push({
            station: firstStationName,
            type: 'Form',
            text: `${firstStationName} station.`,
            audioPath: formPath,
            currentStation: firstStationName
          });
        }
      } else {
        // Previous station (where we currently are)
        const previousStation = currentStations[index - 1].name;
        // Only use Form path if announcing from the first station (index 1)
        const useFormPath = (index === 1);
        const mtgOnlyRoute = isMtgOnlyRoute(currentRouteFormCode);

        if (!isAnnouncementTypeDisabledForStation(station.name, 'tns')) {
          manualAnnouncements.push({
            station: station.name,
            type: 'TNS',
            text: `The next station is ${station.name}`,
            audioPath: getPatternAnnouncementAudioPath(station, 'nextStation') || getAnnouncementAudioPath(station.name, 'nextStation', useFormPath ? previousStation : null)
          });
        }

        if (!mtgOnlyRoute && !isAnnouncementTypeDisabledForStation(station.name, 'naa')) {
          // NAA: "Arriving at Station Name"
          manualAnnouncements.push({
            station: station.name,
            type: 'NAA',
            text: `Arriving at ${station.name}`,
            audioPath: getPatternAnnouncementAudioPath(station, 'arrival') || getAnnouncementAudioPath(station.name, 'arrival')
          });
        }

        if (!isAnnouncementTypeDisabledForStation(station.name, 'mtg')) {
          // MTG: "Station Name station." (mind the gap)
          manualAnnouncements.push({
            station: station.name,
            type: 'MTG',
            text: `${station.name} station.`,
            audioPath: getPatternAnnouncementAudioPath(station, 'mindTheGap') || getAnnouncementAudioPath(station.name, 'mindTheGap')
          });
        }
      }
    });
    
    // Log the first announcement (should be Form for first station)
    if (manualAnnouncements.length > 0) {
      const firstAnnouncement = manualAnnouncements[0];
      console.log(`📋 [MANUAL MODE] First announcement (at First Station):`, {
        type: firstAnnouncement.type,
        text: firstAnnouncement.text,
        audioPath: firstAnnouncement.audioPath
      });
    }
    
    // Render list items
    manualAnnouncements.forEach((announcement, index) => {
      const li = document.createElement('li');
      li.className = 'station-list-item';
      li.textContent = announcement.text;
      li.dataset.index = index;
      li.addEventListener('click', () => {
        manualAnnouncementHighlightIndex = index;
        currentManualPage = Math.floor(index / MANUAL_ITEMS_PER_PAGE);
        updateManualDisplayPage();
      });
      manualList.appendChild(li);
    });

    // Initialize pagination display
    currentManualPage = 0;
    manualAnnouncementHighlightIndex = 0;
    updateManualDisplayPage();
  }

  // Function to highlight a manual announcement
  function highlightManualAnnouncement(index) {
    const items = document.querySelectorAll('#manual-list li');
    items.forEach((el, i) => {
      if (i === index) {
        el.classList.add('selected');
        if (el.classList.contains('visible')) {
          el.scrollIntoView({ block: 'nearest' });
        }
      } else {
        el.classList.remove('selected');
      }
    });
  }

  // Function to switch to manual announcement mode
  function switchToManualMode() {
    stationFooter.classList.add('hide');
    normalFooter.classList.remove('hide');
    modeTitle.textContent = 'Manual Mode';
    
    // Set currentStation to first station for Form message generation
    if (currentStations.length > 0) {
      currentStation = currentStations[0].name;
      console.log(`🎙️  Switched to manual mode, currentStation set to: ${currentStation}`);
    }
    
    const stationListContainer = document.getElementById('station-list-container');
    const manualListContainer = document.getElementById('manual-list-container');
    const manualBtn = document.getElementById('manual-btn');
    
    stationListContainer.classList.add('hide');
    manualListContainer.classList.remove('hide');
    if (manualBtn) manualBtn.classList.add('hidden');
    
    // Change reset button text to Close
    const normalResetBtn = document.getElementById('normal-reset-btn');
    if (normalResetBtn) normalResetBtn.textContent = 'Close';
    
    renderManualAnnouncements();
    updateNormalUpButtonLabel();
  }

  // Function to switch from manual mode back to normal
  function switchFromManualMode() {
    modeTitle.textContent = getNormalModeHeaderText();
    
    const stationListContainer = document.getElementById('station-list-container');
    const manualListContainer = document.getElementById('manual-list-container');
    
    stationListContainer.classList.remove('hide');
    manualListContainer.classList.add('hide');
    updateSkipButton();
    
    // Restore reset button text to Reset
    const normalResetBtn = document.getElementById('normal-reset-btn');
    if (normalResetBtn) normalResetBtn.textContent = 'Reset';
    const normalUpBtn = document.getElementById('normal-up-btn');
    if (normalUpBtn) {
      normalUpBtn.classList.remove('footer-btn-grey');
      normalUpBtn.classList.add('footer-btn-green');
    }
    updateNormalUpButtonLabel();
  }
  
  // ==================== Skip Station Functionality ====================
  function updateSkipButton() {
    const btn = document.getElementById('manual-btn');
    const manualListContainer = document.getElementById('manual-list-container');
    const modeTitle = document.getElementById('mode-title');
    if (!btn) return;

    const isManualMode = manualListContainer && !manualListContainer.classList.contains('hide');
    const isStationSelectMode = modeTitle && modeTitle.textContent && modeTitle.textContent.includes('Select Start Station Mode');

    if (isManualMode || isStationSelectMode) {
      btn.classList.add('hidden');
      btn.textContent = 'Manual';
      btn.classList.remove('side-btn-red');
      btn.classList.remove('side-btn-green');
      return;
    }

    if (selectedStation) {
      btn.classList.remove('hide');
      btn.classList.remove('hidden');
      if (selectedStation.skipped) {
        btn.textContent = 'UnSkip';
        btn.classList.add('side-btn-red');
        btn.classList.remove('side-btn-green');
      } else {
        btn.textContent = 'Skip';
        btn.classList.remove('side-btn-red');
        btn.classList.add('side-btn-green');
      }
    } else {
      btn.classList.add('hidden');
      btn.textContent = 'Manual';
    }
  }

  function updateNormalUpButtonLabel() {
    const normalUpBtn = document.getElementById('normal-up-btn');
    const normalDownBtn = document.getElementById('normal-down-btn');
    if (!normalUpBtn || !normalDownBtn) return;

    const manualListContainer = document.getElementById('manual-list-container');
    const isManualMode = manualListContainer && !manualListContainer.classList.contains('hide');
    normalUpBtn.textContent = isManualMode ? 'Up' : 'Manual';
    normalDownBtn.textContent = isManualMode ? 'Down' : 'Next';
  }

  function isSelectedStationFirstStation() {
    if (!selectedStation || currentStations.length === 0) return false;
    const firstStation = currentStations[0];
    if (selectedStation === firstStation) return true;
    if (selectedStation.stopId && firstStation.stopId) {
      return selectedStation.stopId === firstStation.stopId;
    }
    return normalizeStationName(selectedStation.name) === normalizeStationName(firstStation.name);
  }

  function getPatternAnnouncementAudioPath(stationRef, announcementType) {
    const stationObj = (typeof stationRef === 'object' && stationRef)
      ? stationRef
      : currentStations.find((station) => station && station.name === stationRef);

    if (!stationObj || !stationObj.announcements) return null;

    const resolvedAnnouncementType = resolveAnnouncementTypeForStation(stationObj.name, announcementType);
    if (resolvedAnnouncementType !== normalizeAnnouncementTypeKey(announcementType)) {
      return getPatternAnnouncementAudioPath(stationObj, resolvedAnnouncementType);
    }

    if (currentManualRoute) {
      const announcementTypeKey = normalizeAnnouncementTypeKey(announcementType);
      if (announcementTypeKey === 'form') return currentManualFormFile || stationObj.announcements.form?.audio || null;
      if (announcementTypeKey === 'mtg') return getAnnouncementAudioPath(stationObj.name, 'mindTheGap');
      if (announcementTypeKey === 'naa') {
        if (currentManualRoute.tnsMtgOnly) return null;
        return getAnnouncementAudioPath(stationObj.name, 'arrival');
      }
      return getAnnouncementAudioPath(stationObj.name, 'next');
    }

    if (announcementType === 'mindTheGap' || announcementType === 'MTG') {
      if (isMtgOnlyRoute(currentRouteFormCode)) {
        return getAnnouncementAudioPath(normalizeStationName(stationObj.name), 'mindTheGap');
      }
      const stationName = normalizeStationName(stationObj.name);
      return `QR_PIDS_AudioFiles/mind the gap/${stationName} MTG.mp3`;
    }

    if (announcementType === 'nextStation' || announcementType === 'next' || announcementType === 'TNS') {
      return stationObj.announcements.next?.audio || null;
    }

    if (announcementType === 'arrival' || announcementType === 'nowArrivingAt' || announcementType === 'NAA') {
      return stationObj.announcements.arrival?.audio || stationObj.announcements.next?.audio || null;
    }

    if (announcementType === 'form') {
      return currentManualFormFile || stationObj.announcements.form?.audio || null;
    }

    return null;
  }

  function getAnnouncementPreviewData(stationRef, announcementType) {
    const stationName = typeof stationRef === 'object' ? stationRef.name : stationRef;
    const normalizedType = normalizeAnnouncementTypeKey(announcementType);
    const resolvedType = resolveAnnouncementTypeForStation(stationName, normalizedType);
    if (resolvedType !== normalizedType) {
      return getAnnouncementPreviewData(stationRef, resolvedType);
    }

    const patternAudioPath = getPatternAnnouncementAudioPath(stationRef, normalizedType);

    switch (normalizedType) {
      case 'naa':
        return { type: 'NAA', displayText: `Arriving at ${stationName}`, audioPath: patternAudioPath || getAnnouncementAudioPath(stationName, 'arrival') };
      case 'mtg':
        return { type: 'MTG', displayText: `${stationName}... Please mind the gap between the train and the platform.`, audioPath: patternAudioPath || getAnnouncementAudioPath(stationName, 'mindTheGap') };
      case 'form':
        return { type: 'form', displayText: `${stationName} station`, audioPath: patternAudioPath || getFormOrMtgAudioPath(stationName) };
      case 'tns':
      default:
        return { type: 'TNS', displayText: `The next station is ${stationName}`, audioPath: patternAudioPath || getAnnouncementAudioPath(stationName, 'nextStation') };
    }
  }

  function getRouteStartAnnouncementData() {
    const destinationStation = currentStations.length > 0
      ? currentStations[currentStations.length - 1].name
      : (selectedStation ? selectedStation.name : '');

    return {
      type: 'form',
      displayText: `${destinationStation} station`,
      audioPath: currentManualRoute?.tnsMtgOnly
        ? ''
        : currentManualFormFile
        ? currentManualFormFile
        : getFormOrMtgAudioPath(destinationStation)
    };
  }

  function getSelectedStationAnnouncementData(announcementType) {
    if (!selectedStation) return null;

    if (isSelectedStationFirstStation()) {
      if (announcementType === 'MTG' || announcementType === 'mindTheGap') {
        return getAnnouncementPreviewData(selectedStation, 'mindTheGap');
      }
      return getRouteStartAnnouncementData();
    }

    return getAnnouncementPreviewData(selectedStation, announcementType);
  }

  function replayCurrentAnnouncement() {
    if (queuedDvaSelection && currentStations.includes(queuedDvaSelection.station)) {
      const queued = queuedDvaSelection;
      queuedDvaSelection = null;
      selectedStation = queued.station;
      currentHighlightIndex = currentStations.indexOf(queued.station);
      currentStationPage = Math.floor(currentHighlightIndex / STATION_ITEMS_PER_PAGE);
      updateStationDisplayPage();

      currentAnnouncementType = queued.type;
      currentAnnouncementDisplayText = queued.displayText;
      currentAnnouncementAudioPath = queued.audioPath;
      currentAnnouncementStation = queued.station.name;
      updatePIDDisplay(queued.station.name, queued.type);

      if (!displayWindow || displayWindow.closed) {
      }

      setTimeout(() => {
        displayWindow.postMessage(queued.displayText, '*');
      }, 300);

      if (queued.audioPath) {
        setTimeout(() => {
          playAudio(queued.audioPath);
        }, 500);
      }
      return true;
    }
    queuedDvaSelection = null;

    if (currentAnnouncementDisplayText && pidDisplay?.textContent !== '-') {
      const displayText = currentAnnouncementDisplayText;
      const audioPath = currentAnnouncementAudioPath;

      if (!displayWindow || displayWindow.closed) {
      }

      setTimeout(() => {
        displayWindow.postMessage(displayText, '*');
      }, 300);

      if (audioPath) {
        setTimeout(() => {
          playAudio(audioPath);
        }, 500);
      }
      return true;
    }

    if (!selectedStation) {
      runError.textContent = 'Select a station to display.';
      return false;
    }

    const preview = getSelectedStationAnnouncementData(currentAnnouncementType || selectedStation.currentMode || 'TNS');

    currentAnnouncementType = preview.type;
    currentAnnouncementDisplayText = preview.displayText;
    currentAnnouncementAudioPath = preview.audioPath;
    currentAnnouncementStation = selectedStation.name;
    updatePIDDisplay(selectedStation.name, preview.type);

    if (!displayWindow || displayWindow.closed) {
    }

    setTimeout(() => {
      displayWindow.postMessage(preview.displayText, '*');
    }, 300);

    if (preview.audioPath) {
      setTimeout(() => {
        playAudio(preview.audioPath);
      }, 500);
    }

    return true;
  }

  function getNextAnnouncementType(announcementType) {
    switch (announcementType) {
      case 'TNS':
        return 'NAA';
      case 'NAA':
        return 'MTG';
      case 'MTG':
        return 'TNS';
      case 'form':
        return 'TNS';
      default:
        return 'TNS';
    }
  }

  function getPreviousAnnouncementType(announcementType) {
    switch (announcementType) {
      case 'TNS':
        return 'MTG';
      case 'MTG':
        return 'NAA';
      case 'NAA':
        return 'TNS';
      case 'form':
        return 'form';
      default:
        return 'TNS';
    }
  }

  function cycleAnnouncementSelection(direction = 1) {
    if (!selectedStation) return false;

    const currentIndex = currentStations.findIndex(station => station === selectedStation);
    const currentType = currentAnnouncementType || selectedStation.currentMode || 'TNS';

    if (isSelectedStationFirstStation()) {
      if (currentType === 'form' && direction > 0) {
        const mtgPreview = getAnnouncementPreviewData(selectedStation, 'mindTheGap');
        currentAnnouncementType = mtgPreview.type;
        currentAnnouncementDisplayText = mtgPreview.displayText;
        currentAnnouncementAudioPath = mtgPreview.audioPath;
        queuedDvaSelection = {
          station: selectedStation,
          type: mtgPreview.type,
          displayText: mtgPreview.displayText,
          audioPath: mtgPreview.audioPath
        };
        updatePIDDisplay(selectedStation.name, mtgPreview.type);
        setTimeout(() => displayWindow.postMessage(mtgPreview.displayText, '*'), 300);
        return true;
      }
    }

    const shouldMoveToAdjacentStation =
      direction > 0
        ? (isSelectedStationFirstStation() && currentType === 'form') || currentType === 'MTG' || currentType === 'mindTheGap'
        : currentType === 'TNS' || currentType === 'next' || currentType === 'nextStation';

    if (shouldMoveToAdjacentStation) {
      if (direction > 0) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < currentStations.length) {
          selectedStation = currentStations[nextIndex];
          selectedStation.currentMode = 'next';
          currentHighlightIndex = nextIndex;
          currentAnnouncementType = 'TNS';
          if (nextIndex > 0) {
            currentStation = currentStations[nextIndex - 1].name;
          } else {
            currentStation = currentStations[0].name;
          }
          document.querySelectorAll('#station-list li').forEach((el, i) => {
            el.classList.toggle('selected', i === nextIndex);
          });
          updateSkipButton();
          updateNormalUpButtonLabel();
          currentStationPage = Math.floor(nextIndex / STATION_ITEMS_PER_PAGE);
          updateStationDisplayPage();

          const movedPreview = isSelectedStationFirstStation()
            ? getRouteStartAnnouncementData()
            : getAnnouncementPreviewData(selectedStation, 'TNS');

          currentAnnouncementType = movedPreview.type;
          currentAnnouncementDisplayText = movedPreview.displayText;
          currentAnnouncementAudioPath = movedPreview.audioPath;
          queuedDvaSelection = {
            station: selectedStation,
            type: movedPreview.type,
            displayText: movedPreview.displayText,
            audioPath: movedPreview.audioPath
          };
          selectedStation.currentMode = 'next';
          updatePIDDisplay(selectedStation.name, movedPreview.type);

          if (!displayWindow || displayWindow.closed) {
          }

          setTimeout(() => {
            displayWindow.postMessage(movedPreview.displayText, '*');
          }, 300);

          return true;
        }
      } else {
        const previousIndex = currentIndex - 1;
        if (previousIndex >= 0) {
          selectedStation = currentStations[previousIndex];
          selectedStation.currentMode = 'next';
          currentHighlightIndex = previousIndex;
          currentAnnouncementType = 'TNS';
          currentStation = previousIndex > 0 ? currentStations[previousIndex - 1].name : currentStations[0].name;
          document.querySelectorAll('#station-list li').forEach((el, i) => {
            el.classList.toggle('selected', i === previousIndex);
          });
          updateSkipButton();
          updateNormalUpButtonLabel();
          currentStationPage = Math.floor(previousIndex / STATION_ITEMS_PER_PAGE);
          updateStationDisplayPage();

          const movedPreview = isSelectedStationFirstStation()
            ? getRouteStartAnnouncementData()
            : getAnnouncementPreviewData(selectedStation, 'TNS');

          currentAnnouncementType = movedPreview.type;
          currentAnnouncementDisplayText = movedPreview.displayText;
          currentAnnouncementAudioPath = movedPreview.audioPath;
          queuedDvaSelection = {
            station: selectedStation,
            type: movedPreview.type,
            displayText: movedPreview.displayText,
            audioPath: movedPreview.audioPath
          };
          selectedStation.currentMode = 'next';
          updatePIDDisplay(selectedStation.name, movedPreview.type);

          if (!displayWindow || displayWindow.closed) {
          }

          setTimeout(() => {
            displayWindow.postMessage(movedPreview.displayText, '*');
          }, 300);

          return true;
        }
      }
    }

    const activeType = currentAnnouncementType || selectedStation.currentMode || 'TNS';
    const nextType = direction > 0 ? getNextAnnouncementType(activeType) : getPreviousAnnouncementType(activeType);
    const preview = isSelectedStationFirstStation()
      ? getRouteStartAnnouncementData()
      : getAnnouncementPreviewData(selectedStation, nextType);

    currentAnnouncementType = preview.type;
    currentAnnouncementDisplayText = preview.displayText;
    currentAnnouncementAudioPath = preview.audioPath;
    queuedDvaSelection = {
      station: selectedStation,
      type: preview.type,
      displayText: preview.displayText,
      audioPath: preview.audioPath
    };
    selectedStation.currentMode = preview.type === 'NAA' ? 'arrival' : preview.type === 'MTG' ? 'mindTheGap' : preview.type === 'form' ? 'form' : 'next';

    updatePIDDisplay(selectedStation.name, preview.type);

    if (!displayWindow || displayWindow.closed) {
    }

    setTimeout(() => {
      displayWindow.postMessage(preview.displayText, '*');
    }, 300);

    updateNormalUpButtonLabel();
    return true;
  }

  function selectPreviousAnnouncement() {
    return cycleAnnouncementSelection(-1);
  }
  
  function toggleStationSkip() {
    if (!selectedStation) return;

    const selectedIndex = currentStations.findIndex((station) => station === selectedStation);
    const pageBeforeRender = currentStationPage;
    
    // Toggle skipped state
    selectedStation.skipped = !selectedStation.skipped;
    
    // Re-render stations to update visual
    renderStations(currentStations);
    currentHighlightIndex = selectedIndex >= 0 ? selectedIndex : currentHighlightIndex;
    currentStationPage = Math.min(
      pageBeforeRender,
      Math.max(0, Math.ceil(currentStations.length / STATION_ITEMS_PER_PAGE) - 1)
    );
    updateStationDisplayPage();
    
    // Re-highlight the current station
    highlightStation(currentHighlightIndex);
  }
  
  // Update PID display based on announcement type
  function updatePIDDisplay(stationName, announcementType) {
    if (!pidDisplay) return;
    
    // Track the current announcement type for looping
    currentAnnouncementType = announcementType;
    currentAnnouncementStation = stationName;
    
    switch(announcementType) {
      case 'nextStation':
      case 'TNS':
        pidDisplay.textContent = `The next station is ${stationName}`;
        break;
      case 'arrival':
      case 'NAA':
        pidDisplay.textContent = `Arriving at ${stationName}`;
        break;
      case 'mindTheGap':
      case 'MTG':
        pidDisplay.textContent = `${stationName} station`;
        break;
      case 'form':
        pidDisplay.textContent = `${selectedStation?.name || currentStation || stationName} station`;
        break;
      case 'special':
        pidDisplay.textContent = stationName;
        break;
      default:
        pidDisplay.textContent = stationName;
    }

    updateAppState({ pid: pidDisplay.textContent });
  }
  
  function playMindTheGap(forceMTG = false) {
    if (!selectedStation) return;
    
    // Check if at first station - if so, play Form announcement instead
    const isAtFirstStation = isSelectedStationFirstStation();
    
    if (isAtFirstStation) {
      // At first station: play Form announcement for destination
      const destinationStation = currentStations[currentStations.length - 1].name;
      
      selectedStation.currentMode = "form";
      updatePIDDisplay(destinationStation, 'form');
      
      let displayText = `${destinationStation} station`;
      let audioPath = getFormOrMtgAudioPath(destinationStation);
      
      console.log(`🎵 [MTG->FORM] At first station, playing Form announcement for: ${destinationStation}`);
      console.log(`   Audio path: ${audioPath}`);
      
      // Store for potential replay via Play button
      currentAnnouncementAudioPath = audioPath;
      currentAnnouncementDisplayText = displayText;
      currentAnnouncementType = 'form';
      
      // Open display window if not open
      if (!displayWindow || displayWindow.closed) {
      }
      
      setTimeout(() => {
        displayWindow.postMessage(displayText, '*');
      }, 300);
      
      if (audioPath) {
        setTimeout(() => {
          playAudio(audioPath);
        }, 500);
      }
      return;
    }
    
    // Normal case: play Mind The Gap announcement
    selectedStation.currentMode = "mindTheGap";
    
    // Update PID display with announcement state
    updatePIDDisplay(selectedStation.name, 'MTG');
    
    // Generate Mind The Gap announcement dynamically
    let displayText = selectedStation.name + "... Please mind the gap between the train and the platform.";
    let audioPath = getPatternAnnouncementAudioPath(selectedStation, 'mindTheGap') || getAnnouncementAudioPath(selectedStation.name, "mindTheGap");
    
    console.log(`🎵 [MTG] Playing mind the gap for: ${selectedStation.name}`);
    console.log(`   Audio path: ${audioPath}`);
    
    // Store for potential replay via Play button
    currentAnnouncementAudioPath = audioPath;
    currentAnnouncementDisplayText = displayText;
    currentAnnouncementType = 'MTG';
    
    // Open display window if not open
    if (!displayWindow || displayWindow.closed) {
    }
    
    setTimeout(() => {
      displayWindow.postMessage(displayText, '*');
    }, 300);
    
    if (audioPath) {
      setTimeout(() => {
        playAudio(audioPath);
      }, 500);
    }
  }

  function playNextStation() {
    if (!selectedStation) return;
    
    selectedStation.currentMode = "nextStation";
    
    // Update PID display with announcement state
    updatePIDDisplay(selectedStation.name, 'TNS');
    
    // Generate Next Station announcement dynamically
    let displayText = `The next station is ${selectedStation.name}`;
    
    // currentDestinationStation is already set by route entry
    // TNS_Special path: TNS_Special/{FormCode}/{DestinationStation}/{StationName} TNS.mp3
    
    // Get audio path for next station (uses global currentDestinationStation for TNS_Special paths)
    let audioPath = getPatternAnnouncementAudioPath(selectedStation, 'nextStation') || getAnnouncementAudioPath(selectedStation.name, 'nextStation');
    
    console.log(`🎵 [TNS] Playing next station: ${selectedStation.name}`);
    console.log(`   Destination station (for TNS_Special): ${currentDestinationStation}`);
    console.log(`   Form code: ${currentRouteFormCode}`);
    console.log(`   Looking for: TNS_Special/${currentRouteFormCode}/${currentDestinationStation} station/TNS_{StationName}.mp3`);
    console.log(`   Audio path: ${audioPath}`);
    
    // Store for potential replay via Play button
    currentAnnouncementAudioPath = audioPath;
    currentAnnouncementDisplayText = displayText;
    currentAnnouncementType = 'TNS';
    
    // Open display window if not open
    if (!displayWindow || displayWindow.closed) {
    }
    
    setTimeout(() => {
      displayWindow.postMessage(displayText, '*');
    }, 300);
    
    if (audioPath) {
      setTimeout(() => {
        playAudio(audioPath);
      }, 500);
    }
  }
  if (enterBtn) enterBtn.addEventListener("click", async function () {
    const run = runInput.value.trim().toUpperCase();
    
    // Debounce: prevent processing multiple rapid clicks
    const now = Date.now();
    if (now - lastRouteEnterTime < 500) {
      console.log('⏱️ Route change debounced (too rapid)');
      return;
    }
    lastRouteEnterTime = now;
    
    console.log('🚀 Enter pressed, run:', run);
    
    selectedStation = null;
    stationSelectionConfirmed = false;
    currentHighlightIndex = 0;
    doorsCycled = false;
    const isValid = validateRunNumber(run);
    
    if (!isValid) {
      console.log('❌ Run validation failed for:', run);
      runError.textContent = '';
      currentStations = [];
      renderStations(currentStations);
      return;
    }
    runError.textContent = "";
    routeConfirmed = true;
    simulateRouteHardwareDelay();
    
    // Clear pending announcement on new route
    pendingAnnouncementPath = null;
    currentManualRoute = null;
    currentManualFormFile = null;
    
    // ⚡ FAST PATH: Check hardcoded patterns first (instant, no network delay)
    const pattern = await getStoppingPattern(run);
    if (pattern) {
      console.log('✓ [FAST PATH] Using hardcoded pattern for:', run);
      const routeDataForRun = getRouteDataForRunCode(run);
      const gtfsPatternForRun = routeDataForRun ? getGtfsPreviewPattern(routeDataForRun, run) : pattern;
      const matchingManualRoute = getBestMatchingManualRoute(gtfsPatternForRun || pattern);
      currentManualRoute = matchingManualRoute;
      currentManualFormFile = getManualFormFile(matchingManualRoute);
      updateRouteDisplay();
      const manualPattern = matchingManualRoute ? buildManualRoutePattern(matchingManualRoute) : [];
      currentStations = enrichStationsWithCoordinates(manualPattern.length > 0 ? manualPattern : pattern);
      const origin = currentStations[0].name;
      const dest = currentStations[currentStations.length-1].name;
      
      // Display route immediately (NON-BLOCKING)
      runNumberDisplay.textContent = run;
      currentDestination = dest;
      currentDestinationStation = dest; // Update global for Form messages
      const diDestination = getDiDisplayDestination(dest);
      if (diDisplay) {
        diDisplay.textContent = diDestination;
      }
      
      // Auto-select special message matching this destination
      autoSelectSpecialMessageByDestination(dest);
      
      // Update remote state
      if (typeof updateAppState === 'function') {
        updateAppState({ 
          route: run, 
          station: origin,
          DI: diDestination,
          inputValue: run
        });
      }
      
      // Show stations after the simulated hardware response delay
      switchToStationSelectMode();
      renderStationsAfterHardwareDelay(currentStations);
      startTSWAutomation();
      // Don't auto-select first station - wait for user to click
      // highlightStation(0);
      
      // ⏳ Load announcements in BACKGROUND (non-blocking)
      const formCode = getFormCodeForRoute(run);
      const routeLongName = buildRouteLongName(currentStations);
      if (formCode && routeLongName && !currentManualRoute) {
        currentRouteFormCode = formCode;
        currentRouteLongName = routeLongName;
        console.log(`🔄 Loading announcements in background...`);
        // Don't await - let it load while user navigates
        startAnnouncementScanning(formCode, routeLongName).catch(err => console.log('BG: Announcement load failed:', err));
      }
      
      // 🌐 Try GTFS in BACKGROUND with timeout (won't block UI or delay hardcoded return)
      searchRunInGTFSWithTimeout(run, 2000)
        .then(gtfsRun => {
          if (!gtfsRun || !gtfsRun.found) {
            console.log(`ℹ️ GTFS: Run ${run} not found or request timed out`);
            return;
          }
          console.log(`✓ [BG] GTFS found data, fetching pattern...`);
          return getStoppingPatternFromGTFS(gtfsRun.tripId).then(stoppingPattern => {
            if (stoppingPattern && stoppingPattern.length > 0) {
              console.log(`  → GTFS has ${stoppingPattern.length} stations (enrichment available if needed)`);
            }
          });
        })
        .catch(err => console.log('BG: Optional GTFS enhancement failed:', err));
      
      return; // ✅ Exit early - already processed via fast path
    }
    
    // ⏳ SLOW PATH: No hardcoded pattern, search GTFS (only if hardcoded doesn't exist)
    console.log('⏳ [SLOW PATH] No hardcoded pattern, searching GTFS with 3s timeout...');
    const gtfsRun = await searchRunInGTFSWithTimeout(run, 3000);
    
    if (gtfsRun && gtfsRun.found) {
      console.log('✓ Found run in GTFS');
      const stoppingPattern = await getStoppingPatternFromGTFS(gtfsRun.tripId);
      
      if (stoppingPattern && stoppingPattern.length > 0) {
        const matchingManualRoute = getBestMatchingManualRoute(stoppingPattern);
        currentManualRoute = matchingManualRoute;
        currentManualFormFile = getManualFormFile(matchingManualRoute);
        const manualPattern = matchingManualRoute ? buildManualRoutePattern(matchingManualRoute) : [];
        updateRouteDisplay();
        currentStations = enrichStationsWithCoordinates((manualPattern.length > 0 ? manualPattern : stoppingPattern.map(stop => ({
          name: stop.name,
          stopId: stop.stopId,
          announcements: stop.announcements,
          arrivalTime: stop.arrivalTime,
          currentMode: "next"
        }))));
        
        const origin = currentStations[0].name;
        const dest = currentStations[currentStations.length-1].name;
        
        // Load announcements
        const formCode = extractFormCodeFromGTFS(gtfsRun.routeId);
        const routeLongName = gtfsRun.destination || buildRouteLongName(currentStations);
        if (formCode && routeLongName && !currentManualRoute) {
          currentRouteFormCode = formCode;
          currentRouteLongName = routeLongName;
          startAnnouncementScanning(formCode, routeLongName).catch(err => console.log('Could not load announcements:', err));
        }
        
        runNumberDisplay.textContent = run;
        currentDestination = dest;
        currentDestinationStation = dest; // Update global for Form messages
        const diDestination = getDiDisplayDestination(dest);
        if (diDisplay) {
          diDisplay.textContent = diDestination;
        }
        
        // Auto-select special message matching this destination
        autoSelectSpecialMessageByDestination(dest);
        
        if (typeof updateAppState === 'function') {
          updateAppState({ 
            route: run, 
            station: origin,
            DI: diDestination,
            inputValue: run
          });
        }
        
        switchToStationSelectMode();
        renderStationsAfterHardwareDelay(currentStations);
        startTSWAutomation();
        // Don't auto-select first station - wait for user to click
        // highlightStation(0);
        return;
      }
    }
    
    // ❌ No pattern found anywhere
    currentStations = [];
    runError.textContent = '';
    runNumberDisplay.textContent = run;
    routeDisplay.classList.add('route-unknown');
    if (routePreview) routePreview.textContent = '[Not Known]';
  });
  
  // Up button - move selection up
  const upBtn = document.getElementById("up-btn");
  if (upBtn) upBtn.addEventListener("click", function() {
    if (currentStations.length === 0) return;
    
    currentHighlightIndex = Math.max(0, currentHighlightIndex - 1);
    
    // Auto-switch page when moving up from first item on current page to previous page
    const newPage = Math.floor(currentHighlightIndex / STATION_ITEMS_PER_PAGE);
    if (newPage < currentStationPage) {
      currentStationPage = newPage;
    }
    
    // Update page based on new index
    currentStationPage = Math.floor(currentHighlightIndex / STATION_ITEMS_PER_PAGE);
    updateStationDisplayPage();
  });
  
  // Down button - move selection down
  const downBtn = document.getElementById("down-btn");
  if (downBtn) downBtn.addEventListener("click", function() {
    if (currentStations.length === 0) return;
    
    const maxPages = Math.ceil(currentStations.length / STATION_ITEMS_PER_PAGE);
    const lastItemOnPage = (currentStationPage + 1) * STATION_ITEMS_PER_PAGE - 1;
    
    // Check if we're at the last item on current page and there are more pages
    if (currentHighlightIndex >= lastItemOnPage && currentHighlightIndex < currentStations.length - 1) {
      // Auto-switch to next page
      currentStationPage++;
      currentHighlightIndex = currentStationPage * STATION_ITEMS_PER_PAGE;
    } else {
      // Normal increment within current page
      currentHighlightIndex = Math.min(currentStations.length - 1, currentHighlightIndex + 1);
      currentStationPage = Math.floor(currentHighlightIndex / STATION_ITEMS_PER_PAGE);
    }
    
    updateStationDisplayPage();
  });
  
  // Previous page button
  if (stationMorePrev) stationMorePrev.addEventListener('click', () => {
    if (currentStationPage > 0) {
      currentStationPage--;
      // Set index to last item of previous page
      currentHighlightIndex = (currentStationPage + 1) * STATION_ITEMS_PER_PAGE - 1;
      updateStationDisplayPage();
    }
  });
  
  // Next page button
  if (stationMoreNext) stationMoreNext.addEventListener('click', () => {
    const maxPages = Math.ceil(currentStations.length / STATION_ITEMS_PER_PAGE);
    if (currentStationPage < maxPages - 1) {
      currentStationPage++;
      // Set index to first item of next page
      currentHighlightIndex = currentStationPage * STATION_ITEMS_PER_PAGE;
      updateStationDisplayPage();
    }
  });
  
  // Select button - confirm start station, play mind the gap only if doors unlocked
  const selectBtn = document.getElementById("select-btn");
  if (selectBtn) selectBtn.addEventListener("click", function() {
    if (!selectedStation) {
      runError.textContent = "Select a station first.";
      return;
    }
    runError.textContent = "";
    stationSelectionConfirmed = true;
    const selectedStationIndex = currentStations.findIndex((station) => station === selectedStation);
    if (selectedStationIndex >= 0) {
      closestStationIndex = selectedStationIndex;
      currentHighlightIndex = selectedStationIndex;
      currentStationPage = Math.floor(selectedStationIndex / STATION_ITEMS_PER_PAGE);
      closestStationAutoChangeAt = gpsModeEnabled ? Date.now() + 200 : 0;
      updateStationDisplayPage();
      updateClosestStationTag();
    }
    resetTSWAutomationState();
    if (gpsModeEnabled && selectedStationIndex >= 0) {
      tswStartStationIndex = selectedStationIndex;
      tswStartStationPhaseActive = true;
    }
    tswTargetStationIndex = getNextAutomationStationIndex(currentHighlightIndex);
    if (isFirstStation(selectedStation)) {
      tswPassedStationIndex = currentHighlightIndex;
    }
    
    // Check current door cycle state
    const doorCycleState = doorCycleDisplay.textContent.trim();
    
    // If doors are unlocked (Y), play mind the gap then switch to CCTV after 3 seconds
    if (doorCycleState === 'Y') {
      // Switch to normal mode first (this updates the display and sets up normal mode)
      switchToNormalMode();
      
      // Play mind the gap immediately
      if (!gpsModeEnabled) playMindTheGap(true);
      
      // Then switch to CCTV after 3 seconds
      helperBar.textContent = '';
      previousScreenBeforeCctv = capturePreviousUiScreen() || 'normal';
      scheduleCctvAutoOpen(3000);
      return;
    }
    
    // Normal flow (doors locked): Switch to normal mode
    switchToNormalMode();
    helperBar.textContent = '';
    if (!gpsModeEnabled && isFirstStation(selectedStation)) {
      playMindTheGap();
    }
  });
  
  // Normal mode Up button
  const normalUpBtn = document.getElementById("normal-up-btn");
  if (normalUpBtn) normalUpBtn.addEventListener("click", function() {
    // Check if we're in manual mode
    const manualListContainer = document.getElementById('manual-list-container');
    const isManualMode = !manualListContainer.classList.contains('hide');
    
    if (isManualMode) {
      // Navigate manual announcements
      if (manualAnnouncements.length === 0) return;
      manualAnnouncementHighlightIndex = Math.max(0, manualAnnouncementHighlightIndex - 1);
      // Update current page based on index
      currentManualPage = Math.floor(manualAnnouncementHighlightIndex / MANUAL_ITEMS_PER_PAGE);
      updateManualDisplayPage();
    } else {
      switchToManualMode();
    }
  });
  
  // Normal mode Down button
  const normalDownBtn = document.getElementById("normal-down-btn");
  if (normalDownBtn) normalDownBtn.addEventListener("click", function() {
    // Check if we're in manual mode
    const manualListContainer = document.getElementById('manual-list-container');
    const isManualMode = !manualListContainer.classList.contains('hide');
    
    if (isManualMode) {
      // Navigate manual announcements
      if (manualAnnouncements.length === 0) return;
      manualAnnouncementHighlightIndex = Math.min(manualAnnouncements.length - 1, manualAnnouncementHighlightIndex + 1);
      // Update current page based on index
      currentManualPage = Math.floor(manualAnnouncementHighlightIndex / MANUAL_ITEMS_PER_PAGE);
      updateManualDisplayPage();
    } else {
      cycleAnnouncementSelection();
    }
  });

  // Manual -more- prev button (previous page of announcements)
  if (manualMorePrev) manualMorePrev.addEventListener("click", function() {
    if (currentManualPage > 0) {
      currentManualPage--;
      // Set highlight index to last item of new page
      const startIndex = currentManualPage * MANUAL_ITEMS_PER_PAGE;
      manualAnnouncementHighlightIndex = Math.min(startIndex + MANUAL_ITEMS_PER_PAGE - 1, manualAnnouncements.length - 1);
      updateManualDisplayPage();
    }
  });

  // Manual -more- next button (next page of announcements)
  if (manualMoreNext) manualMoreNext.addEventListener("click", function() {
    const totalPages = Math.ceil(manualAnnouncements.length / MANUAL_ITEMS_PER_PAGE);
    if (currentManualPage < totalPages - 1) {
      currentManualPage++;
      // Set highlight index to first item of new page
      const startIndex = currentManualPage * MANUAL_ITEMS_PER_PAGE;
      manualAnnouncementHighlightIndex = startIndex;
      updateManualDisplayPage();
    }
  });

  // Manual button event listener
  const manualBtn = document.getElementById("manual-btn");
  if (manualBtn) manualBtn.addEventListener("click", () => {
    if (currentStations.length === 0 && runInput && runInput.value.trim().length === 4) {
      showRouteSelectionPanel();
    } else {
      toggleStationSkip();
    }
  });

  // Function to play announcement for highlighted station based on current announcement state
  function playHighlightedStationAnnouncement() {
    if (!selectedStation) {
      runError.textContent = "Select a station first.";
      return false;
    }
    
    const announcementType = currentAnnouncementType;
    let displayText = '';
    let audioPath = null;
    
    console.log(`🎵 [PLAY HIGHLIGHTED] Playing ${announcementType} for highlighted station: ${selectedStation.name}`);
    
    switch (announcementType) {
      case 'TNS':
        // The Next Station announcement
        displayText = `The next station is ${selectedStation.name}`;
        audioPath = getAnnouncementAudioPath(selectedStation.name, 'nextStation');
        console.log(`   TNS announcement for: ${selectedStation.name}, path: ${audioPath}`);
        break;
      
      case 'MTG':
        // Mind The Gap announcement
        displayText = selectedStation.name + "... Please mind the gap between the train and the platform.";
        audioPath = getAnnouncementAudioPath(selectedStation.name, "mindTheGap");
        console.log(`   MTG announcement for: ${selectedStation.name}, path: ${audioPath}`);
        break;
      
      case 'form':
        // Form announcement
        displayText = `${selectedStation.name} station`;
        audioPath = getFormOrMtgAudioPath(selectedStation.name);
        console.log(`   Form announcement for: ${selectedStation.name}, path: ${audioPath}`);
        break;
      
      default:
        // Default to TNS if no current announcement state
        displayText = `The next station is ${selectedStation.name}`;
        audioPath = getAnnouncementAudioPath(selectedStation.name, 'nextStation');
        console.log(`   Defaulting to TNS for: ${selectedStation.name}, path: ${audioPath}`);
    }
    
    // Open display window if not already open or closed
    if (!displayWindow || displayWindow.closed) {
    }
    
    // Send text to display window
    setTimeout(() => {
      displayWindow.postMessage(displayText, '*');
    }, 300);
    
    // Play audio if available
    if (audioPath) {
      setTimeout(() => {
        playAudio(audioPath);
      }, 500);
    }
    
    return true;
  }

  // Play button event: play announcements with audio
  const playBtn = document.getElementById("play-btn");
  if (playBtn) playBtn.addEventListener("click", function () {
    // Check if we're in manual mode
    const manualListContainer = document.getElementById('manual-list-container');
    const isManualMode = !manualListContainer.classList.contains('hide');
    
    if (isManualMode) {
      // Play selected manual announcement
      if (manualAnnouncements.length === 0) return;
      
      const announcement = manualAnnouncements[manualAnnouncementHighlightIndex];
      if (!announcement) return;
      
      queuedDvaSelection = null;
      const announcementType = announcement.type === 'Form' ? 'form' : announcement.type;
      currentAnnouncementType = announcementType;
      currentAnnouncementDisplayText = announcement.text;
      currentAnnouncementAudioPath = announcement.audioPath;
      currentAnnouncementStation = announcement.station;

      updatePIDDisplay(announcement.station, announcementType);
      
      // Open display window if not already open or closed
      if (!displayWindow || displayWindow.closed) {
      }
      
      // Send text to display window
      setTimeout(() => {
        displayWindow.postMessage(announcement.text, '*');
      }, 300);
      
      // Play audio if available
      if (announcement.audioPath) {
        setTimeout(() => {
          playAudio(announcement.audioPath);
        }, 500);
      }
      return;
    }

    // Normal mode - replay the current announcement being prepared
    const run = runInput.value.trim().toUpperCase();
    if (!currentManualRoute && !validateRunNumber(run)) {
      runError.textContent = "Enter a valid run number first.";
      return;
    }
    if (!replayCurrentAnnouncement()) {
      return;
    }
  });

  function stopCurrentDvaAndPid() {
    clearPendingAnnouncement();
    queuedDvaSelection = null;
    if (pidDisplay) pidDisplay.textContent = '-';
    updateAppState({ pid: '-', announcement: null, announcementClearedAt: Date.now() });
    if (displayWindow && !displayWindow.closed) {
      displayWindow.postMessage({ type: 'STOP' }, '*');
    }
  }

  // Stop button event: stop the active DVA and clear its PID display
  const stopBtn = document.getElementById("stop-btn");
  if (stopBtn) stopBtn.addEventListener("click", stopCurrentDvaAndPid);
  
  // Station footer stop button
  const stationStopBtn = document.getElementById("station-stop-btn");
  if (stationStopBtn) stationStopBtn.addEventListener("click", stopCurrentDvaAndPid);
  
  // Normal footer stop button
  const normalStopBtn = document.getElementById("normal-stop-btn");
  if (normalStopBtn) normalStopBtn.addEventListener("click", stopCurrentDvaAndPid);
  
  // Startup footer stop button
  const startupStopBtn = document.getElementById("startup-stop-btn");
  if (startupStopBtn) startupStopBtn.addEventListener("click", stopCurrentDvaAndPid);

  // Next button event: cycle through announcement types
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.addEventListener("click", function() {
    if (!selectedStation) {
      runError.textContent = "Select a station first.";
      return;
    }

    cycleAnnouncementSelection();
  });

  function doorsUnlock() {
    // Send IPC message to sync HMI-O door state
    try {
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('door-unlock');
    } catch (e) {
      // Running in browser context, no IPC available
    }
    
    // Update door cycle indicator (always, regardless of station selection)
    if (doorCycleDisplay) doorCycleDisplay.textContent = 'Y';
    
    // Play pending announcement if doors were locked and a station was selected
    if (pendingAnnouncementPath) {
      console.log(`🔓 Doors unlocked - playing pending announcement: ${pendingAnnouncementPath}`);
      setTimeout(() => {
        console.log(`🔓 [AUDIO] About to play: ${pendingAnnouncementPath}`);
        playAudio(pendingAnnouncementPath);
        pendingAnnouncementPath = null; // Clear after playing
      }, 300);
    } else {
      console.log(`🔓 Doors unlocked - no pending announcement queued`);
    }
    
    // Update remote state
    if (typeof updateAppState === 'function') {
      updateAppState({ doorCycle: 'Y' });
    }
    
    // Clear any existing timers
    if (cctvDisplayTimer) clearTimeout(cctvDisplayTimer);
    
    // Only switch to CCTV if feature is enabled, in normal mode and not already in CCTV
    const isNormalMode = !normalFooter.classList.contains('hide');
    const isCctvVisible = !cctvPanel.classList.contains('hide');
    if (cctvOnDoorUnlockEnabled && isNormalMode && !isCctvVisible && selectedStation) {
      // Show CCTV panel immediately (handles loading overlays with random delays)
      showCctvPanel();
    }
    
    // If waiting for door cycle to play mind the gap, play it now
    // But NOT if we're in Select Start Station Mode
    const isStationSelectMode = !stationFooter.classList.contains('hide');
    if (waitingForDoorCycleToPlayMindTheGap && selectedStation && !isStationSelectMode) {
      waitingForDoorCycleToPlayMindTheGap = false;
      playMindTheGap();
      return;
    }
    
    // If no station selected, just update indicator and return silently
    if (!selectedStation) {
      return;
    }
    
    // Don't play announcement if in Select Start Station Mode
    if (isStationSelectMode) {
      return;
    }
    runError.textContent = "";
    
    // Clear any existing timers when unlocking doors
    clearProgressTimers();
    
    // Check if at first station - if so, play Form announcement instead of MTG
    const isAtFirstStation = (currentStations.length > 0 && selectedStation === currentStations[0]);
    
    if (isAtFirstStation) {
      // At first station: play Form announcement for destination
      const destinationStation = currentStations[currentStations.length - 1].name;
      
      selectedStation.currentMode = "form";
      updatePIDDisplay(destinationStation, 'form');
      
      let displayText = `${destinationStation} station`;
      let audioPath = getFormOrMtgAudioPath(destinationStation);
      
      console.log(`🚪 [DOOR UNLOCK AT FIRST STATION] Playing Form for: ${destinationStation}`);
      console.log(`   Audio path: ${audioPath}`);
      
      // Store for potential replay via Play button
      currentAnnouncementAudioPath = audioPath;
      currentAnnouncementDisplayText = displayText;
      currentAnnouncementType = 'form';
      
      // Open display window if not already open or closed
      if (!displayWindow || displayWindow.closed) {
      }
      
      // Send text to display window
      setTimeout(() => {
        displayWindow.postMessage(displayText, '*');
      }, 300);
      
      // Play audio if available
      if (audioPath) {
        setTimeout(() => {
          playAudio(audioPath);
        }, 500);
      }
      return;
    }
    
    // Normal case: play Mind The Gap announcement
    selectedStation.currentMode = "mindTheGap";
    
    // Update PID display with Mind The Gap announcement state
    updatePIDDisplay(selectedStation.name, 'MTG');
    
    // Generate Mind The Gap announcement dynamically
    let displayText = selectedStation.name + "... Please mind the gap between the train and the platform.";
    let audioPath = getAnnouncementAudioPath(selectedStation.name, "mindTheGap");
    
    console.log(`🚪 [DOOR UNLOCK] Playing MTG for: ${selectedStation.name}`);
    console.log(`   Audio path: ${audioPath}`);

    // Store for potential replay via Play button
    currentAnnouncementAudioPath = audioPath;
    currentAnnouncementDisplayText = displayText;
    currentAnnouncementType = 'MTG';

    // Open display window if not already open or closed
    if (!displayWindow || displayWindow.closed) {
    }

    // Send text to display window
    setTimeout(() => {
      displayWindow.postMessage(displayText, '*');
    }, 300);
    
    // Play audio if available
    if (audioPath) {
      setTimeout(() => {
        playAudio(audioPath);
      }, 500); // Small delay to ensure display window is ready
    }
  }

  // Doors Unlock button event (if button exists)
  const doorsBtn = document.getElementById("doors-btn");
  if (doorsBtn) doorsBtn.addEventListener("click", doorsUnlock);

  // Timers for door cycle sequence
  let doorCycleSequenceTimer1 = null; // 10 second wait timer
  let doorCycleSequenceTimer2 = null; // 20 second wait timer
  let doorLockInProgress = false; // Flag to prevent overlapping timer setups
  
  // Helper function to clear all door cycle timers
  function clearDoorCycleTimers() {
    if (doorCycleSequenceTimer1) {
      clearTimeout(doorCycleSequenceTimer1);
      doorCycleSequenceTimer1 = null;
    }
    if (doorCycleSequenceTimer2) {
      clearTimeout(doorCycleSequenceTimer2);
      doorCycleSequenceTimer2 = null;
    }
    doorLockInProgress = false; // Reset lock flag when clearing
  }

  // Global variables for automatic progression
  let stationProgressTimer = null;
  let announcementTimer = null;
  let waitingForDoorCycleToPlayMindTheGap = false;

  // Function to clear all timers
  function clearProgressTimers() {
    if (stationProgressTimer) {
      clearTimeout(stationProgressTimer);
      stationProgressTimer = null;
    }
    if (announcementTimer) {
      clearTimeout(announcementTimer);
      announcementTimer = null;
    }
  }

  // Function to select next station automatically (skipping skipped stations)
  function selectNextStation() {
    if (!currentStations.length || !selectedStation) return;

    const currentIndex = currentStations.findIndex(station => station === selectedStation);
    if (currentIndex >= 0 && currentIndex < currentStations.length - 1) {
      // Find next non-skipped station
      let nextIndex = currentIndex + 1;
      while (nextIndex < currentStations.length && currentStations[nextIndex].skipped) {
        nextIndex++;
      }

      if (nextIndex < currentStations.length) {
        const nextStation = currentStations[nextIndex];
        selectedStation = nextStation;
        selectedStation.currentMode = "next";
        currentHighlightIndex = nextIndex;

        // Update UI to show selected station
        document.querySelectorAll("#station-list li").forEach((el) => el.classList.remove("selected"));
        const stationElements = document.querySelectorAll("#station-list li");
        if (stationElements[nextIndex]) {
          stationElements[nextIndex].classList.add("selected");
        }

        // Update skip button
        updateSkipButton();

        // Keep the station list scrolled to the page containing the newly selected station
        currentStationPage = Math.floor(nextIndex / STATION_ITEMS_PER_PAGE);
        updateStationDisplayPage();

        // Update closest station in auto-adapt mode (door timer progression)
        if (!manualClosestStationMode) {
          closestStationIndex = nextIndex;
          renderStations(currentStations);
          updateClosestStationTag();
        }
      }
    }
  }

  // Function to play next station announcement automatically
  function playNextAnnouncement() {
    if (selectedStation && selectedStation.currentMode === "next") {
      playBtn.click();
    }
  }
  
  function doorsLock() {
    // Send IPC message to sync HMI-O door state
    try {
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('door-lock');
    } catch (e) {
      // Running in browser context, no IPC available
    }
    
    // Update door cycle indicator (always, regardless of station selection)
    if (doorCycleDisplay) doorCycleDisplay.textContent = 'N';
    
    // Clear PID indicator and announcement state
    if (pidDisplay) pidDisplay.textContent = '-';
    currentAnnouncementAudioPath = null;
    currentAnnouncementDisplayText = null;
    currentAnnouncementType = null;
    currentAnnouncementStation = null;
    
    // Update remote state
    if (typeof updateAppState === 'function') {
      updateAppState({ doorCycle: 'N', announcement: null, announcementClearedAt: Date.now() });
    }
    
    // Clear any existing timers
    if (cctvDisplayTimer) clearTimeout(cctvDisplayTimer);
    
    // If CCTV panel is currently visible, exit it with 5 second delay
    const isCctvVisible = !cctvPanel.classList.contains('hide');
    if (isCctvVisible && selectedStation) {
      cctvDisplayTimer = setTimeout(() => {
        // Hide CCTV panel
        cctvPanel.classList.add('hide');
        document.body.classList.remove('cctv-active');
        if (cctvFooterTopGap) cctvFooterTopGap.classList.add('hide');
        cctvFooter.classList.add('hide');
        
        // Show header and header row 2
        const header = document.querySelector('.header');
        const headerRow2 = document.querySelector('.header-row-2');
        if (header) header.classList.remove('hide');
        if (headerRow2) headerRow2.classList.remove('hide');
        
        // Reset loading overlays for next time
        for (let i = 1; i <= 4; i++) {
          const loading = document.getElementById(`camera-loading-${i}`);
          if (loading) loading.classList.remove('hidden');
        }
        
        // Show main panel and normal footer
        mainPanel.classList.remove('hide');
        startupFooter.classList.add('hide');
        stationFooter.classList.add('hide');
        fnFooter.classList.add('hide');
        statusFooter.classList.add('hide');
        normalFooter.classList.remove('hide');
        helperBar.classList.remove('hide');
        helperBar.textContent = 'Use Up/Down to navigate. Play to announce.';
      }, 5000); // 5 second delay before hiding CCTV
    }
    
    // Mark doors as cycled (unlock->lock complete)
    doorsCycled = true;
    
    // If no station selected, just update the indicator and return
    if (!selectedStation) {
      return;
    }
    
    // Clear display window
    if (displayWindow && !displayWindow.closed) {
      displayWindow.postMessage({ type: 'RESET' }, '*');
    }
    
    // Clear any existing timers
    clearProgressTimers();

    // TSW live mode replaces timer progression with distance-based triggers.
    if (tswLiveModeActive) {
      console.log('📡 [TSW] Live mode active - skipping timer-based station progression');
      return;
    }
    
    // Set timer to select next station after 10 seconds
    stationProgressTimer = setTimeout(() => {
      selectNextStation();
      
      // Set timer to play next station announcement after 30 seconds total
      announcementTimer = setTimeout(() => {
        playNextAnnouncement();
      }, 20000); // 20 more seconds (10 + 20 = 30 total)
    }, 10000); // 10 seconds
  }

  // Doors Lock button event (if button exists)
  const doorsLockBtn = document.getElementById("doors-lock-btn");
  if (doorsLockBtn) doorsLockBtn.addEventListener("click", doorsLock);

  // Common reset function
  function resetAll() {
    // Clear any door cycle sequence timers
    clearDoorCycleTimers();
    stopTSWAutomation();
    resetTSWAutomationState();
    currentManualRoute = null;
    currentManualFormFile = null;
    
    // Reset door cycle state
    doorsCycled = false;
    
    // Reset UI state
    runInput.value = '';
    routeConfirmed = false;
    if (routeHardwareTimer) {
      clearTimeout(routeHardwareTimer);
      routeHardwareTimer = null;
    }
    if (routeHeader) routeHeader.classList.remove('route-hardware-delay');
    runNumberDisplay.textContent = '_ _ _ _';
    runError.textContent = '';
    selectedStation = null;
    stationSelectionConfirmed = false;
    currentDestination = null;
    currentDestinationStation = null; // Reset global
    currentStation = null;
    currentStations = [];
    currentHighlightIndex = 0;
    renderStations(currentStations);
    updateNormalUpButtonLabel();
    
    // Reset PID and DI displays
    if (pidDisplay) pidDisplay.textContent = '-';
    if (diDisplay) diDisplay.textContent = '-';
    updateRouteInputUI();
    updateRouteDisplay();
    
    // Force the app back to the normal startup/keyboard screen so it cannot get stuck blank
    showKeyboardMode();
    
    // Reset display window
    if (displayWindow && !displayWindow.closed) {
      displayWindow.postMessage({ type: 'RESET' }, '*');
    }
    // Reset destination board
    if (destinationWindow && !destinationWindow.closed) {
      destinationWindow.postMessage({ type: 'RESET' }, '*');
    }
  }

  // Service Selection Button
  const servSelBtn = document.getElementById("serv-sel-btn");
  const servicePanel = document.getElementById("service-selection-panel");
  const serviceList = document.getElementById("service-list");
  const serviceCloseBtn = document.getElementById("service-selection-close");
  const serviceSearchInput = document.getElementById("service-search-input");
  
  let allServices = []; // Store all available services
  
  function populateServiceList(searchTerm = '') {
    document.getElementById("service-list").innerHTML = ''; // Clear existing list
    
    // Get all unique routes from GTFS data
    if (!globalGTFSData || !globalGTFSData.routes) {
      const li = document.createElement('li');
      li.style.cssText = 'padding: 15px; text-align: center; color: #888; background: #111;';
      li.textContent = 'No services available';
      document.getElementById("service-list").appendChild(li);
      return;
    }
    
    const routesByCode = {};
    
    // Group routes by their short name (route code) and get origin/destination info
    for (const [routeId, routeData] of Object.entries(globalGTFSData.routes)) {
      const routeCode = routeData.route_name || routeId.split('-')[0];
      const fullRouteId = routeId;
      
      if (!routesByCode[routeCode]) {
        routesByCode[routeCode] = {
          code: routeCode,
          fullId: fullRouteId,
          origin: '',
          destination: '',
          variants: []
        };
      }
      
      // Get origins and destinations from patterns
      if (routeData.patterns && Array.isArray(routeData.patterns)) {
        routeData.patterns.forEach((pattern, idx) => {
          if (pattern.stops && pattern.stops.length > 0) {
            const orig = pattern.stops[0].name;
            const dest = pattern.destination || pattern.stops[pattern.stops.length - 1].name;
            
            if (idx === 0) {
              routesByCode[routeCode].origin = orig;
              routesByCode[routeCode].destination = dest;
            }
            
            routesByCode[routeCode].variants.push({
              destination: dest,
              origin: orig
            });
          }
        });
      }
    }
    
    // Convert to array and filter by search term
    const servicesList = Object.values(routesByCode)
      .sort((a, b) => a.code.localeCompare(b.code))
      .filter(service => {
        const searchLower = searchTerm.toLowerCase();
        const searchText = `${service.code} ${service.origin} ${service.destination}`.toLowerCase();
        return searchText.includes(searchLower);
      });
    
    // Render filtered list
    if (servicesList.length === 0) {
      const li = document.createElement('li');
      li.style.cssText = 'padding: 15px; text-align: center; color: #888; background: #111;';
      li.textContent = 'No matching services';
      document.getElementById("service-list").appendChild(li);
      return;
    }
    
    servicesList.forEach((service, idx) => {
      const li = document.createElement('li');
      
      // Format: "FGBN - Ferny Grove - Beenleigh"
      const displayText = `${service.code} - ${service.origin} - ${service.destination}`;
      
      li.textContent = displayText;
      li.title = `Route: ${service.code}\nOrigin: ${service.origin}\nDestination: ${service.destination}`;
      
      li.addEventListener('click', () => {
        // Select this service's route code
        runInput.value = service.code + '1'; // Default to first digit
        closeServicePanel();
        console.log(`✅ Service selected: ${service.code}`);
      });
      
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          runInput.value = service.code + '1';
          closeServicePanel();
        }
      });
      
      document.getElementById("service-list").appendChild(li);
    });
  }
  
  // Electron global keyboard shortcuts (only in Electron environment)
  if (typeof require !== 'undefined') {
    try {
      const { ipcRenderer } = require('electron');
      
      console.log('🎯 [RENDERER] Setting up global key listener...');
      
      // Listen for global keyboard events from main process
      ipcRenderer.on('global-key', (event, key) => {
        if (gpsModeEnabled) return;
        console.log(`🔑 [RENDERER] Global key pressed: ${key}`);
        
        switch(key) {
          case '3':
            console.log('🔓 [RENDERER] Triggering doorsUnlock()');
            doorsUnlock(); // Unlock doors
            break;
          case '4':
            console.log('📢 [RENDERER] Triggering playArrivalAnnouncement()');
            if (typeof playArrivalAnnouncement === 'function') {
              playArrivalAnnouncement();
            }
            break;
          case '6':
            console.log('🔒 [RENDERER] Triggering doorsLock()');
            doorsLock(); // Trigger door lock
            break;
          case '7':
            console.log('📣 [RENDERER] Advancing DVA selection');
            document.getElementById('normal-down-btn')?.click();
            break;
          default:
            console.log(`⚠️ [RENDERER] Unmapped key: ${key}`);
        }
      });
      
      console.log('✅ [RENDERER] Global key listener ready');
    } catch (e) {
      console.error('❌ [RENDERER] Error setting up keyboard listener:', e);
      console.log('Not running in Electron environment');
    }
  } else {
    console.log('⚠️ [RENDERER] require is not available - Electron not detected');
  }

  // Local keyboard shortcuts (for when app is focused)
  // Function to play arrival announcement
  function playArrivalAnnouncement() {
    console.log('🔊 Playing arrival announcement for selected station');

    if (isMtgOnlyRoute(currentRouteFormCode)) {
      console.log('✗ NAA is disabled for this route');
      return;
    }
    
    if (!selectedStation) {
      console.log('✗ No station selected');
      return;
    }

    // Update PID display with arrival state
    updatePIDDisplay(selectedStation.name, 'NAA');
    
    const displayText = `Now arriving at ${selectedStation.name}`;
    const audioPath = getPatternAnnouncementAudioPath(selectedStation, 'arrival')
      || getAnnouncementAudioPath(selectedStation.name, 'arrival');
    
    console.log(`  Station: ${selectedStation.name}`);
    console.log(`  Audio path: ${audioPath}`);
    
    // Store for potential replay via Play button
    currentAnnouncementAudioPath = audioPath;
    currentAnnouncementDisplayText = displayText;
    currentAnnouncementType = 'NAA';
    isPlayingArrivalAnnouncement = true; // Set flag to indicate we're playing an arrival announcement
    console.log(`  ✅ isPlayingArrivalAnnouncement set to TRUE - shouldPlayExitButtons=${shouldPlayExitButtons}`);
    
    // Open display window if not already open or closed
    if (!displayWindow || displayWindow.closed) {
    }

    // Send text to display window with proper DI format
    setTimeout(() => {
      displayWindow.postMessage({
        type: 'DI',
        destination: displayText,
        customText: '',
        useCustomText: false,
        scroller: false,
        persistent: true
      }, '*');
    }, 300);
    
    // Play audio if available
    if (audioPath) {
      setTimeout(() => {
        playAudio(audioPath);
      }, 500);
    }
  }

  // Global keyboard listener disabled - using Python keyboard_listener.py instead
  // This prevents duplicate key presses when both Electron and Python listeners are active
  /*
  document.addEventListener('keydown', function(event) {
    // Send ALL key presses to Flask backend for HMI-C remote interface
    const keyInfo = {
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      timestamp: Date.now()
    };
    
    console.log(`🔑 Global Keyboard Listener: Key pressed: ${event.key} (keyCode: ${event.keyCode})`);
    
    // POST key press to Flask backend
    fetch('http://localhost:5000/api/key-press', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(keyInfo)
    })
    .then(response => {
      if (response.ok) {
        console.log(`📤 Key sent to Flask backend:`, keyInfo);
      } else {
        console.warn(`⚠️ Flask backend returned error:`, response.status);
      }
    })
    .catch(err => {
      console.error(`❌ Failed to send key to Flask:`, err);
    });
    
    // Prevent default for all keys to ensure only remote processing
    event.preventDefault();
  });
  */

  // Day Selector Toggle Functionality
  const dayButtons = document.querySelectorAll('.day-btn');
  const mfBtn = document.getElementById('mf-btn');
  const satBtn = document.getElementById('sat-btn');
  const sunBtn = document.getElementById('sun-btn');
  const holidayBtn = document.getElementById('holiday-btn');
  let daySelectionWasManuallyChanged = false;
  window.daySelectionWasManuallyChanged = false;

  function setSelectedDayButton(button) {
    if (!button) return;

    dayButtons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    daySelectionWasManuallyChanged = true;
    window.daySelectionWasManuallyChanged = true;
    gtfsCache.clear();
    currentGTFSTrip = null;

    if (typeof updateRouteDisplay === 'function') {
      updateRouteDisplay();
    }
  }
  
  // Auto-select day based on current date
  function selectCurrentDay() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1-5 = Mon-Fri, 6 = Saturday

    dayButtons.forEach(btn => btn.classList.remove('selected'));

    let selectedDayButton = null;
    if (globalGTFSData && globalGTFSData.calendarDates) {
      const dateKey = now.toISOString().slice(0, 10).replace(/-/g, '');
      const holidayServiceIds = Object.keys(globalGTFSData.calendarDates || {}).filter(serviceId => {
        const entries = globalGTFSData.calendarDates[serviceId] || [];
        return entries.some(entry => String(entry.date) === String(dateKey) && Number(entry.exception_type) === 1);
      });
      if (holidayServiceIds.length > 0) {
        selectedDayButton = holidayBtn;
      }
    }

    if (!selectedDayButton) {
      if (dayOfWeek === 0) {
        selectedDayButton = sunBtn;
      } else if (dayOfWeek === 6) {
        selectedDayButton = satBtn;
      } else {
        selectedDayButton = mfBtn;
      }
    }

    if (selectedDayButton) {
      selectedDayButton.classList.add('selected');
      daySelectionWasManuallyChanged = false;
      window.daySelectionWasManuallyChanged = false;
    }
  }
  
  // Select current day on load
  selectCurrentDay();
  
  dayButtons.forEach(button => {
    button.addEventListener('click', function() {
      setSelectedDayButton(this);
    });
  });

  // Touch Keyboard Functionality
  const runNumberInput = document.getElementById('run-number');
  // Only select keyboard buttons from the MAIN touch keyboard, not from station code keyboard
  const keyboardButtons = document.querySelectorAll('#touch-keyboard.touch-keyboard .key-btn');
  const routeDisplay = document.getElementById('run-number-display');
  const routePreview = document.getElementById('route-preview');
  const backBtn = document.getElementById('back-btn');
  const routeHeader = document.getElementById('header-route');
  let routeConfirmed = false;
  let routeHardwareTimer = null;

  function simulateRouteHardwareDelay() {
    if (!routeHeader) return;
    if (routeHardwareTimer) clearTimeout(routeHardwareTimer);
    routeHeader.classList.add('route-hardware-delay');
    routeHardwareTimer = setTimeout(() => {
      routeHeader.classList.remove('route-hardware-delay');
      routeHardwareTimer = null;
    }, 250 + Math.floor(Math.random() * 451));
  }
  
  // Official Queensland Rail station codes
  const stationAbbreviations = {
    // A
    'Airport Junction': 'AJN',
    'Albion': 'AIN',
    'Alderley': 'ADY',
    'Altandi': 'ATI',
    'Allocations Roster': 'ALR',
    'Ascot': 'ACO',
    'Auchenflower': 'AHF',
    // B
    'Bald Hills': 'BDS',
    'Banoon': 'BQO',
    'Banyo': 'BQY',
    'Banyo Yard': 'BYY',
    'Beenleigh': 'BNH',
    'Beenleigh Yard': 'BNY',
    'Beenleigh Middle Road': 'BNT',
    'Beerburrum': 'BEB',
    'Beerwah': 'BWH',
    'Bethania': 'BTI',
    'Bindha': 'BHA',
    'Birkdale': 'BDE',
    'Boondall': 'BZL',
    'Booval': 'BOV',
    'Bowen Hills': 'BHI',
    'Box Flat': 'BOX',
    'Bray Park': 'BPR',
    'Bundamba': 'BDX',
    'Buranda': 'BRD',
    'Burpengary': 'BPY',
    'Brisbane Domestic Terminal': 'BDT',
    // C
    'Caboolture': 'CAB',
    'Caboolture Yard': 'CAY',
    'Campbell Street': 'CAM',
    'Cannon Hill': 'CNQ',
    'Carseldine': 'CDE',
    'Central': 'BNC',
    'Chelmer': 'CMZ',
    'Clapham': 'CPM',
    'Clayfield': 'CYF',
    'Cleveland': 'CVN',
    'Coomera': 'CXM',
    'Coopers Plains': 'CEP',
    'Cooran': 'COZ',
    'Cooroy': 'COO',
    'Coorparoo': 'CRO',
    'Corinda': 'CQD',
    // D
    'Dakabin': 'DKB',
    'Darra': 'DAR',
    'Deagon': 'DEG',
    'Dinmore': 'DIR',
    'Domestic Terminal': 'BDT',
    'Domestic Airport': 'BDT',
    'Doomben': 'DBN',
    'Dutton Park': 'DUP',
    // E
    'Eagle Junction': 'EGJ',
    'East Ipswich': 'EIP',
    'Ebbw Vale': 'EBV',
    'Edens Landing': 'EDL',
    'Mayne Complex - Balloon': 'ETB',
    'Mayne Complex - Fly Over': 'ETF',
    'Mayne Complex - South': 'ETS',
    'Elimbah': 'EMH',
    'Elimbah Yard': 'EMY',
    'Ellen Grove': 'EGE',
    'Enoggera': 'EGG',
    'Eudlo': 'EUD',
    'Eumundi': 'EUM',
    'Exhibition': 'EXH',
    // F
    'Fairfield': 'FFI',
    'Ferny Grove': 'FYG',
    "Fisherman's Island": 'FIS',
    'Fortitude Valley': 'BRC',
    'Fruitgrove': 'FTG',
    // G
    'Gailes': 'GAI',
    'Gaythorne': 'GAO',
    'Geebung': 'GEB',
    'Glanmire': 'GMR',
    'Glass House Mtns': 'GSS',
    'Glass House Mountains': 'GSS',
    'Goodna': 'GDQ',
    'Graceville': 'GVQ',
    'Grovely': 'GOQ',
    'Gympie North': 'GYN',
    'Gympie North Yard': 'GYY',
    // H
    'Helensvale': 'HLN',
    'Hemmant': 'HMM',
    'Hendra': 'HDR',
    'Holmview': 'HVW',
    // I
    'Indooroopilly': 'IDP',
    'International Terminal': 'BIT',
    'International Airport': 'BIT',
    'Ipswich': 'IPS',
    'Ipswich Yard': 'IPY',
    'Ipswich Workshops': 'IPW',
    // K
    'Kallangur': 'KGR',
    'Karrabin': 'KRA',
    'Keperra': 'KEP',
    'Kingston': 'KGT',
    'Kippa-Ring Yard': 'KPY',
    'Kippa-Ring': 'KPR',
    'Kuraby': 'KRY',
    // L
    'Landsborough': 'LSH',
    'Lawnton': 'LWO',
    'Lindum': 'LDM',
    'Loganlea': 'LGL',
    'Lota': 'LOT',
    'Lytton Junction': 'LJN',
    // M
    'Mango Hill': 'MGH',
    'Mango Hill East': 'MGE',
    'Manly': 'MNY',
    'Maryborough': 'MBJ',
    'Mayne': 'MNE',
    'Mayne Junction': 'MYJ',
    'Mayne Complex - Diesel Locomotive Prov Shed': 'DLP',
    'Electric Train Depot': 'ETD',
    'Old Mayne Yard': 'MYD',
    'Milton': 'MTZ',
    'Mitchelton': 'MHQ',
    'Moolabin': 'MBN',
    'Mooloolah': 'MOH',
    'Moorooka': 'MQK',
    'Morayfield': 'MYE',
    'Morningside': 'MGS',
    'Murarrie': 'MJE',
    'Murrumba Downs': 'MRD',
    // N
    'Nambour': 'NBR',
    'Nambour Yard': 'NBS',
    'Narangba': 'NRB',
    'Nerang': 'NRG',
    'Newmarket': 'NWM',
    'Norman Park': 'NPR',
    'Normanby': 'NBY',
    'Normanby Car Wash': 'NCW',
    'North Boondall': 'NBD',
    'Northgate': 'NTG',
    'Nudgee': 'NUD',
    'Nundah': 'NND',
    // O
    'Ormeau': 'ORM',
    'Ormiston': 'ORO',
    'Oxford Park': 'OXP',
    'Oxley': 'OXL',
    // P
    'Palmwoods': 'PAL',
    'Park Road': 'PKR',
    'Petrie': 'PET',
    'Petrie Yard': 'PEY',
    'Pinkenba': 'PNK',
    'Pomona': 'PMQ',
    // R
    'Redbank': 'RDK',
    'Redbank Workshops': 'RKW',
    'Redbank Yard': 'RDY',
    'Richlands': 'RHD',
    'Riverview': 'RVV',
    'Robina': 'ROB',
    'Robina Yard': 'ROY',
    'Rocklea': 'RKE',
    'Rocklea Siding': 'RKY',
    'Roma Street': 'RST',
    'Rosewood': 'RSW',
    'Rothwell': 'RWL',
    'Runcorn': 'RUC',
    // S
    'Salisbury': 'SLY',
    'Sandgate': 'SGE',
    'Sherwood': 'SHW',
    'Shorncliffe': 'SHC',
    'Shorncliffe Dead End': 'SHT',
    'South Bank': 'SBA',
    'South Brisbane': 'SBE',
    'Springfield': 'SFD',
    'Springfield Central': 'SFC',
    'Strathpine': 'SPN',
    'Sunnybank': 'SYK',
    'Sunrise': 'SSE',
    'Sunshine': 'SSN',
    // T
    'Taringa': 'TIQ',
    'Tennyson': 'TNY',
    'Thagoona': 'TAO',
    'Thomas Street': 'THS',
    'Thorneside': 'TNS',
    'Toombul': 'TBU',
    'Toowong': 'TWG',
    'Traveston': 'TRA',
    'Trinder Park': 'TDP',
    // V
    'Varsity Lakes': 'VYS',
    'Varsity Lakes Dead End': 'VYT',
    'Virginia': 'VGI',
    // W
    'Wacol': 'WAC',
    'Walloon': 'WOQ',
    'Wellington Point': 'WPT',
    'Wilston': 'WLQ',
    'Windsor': 'WID',
    'Woodridge': 'WOI',
    'Wooloowin': 'WWI',
    'Woombye': 'WOB',
    'Woombye Yard': 'WOY',
    'Woondum': 'WOO',
    'Wulkuraka': 'WUL',
    'Wulkuraka Yard': 'WUY',
    'Wynnum': 'WNM',
    'Wynnum Central': 'WNC',
    'Wynnum North': 'WYH',
    // Y
    'Yandina': 'YAN',
    'Yeerongpilly': 'YLY',
    'Yeronga': 'YRG',
    // Z
    'Zillmere': 'ZLL'
  };

  let stationCodeOverrides = {};
  fetch('./station-codes.json')
    .then(response => response.ok ? response.json() : {})
    .then(codes => {
      stationCodeOverrides = codes && typeof codes === 'object' ? codes : {};
      updateRouteDisplay();
    })
    .catch(() => {});
  
  function getStationAbbrev(stationName) {
    const originalName = String(stationName || '').trim();
    const normalizedName = normalizeStationName(originalName).replace(/\s+/g, ' ').trim();
    const findCode = (mapping) => {
      const target = normalizedName.toLowerCase();
      const match = Object.entries(mapping).find(([name]) => name.toLowerCase() === target);
      return match ? match[1] : null;
    };

    return findCode(stationCodeOverrides)
      || findCode(stationAbbreviations)
      || normalizedName.substring(0, 3).toUpperCase();
  }

  function getGtfsPreviewPattern(routeData, runCode) {
    const patterns = Array.isArray(routeData?.patterns) ? routeData.patterns : [];
    if (patterns.length === 0) return null;

    return patterns.find(pattern => String(pattern.form_code || '').toUpperCase() === runCode)
      || patterns[0];
  }

  function getRouteDataForRunCode(runCode) {
    const upperCode = String(runCode || '').toUpperCase();
    if (runCodeIndex?.[upperCode]) return runCodeIndex[upperCode];

    if (globalGTFSData?.tripIdMap && globalGTFSData.routes) {
      for (const [tripId, routeId] of Object.entries(globalGTFSData.tripIdMap)) {
        if (tripId.toUpperCase().includes(upperCode) && globalGTFSData.routes[routeId]) {
          return globalGTFSData.routes[routeId];
        }
      }
    }

    return null;
  }

  function getPreviewStationKey(stationName) {
    return normalizeStationName(String(stationName || ''))
      .replace(/\b(st)\b/gi, 'street')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function getTopologyNetworkPath(startKey, endKey) {
    const graph = new Map();
    const stationNames = new Map();
    const addEdge = (from, to) => {
      if (!graph.has(from)) graph.set(from, new Set());
      graph.get(from).add(to);
    };

    routeTopologyPaths.forEach(path => {
      const stations = Array.isArray(path.stations) ? path.stations : [];
      stations.forEach(station => {
        const key = getPreviewStationKey(station);
        stationNames.set(key, station);
      });
      for (let index = 1; index < stations.length; index++) {
        const previousKey = getPreviewStationKey(stations[index - 1]);
        const currentKey = getPreviewStationKey(stations[index]);
        addEdge(previousKey, currentKey);
        addEdge(currentKey, previousKey);
      }
    });

    if (!graph.has(startKey) || !graph.has(endKey)) return null;

    const queue = [startKey];
    const previous = new Map([[startKey, null]]);
    for (let index = 0; index < queue.length; index++) {
      const currentKey = queue[index];
      if (currentKey === endKey) break;
      for (const nextKey of graph.get(currentKey) || []) {
        if (!previous.has(nextKey)) {
          previous.set(nextKey, currentKey);
          queue.push(nextKey);
        }
      }
    }

    if (!previous.has(endKey)) return null;
    const pathKeys = [];
    for (let key = endKey; key !== null; key = previous.get(key)) {
      pathKeys.push(key);
    }
    return pathKeys.reverse().map(key => stationNames.get(key) || key);
  }

  function getTopologyPath(selectedStops) {
    if (!routeTopologyPaths.length || selectedStops.length === 0) return null;

    const firstKey = getPreviewStationKey(selectedStops[0].name);
    const lastKey = getPreviewStationKey(selectedStops[selectedStops.length - 1].name);
    for (const path of routeTopologyPaths) {
      const stations = Array.isArray(path.stations) ? path.stations : [];
      if (stations.length === 0) continue;

      const stationKeys = stations.map(getPreviewStationKey);
      const firstIndex = stationKeys.indexOf(firstKey);
      const lastIndex = stationKeys.lastIndexOf(lastKey);
      if (firstIndex >= 0 && lastIndex > firstIndex) {
        return stations.slice(firstIndex, lastIndex + 1).map(name => ({ name }));
      }

      const reverseStartIndex = stationKeys.indexOf(lastKey);
      const reverseEndIndex = stationKeys.lastIndexOf(firstKey);
      if (reverseStartIndex >= 0 && reverseEndIndex > reverseStartIndex) {
        return stations.slice(reverseStartIndex, reverseEndIndex + 1).reverse().map(name => ({ name }));
      }
    }

    const networkPath = getTopologyNetworkPath(firstKey, lastKey);
    if (networkPath) return networkPath.map(name => ({ name }));

    const reverseNetworkPath = getTopologyNetworkPath(lastKey, firstKey);
    if (reverseNetworkPath) return reverseNetworkPath.reverse().map(name => ({ name }));

    return null;
  }

  function getGtfsStoppingPreview(routeData, selectedPattern) {
    const selectedStops = Array.isArray(selectedPattern?.stops) ? selectedPattern.stops : [];
    if (selectedStops.length === 0) return 'ALL STATIONS';

    const selectedKeys = new Set(selectedStops.map(stop => getPreviewStationKey(stop.name)));
    const topologyStops = getTopologyPath(selectedStops);
    const fullPattern = topologyStops
      ? { stops: topologyStops }
      : (routeData.patterns || [])
        .filter(pattern => Array.isArray(pattern.stops) && pattern.stops.length >= selectedStops.length)
        .filter(pattern => {
          const stops = pattern.stops;
          return stops[0] && stops[stops.length - 1]
            && getPreviewStationKey(stops[0].name) === getPreviewStationKey(selectedStops[0].name)
            && getPreviewStationKey(stops[stops.length - 1].name) === getPreviewStationKey(selectedStops[selectedStops.length - 1].name);
        })
        .sort((left, right) => right.stops.length - left.stops.length)[0];

    if (!fullPattern || fullPattern.stops.every(stop => selectedKeys.has(getPreviewStationKey(stop.name)))) {
      return 'ALL STATIONS';
    }

    const expressSegments = [];
    let skippedStart = null;
    for (let index = 0; index < fullPattern.stops.length; index++) {
      const stop = fullPattern.stops[index];
      const stopKey = getPreviewStationKey(stop.name);
      if (!selectedKeys.has(stopKey) && skippedStart === null) {
        skippedStart = index - 1;
      }

      const isLastStop = index === fullPattern.stops.length - 1;
      if (skippedStart !== null && (selectedKeys.has(stopKey) || isLastStop)) {
        const endIndex = selectedKeys.has(stopKey) ? index : index + 1;
        const startStop = fullPattern.stops[Math.max(0, skippedStart)];
        const endStop = fullPattern.stops[Math.min(fullPattern.stops.length - 1, endIndex)];
        if (startStop && endStop) {
          expressSegments.push(`${getStationAbbrev(startStop.name)}-${getStationAbbrev(endStop.name)}`);
        }
        skippedStart = null;
      }
    }

    return expressSegments.length > 0 ? `EXP ${expressSegments.join('-')}` : 'ALL STATIONS';
  }

  function getManualRouteStationKeys(manualRoute) {
    const stations = Array.isArray(manualRoute?.stations)
      ? manualRoute.stations
      : [manualRoute?.stations || ''];
    return stations
      .flatMap(station => typeof station === 'string' ? station.split(/\r?\n|\\n/) : [station?.name])
      .map(station => getPreviewStationKey(station))
      .filter(Boolean);
  }

  function getMatchingManualRoute(selectedPattern) {
    const gtfsStops = Array.isArray(selectedPattern)
      ? selectedPattern
      : (Array.isArray(selectedPattern?.stops) ? selectedPattern.stops : []);
    const gtfsKeys = gtfsStops.map(stop => getPreviewStationKey(stop.name)).filter(Boolean);
    if (gtfsKeys.length === 0) return null;

    return manualRouteEntries.find(manualRoute => {
      if (manualRoute.excludeAutomaticMatch) return false;
      const manualKeys = getManualRouteStationKeys(manualRoute);
      return manualKeys.length === gtfsKeys.length
        && manualKeys.every((key, index) => key === gtfsKeys[index]);
    }) || null;
  }

  function getBestMatchingManualRoute(selectedPattern) {
    const exactMatch = getMatchingManualRoute(selectedPattern);
    if (exactMatch) return exactMatch;

    const gtfsStops = Array.isArray(selectedPattern)
      ? selectedPattern
      : (Array.isArray(selectedPattern?.stops) ? selectedPattern.stops : []);
    const gtfsKeys = gtfsStops.map(stop => getPreviewStationKey(stop.name)).filter(Boolean);
    if (gtfsKeys.length < 2) return null;

    const gtfsKeySet = new Set(gtfsKeys);
    const firstGtfsKey = gtfsKeys[0];
    const lastGtfsCode = getStationAbbrev(gtfsStops[gtfsStops.length - 1].name);
    const candidates = manualRouteEntries.filter(manualRoute => !manualRoute.excludeAutomaticMatch).map(manualRoute => {
      const manualKeys = getManualRouteStationKeys(manualRoute);
      const titleMatch = String(manualRoute.name || '').match(/^[^-]+-([A-Z0-9]+)/i);
      const overlap = manualKeys.filter(key => gtfsKeySet.has(key)).length;
      const startsAtSameStation = manualKeys[0] === firstGtfsKey;
      const hasMatchingDestinationCode = titleMatch
        && titleMatch[1].toUpperCase() === lastGtfsCode;
      return {
        manualRoute,
        overlap,
        startsAtSameStation,
        hasMatchingDestinationCode
      };
    });

    const best = candidates
      .filter(candidate => candidate.startsAtSameStation && candidate.hasMatchingDestinationCode)
      .sort((left, right) => {
        const leftScore = left.overlap + (left.hasMatchingDestinationCode ? 100 : 0);
        const rightScore = right.overlap + (right.hasMatchingDestinationCode ? 100 : 0);
        return rightScore - leftScore;
      })[0];

    return best?.manualRoute || null;
  }

  function logMatchingManualRoutes(gtfsData) {
    if (manualRouteMatchesLogged || !gtfsData?.routes || manualRouteEntries.length === 0) return;
    manualRouteMatchesLogged = true;

    let matchCount = 0;
    console.log('🔎 Comparing GTFS stopping patterns with Manual Mode routes...');
    Object.entries(gtfsData.routes).forEach(([routeId, routeData]) => {
      const routeCode = routeId.split('-')[0].toUpperCase();
      (Array.isArray(routeData.patterns) ? routeData.patterns : []).forEach(pattern => {
        const manualRoute = getBestMatchingManualRoute(pattern);
        if (manualRoute) {
          matchCount++;
          console.log(`✅ GTFS ${routeCode} (${pattern.form_code || 'pattern'}) matches Manual Mode: ${manualRoute.name}`);
        }
      });
    });
    console.log(`📊 Manual Mode route matching complete: ${matchCount} GTFS pattern match${matchCount === 1 ? '' : 'es'}`);
  }

  // ==================== Express Route Patterns ====================
  // Add express patterns here. Format: 'RUN_CODE': 'pattern description'
  // Pattern format examples:
  //   'EXP MLT-INR' = Express from Milton to Indooroopilly
  //   'EXP MLT-INR,INR-DAR' = Express Milton-Indooroopilly, then Express Indooroopilly-Darra
  //   'EXP MGS-MNY' = Express from Morningside to Manly
  // 
  // You can also use line names as fallback patterns
  const expressPatterns = {
    // Rosewood Line
    'D6X2': 'EXP MLT-INR-DAR',  // Express Milton to Indooroopilly, then express to Darra
    '1E35': '(ALL STATIONS)',  // Express Milton to Indooroopilly, then express to Darra
    // Cleveland Line
    'D8X2': 'EXP MGS-MNY',  // Express Morningside to Manly
    
    // Add more routes here...
    // 'XXXX': 'EXP XXX-XXX',
  };
  
  // Fallback patterns by line (used if specific run code not found)
  const lineExpressPatterns = {
    'Rosewood': 'EXP MLT-DAR',
    'Cleveland': 'EXP MGS-MNY',
    'Ferny Grove': 'EXP',
    'Caboolture': 'EXP',
    'Sunshine Coast': 'EXP',
    'Gold Coast': 'EXP',
    'Beenleigh': 'EXP',
    'Springfield': 'EXP',
    'Airport': 'EXP',
    'Doomben': 'EXP',
    'Shorncliffe': 'EXP',
    'Redcliffe': 'EXP',
  };

  function updateRouteDisplay() {
    const value = runNumberInput.value;
    const routeLabel = document.getElementById('route-label');
    routeLabel.classList.toggle('route-confirmed', routeConfirmed);
    routeDisplay.classList.toggle('route-confirmed', routeConfirmed);
    routeDisplay.classList.remove('route-unknown');
    
    if (value.length === 0) {
      // Show "Route:" label and placeholder when no input
      if (routeLabel) routeLabel.style.display = 'inline';
      routeDisplay.textContent = '_ _ _ _';
      if (routePreview) routePreview.textContent = '';
    } else {
      // Keep the label visible while the route number is being entered.
      if (routeLabel) routeLabel.style.display = routeConfirmed ? 'none' : 'inline';
      
      // Show train number without spaces
      const trainNumber = value.toUpperCase();
      const missingCharacters = Math.max(0, 4 - value.length);
      const placeholders = missingCharacters === 1
        ? ' _'
        : '_'.repeat(missingCharacters).replace(/_/g, (character, index) => index === 0 ? character : ` ${character}`);
      routeDisplay.textContent = `${trainNumber}${placeholders}`;

      if (currentManualRoute?.name && routePreview) {
        const dayCode = getRoutePreviewDayCode();
        routePreview.textContent = routeConfirmed
          ? `${dayCode}-${currentManualRoute.name}`
          : `-${currentManualRoute.name}`;
        return;
      }
      
      // Show preview if we have a valid 4-character run code
      if (value.length === 4 && routePreview) {
        routePreview.textContent = '';

        const upperCode = value.toUpperCase();
        let routeData = null;
        
        // Try to find the route data using proper GTFS search logic
        // First try direct lookup in runCodeIndex
        if (runCodeIndex && runCodeIndex[upperCode]) {
          routeData = runCodeIndex[upperCode];
        } else if (globalGTFSData && globalGTFSData.tripIdMap) {
          // Search trip ID map for matching run code
          for (const [tripId, routeId] of Object.entries(globalGTFSData.tripIdMap)) {
            if (tripId.toUpperCase().includes(upperCode) && isTripServiceActiveForSelectedDay(tripId, globalGTFSData)) {
              if (globalGTFSData.routes && globalGTFSData.routes[routeId]) {
                routeData = globalGTFSData.routes[routeId];
                console.log(`✓ Found route data for ${upperCode}: ${routeId}`);
                break;
              }
            }
          }
        } else if (tripIdMap && Object.keys(tripIdMap).length > 0) {
          // Fallback to tripIdMap if globalGTFSData not available yet
          for (const [tripId, routeId] of Object.entries(tripIdMap)) {
            if (tripId.toUpperCase().includes(upperCode) && isTripServiceActiveForSelectedDay(tripId, globalGTFSData)) {
              if (runCodeIndex[routeId]) {
                routeData = runCodeIndex[routeId];
                console.log(`✓ Found route data for ${upperCode}: ${routeId}`);
                break;
              }
            }
          }
        }
        
        if (routeData) {
          const dayCode = getRoutePreviewDayCode();
          let firstStationCode = 'N/A';
          let lastStationCode = 'N/A';
          
          // Use the GTFS pattern for this form code, then derive skipped sections.
          const selectedPattern = getGtfsPreviewPattern(routeData, upperCode);
          const matchingManualRoute = getBestMatchingManualRoute(selectedPattern);
          if (matchingManualRoute?.name) {
            routePreview.textContent = routeConfirmed
              ? `${dayCode}-${matchingManualRoute.name}`
              : `-${matchingManualRoute.name}`;
            return;
          }
          if (selectedPattern?.stops && Array.isArray(selectedPattern.stops) && selectedPattern.stops.length > 0) {
            const firstStation = selectedPattern.stops[0];
            const lastStation = selectedPattern.stops[selectedPattern.stops.length - 1];
            firstStationCode = getStationAbbrev(firstStation.name);
            lastStationCode = getStationAbbrev(lastStation.name);
            console.log(`✓ Got GTFS stations: ${firstStationCode} to ${lastStationCode}`);
          }
          
          const stoppingPreview = getGtfsStoppingPreview(routeData, selectedPattern);
          const routeDescription = `${firstStationCode}-${lastStationCode} (${stoppingPreview})`;
          routePreview.textContent = routeConfirmed
            ? `${dayCode}-${routeDescription}`
            : `-${routeDescription}`;
        } else {
          routeDisplay.classList.add('route-unknown');
          routePreview.textContent = '[Not Known]';
          console.log(`⚠️  No route data found for ${upperCode}`);
        }
      } else if (routePreview) {
        routePreview.textContent = '';
      }
    }
  }

  // Back button acts as backspace
  if (backBtn) {
    backBtn.addEventListener('click', function(event) {
      event.preventDefault();
      const currentValue = runNumberInput.value;
      runNumberInput.value = currentValue.slice(0, -1);
      routeConfirmed = false;
      
      // Update remote state
      if (typeof updateAppState === 'function') {
        updateAppState({ inputValue: runNumberInput.value });
      }
      
      updateRouteDisplay();
      
      // Update manual button and enter button color based on input
      updateRouteInputUI();
      
      // Clear any previous errors when deleting
      const errorDiv = document.getElementById('run-error');
      if (errorDiv) {
        errorDiv.textContent = '';
      }
    });
  }

  keyboardButtons.forEach(button => {
    button.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      
      const key = this.getAttribute('data-key');
      const currentValue = runNumberInput.value;

      if (key === 'BACKSPACE') {
        runNumberInput.value = currentValue.slice(0, -1);
      } else if (key === 'CLEAR') {
        runNumberInput.value = '';
      } else if (key && currentValue.length < 4) {
        runNumberInput.value = currentValue + key;
      }

      // Update remote state
      if (typeof updateAppState === 'function') {
        updateAppState({ inputValue: runNumberInput.value });
      }

      // Update the route display in header
      currentManualRoute = null;
      currentManualFormFile = null;
      updateRouteDisplay();
      
      // Update manual button and enter button color based on input
      updateRouteInputUI();

      // Clear any previous errors when typing
      const errorDiv = document.getElementById('run-error');
      if (errorDiv) {
        errorDiv.textContent = '';
      }
      
      console.log('Key pressed:', key, 'Current value:', runNumberInput.value);
    });
  });

  // Allow the input to be clicked to show it's active, but prevent typing
  runNumberInput.addEventListener('keydown', function(event) {
    // Prevent all keyboard input on this field - only HMI-C global listener processes keys
    event.preventDefault();
    console.log(`⌨️ Input field key press blocked - relying on global keyboard listener only`);
  });

  // ==================== Fn Settings Panel ====================
  const fnBtn = document.getElementById('fn-btn');
  const fnPanel = document.getElementById('fn-panel');
  const fnFooter = document.getElementById('fn-footer');
  const fnExitBtn = document.getElementById('fn-exit-btn');
  const mainRightPanel = document.getElementById('main-right-panel');
  const fnRightPanel = document.getElementById('fn-right-panel');
  const mainPanel = document.querySelector('.main-panel');
  
  // Track which footer was active before Fn
  let previousFooter = null;
  let previousScreenBeforeFn = null;
  let previousScreenBeforeSpecial = null;
  let previousScreenBeforeEmergency = null;
  let previousUiScreen = null;

  function getCurrentUiScreenKey() {
    const touchKeyboard = document.getElementById('touch-keyboard');
    const stationCodeModeContainer = document.getElementById('station-code-mode-container');
    const mainPanel = document.querySelector('.main-panel');

    if (document.getElementById('route-selection-panel') && !document.getElementById('route-selection-panel').classList.contains('hide')) return 'route-selection';
    if (document.getElementById('fn-panel') && !document.getElementById('fn-panel').classList.contains('hide')) return 'fn';
    if (document.getElementById('status-panel') && !document.getElementById('status-panel').classList.contains('hide')) return 'status';
    if (document.getElementById('system-info-panel') && !document.getElementById('system-info-panel').classList.contains('hide')) return 'system-info';
    if (document.getElementById('pei-panel') && !document.getElementById('pei-panel').classList.contains('hide')) return 'pei';
    if (document.getElementById('cctv-panel') && !document.getElementById('cctv-panel').classList.contains('hide')) return 'cctv';
    if (document.getElementById('special-panel') && !document.getElementById('special-panel').classList.contains('hide')) return 'special';
    if (document.getElementById('emergency-panel') && !document.getElementById('emergency-panel').classList.contains('hide')) return 'emergency';
    if (stationCodeModeContainer && !stationCodeModeContainer.classList.contains('hide')) return 'station-code';
    if (touchKeyboard && !touchKeyboard.classList.contains('hide')) return 'startup';
    if (!initialFooter.classList.contains('hide')) return 'initial';
    if (!startupFooter.classList.contains('hide')) return 'startup';
    if (!stationFooter.classList.contains('hide')) return 'station';
    if (!normalFooter.classList.contains('hide')) return 'normal';
    if (mainPanel && !mainPanel.classList.contains('hide')) return 'main';
    return 'main';
  }

  function capturePreviousUiScreen() {
    const currentScreen = getCurrentUiScreenKey();
    if (currentScreen && !['fn', 'special', 'emergency'].includes(currentScreen)) {
      previousUiScreen = currentScreen;
    }
    return previousUiScreen;
  }

  function hasRouteInput() {
    return !!(currentManualRoute || routeConfirmed);
  }

  function restorePreviousUiScreen(screenKey, fallbackScreen = 'startup') {
    if (!hasRouteInput()) {
      showKeyboardMode();
      return;
    }

    const targetScreen = screenKey || previousUiScreen || fallbackScreen;

    if (targetScreen === 'initial' || targetScreen === 'startup') {
      if (systemReadyScreen) systemReadyScreen.classList.add('hide');
      const touchKeyboard = document.getElementById('touch-keyboard');
      if (touchKeyboard) touchKeyboard.classList.remove('hide');
      startupFooter.classList.remove('hide');
      const headerTitle = document.getElementById('header-title');
      const headerRoute = document.getElementById('header-route');
      if (headerTitle) headerTitle.classList.add('hide');
      if (headerRoute) headerRoute.classList.remove('hide');
      if (helperBar) {
        helperBar.classList.remove('hide');
        helperBar.textContent = '"Enter" to verify. "Back" to edit.';
      }
      return;
    }

    if (targetScreen === 'station') {
      renderStations(currentStations);
      switchToStationSelectMode();
      return;
    }

    if (targetScreen === 'normal' || targetScreen === 'main') {
      switchToNormalMode();
      return;
    }

    if (targetScreen === 'station-code') {
      document.getElementById('station-code-mode-container')?.classList.remove('hide');
      document.getElementById('touch-keyboard')?.classList.add('hide');
      document.getElementById('mode-title')?.classList.remove('hide');
      return;
    }

    if (targetScreen === 'pei') {
      peiPanel.classList.remove('hide');
      if (peiFooterTopGap) peiFooterTopGap.classList.remove('hide');
      if (peiFooter) peiFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'status') {
      statusPanel.classList.remove('hide');
      statusFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'system-info') {
      showSystemInfoPanel();
      return;
    }

    if (targetScreen === 'cctv') {
      cctvPanel.classList.remove('hide');
      if (cctvFooterTopGap) cctvFooterTopGap.classList.remove('hide');
      if (cctvFooter) cctvFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'special') {
      showSpecialPanel('special');
      return;
    }

    if (targetScreen === 'emergency') {
      showEmergencyPanel('emergency');
      return;
    }

    if (systemReadyScreen) systemReadyScreen.classList.add('hide');
    const touchKeyboard = document.getElementById('touch-keyboard');
    if (touchKeyboard) touchKeyboard.classList.remove('hide');
    startupFooter.classList.remove('hide');
  }
  
  // Volume values
  let brightnessValue = 100;
  const savedAlertVolume = localStorage.getItem('gpsAlertVolume');
  let alertVolume = savedAlertVolume === null ? 50 : Number(savedAlertVolume);
  if (!Number.isFinite(alertVolume) || alertVolume < 0 || alertVolume > 100) alertVolume = 50;
  let cabinVolume = 50;
  let brightnessTimer = null;
  let brightnessRequestId = 0;
  let brightnessOperation = Promise.resolve();
  
  const trackHeight = (window.__QV_SLIDER && window.__QV_SLIDER.track) || 280; // matches CSS
  const handleHeight = (window.__QV_SLIDER && window.__QV_SLIDER.handle) || 40; // matches CSS
  
  // ==================== Audio Output Device Selection ====================
  // Function to enumerate and update audio devices
  async function updateAudioDeviceList() {
    const select = document.getElementById('audio-device-select');
    if (!select) return;
    
    try {
      // Request permission to access audio devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter for audio output devices
      const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
      
      console.log('🔊 Available audio output devices:', audioOutputDevices);
      
      // Clear existing options except the default
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add discovered devices
      audioOutputDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Audio Output Device ${index + 1}`;
        select.appendChild(option);
      });
      
      // Restore previously selected device
      if (selectedAudioDevice && select.querySelector(`option[value="${selectedAudioDevice}"]`)) {
        select.value = selectedAudioDevice;
        console.log('✓ Restored audio device:', selectedAudioDevice);
      } else {
        select.value = '';
        console.log('ℹ️ Using default audio device');
      }
    } catch (err) {
      console.warn('⚠️ Failed to enumerate audio devices:', err);
    }
  }
  
  function updateSlider(type, value) {
    // Snap to 5% notches
    value = Math.round(value / 5) * 5;
    value = Math.max(0, Math.min(100, value));
    const handleEl = document.getElementById(`${type}-handle`);
    const valueEl = document.getElementById(`${type}-value`);
    
    // Position handle based on value (0-100%)
    if (handleEl) {
      const position = (value / 100) * (trackHeight - handleHeight);
      handleEl.style.bottom = position + 'px';
    }
    if (valueEl) valueEl.textContent = value + '%';
    
    return value;
  }

  function setAlertVolume(value) {
    alertVolume = updateSlider('handset', value);
    window.gpsAlertVolume = alertVolume / 100;
    localStorage.setItem('gpsAlertVolume', String(alertVolume));
    if (currentAudio && currentAnnouncementType === 'GPS') currentAudio.volume = window.gpsAlertVolume;
    return alertVolume;
  }
  
  // Drag functionality for sliders
  function setupSliderDrag(type, getValue, setValue) {
    const handleEl = document.getElementById(`${type}-handle`);
    const trackEl = handleEl ? handleEl.parentElement : null;
    
    if (!handleEl || !trackEl) return;
    
    let isDragging = false;
    
    function onDragStart(e) {
      isDragging = true;
      e.preventDefault();
      document.body.style.cursor = 'grabbing';
    }
    
    function onDragMove(e) {
      if (!isDragging) return;
      
      const rect = trackEl.getBoundingClientRect();
      let clientY = e.clientY || (e.touches && e.touches[0].clientY);
      
      // Calculate position from bottom of track
      const positionFromBottom = rect.bottom - clientY;
      const clampedPosition = Math.max(0, Math.min(trackHeight - handleHeight, positionFromBottom - handleHeight / 2));
      
      // Convert position to value (0-100), snap to 5% notches
      const rawValue = (clampedPosition / (trackHeight - handleHeight)) * 100;
      const newValue = Math.round(rawValue / 5) * 5;
      setValue(newValue);
    }
    
    function onDragEnd() {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
      }
    }
    
    // Mouse events
    handleEl.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    
    // Touch events
    handleEl.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
  }
  
  // Setup drag for each slider
  setupSliderDrag('brightness', 
    () => brightnessValue, 
    (v) => { 
      brightnessValue = updateSlider('brightness', v);
      setSystemBrightness(brightnessValue);
    }
  );
  
  setupSliderDrag('handset', 
    () => alertVolume,
    setAlertVolume
  );
  
  setupSliderDrag('cabin', 
    () => cabinVolume, 
    (v) => { 
      cabinVolume = updateSlider('cabin', v); 
      window.vasVolume = cabinVolume / 100;
      updateAppState({ cabinVolume });
      // Update currently playing audio volume in real-time
      if (currentAudio) {
        currentAudio.volume = window.vasVolume;
      }
      console.log('Cabin volume set to:', window.vasVolume);
    }
  );

  async function setSystemBrightness(value) {
    const brightnessIPC = window.electron && window.electron.setSystemBrightness
      ? window.electron.setSystemBrightness
      : (typeof require === 'function'
        ? (brightnessValue) => require('electron').ipcRenderer.invoke('set-system-brightness', brightnessValue)
        : null);
    if (!brightnessIPC) return;

    const requestId = ++brightnessRequestId;
    clearTimeout(brightnessTimer);
    brightnessTimer = setTimeout(() => {
      brightnessOperation = brightnessOperation
        .catch(() => {})
        .then(async () => {
          if (requestId !== brightnessRequestId) return;
          const result = await brightnessIPC(value);
          if (!result.success) console.warn('System brightness unavailable:', result.message);
        });
    }, 100);
  }

  function updateCctvButtonState(active) {
    const cctvButtons = [
      document.getElementById('cctv-btn'),
      document.getElementById('special-cctv-btn'),
      document.getElementById('emergency-cctv-btn')
    ].filter(Boolean);

    cctvButtons.forEach((button) => {
      button.classList.toggle('side-btn-red', active);
      button.classList.toggle('side-btn-green', !active);
    });
  }

  function clearCctvFullscreenState() {
    document.body.classList.remove('cctv-fullscreen');
    updateCctvButtonState(false);

    const cctvPanel = document.getElementById('cctv-panel');
    const cctvFooter = document.getElementById('cctv-footer');
    if (cctvPanel) cctvPanel.classList.add('hide');
    if (cctvFooter) cctvFooter.classList.add('hide');
  }

  function showFnPanel() {
    previousScreenBeforeFn = getCurrentUiScreenKey();
    clearCctvFullscreenState();
    resetFooterStackState();

    // Hide main panel, show Fn panel
    mainPanel.classList.add('hide');
    document.getElementById('route-selection-panel')?.classList.add('hide');
    fnPanel.classList.remove('hide');
    
    // Track and hide current footer, show Fn footer
    if (!initialFooter.classList.contains('hide')) {
      previousFooter = 'initial';
    } else if (!startupFooter.classList.contains('hide')) {
      previousFooter = 'startup';
    } else if (!stationFooter.classList.contains('hide')) {
      previousFooter = 'station';
    } else if (!normalFooter.classList.contains('hide')) {
      previousFooter = 'normal';
    }
    
    if (initialFooter) initialFooter.classList.add('hide');
    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.add('hide');
    fnFooter.classList.remove('hide');
    
    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = 'Adjust settings using footer buttons.';
    }
  }
  
  function hideFnPanel() {
    // Hide Fn panel, show main panel
    fnPanel.classList.add('hide');
    mainPanel.classList.remove('hide');

    // Always clear any keyboard/system-ready overlays before restoring the actual previous screen.
    hideKeyboardOverlay();

    // Restore previous footer
    fnFooter.classList.add('hide');
    if (helperBar) helperBar.classList.add('hide');

    const staffFooter = document.getElementById('staff-footer');
    if (staffFooter) staffFooter.classList.add('hide');

    const targetScreen = previousScreenBeforeFn || previousFooter || 'normal';

    if (targetScreen === 'initial') {
      switchToStartupMode();
    } else if (targetScreen === 'startup') {
      if (systemReadyScreen) systemReadyScreen.classList.add('hide');
      const touchKeyboard = document.getElementById('touch-keyboard');
      if (touchKeyboard) touchKeyboard.classList.remove('hide');
      startupFooter.classList.remove('hide');
      if (helperBar) helperBar.classList.remove('hide');
      const headerTitle = document.getElementById('header-title');
      const headerRoute = document.getElementById('header-route');
      if (headerTitle) headerTitle.classList.add('hide');
      if (headerRoute) headerRoute.classList.remove('hide');
      if (helperBar) helperBar.textContent = '"Enter" to verify. "Back" to edit.';
    } else if (targetScreen === 'station') {
      switchToStationSelectMode();
    } else if (targetScreen === 'route-selection') {
      showRouteSelectionPanel();
    } else if (targetScreen === 'normal' || targetScreen === 'main') {
      switchToNormalMode();
    } else if (targetScreen === 'station-code') {
      document.getElementById('station-code-mode-container')?.classList.remove('hide');
      document.getElementById('touch-keyboard')?.classList.add('hide');
      document.getElementById('mode-title')?.classList.remove('hide');
    } else if (targetScreen === 'pei') {
      mainPanel.classList.add('hide');
      document.getElementById('touch-keyboard')?.classList.add('hide');
      document.getElementById('station-list-container')?.classList.add('hide');
      document.getElementById('manual-list-container')?.classList.add('hide');
      document.getElementById('station-code-mode-container')?.classList.add('hide');
      peiPanel.classList.remove('hide');
      if (peiFooterTopGap) peiFooterTopGap.classList.remove('hide');
      if (peiFooter) peiFooter.classList.remove('hide');
    } else if (targetScreen === 'status') {
      statusPanel.classList.remove('hide');
      statusFooter.classList.remove('hide');
    } else if (targetScreen === 'system-info') {
      showSystemInfoPanel();
    } else if (targetScreen === 'cctv') {
      cctvPanel.classList.remove('hide');
      if (cctvFooterTopGap) cctvFooterTopGap.classList.remove('hide');
      if (cctvFooter) cctvFooter.classList.remove('hide');
    } else if (targetScreen === 'special') {
      specialPanel.classList.remove('hide');
      specialFooter.classList.remove('hide');
    } else if (targetScreen === 'emergency') {
      const emergencyPanel = document.getElementById('emergency-panel');
      if (emergencyPanel) emergencyPanel.classList.remove('hide');
      const emergencyFooter = document.getElementById('emergency-footer');
      if (emergencyFooter) emergencyFooter.classList.remove('hide');
    } else {
      switchToNormalMode();
    }
  }
  
  if (fnBtn) fnBtn.addEventListener('click', showFnPanel);
  if (fnExitBtn) fnExitBtn.addEventListener('click', () => {
    const fnReturnTarget = previousScreenBeforeFn;
    hideFnPanel();
    if (fnReturnTarget === 'pei') {
      mainPanel.classList.remove('hide');
      fnPanel.classList.add('hide');
      peiPanel.classList.add('hide');
      if (peiFooterTopGap) peiFooterTopGap.classList.add('hide');
      if (peiFooter) peiFooter.classList.add('hide');
      document.getElementById('station-code-mode-container')?.classList.add('hide');
      if (hasRouteInput()) {
        document.getElementById('touch-keyboard')?.classList.add('hide');
        document.getElementById('manual-list-container')?.classList.add('hide');
        stationListContainer.classList.remove('hide');
        stationListContainer.classList.add('show');
        switchToNormalMode();
      } else {
        showKeyboardMode();
      }
      return;
    }
    if (hasRouteInput()) {
      switchToNormalMode();
    } else {
      showKeyboardMode();
    }
  });
  
  // Fn panel button handlers
  const brightnessDownBtn = document.getElementById('brightness-down-btn');
  const brightnessUpBtn = document.getElementById('brightness-up-btn');
  const handsetUpBtn = document.getElementById('handset-up-btn');
  const handsetDownBtn = document.getElementById('handset-down-btn');
  const audioDeviceBtn = document.getElementById('audio-device-btn');
  const cabinUpBtn = document.getElementById('cabin-up-btn');
  const cabinDownBtn = document.getElementById('cabin-down-btn');
  const fnSlidersPanel = document.querySelector('.fn-sliders');
  const fnAudioDevicePanel = document.getElementById('fn-audio-device-panel');
  const gtfsUpdateButton = document.getElementById('gtfs-update-btn');
  const gtfsUpdateStatus = document.getElementById('gtfs-update-status');
  const gtfsUpdateProgressBar = document.getElementById('gtfs-update-progress-bar');
  const set3GTFSUpdateButton = document.getElementById('set3-gtfs-update-btn');
  const set3GTFSUpdateStatus = document.getElementById('set3-gtfs-update-status');
  const set3GTFSUpdateProgressBar = document.getElementById('set3-gtfs-update-progress-bar');
  const gtfsLastUpdated = document.getElementById('gtfs-last-updated');
  const gtfsDueDate = document.getElementById('gtfs-due-date');
  const gtfsIPC = window.electron || {
    updateGTFS: () => require('electron').ipcRenderer.invoke('update-gtfs'),
    getGTFSStatus: () => require('electron').ipcRenderer.invoke('get-gtfs-status'),
    onGTFSUpdateProgress: (callback) => require('electron').ipcRenderer.on('gtfs-update-progress', (event, data) => callback(data))
  };

  if (gtfsIPC.getGTFSStatus) {
    gtfsIPC.getGTFSStatus().then((status) => {
      if (gtfsLastUpdated) gtfsLastUpdated.textContent = status.updatedAt;
      if (gtfsDueDate) gtfsDueDate.textContent = status.dueAt;
    });
  }

  if (gtfsIPC.onGTFSUpdateProgress) {
    gtfsIPC.onGTFSUpdateProgress(({ percent, status }) => {
      if (gtfsUpdateProgressBar) gtfsUpdateProgressBar.style.width = `${percent}%`;
      if (gtfsUpdateStatus) gtfsUpdateStatus.textContent = `${status} ${percent}%`;
    });
    gtfsIPC.onGTFSUpdateProgress(({ percent, status }) => {
      set3GTFSUpdateProgressBar.style.width = `${percent}%`;
      set3GTFSUpdateStatus.textContent = `${status} ${percent}%`;
    });
  }

  if (gtfsUpdateButton && gtfsIPC.updateGTFS) {
    gtfsUpdateButton.addEventListener('click', async () => {
      gtfsUpdateButton.disabled = true;
      gtfsUpdateProgressBar.style.width = '0%';
      gtfsUpdateStatus.textContent = 'Updating...';

      try {
        const result = await gtfsIPC.updateGTFS();
        if (result.success) {
          gtfsUpdateStatus.textContent = 'Updated. Reloading...';
          window.location.reload();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        gtfsUpdateButton.disabled = false;
        gtfsUpdateProgressBar.style.width = '0%';
        gtfsUpdateStatus.textContent = `Update failed: ${error.message}`;
      }
    });
  }

  if (set3GTFSUpdateButton && gtfsIPC.updateGTFS) {
    set3GTFSUpdateButton.addEventListener('click', async () => {
      set3GTFSUpdateButton.disabled = true;
      set3GTFSUpdateProgressBar.style.width = '0%';
      set3GTFSUpdateStatus.textContent = 'Updating...';
      try {
        const result = await gtfsIPC.updateGTFS();
        if (!result.success) throw new Error(result.message);
        set3GTFSUpdateStatus.textContent = 'Updated. Reloading...';
        window.location.reload();
      } catch (error) {
        set3GTFSUpdateButton.disabled = false;
        set3GTFSUpdateProgressBar.style.width = '0%';
        set3GTFSUpdateStatus.textContent = `Update failed: ${error.message}`;
      }
    });
  }

  // Initialize global volume
  window.vasVolume = cabinVolume / 100;
  window.gpsAlertVolume = alertVolume / 100;
  updateAppState({ cabinVolume });
  
  // Initialize slider visuals on page load
  updateSlider('brightness', brightnessValue);
  updateSlider('handset', alertVolume);
  updateSlider('cabin', cabinVolume);
  console.log('Brightness value on init:', brightnessValue);
  const getSystemBrightness = window.electron && window.electron.getSystemBrightness
    ? window.electron.getSystemBrightness
    : (typeof require === 'function'
      ? () => require('electron').ipcRenderer.invoke('get-system-brightness')
      : null);

  if (getSystemBrightness) {
    getSystemBrightness().then((result) => {
      if (result.success) {
        brightnessValue = updateSlider('brightness', result.value);
      } else {
        console.warn('System brightness unavailable:', result.message);
      }
    });
  }

  if (brightnessDownBtn) brightnessDownBtn.addEventListener('click', () => {
    brightnessValue = updateSlider('brightness', brightnessValue - 5);
    setSystemBrightness(brightnessValue);
  });
  
  if (brightnessUpBtn) brightnessUpBtn.addEventListener('click', () => {
    brightnessValue = updateSlider('brightness', brightnessValue + 5);
    setSystemBrightness(brightnessValue);
  });

  if (handsetUpBtn) handsetUpBtn.addEventListener('click', () => {
    setAlertVolume(alertVolume + 5);
  });

  if (handsetDownBtn) handsetDownBtn.addEventListener('click', () => {
    setAlertVolume(alertVolume - 5);
  });
  
  if (audioDeviceBtn) audioDeviceBtn.addEventListener('click', () => {
    // Toggle between sliders and audio device panel
    if (fnSlidersPanel && fnAudioDevicePanel) {
      const fnClosestStationPanel = document.querySelector('.fn-closest-station-panel');
      const systemSettingsShown = fnAudioDevicePanel.classList.contains('hide') === false;
      
      fnSlidersPanel.classList.toggle('hide');
      fnAudioDevicePanel.classList.toggle('hide');
      
      // Toggle button color: red when System Settings shown, green when back to Fn menu
      audioDeviceBtn.classList.toggle('footer-btn-green');
      audioDeviceBtn.classList.toggle('footer-btn-red');
      
      // Show closest station panel only when System Settings is shown
      if (fnClosestStationPanel) {
        if (systemSettingsShown) {
          // System Settings is currently shown, so hide it when toggling
          fnClosestStationPanel.classList.add('hide');
        } else {
          // System Settings is about to be shown, so show closest station panel
          fnClosestStationPanel.classList.remove('hide');
        }
      }
      console.log('Audio device panel toggled');
    }
  });
  
  if (cabinUpBtn) cabinUpBtn.addEventListener('click', () => {
    cabinVolume = updateSlider('cabin', cabinVolume + 5);
    window.vasVolume = cabinVolume / 100;
    updateAppState({ cabinVolume });
    console.log('Cabin volume set to:', window.vasVolume);
  });
  
  if (cabinDownBtn) cabinDownBtn.addEventListener('click', () => {
    cabinVolume = updateSlider('cabin', cabinVolume - 5);
    window.vasVolume = cabinVolume / 100;
    updateAppState({ cabinVolume });
    console.log('Cabin volume set to:', window.vasVolume);
  });

  // ==================== Audio Output Device Selection ====================
  // Setup audio device selector
  const audioDeviceSelect = document.getElementById('audio-device-select');
  
  if (audioDeviceSelect) {
    // Initialize device list
    updateAudioDeviceList();
    
    // Listen for device changes and update the dropdown
    navigator.mediaDevices.addEventListener('devicechange', () => {
      console.log('🔊 Audio devices changed, updating list...');
      updateAudioDeviceList();
    });
    
    // Handle device selection
    audioDeviceSelect.addEventListener('change', (e) => {
      selectedAudioDevice = e.target.value;
      localStorage.setItem('selectedAudioDevice', selectedAudioDevice);
      console.log('🔊 Audio device selected:', selectedAudioDevice || 'default');
    });
  }

  // Setup CCTV auto-view toggle
  const cctvAutoToggle = document.getElementById('cctv-auto-toggle');
  if (cctvAutoToggle) {
    // Restore saved state
    const savedCctvState = localStorage.getItem('cctvOnDoorUnlockEnabled');
    if (savedCctvState !== null) {
      cctvOnDoorUnlockEnabled = savedCctvState === 'true';
    }
    
    // Update button text
    cctvAutoToggle.textContent = cctvOnDoorUnlockEnabled ? 'ON' : 'OFF';
    cctvAutoToggle.classList.toggle('fn-toggle-btn-green', cctvOnDoorUnlockEnabled);
    cctvAutoToggle.classList.toggle('fn-toggle-btn-grey', !cctvOnDoorUnlockEnabled);
    
    // Toggle on click
    cctvAutoToggle.addEventListener('click', () => {
      cctvOnDoorUnlockEnabled = !cctvOnDoorUnlockEnabled;
      localStorage.setItem('cctvOnDoorUnlockEnabled', cctvOnDoorUnlockEnabled);
      cctvAutoToggle.textContent = cctvOnDoorUnlockEnabled ? 'ON' : 'OFF';
      cctvAutoToggle.classList.toggle('fn-toggle-btn-green', cctvOnDoorUnlockEnabled);
      cctvAutoToggle.classList.toggle('fn-toggle-btn-grey', !cctvOnDoorUnlockEnabled);
      console.log('🎥 CCTV auto-view on door unlock:', cctvOnDoorUnlockEnabled ? 'ENABLED' : 'DISABLED');
    });
  }

  // Setup automatic update toggles
  const automaticAssetsToggle = document.getElementById('automatic-assets-toggle');
  const automaticGTFSToggle = document.getElementById('automatic-gtfs-toggle');
  const automaticApplicationToggle = document.getElementById('automatic-application-toggle');
  const updateSettingsIPC = typeof require === 'function'
    ? {
        get: () => require('electron').ipcRenderer.invoke('get-update-settings'),
        set: (name, value) => require('electron').ipcRenderer.invoke('set-update-setting', name, value),
        ensureAudioAssets: () => require('electron').ipcRenderer.invoke('ensure-audio-assets'),
          checkAudioAssets: () => require('electron').ipcRenderer.invoke('check-audio-assets'),
        reinstallAudioAssets: () => require('electron').ipcRenderer.invoke('reinstall-audio-assets'),
        checkApplicationUpdates: () => require('electron').ipcRenderer.invoke('check-application-updates'),
        onAudioAssetsProgress: (callback) => require('electron').ipcRenderer.on('audio-assets-progress', (event, data) => callback(data))
      }
    : null;

  function renderUpdateToggle(button, enabled) {
    if (!button) return;
    button.textContent = enabled ? 'ON' : 'OFF';
    button.classList.toggle('fn-toggle-btn-green', enabled);
    button.classList.toggle('fn-toggle-btn-grey', !enabled);
  }

  if (updateSettingsIPC) {
    updateSettingsIPC.get().then(settings => {
      renderUpdateToggle(automaticAssetsToggle, settings.automaticAssets);
      renderUpdateToggle(automaticGTFSToggle, settings.automaticGTFS);
      renderUpdateToggle(automaticApplicationToggle, settings.automaticApplication);
    });
  }

  if (automaticAssetsToggle && updateSettingsIPC) {
    automaticAssetsToggle.addEventListener('click', async () => {
      const settings = await updateSettingsIPC.get();
      const updated = await updateSettingsIPC.set('automaticAssets', !settings.automaticAssets);
      renderUpdateToggle(automaticAssetsToggle, updated.automaticAssets);
    });
  }

  if (automaticGTFSToggle && updateSettingsIPC) {
    automaticGTFSToggle.addEventListener('click', async () => {
      const settings = await updateSettingsIPC.get();
      const updated = await updateSettingsIPC.set('automaticGTFS', !settings.automaticGTFS);
      renderUpdateToggle(automaticGTFSToggle, updated.automaticGTFS);
    });
  }

  if (automaticApplicationToggle && updateSettingsIPC) {
    automaticApplicationToggle.addEventListener('click', async () => {
      const settings = await updateSettingsIPC.get();
      const updated = await updateSettingsIPC.set('automaticApplication', !settings.automaticApplication);
      renderUpdateToggle(automaticApplicationToggle, updated.automaticApplication);
    });
  }

  const reinstallAudioAssetsBtn = document.getElementById('reinstall-audio-assets-btn');
  const reinstallAudioAssetsStatus = document.getElementById('reinstall-audio-assets-status');
  const checkAssetsUpdateBtn = document.getElementById('check-assets-update-btn');
  const checkAssetsUpdateStatus = document.getElementById('check-assets-update-status');
  const checkApplicationUpdateBtn = document.getElementById('check-application-update-btn');
  const checkApplicationUpdateStatus = document.getElementById('check-application-update-status');

  updateSettingsIPC?.onAudioAssetsProgress(({ percent, status }) => {
    if (reinstallAudioAssetsStatus) reinstallAudioAssetsStatus.textContent = `${status} ${percent}%`;
    if (checkAssetsUpdateStatus) checkAssetsUpdateStatus.textContent = `${status} ${percent}%`;
  });

  async function runAssetAction(button, statusElement, action) {
    if (!button || !statusElement || !updateSettingsIPC) return;
    button.disabled = true;
    statusElement.textContent = 'Working...';
    try {
      const result = await action();
      if (!result.success) throw new Error(result.message);
      statusElement.textContent = result.installed ? 'Assets installed' : (result.message || 'Assets are current');
    } catch (error) {
      statusElement.textContent = `Failed: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  reinstallAudioAssetsBtn?.addEventListener('click', () => runAssetAction(
    reinstallAudioAssetsBtn,
    reinstallAudioAssetsStatus,
    updateSettingsIPC.reinstallAudioAssets
  ));

  checkAssetsUpdateBtn?.addEventListener('click', () => runAssetAction(
    checkAssetsUpdateBtn,
    checkAssetsUpdateStatus,
    async () => {
      const result = await updateSettingsIPC.checkAudioAssets();
      if (!result.success) return result;
      return {
        ...result,
        installed: false,
        message: result.updateAvailable ? `Version ${result.version} is available` : 'Assets are current'
      };
    }
  ));

  checkApplicationUpdateBtn?.addEventListener('click', async () => {
    if (!updateSettingsIPC) return;
    checkApplicationUpdateBtn.disabled = true;
    checkApplicationUpdateStatus.textContent = 'Checking...';
    try {
      const result = await updateSettingsIPC.checkApplicationUpdates();
      if (!result.success) throw new Error(result.message);
      checkApplicationUpdateStatus.textContent = result.updateAvailable
        ? `Version ${result.version} available`
        : 'Application is current';
    } catch (error) {
      checkApplicationUpdateStatus.textContent = `Failed: ${error.message}`;
    } finally {
      checkApplicationUpdateBtn.disabled = false;
    }
  });


  // ==================== Status and Versions Panel ====================
  const statusPanel = document.getElementById('status-panel');
  const systemInfoPanel = document.getElementById('system-info-panel');
  const statusSideBar = statusPanel?.querySelector('.right-panel');
  const systemInfoSideBar = systemInfoPanel?.querySelector('.right-panel');
  const set2Panel = document.getElementById('set2-panel');
  const set2SideBar = set2Panel?.querySelector('.right-panel');
  const set3Panel = document.getElementById('set3-panel');
  const set3SideBar = set3Panel?.querySelector('.right-panel');
  const set3UpdateContent = document.getElementById('set3-update-content');
  const systemSettingsPanel = document.getElementById('fn-audio-device-panel');
  const statusFooter = document.getElementById('status-footer');
  const systemInfoFooter = document.getElementById('system-info-footer');
  const statusExitBtn = document.getElementById('status-exit-btn');
  const set2Btn = document.getElementById('set2-btn');
  const smuSetBtn = document.getElementById('smu-set-btn');
  const set3Btn = document.getElementById('set3-btn');
  const standbyOverlay = document.getElementById('standby-overlay');
  const standbyEnterBtn = document.getElementById('standby-enter-btn');
  const standbyExitBtn = document.getElementById('standby-exit-btn');

  function enterStandbyMode() {
    if (!standbyOverlay || !standbyExitBtn || !standbyOverlay.hidden) return;

    setPidDiIndicatorVisible(true);
    setPidDiIndicatorTextVisible(false);
    standbyOverlay.hidden = false;
    standbyOverlay.setAttribute('aria-hidden', 'false');
    standbyOverlay.classList.remove('ready');
    standbyExitBtn.disabled = true;
    standbyTimer = setTimeout(() => {
      standbyOverlay.classList.add('ready');
      standbyExitBtn.disabled = false;
      standbyExitBtn.focus();
    }, 3000);
  }

  function exitStandbyMode() {
    if (!standbyOverlay || !standbyExitBtn || standbyExitBtn.disabled) return;

    setPidDiIndicatorVisible(true);
    setPidDiIndicatorTextVisible(true);
    standbyOverlay.classList.remove('ready');
    standbyExitBtn.disabled = true;
    standbyTimer = setTimeout(() => {
      standbyOverlay.hidden = true;
      standbyOverlay.setAttribute('aria-hidden', 'true');
    }, 3000);
  }

  standbyEnterBtn?.addEventListener('click', enterStandbyMode);
  standbyExitBtn?.addEventListener('click', exitStandbyMode);
  
  // Status button in Fn panel
  const fnStatusBtn = document.getElementById('fn-status-btn');
  const fnStatusBtn2 = document.getElementById('fn-status-btn-2');
  
  // Status panel side buttons
  const statusStatusBtn = document.getElementById('status-status-btn');
  const statusPeiBtn = document.getElementById('status-pei-btn');
  const statusIoBtn = document.getElementById('status-io-btn');
  const statusFnBtn = document.getElementById('status-fn-btn');
  const systemInfoStatusBtn = document.getElementById('system-info-status-btn');
  const systemInfoPeiBtn = document.getElementById('system-info-pei-btn');
  const systemInfoIoBtn = document.getElementById('system-info-io-btn');
  const systemInfoFnBtn = document.getElementById('system-info-fn-btn');

  function updateStatusFooterToggle(activeMode) {
    const smuActive = activeMode === 'smu';
    const set2Active = activeMode === 'set2';
    const set3Active = activeMode === 'set3';

    if (smuSetBtn) {
      smuSetBtn.classList.toggle('footer-btn-red', smuActive);
      smuSetBtn.classList.toggle('footer-btn-green', !smuActive);
    }
    if (set2Btn) {
      set2Btn.classList.toggle('footer-btn-red', set2Active);
      set2Btn.classList.toggle('footer-btn-green', !set2Active);
    }
    if (set3Btn) {
      set3Btn.classList.toggle('footer-btn-red', set3Active);
      set3Btn.classList.toggle('footer-btn-green', !set3Active);
    }
  }
  
  function showStatusPanel() {
    resetFooterStackState();
    // Hide Fn panel and main panel
    fnPanel.classList.add('hide');
    mainPanel.classList.add('hide');
    if (set2Panel) set2Panel.classList.add('hide');
    if (set3Panel) set3Panel.classList.add('hide');
    if (systemInfoPanel) systemInfoPanel.classList.add('hide');
    if (peiPanel) peiPanel.classList.add('hide');
    if (peiFooterTopGap) peiFooterTopGap.classList.add('hide');
    if (peiFooter) peiFooter.classList.add('hide');
    
    // Show status panel
    if (statusPanel) statusPanel.classList.remove('hide');
    if (statusSideBar) statusSideBar.classList.add('hide');
    
    // Hide all footers and show status footer
    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.add('hide');
    fnFooter.classList.add('hide');
    statusFooter.classList.remove('hide');
    if (systemInfoFooter) systemInfoFooter.classList.add('hide');
    if (systemSettingsBtn) {
      systemSettingsBtn.classList.remove('footer-btn-red');
      systemSettingsBtn.classList.add('footer-btn-green');
    }
    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = 'I/O Information';
    }
    updateStatusFooterToggle('smu');
    updateStatusGPSDisplay();
  }

  async function updateSystemInfo() {
    let battery = 'Unavailable';
    let ipAddress = 'Unavailable';
    let serialNumber = 'Unavailable';
    let appVersion = '16.2.0';

    try {
      if (typeof process !== 'undefined') {
        appVersion = process.env.QVAS_APP_VERSION || '16.2.0';
      }
    } catch (error) {
      console.warn('Could not read app version:', error.message);
    }

    try {
      if (navigator.getBattery) {
        const batteryManager = await navigator.getBattery();
        battery = `${Math.round(batteryManager.level * 100)}%${batteryManager.charging ? ' (Charging)' : ''}`;
      }
    } catch (error) {
      console.warn('Could not read battery information:', error.message);
    }

    try {
      if (typeof require === 'function') {
        const { ipcRenderer } = require('electron');
        if (ipcRenderer?.invoke) {
          const deviceInfo = await ipcRenderer.invoke('get-system-device-info');
          ipAddress = deviceInfo?.ipAddress || deviceInfo?.deviceModel || ipAddress;
          serialNumber = deviceInfo?.serialNumber || serialNumber;

        }
      }
    } catch (error) {
      console.warn('Could not read device information through Electron:', error.message);
    }

    if (ipAddress === 'Unavailable' && typeof require === 'function') {
      try {
        const isPrivateIPv4 = (address) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(address);
        ipAddress = Object.values(require('os').networkInterfaces())
          .flatMap((interfaces) => interfaces || [])
          .find((address) => (address.family === 'IPv4' || address.family === 4)
            && !address.internal
            && isPrivateIPv4(address.address))?.address || ipAddress;
      } catch (error) {
        console.warn('Could not read local IP address:', error.message);
      }
    }

    try {
      if (ipAddress === 'Unavailable' && serialNumber === 'Unavailable' && typeof require === 'function') {
        const { execFileSync } = require('child_process');
        const readSystemValue = (className, propertyName) => execFileSync(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', `(Get-CimInstance -ClassName ${className} | Select-Object -ExpandProperty ${propertyName})`],
          { encoding: 'utf8', windowsHide: true }
        ).trim();
        serialNumber = readSystemValue('Win32_BIOS', 'SerialNumber') || 'Unavailable';
      }
    } catch (error) {
      console.warn('Could not read Windows device information:', error.message);
    }

    const info = {
      os: `${navigator.platform || 'Unknown'}${navigator.userAgentData?.platform ? ` (${navigator.userAgentData.platform})` : ''}`,
      architecture: typeof process !== 'undefined' ? process.arch : 'Unavailable',
      cpu: typeof require === 'function' ? `${require('os').cpus().length} logical cores` : 'Unavailable',
      memory: typeof require === 'function' ? `${Math.round(require('os').totalmem() / 1073741824)} GB total` : 'Unavailable',
      screen: `${window.screen?.width || '?'} x ${window.screen?.height || '?'}`,
      browser: navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] || 'Unavailable',
      electron: typeof process !== 'undefined' ? (process.versions.electron || 'Unavailable') : 'Unavailable',
      node: typeof process !== 'undefined' ? (process.versions.node || 'Unavailable') : 'Unavailable',
      appVersion,
      battery,
      ipAddress,
      serialNumber
    };
    Object.entries(info).forEach(([key, value]) => {
      const element = document.getElementById(`system-info-${key}`);
      if (element) element.textContent = value;
    });
  }

  function showSystemInfoPanel() {
    resetFooterStackState();
    fnPanel.classList.add('hide');
    mainPanel.classList.add('hide');
    if (statusPanel) statusPanel.classList.add('hide');
    if (set2Panel) set2Panel.classList.add('hide');
    if (set3Panel) set3Panel.classList.add('hide');
    if (systemInfoPanel) systemInfoPanel.classList.remove('hide');
    if (statusSideBar) statusSideBar.classList.add('hide');
    if (systemInfoSideBar) systemInfoSideBar.classList.remove('hide');
    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.add('hide');
    fnFooter.classList.add('hide');
    statusFooter.classList.add('hide');
    if (systemInfoFooter) systemInfoFooter.classList.remove('hide');
    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = 'System Information';
    }
    updateSystemInfo();
  }

  function showSet2Panel() {
    fnPanel.classList.add('hide');
    mainPanel.classList.add('hide');
    if (statusPanel) statusPanel.classList.add('hide');
    if (systemInfoPanel) systemInfoPanel.classList.add('hide');
    if (set3Panel) set3Panel.classList.add('hide');
    if (statusSideBar) statusSideBar.classList.remove('hide');
    if (set2Panel) set2Panel.classList.remove('hide');
    if (set2SideBar) set2SideBar.classList.add('hide');

    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.add('hide');
    fnFooter.classList.add('hide');
    statusFooter.classList.remove('hide');
    if (systemInfoFooter) systemInfoFooter.classList.add('hide');
    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = 'Set 2 Station Coordinates';
    }
    updateStatusFooterToggle('set2');
    updateStatusGPSDisplay();
  }

  function showSet3Panel() {
    clearAllUiPanels();
    if (set3Panel) set3Panel.classList.remove('hide');
    if (set3SideBar) set3SideBar.classList.add('hide');
    if (set3UpdateContent) set3UpdateContent.classList.remove('hide');
    if (systemSettingsPanel) systemSettingsPanel.classList.add('hide');
    if (systemSettingsBtn) {
      systemSettingsBtn.classList.remove('footer-btn-red');
      systemSettingsBtn.classList.add('footer-btn-green');
    }
    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.add('hide');
    fnFooter.classList.add('hide');
    statusFooter.classList.remove('hide');
    if (systemInfoFooter) systemInfoFooter.classList.add('hide');
    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = 'System and GTFS Updates';
    }
    updateStatusFooterToggle('set3');
  }

  function showSystemSettingsPanel() {
    showSet3Panel();
    if (set3UpdateContent) set3UpdateContent.classList.add('hide');
    if (systemSettingsPanel) systemSettingsPanel.classList.remove('hide');
    if (set3Btn) {
      set3Btn.classList.remove('footer-btn-red');
      set3Btn.classList.add('footer-btn-green');
    }
    if (systemSettingsBtn) {
      systemSettingsBtn.classList.remove('footer-btn-green');
      systemSettingsBtn.classList.add('footer-btn-red');
    }
    const closestStationPanel = document.querySelector('.fn-closest-station-panel');
    if (closestStationPanel) closestStationPanel.classList.remove('hide');
    if (helperBar) helperBar.textContent = 'System Settings';
  }
  
  function hideStatusPanel() {
    // Hide status panel
    if (statusPanel) statusPanel.classList.add('hide');
    if (systemInfoPanel) systemInfoPanel.classList.add('hide');
    if (set2Panel) set2Panel.classList.add('hide');
    if (set3Panel) set3Panel.classList.add('hide');
    statusFooter.classList.add('hide');
    if (systemInfoFooter) systemInfoFooter.classList.add('hide');
    if (helperBar) helperBar.classList.add('hide');
    
    // Return to Fn panel
    fnPanel.classList.remove('hide');
    fnFooter.classList.remove('hide');
    
    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = '';
    }
  }
  
  // Wire up Status buttons
  if (fnStatusBtn) fnStatusBtn.addEventListener('click', showSystemInfoPanel);
  if (fnStatusBtn2) fnStatusBtn2.addEventListener('click', showSystemInfoPanel);
  if (smuSetBtn) smuSetBtn.addEventListener('click', () => {
    showStatusPanel();
  });
  if (set2Btn) set2Btn.addEventListener('click', () => {
    showSet2Panel();
  });
  const set3StatusBtn = document.getElementById('set3-status-btn');
  const set3PeiBtn = document.getElementById('set3-pei-btn');
  const set3IoBtn = document.getElementById('set3-io-btn');
  const set3FnBtn = document.getElementById('set3-fn-btn');
  const systemSettingsBtn = document.getElementById('system-settings-btn');
  if (set3Btn) set3Btn.addEventListener('click', showSet3Panel);
  if (systemSettingsBtn) systemSettingsBtn.addEventListener('click', showSystemSettingsPanel);
  const testAllAlertSoundsBtn = document.getElementById('test-all-alert-sounds-btn');
  if (testAllAlertSoundsBtn) {
    testAllAlertSoundsBtn.addEventListener('click', () => {
      testAllAlertSoundsBtn.disabled = true;
      queueAlertSoundTest();
      window.setTimeout(() => {
        testAllAlertSoundsBtn.disabled = false;
      }, 7000);
    });
  }
  const reloadUiBtn = document.getElementById('reload-ui-btn');
  if (reloadUiBtn) {
    reloadUiBtn.addEventListener('click', () => {
      reloadUiBtn.disabled = true;
      window.location.reload();
    });
  }
  const restartAppBtn = document.getElementById('restart-app-btn');
  if (restartAppBtn) {
    restartAppBtn.addEventListener('click', () => {
      const { ipcRenderer } = require('electron');
      restartAppBtn.disabled = true;
      ipcRenderer.invoke('restart-app');
    });
  }
  if (set3StatusBtn) set3StatusBtn.addEventListener('click', showSet3Panel);
  if (set3PeiBtn) set3PeiBtn.addEventListener('click', () => document.getElementById('pei-btn')?.click());
  if (set3IoBtn) set3IoBtn.addEventListener('click', () => showSet3Panel());
  if (set3FnBtn) set3FnBtn.addEventListener('click', hideStatusPanel);
  if (statusExitBtn) statusExitBtn.addEventListener('click', hideStatusPanel);
  if (statusFnBtn) statusFnBtn.addEventListener('click', hideStatusPanel);
  if (statusStatusBtn) statusStatusBtn.addEventListener('click', showSystemInfoPanel);
  if (statusIoBtn) statusIoBtn.addEventListener('click', showStatusPanel);
  if (systemInfoStatusBtn) systemInfoStatusBtn.addEventListener('click', showSystemInfoPanel);
  if (systemInfoPeiBtn) systemInfoPeiBtn.addEventListener('click', () => showPeiPanel('status'));
  if (systemInfoIoBtn) systemInfoIoBtn.addEventListener('click', showStatusPanel);
  if (systemInfoFnBtn) systemInfoFnBtn.addEventListener('click', hideStatusPanel);
  const systemInfoExitBtn = document.getElementById('system-info-exit-btn');
  if (systemInfoExitBtn) systemInfoExitBtn.addEventListener('click', hideStatusPanel);
  const statusGPSThresholdsBtn = document.getElementById('status-gps-thresholds-btn');
  const gpsThresholdDialog = document.getElementById('gps-threshold-dialog');
  const gpsThresholdForm = document.getElementById('gps-threshold-form');
  const gpsThresholdInputs = {
    naa: document.getElementById('gps-threshold-naa'),
    tns: document.getElementById('gps-threshold-tns'),
    mtg: document.getElementById('gps-threshold-mtg'),
    movement: document.getElementById('gps-threshold-movement')
  };
  if (statusGPSThresholdsBtn && gpsThresholdDialog && gpsThresholdForm) {
    statusGPSThresholdsBtn.addEventListener('click', () => {
      gpsThresholdInputs.naa.value = TSW_NAA_TRIGGER_METERS;
      gpsThresholdInputs.tns.value = TSW_TNS_TRIGGER_METERS;
      gpsThresholdInputs.mtg.value = TSW_MTG_TRIGGER_METERS;
      gpsThresholdInputs.movement.value = TSW_MTG_MAX_MOVEMENT_METERS;
      gpsThresholdDialog.showModal();
    });
    document.getElementById('gps-threshold-cancel').addEventListener('click', () => gpsThresholdDialog.close());
    gpsThresholdForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!gpsThresholdForm.reportValidity()) return;
      TSW_NAA_TRIGGER_METERS = Number(gpsThresholdInputs.naa.value);
      TSW_TNS_TRIGGER_METERS = Number(gpsThresholdInputs.tns.value);
      TSW_MTG_TRIGGER_METERS = Number(gpsThresholdInputs.mtg.value);
      TSW_MTG_MAX_MOVEMENT_METERS = Number(gpsThresholdInputs.movement.value);
      localStorage.setItem('gpsNaaTriggerMeters', String(TSW_NAA_TRIGGER_METERS));
      localStorage.setItem('gpsTnsTriggerMeters', String(TSW_TNS_TRIGGER_METERS));
      localStorage.setItem('gpsMtgTriggerMeters', String(TSW_MTG_TRIGGER_METERS));
      localStorage.setItem('gpsMtgMovementMeters', String(TSW_MTG_MAX_MOVEMENT_METERS));
      gpsThresholdDialog.close();
    });
  }
  const statusGPSSourceBtn = document.getElementById('status-gps-source-btn');
  if (statusGPSSourceBtn) {
    const updateGPSSourceButton = () => {
      const sourceLabels = { phone: 'Phone', 'this-pc': 'This PC' };
      statusGPSSourceBtn.textContent = `GPS Source: ${sourceLabels[gpsSourceMode] || 'Phone'}`;
    };
    updateGPSSourceButton();
    statusGPSSourceBtn.addEventListener('click', () => {
      const sourceOrder = ['phone', 'this-pc'];
      const currentSourceIndex = sourceOrder.indexOf(gpsSourceMode);
      setGPSSourceMode(sourceOrder[(currentSourceIndex + 1) % sourceOrder.length]);
      updateGPSSourceButton();
    });
  }
  const statusGPSModeBtn = document.getElementById('status-gps-mode-btn');
  if (statusGPSModeBtn) {
    const updateGPSModeButton = () => {
      statusGPSModeBtn.textContent = `GPS Mode: ${gpsModeEnabled ? 'ON' : 'OFF'}`;
      statusGPSModeBtn.classList.toggle('fn-toggle-btn-green', gpsModeEnabled);
      statusGPSModeBtn.classList.toggle('fn-toggle-btn-grey', !gpsModeEnabled);
    };
    updateGPSModeButton();
    statusGPSModeBtn.addEventListener('click', () => {
      setGPSMode(!gpsModeEnabled);
      updateGPSModeButton();
    });
  }
  const statusMTGTestBtn = document.getElementById('status-mtg-test-btn');
  if (statusMTGTestBtn) statusMTGTestBtn.addEventListener('click', () => {
    const testStationIndex = stationSelectionConfirmed ? tswTargetStationIndex : closestStationIndex;
    const testStation = currentStations[testStationIndex];
    if (!testStation) {
      statusMTGTestBtn.textContent = 'Load a route first';
      setTimeout(() => { statusMTGTestBtn.textContent = 'Test MTG Countdown'; }, 1500);
      return;
    }

    if (mtgTestTimer !== null) clearTimeout(mtgTestTimer);
    selectedStation = testStation;
    tswMtgDwellStationIndex = testStationIndex;
    tswMtgDwellStartedAt = Date.now();
    tswMtgStationaryPosition = tswLastPosition
      ? { latitude: tswLastPosition.latitude, longitude: tswLastPosition.longitude }
      : null;
    statusMTGTestBtn.disabled = true;
    statusMTGTestBtn.textContent = 'Testing MTG...';
    updateStatusGPSDisplay();
    mtgTestTimer = setTimeout(() => {
      tswMtgTriggeredIndices.add(testStationIndex);
      playMindTheGap(true);
      statusMTGTestBtn.disabled = false;
      statusMTGTestBtn.textContent = 'Test MTG Countdown';
      mtgTestTimer = null;
    }, TSW_MTG_DWELL_MS);
  });
  
  // Fn I/O button - black screen for 10 seconds then System Ready
  const fnIoBtn = document.getElementById('fn-io-btn');
  const fnIoBtn2 = document.getElementById('fn-io-btn-2');
  let ioTestInProgress = false; // Flag to prevent multiple I/O tests
  
  function handleFnIoButton() {
    // Prevent overlapping I/O tests
    if (ioTestInProgress) {
      console.log('⚠️ I/O test already in progress - ignoring click');
      return;
    }
    
    ioTestInProgress = true;
    console.log('🎬 I/O Button Pressed - Starting test');
    
    // Hide Fn panel
    if (fnPanel) fnPanel.classList.add('hide');
    if (mainPanel) mainPanel.classList.remove('hide');
    if (fnFooter) fnFooter.classList.add('hide');
    if (normalFooter) normalFooter.classList.add('hide');
    if (stationFooter) stationFooter.classList.add('hide');
    if (startupFooter) startupFooter.classList.add('hide');
    
    // Create a video overlay
    let videoOverlay = document.getElementById('fn-io-video-overlay');
    if (!videoOverlay) {
      videoOverlay = document.createElement('div');
      videoOverlay.id = 'fn-io-video-overlay';
      videoOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: black;
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0;
        padding: 0;
      `;
      
      // Create video element
      const video = document.createElement('video');
      const videoUrl = '/audio/QR_PIDS_AudioFiles/qvas.mp4';
      console.log('🎬 Video source URL:', videoUrl);
      
      // Use source element for better compatibility
      const source = document.createElement('source');
      source.src = videoUrl;
      source.type = 'video/mp4;codecs="avc1.42E01E"';
      video.appendChild(source);
      
      // Add fallback source
      const source2 = document.createElement('source');
      source2.src = videoUrl;
      source2.type = 'video/mp4';
      video.appendChild(source2);
      
      video.style.cssText = `
        max-width: 100vw;
        max-height: 100vh;
        width: auto;
        height: auto;
        background: black;
      `;
      video.autoplay = true;
      video.muted = true;
      video.controls = false;
      
      // Add load and error handlers for debugging
      video.addEventListener('loadstart', () => {
        console.log('🎬 Video: loadstart event');
      });
      video.addEventListener('loadedmetadata', () => {
        console.log('🎬 Video: loadedmetadata - duration:', video.duration);
      });
      video.addEventListener('canplay', () => {
        console.log('🎬 Video: canplay - ready to play');
      });
      video.addEventListener('playing', () => {
        console.log('🎬 Video: now playing');
      });
      video.addEventListener('error', (e) => {
        console.error('🎬 Video Error:', e);
        console.error('🎬 Video MediaError code:', video.error?.code, 'message:', video.error?.message);
        console.error('🎬 Video readyState:', video.readyState);
        console.error('🎬 Network state:', video.networkState);
        // Try to fetch the video directly to check if it exists
        fetch(videoUrl).then(r => {
          console.log('🎬 Fetch response: status', r.status, 'type', r.headers.get('content-type'));
        }).catch(err => console.error('🎬 Fetch error:', err));
        
        // Show fallback message
        console.log('🎬 Video playback failed - showing black screen as fallback');
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
          color: #666;
          font-size: 14px;
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
        `;
        errorMsg.textContent = 'Video codec not supported - showing test screen';
        videoOverlay.appendChild(errorMsg);
      });
      
      videoOverlay.appendChild(video);
      document.body.appendChild(videoOverlay);
      console.log('🎬 Video element created and appended to body');
    } else {
      console.log('🎬 Reusing existing video overlay');
      videoOverlay.style.display = 'flex';
      const video = videoOverlay.querySelector('video');
      if (video) {
        video.currentTime = 0;
        video.play().catch(err => console.error('🎬 Play error:', err));
      }
    }
    
    console.log('🎬 I/O test started - video overlay showing for a short diagnostic pass');
    
    // Keep the test non-destructive: return to the previous panel after the test completes.
    setTimeout(() => {
      console.log('✓ I/O test completed - returning to previous screen without restart');
      if (videoOverlay) {
        videoOverlay.style.display = 'none';
      }
      ioTestInProgress = false;

      if (fnPanel) fnPanel.classList.remove('hide');
      if (fnFooter) fnFooter.classList.remove('hide');
      if (mainPanel) mainPanel.classList.remove('hide');
      helperBar.textContent = '';
    }, 10000);
  }
  
  if (fnIoBtn) fnIoBtn.addEventListener('click', showStatusPanel);
  if (fnIoBtn2) fnIoBtn2.addEventListener('click', showStatusPanel);
  
  function resetFooterStackState() {
    document.querySelectorAll('.footer-top-gap').forEach(gap => gap.classList.add('hide'));
    document.querySelectorAll('.footer').forEach(footer => footer.classList.add('hide'));
    if (helperBar) helperBar.classList.add('hide');
  }

  // ==================== PEI Panel ====================
  const peiPanel = document.getElementById('pei-panel');
  const peiFooter = document.getElementById('pei-footer');
  const peiFooterTopGap = document.getElementById('pei-footer-top-gap');
  
  // PEI buttons from various panels
  const peiBtn = document.getElementById('pei-btn');
  const fnPeiBtn = document.getElementById('fn-pei-btn');
  const fnPeiBtn2 = document.getElementById('fn-pei-btn-2');
  const peiPeiBtn = document.getElementById('pei-pei-btn');
  const peiCctvBtn = document.getElementById('pei-cctv-btn');
  const peiFnBtn = document.getElementById('pei-fn-btn');
  
  // Track where we came from for PEI
  let peiPreviousPanel = null;
  
  function showPeiPanel(fromPanel) {
    clearCctvFullscreenState();
    peiPreviousPanel = fromPanel || 'main';
    clearAllUiPanels();

    if (helperBar) {
      helperBar.textContent = '';
      helperBar.classList.add('hide');
    }
    
    // Track current footer before hiding (only when coming from main)
    if (fromPanel === 'main') {
      if (!initialFooter.classList.contains('hide')) {
        previousFooter = 'initial';
      } else if (!startupFooter.classList.contains('hide')) {
        previousFooter = 'startup';
      } else if (!stationFooter.classList.contains('hide')) {
        previousFooter = 'station';
      } else if (!normalFooter.classList.contains('hide')) {
        previousFooter = 'normal';
      }
    }
    
    // Hide all panels
    mainPanel.classList.add('hide');
    mainPanel.querySelectorAll('.right-panel').forEach(panel => panel.classList.add('hide'));
    
    // Show PEI panel
    peiPanel.classList.remove('hide');
    
    // Clear any stale footer states before showing PEI footer
    document.querySelectorAll('.footer-top-gap').forEach(gap => gap.classList.add('hide'));
    document.querySelectorAll('.footer').forEach(footer => {
      if (footer.id !== 'pei-footer') {
        footer.classList.add('hide');
      }
    });
    if (peiFooterTopGap) peiFooterTopGap.classList.remove('hide');
    if (peiFooter) peiFooter.classList.remove('hide');
    
    if (initialFooter) initialFooter.classList.add('hide');
    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.add('hide');
    fnFooter.classList.add('hide');
    statusFooter.classList.add('hide');
    if (typeof statusFooterLabel !== 'undefined' && statusFooterLabel) {
      statusFooterLabel.classList.add('hide');
    }
    
    if (helperBar) {
      helperBar.classList.add('hide');
      helperBar.textContent = '';
    }
  }
  
  function hidePeiPanel() {
    // Hide PEI panel
    peiPanel.classList.add('hide');
    if (peiFooterTopGap) peiFooterTopGap.classList.add('hide');
    if (peiFooter) peiFooter.classList.add('hide');
    if (helperBar) helperBar.classList.add('hide');
    
    // Return to previous panel
    if (peiPreviousPanel === 'fn') {
      fnPanel.classList.remove('hide');
      fnFooter.classList.remove('hide');
      if (helperBar) {
        helperBar.classList.remove('hide');
        helperBar.textContent = '';
      }
    } else if (peiPreviousPanel === 'status') {
      statusPanel.classList.remove('hide');
      statusFooter.classList.remove('hide');
      if (typeof statusFooterLabel !== 'undefined' && statusFooterLabel) {
        statusFooterLabel.classList.remove('hide');
      }
      if (helperBar) helperBar.classList.add('hide');
    } else if (peiPreviousPanel === 'emergency') {
      const emergencyPanel = document.getElementById('emergency-panel');
      const emergencyFooter = document.getElementById('emergency-footer');
      if (emergencyPanel) emergencyPanel.classList.remove('hide');
      if (emergencyFooterTopGap) emergencyFooterTopGap.classList.remove('hide');
      if (emergencyFooter) emergencyFooter.classList.remove('hide');
    } else if (peiPreviousPanel === 'route-selection') {
      showRouteSelectionPanel();
    } else {
      // Return to main panel
      mainPanel.classList.remove('hide');
      mainRightPanel.classList.remove('hide');
      fnRightPanel.classList.add('hide');
      if (previousFooter === 'initial') {
        switchToStartupMode();
      } else if (previousFooter === 'startup') {
        // Go back to keyboard screen
        if (systemReadyScreen) systemReadyScreen.classList.add('hide');
        const touchKeyboard = document.getElementById('touch-keyboard');
        if (touchKeyboard) touchKeyboard.classList.remove('hide');
        startupFooter.classList.remove('hide');
        const headerTitle = document.getElementById('header-title');
        const headerRoute = document.getElementById('header-route');
        if (headerTitle) headerTitle.classList.add('hide');
        if (headerRoute) headerRoute.classList.remove('hide');
        if (helperBar) {
          helperBar.classList.remove('hide');
          helperBar.textContent = '"Enter" to verify. "Back" to edit.';
        }
      } else if (previousFooter === 'station') {
        switchToStationSelectMode();
      } else if (previousFooter === 'normal') {
        switchToNormalMode();
      } else {
        switchToStartupMode();
      }
    }
  }
  
  // Wire up PEI buttons
  if (peiBtn) peiBtn.addEventListener('click', () => showPeiPanel('main'));
  if (fnPeiBtn) fnPeiBtn.addEventListener('click', () => showPeiPanel('fn'));
  if (fnPeiBtn2) fnPeiBtn2.addEventListener('click', () => showPeiPanel('fn'));
  if (statusPeiBtn) statusPeiBtn.addEventListener('click', () => showPeiPanel('status'));
  if (peiCctvBtn) peiCctvBtn.addEventListener('click', showCctvPanel);
  if (peiFnBtn) peiFnBtn.addEventListener('click', () => {
    peiPanel.classList.add('hide');
    peiFooter.classList.add('hide');
    showFnPanel();
    previousScreenBeforeFn = 'pei';
  });

  // ==================== CCTV Panel ====================
  const cctvPanel = document.getElementById('cctv-panel');
  const cctvFooter = document.getElementById('cctv-footer');
  const cctvSelectFooter = document.getElementById('cctv-select-footer');
  const cctvFooterTopGap = document.getElementById('cctv-footer-top-gap');
  const cctvImageContainer = document.querySelector('.cctv-image-container');
  const cctvQuadScreen = document.getElementById('cctv-quad-screen');
  const cctvQuadGrid = document.getElementById('cctv-quad-grid');
  const cctvImage = document.getElementById('cctv-image');
  const cctvPlaceholder = document.getElementById('cctv-placeholder');

  const cctvBtn = document.getElementById('cctv-btn');
  const cctvPrevBtn = document.getElementById('cctv-prev-btn');
  const cctvNextBtn = document.getElementById('cctv-next-btn');
  const cctvSelectBtn = document.getElementById('cctv-select-btn');
  const cctvExitBtn = document.getElementById('cctv-exit-btn');
  const cctvCctvBtn = document.getElementById('cctv-cctv-btn');
  const cctvPeiBtn = document.getElementById('cctv-pei-btn');
  const cctvFnBtn = document.getElementById('cctv-fn-btn');
  const cctvStopBtn = document.getElementById('cctv-stop-btn');
  const cctvSpecialBtn = document.getElementById('cctv-special-btn');
  const cctvScanBtn = document.getElementById('cctv-scan-btn');
  const cctvQuadBtn = document.getElementById('cctv-quad-btn');
  const cctvEnterBtn = document.getElementById('cctv-enter-btn');
  const cctvSelectStopBtn = document.getElementById('cctv-select-stop-btn');
  const cctvSelectSpecialBtn = document.getElementById('cctv-select-special-btn');
  const cctvCancelBtn = document.getElementById('cctv-cancel-btn');

  const cctvCameras = [
    { id: 'DMA-F', car: 'DMA', number: 'F', path: 'CCTV/DMA/F.jpg' },
    ...['DMA', 'T', 'DMB'].flatMap(car => [1, 2, 3, 4].map(number => ({
      id: `${car}-${number}`,
      car,
      number,
      path: `CCTV/${car}/${number}.jpg`
    })))
  ];
  const cctvSaloonCameras = cctvCameras.filter(camera => camera.number !== 'F');
  let currentCamera = 'DMA-1';
  let pendingCamera = null;
  let quadSelectionMode = false;
  let pendingCameras = [];
  let cctvScanToken = 0;
  const totalCameras = cctvCameras.length;
  const quadCameraCount = 4;
  let previousScreenBeforeCctv = null;

  function getCctvCamera(cameraId) {
    return cctvCameras.find(camera => camera.id === cameraId) || cctvCameras[0];
  }

  function updateCctvImage() {
    if (cctvImage) {
      cctvImage.style.visibility = 'visible';
      const camera = getCctvCamera(currentCamera);
      cctvImage.src = camera.path;
      cctvImage.alt = `${camera.car} CCTV Camera ${camera.number}`;
      if (cctvPlaceholder) cctvPlaceholder.style.display = 'none';
    }
  }

  function hideCctvQuadView() {
    if (cctvQuadScreen) cctvQuadScreen.classList.add('hide');
    if (cctvImageContainer) cctvImageContainer.classList.remove('hide');
  }

  function showCctvQuadView(cameras) {
    if (!cctvQuadGrid || !cctvQuadScreen) return;

    cctvQuadGrid.innerHTML = cameras.map((camera) => `
      <div class="quad-camera">
        <img src="${getCctvCamera(camera).path}" alt="${getCctvCamera(camera).car} CCTV Camera ${getCctvCamera(camera).number}">
      </div>
    `).join('');
    if (cctvImageContainer) cctvImageContainer.classList.add('hide');
    cctvQuadScreen.classList.remove('hide');
  }

  function cancelCctvScan() {
    cctvScanToken++;
    if (cctvPlaceholder) cctvPlaceholder.style.display = 'none';
  }

  function showCctvRequestState() {
    if (cctvImage) cctvImage.style.visibility = 'hidden';
    if (cctvPlaceholder) {
      cctvPlaceholder.textContent = 'Video Requested...';
      cctvPlaceholder.style.display = 'block';
    }
  }

  function showCctvImage() {
    if (cctvImage) cctvImage.style.visibility = 'visible';
    updateCctvImage();
  }

  async function runCctvScan() {
    const scanToken = ++cctvScanToken;
    let cameraIndex = cctvSaloonCameras.findIndex(camera => camera.id === currentCamera);
    if (cameraIndex < 0) cameraIndex = 0;

    while (scanToken === cctvScanToken && !cctvPanel.classList.contains('hide')) {
      const camera = cctvSaloonCameras[cameraIndex];
      if (scanToken !== cctvScanToken || cctvPanel.classList.contains('hide')) return;

      currentCamera = camera.id;
      showCctvRequestState();
      const requestDelay = 250 + Math.floor(Math.random() * 751);
      await new Promise(resolve => setTimeout(resolve, requestDelay));
      if (scanToken !== cctvScanToken || cctvPanel.classList.contains('hide')) return;

      showCctvImage();
      await new Promise(resolve => setTimeout(resolve, 1000));
      cameraIndex = (cameraIndex + 1) % cctvSaloonCameras.length;
    }
  }

  function scheduleCctvAutoOpen(delay) {
    if (cctvAutoOpenTimer) clearTimeout(cctvAutoOpenTimer);
    cctvAutoOpenTimer = setTimeout(() => {
      cctvAutoOpenTimer = null;
      if (cctvOnDoorUnlockEnabled && selectedStation && cctvPanel.classList.contains('hide') && !normalFooter.classList.contains('hide')) {
        showCctvPanel();
      }
    }, delay);
  }

  function showCctvPanel() {
    if (!cctvPanel.classList.contains('hide')) return;
    cancelCctvScan();
    if (cctvAutoOpenTimer) {
      clearTimeout(cctvAutoOpenTimer);
      cctvAutoOpenTimer = null;
    }
    previousScreenBeforeCctv = capturePreviousUiScreen() || previousUiScreen || previousFooter || getCurrentUiScreenKey();
    if (!initialFooter.classList.contains('hide')) {
      previousFooter = 'initial';
    } else if (!startupFooter.classList.contains('hide')) {
      previousFooter = 'startup';
    } else if (!stationFooter.classList.contains('hide')) {
      previousFooter = 'station';
    } else if (!normalFooter.classList.contains('hide')) {
      previousFooter = 'normal';
    }

    clearAllUiPanels();
    document.body.classList.add('cctv-active');
    mainPanel.classList.add('hide');
    if (helperBar) helperBar.classList.add('hide');

    cctvPanel.classList.remove('hide');

    if (initialFooter) initialFooter.classList.add('hide');
    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.add('hide');
    fnFooter.classList.add('hide');
    statusFooter.classList.add('hide');
    peiFooter.classList.add('hide');
    if (cctvFooterTopGap) cctvFooterTopGap.classList.remove('hide');
    cctvFooter.classList.remove('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');
    if (cctvSelectMenu) cctvSelectMenu.classList.add('hide');
    hideCctvQuadView();
    quadSelectionMode = false;
    pendingCameras = [];

    currentCamera = 'DMA-1';
    updateCctvImage();

    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = 'Use Previous/Next Camera. Select Camera to choose.';
    }
  }

  function hideCctvPanel() {
    cancelCctvScan();
    cctvPanel.classList.add('hide');
    document.body.classList.remove('cctv-active');
    if (cctvFooterTopGap) cctvFooterTopGap.classList.add('hide');
    cctvFooter.classList.add('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');

    const targetScreen = previousScreenBeforeCctv || previousUiScreen || previousFooter || (!hasRouteInput() ? 'startup' : 'normal');
    previousScreenBeforeCctv = null;

    if (mainPanel) mainPanel.classList.remove('hide');

    if (targetScreen === 'initial' || targetScreen === 'startup') {
      if (!hasRouteInput()) {
        showKeyboardMode();
        return;
      }
      switchToNormalMode();
      return;
    }

    if (targetScreen === 'station') {
      switchToStationSelectMode();
      return;
    }

    if (targetScreen === 'route-selection') {
      showRouteSelectionPanel();
      return;
    }

    if (targetScreen === 'normal' || targetScreen === 'main') {
      switchToNormalMode();
      return;
    }

    if (targetScreen === 'pei') {
      if (mainPanel) mainPanel.classList.add('hide');
      mainRightPanel.classList.add('hide');
      fnRightPanel.classList.add('hide');
      if (peiPanel) peiPanel.classList.remove('hide');
      if (peiFooterTopGap) peiFooterTopGap.classList.remove('hide');
      if (peiFooter) peiFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'status') {
      if (statusPanel) statusPanel.classList.remove('hide');
      if (statusFooter) statusFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'special') {
      if (specialPanel) specialPanel.classList.remove('hide');
      if (specialFooterTopGap) specialFooterTopGap.classList.remove('hide');
      if (specialFooter) specialFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'emergency') {
      const emergencyPanel = document.getElementById('emergency-panel');
      const emergencyFooter = document.getElementById('emergency-footer');
      if (emergencyPanel) emergencyPanel.classList.remove('hide');
      if (emergencyFooterTopGap) emergencyFooterTopGap.classList.remove('hide');
      if (emergencyFooter) emergencyFooter.classList.remove('hide');
      return;
    }

    switchToNormalMode();
  }

  if (cctvBtn) cctvBtn.addEventListener('click', showCctvPanel);
  if (cctvExitBtn) cctvExitBtn.addEventListener('click', () => {
    const cctvReturnTarget = previousScreenBeforeCctv;
    hideCctvPanel();
    if (cctvReturnTarget === 'pei') {
      peiPanel.classList.add('hide');
      if (peiFooterTopGap) peiFooterTopGap.classList.add('hide');
      if (peiFooter) peiFooter.classList.add('hide');
      if (hasRouteInput()) {
        mainPanel.classList.remove('hide');
        document.getElementById('main-right-panel')?.classList.remove('hide');
        switchToNormalMode();
      } else {
        mainPanel.classList.remove('hide');
        document.getElementById('main-right-panel')?.classList.remove('hide');
        showKeyboardMode();
      }
      return;
    }
    if (hasRouteInput()) {
      switchToNormalMode();
    } else {
      showKeyboardMode();
    }
  });

  if (cctvStopBtn) cctvStopBtn.addEventListener('click', () => {
    cancelCctvScan();
    manualStopAudio();
    if (displayWindow && !displayWindow.closed) {
      displayWindow.postMessage({ type: 'STOP' }, '*');
    }
  });

  function stopCctvAudio() {
    cancelCctvScan();
    manualStopAudio();
    if (displayWindow && !displayWindow.closed) {
      displayWindow.postMessage({ type: 'STOP' }, '*');
    }
  }

  if (cctvSelectStopBtn) cctvSelectStopBtn.addEventListener('click', stopCctvAudio);

  if (cctvPrevBtn) cctvPrevBtn.addEventListener('click', () => {
    cancelCctvScan();
    hideCctvQuadView();
    const currentIndex = cctvCameras.findIndex(camera => camera.id === currentCamera);
    currentCamera = cctvCameras[(currentIndex - 1 + totalCameras) % totalCameras].id;
    updateCctvImage();
  });

  if (cctvNextBtn) cctvNextBtn.addEventListener('click', () => {
    cancelCctvScan();
    hideCctvQuadView();
    const currentIndex = cctvCameras.findIndex(camera => camera.id === currentCamera);
    currentCamera = cctvCameras[(currentIndex + 1) % totalCameras].id;
    updateCctvImage();
  });

  const cctvSelectMenu = document.getElementById('cctv-select-menu');
  const cctvCameraButtons = cctvSelectMenu
    ? cctvSelectMenu.querySelectorAll('[data-cctv-camera]')
    : [];

  function updateCctvSelectionMenu() {
    cctvCameraButtons.forEach((button) => {
      const camera = button.dataset.cctvCamera;
      const selected = quadSelectionMode
        ? pendingCameras.includes(camera)
        : camera === pendingCamera;
      button.classList.toggle('selected', selected);
    });
    if (cctvEnterBtn) {
      const canEnter = quadSelectionMode
        ? pendingCameras.length === quadCameraCount
        : pendingCamera !== null;
      cctvEnterBtn.disabled = !canEnter;
      cctvEnterBtn.classList.toggle('footer-btn-green', canEnter);
      cctvEnterBtn.classList.toggle('footer-btn-grey', !canEnter);
    }
    if (helperBar && quadSelectionMode) {
      const selectedNames = pendingCameras
        .map(cameraId => {
          const camera = getCctvCamera(cameraId);
          return `${camera.car} Camera ${camera.number}`;
        })
        .join('. ');
      helperBar.classList.remove('hide');
      helperBar.textContent = `${pendingCameras.length}/4 cameras selected${selectedNames ? `. ${selectedNames}.` : '.'}`;
    }
  }

  if (cctvSelectBtn) cctvSelectBtn.addEventListener('click', () => {
    if (!cctvSelectMenu) return;
    quadSelectionMode = false;
    pendingCamera = null;
    pendingCameras = [];
    hideCctvQuadView();
    cctvFooter.classList.add('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.remove('hide');
    updateCctvSelectionMenu();
    cctvSelectMenu.classList.remove('hide');
  });

  cctvCameraButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const camera = button.dataset.cctvCamera;
      if (quadSelectionMode) {
        if (pendingCameras.includes(camera)) {
          pendingCameras = pendingCameras.filter(selectedCamera => selectedCamera !== camera);
        } else if (pendingCameras.length < quadCameraCount) {
          pendingCameras = [...pendingCameras, camera];
        }
      } else {
        pendingCamera = camera;
      }
      updateCctvSelectionMenu();
    });
  });

  if (cctvEnterBtn) cctvEnterBtn.addEventListener('click', () => {
    if (quadSelectionMode) {
      if (pendingCameras.length !== quadCameraCount) return;
      const selectedNames = pendingCameras
        .map(cameraId => {
          const camera = getCctvCamera(cameraId);
          return `${camera.car} Camera ${camera.number}`;
        })
        .join('. ');
      currentCamera = pendingCameras[0];
      showCctvQuadView(pendingCameras);
      pendingCamera = null;
      pendingCameras = [];
      quadSelectionMode = false;
      cctvSelectMenu.classList.add('hide');
      if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');
      cctvFooter.classList.remove('hide');
      if (helperBar) helperBar.textContent = `${selectedNames}.`;
      return;
    } else {
      if (pendingCamera === null) return;
      currentCamera = pendingCamera;
      const requestToken = ++cctvScanToken;
      showCctvRequestState();
      const requestDelay = 250 + Math.floor(Math.random() * 751);
      setTimeout(() => {
        if (requestToken !== cctvScanToken || cctvPanel.classList.contains('hide')) return;
        showCctvImage();
      }, requestDelay);
    }
    pendingCamera = null;
    pendingCameras = [];
    quadSelectionMode = false;
    cctvSelectMenu.classList.add('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');
    cctvFooter.classList.remove('hide');
    if (helperBar) helperBar.textContent = '';
  });

  if (cctvCancelBtn) cctvCancelBtn.addEventListener('click', () => {
    pendingCamera = null;
    pendingCameras = [];
    quadSelectionMode = false;
    hideCctvQuadView();
    cctvSelectMenu.classList.add('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');
    cctvFooter.classList.remove('hide');
    if (helperBar) helperBar.textContent = '';
  });

  if (cctvScanBtn) cctvScanBtn.addEventListener('click', () => {
    pendingCamera = null;
    cctvSelectMenu.classList.add('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');
    cctvFooter.classList.remove('hide');
    if (helperBar) helperBar.textContent = '';
    runCctvScan();
  });

  if (cctvQuadBtn) cctvQuadBtn.addEventListener('click', () => {
    quadSelectionMode = true;
    pendingCamera = null;
    pendingCameras = [];
    updateCctvSelectionMenu();
  });

  if (cctvSelectSpecialBtn) cctvSelectSpecialBtn.addEventListener('click', () => {
    cctvSelectMenu.classList.add('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');
    showSpecialPanel();
  });

  if (cctvPeiBtn) cctvPeiBtn.addEventListener('click', () => {
    cctvPanel.classList.add('hide');
    document.body.classList.remove('cctv-active');
    if (cctvFooterTopGap) cctvFooterTopGap.classList.add('hide');
    cctvFooter.classList.add('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');
    cctvSelectMenu.classList.add('hide');
    showPeiPanel('main');
  });

  if (cctvFnBtn) cctvFnBtn.addEventListener('click', () => {
    const returnScreen = previousScreenBeforeCctv || 'normal';
    cctvPanel.classList.add('hide');
    document.body.classList.remove('cctv-active');
    if (cctvFooterTopGap) cctvFooterTopGap.classList.add('hide');
    cctvFooter.classList.add('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');
    cctvSelectMenu.classList.add('hide');
    showFnPanel();
    previousScreenBeforeFn = returnScreen;
  });

  if (cctvSpecialBtn) cctvSpecialBtn.addEventListener('click', () => {
    cctvPanel.classList.add('hide');
    document.body.classList.remove('cctv-active');
    cctvFooter.classList.add('hide');
    if (cctvSelectFooter) cctvSelectFooter.classList.add('hide');
    cctvSelectMenu.classList.add('hide');
    showSpecialPanel();
  });

  // ==================== Closest Station Feature ====================
  
  function updateClosestStationTag() {
    // Remove all existing closest station tags
    document.querySelectorAll('.closest-station-tag').forEach(tag => tag.remove());

    if (!gpsAvailable || tswLastPosition?.speedKmh > 25) return;
    
    // Add tag to current closest station
    const stationItems = document.querySelectorAll('#station-list li');
    if (stationItems[closestStationIndex]) {
      const tag = document.createElement('span');
      tag.className = 'closest-station-tag';
      tag.textContent = 'Closest Station';
      stationItems[closestStationIndex].appendChild(tag);
    }
  }
  
  function updateClosestStationFromTimers() {
    // Automatically update closest station based on currently selected/upcoming station
    // In auto-adapt mode (manual mode OFF), the closest station is the one being approached
    if (!manualClosestStationMode && selectedStation && currentStations.length > 0) {
      // Find the index of the selected station in the current stations array
      const stationIndex = currentStations.findIndex(s => s.name === selectedStation.name);
      if (stationIndex >= 0) {
        closestStationIndex = stationIndex;
        updateClosestStationTag();
      }
    }
  }
  
  function setClosestStation(index) {
    // Manually set the closest station (only in manual mode)
    if (manualClosestStationMode && index >= 0 && index < currentStations.length) {
      closestStationIndex = index;
      updateClosestStationTag();
    }
  }
  
  // Toggle button for manual closest station selection
  const closestStationToggle = document.getElementById('closest-station-toggle');
  const stationCodeOpenBtn = document.getElementById('station-code-open-btn');
  if (closestStationToggle) {
    closestStationToggle.addEventListener('click', function() {
      manualClosestStationMode = !manualClosestStationMode;
      
      if (manualClosestStationMode) {
        closestStationToggle.textContent = 'ON';
        closestStationToggle.classList.add('enabled');
        closestStationToggle.classList.remove('disabled');
        // Show the Select Station button when manual mode is ON
        if (stationCodeOpenBtn) stationCodeOpenBtn.style.display = 'block';
      } else {
        closestStationToggle.textContent = 'OFF';
        closestStationToggle.classList.remove('enabled');
        closestStationToggle.classList.add('disabled');
        // Hide the Select Station button when manual mode is OFF
        if (stationCodeOpenBtn) stationCodeOpenBtn.style.display = 'none';
        // Auto-update from timers when manual mode is off
        updateClosestStationFromTimers();
      }
      
      updateClosestStationTag();
    });
  }

  // NGR Button Message Toggle
  const ngrButtonMessageToggle = document.getElementById('ngr-button-message-toggle');
  if (ngrButtonMessageToggle) {
    ngrButtonMessageToggle.addEventListener('click', function() {
      ngrButtonMessageEnabled = !ngrButtonMessageEnabled;
      
      if (ngrButtonMessageEnabled) {
        ngrButtonMessageToggle.textContent = 'ON';
        ngrButtonMessageToggle.classList.add('enabled');
        ngrButtonMessageToggle.classList.remove('disabled');
        console.log('✅ NGR Button Message enabled');
      } else {
        ngrButtonMessageToggle.textContent = 'OFF';
        ngrButtonMessageToggle.classList.remove('enabled');
        ngrButtonMessageToggle.classList.add('disabled');
        console.log('❌ NGR Button Message disabled');
      }
    });
  }

  // Station Code Keyboard Handler
  const stationCodeModeContainer = document.getElementById('station-code-mode-container');
  const stationCodeDisplay = document.getElementById('station-code-display');
  const headerStation = document.getElementById('header-station');
  const stationCodeList = document.getElementById('station-code-list');
  const stationCodeListContainer = document.getElementById('station-code-list-container');
  const stationCodeFooter = document.getElementById('station-code-footer');
  const stationCodeUpBtn = document.getElementById('station-code-up-btn');
  const stationCodeDownBtn = document.getElementById('station-code-down-btn');
  const stationCodeSelectBtn = document.getElementById('station-code-select-btn');
  const stationCodeStopBtn = document.getElementById('station-code-stop-btn');
  const stationCodeSpecialBtn = document.getElementById('station-code-special-btn');
  const stationCodeCloseBtn = document.getElementById('station-code-close-btn');
  const stationCodeMorePrev = document.getElementById('station-code-more-prev');
  const stationCodeMoreNext = document.getElementById('station-code-more-next');
  let stationCodeBuffer = '';
  let previousVisibleFooterId = null; // Track which footer was visible before entering station code mode
  let stationCodeOptions = [];
  let stationCodeIndex = 0;
  let stationCodePage = 0;
  const STATION_CODE_ITEMS_PER_PAGE = 10;

  function getStationCodeForName(stationName) {
    const normalizedName = normalizeStationName(stationName).toLowerCase();
    const match = Object.entries(stationCodeMap).find(([, name]) => normalizeStationName(name).toLowerCase() === normalizedName);
    return match ? match[0] : '---';
  }

  function renderStationCodeList() {
    if (!stationCodeList) return;
    stationCodeOptions = (currentStations || []).map((station, index) => ({
      code: getStationCodeForName(station.name),
      name: normalizeStationName(station.name),
      index,
      label: `(${getStationCodeForName(station.name)}) - (${normalizeStationName(station.name)})`
    }));
    stationCodeIndex = Math.min(stationCodeIndex, Math.max(0, stationCodeOptions.length - 1));
    stationCodePage = Math.floor(stationCodeIndex / STATION_CODE_ITEMS_PER_PAGE);
    const pageStart = stationCodePage * STATION_CODE_ITEMS_PER_PAGE;
    const pageEnd = pageStart + STATION_CODE_ITEMS_PER_PAGE;
    stationCodeList.innerHTML = '';
    stationCodeOptions.forEach((option, index) => {
      const item = document.createElement('li');
      item.textContent = option.label;
      item.classList.toggle('visible', index >= pageStart && index < pageEnd);
      item.classList.toggle('selected', index === stationCodeIndex);
      item.addEventListener('click', () => {
        stationCodeIndex = index;
        renderStationCodeList();
      });
      stationCodeList.appendChild(item);
    });
    const totalPages = Math.ceil(stationCodeOptions.length / STATION_CODE_ITEMS_PER_PAGE);
    if (stationCodeMorePrev) stationCodeMorePrev.style.visibility = stationCodePage > 0 ? 'visible' : 'hidden';
    if (stationCodeMoreNext) stationCodeMoreNext.style.visibility = stationCodePage < totalPages - 1 ? 'visible' : 'hidden';
    const stationCodePageIndicator = document.getElementById('station-code-page-indicator');
    const stationCodePageText = `Page: ${stationCodeOptions.length > 0 ? stationCodePage + 1 : 1}/${Math.max(1, totalPages)}`;
    if (stationCodePageIndicator) stationCodePageIndicator.textContent = stationCodePageText;
    document.getElementById('station-code-page-indicator-bottom')?.replaceChildren(stationCodePageText);
    if (stationCodeUpBtn) {
      stationCodeUpBtn.classList.toggle('footer-btn-grey', stationCodeIndex === 0);
      stationCodeUpBtn.classList.toggle('footer-btn-green', stationCodeIndex !== 0);
    }
    if (stationCodeDownBtn) {
      stationCodeDownBtn.classList.toggle('footer-btn-grey', stationCodeIndex >= stationCodeOptions.length - 1);
      stationCodeDownBtn.classList.toggle('footer-btn-green', stationCodeIndex < stationCodeOptions.length - 1);
    }
  }

  function selectStationCodeOption() {
    const option = stationCodeOptions[stationCodeIndex];
    if (!option) return;
    if (option.index >= 0) {
      setClosestStation(option.index);
      closeStationCodeKeyboard();
    }
  }

  // Open station code keyboard
  if (stationCodeOpenBtn) {
    stationCodeOpenBtn.addEventListener('click', function() {
      resetFooterStackState();
      renderStationCodeList();
      const currentClosestStation = currentStations[closestStationIndex];
      stationCodeIndex = Math.max(0, stationCodeOptions.findIndex((option) =>
        currentClosestStation && option.index >= 0 && option.index === closestStationIndex
      ));
      renderStationCodeList();
      stationCodeBuffer = '';
      stationCodeDisplay.textContent = '_ _ _';
      updateStationEnterButtonState();
      
      // Close Fn panel if it's open
      const fnPanel = document.getElementById('fn-panel');
      const mainPanel = document.querySelector('.main-panel');
      if (fnPanel && !fnPanel.classList.contains('hide')) {
        hideFnPanel();
      }

      const statusPanel = document.getElementById('status-panel');
      const systemInfoPanel = document.getElementById('system-info-panel');
      const set2Panel = document.getElementById('set2-panel');
      const set3Panel = document.getElementById('set3-panel');
      if (statusPanel) statusPanel.classList.add('hide');
      if (systemInfoPanel) systemInfoPanel.classList.add('hide');
      if (set2Panel) set2Panel.classList.add('hide');
      if (set3Panel) set3Panel.classList.add('hide');
      
      // Make sure main panel is visible
      if (mainPanel) mainPanel.classList.remove('hide');
      
      // Hide other panels in main area
      document.getElementById('touch-keyboard').classList.add('hide');
      document.getElementById('run-error').classList.add('hide');
      document.getElementById('mode-title').classList.add('hide');
      document.getElementById('station-list-container').classList.add('hide');
      document.getElementById('manual-list-container').classList.add('hide');
      
      // Hide route header, show station header
      document.getElementById('header-route').classList.add('hide');
      headerStation.classList.remove('hide');
      
      // Show station code mode
      stationCodeModeContainer.classList.remove('hide');
      if (stationCodeListContainer) stationCodeListContainer.classList.remove('hide');
      
      // Store which footer was visible and hide all footers
      const startupFooter = document.getElementById('startup-footer');
      const stationFooter = document.getElementById('station-footer');
      const normalFooter = document.getElementById('normal-footer');
      const fnFooter = document.getElementById('fn-footer');
      
      if (startupFooter && !startupFooter.classList.contains('hide')) {
        previousVisibleFooterId = 'startup-footer';
      } else if (stationFooter && !stationFooter.classList.contains('hide')) {
        previousVisibleFooterId = 'station-footer';
      } else if (normalFooter && !normalFooter.classList.contains('hide')) {
        previousVisibleFooterId = 'normal-footer';
      } else if (fnFooter && !fnFooter.classList.contains('hide')) {
        previousVisibleFooterId = 'fn-footer';
      } else {
        previousVisibleFooterId = 'station-footer'; // Default to station footer
      }
      
      // Hide all footers
      if (startupFooter) startupFooter.classList.add('hide');
      if (stationFooter) stationFooter.classList.add('hide');
      if (normalFooter) normalFooter.classList.add('hide');
      if (fnFooter) fnFooter.classList.add('hide');
      if (stationCodeFooter) stationCodeFooter.classList.remove('hide');
      if (helperBar) {
        helperBar.classList.remove('hide');
        helperBar.textContent = 'Use Up/Down to navigate. Select a closest station.';
      }
    });
  }

  // Close station code keyboard and return to normal mode
  function closeStationCodeKeyboard() {
    stationCodeModeContainer.classList.add('hide');
    if (stationCodeFooter) stationCodeFooter.classList.add('hide');
    stationCodeBuffer = '';
    stationCodeDisplay.textContent = '_ _ _';
    updateStationEnterButtonState();
    
    // Hide station header, show route header if needed
    headerStation.classList.add('hide');
    
    // Return to normal mode - show station list
    document.getElementById('touch-keyboard').classList.add('hide');
    document.getElementById('mode-title').classList.remove('hide');
    document.getElementById('station-list-container').classList.remove('hide');
    
    // Hide startup footer and restore the previous footer
    const startupFooter = document.getElementById('startup-footer');
    if (startupFooter) startupFooter.classList.add('hide');
    
    if (previousVisibleFooterId) {
      const previousFooter = document.getElementById(previousVisibleFooterId);
      if (previousFooter) previousFooter.classList.remove('hide');
    }

    if (helperBar) {
      helperBar.classList.remove('hide');
      if (previousVisibleFooterId === 'startup-footer') {
        helperBar.textContent = '"Enter" to verify. "Back" to edit.';
      } else if (previousVisibleFooterId === 'station-footer') {
        helperBar.textContent = 'Use Up/Down to navigate. Select to confirm start station.';
      } else {
        helperBar.textContent = 'Use Up/Down to navigate. Play to announce.';
      }
    }
    
    // Restore reset button text to Reset
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.textContent = 'Reset';
    const stationResetBtn = document.getElementById('station-reset-btn');
    if (stationResetBtn) stationResetBtn.textContent = 'Reset';
    const normalResetBtn = document.getElementById('normal-reset-btn');
    if (normalResetBtn) normalResetBtn.textContent = 'Reset';
  }

  if (stationCodeUpBtn) stationCodeUpBtn.addEventListener('click', () => {
    stationCodeIndex = Math.max(0, stationCodeIndex - 1);
    renderStationCodeList();
  });
  if (stationCodeDownBtn) stationCodeDownBtn.addEventListener('click', () => {
    stationCodeIndex = Math.min(stationCodeOptions.length - 1, stationCodeIndex + 1);
    renderStationCodeList();
  });
  if (stationCodeMorePrev) stationCodeMorePrev.addEventListener('click', () => {
    if (stationCodePage > 0) {
      stationCodePage--;
      stationCodeIndex = stationCodePage * STATION_CODE_ITEMS_PER_PAGE;
      renderStationCodeList();
    }
  });
  if (stationCodeMoreNext) stationCodeMoreNext.addEventListener('click', () => {
    const totalPages = Math.ceil(stationCodeOptions.length / STATION_CODE_ITEMS_PER_PAGE);
    if (stationCodePage < totalPages - 1) {
      stationCodePage++;
      stationCodeIndex = stationCodePage * STATION_CODE_ITEMS_PER_PAGE;
      renderStationCodeList();
    }
  });
  if (stationCodeSelectBtn) stationCodeSelectBtn.addEventListener('click', selectStationCodeOption);
  if (stationCodeStopBtn) stationCodeStopBtn.addEventListener('click', stopCurrentDvaAndPid);
  if (stationCodeSpecialBtn) stationCodeSpecialBtn.addEventListener('click', () => document.getElementById('special-btn')?.click());
  if (stationCodeCloseBtn) stationCodeCloseBtn.addEventListener('click', closeStationCodeKeyboard);

  // Handle station code key presses
  const stationCodeKeys = stationCodeModeContainer.querySelectorAll('#station-code-keyboard .key-btn');
  stationCodeKeys.forEach(btn => {
    btn.addEventListener('click', function() {
      const key = this.dataset.key;
      if (key && stationCodeBuffer.length < 3) {
        stationCodeBuffer += key.toUpperCase();
        // Update display with spaces between characters
        stationCodeDisplay.textContent = stationCodeBuffer.split('').join(' ');
        updateStationEnterButtonState();

        // Auto-submit when 3 letters entered
        if (stationCodeBuffer.length === 3) {
          submitStationCode();
        }
      }
    });
  });

  // Submit station code and update closest station
  function submitStationCode() {
    const code = stationCodeBuffer.toUpperCase();
    
    // Find station matching the code
    if (stationCodeMap[code]) {
      const stationName = stationCodeMap[code];
      
      // Only process if we have a route loaded
      if (currentStations && currentStations.length > 0) {
        // Find the index in currentStations
        const stationIndex = currentStations.findIndex(s => s.name === stationName);
        
        if (stationIndex >= 0) {
          // Station is on the route - highlight it
          setClosestStation(stationIndex);
          closeStationCodeKeyboard();
        }
        // Otherwise, station not on route - silently do nothing
      }
      // If no route loaded, silently do nothing
      
      // Clear the buffer for next entry
      stationCodeBuffer = '';
      stationCodeDisplay.textContent = '_ _ _';
    } else {
      // Invalid station code - silently do nothing
      stationCodeBuffer = '';
      stationCodeDisplay.textContent = '_ _ _';
    }
  }

  // Update Enter button state based on station code input
  function updateStationEnterButtonState() {
    const enterBtn = document.getElementById('enter-btn');
    if (enterBtn) {
      if (stationCodeBuffer.length === 3) {
        enterBtn.classList.add('active');
      } else {
        enterBtn.classList.remove('active');
      }
    }
  }

  // Intercept startup footer buttons when in station code mode
  const startupBackBtn = document.getElementById('back-btn');
  const startupEnterBtn = document.getElementById('enter-btn');
  
  if (startupBackBtn) {
    startupBackBtn.addEventListener('click', function(e) {
      if (!stationCodeModeContainer.classList.contains('hide')) {
        // Backspace: delete last character
        if (stationCodeBuffer.length > 0) {
          stationCodeBuffer = stationCodeBuffer.slice(0, -1);
          stationCodeDisplay.textContent = stationCodeBuffer.length > 0 ? stationCodeBuffer.split('').join(' ') : '_ _ _';
          updateStationEnterButtonState();
        }
      }
    }, true); // Use capture phase to intercept before other handlers
  }

  if (startupEnterBtn) {
    startupEnterBtn.addEventListener('click', function(e) {
      if (!stationCodeModeContainer.classList.contains('hide')) {
        // Only process if we have 3 characters
        if (stationCodeBuffer.length === 3) {
          submitStationCode();
          closeStationCodeKeyboard();
        }
      }
    }, true); // Use capture phase
  }

  // ==================== Special Messages Panel ====================
  const specialPanel = document.getElementById('special-panel');
  const specialFooter = document.getElementById('special-footer');
  const specialFooterTopGap = document.getElementById('special-footer-top-gap');
  const specialItems = document.querySelectorAll('.special-item');
  const specialMorePrev = document.getElementById('special-more-prev');
  const specialMoreNext = document.getElementById('special-more-next');
  
  // Special button elements
  const specialBtn = document.getElementById('special-btn');
  const stationSpecialBtn = document.getElementById('station-special-btn');
  const normalSpecialBtn = document.getElementById('normal-special-btn');
  const startupSpecialBtn = document.getElementById('startup-special-btn');
  const resetBtn = document.getElementById('reset-btn');
  const stationResetBtn = document.getElementById('station-reset-btn');
  const normalResetBtn = document.getElementById('normal-reset-btn');
  const specialUpBtn = document.getElementById('special-up-btn');
  const specialDownBtn = document.getElementById('special-down-btn');
  const specialPlayBtn = document.getElementById('special-play-btn');
  const specialStopBtn = document.getElementById('special-stop-btn');
  const specialResetBtn = document.getElementById('special-reset-btn');
  const specialSkipBtn = document.getElementById('special-skip-btn');
  const specialPeiBtn = document.getElementById('special-pei-btn');
  const specialCctvBtn = document.getElementById('special-cctv-btn');
  const specialFnBtn = document.getElementById('special-fn-btn');
  
  // Pagination settings
  const SPECIAL_ITEMS_PER_PAGE = 10;
  let currentSpecialIndex = 0;
  let currentSpecialPage = 0;
  
  // Global arrays for special messages (will be loaded from JSON)
  let specialMessages = [];
  let specialAudioFiles = {};
  let specialDisplayText = {};
  
  // Destination aliases/mappings for auto-select matching
  const destinationAliases = {
    'Domestic Airport': 'Brisbane Airport',
    'International Airport': 'Brisbane Airport'
  };
  
  // Function to auto-select special message based on current destination
  function autoSelectSpecialMessageByDestination(destination) {
    if (!destination || specialMessages.length === 0) return false;
    
    // Normalize destination (remove "station" suffix for matching)
    let destName = destination.replace(/\s+station$/i, '').trim();
    
    // Apply aliases if destination matches a known alias
    if (destinationAliases[destName]) {
      destName = destinationAliases[destName];
      console.log(`[Auto-Select] Alias applied: "${destination}" -> "${destName}"`);
    }
    
    console.log(`[Auto-Select] Looking for special message matching: "${destName}"`);
    
    // Search through special messages to find a match
    for (let i = 0; i < specialMessages.length; i++) {
      const messageKey = specialMessages[i];
      const label = specialDisplayText[messageKey] || '';
      
      // Extract destination from label (e.g., "EDI ~ Ipswich" -> "Ipswich")
      let labelDestination = '';
      if (label.includes('~')) {
        labelDestination = label.split('~')[1].trim();
      } else {
        labelDestination = label;
      }
      
      // Compare normalized names
      if (labelDestination.toLowerCase() === destName.toLowerCase()) {
        currentSpecialIndex = i;
        currentSpecialPage = Math.floor(currentSpecialIndex / SPECIAL_ITEMS_PER_PAGE);
        console.log(`✓ [Auto-Select] Found matching special message at index ${i}: "${label}"`);
        highlightSpecialItem(currentSpecialIndex);
        updateSpecialDisplayPage();
        
        // Only send destination to display window if this is an EDI message (either "EDI ~" or "EDI -" format)
        if (label.includes('EDI')) {
          // Send destination to display window
          if (!displayWindow || displayWindow.closed) {
          }
          
          setTimeout(() => {
            // Get destination settings (scroller, customText, useCustomText)
            const destSettings = getDestinationSettings(labelDestination) || {};
            
            const diData = {
              type: 'DI',
              destination: labelDestination,
              scroller: destSettings.scroller || false,
              customText: destSettings.customText || '',
              useCustomText: destSettings.useCustomText || false,
              persistent: true  // Keep display until system reset
            };
            
            if (displayWindow && !displayWindow.closed) {
              try {
                displayWindow.postMessage(diData, '*');
                console.log('✓ [Auto-Select] Sent destination to display window:', labelDestination);
              } catch (err) {
                console.error('Error sending to display:', err);
              }
            }
          }, 300);
        } else {
          console.log('⚠️ [Auto-Select] Non-EDI message matched - skipping destination display');
        }
        
        return true;
      }
    }
    
    console.log(`[Auto-Select] No matching special message found for "${destName}"`);
    return false;
  }
  
  // State flag to prevent panel from closing while special message is playing
  let isPlayingSpecial = false;
  let specialMessagesLoaded = false;
  
  // Destinations data
  let destinationsData = [];
  
  // Load destinations from destinations.json
  async function loadDestinations() {
    try {
      let response;
      try {
        response = await fetch('./destinations.json');
      } catch (err) {
        response = await fetch('../destinations.json');
      }
      
      if (response.ok) {
        const data = await response.json();
        destinationsData = data.destinations || [];
        console.log(`✓ Loaded ${destinationsData.length} destinations from JSON`);
        return true;
      } else {
        console.log('Could not load destinations.json');
        return false;
      }
    } catch (err) {
      console.log('Error loading destinations.json:', err);
      return false;
    }
  }
  
  // Get destination settings by name
  function getDestinationSettings(destName) {
    if (!destName || !destinationsData.length) return null;
    
    const dest = destinationsData.find(d => d.name.toLowerCase() === destName.toLowerCase());
    return dest || null;
  }
  
  // Load special messages from JSON file
  async function loadSpecialMessages() {
    try {
      // Try multiple path formats for Electron compatibility
      let response;
      try {
        response = await fetch('./special-messages.json');
      } catch (err) {
        response = await fetch('../special-messages.json');
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✓ Loaded ${data.specialMessages.length} special messages from JSON`);
        
        // Build arrays and objects from JSON data
        specialMessages = data.specialMessages.map(msg => msg.id);
        
        specialAudioFiles = {};
        specialDisplayText = {};
        
        data.specialMessages.forEach(msg => {
          specialAudioFiles[msg.id] = msg.audioPath;
          specialDisplayText[msg.id] = msg.label;
        });
        
        specialMessagesLoaded = true;
        console.log('✓ Special messages ready for use');
        return true;
      } else {
        // Fallback: populate from HTML items (silent fail - this is normal)
        populateSpecialMessagesFromHTML();
        return false;
      }
    } catch (err) {
      // Fallback: populate from HTML items (silent fail - this is normal)
      populateSpecialMessagesFromHTML();
      return false;
    }
  }
  
  // Fallback function to populate special messages from HTML
  function populateSpecialMessagesFromHTML() {
    specialMessages = [];
    specialAudioFiles = {};
    specialDisplayText = {};
    
    specialItems.forEach(item => {
      const messageId = item.dataset.message;
      if (messageId) {
        specialMessages.push(messageId);
        specialDisplayText[messageId] = item.textContent;
      }
    });
    
    console.log('✓ Populated special messages from HTML items');
  }
  
  // Load special messages and destinations on startup
  (async () => {
    await loadDestinations();
    await loadSpecialMessages();
    await loadEmergencyMessages();
  })();
  
  
  function playSpecialMessage() {
    const messageKey = specialMessages[currentSpecialIndex];
    const audioPath = specialAudioFiles[messageKey];
    const displayLabel = specialDisplayText[messageKey];
    
    console.log('=== SPECIAL MESSAGE PLAY ===');
    console.log('Playing special message:', messageKey, 'Label:', displayLabel, 'Path:', audioPath);
    
    // Set flag to prevent panel from closing while playing
    isPlayingSpecial = true;
    specialPanel.classList.remove('hide');
    specialFooter.classList.remove('hide');
    if (specialFooterTopGap) specialFooterTopGap.classList.remove('hide');
    
    // Only update destination DISPLAY if this is an EDI message (either "EDI ~" or "EDI -" format)
    // DO NOT change currentDestinationStation - it must remain the actual route destination
    // to ensure route announcements use the correct TNS_Special paths
    if (displayLabel && displayLabel.includes('EDI')) {
      // Extract destination from label
      let destination = '';
      if (displayLabel.includes('~')) {
        // Format: "EDI ~ Ipswich" -> extract "Ipswich"
        destination = displayLabel.split('~')[1].trim();
      } else {
        destination = displayLabel.trim();
      }
      
      console.log('✓ EDI message detected - Display destination:', destination);
      console.log('✓ Route destination (currentDestinationStation) UNCHANGED:', currentDestinationStation);
      
      // Update main DI display only (visual only, doesn't affect audio paths)
      if (diDisplay) {
        diDisplay.textContent = destination;
        console.log('✓ Updated main DI display to:', destination);
      }
      
      // Update remote state - DISPLAY ONLY, not affecting route audio paths
      if (typeof updateAppState === 'function') {
        updateAppState({
          DI: destination
        });
      }
      
      // Open display window if not open
      if (!displayWindow || displayWindow.closed) {
      }
      
      // Send destination from special message label to display window
      setTimeout(() => {
        // Get destination settings (scroller, customText, useCustomText)
        const destSettings = getDestinationSettings(destination) || {};
        
        console.log('DEBUG playSpecialMessage:', {
          displayLabel,
          destination,
          destSettings,
          displayWindowExists: !!displayWindow,
          displayWindowClosed: displayWindow ? displayWindow.closed : 'n/a'
        });
        
        // Send DI data object to display
        const diData = {
          type: 'DI',
          destination: destination,
          scroller: destSettings.scroller || false,
          customText: destSettings.customText || '',
          useCustomText: destSettings.useCustomText || false,
          persistent: true  // Keep display until system reset
        };
        
        console.log('Sending to display:', diData);
        
        if (displayWindow && !displayWindow.closed) {
          try {
            displayWindow.postMessage(diData, '*');
            console.log('✓ Message sent to display window');
          } catch (err) {
            console.error('Error sending message to display:', err);
          }
        } else {
          console.warn('Display window not ready');
        }
      }, 300);
    } else {
      console.log('⚠️ Non-EDI message - skipping destination update');
    }
    
    // Play audio
    if (audioPath) {
      currentAnnouncementDisplayText = displayLabel || messageKey;
      currentAnnouncementAudioPath = audioPath;
      currentAnnouncementType = 'special';
      currentAnnouncementStation = displayLabel || messageKey;
      currentAnnouncementSpecialMessageId = messageKey;
      setTimeout(() => {
        try {
          playAudio(audioPath);
          
          // Clear flag when audio ends
          if (currentAudio) {
            const originalOnended = currentAudio.onended;
            currentAudio.onended = function() {
              if (originalOnended) originalOnended.call(this);
              isPlayingSpecial = false;
              console.log('✓ Special message playback finished, panel can now close');
            };
          }
        } catch (err) {
          console.error('Error calling playAudio:', err);
          isPlayingSpecial = false;
        }
      }, 500);
    }
  }
  
  function updateSpecialDisplayPage() {
    // If specialMessages is empty, use HTML items directly
    if (specialMessages.length === 0) {
      specialMessages = [];
      specialItems.forEach(item => {
        const messageId = item.dataset.message;
        if (messageId) {
          specialMessages.push(messageId);
        }
      });
    }
    
    // Hide all items first
    specialItems.forEach(item => item.classList.remove('visible'));
    
    // Calculate page range
    const startIndex = currentSpecialPage * SPECIAL_ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + SPECIAL_ITEMS_PER_PAGE, specialMessages.length);
    const specialPageIndicator = document.getElementById('special-page-indicator');
    const specialTotalPages = Math.ceil(specialMessages.length / SPECIAL_ITEMS_PER_PAGE);
    const specialPageText = `Page: ${specialMessages.length > 0 ? currentSpecialPage + 1 : 1}/${Math.max(1, specialTotalPages)}`;
    if (specialPageIndicator) specialPageIndicator.textContent = specialPageText;
    document.getElementById('special-page-indicator-bottom')?.replaceChildren(specialPageText);
    
    // Show items for current page
    for (let i = startIndex; i < endIndex; i++) {
      const item = Array.from(specialItems).find((specialItem) => specialItem.dataset.message === specialMessages[i]);
      if (item) item.classList.add('visible');
    }
    
    // Update -more- button visibility
    specialMorePrev.style.visibility = currentSpecialPage > 0 ? 'visible' : 'hidden';
    specialMoreNext.style.visibility = endIndex < specialMessages.length ? 'visible' : 'hidden';
    
    // Update up/down button colors based on position (special messages mode)
    if (specialUpBtn) {
      if (currentSpecialIndex === 0) {
        specialUpBtn.classList.add('footer-btn-grey');
        specialUpBtn.classList.remove('footer-btn-green');
      } else {
        specialUpBtn.classList.remove('footer-btn-grey');
        specialUpBtn.classList.add('footer-btn-green');
      }
    }
    
    if (specialDownBtn) {
      if (currentSpecialIndex >= specialMessages.length - 1) {
        specialDownBtn.classList.add('footer-btn-grey');
        specialDownBtn.classList.remove('footer-btn-green');
      } else {
        specialDownBtn.classList.remove('footer-btn-grey');
        specialDownBtn.classList.add('footer-btn-green');
      }
    }
    
    // Highlight appropriate item on current page
    highlightSpecialItem(currentSpecialIndex);
  }
  
  function highlightSpecialItem(index) {
    const selectedMessage = specialMessages[index];
    specialItems.forEach((item) => {
      item.classList.toggle('selected', item.dataset.message === selectedMessage);
    });
  }
  
  function restorePreviousUiScreen(screenKey, fallbackScreen = 'startup') {
    if (!hasRouteInput()) {
      showKeyboardMode();
      return;
    }

    const targetScreen = screenKey || previousUiScreen || fallbackScreen;

    if (targetScreen === 'initial' || targetScreen === 'startup') {
      if (systemReadyScreen) systemReadyScreen.classList.add('hide');
      const touchKeyboard = document.getElementById('touch-keyboard');
      if (touchKeyboard) touchKeyboard.classList.remove('hide');
      startupFooter.classList.remove('hide');
      const headerTitle = document.getElementById('header-title');
      const headerRoute = document.getElementById('header-route');
      if (headerTitle) headerTitle.classList.add('hide');
      if (headerRoute) headerRoute.classList.remove('hide');
      if (helperBar) {
        helperBar.classList.remove('hide');
        helperBar.textContent = '"Enter" to verify. "Back" to edit.';
      }
      return;
    }

    if (targetScreen === 'station') {
      switchToStationSelectMode();
      return;
    }

    if (targetScreen === 'normal' || targetScreen === 'main') {
      switchToNormalMode();
      return;
    }

    if (targetScreen === 'station-code') {
      document.getElementById('station-code-mode-container')?.classList.remove('hide');
      document.getElementById('touch-keyboard')?.classList.add('hide');
      document.getElementById('mode-title')?.classList.remove('hide');
      return;
    }

    if (targetScreen === 'pei') {
      if (peiPanel) peiPanel.classList.remove('hide');
      if (peiFooterTopGap) peiFooterTopGap.classList.remove('hide');
      if (peiFooter) peiFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'status') {
      if (statusPanel) statusPanel.classList.remove('hide');
      if (statusFooter) statusFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'cctv') {
      if (cctvPanel) cctvPanel.classList.remove('hide');
      if (cctvFooterTopGap) cctvFooterTopGap.classList.remove('hide');
      if (cctvFooter) cctvFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'special') {
      if (specialPanel) specialPanel.classList.remove('hide');
      if (specialFooterTopGap) specialFooterTopGap.classList.remove('hide');
      if (specialFooter) specialFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'emergency') {
      const emergencyPanel = document.getElementById('emergency-panel');
      const emergencyFooter = document.getElementById('emergency-footer');
      if (emergencyPanel) emergencyPanel.classList.remove('hide');
      if (emergencyFooterTopGap) emergencyFooterTopGap.classList.remove('hide');
      if (emergencyFooter) emergencyFooter.classList.remove('hide');
      return;
    }

    switchToNormalMode();
  }

  function showSpecialPanel(previousScreenOverride = null) {
    clearCctvFullscreenState();
    resetFooterStackState();
    const noRouteEntered = !hasRouteInput();
    previousScreenBeforeSpecial = previousScreenOverride || (noRouteEntered ? 'startup' : capturePreviousUiScreen() || getCurrentUiScreenKey());
    previousScreenBeforeEmergency = null;

    // Track current footer before hiding
    if (!initialFooter.classList.contains('hide')) {
      previousFooter = 'initial';
    } else if (!startupFooter.classList.contains('hide')) {
      previousFooter = 'startup';
    } else if (!stationFooter.classList.contains('hide')) {
      previousFooter = 'station';
    } else if (!normalFooter.classList.contains('hide')) {
      previousFooter = 'normal';
    }

    clearAllUiPanels();
    
    // Hide all panels
    mainPanel.classList.add('hide');
    fnPanel.classList.add('hide');
    statusPanel.classList.add('hide');
    peiPanel.classList.add('hide');
    cctvPanel.classList.add('hide');
    document.body.classList.remove('cctv-active');
    
    // Show special panel
    specialPanel.classList.remove('hide');
    
    // Hide all footers and show special footer
    if (initialFooter) initialFooter.classList.add('hide');
    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.add('hide');
    fnFooter.classList.add('hide');
    statusFooter.classList.add('hide');
    if (typeof statusFooterLabel !== 'undefined' && statusFooterLabel) {
      statusFooterLabel.classList.add('hide');
    }
    peiFooter.classList.add('hide');
    if (specialFooterTopGap) specialFooterTopGap.classList.remove('hide');
    specialFooter.classList.remove('hide');
    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = '"Play" to select the message or "Emergency" for Emergency Messages.';
    }
    
    // Reset selection to first page
    currentSpecialIndex = 0;
    currentSpecialPage = 0;
    updateSpecialDisplayPage();
  }
  
  function closeSecondaryMenuAndRestorePreviousScreen() {
    if (!hasRouteInput()) {
      showKeyboardMode();
      return;
    }

    if (document.getElementById('special-panel') && !document.getElementById('special-panel').classList.contains('hide')) {
      hideSpecialPanel();
      return;
    }

    if (document.getElementById('emergency-panel') && !document.getElementById('emergency-panel').classList.contains('hide')) {
      hideEmergencyPanel();
      return;
    }

    const targetScreen = previousUiScreen || previousFooter || 'normal';
    restorePreviousUiScreen(targetScreen, 'startup');
  }

  function hideSpecialPanel() {
    // Prevent closing while special message is still playing
    if (isPlayingSpecial) {
      console.warn('⚠️ Special message is still playing - panel will not close');
      return;
    }

    if (!hasRouteInput()) {
      showKeyboardMode();
      return;
    }

    specialPanel.classList.add('hide');
    if (specialFooterTopGap) specialFooterTopGap.classList.add('hide');
    specialFooter.classList.add('hide');
    if (helperBar) helperBar.classList.add('hide');

    const targetScreen = previousScreenBeforeSpecial || previousUiScreen || previousFooter || 'normal';
    previousScreenBeforeSpecial = null;
    previousScreenBeforeEmergency = null;

    clearAllUiPanels();
    if (mainPanel) mainPanel.classList.remove('hide');

    if (targetScreen === 'initial' || targetScreen === 'startup') {
      if (!hasRouteInput()) {
        showKeyboardMode();
        return;
      }
      switchToNormalMode();
      return;
    }

    if (targetScreen === 'station') {
      switchToStationSelectMode();
      return;
    }

    if (targetScreen === 'normal' || targetScreen === 'main') {
      switchToNormalMode();
      return;
    }

    if (targetScreen === 'station-code') {
      document.getElementById('station-code-mode-container')?.classList.remove('hide');
      document.getElementById('touch-keyboard')?.classList.add('hide');
      document.getElementById('mode-title')?.classList.remove('hide');
      return;
    }

    if (targetScreen === 'pei') {
      if (peiPanel) peiPanel.classList.remove('hide');
      if (peiFooterTopGap) peiFooterTopGap.classList.remove('hide');
      if (peiFooter) peiFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'status') {
      if (statusPanel) statusPanel.classList.remove('hide');
      if (statusFooter) statusFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'cctv') {
      if (cctvPanel) cctvPanel.classList.remove('hide');
      if (cctvFooterTopGap) cctvFooterTopGap.classList.remove('hide');
      if (cctvFooter) cctvFooter.classList.remove('hide');
      return;
    }

    if (targetScreen === 'emergency') {
      const emergencyPanel = document.getElementById('emergency-panel');
      const emergencyFooter = document.getElementById('emergency-footer');
      if (emergencyPanel) emergencyPanel.classList.remove('hide');
      if (emergencyFooterTopGap) emergencyFooterTopGap.classList.remove('hide');
      if (emergencyFooter) emergencyFooter.classList.remove('hide');
      return;
    }

    switchToNormalMode();
  }
  
  // ==================== EMERGENCY MESSAGES SYSTEM ====================
  
  // Emergency messages state
  let emergencyMessages = [];
  let emergencyAudioFiles = {};
  let emergencyDisplayText = {};
  let currentEmergencyIndex = 0;
  let currentEmergencyPage = 0;
  let emergencyConfirmationPending = false;  // True when Play button should say "Confirm"
  let emergencyMessagesLoaded = false;
  
  const EMERGENCY_ITEMS_PER_PAGE = 10;
  let emergencyItems = [];
  
  // Load emergency messages from JSON file
  async function loadEmergencyMessages() {
    try {
      let response;
      try {
        response = await fetch('./emergency-messages.json');
      } catch (err) {
        response = await fetch('../emergency-messages.json');
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✓ Loaded ${data.emergencyMessages.length} emergency messages from JSON`);
        
        // Build arrays and objects from JSON data
        emergencyMessages = data.emergencyMessages.map(msg => msg.id);
        
        emergencyAudioFiles = {};
        emergencyDisplayText = {};
        
        data.emergencyMessages.forEach(msg => {
          emergencyAudioFiles[msg.id] = msg.audioPath;
          emergencyDisplayText[msg.id] = msg.label;
        });
        
        emergencyMessagesLoaded = true;
        console.log('✓ Emergency messages ready for use');
        return true;
      } else {
        console.log('Could not load emergency-messages.json');
        return false;
      }
    } catch (err) {
      console.log('Error loading emergency-messages.json:', err);
      return false;
    }
  }
  
  function renderEmergencyMessages() {
    const emergencyList = document.querySelector('.emergency-list');
    if (!emergencyList) return;
    
    emergencyList.innerHTML = '';
    emergencyItems = [];
    
    emergencyMessages.forEach((messageId, index) => {
      const div = document.createElement('div');
      div.className = 'emergency-item' + (index === 0 ? ' selected' : '');
      div.dataset.message = messageId;
      div.textContent = emergencyDisplayText[messageId] || messageId;
      
      emergencyList.appendChild(div);
      emergencyItems.push(div);
      
      // Click to select
      div.addEventListener('click', () => {
        currentEmergencyIndex = index;
        currentEmergencyPage = Math.floor(currentEmergencyIndex / EMERGENCY_ITEMS_PER_PAGE);
        updateEmergencyDisplayPage();
        emergencyConfirmationPending = false;  // Reset confirmation state
        updateEmergencyPlayButtonText();
      });
    });
  }
  
  function updateEmergencyDisplayPage() {
    if (emergencyItems.length === 0) {
      renderEmergencyMessages();
    }
    
    emergencyItems.forEach(item => item.classList.remove('visible'));
    
    const startIndex = currentEmergencyPage * EMERGENCY_ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + EMERGENCY_ITEMS_PER_PAGE, emergencyMessages.length);
    const emergencyPageIndicator = document.getElementById('emergency-page-indicator');
    const emergencyTotalPages = Math.ceil(emergencyMessages.length / EMERGENCY_ITEMS_PER_PAGE);
    const emergencyPageText = `Page: ${emergencyMessages.length > 0 ? currentEmergencyPage + 1 : 1}/${Math.max(1, emergencyTotalPages)}`;
    if (emergencyPageIndicator) emergencyPageIndicator.textContent = emergencyPageText;
    document.getElementById('emergency-page-indicator-bottom')?.replaceChildren(emergencyPageText);
    
    for (let i = startIndex; i < endIndex; i++) {
      if (emergencyItems[i]) {
        emergencyItems[i].classList.add('visible');
      }
    }
    
    const emergencyMorePrev = document.getElementById('emergency-more-prev');
    const emergencyMoreNext = document.getElementById('emergency-more-next');
    const emergencyUpBtn = document.getElementById('emergency-up-btn');
    const emergencyDownBtn = document.getElementById('emergency-down-btn');
    
    if (emergencyMorePrev) emergencyMorePrev.style.visibility = currentEmergencyPage > 0 ? 'visible' : 'hidden';
    if (emergencyMoreNext) emergencyMoreNext.style.visibility = endIndex < emergencyMessages.length ? 'visible' : 'hidden';
    
    // Update up/down button colors
    if (emergencyUpBtn) {
      if (currentEmergencyIndex === 0) {
        emergencyUpBtn.classList.add('footer-btn-grey');
        emergencyUpBtn.classList.remove('footer-btn-green');
      } else {
        emergencyUpBtn.classList.remove('footer-btn-grey');
        emergencyUpBtn.classList.add('footer-btn-green');
      }
    }
    
    if (emergencyDownBtn) {
      if (currentEmergencyIndex >= emergencyMessages.length - 1) {
        emergencyDownBtn.classList.add('footer-btn-grey');
        emergencyDownBtn.classList.remove('footer-btn-green');
      } else {
        emergencyDownBtn.classList.remove('footer-btn-grey');
        emergencyDownBtn.classList.add('footer-btn-green');
      }
    }
    
    highlightEmergencyItem(currentEmergencyIndex);
  }
  
  function highlightEmergencyItem(index) {
    emergencyItems.forEach((item, i) => {
      item.classList.toggle('selected', i === index);
    });
  }
  
  function updateEmergencyPlayButtonText() {
    const emergencyPlayBtn = document.getElementById('emergency-play-btn');
    if (emergencyPlayBtn) {
      emergencyPlayBtn.textContent = emergencyConfirmationPending ? 'Confirm' : 'Select';
    }
  }
  
  function playEmergencyMessage() {
    if (emergencyConfirmationPending) {
      // User confirmed - play the message
      const messageKey = emergencyMessages[currentEmergencyIndex];
      const audioPath = emergencyAudioFiles[messageKey];
      const displayLabel = emergencyDisplayText[messageKey];
      
      console.log('▶️ Playing emergency message:', messageKey, 'Label:', displayLabel);
      
      isPlayingSpecial = true;
      emergencyConfirmationPending = false;
      updateEmergencyPlayButtonText();
      
      // Update PID display
      updatePIDDisplay(displayLabel, 'special');
      currentAnnouncementDisplayText = displayLabel;
      currentAnnouncementAudioPath = audioPath;
      currentAnnouncementType = 'special';
      currentAnnouncementStation = displayLabel;
      currentAnnouncementSpecialMessageId = messageKey;
      
      if (audioPath) {
        setTimeout(() => {
          try {
            playAudio(audioPath);
            
            if (currentAudio) {
              const originalOnended = currentAudio.onended;
              currentAudio.onended = function() {
                if (originalOnended) originalOnended.call(this);
                isPlayingSpecial = false;
                console.log('✓ Emergency message playback finished');
              };
            }
          } catch (err) {
            console.error('Error playing emergency audio:', err);
            isPlayingSpecial = false;
          }
        }, 500);
      }
    } else {
      // User selected message - show confirmation
      const messageKey = emergencyMessages[currentEmergencyIndex];
      const displayLabel = emergencyDisplayText[messageKey];
      console.log('⚠️ Emergency message selected for confirmation:', displayLabel);
      emergencyConfirmationPending = true;
      updateEmergencyPlayButtonText();
    }
  }
  
  const emergencyFooterTopGap = document.getElementById('emergency-footer-top-gap');

  function showEmergencyPanel(previousScreenOverride = null) {
    resetFooterStackState();
    const noRouteEntered = !hasRouteInput();
    previousScreenBeforeEmergency = previousScreenOverride || (noRouteEntered ? 'startup' : capturePreviousUiScreen() || getCurrentUiScreenKey());
    previousScreenBeforeSpecial = null;
    // Track current footer
    if (!initialFooter.classList.contains('hide')) {
      previousFooter = 'initial';
    } else if (!startupFooter.classList.contains('hide')) {
      previousFooter = 'startup';
    } else if (!stationFooter.classList.contains('hide')) {
      previousFooter = 'station';
    } else if (!normalFooter.classList.contains('hide')) {
      previousFooter = 'normal';
    }
    
    // Hide all panels
    mainPanel.classList.add('hide');
    specialPanel.classList.add('hide');
    fnPanel.classList.add('hide');
    statusPanel.classList.add('hide');
    peiPanel.classList.add('hide');
    cctvPanel.classList.add('hide');
    document.body.classList.remove('cctv-active');
    
    // Show emergency panel
    const emergencyPanel = document.getElementById('emergency-panel');
    if (emergencyPanel) {
      emergencyPanel.classList.remove('hide');
    }
    
    // Hide all footers and show emergency footer
    if (initialFooter) initialFooter.classList.add('hide');
    startupFooter.classList.add('hide');
    stationFooter.classList.add('hide');
    normalFooter.classList.add('hide');
    specialFooter.classList.add('hide');
    fnFooter.classList.add('hide');
    statusFooter.classList.add('hide');
    if (typeof statusFooterLabel !== 'undefined' && statusFooterLabel) {
      statusFooterLabel.classList.add('hide');
    }
    peiFooter.classList.add('hide');
    
    const emergencyFooter = document.getElementById('emergency-footer');
    if (emergencyFooter) {
      emergencyFooter.classList.remove('hide');
    }
    if (emergencyFooterTopGap) {
      emergencyFooterTopGap.classList.remove('hide');
    }
    if (helperBar) {
      helperBar.classList.remove('hide');
      helperBar.textContent = 'Select emergency message. Press Select to confirm before playing.';
    }
    
    // Reset state
    currentEmergencyIndex = 0;
    currentEmergencyPage = 0;
    emergencyConfirmationPending = false;
    
    // Ensure messages are loaded and rendered
    if (!emergencyMessagesLoaded || emergencyItems.length === 0) {
      renderEmergencyMessages();
    }
    
    updateEmergencyDisplayPage();
    updateEmergencyPlayButtonText();
  }
  
  function hideEmergencyPanel() {
    if (isPlayingSpecial) {
      console.warn('⚠️ Emergency message is still playing - panel will not close');
      return;
    }

    if (!hasRouteInput()) {
      showKeyboardMode();
      return;
    }

    const emergencyPanel = document.getElementById('emergency-panel');
    if (emergencyPanel) {
      emergencyPanel.classList.add('hide');
    }

    const emergencyFooter = document.getElementById('emergency-footer');
    if (emergencyFooter) {
      emergencyFooter.classList.add('hide');
    }
    if (emergencyFooterTopGap) {
      emergencyFooterTopGap.classList.add('hide');
    }
    const targetScreen = previousScreenBeforeEmergency || previousUiScreen || previousFooter || 'special';
    previousScreenBeforeEmergency = null;
    previousScreenBeforeSpecial = null;

    clearAllUiPanels();

    if (targetScreen === 'initial' || targetScreen === 'startup') {
      if (!hasRouteInput()) {
        showKeyboardMode();
        return;
      }
    }

    restorePreviousUiScreen(targetScreen, previousUiScreen || 'startup');
  }
  
  // Wire up Special button to show special panel
  if (specialBtn) specialBtn.addEventListener('click', () => {
    if (specialBtn.textContent === 'Confirm') {
      performReset();
      return;
    }
    showSpecialPanel();
  });
  if (stationSpecialBtn) stationSpecialBtn.addEventListener('click', () => {
    if (stationSpecialBtn.textContent === 'Confirm') {
      performReset();
      return;
    }
    showSpecialPanel();
  });
  if (normalSpecialBtn) normalSpecialBtn.addEventListener('click', () => {
    if (normalSpecialBtn.textContent === 'Confirm') {
      performReset();
      return;
    }
    showSpecialPanel();
  });
  if (startupSpecialBtn) startupSpecialBtn.addEventListener('click', () => {
    if (startupSpecialBtn.textContent === 'Confirm') {
      performReset();
      return;
    }
    showSpecialPanel();
  });
  
  // Emergency button in special footer switches to emergency panel
  const specialEmergencyBtn = document.getElementById('special-emergency-btn');
  if (specialEmergencyBtn) {
    specialEmergencyBtn.addEventListener('click', () => {
      specialPanel.classList.add('hide');
      specialFooter.classList.add('hide');
      if (helperBar) helperBar.classList.add('hide');
      showEmergencyPanel('special');
    });
  }
  
  // Wire up emergency message button
  const emergencyPlayBtn = document.getElementById('emergency-play-btn');
  if (emergencyPlayBtn) {
    emergencyPlayBtn.addEventListener('click', playEmergencyMessage);
  }
  
  // Emergency panel navigation
  const emergencyUpBtn = document.getElementById('emergency-up-btn');
  const emergencyDownBtn = document.getElementById('emergency-down-btn');
  const emergencyMorePrev = document.getElementById('emergency-more-prev');
  const emergencyMoreNext = document.getElementById('emergency-more-next');
  const emergencySkipBtn = document.getElementById('emergency-skip-btn');
  const emergencyResetBtn = document.getElementById('emergency-reset-btn');
  
  if (emergencyUpBtn) {
    emergencyUpBtn.addEventListener('click', () => {
      currentEmergencyIndex--;
      if (currentEmergencyIndex < 0) currentEmergencyIndex = emergencyMessages.length - 1;
      currentEmergencyPage = Math.floor(currentEmergencyIndex / EMERGENCY_ITEMS_PER_PAGE);
      emergencyConfirmationPending = false;
      updateEmergencyPlayButtonText();
      updateEmergencyDisplayPage();
    });
  }
  
  if (emergencyDownBtn) {
    emergencyDownBtn.addEventListener('click', () => {
      currentEmergencyIndex++;
      if (currentEmergencyIndex >= emergencyMessages.length) currentEmergencyIndex = 0;
      currentEmergencyPage = Math.floor(currentEmergencyIndex / EMERGENCY_ITEMS_PER_PAGE);
      emergencyConfirmationPending = false;
      updateEmergencyPlayButtonText();
      updateEmergencyDisplayPage();
    });
  }
  
  if (emergencyMorePrev) {
    emergencyMorePrev.addEventListener('click', () => {
      if (currentEmergencyPage > 0) {
        currentEmergencyPage--;
        currentEmergencyIndex = (currentEmergencyPage + 1) * EMERGENCY_ITEMS_PER_PAGE - 1;
        updateEmergencyDisplayPage();
      }
    });
  }
  
  if (emergencyMoreNext) {
    emergencyMoreNext.addEventListener('click', () => {
      const maxPages = Math.ceil(emergencyMessages.length / EMERGENCY_ITEMS_PER_PAGE);
      if (currentEmergencyPage < maxPages - 1) {
        currentEmergencyPage++;
        currentEmergencyIndex = currentEmergencyPage * EMERGENCY_ITEMS_PER_PAGE;
        updateEmergencyDisplayPage();
      }
    });
  }
  
  if (emergencySkipBtn) {
    emergencySkipBtn.addEventListener('click', () => {
      isPlayingSpecial = false;
      closeSecondaryMenuAndRestorePreviousScreen();
    });
  }
  
  if (emergencyResetBtn) {
    emergencyResetBtn.addEventListener('click', () => {
      isPlayingSpecial = false;
      closeSecondaryMenuAndRestorePreviousScreen();
    });
  }
  
  // Navigation
  if (specialUpBtn) specialUpBtn.addEventListener('click', () => {
    currentSpecialIndex--;
    if (currentSpecialIndex < 0) currentSpecialIndex = specialMessages.length - 1;
    
    // Update page based on new index
    currentSpecialPage = Math.floor(currentSpecialIndex / SPECIAL_ITEMS_PER_PAGE);
    updateSpecialDisplayPage();
  });
  
  if (specialDownBtn) specialDownBtn.addEventListener('click', () => {
    currentSpecialIndex++;
    if (currentSpecialIndex >= specialMessages.length) currentSpecialIndex = 0;
    
    // Update page based on new index
    currentSpecialPage = Math.floor(currentSpecialIndex / SPECIAL_ITEMS_PER_PAGE);
    updateSpecialDisplayPage();
  });
  
  // Previous page button
  if (specialMorePrev) specialMorePrev.addEventListener('click', () => {
    if (currentSpecialPage > 0) {
      currentSpecialPage--;
      // Set index to last item of previous page
      currentSpecialIndex = (currentSpecialPage + 1) * SPECIAL_ITEMS_PER_PAGE - 1;
      updateSpecialDisplayPage();
    }
  });
  
  // Next page button
  if (specialMoreNext) specialMoreNext.addEventListener('click', () => {
    const maxPages = Math.ceil(specialMessages.length / SPECIAL_ITEMS_PER_PAGE);
    if (currentSpecialPage < maxPages - 1) {
      currentSpecialPage++;
      // Set index to first item of next page
      currentSpecialIndex = currentSpecialPage * SPECIAL_ITEMS_PER_PAGE;
      updateSpecialDisplayPage();
    }
  });
  
  // Click on items to select
  specialItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      const messageIndex = specialMessages.indexOf(item.dataset.message);
      currentSpecialIndex = messageIndex >= 0 ? messageIndex : index;
      // Ensure we're on the right page
      currentSpecialPage = Math.floor(currentSpecialIndex / SPECIAL_ITEMS_PER_PAGE);
      updateSpecialDisplayPage();
    });
  });
  
  // Play button plays the selected special message
  if (specialPlayBtn) specialPlayBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    playSpecialMessage();
    isPlayingSpecial = false;
    closeSecondaryMenuAndRestorePreviousScreen();
  });
  
  // Stop button stops audio and clears display
  if (specialStopBtn) specialStopBtn.addEventListener('click', () => {
    stopCurrentDvaAndPid();
    isPlayingSpecial = false;  // Allow panel to close after stopping
  });
  
  // Skip/Reset returns to previous screen - allows exit without stopping audio
  if (specialSkipBtn) specialSkipBtn.addEventListener('click', () => {
    // Allow exit without stopping audio
    isPlayingSpecial = false;
    closeSecondaryMenuAndRestorePreviousScreen();
  });
  if (specialResetBtn) specialResetBtn.addEventListener('click', () => {
    // Allow exit without stopping audio
    isPlayingSpecial = false;
    closeSecondaryMenuAndRestorePreviousScreen();
  });
  
  // Side panel buttons
  if (specialPeiBtn) specialPeiBtn.addEventListener('click', () => {
    specialPanel.classList.add('hide');
    specialFooter.classList.add('hide');
    showPeiPanel('main');
  });
  
  if (specialCctvBtn) specialCctvBtn.addEventListener('click', () => {
    specialPanel.classList.add('hide');
    specialFooter.classList.add('hide');
    showCctvPanel();
  });
  
  if (specialFnBtn) specialFnBtn.addEventListener('click', () => {
    specialPanel.classList.add('hide');
    specialFooter.classList.add('hide');
    showFnPanel();
  });

  // Emergency panel side buttons
  const emergencyPeiBtn = document.getElementById('emergency-pei-btn');
  const emergencyCctvBtn = document.getElementById('emergency-cctv-btn');
  const emergencyFnBtn = document.getElementById('emergency-fn-btn');
  
  if (emergencyPeiBtn) emergencyPeiBtn.addEventListener('click', () => {
    const emergencyPanel = document.getElementById('emergency-panel');
    const emergencyFooter = document.getElementById('emergency-footer');
    if (emergencyPanel) emergencyPanel.classList.add('hide');
    if (emergencyFooter) emergencyFooter.classList.add('hide');
    showPeiPanel('emergency');
  });
  
  if (emergencyCctvBtn) emergencyCctvBtn.addEventListener('click', () => {
    const emergencyPanel = document.getElementById('emergency-panel');
    const emergencyFooter = document.getElementById('emergency-footer');
    if (emergencyPanel) emergencyPanel.classList.add('hide');
    if (emergencyFooter) emergencyFooter.classList.add('hide');
    showCctvPanel();
  });
  
  if (emergencyFnBtn) emergencyFnBtn.addEventListener('click', () => {
    const emergencyPanel = document.getElementById('emergency-panel');
    const emergencyFooter = document.getElementById('emergency-footer');
    if (emergencyPanel) emergencyPanel.classList.add('hide');
    if (emergencyFooter) emergencyFooter.classList.add('hide');
    showFnPanel();
  });

  // ==================== Reset Function ====================
  
  function performReset() {
    console.log('🔄 Full app reset triggered');
    restoreNormalFooterLabels();

    const emergencyPanel = document.getElementById('emergency-panel');
    const emergencyFooter = document.getElementById('emergency-footer');

    // Reset core route and display state
    runNumberInput.value = '';
    if (runInput) runInput.value = '';
    routeConfirmed = false;
    if (routeHardwareTimer) {
      clearTimeout(routeHardwareTimer);
      routeHardwareTimer = null;
    }
    if (routeHeader) routeHeader.classList.remove('route-hardware-delay');

    stopTSWAutomation();
    resetTSWAutomationState();

    // Reset GTFS route state
    currentGTFSTrip = null;
    currentManualRoute = null;
    currentManualFormFile = null;
    currentRouteFormCode = null;
    currentRouteLongName = null;
    currentDestinationStation = null;
    currentStation = null;
    currentStations = [];
    selectedStation = null;
    currentHighlightIndex = 0;
    closestStationIndex = 0;
    clearPendingAnnouncement();
    updateRouteInputUI();
    updateRouteDisplay();

    // Reset panel state
    if (mainPanel) mainPanel.classList.remove('hide');
    if (fnPanel) fnPanel.classList.add('hide');
    if (statusPanel) statusPanel.classList.add('hide');
    if (peiPanel) peiPanel.classList.add('hide');
    if (cctvPanel) cctvPanel.classList.add('hide');
    document.body.classList.remove('cctv-active');
    if (specialPanel) specialPanel.classList.add('hide');
    if (emergencyPanel) emergencyPanel.classList.add('hide');
    if (emergencyFooter) emergencyFooter.classList.add('hide');

    isPlayingSpecial = false;
    emergencyConfirmationPending = false;
    currentEmergencyIndex = 0;
    currentEmergencyPage = 0;
    if (typeof updateEmergencyPlayButtonText === 'function') {
      updateEmergencyPlayButtonText();
    }

    // Reset PID and DI displays
    if (pidDisplay) pidDisplay.textContent = '-';
    if (diDisplay) diDisplay.textContent = '-';

    // Reset door cycle state
    doorsCycled = false;
    if (doorCycleDisplay) doorCycleDisplay.textContent = 'N';

    if (doorCycleSequenceTimer1) {
      clearTimeout(doorCycleSequenceTimer1);
      doorCycleSequenceTimer1 = null;
    }
    if (doorCycleSequenceTimer2) {
      clearTimeout(doorCycleSequenceTimer2);
      doorCycleSequenceTimer2 = null;
    }

    // Reset selected station display state
    const stationListContainer = document.getElementById('station-list-container');
    const modeTitle = document.getElementById('mode-title');
    if (stationListContainer) stationListContainer.classList.remove('show');
    if (modeTitle) modeTitle.classList.add('hide');

    // Reset day selection to today's valid day and clear stale GTFS matches
    if (typeof selectCurrentDay === 'function') {
      selectCurrentDay();
    }
    gtfsCache.clear();
    currentGTFSTrip = null;

    // Restore a guaranteed visible startup screen so reset cannot leave the app blank.
    showKeyboardMode();

    // Reset display windows without reloading the page
    if (displayWindow && !displayWindow.closed) {
      displayWindow.postMessage({ type: 'RESET' }, '*');
    }
    if (destinationWindow && !destinationWindow.closed) {
      destinationWindow.postMessage({ type: 'RESET' }, '*');
    }
  }
  
  // Wire up reset buttons - respect the confirmation flow and undo state
  if (resetBtn) {
    resetBtn.addEventListener('click', function(e) {
      if (resetBtn.textContent === 'Cancel') {
        e.preventDefault();
        e.stopPropagation();
        cancelResetConfirmation();
        return;
      }
      if (resetBtn.textContent === 'Confirm') {
        e.preventDefault();
        e.stopPropagation();
        performReset();
        return;
      }

      if (!stationCodeModeContainer.classList.contains('hide')) {
        e.preventDefault();
        e.stopPropagation();
        closeStationCodeKeyboard();
        return;
      }

      const manualListContainer = document.getElementById('manual-list-container');
      const isManualMode = manualListContainer && !manualListContainer.classList.contains('hide');
      if (isManualMode) {
        e.preventDefault();
        e.stopPropagation();
        switchFromManualMode();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      beginResetConfirmation();
    });
  }

  if (stationResetBtn) {
    stationResetBtn.addEventListener('click', function(e) {
      if (stationResetBtn.textContent === 'Cancel') {
        e.preventDefault();
        e.stopPropagation();
        cancelResetConfirmation();
        return;
      }
      if (stationResetBtn.textContent === 'Confirm') {
        e.preventDefault();
        e.stopPropagation();
        performReset();
        return;
      }

      if (!stationCodeModeContainer.classList.contains('hide')) {
        e.preventDefault();
        e.stopPropagation();
        closeStationCodeKeyboard();
        return;
      }

      const manualListContainer = document.getElementById('manual-list-container');
      const isManualMode = manualListContainer && !manualListContainer.classList.contains('hide');
      if (isManualMode) {
        e.preventDefault();
        e.stopPropagation();
        switchFromManualMode();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      beginResetConfirmation();
    });
  }

  if (normalResetBtn) {
    normalResetBtn.addEventListener('click', function(e) {
      if (normalResetBtn.textContent === 'Cancel') {
        e.preventDefault();
        e.stopPropagation();
        cancelResetConfirmation();
        return;
      }
      if (normalResetBtn.textContent === 'Confirm') {
        e.preventDefault();
        e.stopPropagation();
        performReset();
        return;
      }

      if (!stationCodeModeContainer.classList.contains('hide')) {
        e.preventDefault();
        e.stopPropagation();
        closeStationCodeKeyboard();
        return;
      }

      const manualListContainer = document.getElementById('manual-list-container');
      const isManualMode = manualListContainer && !manualListContainer.classList.contains('hide');
      if (isManualMode) {
        e.preventDefault();
        e.stopPropagation();
        switchFromManualMode();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      beginResetConfirmation();
    });
  }

  // Initialize stop button colors (grey by default)
  updateStopButtonColor();
  } catch (error) {
    console.error('❌ CRITICAL ERROR during initialization:', error);
    console.error(error.stack);
    alert(`App initialization error: ${error.message}`);
  }
});

// ==================== CONSOLE HELPER FUNCTIONS ====================
// Expose search functions globally for console access

// Helper function to display search results in the console
window.findRoutesByRunNumber = async function(runNumber) {
  console.log(`\n🔍 Searching for routes with run number: "${runNumber}"\n`);
  const results = await searchRoutesByRunNumber(runNumber);
  
  if (results.length === 0) {
    console.log(`❌ No routes found for run number "${runNumber}"`);
    return [];
  }
  
  console.log(`✅ Found ${results.length} route(s):\n`);
  results.forEach((route, index) => {
    console.log(`\n━━━ Route ${index + 1} ━━━`);
    console.log(`Trip ID: ${route.tripId}`);
    console.log(`Form Code: ${route.formCode}`);
    console.log(`Route ID: ${route.routeId}`);
    console.log(`Route Name: ${route.routeName}`);
    console.log(`Destination: ${route.destination}`);
    console.log(`Direction: ${route.directionId}`);
    console.log(`Stations: ${route.stoppingPattern.length}`);
    
    if (route.stoppingPattern.length > 0) {
      console.log(`Stopping Pattern:`);
      route.stoppingPattern.forEach((station, i) => {
        const platform = station.platform ? ` [Platform ${station.platform}]` : '';
        console.log(`  ${i + 1}. ${station.name} (${station.code})${platform}`);
      });
    }
  });
  
  return results;
};

// Alternative: search by partial run number (substring match)
window.findRoutesByPartialRunNumber = async function(partialRunNumber) {
  console.log(`\n🔍 Searching for routes containing run number: "${partialRunNumber}"\n`);
  
  let currentTripMap = tripIdMap;
  if (globalGTFSData && globalGTFSData.tripIdMap && Object.keys(currentTripMap).length === 0) {
    currentTripMap = globalGTFSData.tripIdMap;
  }
  
  if (!currentTripMap || Object.keys(currentTripMap).length === 0) {
    console.warn('⚠️ No trip ID map available');
    return [];
  }
  
  const upperPartial = partialRunNumber.toUpperCase();
  const matches = [];
  
  for (const [tripId, routeId] of Object.entries(currentTripMap)) {
    if (tripId.toUpperCase().includes(upperPartial)) {
      if (globalGTFSData && globalGTFSData.routes && globalGTFSData.routes[routeId]) {
        const routeData = globalGTFSData.routes[routeId];
        
        // Extract form code from trip id
        const formCode = tripId.substring(tripId.lastIndexOf('-') + 1);
        
        // Find matching pattern
        let matchedPattern = null;
        if (routeData.patterns && Array.isArray(routeData.patterns)) {
          for (const pattern of routeData.patterns) {
            if (pattern.form_code === formCode && pattern.trip_id === tripId) {
              matchedPattern = pattern;
              break;
            }
          }
        }
        
        let stoppingPattern = null;
        if (matchedPattern && matchedPattern.stops && Array.isArray(matchedPattern.stops)) {
          stoppingPattern = matchedPattern.stops.map(station => ({
            name: normalizeStationName(station.name),
            code: station.code
          }));
        }
        
        matches.push({
          tripId: tripId,
          formCode: formCode,
          routeId: routeId,
          destination: routeData.route_long_name || 'Unknown',
          routeName: routeData.route_name || routeId,
          stoppingPattern: stoppingPattern || []
        });
      }
    }
  }
  
  if (matches.length === 0) {
    console.log(`❌ No routes found containing "${partialRunNumber}"`);
    return [];
  }
  
  console.log(`✅ Found ${matches.length} route(s):\n`);
  matches.forEach((route, index) => {
    console.log(`\n━━━ Route ${index + 1} ━━━`);
    console.log(`Trip ID: ${route.tripId}`);
    console.log(`Form Code: ${route.formCode}`);
    console.log(`Route ID: ${route.routeId}`);
    console.log(`Route Name: ${route.routeName}`);
    console.log(`Destination: ${route.destination}`);
    console.log(`Stations: ${route.stoppingPattern.length}`);
    
    if (route.stoppingPattern.length > 0) {
      console.log(`Stopping Pattern (first 5):`);
      route.stoppingPattern.slice(0, 5).forEach((station, i) => {
        console.log(`  ${i + 1}. ${station.name} (${station.code})`);
      });
      if (route.stoppingPattern.length > 5) {
        console.log(`  ... and ${route.stoppingPattern.length - 5} more`);
      }
    }
  });
  
  return matches;
};

// Helper to view GTFS data status
window.checkGTFSData = function() {
  console.log('\n📊 GTFS DATA STATUS:\n');
  console.log(`globalGTFSData loaded: ${globalGTFSData ? '✅ Yes' : '❌ No'}`);
  
  if (globalGTFSData) {
    console.log(`Total routes: ${globalGTFSData.totalRoutes || 'Unknown'}`);
    console.log(`Trip ID mappings: ${Object.keys(globalGTFSData.tripIdMap || {}).length}`);
    
    if (globalGTFSData.routes) {
      console.log(`Routes data: ${Object.keys(globalGTFSData.routes).length} routes`);
      
      // Show sample of routes
      const sampleRoutes = Object.entries(globalGTFSData.routes).slice(0, 3);
      console.log(`Sample routes with pattern counts:`);
      sampleRoutes.forEach(([routeId, routeData]) => {
        const patternCount = routeData.patterns ? routeData.patterns.length : 0;
        console.log(`  ${routeId}: ${patternCount} patterns`);
      });
    }
  }
  
  console.log(`\nTrip ID map (local): ${Object.keys(tripIdMap).length} entries`);
  console.log(`Run code index: ${Object.keys(runCodeIndex).length} entries`);
};

console.log(`✅ Route search helpers loaded! Use these commands:`);
console.log(`  • findRoutesByRunNumber("18S4")        - Find routes by exact run number (FORM_CODE + TRIP_ID matching)`);
console.log(`  • findRoutesByPartialRunNumber("18S")   - Find routes by partial run number`);
console.log(`  • checkGTFSData()                        - Check GTFS data status`);