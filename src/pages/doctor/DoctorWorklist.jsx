import { RecordEditor } from '../../components/RecordEditor'
import { saveDiagnostic, saveFollowUp, followUpFields } from '../../lib/clinicalUpdates'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Misc'
import { useAuth } from '../../context/AuthContext'
import { getDoctorClinicalWorklists } from '../../lib/db'
import { Activity, ClipboardList, FileText, Loader2, RefreshCw, Stethoscope } from 'lucide-react'

const CONFIG = {
  referrals: {
    title: 'Referrals',
    subtitle: 'Track patients referred for specialist or facility care.',
    icon: Stethoscope,
    empty: 'No referrals found for this doctor.',
  },
  diagnostics: {
    title: 'Diagnostics',
    subtitle: 'Review diagnostic requests and test results.',
    icon: Activity,
    empty: 'No diagnostic requests found for this doctor.',
  },
  prescriptions: {
    title: 'Prescriptions',
    subtitle: 'View prescriptions issued during consultations.',
    icon: FileText,
    empty: 'No prescriptions found for this doctor.',
  },
  followUps: {
    title: 'Follow-ups',
    subtitle: 'Monitor due and overdue patient follow-ups.',
    icon: ClipboardList,
    empty: 'No follow-ups found for this doctor.',
  },
}

function patientName(row) {
  return row.patients?.profiles?.full_name || 'Patient'
}

function patientMeta(row) {
  return [row.patients?.patient_code, row.patients?.profiles?.phone].filter(Boolean).join(' · ')
}

function formatDate(value) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusVariant(status) {
  if (['completed', 'result_ready', 'on_track'].includes(status)) return 'success'
  if (['urgent', 'overdue', 'emergency'].includes(status)) return 'critical'
  if (['pending', 'scheduled', 'due_soon', 'created'].includes(status)) return 'warning'
  return 'outline'
}

function WorklistCard({ type, row, onPatient }) {
  if (type === 'referrals') {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-subtle p-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary">{patientName(row)}</p>
          <p className="text-xs text-text-muted mt-0.5">{patientMeta(row) || 'Patient details unavailable'}</p>
          <p className="text-sm text-text-primary mt-3">{row.department || 'General'} · {row.to_facility?.name || 'Referred facility'}</p>
          <p className="text-sm text-text-muted mt-1">{row.reason || 'No reason recorded'}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <Badge variant={statusVariant(row.urgency)}>{row.urgency || 'routine'}</Badge>
          <Badge variant={statusVariant(row.status)}>{row.status || 'pending'}</Badge>
          <Button size="sm" variant="outline" onClick={() => onPatient(row.patients?.id)}>View Patient</Button>
        </div>
      </div>
    )
  }

  if (type === 'diagnostics') {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-subtle p-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary">{row.test_name}</p>
          <p className="text-xs text-text-muted mt-0.5">{patientName(row)} · {patientMeta(row) || 'Patient details unavailable'}</p>
          <p className="text-sm text-text-muted mt-3">{row.facilities?.name || 'Facility'} · {formatDate(row.scheduled_at || row.created_at)}</p>
          {row.result_notes && <p className="text-sm text-text-primary mt-1">{row.result_notes}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <Badge variant={statusVariant(row.status)}>{String(row.status || 'scheduled').replace(/_/g, ' ')}</Badge>
          <Button size="sm" variant="outline" onClick={() => onPatient(row.patients?.id)}>View Patient</Button>
        </div>
      </div>
    )
  }

  if (type === 'prescriptions') {
    const items = row.prescription_items || []
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-subtle p-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary">{patientName(row)}</p>
          <p className="text-xs text-text-muted mt-0.5">{patientMeta(row) || 'Patient details unavailable'} · {formatDate(row.issued_at)}</p>
          <div className="mt-3 space-y-1">
            {items.length ? items.map(item => (
              <p key={item.id} className="text-sm text-text-muted">
                <span className="font-medium text-text-primary">{item.medicine_name}</span>
                {item.dosage ? ` · ${item.dosage}` : ''}{item.frequency ? ` · ${item.frequency}` : ''}
              </p>
            )) : <p className="text-sm text-text-muted">No medicines recorded.</p>}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onPatient(row.patients?.id)}>View Patient</Button>
      </div>
    )
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-subtle p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-text-primary">{patientName(row)}</p>
        <p className="text-xs text-text-muted mt-0.5">{patientMeta(row) || 'Patient details unavailable'}</p>
        <p className="text-sm text-text-primary mt-3">{row.category || 'Follow-up'} · Due {formatDate(row.next_due)}</p>
        <p className="text-sm text-text-muted mt-1">{row.notes || 'No notes recorded'}</p>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <Badge variant={statusVariant(row.risk_level)}>{row.risk_level || 'low'} risk</Badge>
        <Badge variant={statusVariant(row.status)}>{String(row.status || 'due').replace(/_/g, ' ')}</Badge>
        <Button size="sm" variant="outline" onClick={() => onPatient(row.patients?.id)}>View Patient</Button>
      </div>
    </div>
  )
}

