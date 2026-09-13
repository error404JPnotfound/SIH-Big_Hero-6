import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { KPICard } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Misc'
import { supabase } from '../../lib/supabase'
import {
  updateAppointmentStatus,
  updateQueueStatus,
  updateDoctorAvailability,
} from '../../lib/db'
import { appointmentService } from '../../services/api'
import {
  Users, CheckCircle2, AlertCircle, Clock, Stethoscope, FileText,
  ChevronRight, Play, Eye, Loader2, Calendar
} from 'lucide-react'

const PRIORITY_META = {
  emergency: { variant: 'critical', label: 'Emergency' },
  high:      { variant: 'critical', label: 'High Priority' },
  low:       { variant: 'success', label: 'Low' },
}

function getAge(dob) {
  if (!dob) return '—'
  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return '—'

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

function getWaitingTime(createdAt, status) {
  if (!createdAt) return '—'
  if (status === 'in_consultation') return 'In consultation'

  const started = new Date(createdAt).getTime()
  if (Number.isNaN(started)) return '—'

  const minutes = Math.max(0, Math.floor((Date.now() - started) / 60000))
  if (minutes < 60) return `${minutes} mins`

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `${hours}h ${remaining}m`
}

function PatientQueueRow({ patient, onStart, onView, startingId }) {
  const pm = PRIORITY_META[patient.priority] || PRIORITY_META.low
  const isStarting = startingId === patient.id
  const isActive = patient.queue_status === 'in_consultation'
  const startButtonClass = isActive
    ? 'border border-border-subtle bg-canvas text-text-muted shadow-none disabled:opacity-100'
    : 'bg-brand-default text-white hover:bg-brand-hover'

  return (
    <tr className="border-b border-border-subtle hover:bg-bg transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono font-bold text-brand-default text-sm">{patient.queue_no}</span>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-semibold text-text-primary text-sm">{patient.name}</p>
          <p className="text-xs text-text-muted">{patient.age} yrs · {patient.reason || 'General consultation'}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={pm.variant}>{pm.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" /> {patient.waiting_since}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className={startButtonClass}
            onClick={() => onStart(patient)}
            disabled={isStarting || isActive}
          >
            {isStarting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {isActive ? 'Active' : 'Start'}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-text-muted hover:text-text-primary" onClick={() => onView(patient)}>
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export default function DoctorDashboard() {
  const { user, demoMode } = useAuth()
  const navigate = useNavigate()
  const name = user?.name || 'Doctor'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const [doctor, setDoctor] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [pendingAppointments, setPendingAppointments] = useState([])
  const [approvingApptId, setApprovingApptId] = useState(null)
  const [queue, setQueue] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [pendingReferrals, setPendingReferrals] = useState(0)
  const [emergencyCount, setEmergencyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePatient, setActivePatient] = useState(null)
  const [startingId, setStartingId] = useState(null)
  const [, setClockTick] = useState(0)
  const isDoctorSession = user?.role === 'doctor' && !demoMode && user?.id && !String(user.id).endsWith('-demo')

  const loadDashboard = useCallback(async () => {
    setError('')

    try {
      // 1. Fetch pending appointments from unified service
      const allAppts = await appointmentService.getAll().catch(() => [])
      const pendingList = allAppts.filter(a => a.status === 'pending')
      setPendingAppointments(pendingList)

      if (!isDoctorSession) {
        setDoctor({
          id: 'd-demo',
          specialization: 'General Physician',
          is_available: true,
          facilities: { name: 'PHC Khandwa', type: 'PHC' }
        })
        setAppointments(allAppts.filter(a => a.status !== 'cancelled'))
        setQueue([])
        setFollowUps([])
        setPendingReferrals(0)
        setEmergencyCount(0)
        setLoading(false)
        return
      }

      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select(`
          id, facility_id, specialization, is_available,
          facilities:facility_id (id, name, type)
        `)
        .eq('profile_id', user.id)
        .single()

      if (doctorError) throw doctorError
      setDoctor(doctorData)

      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)

      const [appointmentsResult, queueResult, followUpsResult, referralsResult, emergenciesResult] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            id, scheduled_at, status, reason, mode,
            patients:patient_id (
              id, patient_code, dob, is_high_risk,
              profiles:profile_id (full_name, phone)
            )
          `)
          .eq('doctor_id', doctorData.id)
          .gte('scheduled_at', start.toISOString())
          .lt('scheduled_at', end.toISOString())
          .order('scheduled_at', { ascending: true }),

        supabase
          .from('queues')
          .select(`
            id, queue_number, position, status, called_at, started_at, created_at,
            appointments:appointment_id (
              id, doctor_id, status, reason, scheduled_at,
              patients:patient_id (
                id, patient_code, dob, is_high_risk,
                profiles:profile_id (full_name, phone)
              )
            )
          `)
          .eq('facility_id', doctorData.facility_id)
          .gte('created_at', start.toISOString())
          .in('status', ['waiting', 'in_consultation', 'emergency'])
          .order('position', { ascending: true }),

        supabase
          .from('follow_ups')
          .select('id, status, next_due')
          .eq('doctor_id', doctorData.id)
          .in('status', ['on_track', 'due_soon', 'overdue']),

        supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referring_doctor', doctorData.id)
          .in('status', ['created', 'pending']),

        supabase
          .from('emergency_cases')
          .select('id', { count: 'exact', head: true })
          .eq('facility_id', doctorData.facility_id)
          .in('status', ['active', 'escalated']),
      ])

      if (appointmentsResult.error) throw appointmentsResult.error
      if (queueResult.error) throw queueResult.error
      if (followUpsResult.error) throw followUpsResult.error
      if (referralsResult.error) throw referralsResult.error
      if (emergenciesResult.error) throw emergenciesResult.error

      setAppointments(appointmentsResult.data || [])
      setQueue((queueResult.data || []).filter(item => item.appointments?.doctor_id === doctorData.id))
      setFollowUps(followUpsResult.data || [])
      setPendingReferrals(referralsResult.count || 0)
      setEmergencyCount(emergenciesResult.count || 0)
    } catch (err) {
      console.error('Doctor dashboard load failed:', err)
      setError(err?.message || 'Unable to load live dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [isDoctorSession, user?.id])

  useEffect(() => {
    if (!user || user.role === 'doctor') return
    navigate(`/${user.role}`, { replace: true })
  }, [navigate, user])

  useEffect(() => {
    setLoading(true)
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const timer = setInterval(() => setClockTick(tick => tick + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!doctor?.id || !doctor?.facility_id || !isDoctorSession) return undefined

    const channel = supabase
      .channel(`doctor-dashboard:${doctor.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doctor.id}`,
      }, loadDashboard)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queues', filter: `facility_id=eq.${doctor.facility_id}`,
      }, loadDashboard)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'follow_ups', filter: `doctor_id=eq.${doctor.id}`,
      }, loadDashboard)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'referrals', filter: `referring_doctor=eq.${doctor.id}`,
      }, loadDashboard)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'emergency_cases', filter: `facility_id=eq.${doctor.facility_id}`,
      }, loadDashboard)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [doctor?.id, doctor?.facility_id, isDoctorSession, loadDashboard])

  const queuePatients = queue.map(item => {
    const appointment = item.appointments
    const patient = appointment?.patients

    let priority = 'low'
    if (item.status === 'emergency') priority = 'emergency'
    else if (patient?.is_high_risk) priority = 'high'

    return {
      id: item.id,
      appointment_id: appointment?.id,
      patient_id: patient?.id,
      queue_no: item.queue_number,
      queue_status: item.status,
      name: patient?.profiles?.full_name || 'Patient',
      age: getAge(patient?.dob),
      reason: appointment?.reason,
      priority,
      waiting_since: getWaitingTime(item.created_at, item.status),
    }
  })

  const stats = useMemo(() => ({
    totalToday: appointments.length,
    waiting: queue.filter(item => item.status === 'waiting' || item.status === 'emergency').length,
    completed: appointments.filter(item => item.status === 'completed').length,
    highRisk: appointments.filter(item => item.patients?.is_high_risk).length,
    emergency: emergencyCount + queue.filter(item => item.status === 'emergency').length,
    followUps: followUps.length,
  }), [appointments, queue, emergencyCount, followUps])

  async function handleStart(patient) {
    if (!patient?.id || !patient?.appointment_id) return
    setStartingId(patient.id)
    setError('')

    try {
      await Promise.all([
        updateQueueStatus(patient.id, 'in_consultation'),
        updateAppointmentStatus(patient.appointment_id, 'in_progress'),
      ])
      setActivePatient({ ...patient, queue_status: 'in_consultation' })
      await loadDashboard()
    } catch (err) {
      console.error('Unable to start consultation:', err)
      setError(err?.message || 'Unable to start consultation.')
    } finally {
      setStartingId(null)
    }
  }

  async function toggleAvailability() {
    if (!doctor?.id || !isDoctorSession) return
    try {
      const updated = await updateDoctorAvailability(doctor.id, !doctor.is_available)
      setDoctor(prev => ({ ...prev, is_available: updated.is_available }))
    } catch (err) {
      setError(err.message || 'Unable to update availability.')
    }
  }

  function handleView(patient) {
    if (patient?.patient_id) navigate(`/doctor/patients?id=${patient.patient_id}`)
    else navigate('/doctor/patients')
  }

  async function handleApproveAppointment(apptId) {
    setApprovingApptId(apptId)
    setError('')
    try {
      await appointmentService.approve(apptId)
      setPendingAppointments(prev => prev.filter(a => (a.id || a._id) !== apptId))
      await loadDashboard()
    } catch (err) {
      console.error('Failed to approve appointment:', err)
      setError(err?.message || 'Failed to approve appointment.')
    } finally {
      setApprovingApptId(null)
    }
  }

  async function handleDeclineAppointment(apptId) {
    if (!window.confirm('Are you sure you want to decline this appointment request?')) return
    try {
      await appointmentService.cancel(apptId)
      setPendingAppointments(prev => prev.filter(a => (a.id || a._id) !== apptId))
      await loadDashboard()
    } catch (err) {
      console.error('Failed to decline appointment:', err)
      setError(err?.message || 'Failed to decline appointment.')
    }
  }

  const facilityName = doctor?.facilities?.name || 'Assigned Facility'

  return (
    <AppLayout role="doctor">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{greeting}, {name} 👋</h1>
            <p className="text-text-muted text-sm">{facilityName} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAvailability}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${doctor?.is_available ? 'bg-status-success-bg border-status-success/20 text-status-success hover:bg-status-success-bg/80' : 'bg-canvas border-border-subtle text-text-muted hover:bg-surface-elevated'}`}
            >
              <span className={`w-2 h-2 rounded-full ${doctor?.is_available ? 'bg-status-success animate-pulse' : 'bg-text-muted'}`} />
              {doctor?.is_available ? 'Clinic Open' : 'Clinic Closed'}
            </button>
          </div>
        </div>

        {demoMode && (
          <Alert type="info" title="Sign in with the seeded doctor account">
            Doctor data is loaded from Supabase, and Demo Mode does not create a live Supabase doctor session. Sign out, choose Doctor, then use email login to view the seeded appointments and queue.
          </Alert>
        )}

        {error && (
          <Alert type="critical" title="Dashboard data could not be refreshed">
            {error}
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Total Today" value={loading ? '—' : stats.totalToday} icon={Users} color="navy" />
          <KPICard title="Waiting" value={loading ? '—' : stats.waiting} icon={Clock} color="warning" />
          <KPICard title="Completed" value={loading ? '—' : stats.completed} icon={CheckCircle2} color="success" />
          <KPICard title="High Risk" value={loading ? '—' : stats.highRisk} icon={AlertCircle} color="critical" />
          <KPICard title="Emergency" value={loading ? '—' : stats.emergency} icon={AlertCircle} color="teal" />
          {/* <KPICard title="Follow-ups" value={loading ? '—' : stats.followUps} icon={Stethoscope} color="blue" /> */}
        </div>

        {/* Active consultation */}
        {activePatient && (
          <Alert type="info" title={`Active Consultation: ${activePatient.name}`}>
            {activePatient.age} yrs — {activePatient.reason || 'General consultation'} — Queue: {activePatient.queue_no}
          </Alert>
        )}

        {/* Pending Appointment Requests */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">Pending Appointment Requests</h2>
              {pendingAppointments.length > 0 && (
                <Badge variant="warning" className="text-xs font-bold px-2 py-0.5">
                  {pendingAppointments.length} Awaiting Approval
                </Badge>
              )}
            </div>
            <span className="text-xs text-text-muted hidden sm:inline">
              Appointments become confirmed only when approved by the doctor
            </span>
          </div>

          {pendingAppointments.length === 0 ? (
            <div className="bg-surface-elevated rounded-xl border border-border-subtle p-5 text-center text-sm text-text-muted">
              <CheckCircle2 className="w-6 h-6 text-status-success mx-auto mb-1.5 opacity-80" />
              <p className="font-medium text-text-primary text-xs">All appointment requests are reviewed</p>
              <p className="text-[11px] text-text-muted mt-0.5">Any newly booked patient appointment with status 'Pending' will appear here for your confirmation.</p>
            </div>
          ) : (
            <div className="bg-surface-elevated rounded-xl border border-border-subtle overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-canvas border-b border-border-subtle text-text-muted uppercase tracking-wider text-[11px]">
                      <th className="px-4 py-2.5 text-left">Queue / Mode</th>
                      <th className="px-4 py-2.5 text-left">Patient</th>
                      <th className="px-4 py-2.5 text-left">Requested Schedule</th>
                      <th className="px-4 py-2.5 text-left">Clinical Reason / Notes</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {pendingAppointments.map(appt => {
                      const apptId = appt.id || appt._id
                      const patientName = appt.patients?.profiles?.full_name || appt.patientName || appt.patient || 'Patient'
                      const dateDisplay = appt.date || (appt.scheduled_at ? new Date(appt.scheduled_at).toISOString().split('T')[0] : 'Upcoming')
                      const timeDisplay = appt.time || appt.timeSlot || (appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '10:00')

                      return (
                        <tr key={apptId} className="hover:bg-bg transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono font-bold text-brand-default">{appt.queueNo || appt.queue_no || 'A-01'}</span>
                              <span className="text-[10px] text-text-muted capitalize">{appt.consultationType || appt.mode || 'In-Person'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-text-primary">{patientName}</p>
                            <p className="text-[11px] text-text-muted">{appt.type || 'OPD Consultation'}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-medium text-text-primary flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-brand-default" /> {dateDisplay}
                            </span>
                            <span className="text-text-muted text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {timeDisplay}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="truncate text-text-secondary" title={appt.symptoms || appt.reason}>
                              {appt.symptoms || appt.reason || 'General Health Review'}
                            </p>
                            {appt.referralId && (
                              <span className="inline-block mt-0.5 text-[10px] text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                Referral Token #{appt.referralId}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 flex items-center gap-1 shadow-xs cursor-pointer"
                                loading={approvingApptId === apptId}
                                onClick={() => handleApproveAppointment(apptId)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-critical border-critical/30 hover:bg-critical/10 text-xs h-7 px-2"
                                onClick={() => handleDeclineAppointment(apptId)}
                              >
                                Decline
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Today's Queue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-primary">Today's Queue</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{loading ? 'Loading...' : `${queuePatients.length} patients waiting`}</span>
              <Button size="sm" variant="outline" onClick={() => navigate('/doctor/queue')}>Full Queue View</Button>
            </div>
          </div>

          <div className="bg-surface-elevated rounded-xl border border-border-subtle overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-canvas border-b border-border-subtle">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Queue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Waiting</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-10 text-center text-sm text-text-muted">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading today's live queue...
                      </td>
                    </tr>
                  ) : queuePatients.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-10 text-center text-sm text-text-muted">
                        No patients are currently waiting in your queue.
                      </td>
                    </tr>
                  ) : (
                    queuePatients.map(patient => (
                      <PatientQueueRow
                        key={patient.id}
                        patient={patient}
                        onStart={handleStart}
                        onView={handleView}
                        startingId={startingId}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick action grid */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: 'Manage Queue', desc: 'Call, skip, complete patients', icon: Users, href: '/doctor/queue', color: 'teal' },
            { title: 'Patient Records', desc: 'View full clinical histories', icon: FileText, href: '/doctor/patients', color: 'blue' },
            { title: 'Pending Referrals', desc: `${pendingReferrals} referrals awaiting action`, icon: CheckCircle2, href: '/doctor/referrals', color: 'warning' },
          ].map(action => (
            <button key={action.title} onClick={() => navigate(action.href)}
              className="flex items-center gap-4 p-4 bg-surface-elevated rounded-xl border border-border-subtle hover:shadow-md hover:-translate-y-0.5 transition-all text-left">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${action.color === 'teal' ? 'bg-subtle text-brand-default' : action.color === 'blue' ? 'bg-brand-secondary-light text-brand-secondary' : 'bg-status-warning-bg text-status-warning'}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm">{action.title}</p>
                <p className="text-xs text-text-muted">{action.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted ml-auto" />
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
