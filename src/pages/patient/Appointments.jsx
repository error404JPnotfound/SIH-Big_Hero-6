/**
 * Appointments.jsx — /patient/appointments
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully dynamic: reads/writes to Supabase.
 * - Lists appointments via getMyAppointments()
 * - Books via bookAppointment() RPC (uses real doctor/facility UUIDs)
 * - Cancels via cancelAppointment()
 * - Doctor dropdown populated from getDoctorsByFacility()
 * - Facility dropdown populated from getFacilities()
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Misc'
import {
  getMyAppointments, cancelAppointment, bookAppointment,
  getFacilities, getDoctorsByFacility, getAvailableDoctors,
} from '../../lib/db'
import {
  Calendar, Clock, MapPin, Video, User, CheckCircle2,
  AlertCircle, X, Loader2, Ban, FileText
} from 'lucide-react'
import { cn } from '../../lib/utils'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30',
]

// ── Shape helpers ──────────────────────────────────────────────────────────────
function apptDate(appt)   { return appt.scheduled_at ? new Date(appt.scheduled_at) : null }
function apptDateStr(appt){ return appt.scheduled_at?.split('T')[0] || '' }
function apptTimeStr(appt){ return apptDate(appt)?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) || '—' }
function doctorName(appt) { return appt.doctors?.profiles?.full_name || 'Attending Doctor' }
function facName(appt)    { return appt.facilities?.name || '—' }
function queueNo(appt)    { return appt.queues?.[0]?.queue_number || '—' }

// ── Booking Modal ──────────────────────────────────────────────────────────────
function BookingModal({ isOpen, onClose, onBooked }) {
  const [facilities,     setFacilities]     = useState([])
  const [selFacId,       setSelFacId]       = useState('')
  const [doctors,        setDoctors]        = useState([])
  const [selDoctorId,    setSelDoctorId]    = useState('')
  const [consultType,    setConsultType]    = useState('in_person')
  const [date,           setDate]           = useState(new Date().toISOString().split('T')[0])
  const [timeSlot,       setTimeSlot]       = useState('10:00')
  const [reason,         setReason]         = useState('')
  const [loading,        setLoading]        = useState(false)
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [error,          setError]          = useState('')
  const [confirmed,      setConfirmed]      = useState(null)

  // Load facilities once (prioritizing primary/demo facilities)
  useEffect(() => {
    if (!isOpen) return
    getFacilities().then(list => {
      if (!list) return
      const sorted = [...list].sort((a, b) => {
        if (a.name?.includes('DEMO')) return -1
        if (b.name?.includes('DEMO')) return 1
        return 0
      })
      setFacilities(sorted)
      if (sorted.length) setSelFacId(sorted[0].id)
    }).catch(() => {})
  }, [isOpen])

  // Load doctors when facility changes (falls back to available doctors if none assigned to this facility)
  useEffect(() => {
    if (!selFacId) return
    setLoadingDoctors(true)
    getDoctorsByFacility(selFacId).then(async (list) => {
      if (list && list.length > 0) {
        setDoctors(list)
        setSelDoctorId(list[0].id)
      } else {
        const fallbacks = await getAvailableDoctors()
        setDoctors(fallbacks || [])
        if (fallbacks?.length) setSelDoctorId(fallbacks[0].id)
        else setSelDoctorId('')
      }
    }).catch(async () => {
      const fallbacks = await getAvailableDoctors()
      setDoctors(fallbacks || [])
      if (fallbacks?.length) setSelDoctorId(fallbacks[0].id)
    }).finally(() => setLoadingDoctors(false))
  }, [selFacId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!date || !timeSlot) { setError('Please select a date and time slot.'); return }
    if (!selFacId)           { setError('Please select a facility.'); return }

    setLoading(true)
    setError('')
    try {
      const scheduledAt = new Date(`${date}T${timeSlot}:00`).toISOString()
      const doctorToBook = selDoctorId || doctors[0]?.id || null
      const result = await bookAppointment({
        doctorId:    doctorToBook,
        facilityId:  selFacId,
        scheduledAt,
        mode:        consultType,
        reason:      reason.trim() || null,
      })
      setConfirmed(result)
      onBooked?.()
    } catch (err) {
      setError(err.message || 'Failed to book appointment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => { setConfirmed(null); setError(''); onClose() }

  if (confirmed) {
    return (
      <Modal open={isOpen} onClose={handleClose} title="Appointment Booked!" size="md">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-status-success-bg flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-9 h-9 text-status-success" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">Appointment Confirmed</h3>
          <p className="text-text-muted text-xs mb-4">Your appointment has been saved to your health record.</p>
          <div className="bg-canvas rounded-xl p-4 text-left space-y-2 text-xs mb-5 border border-border-subtle">
            <div className="flex justify-between">
              <span className="text-text-muted">Date & Time:</span>
              <span className="font-semibold text-text-primary">{date} at {timeSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Mode:</span>
              <span className="font-semibold text-brand-default capitalize">{consultType.replace('_','-')}</span>
            </div>
            {confirmed.queue_number && (
              <div className="flex justify-between pt-2 border-t border-border-subtle">
                <span className="text-text-muted">Queue Number:</span>
                <span className="font-bold text-brand-default text-sm">{confirmed.queue_number}</span>
              </div>
            )}
          </div>
          <Button className="w-full bg-brand-default text-white" onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={isOpen} onClose={handleClose} title="Book OPD Appointment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-status-critical-bg text-status-critical text-xs rounded-lg border border-status-critical/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode toggle */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1.5">Consultation Type</label>
          <div className="grid grid-cols-2 gap-2">
            {[{val:'in_person',label:'In-Person Visit',icon:User},{val:'teleconsultation',label:'Teleconsultation',icon:Video}].map(opt => (
              <button key={opt.val} type="button" onClick={() => setConsultType(opt.val)}
                className={cn('flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all',
                  consultType === opt.val ? 'border-brand-default bg-subtle text-brand-default shadow-xs' : 'border-border-subtle bg-surface-elevated text-text-muted hover:border-brand-default/50')}>
                <opt.icon className="w-3.5 h-3.5" />{opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Facility */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1.5">Healthcare Facility</label>
          <select value={selFacId} onChange={e => setSelFacId(e.target.value)} required
            className="w-full text-xs border border-border-subtle rounded-lg px-3 py-2 bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-default">
            {facilities.length === 0
              ? <option>Loading facilities…</option>
              : facilities.map(f => <option key={f.id} value={f.id}>{f.name} — {f.district || ''}</option>)
            }
          </select>
        </div>

        {/* Doctor */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1.5">Doctor / Specialist</label>
          <select value={selDoctorId} onChange={e => setSelDoctorId(e.target.value)} required
            className="w-full text-xs border border-border-subtle rounded-lg px-3 py-2 bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-default">
            {loadingDoctors
              ? <option value="">Loading doctors…</option>
              : doctors.length === 0
                ? <option value="">Attending Medical Officer</option>
                : doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.profiles?.full_name || 'Dr. Medical Officer'} — {d.specialization || 'General Medicine'}
                    </option>
                  ))
            }
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">Date</label>
            <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)} required
              className="w-full text-xs border border-border-subtle rounded-lg px-3 py-2 bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-default" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">Time Slot</label>
            <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} required
              className="w-full text-xs border border-border-subtle rounded-lg px-3 py-2 bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-default">
              {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1.5">Symptoms / Reason for Visit</label>
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="E.g., Fever and mild cough for 2 days, routine blood pressure checkup…"
            className="w-full text-xs border border-border-subtle rounded-lg p-2.5 bg-surface-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-default resize-none" />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button type="submit" size="sm" className="bg-brand-default text-white" loading={loading}>Confirm Appointment</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Appointments() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [bookingOpen,   setBookingOpen]   = useState(false)
  const [appointments,  setAppointments]  = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [tab,           setTab]           = useState('upcoming')
  const [cancellingId,  setCancellingId]  = useState(null)

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getMyAppointments()
      setAppointments(list || [])
    } catch (err) {
      console.warn('[Appointments] fetch error:', err)
      setError(err.message || 'Failed to load appointments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      loadAppointments()
    }
  }, [authLoading, user, loadAppointments])

  // Open booking if ?mode=tele query param
  useEffect(() => {
    if (searchParams.get('mode') === 'tele') setBookingOpen(true)
  }, [searchParams])

  const todayStr = new Date().toISOString().split('T')[0]

  const upcomingAppointments = useMemo(() =>
    appointments.filter(a => !['cancelled','completed'].includes(a.status) && apptDateStr(a) >= todayStr),
    [appointments, todayStr]
  )
  const pastAppointments = useMemo(() =>
    appointments.filter(a => ['cancelled','completed'].includes(a.status) || apptDateStr(a) < todayStr),
    [appointments, todayStr]
  )

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return
    setCancellingId(id)
    try {
      await cancelAppointment(id)
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
    } catch (err) {
      alert('Failed to cancel: ' + (err.message || 'Unknown error'))
    } finally {
      setCancellingId(null)
    }
  }

  const displayed = tab === 'upcoming' ? upcomingAppointments : pastAppointments
  const statusVariant = { confirmed: 'success', scheduled: 'success', pending: 'warning', cancelled: 'critical', completed: 'outline', in_progress: 'blue' }

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Calendar className="w-6 h-6 text-brand-default" /> Appointments
            </h1>
            <p className="text-text-muted text-xs mt-0.5">Manage OPD consultations, checkups, and teleconsultations</p>
          </div>
          <Button className="bg-brand-default text-white" onClick={() => setBookingOpen(true)}>
            <Calendar className="w-4 h-4" /> Book Appointment
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-status-critical-bg text-status-critical text-xs rounded-lg border border-status-critical/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p>{error}</p>
              <button onClick={loadAppointments} className="underline mt-1">Retry</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-border-subtle pb-1">
          {[{id:'upcoming',label:'Upcoming Appointments',count:upcomingAppointments.length},
            {id:'past',    label:'Past & Cancelled',      count:pastAppointments.length}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('pb-2 px-3 text-sm font-semibold border-b-2 transition-all',
                tab === t.id ? 'border-brand-default text-brand-default' : 'border-transparent text-text-muted hover:text-text-primary')}>
              {t.label}
              <span className={cn('ml-1.5 px-2 py-0.5 rounded-full text-xs', tab === t.id ? 'bg-subtle text-brand-default' : 'bg-canvas text-text-muted')}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3.5">
            {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : displayed.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <Calendar className="w-12 h-12 text-border mx-auto mb-3" />
              <h3 className="font-semibold text-text-primary text-sm">No {tab} appointments found</h3>
              <p className="text-text-muted text-xs mt-1 mb-4">
                {tab === 'upcoming' ? "You don't have any upcoming visits scheduled." : 'No past appointment records found.'}
              </p>
              {tab === 'upcoming' && (
                <Button size="sm" className="bg-brand-default text-white" onClick={() => setBookingOpen(true)}>Book New Appointment</Button>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3.5">
            {displayed.map(appt => {
              const d    = apptDate(appt)
              const isTele = appt.mode === 'teleconsultation'
              return (
                <Card key={appt.id} className="hover:shadow-md transition-shadow">
                  <CardBody>
                    <div className="flex items-start gap-4">
                      {/* Date badge */}
                      <div className="flex flex-col items-center bg-subtle border border-brand-default/20 rounded-xl p-2.5 w-16 flex-shrink-0 text-center">
                        {d ? (
                          <>
                            <span className="text-[10px] font-bold text-brand-default uppercase">{d.toLocaleString('en', { month: 'short' })}</span>
                            <span className="text-2xl font-bold text-text-primary leading-none mt-0.5">{d.getDate()}</span>
                            <span className="text-[10px] text-text-muted mt-1">{d.getFullYear()}</span>
                          </>
                        ) : <Calendar className="w-5 h-5 text-text-muted" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-text-primary text-sm">{doctorName(appt)}</h3>
                          <Badge variant={statusVariant[appt.status] || 'default'} className="capitalize text-xs">{appt.status?.replace('_',' ')}</Badge>
                        </div>
                        <p className="text-xs text-text-muted mb-2">{appt.reason || 'OPD Consultation'}</p>
                        <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-brand-default" />{apptTimeStr(appt)}</span>
                          <span className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5 text-brand-default" />{facName(appt)}</span>
                          <span className="flex items-center gap-1">{isTele ? <Video className="w-3.5 h-3.5 text-brand-default" /> : <User className="w-3.5 h-3.5 text-text-muted" />}<span className="capitalize">{appt.mode?.replace('_','-')}</span></span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border-subtle flex-wrap">
                          <span className="text-xs bg-text-primary text-white px-2.5 py-0.5 rounded-full font-mono font-semibold">Queue: {queueNo(appt)}</span>
                          <div className="flex items-center gap-2 ml-auto">
                            {!['cancelled','completed'].includes(appt.status) && (
                              <Button size="sm" variant="outline"
                                className="text-status-critical border-status-critical/30 hover:bg-status-critical-bg text-xs h-7 px-2.5"
                                loading={cancellingId === appt.id}
                                onClick={() => handleCancel(appt.id)}>
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

      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onBooked={() => { setBookingOpen(false); loadAppointments() }}
      />
    </AppLayout>
  )
}
