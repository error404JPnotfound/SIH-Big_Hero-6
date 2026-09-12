/**
 * FacilityFinder.jsx  —  /patient/facilities
 * ─────────────────────────────────────────────────────────────────────────────
 * Find nearby healthcare facilities using browser GPS ("Use My Location").
 * - Removed manual preset location dropdown per user request.
 * - Displays facilities on the map according to type (DH, CHC, PHC, SC, DX).
 * - Clicking any facility draws directions from current location and opens turn-by-turn routing.
 * - Supports Curated Facilities vs Live OpenStreetMap Overpass data toggle.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, CardBody } from '../../components/ui/Card'
import { cn } from '../../lib/utils'
import { useFacilities, estimateTravelTime } from '../../hooks/useFacilities'
import { getTypeConfig } from '../../lib/facilityTypes'
import {
  MapPin, Navigation, Search, Filter, Phone, Zap, Building2,
  List, Map, AlertCircle, UserCheck, X, Loader2, Globe, Info, RefreshCw
} from 'lucide-react'

const FACILITY_TYPES = ['PHC', 'CHC', 'District Hospital', 'Sub-Centre', 'Diagnostic Centre']
const RADIUS_OPTIONS = [
  { label: 'Any distance', value: 0 },
  { label: 'Within 5 km',  value: 5 },
  { label: 'Within 10 km', value: 10 },
  { label: 'Within 20 km', value: 20 },
  { label: 'Within 50 km', value: 50 },
]

function TypeBadge({ type }) {
  const cfg = getTypeConfig(type)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
      {type}
    </span>
  )
}

// ── Individual facility card ──────────────────────────────────────────────────
function FacilityCard({ facility: f, isSelected, patientLocation, onSelect }) {
  const navigate = useNavigate()
  const travelTime = estimateTravelTime(f.distanceKm)
  const facId = f.id || f._id
  const cfg = getTypeConfig(f.type)

  const directionsUrl = patientLocation?.lat && patientLocation?.lng
    ? `https://www.google.com/maps/dir/?api=1&origin=${patientLocation.lat},${patientLocation.lng}&destination=${f.latitude},${f.longitude}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}&travelmode=driving`

  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-surface rounded-xl border-2 p-4 cursor-pointer transition-all duration-150 hover:shadow-md',
        isSelected ? 'border-teal shadow-md shadow-teal/10 bg-teal/5' : 'border-border hover:border-teal/40'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0 shadow-xs"
              style={{ background: cfg.color }}
            >
              {cfg.code}
            </span>
            <h3 className="font-semibold text-navy text-sm leading-tight truncate">{f.name}</h3>
            {f.source === 'OpenStreetMap' && (
              <span className="inline-flex items-center text-[10px] font-semibold bg-teal/10 text-teal px-1.5 py-0.5 rounded border border-teal/20">
                Live OSM
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1 truncate">{f.address}</p>
        </div>
        {f.emergencyAvailable && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 bg-critical-bg text-critical rounded-full px-2 py-0.5 text-xs font-semibold">
            <Zap className="w-3 h-3" /> 24×7
          </span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <TypeBadge type={f.type} />
        {f.district && (
          <span className="text-xs text-muted bg-bg rounded-full px-2 py-0.5 border border-border">
            {f.district}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {f.distanceKm != null && (
          <div className="text-center">
            <p className="text-sm font-bold text-teal">{f.distanceKm} km</p>
            <p className="text-xs text-muted">{travelTime || 'nearby'}</p>
          </div>
        )}
        <div className="text-center">
          <p className="text-sm font-bold text-navy">{f.doctorsAvailableNow ?? (f.source === 'OpenStreetMap' ? '—' : '1+')}</p>
          <p className="text-xs text-muted">Doctors now</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-success">{f.availableBeds ?? (f.source === 'OpenStreetMap' ? '—' : 'Available')}</p>
          <p className="text-xs text-muted">{f.bedCapacity ? 'Beds free' : 'Capacity'}</p>
        </div>
      </div>

      {/* Top services */}
      {f.services?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {f.services.slice(0, 3).map(s => (
            <span key={s} className="text-xs bg-bg text-muted rounded px-1.5 py-0.5 border border-border">
              {s}
            </span>
          ))}
          {f.services.length > 3 && (
            <span className="text-xs text-muted px-1.5 py-0.5">+{f.services.length - 3}</span>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 pt-2.5 border-t border-border flex-wrap">
        {/* Directions Link */}
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue hover:text-blue/80 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          Directions {f.distanceKm ? `(${f.distanceKm} km)` : ''}
        </a>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={e => { e.stopPropagation(); navigate(`/patient/facilities/${facId}`) }}
            className="text-xs h-7 px-2.5"
          >
            Details
          </Button>
          <Button
            size="sm"
            onClick={e => { e.stopPropagation(); navigate(`/patient/appointments?facilityId=${facId}`) }}
            className="bg-teal text-white text-xs h-7 px-2.5"
          >
            Book OPD
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FacilityFinder() {
  // Data source toggle: 'curated' vs 'live'
  const [source, setSource] = useState('curated')

  // Location state (GPS only)
  const [patientLocation, setPatientLocation] = useState(null)
  const [locationActive,  setLocationActive]  = useState(false)
  const [gpsLoading,      setGpsLoading]      = useState(false)
  const [gpsError,        setGpsError]        = useState('')
  const watchIdRef                            = useRef(null)

  // Clear GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // Auto-request location on initial load for a smooth user experience
  useEffect(() => {
    if (navigator.geolocation && !patientLocation && !locationActive) {
      detectGPS()
    }
  }, [])

  // Filter state
  const [search,       setSearch]       = useState('')
  const [type,         setType]         = useState('')
  const [district,     setDistrict]     = useState('')
  const [emergency,    setEmergency]    = useState(false)
  const [maxDistance,  setMaxDistance]  = useState(0)
  const [showFilters,  setShowFilters]  = useState(false)

  // UI state
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [mobileTab,        setMobileTab]        = useState('list') // 'list' | 'map'

  // Build filters object for the hook
  const filters = {
    source,
    search,
    type,
    district,
    emergency,
    maxDistance,
    patientLat: patientLocation?.lat ?? null,
    patientLng: patientLocation?.lng ?? null,
  }

  const { facilities, loading, error, refetch } = useFacilities(filters)

  // Map center: patient location or Khandwa default
  const mapCenter = patientLocation
    ? [patientLocation.lat, patientLocation.lng]
    : [21.8265, 76.3572]

  // ── GPS detection ──────────────────────────────────────────────────────────
  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      return
    }

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    setGpsLoading(true)
    setGpsError('')

    navigator.geolocation.getCurrentPosition(
      pos => {
        setPatientLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationActive(true)
        setGpsLoading(false)
      },
      err => {
        const msgs = {
          1: 'Location permission denied. Enable location access in your browser to view distance and directions from where you are.',
          2: 'Unable to determine your GPS location. Showing Khandwa region as default.',
          3: 'Location request timed out. Please click "Use My Location" again.',
        }
        setGpsError(msgs[err.code] || 'Could not get your location.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    )
  }, [])

  const clearFilters = () => {
    setSearch(''); setType(''); setDistrict(''); setEmergency(false); setMaxDistance(0)
  }

  const activeFilterCount = [search, type, district, emergency, maxDistance > 0].filter(Boolean).length

  return (
    <AppLayout role="patient">
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="bg-surface border-b border-border px-4 py-3 flex-shrink-0">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-navy flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-teal" />
                  Find Healthcare
                </h1>
                <p className="text-xs text-muted mt-0.5">
                  {loading ? 'Fetching facilities...' : `${facilities.length} facilities found`}
                  {locationActive && ' · near your location (GPS active)'}
                  {source === 'live' && ' · live OpenStreetMap'}
                </p>
              </div>

              {/* Segmented control: Curated vs Live OpenStreetMap Data */}
              <div className="flex items-center gap-2">
                <div className="inline-flex p-1 bg-bg border border-border rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSource('curated')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      source === 'curated'
                        ? 'bg-surface text-navy shadow-sm border border-border/50'
                        : 'text-muted hover:text-navy'
                    )}
                  >
                    Curated Facilities
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource('live')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                      source === 'live'
                        ? 'bg-teal text-white shadow-sm'
                        : 'text-muted hover:text-teal'
                    )}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Live OpenStreetMap Data
                  </button>
                </div>

                {/* Mobile tab switcher */}
                <div className="lg:hidden flex items-center bg-bg rounded-lg p-0.5 border border-border">
                  <button
                    onClick={() => setMobileTab('list')}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all', mobileTab === 'list' ? 'bg-surface shadow text-navy' : 'text-muted')}
                  >
                    <List className="w-3.5 h-3.5" /> List
                  </button>
                  <button
                    onClick={() => setMobileTab('map')}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all', mobileTab === 'map' ? 'bg-surface shadow text-navy' : 'text-muted')}
                  >
                    <Map className="w-3.5 h-3.5" /> Map
                  </button>
                </div>
              </div>
            </div>

            {/* Note banner when Live mode is active */}
            {source === 'live' && (
              <div className="bg-teal/5 border border-teal/20 rounded-lg px-3 py-2 text-xs text-teal flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Live data from OpenStreetMap — details like phone/bed count may be incomplete.</span>
                </div>
                <button
                  onClick={() => refetch()}
                  className="hover:underline flex items-center gap-1 text-[11px] font-semibold text-navy ml-auto"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            )}

            {/* Location + search row */}
            <div className="flex flex-wrap gap-2">
              {/* Single "Use My Location" GPS Button (Dropdown removed) */}
              <Button
                size="sm"
                variant={locationActive ? 'primary' : 'outline'}
                onClick={detectGPS}
                loading={gpsLoading}
                className={cn(
                  'flex-shrink-0 text-xs font-semibold transition-all',
                  locationActive ? 'bg-teal text-white shadow-xs' : 'hover:border-teal'
                )}
              >
                <Navigation className={cn('w-3.5 h-3.5', locationActive && 'animate-pulse')} />
                {locationActive ? 'Location Active' : 'Use My Location'}
              </Button>

              {/* Search box */}
              <div className="flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-1.5 flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-muted flex-shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search facility name, village, service…"
                  className="flex-1 bg-transparent text-sm text-text placeholder:text-muted focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')}>
                    <X className="w-3.5 h-3.5 text-muted hover:text-text" />
                  </button>
                )}
              </div>

              {/* Filter toggle */}
              <Button
                size="sm"
                variant={activeFilterCount > 0 ? 'primary' : 'outline'}
                onClick={() => setShowFilters(f => !f)}
                className="text-xs flex-shrink-0"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-white/20 text-white rounded-full px-1.5 text-[10px] font-bold">{activeFilterCount}</span>
                )}
              </Button>
            </div>

            {/* GPS notice / error */}
            {gpsError && (
              <div className="flex items-center gap-2 text-xs text-critical bg-critical-bg rounded-lg px-3 py-2 border border-critical/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{gpsError}</span>
              </div>
            )}

            {/* Expanded filters */}
            {showFilters && (
              <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-border">
                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Facility Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    <option value="">All types</option>
                    {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Radius */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Distance</label>
                  <select
                    value={maxDistance}
                    onChange={e => setMaxDistance(Number(e.target.value))}
                    className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-teal"
                    disabled={!patientLocation}
                  >
                    {RADIUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Emergency toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setEmergency(e => !e)}
                    className={cn(
                      'w-9 h-5 rounded-full relative transition-colors',
                      emergency ? 'bg-critical' : 'bg-border'
                    )}
                  >
                    <div className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                      emergency ? 'left-4' : 'left-0.5'
                    )} />
                  </div>
                  <span className="text-xs font-medium text-text">Emergency only</span>
                </label>

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-muted hover:text-critical flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Body: list + map ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex">

          {/* Facility list */}
          <div className={cn(
            'flex-shrink-0 overflow-y-auto scrollbar-thin bg-bg',
            'lg:w-[430px] lg:border-r lg:border-border',
            mobileTab === 'list' ? 'w-full' : 'hidden lg:flex lg:flex-col'
          )}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted">
                <Loader2 className="w-8 h-8 animate-spin text-teal" />
                <p className="text-sm">
                  {source === 'live' ? 'Fetching live OpenStreetMap hospitals…' : 'Loading facilities…'}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center text-critical">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm font-semibold">Failed to fetch facilities</p>
                <p className="text-xs text-muted">{error}</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Try Again</Button>
              </div>
            ) : facilities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
                <Building2 className="w-10 h-10 text-border" />
                <p className="font-semibold text-navy text-sm">No facilities found</p>
                <p className="text-xs text-muted">Try clearing your filters or refreshing location.</p>
                <Button size="sm" variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </div>
            ) : (
              <div className="p-3 space-y-2.5">
                {facilities.map(f => (
                  <FacilityCard
                    key={f.id || f._id}
                    facility={f}
                    isSelected={(selectedFacility?.id || selectedFacility?._id) === (f.id || f._id)}
                    patientLocation={patientLocation}
                    onSelect={() => {
                      setSelectedFacility(f)
                      setMobileTab('map')
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div className={cn(
            'flex-1 relative',
            mobileTab === 'map' ? 'block' : 'hidden lg:block'
          )}>
            <MapWrapper
              facilities={facilities}
              selectedFacility={selectedFacility}
              onSelectFacility={f => setSelectedFacility(f)}
              patientLocation={patientLocation}
              center={mapCenter}
              zoom={patientLocation ? 13 : 11}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

// Wrapper handles lazy import for leaflet (avoids SSR/window issues)
function MapWrapper(props) {
  const [FacilityMap, setFacilityMap] = useState(null)

  useEffect(() => {
    import('../../components/ui/FacilityMap').then(m => setFacilityMap(() => m.default))
  }, [])

  if (!FacilityMap) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg text-muted text-sm gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-teal" />
        Loading map…
      </div>
    )
  }

  return <FacilityMap {...props} />
}
