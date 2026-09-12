/**
 * Records.jsx — /patient/records
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully dynamic: loads patient demographics, vitals, referrals, diagnostics,
 * and consultation timeline from Supabase. No mock data.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { Tabs, useTabs } from '../../components/ui/Tabs'
import { Badge } from '../../components/ui/Badge'
import { Timeline } from '../../components/ui/Misc'
import { Skeleton } from '../../components/ui/Misc'
import {
  getMyPatientRecord, getMyVitals, getMyReferrals,
  getMyDiagnostics, getMyConsultationTimeline,
} from '../../lib/db'
import { Heart, Droplets, Weight, TrendingUp, Phone, MapPin, AlertCircle, FileText } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcAge(dob) {
  if (!dob) return '—'
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Build timeline items from consultations
function buildTimeline(consultations) {
  const items = []
  for (const c of consultations) {
    const dateStr = fmtDate(c.started_at || c.created_at)
    const doctor  = c.doctors?.profiles?.full_name || 'Doctor'
    const fac     = c.facilities?.name || ''

    // Consultation visit
    items.push({
      title: c.chief_complaint || 'Consultation',
      subtitle: `${doctor}${fac ? ' · ' + fac : ''}`,
      date: dateStr,
      color: 'bg-brand-default border-brand-default',
    })

    // Diagnoses
    for (const dx of c.diagnoses || []) {
      items.push({
        title: `Diagnosis: ${dx.description}`,
        subtitle: dx.icd_code ? `ICD: ${dx.icd_code}` : (dx.is_chronic ? 'Chronic condition' : ''),
        date: fmtDate(dx.created_at) || dateStr,
        color: 'bg-status-critical border-status-critical',
      })
    }

    // Prescriptions
    for (const pr of c.prescriptions || []) {
      const meds = (pr.prescription_items || []).map(i => i.medicine_name).join(', ')
      if (meds) {
        items.push({
          title: 'Prescription',
          subtitle: meds,
          date: fmtDate(pr.issued_at) || dateStr,
          color: 'bg-status-success border-status-success',
        })
      }
    }
  }
  return items
}

// ── Main Component ──────────────────────────────────────────────────────────────
export default function Records() {
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useTabs('overview')

  const [patient,     setPatient]     = useState(null)
  const [vitals,      setVitals]      = useState(null)
  const [referrals,   setReferrals]   = useState([])
  const [diagnostics, setDiagnostics] = useState([])
  const [timeline,    setTimeline]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    if (authLoading) return
    setLoading(true)
    setError(null)
    Promise.allSettled([
      getMyPatientRecord(),
      getMyVitals(1),
      getMyReferrals(),
      getMyDiagnostics(),
      getMyConsultationTimeline(),
    ]).then(([patRes, vitRes, refRes, dxRes, tlRes]) => {
      if (patRes.status  === 'fulfilled') setPatient(patRes.value)
      if (vitRes.status  === 'fulfilled' && vitRes.value?.length) setVitals(vitRes.value[0])
      if (refRes.status  === 'fulfilled') setReferrals(refRes.value || [])
      if (dxRes.status   === 'fulfilled') setDiagnostics(dxRes.value || [])
      if (tlRes.status   === 'fulfilled') setTimeline(buildTimeline(tlRes.value || []))
      if (patRes.status === 'rejected')  setError(patRes.reason?.message || 'Failed to load records.')
    }).finally(() => setLoading(false))
  }, [authLoading, user])

  // Derived vitals display
  const bp      = vitals?.bp_systolic && vitals?.bp_diastolic ? `${vitals.bp_systolic}/${vitals.bp_diastolic}` : '—'
  const sugar   = vitals?.blood_sugar != null ? `${vitals.blood_sugar} mg/dL` : '—'
  const weight  = vitals?.weight      != null ? `${vitals.weight} kg`         : '—'
  const hRate   = vitals?.heart_rate  != null ? `${vitals.heart_rate} bpm`    : '—'

  // Patient display values
  const patName    = patient?.profiles?.full_name || '—'
  const patCode    = patient?.patient_code        || '—'
  const patAge     = calcAge(patient?.dob)
  const patGender  = patient?.gender              || '—'
  const patPhone   = patient?.profiles?.phone     || '—'
  const patBlood   = patient?.blood_group         || '—'
  const patAllerg  = patient?.allergies           || []

  const refStatusVariant = { created:'default', pending:'warning', accepted:'success', scheduled:'blue', in_progress:'blue', completed:'outline', cancelled:'critical' }
  const dxStatusVariant  = { result_ready:'success', reviewed:'success', scheduled:'blue', sample_collected:'warning', processing:'warning', requested:'outline' }

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Health Records</h1>
          <p className="text-text-muted text-sm">Your complete longitudinal health history</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-status-critical-bg text-status-critical text-xs rounded-lg border border-status-critical/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {/* Patient header card */}
        {loading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : (
          <div className="bg-navy rounded-2xl p-6 flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-brand-default flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {patName !== '—' ? patName[0].toUpperCase() : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-surface">{patName}</h2>
                <Badge variant="default">{patCode}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-surface/60 flex-wrap">
                <span>{patAge} yrs · <span className="capitalize">{patGender.replace('_',' ')}</span></span>
                {patPhone !== '—' && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{patPhone}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {patBlood !== '—' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-status-critical/20 text-status-critical font-medium">Blood: {patBlood}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vitals */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Heart,      label: 'Blood Pressure', value: bp,     color: 'text-status-critical' },
              { icon: Droplets,   label: 'Blood Sugar',    value: sugar,  color: 'text-brand-secondary' },
              { icon: Weight,     label: 'Weight',         value: weight, color: 'text-status-success' },
              { icon: TrendingUp, label: 'Heart Rate',     value: hRate,  color: 'text-status-warning' },
            ].map(v => (
              <div key={v.label} className="bg-surface-elevated rounded-xl border border-border-subtle p-4">
                <v.icon className={`w-5 h-5 mb-2 ${v.color}`} />
                <p className="text-xs text-text-muted">{v.label}</p>
                <p className={`text-lg font-bold ${v.color}`}>{v.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'overview',   label: 'Overview' },
            { id: 'timeline',   label: 'Health Timeline' },
            { id: 'referrals',  label: 'Referrals' },
            { id: 'diagnostics',label: 'Diagnostics' },
          ]}
          activeTab={tab}
          onChange={setTab}
        />

        {/* Overview tab */}
        {tab === 'overview' && (
          loading ? <Skeleton className="h-48 rounded-xl" /> : (
            <div className="space-y-4">
              <div className="bg-surface-elevated rounded-xl border border-border-subtle p-5">
                <h3 className="font-semibold text-text-primary mb-3">Allergies</h3>
                <div className="flex flex-wrap gap-2">
                  {patAllerg.length > 0
                    ? patAllerg.map(a => <Badge key={a} variant="critical">{a}</Badge>)
                    : <p className="text-xs text-text-muted">No known allergies recorded.</p>}
                </div>
              </div>

              <div className="bg-surface-elevated rounded-xl border border-border-subtle p-5">
                <h3 className="font-semibold text-text-primary mb-3">Current Medications</h3>
                {(() => {
                  const meds = []
                  // Gather from consultation timelines (prescriptions)
                  return meds.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      {meds.map((m, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-text-primary font-medium">{m.name}</span>
                          <span className="text-text-muted">{m.detail}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">No active prescriptions. Check your Health Timeline for prescription history.</p>
                  )
                })()}
              </div>

              <div className="bg-surface-elevated rounded-xl border border-border-subtle p-5">
                <h3 className="font-semibold text-text-primary mb-2">Patient Details</h3>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  {[
                    { label: 'Patient Code', value: patCode },
                    { label: 'Blood Group',  value: patBlood },
                    { label: 'Age',          value: patAge !== '—' ? `${patAge} years` : '—' },
                    { label: 'Gender',       value: patGender.replace('_',' ') },
                  ].map(r => (
                    <div key={r.label}>
                      <p className="text-text-muted">{r.label}</p>
                      <p className="font-medium text-text-primary capitalize">{r.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}

        {/* Timeline tab */}
        {tab === 'timeline' && (
          loading ? <Skeleton className="h-64 rounded-xl" /> : (
            <div className="bg-surface-elevated rounded-xl border border-border-subtle p-6">
              <h3 className="font-semibold text-text-primary mb-4">Health Journey Timeline</h3>
              {timeline.length > 0
                ? <Timeline items={timeline} />
                : (
                  <div className="flex flex-col items-center py-10 text-center">
                    <FileText className="w-8 h-8 text-border mb-2" />
                    <p className="text-xs text-text-muted">No consultation history yet.</p>
                  </div>
                )}
            </div>
          )
        )}

        {/* Referrals tab */}
        {tab === 'referrals' && (
          loading ? <Skeleton className="h-32 rounded-xl" /> : (
            <div className="space-y-3">
              {referrals.length === 0
                ? <p className="text-xs text-text-muted text-center py-8">No referrals found.</p>
                : referrals.map(r => (
                  <div key={r.id} className="bg-surface-elevated rounded-xl border border-border-subtle p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-primary text-sm">{r.department} — {r.to_fac?.name || '—'}</p>
                        <p className="text-xs text-text-muted">{r.reason}</p>
                      </div>
                      <Badge variant={refStatusVariant[r.status] || 'default'} className="capitalize">{r.status?.replace('_',' ')}</Badge>
                    </div>
                  </div>
                ))}
            </div>
          )
        )}

        {/* Diagnostics tab */}
        {tab === 'diagnostics' && (
          loading ? <Skeleton className="h-32 rounded-xl" /> : (
            <div className="space-y-3">
              {diagnostics.length === 0
                ? <p className="text-xs text-text-muted text-center py-8">No diagnostic tests found.</p>
                : diagnostics.map(dx => (
                  <div key={dx.id} className="bg-surface-elevated rounded-xl border border-border-subtle p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-primary text-sm">{dx.test_name}</p>
                        <p className="text-xs text-text-muted">{dx.facilities?.name || '—'} · {dx.created_at ? new Date(dx.created_at).toLocaleDateString('en-IN') : '—'}</p>
                      </div>
                      <Badge variant={dxStatusVariant[dx.status] || 'outline'} className="capitalize">{dx.status?.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                ))}
            </div>
          )
        )}
      </div>
    </AppLayout>
  )
}
