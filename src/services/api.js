/**
 * src/services/api.js
 * API client and services for facilities and appointments.
 * Works seamlessly with the Express backend, while providing robust
 * client-side fallbacks (direct Overpass API & Supabase/mock data)
 * when running in standalone mode.
 */

import axios from 'axios';
import { MOCK_FACILITIES, MOCK_DOCTORS_BY_FACILITY, MOCK_APPOINTMENTS } from '../lib/mockData';
import { 
  getFacilities as getDbFacilities, 
  getFacilityById as getDbFacilityById, 
  getDoctorsByFacility as getDbDoctors,
  getMyAppointments as getDbAppointments,
  bookAppointment as dbBookAppointment,
  cancelAppointment as dbCancelAppointment,
  approveAppointment as dbApproveAppointment
} from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DB_TO_DISPLAY_TYPE, DISPLAY_TO_DB_TYPE } from '../lib/facilityTypes';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── In-memory cache for live OSM facilities so Details & Booking pages can resolve them ──
export const liveOsmCache = new Map();

// Helper: Haversine distance
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ── Browser-side Overpass API direct fallback if backend server isn't running ──
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const buildOverpassQuery = (lat, lon, radiusMeters) => `
  [out:json][timeout:25];
  (
    node["amenity"~"^(hospital|clinic|doctors)$"](around:${radiusMeters},${lat},${lon});
    way["amenity"~"^(hospital|clinic|doctors)$"](around:${radiusMeters},${lat},${lon});
    node["healthcare"](around:${radiusMeters},${lat},${lon});
    way["healthcare"](around:${radiusMeters},${lat},${lon});
  );
  out center tags;
`;

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
  if (!tags.name) return null;

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

