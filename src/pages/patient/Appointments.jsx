/**
 * Appointments.jsx — /patient/appointments
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive Appointment booking, management, and Referral integration.
 * - Manages upcoming, past, and referral-backed appointments.
 * - Directly incorporates all referral features:
 *     • Referral Pathway banner (tiered public healthcare system)
 *     • Interactive 6-step referral status tracker (Created -> Pending -> Accepted -> Scheduled -> In Progress -> Completed)
 *     • Printable/viewable Digital Referral Slip
 *     • "Book Specialist Visit" from any referral with pre-filled facility & linked authorization
 *     • "Attach Referral" selector inside the Appointment Booking modal
 *     • Referral badges and linked clinical records on appointment cards
 * - Supports URL query params: ?facilityId=..., ?doctorId=..., ?referralId=..., ?tab=referrals
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { appointmentService, facilityService, liveOsmCache } from '../../services/api'
import { MOCK_FACILITIES, MOCK_DOCTORS_BY_FACILITY, MOCK_REFERRALS, MOCK_PATIENT } from '../../lib/mockData'
import { getMyReferrals } from '../../lib/db'
import {
  Calendar, Clock, MapPin, Video, User, CheckCircle2,
  AlertCircle, X, Loader2, Ban, FileText,
  ClipboardList, ArrowRight, Printer, ShieldCheck,
  ExternalLink, Sparkles, Building2, Check
} from 'lucide-react'
import { cn } from '../../lib/utils'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30'
]

const STATUS_STEPS = ['Created', 'Pending', 'Accepted', 'Scheduled', 'In Progress', 'Completed']
const referralStatusVariant = {
  created: 'neutral',
  pending: 'warning',
  accepted: 'success',
  scheduled: 'blue',
  'in progress': 'blue',
  completed: 'neutral'
}

// ── Digital Referral Slip Modal ────────────────────────────────────────────────
function ReferralSlipModal({ isOpen, onClose, referral: r, onBookAppointment }) {
  if (!r) return null

  return (
    <Modal open={isOpen} onClose={onClose} title="Digital Referral Authorization Slip" size="lg">
      <div className="space-y-4 pt-1 print:p-0">
        {/* Slip Header */}
        <div className="bg-navy rounded-xl p-4 text-white flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal" />
              <span className="text-xs font-semibold uppercase tracking-wider text-teal">
                Ayushman Bharat Digital Health Mission
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">Official Clinical Referral Slip</h2>
            <p className="text-xs text-white/70">
              CareConnect Public Healthcare Grid · Token #{`REF-${r.id.toUpperCase()}`}
            </p>
          </div>
          <Badge variant={referralStatusVariant[r.status] || 'default'} className="capitalize text-xs font-bold">
            {r.status}
          </Badge>
        </div>

        {/* Patient Details */}
        <div className="bg-bg rounded-xl p-4 border border-border space-y-2 text-xs">
          <p className="font-semibold text-navy text-xs uppercase tracking-wide">Patient Information</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <span className="text-muted block">Full Name:</span>
              <span className="font-semibold text-navy">{MOCK_PATIENT.name}</span>
            </div>
            <div>
              <span className="text-muted block">ABHA / Patient ID:</span>
              <span className="font-semibold text-navy font-mono">{MOCK_PATIENT.patient_id}</span>
            </div>
            <div>
              <span className="text-muted block">Age / Gender:</span>
              <span className="font-semibold text-navy">{MOCK_PATIENT.age} yrs · {MOCK_PATIENT.gender}</span>
            </div>
            <div>
              <span className="text-muted block">Blood Group:</span>
              <span className="font-semibold text-critical">{MOCK_PATIENT.blood_group}</span>
            </div>
          </div>
        </div>

        {/* Referral Details */}
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-surface rounded-xl p-3.5 border border-border space-y-1.5">
            <span className="text-muted block font-semibold text-[11px] uppercase tracking-wide">Referring Center</span>
            <p className="font-bold text-navy text-sm">{r.doctor}</p>
            <p className="text-muted">Primary Health Centre (PHC Khandwa)</p>
            <p className="text-muted">Date: {new Date(r.date).toLocaleDateString('en-IN')}</p>
          </div>
          <div className="bg-teal/5 rounded-xl p-3.5 border border-teal/20 space-y-1.5">
            <span className="text-teal block font-semibold text-[11px] uppercase tracking-wide">Referred Destination</span>
            <p className="font-bold text-navy text-sm">{r.to}</p>
            <p className="text-teal font-medium">Department of {r.dept}</p>
            <p className="text-muted">Priority: Fast-Track Specialist Consultation</p>
          </div>
        </div>

        {/* Clinical Reason */}
        <div className="bg-bg rounded-xl p-3.5 border border-border text-xs">
          <span className="text-muted block font-semibold text-[11px] uppercase tracking-wide mb-1">
            Clinical Indication & Referral Reason
          </span>
          <p className="text-navy font-medium bg-surface p-2.5 rounded-lg border border-border/60">
            {r.reason}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save Slip
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
            {r.status !== 'completed' && (
              <Button
                type="button"
                size="sm"
                className="bg-teal text-white text-xs flex items-center gap-1.5 shadow-xs"
                onClick={() => {
                  onClose()
                  onBookAppointment?.(r)
                }}
              >
                <Calendar className="w-3.5 h-3.5" />
                Book Appointment with this Referral
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Referral Card Component ───────────────────────────────────────────────────
function ReferralCard({ referral: r, onBookAppointment, onViewSlip }) {
  const stepIdx = STATUS_STEPS.findIndex(s => s.toLowerCase() === r.status.toLowerCase())

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-border/70">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-navy text-sm sm:text-base">
                {r.dept} — {r.to}
              </h3>
              <Badge variant={referralStatusVariant[r.status] || 'default'} className="capitalize text-xs">
                {r.status}
              </Badge>
              <span className="text-[11px] font-mono text-muted bg-bg px-2 py-0.5 rounded border border-border">
                REF-{r.id.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted mt-1">Reason: <strong className="text-navy font-medium">{r.reason}</strong></p>
            <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-teal" />
              Referred on {new Date(r.date).toLocaleDateString('en-IN')} by {r.doctor}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewSlip(r)}
          className="text-xs flex items-center gap-1 h-7.5 px-2.5 flex-shrink-0"
        >
          <FileText className="w-3.5 h-3.5 text-teal" />
          Slip
        </Button>
      </div>

      {/* Progress Stepper */}
      <div className="px-5 py-4 bg-slate-50/80 border-y border-slate-200/70">
        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#15803D]" />
          Referral Progress Tracker
        </p>
        <div className="flex items-start w-full">
          {STATUS_STEPS.map((s, i) => {
            const isFinishedReferral = r.status.toLowerCase() === 'completed'
            const isCompleted = isFinishedReferral || i < stepIdx
            const isCurrent = !isFinishedReferral && i === stepIdx
            const dist = i - stepIdx

            let circleClass = ''
            let lineClass = ''
            let labelClass = ''

            if (isCompleted) {
              // Completed steps: Solid Dark Green
              circleClass = 'bg-[#15803D] text-white border-2 border-[#166534] shadow-sm'
              lineClass = 'bg-[#15803D]'
              labelClass = 'text-slate-900 font-bold'
            } else if (isCurrent) {
              // Current active step: Dark green with highlight ring
              circleClass = 'bg-[#166534] text-white ring-4 ring-emerald-200 border-2 border-[#15803D] shadow-md scale-105'
              lineClass = 'bg-gradient-to-r from-[#15803D] to-emerald-300'
              labelClass = 'text-emerald-950 font-extrabold'
            } else if (dist === 1) {
              // 1 step ahead: medium green
              circleClass = 'bg-emerald-300 text-emerald-950 border-2 border-emerald-500 font-bold shadow-xs'
              lineClass = 'bg-emerald-200'
              labelClass = 'text-slate-700 font-semibold'
            } else if (dist === 2) {
              // 2 steps ahead: soft green
              circleClass = 'bg-emerald-100 text-emerald-900 border-2 border-emerald-300 font-bold shadow-xs'
              lineClass = 'bg-emerald-100'
              labelClass = 'text-slate-600 font-medium'
            } else if (dist === 3) {
              // 3 steps ahead: pale mint green
              circleClass = 'bg-emerald-50 text-emerald-800 border-2 border-emerald-200 font-bold shadow-xs'
              lineClass = 'bg-slate-200'
              labelClass = 'text-slate-500 font-medium'
            } else {
              // 4+ steps ahead: faded subtle grey-green
              circleClass = 'bg-slate-100 text-slate-600 border-2 border-slate-300 font-bold shadow-xs'
              lineClass = 'bg-slate-200'
              labelClass = 'text-slate-400 font-medium'
            }

            return (
              <div key={s} className="flex items-start flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all',
                      circleClass
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span className="text-xs font-black">{i + 1}</span>
                    )}
                  </div>
                  <span className={cn('text-center text-[11px] leading-tight select-none whitespace-nowrap hidden sm:block', labelClass)}>
                    {i + 1}. {s}
                  </span>
                  <span className={cn('text-center text-[10px] leading-tight select-none sm:hidden', labelClass)}>
                    {s}
                  </span>
                </div>

                {i < STATUS_STEPS.length - 1 && (
                  <div className={cn('flex-1 h-1 mx-1.5 sm:mx-2 rounded-full mt-3.5 transition-all', lineClass)} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-t border-border flex-wrap bg-surface">
        <div>
          {r.status === 'pending' && (
            <p className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" /> Awaiting clearance from {r.to}
            </p>
          )}
          {r.status === 'accepted' && (
            <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Referral accepted! Ready to book your specialist consultation.
            </p>
          )}
          {r.status === 'scheduled' && (
            <p className="text-xs text-teal-800 font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" /> Appointment registered under this referral slip.
            </p>
          )}
          {r.status === 'completed' && (
            <p className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Consultation completed. Records archived.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewSlip(r)}
            className="text-xs h-8 px-3 text-slate-700 hover:bg-slate-100 border-slate-300"
          >
            View Slip
          </Button>
          {r.status !== 'completed' && (
            <Button
              size="sm"
              onClick={() => onBookAppointment(r)}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold h-8 px-3.5 flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              Book Specialist Visit
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Booking Modal with Referral Integration ──────────────────────────────────
function BookingModal({
  isOpen,
  onClose,
  initialFacilityId,
  initialDoctorId,
  initialReferralId,
  referrals = [],
  onBooked
}) {
  const [facilities, setFacilities] = useState([])
  const [selectedFacilityId, setSelectedFacilityId] = useState(initialFacilityId || '')
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || '')
  const [selectedReferralId, setSelectedReferralId] = useState(initialReferralId || '')
  const [consultationType, setConsultationType] = useState('in-person')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [timeSlot, setTimeSlot] = useState('10:00')
  const [symptoms, setSymptoms] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmedAppt, setConfirmedAppt] = useState(null)

  // Load facilities
  useEffect(() => {
    let list = [...MOCK_FACILITIES]
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

  // Handle initialReferralId changes
  useEffect(() => {
    if (initialReferralId) {
      setSelectedReferralId(initialReferralId)
      const refItem = referrals.find(r => r.id === initialReferralId)
      if (refItem) {
        // Find matching facility for referral destination
        const matchingFac = MOCK_FACILITIES.find(f =>
          f.name.toLowerCase().includes(refItem.to.toLowerCase()) ||
          refItem.to.toLowerCase().includes(f.name.toLowerCase())
        )
        if (matchingFac) {
          setSelectedFacilityId(matchingFac.id)
        }
        setSymptoms(`Referral Consultation: ${refItem.reason} (${refItem.dept})`)
      }
    }
  }, [initialReferralId, referrals])

  // Handle referral selector changes
  const handleReferralChange = (refId) => {
    setSelectedReferralId(refId)
    if (!refId) return

    const refItem = referrals.find(r => r.id === refId)
    if (refItem) {
      const matchingFac = facilities.find(f =>
        f.name.toLowerCase().includes(refItem.to.toLowerCase()) ||
        refItem.to.toLowerCase().includes(f.name.toLowerCase())
      )
      if (matchingFac) {
        setSelectedFacilityId(matchingFac.id)
      }
      if (!symptoms || symptoms.startsWith('Referral Consultation:')) {
        setSymptoms(`Referral Consultation: ${refItem.reason} (${refItem.dept})`)
      }
    }
  }

  // Get doctors for currently selected facility
  const availableDoctors = useMemo(() => {
    if (!selectedFacilityId) return []
    const docs = MOCK_DOCTORS_BY_FACILITY[selectedFacilityId] || []
    if (docs.length > 0) return docs
    return [
      { id: 'doc-default', name: 'On-Duty Medical Officer', specialization: 'General OPD / Family Medicine' }
    ]
  }, [selectedFacilityId])

  // Ensure valid selected doctor
  useEffect(() => {
    if (availableDoctors.length > 0) {
      const exists = availableDoctors.some(d => d.id === selectedDoctorId)
      if (!exists) {
        setSelectedDoctorId(availableDoctors[0].id)
      }
    }
  }, [selectedFacilityId, availableDoctors, selectedDoctorId])

  const selectedReferral = useMemo(() => {
    return referrals.find(r => r.id === selectedReferralId) || null
  }, [selectedReferralId, referrals])

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
        symptoms: symptoms.trim(),
        referralId: selectedReferral?.id || null,
        referralDept: selectedReferral?.dept || null,
        isReferral: !!selectedReferral
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
          <p className="text-muted text-xs mb-4">
            Your appointment has been registered with the facility{confirmedAppt.referralId ? ' and linked to your referral slip' : ''}.
          </p>

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
              <span className="font-semibold text-navy">
                {confirmedAppt.date} at {confirmedAppt.timeSlot || confirmedAppt.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Consultation Mode:</span>
              <span className="font-semibold text-teal capitalize">
                {confirmedAppt.consultationType || confirmedAppt.mode}
              </span>
            </div>
            {confirmedAppt.referralId && (
              <div className="flex justify-between items-center bg-teal/10 p-2 rounded-lg border border-teal/20">
                <span className="text-teal font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Referral Authorization:
                </span>
                <span className="font-bold text-navy font-mono">
                  REF-{confirmedAppt.referralId.toUpperCase()} ({confirmedAppt.referralDept})
                </span>
              </div>
            )}
            {confirmedAppt.symptoms && (
              <div className="flex justify-between">
                <span className="text-muted">Reason/Notes:</span>
                <span className="font-medium text-navy truncate max-w-[200px]">{confirmedAppt.symptoms}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted">Queue Token:</span>
              <span className="font-bold text-teal text-sm">
                {confirmedAppt.queueNo || confirmedAppt.queue_no || 'A-032'}
                {confirmedAppt.referralId && ' (Priority OPD)'}
              </span>
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
    <Modal open={isOpen} onClose={handleClose} title="Book OPD / Specialist Appointment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-critical-bg text-critical text-xs rounded-lg border border-critical/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Referral Link Selector */}
        <div className="bg-bg/60 p-3 rounded-xl border border-border space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-navy flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
              Link Clinical Referral Slip (Optional)
            </label>
            {selectedReferral && (
              <Badge variant="success" className="text-[10px]">Referral Applied</Badge>
            )}
          </div>
          <select
            value={selectedReferralId}
            onChange={(e) => handleReferralChange(e.target.value)}
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal"
          >
            <option value="">None (Standard General OPD Booking)</option>
            {referrals.map(r => (
              <option key={r.id} value={r.id}>
                {r.id.toUpperCase()}: {r.dept} — {r.to} ({r.reason})
              </option>
            ))}
          </select>
          {selectedReferral && (
            <p className="text-[11px] text-teal flex items-center gap-1">
              <Sparkles className="w-3 h-3 flex-shrink-0" />
              Clinical history and priority OPD token will be forwarded to {selectedReferral.to}.
            </p>
          )}
        </div>

        {/* 2. Mode Toggle */}
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

        {/* 3. Facility Selection */}
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

        {/* 4. Doctor Selection */}
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

        {/* 5. Date & Time */}
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

        {/* 6. Symptoms / Notes */}
        <div>
          <label className="block text-xs font-semibold text-navy mb-1.5">Symptoms / Clinical Notes</label>
          <textarea
            rows={3}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="E.g., Follow-up for chest pain and fatigue, referral review..."
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

// ── Main Appointments Page ───────────────────────────────────────────────────
export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const facilityId = searchParams.get('facilityId') || null
  const doctorId   = searchParams.get('doctorId')   || null
  const referralParam = searchParams.get('referralId') || null
  const initialTab = searchParams.get('tab') === 'referrals' ? 'referrals' : 'upcoming'

  const [tab, setTab] = useState(initialTab) // 'upcoming' | 'referrals' | 'past'
  const [bookingOpen, setBookingOpen] = useState(!!(facilityId || doctorId || referralParam))
  const [activeBookingReferralId, setActiveBookingReferralId] = useState(referralParam || '')
  const [appointments, setAppointments] = useState([])
  const [referrals, setReferrals] = useState(MOCK_REFERRALS)
  const [selectedSlipReferral, setSelectedSlipReferral] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)

  // Load appointments & referrals
  const loadAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, refRes] = await Promise.allSettled([
        appointmentService.getAll(),
        getMyReferrals()
      ])
      if (listRes.status === 'fulfilled' && listRes.value) {
        setAppointments(listRes.value)
      }
      if (refRes.status === 'fulfilled' && refRes.value && refRes.value.length > 0) {
        const formatted = refRes.value.map(r => ({
          ...r,
          id: r.id,
          dept: r.department,
          department: r.department,
          fromFacility: r.from_fac?.name || 'CareConnect Primary Centre',
          toFacility: r.to_fac?.name || 'District Referral Hospital',
          referringDoctor: r.referring_doctor?.profiles?.full_name || 'Medical Officer',
          reason: r.reason || 'Specialist Evaluation',
          urgency: r.urgency || 'routine',
          status: r.status || 'pending',
          notes: r.notes || '',
          createdDate: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : 'Recent',
          expiryDate: 'Valid 30 Days',
          stepIndex: r.status === 'completed' ? 5 : r.status === 'in progress' ? 4 : r.status === 'scheduled' ? 3 : r.status === 'accepted' ? 2 : r.status === 'pending' ? 1 : 0
        }))
        setReferrals(formatted)
      }
    } catch (err) {
      console.error('Error fetching appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // Sync tab with URL searchParams if tab parameter changes
  useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab === 'referrals' && tab !== 'referrals') {
      setTab('referrals')
    }
  }, [searchParams, tab])

  // Auto-open modal if query params change
  useEffect(() => {
    if (facilityId || doctorId || referralParam) {
      if (referralParam) {
        setActiveBookingReferralId(referralParam)
      }
      setBookingOpen(true)
    }
  }, [facilityId, doctorId, referralParam])

  // Categorize appointments
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

  // Active referral for quick notification banner
  const activeReferral = useMemo(() => {
    return referrals.find(r => r.status === 'accepted' || r.status === 'pending') || null
  }, [referrals])

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

  const handleBookWithReferral = (refItem) => {
    setActiveBookingReferralId(refItem.id)
    setBookingOpen(true)
  }

  const handleTabChange = (newTab) => {
    setTab(newTab)
    if (newTab === 'referrals') {
      searchParams.set('tab', 'referrals')
    } else {
      searchParams.delete('tab')
    }
    setSearchParams(searchParams, { replace: true })
  }

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
              Appointments & Referrals
            </h1>
            <p className="text-muted text-xs mt-0.5">
              Manage OPD consultations, specialist referrals, and digital referral slips
            </p>
          </div>
          <Button
            className="bg-teal text-white shadow-xs"
            onClick={() => {
              setActiveBookingReferralId('')
              setBookingOpen(true)
            }}
          >
            <Calendar className="w-4 h-4" /> Book Appointment
          </Button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
          <button
            onClick={() => handleTabChange('upcoming')}
            className={cn(
              'pb-2 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap',
              tab === 'upcoming'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            )}
          >
            Upcoming Appointments
            <span className="px-2 py-0.5 rounded-full text-xs bg-teal/10 text-teal font-bold">
              {upcomingAppointments.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('referrals')}
            className={cn(
              'pb-2 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap',
              tab === 'referrals'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Specialist Referrals
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-600 font-bold">
              {referrals.filter(r => r.status !== 'completed').length} Active
            </span>
          </button>

          <button
            onClick={() => handleTabChange('past')}
            className={cn(
              'pb-2 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap',
              tab === 'past'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            )}
          >
            Past & Cancelled
            <span className="px-2 py-0.5 rounded-full text-xs bg-bg text-muted">
              {pastAppointments.length}
            </span>
          </button>
        </div>

        {/* ── TAB 1: Upcoming Appointments ──────────────────────────────────── */}
        {tab === 'upcoming' && (
          <div className="space-y-4">
            {/* Active referral action callout banner */}
            {activeReferral && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy text-sm">Active Specialist Referral</span>
                      <Badge variant="warning" className="text-[10px] font-bold uppercase">
                        {activeReferral.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {activeReferral.doctor} referred you to <strong className="text-navy">{activeReferral.dept}</strong> at {activeReferral.to}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => handleTabChange('referrals')}
                  >
                    View All Referrals
                  </Button>
                  <Button
                    size="sm"
                    className="bg-teal text-white text-xs h-8 shadow-xs whitespace-nowrap"
                    onClick={() => handleBookWithReferral(activeReferral)}
                  >
                    Book Specialist Visit →
                  </Button>
                </div>
              </div>
            )}

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted">
                <Loader2 className="w-8 h-8 animate-spin text-teal" />
                <p className="text-sm">Loading appointments…</p>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <Card>
                <CardBody className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-border mx-auto mb-3" />
                  <h3 className="font-semibold text-navy text-sm">No upcoming appointments scheduled</h3>
                  <p className="text-muted text-xs mt-1 mb-4">
                    Book a routine OPD checkup, teleconsultation, or schedule an authorized referral visit.
                  </p>
                  <Button size="sm" className="bg-teal text-white" onClick={() => setBookingOpen(true)}>
                    Book New Appointment
                  </Button>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3.5">
                {upcomingAppointments.map(appt => {
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
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-navy text-sm">{appt.doctor || 'Attending Doctor'}</h3>
                                {appt.referralId && (
                                  <Badge variant="warning" className="text-[10px] flex items-center gap-1">
                                    <ClipboardList className="w-3 h-3" />
                                    Referred ({appt.referralDept || 'Specialist'})
                                  </Badge>
                                )}
                              </div>
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
                                <span className="line-clamp-2">Clinical Note: {appt.symptoms}</span>
                              </div>
                            )}

                            {/* Action buttons & queue */}
                            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border flex-wrap">
                              <span className="text-xs bg-navy text-white px-2.5 py-0.5 rounded-full font-mono font-semibold">
                                Queue: {appt.queueNo || appt.queue_no || 'A-028'}
                                {appt.referralId ? ' (Priority)' : ''}
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
        )}

        {/* ── TAB 2: Specialist Referrals ─────────────────────────────────── */}
        {tab === 'referrals' && (
          <div className="space-y-4">
            {/* Referrals list */}
            <div className="space-y-4">
              {referrals.map(r => (
                <ReferralCard
                  key={r.id}
                  referral={r}
                  onBookAppointment={handleBookWithReferral}
                  onViewSlip={(refItem) => setSelectedSlipReferral(refItem)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: Past & Cancelled ──────────────────────────────────────── */}
        {tab === 'past' && (
          <div className="space-y-4">
            {pastAppointments.length === 0 ? (
              <Card>
                <CardBody className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-border mx-auto mb-3" />
                  <h3 className="font-semibold text-navy text-sm">No past appointment history</h3>
                  <p className="text-muted text-xs mt-1">Previous appointments will be archived here.</p>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3.5">
                {pastAppointments.map(appt => {
                  const apptId = appt.id || appt._id
                  return (
                    <Card key={apptId} className="opacity-80 hover:opacity-100 transition-opacity">
                      <CardBody>
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center bg-bg border border-border rounded-xl p-2.5 w-16 flex-shrink-0 text-center">
                            <span className="text-[10px] font-bold text-muted uppercase">
                              {new Date(appt.date).toLocaleString('en', { month: 'short' })}
                            </span>
                            <span className="text-2xl font-bold text-muted leading-none mt-0.5">
                              {new Date(appt.date).getDate()}
                            </span>
                            <span className="text-[10px] text-muted mt-1">
                              {new Date(appt.date).getFullYear()}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-navy text-sm">{appt.doctor}</h3>
                              <Badge variant={statusVariant[appt.status] || 'neutral'} className="capitalize text-xs">
                                {appt.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted mb-2">{appt.facility} · {appt.type || 'OPD Consultation'}</p>
                            {appt.symptoms && (
                              <p className="text-xs text-muted italic">Note: {appt.symptoms}</p>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => {
          setBookingOpen(false)
          setActiveBookingReferralId('')
        }}
        initialFacilityId={facilityId}
        initialDoctorId={doctorId}
        initialReferralId={activeBookingReferralId}
        referrals={referrals}
        onBooked={(newAppt) => {
          setAppointments(prev => [newAppt, ...prev])
          // If booked via referral, update referral status to 'scheduled'
          if (newAppt.referralId) {
            setReferrals(prev => prev.map(r => r.id === newAppt.referralId ? { ...r, status: 'scheduled' } : r))
          }
        }}
      />

      {/* Digital Referral Slip Modal */}
      <ReferralSlipModal
        isOpen={!!selectedSlipReferral}
        onClose={() => setSelectedSlipReferral(null)}
        referral={selectedSlipReferral}
        onBookAppointment={handleBookWithReferral}
      />
    </AppLayout>
  )
}
