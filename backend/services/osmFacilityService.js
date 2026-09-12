const axios = require('axios');

// Overpass is a free, keyless query API over OpenStreetMap data.
// Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Simple in-memory cache so repeated searches near the same spot don't
// hammer the public Overpass endpoint (it's a shared, rate-limited service).
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const buildQuery = (lat, lon, radiusMeters) => `
  [out:json][timeout:25];
  (
    node["amenity"~"^(hospital|clinic|doctors)$"](around:${radiusMeters},${lat},${lon});
    way["amenity"~"^(hospital|clinic|doctors)$"](around:${radiusMeters},${lat},${lon});
    node["healthcare"](around:${radiusMeters},${lat},${lon});
    way["healthcare"](around:${radiusMeters},${lat},${lon});
  );
  out center tags;
`;

// Map OSM's tagging scheme onto this project's facility "type" categories.
// OSM doesn't distinguish PHC/CHC/District Hospital the way India's public
// health system does, so this is a best-effort heuristic.
const mapAmenityToType = (tags) => {
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'District Hospital';
  if (tags.amenity === 'clinic' || tags.healthcare === 'clinic') return 'CHC';
  if (tags.amenity === 'doctors' || tags.healthcare === 'doctor') return 'PHC';
  return 'PHC';
};

const buildAddress = (tags) => {
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Address not tagged on OpenStreetMap';
};

const elementToFacility = (el) => {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  if (!tags.name) return null; // skip unnamed nodes, too low quality to show a patient

  const id = `osm-${el.type}-${el.id}`;

  return {
    _id: id,
    id: id,
    name: tags.name,
    type: mapAmenityToType(tags),
    address: buildAddress(tags),
    village: tags['addr:suburb'] || tags['addr:city'] || '',
    district: tags['addr:city'] || tags['addr:district'] || '',
    state: tags['addr:state'] || '',
    latitude: lat,
    longitude: lon,
    phone: tags.phone || tags['contact:phone'] || null,
    emergencyPhone: '108',
    services: tags['healthcare:speciality'] ? tags['healthcare:speciality'].split(';').map(s => s.trim()) : [],
    diagnosticsAvailable: [],
    emergencyAvailable: tags.emergency === 'yes',
    openingHours: tags.opening_hours || 'Not listed on OpenStreetMap',
    bedCapacity: tags.beds ? Number(tags.beds) : undefined,
    availableBeds: undefined,
    doctorsAvailableNow: undefined,
    source: 'OpenStreetMap',
  };
};

const dedupe = (facilities) => {
  const seen = new Set();
  return facilities.filter((f) => {
    const key = `${f.name}|${f.latitude.toFixed(4)}|${f.longitude.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Fetch real hospitals/clinics near a point from OpenStreetMap via Overpass.
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusMeters defaults to 15km
 * @returns {Promise<Array>} facility-shaped objects (no distanceKm yet)
 */
const fetchNearbyHospitalsFromOSM = async (lat, lon, radiusMeters = 15000) => {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${radiusMeters}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  const query = buildQuery(lat, lon, radiusMeters);
  const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
  });

  const elements = response.data?.elements || [];
  const facilities = dedupe(elements.map(elementToFacility).filter(Boolean));

  cache.set(cacheKey, { data: facilities, time: Date.now() });
  return facilities;
};

module.exports = { fetchNearbyHospitalsFromOSM };
