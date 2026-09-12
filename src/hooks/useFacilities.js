/**
 * hooks/useFacilities.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads facilities from facilityService (Curated facilities or Live Overpass API),
 * computes Haversine distance, and applies client-side filters.
 *
 * Returns: { facilities, loading, error, refetch }
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { facilityService, calculateDistanceKm } from '../services/api';

export { calculateDistanceKm as haversineKm };

/**
 * @param {object} filters
 *   source      – 'curated' | 'live'
 *   search      – string free-text (name/village/district/service)
 *   type        – 'PHC' | 'CHC' | 'District Hospital' | 'Sub-Centre' | 'Diagnostic Centre' | ''
 *   district    – string district filter
 *   emergency   – boolean – only facilities with emergencyAvailable = true
 *   maxDistance – number km – 0 = no limit
 *   patientLat  – number | null
 *   patientLng  – number | null
 *   radius      – number (meters, default 15000)
 */
export function useFacilities(filters = {}) {
  const {
    source = 'curated',
    patientLat = null,
    patientLng = null,
    radius = 15000,
    search = '',
    type = '',
    district = '',
    emergency = false,
    maxDistance = 0,
  } = filters;

  const [raw, setRaw]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let data = [];
      if (source === 'live') {
        const lat = patientLat != null ? patientLat : 21.8265;
        const lng = patientLng != null ? patientLng : 76.3572;

        data = await facilityService.getLive({
          lat,
          lng,
          radius,
          maxDistance,
        });
      } else {
        data = await facilityService.getAll({
          search,
          type,
          district,
          emergency,
          maxDistance,
          lat: patientLat,
          lng: patientLng,
        });
      }
      setRaw(data || []);
    } catch (err) {
      console.warn('useFacilities load error:', err);
      setError(err.message || 'Failed to fetch facilities');
      // If live mode failed, fallback to empty array or notify
      setRaw([]);
    } finally {
      setLoading(false);
    }
  }, [source, patientLat, patientLng, radius, maxDistance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply filters + distance calculation
  const facilities = useMemo(() => {
    let result = raw.map(f => {
      const dist =
        patientLat != null && patientLng != null && f.latitude && f.longitude
          ? calculateDistanceKm(patientLat, patientLng, f.latitude, f.longitude)
          : f.distanceKm != null ? f.distanceKm : null;
      return { ...f, id: f.id || f._id, distanceKm: dist };
    });

    // Filter: search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        f =>
          f.name?.toLowerCase().includes(q) ||
          f.village?.toLowerCase().includes(q) ||
          f.district?.toLowerCase().includes(q) ||
          f.address?.toLowerCase().includes(q) ||
          f.services?.some(s => s.toLowerCase().includes(q))
      );
    }

    // Filter: type
    if (type) result = result.filter(f => f.type === type);

    // Filter: district
    if (district) result = result.filter(f => f.district === district);

    // Filter: emergency
    if (emergency) result = result.filter(f => f.emergencyAvailable);

    // Filter: maxDistance (only if location is known)
    if (maxDistance > 0 && patientLat != null) {
      result = result.filter(f => f.distanceKm == null || f.distanceKm <= maxDistance);
    }

    // Sort: nearest first
    result.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return result;
  }, [raw, search, type, district, emergency, maxDistance, patientLat, patientLng]);

  return { facilities, loading, error, refetch: loadData };
}

/** Estimate travel time (walking ~4km/h, auto ~30km/h) */
export function estimateTravelTime(km) {
  if (km == null) return null;
  if (km < 1) return `~${Math.round((km * 1000) / 80)} min walk`;
  const autoMin = Math.round((km / 30) * 60);
  return `~${autoMin} min by auto`;
}
