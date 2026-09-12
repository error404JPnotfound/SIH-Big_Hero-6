/**
 * FacilityMap.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive Leaflet/OpenStreetMap map for the FacilityFinder feature.
 * - Displays hospitals/facilities with distinct markers and badges according to type.
 * - Draws directions from the user's current location when a facility is clicked.
 * - Offers direct 1-click turn-by-turn navigation links.
 */
import { useEffect, useRef } from 'react'
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
        background:${cfg.color};opacity:0.3;
        animation:haloPing 1.8s cubic-bezier(0,0,0.2,1) infinite;
      "></div>`
    : ''

  return L.divIcon({
    className: 'facility-marker-icon',
    html: `
      <div style="position:relative;width:${size}px;height:${size + 10}px;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        ${halo}
        <div style="
          width:${size}px;height:${size}px;
          background:${cfg.color};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:2.5px solid #ffffff;
          box-shadow:${isSelected ? '0 6px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.25)'};
          display:flex;align-items:center;justify-content:center;
          transition:transform 0.2s ease;
        ">
          <div style="
            width:${innerSize}px;height:${innerSize}px;
            background:#ffffff;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            transform:rotate(45deg);
            box-shadow:inset 0 1px 2px rgba(0,0,0,0.2);
          ">
            <span style="
              color:${cfg.color};
              font-family:Inter,system-ui,sans-serif;
              font-weight:800;
              font-size:${isSelected ? '10px' : '8.5px'};
              line-height:1;
              letter-spacing:-0.5px;
            ">${cfg.code}</span>
          </div>
        </div>
      </div>
      <style>
        @keyframes haloPing{0%{transform:scale(0.9);opacity:0.4}70%,100%{transform:scale(1.35);opacity:0}}
      </style>
    `,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 10)],
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
function MapController({ selectedFacility, patientLocation, center, zoom }) {
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
    } else if (patientLocation?.lat && patientLocation?.lng) {
      map.flyTo([patientLocation.lat, patientLocation.lng], 13, { duration: 0.6 })
    } else {
      map.flyTo(center, zoom, { duration: 0.5 })
    }
  }, [selectedFacility, patientLocation, center, zoom, map])

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
                click: () => onSelectFacility?.(f)
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

      {/* Map Legend: Facilities by Type */}
      <div className="absolute bottom-4 left-4 bg-surface/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-border z-[1000] text-xs space-y-1.5">
        <p className="font-bold text-navy text-[11px] uppercase tracking-wider mb-1">Facility Types</p>
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
    </div>
  )
}
