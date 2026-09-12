/**
 * Appointments.jsx — /patient/appointments
 * ─────────────────────────────────────────────────────────────────────────────
 * Appointment booking and management page.
 * Reads facilityId & doctorId from URL query string to pre-fill and auto-open modal.
 * Supports consultation mode toggle, facility & doctor dropdowns, slot picker,
 * symptoms textarea, and upcoming vs past appointments with cancellation.
 */
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { appointmentService, facilityService, liveOsmCache } from '../../services/api'
import { MOCK_FACILITIES, MOCK_DOCTORS_BY_FACILITY } from '../../lib/mockData'
import {
  Calendar, Clock, MapPin, Video, User, CheckCircle2,
  AlertCircle, X, Loader2, Stethoscope, Ban, FileText
} from 'lucide-react'
import { cn } from '../../lib/utils'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30'
]

function BookingModal({ isOpen, onClose, initialFacilityId, initialDoctorId, onBooked }) {
  const [facilities, setFacilities] = useState([])
  const [selectedFacilityId, setSelectedFacilityId] = useState(initialFacilityId || '')
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || '')
  const [consultationType, setConsultationType] = useState('in-person')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [timeSlot, setTimeSlot] = useState('10:00')
  const [symptoms, setSymptoms] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmedAppt, setConfirmedAppt] = useState(null)

  // Load facilities for dropdown (combine curated + live cache)
  useEffect(() => {
    let list = [...MOCK_FACILITIES]

    // If an initial facility ID is from live OSM cache, add it if not already present
    if (initialFacilityId && !list.some(f => f.id === initialFacilityId || f._id === initialFacilityId)) {
      if (liveOsmCache.has(initialFacilityId)) {
        list.unshift(liveOsmCache.get(initialFacilityId))
      } else {
        list.unshift({
          id: initialFacilityId,
          _id: initialFacilityId,
          name: 'Selected Healthcare Centre',
          type: 'Clinic',
          district: 'Khandwa'
        })
      }
    }
    setFacilities(list)
    if (!selectedFacilityId && list.length > 0) {
      setSelectedFacilityId(list[0].id)
    }
  }, [initialFacilityId])

  // Get doctors for currently selected facility
  const availableDoctors = useMemo(() => {
    if (!selectedFacilityId) return []
    const docs = MOCK_DOCTORS_BY_FACILITY[selectedFacilityId] || []
    if (docs.length > 0) return docs

    // Default fallback doctor for facilities without registered roster (like live OSM)
    return [
      { id: 'doc-default', name: 'On-Duty Medical Officer', specialization: 'General OPD / Family Medicine' }
    ]
  }, [selectedFacilityId])

  // Ensure selected doctor is valid for the selected facility
  useEffect(() => {
    if (availableDoctors.length > 0) {
      const exists = availableDoctors.some(d => d.id === selectedDoctorId)
      if (!exists) {
        setSelectedDoctorId(availableDoctors[0].id)
      }
    }
  }, [selectedFacilityId, availableDoctors])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!date || !timeSlot) {
      setError('Please select both a date and time slot.')
      return
    }

    setLoading(true)
    setError('')

    const selectedFacility = facilities.find(f => f.id === selectedFacilityId || f._id === selectedFacilityId)
    const selectedDoctor = availableDoctors.find(d => d.id === selectedDoctorId)

    try {
      const booked = await appointmentService.book({
        facilityId: selectedFacilityId,
        facilityName: selectedFacility?.name || 'Healthcare Centre',
        doctorId: selectedDoctorId,
        doctorName: selectedDoctor?.name || 'Attending Physician',
        date,
        timeSlot,
        consultationType,
        symptoms: symptoms.trim()
      })

      setConfirmedAppt(booked)
      onBooked?.(booked)
    } catch (err) {
      setError(err.message || 'Failed to book appointment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setConfirmedAppt(null)
    setError('')
    onClose()
  }

  if (confirmedAppt) {
    return (
      <Modal open={isOpen} onClose={handleClose} title="Appointment Booked!" size="md">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-9 h-9 text-success" />
          </div>
          <h3 className="text-lg font-bold text-navy mb-1">Appointment Confirmed</h3>
          <p className="text-muted text-xs mb-4">Your appointment has been registered with the facility.</p>

          <div className="bg-bg rounded-xl p-4 text-left space-y-2 text-xs mb-5 border border-border">
            <div className="flex justify-between">
              <span className="text-muted">Facility:</span>
              <span className="font-semibold text-navy">{confirmedAppt.facility}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Doctor:</span>
              <span className="font-semibold text-navy">{confirmedAppt.doctor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Date & Time:</span>
              <span className="font-semibold text-navy">{confirmedAppt.date} at {confirmedAppt.timeSlot || confirmedAppt.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Consultation Mode:</span>
              <span className="font-semibold text-teal capitalize">{confirmedAppt.consultationType || confirmedAppt.mode}</span>
            </div>
            {confirmedAppt.symptoms && (
              <div className="flex justify-between">
                <span className="text-muted">Reason/Symptoms:</span>
                <span className="font-medium text-navy truncate max-w-[200px]">{confirmedAppt.symptoms}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted">Queue Number:</span>
              <span className="font-bold text-teal text-sm">{confirmedAppt.queueNo || confirmedAppt.queue_no || 'A-032'}</span>
            </div>
          </div>

          <Button className="w-full bg-teal text-white" onClick={handleClose}>
            Done
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={isOpen} onClose={handleClose} title="Book OPD Appointment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-critical-bg text-critical text-xs rounded-lg border border-critical/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Mode Toggle */}
        <div>
          <label className="block text-xs font-semibold text-navy mb-1.5">Consultation Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConsultationType('in-person')}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all',
                consultationType === 'in-person'
                  ? 'border-teal bg-teal/10 text-teal shadow-xs'
                  : 'border-border bg-surface text-muted hover:border-teal/50'
              )}
            >
              <User className="w-3.5 h-3.5" />
              In-Person Visit
            </button>
            <button
              type="button"
              onClick={() => setConsultationType('teleconsultation')}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all',
                consultationType === 'teleconsultation'
                  ? 'border-teal bg-teal/10 text-teal shadow-xs'
                  : 'border-border bg-surface text-muted hover:border-teal/50'
              )}
            >
              <Video className="w-3.5 h-3.5" />
              Teleconsultation
            </button>
          </div>
        </div>

        {/* 2. Facility Selection */}
        <div>
          <label className="block text-xs font-semibold text-navy mb-1.5">Healthcare Facility</label>
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal"
            required
          >
            {facilities.map(f => (
              <option key={f.id || f._id} value={f.id || f._id}>
                {f.name} ({f.type}) — {f.district || 'Khandwa'}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Doctor Selection */}
        <div>
          <label className="block text-xs font-semibold text-navy mb-1.5">Doctor / Specialist</label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal"
          >
            {availableDoctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.specialization}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">Time Slot</label>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal"
              required
            >
              {TIME_SLOTS.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 5. Symptoms Textarea */}
        <div>
          <label className="block text-xs font-semibold text-navy mb-1.5">Symptoms / Reason for Visit</label>
          <textarea
            rows={3}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="E.g., Fever and mild cough for 2 days, routine blood pressure checkup..."
            className="w-full text-xs border border-border rounded-lg p-2.5 bg-surface text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" className="bg-teal text-white" loading={loading}>
            Confirm Appointment
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Appointments() {
  const [searchParams] = useSearchParams()
  const facilityId = searchParams.get('facilityId') || null
  const doctorId   = searchParams.get('doctorId')   || null

  const [bookingOpen, setBookingOpen] = useState(!!(facilityId || doctorId))
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upcoming') // 'upcoming' | 'past'
  const [cancellingId, setCancellingId] = useState(null)

  // Load appointments
  const loadAppointments = async () => {
    setLoading(true)
    try {
      const list = await appointmentService.getAll()
      setAppointments(list || [])
    } catch (err) {
      console.error('Error fetching appointments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  // Auto-open modal if query params change
  useEffect(() => {
    if (facilityId || doctorId) {
      setBookingOpen(true)
    }
  }, [facilityId, doctorId])

  // Categorize upcoming vs past appointments
  const todayStr = new Date().toISOString().split('T')[0]

  const upcomingAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (a.status === 'cancelled') return false
      return a.date >= todayStr && a.status !== 'completed'
    })
  }, [appointments, todayStr])

  const pastAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (a.status === 'cancelled' || a.status === 'completed') return true
      return a.date < todayStr
    })
  }, [appointments, todayStr])

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return

    setCancellingId(id)
    try {
      await appointmentService.cancel(id)
      setAppointments(prev => prev.map(a => (a.id === id || a._id === id) ? { ...a, status: 'cancelled' } : a))
    } catch (err) {
      alert('Failed to cancel appointment: ' + err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const displayedList = tab === 'upcoming' ? upcomingAppointments : pastAppointments

  const statusVariant = {
    confirmed: 'success',
    pending: 'warning',
    cancelled: 'critical',
    completed: 'neutral'
  }

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              <Calendar className="w-6 h-6 text-teal" />
              Appointments
            </h1>
            <p className="text-muted text-xs mt-0.5">Manage OPD consultations, checkups, and teleconsultations</p>
          </div>
          <Button className="bg-teal text-white" onClick={() => setBookingOpen(true)}>
            <Calendar className="w-4 h-4" /> Book Appointment
          </Button>
        </div>

        {/* Segmented Tab Switcher: Upcoming vs Past */}
        <div className="flex items-center gap-2 border-b border-border pb-1">
          <button
            onClick={() => setTab('upcoming')}
            className={cn(
              'pb-2 px-3 text-sm font-semibold border-b-2 transition-all',
              tab === 'upcoming'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            )}
          >
            Upcoming Appointments
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-teal/10 text-teal">
              {upcomingAppointments.length}
            </span>
          </button>
          <button
            onClick={() => setTab('past')}
            className={cn(
              'pb-2 px-3 text-sm font-semibold border-b-2 transition-all',
              tab === 'past'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            )}
          >
            Past & Cancelled
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-bg text-muted">
              {pastAppointments.length}
            </span>
          </button>
        </div>

        {/* Appointment list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-teal" />
            <p className="text-sm">Loading appointments…</p>
          </div>
        ) : displayedList.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <Calendar className="w-12 h-12 text-border mx-auto mb-3" />
              <h3 className="font-semibold text-navy text-sm">No {tab} appointments found</h3>
              <p className="text-muted text-xs mt-1 mb-4">
                {tab === 'upcoming'
                  ? "You don't have any upcoming OPD visits scheduled."
                  : 'No past appointment records found.'}
              </p>
              {tab === 'upcoming' && (
                <Button size="sm" className="bg-teal text-white" onClick={() => setBookingOpen(true)}>
                  Book New Appointment
                </Button>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3.5">
            {displayedList.map(appt => {
              const apptId = appt.id || appt._id
              const isTele = (appt.mode || appt.consultationType) === 'teleconsultation'

              return (
                <Card key={apptId} className="hover:shadow-md transition-shadow">
                  <CardBody>
                    <div className="flex items-start gap-4">
                      {/* Date Badge */}
                      <div className="flex flex-col items-center bg-teal/10 border border-teal/20 rounded-xl p-2.5 w-16 flex-shrink-0 text-center">
                        <span className="text-[10px] font-bold text-teal uppercase">
                          {new Date(appt.date).toLocaleString('en', { month: 'short' })}
                        </span>
                        <span className="text-2xl font-bold text-navy leading-none mt-0.5">
                          {new Date(appt.date).getDate()}
                        </span>
                        <span className="text-[10px] text-muted mt-1">
                          {new Date(appt.date).getFullYear()}
                        </span>
                      </div>

                      {/* Info column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-navy text-sm">{appt.doctor || 'Attending Doctor'}</h3>
                          <Badge variant={statusVariant[appt.status] || 'default'} className="capitalize text-xs">
                            {appt.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted mb-2">{appt.type || 'OPD Consultation'}</p>

                        <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-teal" />
                            {appt.time || appt.timeSlot}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-teal" />
                            {appt.facility}
                          </span>
                          <span className="flex items-center gap-1">
                            {isTele ? (
                              <Video className="w-3.5 h-3.5 text-teal" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-navy" />
                            )}
                            <span className="capitalize">{appt.consultationType || appt.mode}</span>
                          </span>
                        </div>

                        {/* Symptoms snippet */}
                        {appt.symptoms && (
                          <div className="mt-2 text-xs bg-bg rounded-lg p-2 text-text/80 flex items-start gap-1.5 border border-border/50">
                            <FileText className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">Reason: {appt.symptoms}</span>
                          </div>
                        )}

                        {/* Action buttons & queue */}
                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border flex-wrap">
                          <span className="text-xs bg-navy text-white px-2.5 py-0.5 rounded-full font-mono font-semibold">
                            Queue: {appt.queueNo || appt.queue_no || 'A-028'}
                          </span>

                          <div className="flex items-center gap-2 ml-auto">
                            {isTele && appt.status === 'confirmed' && (
                              <Button size="sm" className="bg-teal text-white text-xs h-7 px-3">
                                <Video className="w-3 h-3" /> Join Teleconsult
                              </Button>
                            )}
                            {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-critical border-critical/30 hover:bg-critical/10 text-xs h-7 px-2.5"
                                loading={cancellingId === apptId}
                                onClick={() => handleCancel(apptId)}
                              >
                                <Ban className="w-3 h-3" /> Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        initialFacilityId={facilityId}
        initialDoctorId={doctorId}
        onBooked={(newAppt) => {
          setAppointments(prev => [newAppt, ...prev])
        }}
      />
    </AppLayout>
  )
}