async function fetchDirectOverpass(lat, lon, radiusMeters = 15000) {
  const query = buildOverpassQuery(lat, lon, radiusMeters);
  const res = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
  });

  const elements = res.data?.elements || [];
  const seen = new Set();
  const list = [];

  for (const el of elements) {
    const f = elementToFacility(el);
    if (!f) continue;
    const key = `${f.name}|${f.latitude.toFixed(4)}|${f.longitude.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(f);
  }

  return list;
}

// ── Facility Service ──────────────────────────────────────────
export const facilityService = {
  /**
   * Fetch curated facilities (from backend / Supabase / Mock)
   */
  getAll: async (params = {}) => {
    // Only query Express backend if VITE_API_URL is explicitly configured
    if (import.meta.env.VITE_API_URL) {
      try {
        const response = await api.get('/facilities', { params });
        if (response.data?.facilities) {
          return response.data.facilities;
        }
      } catch (err) {
        // Backend not running or failed; fall back gracefully
      }
    }

    const {
      search = '',
      type = '',
      district = '',
      emergency = false,
      maxDistance = 0,
      lat = null,
      lng = null,
    } = params;

    const pLat = lat != null ? parseFloat(lat) : null;
    const pLng = lng != null ? parseFloat(lng) : null;
    const hasCoords = pLat != null && pLng != null && !isNaN(pLat) && !isNaN(pLng);

    // 1. Try Supabase PostGIS / SQL get_nearby_facilities RPC if coords are available
    if (isSupabaseConfigured() && hasCoords) {
      try {
        const dbType = DISPLAY_TO_DB_TYPE[type] || type || null;
        const radius = maxDistance > 0 ? maxDistance : 40;
        const { data: rpcFacilities, error: rpcError } = await supabase.rpc('get_nearby_facilities', {
          user_lat: pLat,
          user_lng: pLng,
          radius_km: radius,
          facility_filter: dbType,
          search_query: search.trim() || null,
        });

        if (!rpcError && Array.isArray(rpcFacilities) && rpcFacilities.length > 0) {
          return rpcFacilities.map(f => {
            const mapped = {
              ...f,
              id: f.id,
              latitude: Number(f.lat),
              longitude: Number(f.lng),
              type: DB_TO_DISPLAY_TYPE[f.type] || f.type,
              emergencyAvailable: f.emergency_available ?? true,
              distanceKm: f.distance_km != null ? Number(f.distance_km) : calculateDistanceKm(pLat, pLng, f.lat, f.lng),
              phone: f.phone || '+91 1800-180-1104',
              address: f.address || `${f.name}, ${f.district || ''}`,
            };
            liveOsmCache.set(f.id, mapped);
            return mapped;
          });
        }
      } catch (rpcEx) {
        // Fall back to table query or mock data
      }
    }

    // 2. Fallback to Supabase table / MockData
    let data;
    if (isSupabaseConfigured()) {
      try {
        data = await getDbFacilities();
      } catch {
        data = MOCK_FACILITIES;
      }
    } else {
      data = MOCK_FACILITIES;
    }

    if (!data || data.length === 0) data = MOCK_FACILITIES;

    let result = data.map(f => {
      const latVal = f.latitude ?? (f.lat != null ? Number(f.lat) : null);
      const lngVal = f.longitude ?? (f.lng != null ? Number(f.lng) : null);
      return {
        ...f,
        id: f.id || f._id,
        latitude: latVal,
        longitude: lngVal,
        type: DB_TO_DISPLAY_TYPE[f.type] || f.type,
        emergencyAvailable: f.emergencyAvailable ?? f.emergency_available ?? false,
        distanceKm: hasCoords && latVal != null && lngVal != null
          ? calculateDistanceKm(pLat, pLng, latVal, lngVal)
          : null
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        f.village?.toLowerCase().includes(q) ||
        f.district?.toLowerCase().includes(q) ||
        f.state?.toLowerCase().includes(q) ||
        f.address?.toLowerCase().includes(q) ||
        f.services?.some(s => s.toLowerCase().includes(q))
      );
    }

    if (type) result = result.filter(f => f.type === type);
    if (district) result = result.filter(f => f.district === district);
    if (emergency) result = result.filter(f => f.emergencyAvailable);
    if (maxDistance > 0 && hasCoords && !search.trim()) {
      result = result.filter(f => f.distanceKm == null || f.distanceKm <= maxDistance);
    }

    if (hasCoords) {
      result.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return result;
  },

  /**
   * Fetch live hospital data from OpenStreetMap / Overpass API
   */
  getLive: async (params = {}) => {
    const { lat, lng, radius = 15000, maxDistance = 0 } = params;
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);

    if (isNaN(pLat) || isNaN(pLng)) {
      throw new Error('Valid lat and lng are required for live OpenStreetMap search.');
    }

    let facilities = [];

    // Try backend live endpoint first if configured
    if (import.meta.env.VITE_API_URL) {
      try {
        const response = await api.get('/facilities/live', { params: { lat: pLat, lng: pLng, radius } });
        if (response.data?.facilities) {
          facilities = response.data.facilities;
        }
      } catch {
        // Fall back to direct Overpass
      }
    }

    if (facilities.length === 0) {
      // Direct Overpass API query
      try {
        const raw = await fetchDirectOverpass(pLat, pLng, radius);
        facilities = raw
          .map(f => ({
            ...f,
            distanceKm: calculateDistanceKm(pLat, pLng, f.latitude, f.longitude)
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm);
      } catch (e) {
        console.warn('Overpass fetch failed:', e);
      }
    }

    // Cache each returned OSM facility so details & booking pages can look them up
    facilities.forEach(f => {
      liveOsmCache.set(f.id, f);
      liveOsmCache.set(f._id, f);
    });

    if (maxDistance > 0) {
      facilities = facilities.filter(f => f.distanceKm == null || f.distanceKm <= maxDistance);
    }

    return facilities;
  },

  /**
   * Get single facility by ID (supports curated and live OSM facilities)
   */
  getById: async (id) => {
    // 1. Check live OSM cache first if ID starts with osm-
    if (liveOsmCache.has(id)) {
      const fac = liveOsmCache.get(id);
      return { facility: fac, doctors: [] };
    }

    // 2. Try backend if configured
    if (import.meta.env.VITE_API_URL) {
      try {
        const res = await api.get(`/facilities/${id}`);
        if (res.data?.facility) {
          return {
            facility: res.data.facility,
            doctors: res.data.doctors || []
          };
        }
      } catch {
        // Backend failed, fallback to local/supabase
      }
    }

    // 3. Try Supabase
    if (isSupabaseConfigured()) {
      try {
        const [fac, docs] = await Promise.all([
          getDbFacilityById(id),
          getDbDoctors(id)
        ]);
        if (fac) {
          const formattedFac = {
            ...fac,
            latitude: fac.latitude ?? (fac.lat != null ? Number(fac.lat) : null),
            longitude: fac.longitude ?? (fac.lng != null ? Number(fac.lng) : null),
            type: DB_TO_DISPLAY_TYPE[fac.type] || fac.type,
            emergencyAvailable: fac.emergencyAvailable ?? fac.emergency_available ?? true,
          };
          const formattedDocs = (docs || []).map(d => ({
            id: d.id,
            name: d.profiles?.full_name || 'Dr. Unknown',
            specialization: d.specialization,
            isAvailable: d.is_available,
            phone: d.profiles?.phone,
          }));
          return { facility: formattedFac, doctors: formattedDocs };
        }
      } catch {
        // Continue to mock fallback
      }
    }

    // 4. Mock fallback
    const fac = MOCK_FACILITIES.find(f => f.id === id || f._id === id) || null;
    const docs = MOCK_DOCTORS_BY_FACILITY[id] || [];
    return { facility: fac, doctors: docs };
  }
};

// ── In-memory / localStorage appointment storage for demo/standalone ──
const STORAGE_KEY = 'careconnect_appointments';

function getStoredAppointments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return MOCK_APPOINTMENTS;
}

function saveStoredAppointments(appts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appts));
  } catch {}
}

// ── Appointment Service ──────────────────────────────────────────
export const appointmentService = {
  getAll: async () => {
    let dbList = [];
    // 1. Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const dbAppts = await getDbAppointments();
        if (dbAppts && dbAppts.length > 0) {
          dbList = dbAppts.map(a => {
            const dt = a.scheduled_at ? new Date(a.scheduled_at) : null;
            return {
              ...a,
              _id: a.id,
              date: dt ? dt.toISOString().split('T')[0] : '',
              time: dt ? dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
              timeSlot: dt ? dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
              doctor: a.doctors?.profiles?.full_name || (a.doctors?.specialization ? `Dr. (${a.doctors.specialization})` : 'Attending Physician'),
              doctorId: a.doctors?.id,
              facility: a.facilities?.name || 'CareConnect Facility',
              facilityId: a.facilities?.id,
              type: 'OPD Consultation',
              consultationType: a.mode || 'in-person',
              mode: a.mode || 'in-person',
              symptoms: a.reason || '',
              queueNo: a.queues?.[0]?.queue_number || 'A-01',
              queue_no: a.queues?.[0]?.queue_number || 'A-01',
            };
          });
        }
      } catch (e) {
        console.warn('Supabase getAppointments failed, falling back to local storage:', e);
      }
    }

    // 2. Try Express backend if configured
    if (import.meta.env.VITE_API_URL && dbList.length === 0) {
      try {
        const res = await api.get('/appointments');
        if (res.data?.appointments) {
          dbList = res.data.appointments;
        }
      } catch {
        // Fallback to stored/mock appointments
      }
    }

    // 3. Merge with stored appointments so locally created or cancelled appointments are respected
    const stored = getStoredAppointments();
    if (dbList.length === 0) {
      return stored;
    }

    const storedMap = new Map(stored.map(s => [s.id || s._id, s]));
    const merged = dbList.map(a => {
      const local = storedMap.get(a.id || a._id);
      return local ? { ...a, ...local } : a;
    });

    const dbIds = new Set(dbList.map(a => a.id || a._id));
    for (const s of stored) {
      if (!dbIds.has(s.id) && !dbIds.has(s._id)) {
        merged.push(s);
      }
    }

    return merged;
  },

  book: async (appointmentData) => {
    const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));

    // 1. Try Supabase first if configured and facilityId is a valid UUID
    if (isSupabaseConfigured() && isUuid(appointmentData.facilityId)) {
      try {
        let scheduledAt = new Date().toISOString();
        if (appointmentData.date && appointmentData.timeSlot) {
          scheduledAt = new Date(`${appointmentData.date}T${appointmentData.timeSlot}:00`).toISOString();
        } else if (appointmentData.date) {
          scheduledAt = new Date(`${appointmentData.date}T09:00:00`).toISOString();
        }

        const res = await dbBookAppointment({
          facilityId: appointmentData.facilityId,
          doctorId: isUuid(appointmentData.doctorId) ? appointmentData.doctorId : undefined,
          scheduledAt,
          mode: appointmentData.consultationType || 'in-person',
          reason: appointmentData.symptoms || 'General Consultation',
        });

        const queueNo = res?.queue_number || `A-0${Math.floor(Math.random() * 50) + 1}`;
        const newAppt = {
          id: res?.appointment_id || `a-${Date.now()}`,
          _id: res?.appointment_id || `a-${Date.now()}`,
          date: appointmentData.date,
          time: appointmentData.timeSlot,
          timeSlot: appointmentData.timeSlot,
          doctor: appointmentData.doctorName || 'Attending Physician',
          doctorId: appointmentData.doctorId,
          facility: appointmentData.facilityName || 'CareConnect Facility',
          facilityId: appointmentData.facilityId,
          type: 'OPD Consultation',
          consultationType: appointmentData.consultationType || 'in-person',
          mode: appointmentData.consultationType || 'in-person',
          symptoms: appointmentData.symptoms || '',
          referralId: appointmentData.referralId || null,
          referralDept: appointmentData.referralDept || null,
          isReferral: !!appointmentData.referralId,
          status: 'pending',
          queueNo,
          queue_no: queueNo,
          createdAt: new Date().toISOString()
        };

        const current = getStoredAppointments();
        saveStoredAppointments([newAppt, ...current]);
        return newAppt;
      } catch (err) {
        console.warn('Supabase bookAppointment error, using fallback:', err);
      }
    }

    // 2. Try Express backend if configured
    if (import.meta.env.VITE_API_URL) {
      try {
        const res = await api.post('/appointments', {
          ...appointmentData,
          status: 'pending'
        });
        if (res.data?.appointment) {
          const appt = { ...res.data.appointment, status: res.data.appointment.status || 'pending' };
          const current = getStoredAppointments();
          saveStoredAppointments([appt, ...current]);
          return appt;
        }
      } catch (err) {
        console.warn('Backend book appointment failed, using local storage:', err);
      }
    }

    // 3. Fallback: Local booking (guarantees 100% success in standalone, demo, and offline modes)
    const current = getStoredAppointments();
    const queueNo = `A-0${current.length + 31}`;
    const newAppt = {
      id: `a-${Date.now()}`,
      _id: `a-${Date.now()}`,
      date: appointmentData.date,
      time: appointmentData.timeSlot,
      timeSlot: appointmentData.timeSlot,
      doctor: appointmentData.doctorName || 'Attending Physician',
      doctorId: appointmentData.doctorId,
      facility: appointmentData.facilityName || 'CareConnect Facility',
      facilityId: appointmentData.facilityId,
      type: 'OPD Consultation',
      consultationType: appointmentData.consultationType || 'in-person',
      mode: appointmentData.consultationType || 'in-person',
      symptoms: appointmentData.symptoms || '',
      referralId: appointmentData.referralId || null,
      referralDept: appointmentData.referralDept || null,
      isReferral: !!appointmentData.referralId,
      status: 'pending',
      queueNo,
      queue_no: queueNo,
      createdAt: new Date().toISOString()
    };

    saveStoredAppointments([newAppt, ...current]);
    return newAppt;
  },

  approve: async (id) => {
    const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));

    // 1. Try Supabase if configured and id is a UUID
    if (isSupabaseConfigured() && isUuid(id)) {
      try {
        await dbApproveAppointment(id);
      } catch (e) {
        console.warn('Supabase approveAppointment failed, updating locally:', e);
      }
    }

    // 2. Try Express backend if configured
    if (import.meta.env.VITE_API_URL) {
      try {
        await api.patch(`/appointments/${id}/approve`);
      } catch {
        // Fallback local approval
      }
    }

    // 3. Always update local / stored appointments so state and storage stay in sync
    const current = getStoredAppointments();
    let approved = null;
    const updated = current.map(a => {
      if (a.id === id || a._id === id) {
        approved = { ...a, status: 'confirmed' };
        return approved;
      }
      return a;
    });
    saveStoredAppointments(updated);
    return approved || { id, status: 'confirmed' };
  },

  cancel: async (id) => {
    const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));

    // 1. Try Supabase if configured and id is a UUID
    if (isSupabaseConfigured() && isUuid(id)) {
      try {
        await dbCancelAppointment(id);
      } catch (e) {
        console.warn('Supabase cancelAppointment failed, updating locally:', e);
      }
    }

    // 2. Try Express backend if configured
    if (import.meta.env.VITE_API_URL) {
      try {
        await api.patch(`/appointments/${id}/cancel`);
      } catch {
        // Fallback local cancellation
      }
    }

    // 3. Always update local / stored appointments so state and storage stay in sync
    const current = getStoredAppointments();
    const updated = current.map(a => (a.id === id || a._id === id) ? { ...a, status: 'cancelled' } : a);
    saveStoredAppointments(updated);
    return { id, status: 'cancelled' };
  }
};
