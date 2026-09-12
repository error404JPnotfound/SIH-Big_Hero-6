import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Tabs, useTabs } from '../../components/ui/Tabs'
import { Timeline, Alert } from '../../components/ui/Misc'
import { getDoctorPatients } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import { getPatientProfileById } from '../../lib/db'
import { Heart, Droplets, Weight, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'

function getAge(dob) {
  if (!dob) return '—'
  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return '—'
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

export default function PatientProfile() {
  const [searchParams, setSearchParams] = useSearchParams()
  const patientId = searchParams.get('id')
  const navigate = useNavigate()
  const { user, demoMode } = useAuth()

  const [tab, setTab] = useTabs('overview')
  const [loading, setLoading] = useState(!!patientId && !demoMode)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const [patients, setPatients] = useState([])
  useEffect(() => {
    let cancelled = false
    setData(null)
    setError('')
    setLoading(true)
    async function load() {
      try {
        if (!user?.id || demoMode) return
        if (patientId) {
          const result = await getPatientProfileById(patientId)
          if (!cancelled) setData(result)
        } else {
          const result = await getDoctorPatients(user.id)
          if (!cancelled) setPatients(result)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load patient records.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [patientId, demoMode, user?.id])

  // Extract patient info
  const patientInfo = data?.patient ? {
    name: data.patient.profiles?.full_name || 'Patient Profile',
    id: data.patient.patient_code || 'ID Unavailable',
    age: getAge(data.patient.dob),
    gender: data.patient.gender || 'Not specified',
    is_high_risk: data.patient.is_high_risk,
    allergies: data.patient.allergies || [],
    conditions: [...new Set((data.diagnoses || []).map(d => d.description))],
  } : { name: '', conditions: [], allergies: [] }

  const latestVitals = data?.vitals?.[0]
  const vitalsGrid = [
    {
      icon: Heart,
      label: 'Blood Pressure',
      value: latestVitals?.bp_systolic && latestVitals?.bp_diastolic ? `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}` : '—',
      unit: 'mmHg',
      color: 'text-critical',
      bg: 'bg-critical-bg'
    },
    {
      icon: Droplets,
      label: 'Blood Sugar',
      value: latestVitals?.blood_sugar ? `${latestVitals.blood_sugar}` : '—',
      unit: 'mg/dL',
      color: 'text-warning',
      bg: 'bg-warning-bg'
    },
    {
      icon: Weight,
      label: 'Weight',
      value: latestVitals?.weight ? `${latestVitals.weight}` : '—',
      unit: 'kg',
      color: 'text-blue',
      bg: 'bg-blue-light'
    },
    {
      icon: TrendingUp,
      label: 'Heart Rate',
      value: latestVitals?.heart_rate ? `${latestVitals.heart_rate}` : '—',
      unit: 'bpm',
      color: 'text-success',
      bg: 'bg-success-bg'
    },
  ]

  const activeMedications = data?.prescriptions?.flatMap(p =>
    (p.prescription_items || []).map(i => ({
      name: i.medicine_name,
      dosage: `${i.dosage || ''} ${i.frequency || ''}`.trim() || 'As directed',
    }))
  ) || []

  const timelineItems = data?.appointments?.length ? data.appointments.map(a => ({
    title: `${a.reason || 'Consultation'} — Status: ${a.status}`,
    subtitle: `${a.doctors?.profiles?.full_name || 'Doctor'} · ${a.facilities?.name || 'Facility'}`,
    date: new Date(a.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    color: a.status === 'completed' ? 'bg-teal border-teal' : 'bg-blue border-blue',
  })) : []

  const referralsList = data?.referrals?.length ? data.referrals.map(r => ({
    id: r.id,
    dept: r.department || 'General',
    to: r.to_facility?.name || 'Referred Facility',
    reason: r.reason,
    date: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    status: r.status,
  })) : []

  const diagnosticsList = data?.diagnostics?.length ? data.diagnostics.map(dx => ({
    id: dx.id,
    name: dx.test_name,
    facility: dx.facilities?.name || 'Facility Lab',
    date: new Date(dx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    status: dx.status,
  })) : []

  return (
    <AppLayout role="doctor">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {error && <Alert type="critical" title="Error">{error}</Alert>}

        {loading ? (
          <div className="bg-navy rounded-2xl p-12 text-center text-white">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>Loading patient records...</p>
          </div>
        ) : !data ? (
          <div className="bg-surface rounded-xl border border-border p-6 space-y-3">
            <h1 className="text-xl font-bold text-navy">Patient Records</h1>
            {demoMode ? <p>Sign in with a Supabase doctor account to view patient records.</p> : patientId ? <p>Patient record unavailable.</p> : <>
              <p className="text-muted">Select a patient from your appointments.</p>
              {patients.length === 0 && <p>No patients assigned to you yet.</p>}
              {patients.map(p => <button key={p.id} className="block w-full text-left border border-border rounded-lg p-3" onClick={() => setSearchParams({ id: p.id })}>
                {p.profiles?.full_name || 'Patient'} · {p.patient_code}
              </button>)}
            </>}
            <Button variant="outline" onClick={() => patientId ? setSearchParams({}) : navigate('/doctor/queue')}>{patientId ? 'All Patients' : 'View Queue'}</Button>
          </div>
        ) : (
          <>
            {/* Patient header */}
            <div className="bg-navy rounded-2xl p-6 flex items-start gap-5 flex-wrap sm:flex-nowrap">
              <div className="w-16 h-16 rounded-2xl bg-teal flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {patientInfo.name?.[0] || 'P'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-surface">{patientInfo.name}</h1>
                  <Badge variant="default">{patientInfo.id}</Badge>
                  {patientInfo.is_high_risk && (
                    <Badge variant="critical"><AlertTriangle className="w-3 h-3" /> High Risk</Badge>
                  )}
                </div>
                <p className="text-surface/60 text-sm mt-1">{patientInfo.age} yrs · {patientInfo.gender}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {patientInfo.conditions.map(c => <Badge key={c} variant="warning">{c}</Badge>)}
                  {patientInfo.allergies.map(a => <Badge key={a} variant="critical">⚠ Allergy: {a}</Badge>)}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" className="bg-teal text-white" onClick={() => navigate('/doctor/queue')}>
                  Start Consultation
                </Button>
              </div>
            </div>

            {/* Vitals */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {vitalsGrid.map(v => (
                <div key={v.label} className={`rounded-xl border border-border p-4 ${v.bg}`}>
                  <v.icon className={`w-5 h-5 mb-2 ${v.color}`} />
                  <p className="text-xs text-muted">{v.label}</p>
                  <p className={`text-xl font-bold ${v.color}`}>{v.value}<span className="text-xs font-normal ml-1 text-muted">{v.unit}</span></p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'timeline', label: 'History Timeline' },
                { id: 'referrals', label: 'Referrals' },
                { id: 'diagnostics', label: 'Diagnostics' },
              ]}
              activeTab={tab}
              onChange={setTab}
            />

            {tab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-surface rounded-xl border border-border p-5">
                  <h3 className="font-semibold text-navy mb-3">Prescription History</h3>
                  {activeMedications.length === 0 ? (
                    <p className="text-xs text-muted">No prescriptions recorded.</p>
                  ) : (
                    activeMedications.map((m, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                        <span className="font-medium text-navy">{m.name}</span>
                        <span className="text-muted">{m.dosage}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="bg-surface rounded-xl border border-border p-5">
                  <h3 className="font-semibold text-navy mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/doctor/queue')}>
                      New Consultation / Prescription
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/doctor/queue')}>
                      Request Diagnostic
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/doctor/queue')}>
                      Create Referral
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'timeline' && (
              <div className="bg-surface rounded-xl border border-border p-6">
                {timelineItems.length ? <Timeline items={timelineItems} /> : <p>No appointment history recorded.</p>}
              </div>
            )}

            {tab === 'referrals' && (
              <div className="space-y-3">
                {referralsList.length === 0 ? (
                  <p className="text-sm text-muted p-4">No referrals found.</p>
                ) : (
                  referralsList.map(r => (
                    <div key={r.id} className="bg-surface rounded-xl border border-border p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-navy text-sm">{r.dept} — {r.to}</p>
                        <p className="text-xs text-muted">{r.reason} · {r.date}</p>
                      </div>
                      <Badge variant={r.status === 'completed' ? 'outline' : 'success'}>{r.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'diagnostics' && (
              <div className="space-y-3">
                {diagnosticsList.length === 0 ? (
                  <p className="text-sm text-muted p-4">No diagnostic tests found.</p>
                ) : (
                  diagnosticsList.map(dx => (
                    <div key={dx.id} className="bg-surface rounded-xl border border-border p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-navy text-sm">{dx.name}</p>
                        <p className="text-xs text-muted">{dx.facility} · {dx.date}</p>
                      </div>
                      <Badge variant={dx.status === 'result_ready' ? 'success' : 'warning'}>{String(dx.status).replace(/_/g,' ')}</Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
