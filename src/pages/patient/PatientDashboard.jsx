/**
 * PatientDashboard.jsx — /patient
 * ─────────────────────────────────────────────────────────────────────────────
 * Main patient dashboard. All data fetched from Supabase — no mock data.
 * Loads: upcoming appointments, active referrals, latest vitals, follow-up counts.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { KPICard } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Misc'
import SymptomTriage from '../../components/ui/SymptomTriage'
import {
  Calendar, Activity, ClipboardList, Pill, PhoneCall,
  AlertCircle, FileText, Heart, Droplets, Weight, TrendingUp, Clock, Users
} from 'lucide-react'
import {
  getMyAppointments,
  getMyReferrals,
  getMyVitals,
  getMyFollowUps,
} from '../../lib/db'
import { appointmentService } from '../../services/api'

// ── Helper: format vitals value safely ───────────────────────────────────────
function fmtBP(v)  { return v?.bp_systolic && v?.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : '—' }
function fmtVal(v) { return v != null ? String(v) : '—' }

// ── Vital Card ────────────────────────────────────────────────────────────────
function VitalCard({ icon: Icon, label, value, unit, status = 'normal' }) {
  const statusColor = { normal: 'text-status-success', warning: 'text-status-warning', critical: 'text-status-critical' }
  const bgTone      = { normal: 'bg-status-success-bg', warning: 'bg-status-warning-bg', critical: 'bg-status-critical-bg' }
  return (
    <div className="bg-canvas rounded-2xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow border border-transparent hover:border-border-subtle">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-full ${bgTone[status]} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${statusColor[status]}`} />
        </div>
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-text-primary">
          {value}<span className="text-xs sm:text-sm font-medium text-text-muted ml-1">{unit}</span>
        </p>
        <span className="text-xs font-medium text-text-muted leading-tight mt-1 inline-block">{label}</span>
      </div>
    </div>
  )
}

// ── Appointment Card ──────────────────────────────────────────────────────────
function AppointmentCard({ appt, onView }) {
  const date   = appt.dateObj || (appt.scheduled_at ? new Date(appt.scheduled_at) : (appt.date ? new Date(`${appt.date}T${appt.time || appt.timeSlot || '09:00'}`) : null))
  const doctor = appt.doctorName || appt.doctors?.profiles?.full_name || 'Attending Doctor'
  const fac    = appt.facilityName || appt.facilities?.name || '—'
  const qNo    = appt.queueNumber || appt.queues?.[0]?.queue_number || '—'
  const status = appt.status || 'scheduled'
  const statusVariant = { confirmed: 'success', scheduled: 'success', pending: 'warning', cancelled: 'critical', completed: 'outline' }
  const borderTone    = { confirmed: 'border-status-success', scheduled: 'border-status-success', pending: 'border-status-warning', cancelled: 'border-status-critical', completed: 'border-border' }

  return (
    <div className={`relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-surface-elevated rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 ${borderTone[status] || 'border-border'}`}>
      <div className="flex flex-col items-center justify-center text-center bg-canvas rounded-xl w-14 h-14 flex-shrink-0">
        {date && !isNaN(date.getTime()) ? (
          <>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{date.toLocaleString('en', { month: 'short' })}</span>
            <span className="text-xl font-black text-text-primary leading-none mt-0.5">{date.getDate()}</span>
          </>
        ) : <Calendar className="w-5 h-5 text-text-muted" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-text-primary text-base">{doctor}</span>
          <Badge variant={statusVariant[status] || 'default'}>{status}</Badge>
        </div>
        <p className="text-sm text-text-muted">{fac} · {appt.reason || appt.symptoms || 'Consultation'}</p>
        <div className="flex items-center gap-4 mt-2 text-xs font-medium text-text-muted">
          {date && !isNaN(date.getTime()) && (
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          <span className="flex items-center gap-1.5">Queue: <strong className="text-text-primary">{qNo}</strong></span>
          <span className="capitalize px-2 py-0.5 bg-canvas rounded-md border border-border-subtle">{appt.mode?.replace('_', '-') || appt.consultationType || 'in-person'}</span>
        </div>
      </div>
      <Button size="sm" variant="ghost" className="w-full sm:w-auto mt-2 sm:mt-0 bg-subtle hover:bg-brand-light text-brand-default" onClick={onView}>Details</Button>
    </div>
  )
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions({ navigate }) {
  const actions = [
    { label: 'Book Appt', icon: Calendar, color: 'text-brand-default', bg: 'bg-subtle', hover: 'hover:bg-brand-default hover:text-white', href: '/patient/appointments' },
    { label: 'Records', icon: FileText, color: 'text-status-success', bg: 'bg-status-success-bg', hover: 'hover:bg-status-success hover:text-white', href: '/patient/records' },
    { label: 'Medicines', icon: Pill, color: 'text-brand-default', bg: 'bg-subtle', hover: 'hover:bg-brand-default hover:text-white', href: '/patient/medicines' },
    { label: 'Diagnostics', icon: Activity, color: 'text-brand-secondary', bg: 'bg-brand-secondary-light', hover: 'hover:bg-brand-secondary hover:text-white', href: '/patient/diagnostics' },
    { label: 'My Queue', icon: Clock, color: 'text-status-success', bg: 'bg-status-success-bg', hover: 'hover:bg-status-success hover:text-white', href: '/patient/queue' },
    { label: 'Emergency', icon: AlertCircle, color: 'text-status-critical', bg: 'bg-status-critical-bg', hover: 'hover:bg-status-critical hover:text-white', href: '/patient/emergency' },
  ]
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
      {actions.map(a => (
        <button
          key={a.label}
          onClick={() => a.href.startsWith('tel:') ? window.open(a.href) : navigate(a.href)}
          className="flex flex-col items-center gap-2.5 group focus:outline-none"
        >
          <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1 ${a.bg} ${a.color} ${a.hover}`}>
            <a.icon className="w-6 h-6" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-text-muted group-hover:text-text-primary transition-colors text-center leading-tight px-1">{a.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function PatientDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState([])
  const [referrals,    setReferrals]    = useState([])
  const [vitals,       setVitals]       = useState(null)
  const [followUps,    setFollowUps]    = useState([])
  const [loading,      setLoading]      = useState(true)

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (user?.name || 'there').split(' ')[0]

  useEffect(() => {
    if (authLoading) return
    setLoading(true)
    Promise.allSettled([
      getMyAppointments(),
      appointmentService.getAll(),
      getMyReferrals(),
      getMyVitals(1),
      getMyFollowUps(),
    ]).then(([dbApptRes, apiApptRes, refRes, vitalsRes, fuRes]) => {
      const listA = dbApptRes.status === 'fulfilled' ? (dbApptRes.value || []) : []
      const listB = apiApptRes.status === 'fulfilled' ? (apiApptRes.value || []) : []
      const seen = new Set()
      const merged = []
      for (const a of [...listA, ...listB]) {
        const id = a.id || a._id
        if (id && !seen.has(id)) {
          seen.add(id)
          merged.push(a)
        } else if (!id) {
          merged.push(a)
        }
      }
      setAppointments(merged)
      if (refRes.status  === 'fulfilled') setReferrals(refRes.value   || [])
      if (vitalsRes.status === 'fulfilled' && vitalsRes.value?.length) setVitals(vitalsRes.value[0])
      if (fuRes.status   === 'fulfilled') setFollowUps(fuRes.value    || [])
    }).finally(() => setLoading(false))
  }, [authLoading, user])

  // Derive normalized appointments
  const normalizedAppointments = useMemo(() => {
    return appointments.map(a => {
      let dateObj = null
      if (a.scheduled_at) {
        dateObj = new Date(a.scheduled_at)
      } else if (a.date) {
        const timeStr = a.time || a.timeSlot || '09:00'
        dateObj = new Date(`${a.date}T${timeStr}`)
      }

      const doctorName = a.doctor || a.doctorName || a.doctors?.profiles?.full_name || 'Attending Doctor'
      const facilityName = a.facility || a.facilityName || a.facilities?.name || 'Healthcare Centre'
      const queueNumber = a.queueNo || a.queue_no || a.queues?.[0]?.queue_number || '—'
      const status = (a.status || 'scheduled').toLowerCase()

      return {
        ...a,
        dateObj,
        doctorName,
        facilityName,
        queueNumber,
        status,
      }
    })
  }, [appointments])

  // Real-time filter: only future appointments that are not cancelled or completed
  const now = new Date()
  const upcoming = useMemo(() => {
    return normalizedAppointments
      .filter(a => {
        if (['cancelled', 'completed'].includes(a.status)) return false
        if (!a.dateObj || isNaN(a.dateObj.getTime())) return false
        return a.dateObj.getTime() >= now.getTime()
      })
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
  }, [normalizedAppointments])

  const nextAppt = upcoming[0] || null
  const nextApptFac = nextAppt?.facilityName || ''
  const nextApptDoctor = nextAppt?.doctorName || 'Doctor'
  const nextApptTime = nextAppt?.dateObj
    ? nextAppt.dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null
  const nextApptDate = nextAppt?.dateObj
    ? nextAppt.dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    : null

  const activeRefs  = referrals.filter(r => !['completed','cancelled'].includes(r.status))
  const firstDept   = activeRefs[0]?.department || null
  const queueEntry  = upcoming[0]?.queues?.[0]
  const queueNo     = queueEntry?.queue_number || nextAppt?.queueNumber || '—'

  const dueSoonFU   = followUps.filter(f => f.status === 'due_soon' || f.status === 'overdue')
  const nextDueDate = dueSoonFU[0]?.next_due ? new Date(dueSoonFU[0].next_due).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—'

  // KPI subtitle helpers
  const nextApptKPIVal      = nextAppt ? nextApptDate : 'None'
  const nextApptKPISubtitle = nextAppt ? `${nextApptTime} · ${nextApptFac}` : 'No upcoming appointments'
  const queueKPIVal         = queueNo !== '—' ? queueNo : '—'

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

        {/* Hero Banner */}
        <div className="bg-brand-default rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{greeting}, {firstName} 👋</h1>
            <p className="text-brand-light text-sm font-medium opacity-90">Your health journey, seamlessly connected.</p>
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 w-full md:w-auto">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              {loading ? (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36 bg-white/20" />
                  <Skeleton className="h-3 w-24 bg-white/10" />
                </div>
              ) : nextAppt ? (
                <>
                  <p className="text-white font-semibold text-sm">
                    {nextApptDate} at {nextApptTime}
                  </p>
                  <p className="text-white/80 text-xs mt-0.5">
                    {nextApptDoctor} · {nextApptFac}
                  </p>
                </>
              ) : (
                <p className="text-white/90 font-semibold text-sm">No upcoming appointments</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-text-primary">Quick Actions</h2>
          </div>
          <QuickActions navigate={navigate} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-surface-elevated rounded-2xl p-5 border border-border-subtle">
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          ) : (
            <>
              <KPICard title="Next Appointment" value={nextApptKPIVal}        subtitle={nextApptKPISubtitle} icon={Calendar}     color="teal"     />
              <KPICard title="Queue Position"   value={queueKPIVal}           subtitle={queueNo !== '—' ? 'Active today' : 'No queue today'}  icon={Clock}      color="blue"     />
              <div className="cursor-pointer" onClick={() => navigate('/patient/appointments?tab=referrals')}>
                <KPICard title="Active Referrals" value={String(activeRefs.length)} subtitle={firstDept || 'None active'} icon={ClipboardList} color="warning"  />
              </div>
              <div className="cursor-pointer" onClick={() => navigate('/patient/appointments')}>
                <KPICard title="Total Appointments" value={String(normalizedAppointments.length)} subtitle={upcoming.length ? `${upcoming.length} upcoming` : 'No upcoming'} icon={FileText} color="teal" />
              </div>
            </>
          )}
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-12 gap-8">

          {/* Left: Triage, Appointments, Referrals */}
          <div className="lg:col-span-8 space-y-8">
            <SymptomTriage />

            {/* Upcoming Appointments */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-text-primary">Upcoming Appointments</h2>
                <Button size="sm" variant="ghost" className="text-brand-default hover:bg-subtle" onClick={() => navigate('/patient/appointments')}>View all</Button>
              </div>
              {loading ? (
                <div className="space-y-4">
                  {[1,2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
              ) : upcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-surface-elevated rounded-2xl border border-border-subtle text-center">
                  <Calendar className="w-10 h-10 text-border mb-3" />
                  <p className="text-sm font-semibold text-text-primary">No upcoming appointments</p>
                  <p className="text-xs text-text-muted mt-1 mb-4">Book a new appointment to get started</p>
                  <Button size="sm" className="bg-brand-default text-white" onClick={() => navigate('/patient/appointments')}>Book Appointment</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcoming.slice(0, 3).map(appt => (
                    <AppointmentCard key={appt.id} appt={appt} onView={() => navigate('/patient/appointments')} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar: Emergency + Vitals */}
          <div className="lg:col-span-4 space-y-8">
            {/* Emergency */}
            <div className="bg-status-critical-bg rounded-3xl p-6 md:p-8 border border-status-critical/20 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-status-critical/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-status-critical flex items-center justify-center shadow-lg shadow-status-critical/30 mb-5">
                  <PhoneCall className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-status-critical mb-3">Emergency Help</h2>
                <p className="text-sm text-status-critical/80 mb-6 font-medium leading-relaxed">Need urgent medical assistance? We are available 24/7.</p>
                <Button className="w-full bg-status-critical hover:bg-status-critical/90 text-white shadow-sm py-2.5" onClick={() => window.open('tel:108')}>
                  Call 108 Emergency
                </Button>
              </div>
            </div>

            {/* Vitals */}
            <div className="bg-surface-elevated rounded-3xl p-6 md:p-7 border border-border-subtle shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-default" /> Health Overview
                </h2>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                </div>
              ) : vitals ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <VitalCard icon={Heart}      label="Blood Pressure" value={fmtBP(vitals)}              unit="mmHg" status="normal" />
                  <VitalCard icon={Droplets}   label="Blood Sugar"    value={fmtVal(vitals.blood_sugar)}  unit="mg/dL" status="normal" />
                  <VitalCard icon={Weight}     label="Weight"         value={fmtVal(vitals.weight)}        unit="kg"  status="normal" />
                  <VitalCard icon={TrendingUp} label="Heart Rate"     value={fmtVal(vitals.heart_rate)}    unit="bpm" status="normal" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Activity className="w-8 h-8 text-border mb-2" />
                  <p className="text-xs text-text-muted">No vitals recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