export default function DoctorWorklist({ type }) {
  const { user, demoMode } = useAuth()
  const navigate = useNavigate()
  const config = CONFIG[type] || CONFIG.referrals
  const Icon = config.icon
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [data, setData] = useState({ referrals: [], diagnostics: [], prescriptions: [], followUps: [] })
  const isDoctorSession = user?.role === 'doctor' && !demoMode && user?.id && !String(user.id).endsWith('-demo')

  const load = useCallback(async () => {
    if (!isDoctorSession) {
      setData({ referrals: [], diagnostics: [], prescriptions: [], followUps: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setData(await getDoctorClinicalWorklists(user.id))
    } catch (err) {
      console.error('Doctor worklist load failed:', err)
      setError(err.message || 'Unable to load doctor data.')
    } finally {
      setLoading(false)
    }
  }, [isDoctorSession, user?.id])

  useEffect(() => {
    if (!user || user.role === 'doctor') return
    navigate(`/${user.role}`, { replace: true })
  }, [navigate, user])

  useEffect(() => {
    load()
    const timer = setInterval(load, 15000)
    window.addEventListener('focus', load)
    return () => { clearInterval(timer); window.removeEventListener('focus', load) }
  }, [load])

  const rows = useMemo(() => data[type] || [], [data, type])
  const onPatient = patientId => {
    if (patientId) navigate(`/doctor/patients?id=${patientId}`)
  }

  return (
    <AppLayout role="doctor">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-subtle text-brand-default flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{config.title}</h1>
              <p className="text-text-muted text-sm">{config.subtitle}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
        </div>

        {demoMode && (
          <Alert type="info" title="Sign in with the seeded doctor account">
            Doctor worklists are loaded from Supabase. Sign out and use Doctor email login to view seeded records.
          </Alert>
        )}
        {error && <Alert type="critical" title="Unable to load this page">{error}</Alert>}

        <div className="bg-surface-elevated rounded-xl border border-border-subtle p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-text-primary">{config.title}</p>
            <Badge variant="outline">{loading ? 'Loading' : `${rows.length} records`}</Badge>
          </div>

          {loading ? (
            <div className="py-16 text-center text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading {config.title.toLowerCase()}...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-text-muted">{config.empty}</p>
          ) : (
            <div className="space-y-3">
              {rows.map(row => <div key={row.id}><WorklistCard type={type} row={row} onPatient={onPatient} />{['diagnostics','followUps'].includes(type) && <Button variant="outline" size="sm" className="mt-2" onClick={() => setEditing(row)}>{type === 'diagnostics' ? 'Update Result' : 'Update Follow-up'}</Button>}</div>)}
            </div>
          )}
        </div>
      </div>
      {editing && <RecordEditor key={editing.id} title={type === 'diagnostics' ? 'Update Diagnostic Result' : 'Update Follow-up'} initial={editing} fields={type === 'diagnostics' ? [{name:'status',label:'Status',options:['requested','scheduled','sample_collected','processing','result_ready','reviewed']},{name:'result_notes',label:'Result notes'}] : followUpFields} onClose={() => setEditing(null)} onSave={async values => { await (type === 'diagnostics' ? saveDiagnostic(editing.id, values) : saveFollowUp(editing.id, values)); await load() }} />}
    </AppLayout>
  )
}
