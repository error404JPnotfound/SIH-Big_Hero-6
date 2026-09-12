/**
 * FacilityMap.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive Leaflet/OpenStreetMap map for the FacilityFinder feature.
 * - Displays hospitals/facilities with distinct markers and badges according to type.
 * - Draws directions from the user's current location when a facility is clicked.
 * - Offers direct 1-click turn-by-turn navigation links.
 */
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { estimateTravelTime } from '../../hooks/useFacilities'
import { FACILITY_TYPE_CONFIG, getTypeConfig } from '../../lib/facilityTypes'

export { FACILITY_TYPE_CONFIG, getTypeConfig }

// Build distinct custom icon per facility type
function createFacilityIcon(type, isSelected) {
  const cfg = getTypeConfig(type)
  const size = isSelected ? 42 : 32
  const innerSize = isSelected ? 24 : 18
  const halo = isSelected
    ? `<div style="
        position:absolute;inset:-6px;border-radius:50%;
        background:${cfg.color};opacity:0.35;
        animation:haloPing 1.8s cubic-bezier(0,0,0.2,1) infinite;
      "></div>`
    : ''

  return L.divIcon({
    className: 'custom-facility-marker',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${halo}
        <div style="
          width:${size}px;height:${size}px;
          background:${cfg.color};
          border:2.5px solid #ffffff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 3px 10px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          transition:transform 0.15s ease;
        ">
          <div style="
            transform:rotate(45deg);
            width:${innerSize}px;height:${innerSize}px;
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="
              color:#ffffff;
              font-family:Inter,sans-serif;
              font-size:${isSelected ? '11px' : '9px'};
              font-weight:800;
              letter-spacing:-0.5px;
            ">${cfg.code}</span>
          </div>
        </div>
      </div>
      <style>
        @keyframes haloPing{0%{transform:scale(0.9);opacity:0.4}70%,100%{transform:scale(1.35);opacity:0}}
      </style>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

// Pulsing "YOU ARE HERE" marker
const YOU_ICON = L.divIcon({
  className: 'patient-location-marker',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="
        position:absolute;inset:0;
        background:#2563EB;border-radius:50%;
        border:3px solid #ffffff;
        box-shadow:0 0 0 4px rgba(37,99,235,0.35);
        animation:patientPing 1.6s cubic-bezier(0,0,0.2,1) infinite;
      "></div>
      <div style="
        position:absolute;inset:5px;
        background:#ffffff;border-radius:50%;
      "></div>
    </div>
    <style>
      @keyframes patientPing{0%{box-shadow:0 0 0 0 rgba(37,99,235,0.6)}75%,100%{box-shadow:0 0 0 16px rgba(37,99,235,0)}}
    </style>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
})

// ── Auto-pan / Auto-fit bounds controller ──────────────────────────────────────
function MapController({ facilities = [], selectedFacility, patientLocation, center, zoom }) {
  const map = useMap()

  useEffect(() => {
    if (selectedFacility?.latitude && selectedFacility?.longitude) {
      if (patientLocation?.lat && patientLocation?.lng) {
        // Fit both patient and facility in view so the route is clearly visible
        map.fitBounds([
          [patientLocation.lat, patientLocation.lng],
          [selectedFacility.latitude, selectedFacility.longitude]
        ], { padding: [55, 55], maxZoom: 15, duration: 0.8 })
      } else {
        map.flyTo([selectedFacility.latitude, selectedFacility.longitude], 15, { duration: 0.8 })
      }
    } else if (facilities.length > 0) {
      const validPoints = facilities
        .filter(f => f.latitude != null && f.longitude != null)
        .map(f => [f.latitude, f.longitude])

      if (validPoints.length > 0) {
        const pLat = patientLocation?.lat ?? center[0]
        const pLng = patientLocation?.lng ?? center[1]
        const dLat = Math.abs(validPoints[0][0] - pLat)
        const dLng = Math.abs(validPoints[0][1] - pLng)

        // If returned facilities are far from current location (> 50 km), pan/fit to them!
        if (dLat > 0.5 || dLng > 0.5) {
          map.fitBounds(validPoints, { padding: [40, 40], maxZoom: 13, duration: 0.8 })
          return
        }
      }

      if (patientLocation?.lat && patientLocation?.lng) {
        map.flyTo([patientLocation.lat, patientLocation.lng], 13, { duration: 0.6 })
      } else {
        map.flyTo(center, zoom, { duration: 0.5 })
      }
    } else if (patientLocation?.lat && patientLocation?.lng) {
      map.flyTo([patientLocation.lat, patientLocation.lng], 13, { duration: 0.6 })
    } else {
      map.flyTo(center, zoom, { duration: 0.5 })
    }
  }, [selectedFacility, patientLocation, center, zoom, map, facilities])

  return null
}

// ── Main FacilityMap component ────────────────────────────────────────────────
export default function FacilityMap({
  facilities = [],
  selectedFacility = null,
  onSelectFacility,
  patientLocation = null,
  center = [21.8265, 76.3572],
  zoom = 12,
}) {
  const markerRefs = useRef({})
  const [legendMinimized, setLegendMinimized] = useState(false)

  // Auto-minimize the Facility Types bar when a facility is clicked/selected
  useEffect(() => {
    if (selectedFacility) {
      setLegendMinimized(true)
    }
  }, [selectedFacility])

  // Auto-open popup when facility is selected
  useEffect(() => {
    const selId = selectedFacility?.id || selectedFacility?._id
    if (selId && markerRefs.current[selId]) {
      markerRefs.current[selId].openPopup()
    }
  }, [selectedFacility])

  // Route polyline from patient → selected facility
  const routePositions =
    patientLocation && selectedFacility?.latitude && selectedFacility?.longitude
      ? [
          [patientLocation.lat, patientLocation.lng],
          [selectedFacility.latitude, selectedFacility.longitude],
        ]
      : null

  const selectedDist = selectedFacility?.distanceKm
  const travelTime = selectedDist != null ? estimateTravelTime(selectedDist) : null

  // Google Maps directions URL from patient coordinates to destination
  const getDirectionsUrl = (destLat, destLng) => {
    if (patientLocation?.lat && patientLocation?.lng) {
      return `https://www.google.com/maps/dir/?api=1&origin=${patientLocation.lat},${patientLocation.lng}&destination=${destLat},${destLng}&travelmode=driving`
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          facilities={facilities}
          selectedFacility={selectedFacility}
          patientLocation={patientLocation}
          center={center}
          zoom={zoom}
        />

        {/* Patient "YOU ARE HERE" marker */}
        {patientLocation && (
          <Marker position={[patientLocation.lat, patientLocation.lng]} icon={YOU_ICON} zIndexOffset={9999}>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', textAlign: 'center' }}>
                <strong style={{ color: '#2563EB' }}>📍 You Are Here</strong>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                  GPS Location Detected
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Facility markers categorized by type */}
        {facilities.map(f => {
          if (!f.latitude || !f.longitude) return null
          const facId = f.id || f._id
          const isSelected = (selectedFacility?.id || selectedFacility?._id) === facId
          const cfg = getTypeConfig(f.type)
          const dirUrl = getDirectionsUrl(f.latitude, f.longitude)

          return (
            <Marker
              key={facId}
              position={[f.latitude, f.longitude]}
              icon={createFacilityIcon(f.type, isSelected)}
              ref={el => { if (el) markerRefs.current[facId] = el }}
              eventHandlers={{
                click: () => {
                  onSelectFacility?.(f)
                  setLegendMinimized(true)
                }
              }}
              zIndexOffset={isSelected ? 1000 : 100}
            >
              <Tooltip direction="top" offset={[0, -32]} opacity={0.9}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600 }}>
                  <span style={{ color: cfg.color }}>● {cfg.code}: </span>
                  {f.name}
                </div>
              </Tooltip>

              <Popup maxWidth={260}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', lineHeight: '1.4' }}>
                  {/* Type Badge & Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{
                      background: cfg.color,
                      color: '#ffffff',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.3px'
                    }}>
                      {cfg.code}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: cfg.color }}>
                      {f.type}
                    </span>
                  </div>

                  <strong style={{ color: '#0B1F33', fontSize: '14px', display: 'block', marginBottom: '3px' }}>
                    {f.name}
                  </strong>
                  <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 6px 0' }}>
                    {f.address}
                  </p>

                  {/* Badges & Distance */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {f.emergencyAvailable && (
                      <span style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>
                        🚨 24×7 Emergency
                      </span>
                    )}
                    {f.distanceKm != null && (
                      <span style={{ background: '#CCFBF1', color: '#0F766E', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>
                        📍 {f.distanceKm} km away
                      </span>
                    )}
                  </div>

                  {/* Direction Button */}
                  <a
                    href={dirUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '7px 10px',
                      background: '#2563EB',
                      color: '#ffffff',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '6px',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.25)'
                    }}
                  >
                    🧭 Get Directions {f.distanceKm ? `(${f.distanceKm} km)` : ''}
                  </a>

                  {/* Links Row */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a
                      href={`/patient/facilities/${facId}`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '6px',
                        background: '#0B1F33',
                        color: '#ffffff',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      View Details
                    </a>
                    <a
                      href={`/patient/appointments?facilityId=${facId}`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '6px',
                        background: '#0F9D8A',
                        color: '#ffffff',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      Book OPD
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Route Line from Patient Location to Selected Facility */}
        {routePositions && (
          <>
            {/* Glowing route base */}
            <Polyline
              positions={routePositions}
              pathOptions={{ color: '#0F9D8A', weight: 8, opacity: 0.3 }}
            />
            {/* Dashed primary route line */}
            <Polyline
              positions={routePositions}
              pathOptions={{ color: '#2563EB', dashArray: '8 8', weight: 3.5, opacity: 0.95 }}
            />
          </>
        )}
      </MapContainer>

      {/* Floating Direction Card when facility is selected */}
      {selectedFacility && (
        <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-surface/95 backdrop-blur-md p-3.5 rounded-xl border border-border shadow-xl z-[1000] text-xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span style={{ background: getTypeConfig(selectedFacility.type).color }} className="w-2 h-2 rounded-full flex-shrink-0" />
                <span className="font-bold text-navy text-sm truncate">{selectedFacility.name}</span>
              </div>
              <p className="text-muted text-[11px] truncate">{selectedFacility.address}</p>
            </div>
            <button
              onClick={() => onSelectFacility?.(null)}
              className="text-muted hover:text-navy p-1 -mr-1 -mt-1 rounded-md"
              title="Close route"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-border/70 text-text">
            {selectedDist != null ? (
              <>
                <span className="font-bold text-teal text-sm">{selectedDist} km</span>
                <span className="text-muted text-xs">{travelTime || 'nearby'}</span>
              </>
            ) : (
              <span className="text-muted text-xs">Distance unavailable</span>
            )}

            <a
              href={getDirectionsUrl(selectedFacility.latitude, selectedFacility.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 bg-blue text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue/90 shadow-sm transition-all"
            >
              <span>🧭 Directions</span>
              <span className="text-[10px]">↗</span>
            </a>
          </div>
        </div>
      )}

      {/* Map Legend: Facilities by Type (Collapsible) */}
      <div className="absolute bottom-4 left-4 bg-surface/95 backdrop-blur-md rounded-xl shadow-lg border border-border z-[1000] text-xs transition-all duration-200">
        {legendMinimized ? (
          <button
            type="button"
            onClick={() => setLegendMinimized(false)}
            className="flex items-center gap-2 px-3 py-2 text-navy font-semibold hover:bg-slate-50/80 rounded-xl transition-all cursor-pointer group"
            title="Expand Facility Types"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-navy">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse"></span>
              Facility Types
            </span>
            <div className="flex items-center gap-1 ml-0.5">
              {Object.values(FACILITY_TYPE_CONFIG).map(cfg => (
                <span
                  key={cfg.code}
                  className="w-3.5 h-3.5 rounded text-[8px] font-bold text-white flex items-center justify-center flex-shrink-0 shadow-xs"
                  style={{ background: cfg.color }}
                >
                  {cfg.code}
                </span>
              ))}
            </div>
            <span className="text-muted group-hover:text-navy text-[10px] ml-0.5 font-bold transition-transform">
              ▲
            </span>
          </button>
        ) : (
          <div className="p-3 space-y-1.5 min-w-[175px]">
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-border/60">
              <p className="font-bold text-navy text-[11px] uppercase tracking-wider">Facility Types</p>
              <button
                type="button"
                onClick={() => setLegendMinimized(true)}
                className="text-muted hover:text-navy text-[11px] p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                title="Minimize bar"
              >
                ▼
              </button>
            </div>
            {Object.entries(FACILITY_TYPE_CONFIG).map(([label, cfg]) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0 shadow-xs"
                  style={{ background: cfg.color }}
                >
                  {cfg.code}
                </span>
                <span className="text-muted text-[11px]">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
