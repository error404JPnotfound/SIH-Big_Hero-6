/**
 * FacilityDetails.jsx  —  /patient/facilities/:id
 * ─────────────────────────────────────────────────────────────────────────────
 * Detailed view for a single healthcare facility.
 * Supports both Curated Facilities and Live OpenStreetMap data.
 * Shows services, diagnostics, doctor roster, mini Leaflet map, and contact info.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { cn } from '../../lib/utils'
import { facilityService } from '../../services/api'
import {
  ArrowLeft, MapPin, Phone, Zap, Clock, BedDouble, Stethoscope,
  Activity, Calendar, ExternalLink, Loader2, AlertCircle, UserCheck, Globe
} from 'lucide-react'

const TYPE_COLORS = {
  'PHC':              'bg-teal/10 text-teal',
  'CHC':              'bg-blue-light text-blue',
  'District Hospital':'bg-critical-bg text-critical',
  'Sub-Centre':       'bg-warning-bg text-warning',
  'Diagnostic Centre':'bg-[#F3F0FF] text-[#7C3AED]',
}

export default function FacilityDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [facility, setFacility] = useState(null)
  const [doctors,  setDoctors]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [MapComponent, setMapComponent] = useState(null)

  // Load facility + doctors via facilityService
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        const result = await facilityService.getById(id)
        if (!cancelled) {
          if (result && result.facility) {
            setFacility(result.facility)
            setDoctors(result.doctors || [])
          } else {
            setFacility(null)
          }
        }
      } catch (err) {
        console.error('Failed to load facility:', err)
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  // Lazy-load Leaflet map
  useEffect(() => {
    import('../../components/ui/FacilityMap').then(m => setMapComponent(() => m.default))
  }, [])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout role="patient">
        <div className="flex items-center justify-center h-64 gap-3 text-muted">
          <Loader2 className="w-7 h-7 animate-spin text-teal" />
          <span className="text-sm">Loading facility…</span>
        </div>
      </AppLayout>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!facility) {
    return (
      <AppLayout role="patient">
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
          <AlertCircle className="w-12 h-12 text-muted" />
          <div>
            <p className="font-semibold text-navy">Facility not found</p>
            <p className="text-muted text-sm mt-1">The facility you're looking for doesn't exist or has expired from live cache.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/patient/facilities')}>
            <ArrowLeft className="w-4 h-4" /> Back to Find Healthcare
          </Button>
        </div>
      </AppLayout>
    )
  }

  const facId = facility.id || facility._id
  const typeClass = TYPE_COLORS[facility.type] || 'bg-bg text-muted'
  const osmLink = `https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}&zoom=16`
  const availableDoctors = doctors.filter(d => d.isAvailable)

  return (
    <AppLayout role="patient">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

        {/* ── Back nav ──────────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate('/patient/facilities')}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-navy transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Find Healthcare
        </button>

        {/* ── Hero header ───────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-navy to-[#102A43] rounded-2xl p-6 text-white shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1">
              {/* Type + Emergency badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', typeClass)}>
                  {facility.type}
                </span>
                {facility.source === 'OpenStreetMap' && (
                  <span className="inline-flex items-center gap-1 bg-white/10 text-teal-light rounded-full px-3 py-1 text-xs font-medium border border-teal-light/20">
                    <Globe className="w-3.5 h-3.5 text-teal" /> Live OpenStreetMap
                  </span>
                )}
                {facility.emergencyAvailable && (
                  <span className="inline-flex items-center gap-1 bg-critical/20 text-red-300 rounded-full px-3 py-1 text-xs font-semibold">
                    <Zap className="w-3 h-3" /> 24×7 Emergency
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">{facility.name}</h1>

              <div className="flex flex-col gap-1.5 text-sm text-white/70">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal flex-shrink-0" />
                  {facility.address || 'Address not listed'}{facility.district ? `, ${facility.district}` : ''}{facility.state ? `, ${facility.state}` : ''}
                </span>
                {facility.openingHours && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal flex-shrink-0" />
                    {facility.openingHours}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/20"
              >
                <ExternalLink className="w-4 h-4" />
                Get Directions
              </a>
              <Button
                onClick={() => navigate(`/patient/appointments?facilityId=${facId}`)}
                className="bg-teal hover:bg-teal/90 text-white"
              >
                <Calendar className="w-4 h-4" />
                Book OPD Appointment
              </Button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/10">
            <div>
              <p className="text-2xl font-bold text-teal">
                {facility.doctorsAvailableNow ?? (doctors.length ? availableDoctors.length : '—')}
              </p>
              <p className="text-xs text-white/60 mt-0.5">Doctors on duty</p>
            </div>
            {facility.bedCapacity > 0 ? (
              <>
                <div>
                  <p className="text-2xl font-bold text-white">{facility.availableBeds}</p>
                  <p className="text-xs text-white/60 mt-0.5">Beds available</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{facility.bedCapacity}</p>
                  <p className="text-xs text-white/60 mt-0.5">Total beds</p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-2xl font-bold text-white">{facility.type === 'Diagnostic Centre' ? 'Outpatient' : 'OPD'}</p>
                <p className="text-xs text-white/60 mt-0.5">Facility model</p>
              </div>
            )}
            <div>
              <p className="text-2xl font-bold text-white">{facility.services?.length ?? 0}</p>
              <p className="text-xs text-white/60 mt-0.5">Services offered</p>
            </div>
          </div>
        </div>

        {/* ── Body: main content + sidebar ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Services */}
            {facility.services?.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal" />
                    Clinical & OPD Services
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-wrap gap-2">
                    {facility.services.map(s => (
                      <span key={s} className="inline-flex items-center bg-teal/10 text-teal rounded-lg px-3 py-1.5 text-sm font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal" />
                    Clinical Services
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-muted">Standard OPD consultation, triage, and general healthcare services available during facility operating hours.</p>
                </CardBody>
              </Card>
            )}

            {/* Diagnostics */}
            {facility.diagnosticsAvailable?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue" />
                    Diagnostics Available
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-wrap gap-2">
                    {facility.diagnosticsAvailable.map(d => (
                      <span key={d} className="inline-flex items-center bg-blue-light text-blue rounded-lg px-3 py-1.5 text-sm font-medium">
                        {d}
                      </span>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Doctors on duty */}
            {doctors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-success" />
                    Doctors on Duty
                    <span className="ml-1 text-xs text-muted font-normal">
                      {availableDoctors.length} of {doctors.length} available now
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="divide-y divide-border">
                    {doctors.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between px-6 py-4 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                            doc.isAvailable ? 'bg-teal text-white' : 'bg-bg text-muted border border-border'
                          )}>
                            {(doc.name || 'D').charAt(4) || 'D'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-navy truncate">{doc.name}</p>
                            <p className="text-xs text-muted truncate">{doc.specialization}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn(
                            'text-xs rounded-full px-2 py-0.5 font-semibold',
                            doc.isAvailable ? 'bg-success-bg text-success' : 'bg-bg text-muted border border-border'
                          )}>
                            {doc.isAvailable ? 'Available' : 'Away'}
                          </span>
                          {doc.isAvailable && (
                            <Button
                              size="sm"
                              className="bg-teal text-white text-xs h-7 px-2.5"
                              onClick={() => navigate(`/patient/appointments?facilityId=${facId}&doctorId=${doc.id}`)}
                            >
                              Book
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Contact card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-teal" />
                  Contact & Hours
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                {facility.phone && (
                  <div>
                    <p className="text-xs text-muted mb-1">OPD / Reception</p>
                    <a href={`tel:${facility.phone}`} className="font-semibold text-navy hover:text-teal transition-colors flex items-center gap-2">
                      <Phone className="w-4 h-4 text-teal" />
                      {facility.phone}
                    </a>
                  </div>
                )}
                {facility.emergencyPhone && (
                  <div className="bg-critical-bg rounded-lg p-3">
                    <p className="text-xs text-critical font-semibold mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Emergency Line
                    </p>
                    <a href={`tel:${facility.emergencyPhone}`} className="font-bold text-critical hover:opacity-80 transition-opacity flex items-center gap-2 text-base">
                      <Phone className="w-4 h-4" />
                      {facility.emergencyPhone}
                    </a>
                  </div>
                )}
                {!facility.phone && !facility.emergencyPhone && (
                  <p className="text-muted text-xs">No direct telephone listed on OpenStreetMap. For medical emergencies call 108.</p>
                )}
                {facility.bedCapacity > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted mb-1">Bed Availability</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text">{facility.availableBeds} of {facility.bedCapacity} free</span>
                      <BedDouble className="w-4 h-4 text-muted" />
                    </div>
                    <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', facility.availableBeds > 5 ? 'bg-success' : facility.availableBeds > 0 ? 'bg-warning' : 'bg-critical')}
                        style={{ width: `${(facility.availableBeds / facility.bedCapacity) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Mini Leaflet map */}
            {facility.latitude && facility.longitude && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardBody className="p-0 overflow-hidden rounded-b-xl">
                  <div style={{ height: '220px' }}>
                    {MapComponent ? (
                      <MapComponent
                        facilities={[facility]}
                        selectedFacility={facility}
                        center={[facility.latitude, facility.longitude]}
                        zoom={15}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted text-sm gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-teal" />
                        Loading map…
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-border">
                    <a
                      href={osmLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-teal font-medium hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in OpenStreetMap
                    </a>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
