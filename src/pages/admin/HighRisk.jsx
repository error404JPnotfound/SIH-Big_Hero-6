import { useLiveRecords } from '../../hooks/useLiveRecords'
import { RecordDetails } from '../../components/RecordDetails'
import { RecordEditor } from '../../components/RecordEditor'
import { saveFollowUp, followUpFields } from '../../lib/clinicalUpdates'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/Misc'
import { useState } from 'react'
import { getHighRiskFollowUps } from '../../lib/db'
import { AlertCircle, Baby, Heart, Pill, Users, Filter } from 'lucide-react'

const RISK_META = {
  critical: { variant: 'critical' }, high: { variant: 'critical' },
  medium: { variant: 'warning' }, low: { variant: 'success' },
}

const STATUS_META = {
  overdue: { label: 'Overdue', color: 'text-status-critical bg-status-critical-bg' },
  due_soon: { label: 'Due Soon', color: 'text-status-warning bg-status-warning-bg' },
  on_track: { label: 'On Track', color: 'text-status-success bg-status-success-bg' },
}

const CATEGORIES = ['All', 'Maternal Health', 'Child Health', 'Diabetes', 'Hypertension', 'TB', 'Elderly Care']

export default function HighRisk() {
  const { data, loading, error } = useLiveRecords(getHighRiskFollowUps)
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const highRisk = data.map(hr => ({...hr, name:hr.patients?.profiles?.full_name || hr.patients?.patient_code || 'Unknown', age:hr.patients?.dob ? new Date().getFullYear()-new Date(hr.patients.dob).getFullYear() : 'Not recorded', risk:hr.risk_level, provider:hr.doctors?.profiles?.full_name || 'Unassigned'}))
  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">High-Risk Patients</h1>
            <p className="text-text-muted text-sm">Monitor and coordinate care for vulnerable patients</p>
          </div>
          <Button onClick={() => setOverdueOnly(v => !v)} aria-pressed={overdueOnly} variant="outline" size="sm"><Filter className="w-4 h-4" /> {overdueOnly ? 'Show all' : 'Overdue only'}</Button>
        </div>

        {error && <p role="alert" className="text-status-critical">{error}</p>}
        {loading && <p>Loading follow-ups…</p>}
        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button onClick={() => setCategory(c)} key={c} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${c === category ? 'bg-navy text-surface border-navy' : 'border-border-subtle text-text-muted hover:border-brand-default hover:text-brand-default'}`}>{c}</button>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Critical', value: highRisk.filter(p => p.risk === 'critical' || p.risk === 'high').length, icon: AlertCircle, color: 'text-status-critical bg-status-critical-bg' },
            { label: 'Overdue', value: highRisk.filter(p => p.status === 'overdue').length, icon: AlertCircle, color: 'text-status-warning bg-status-warning-bg' },
            { label: 'Due This Week', value: highRisk.filter(p => p.status === 'due_soon').length, icon: Heart, color: 'text-brand-secondary bg-brand-secondary-light' },
            { label: 'Total Monitored', value: highRisk.length, icon: Users, color: 'text-text-primary bg-navy/5' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-border-subtle p-4 flex items-center gap-3 ${s.color.split(' ')[1]}`}>
              <s.icon className={`w-6 h-6 flex-shrink-0 ${s.color.split(' ')[0]}`} />
              <div>
                <p className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.value}</p>
                <p className="text-xs text-text-muted">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Patient cards */}
        <div className="space-y-3">
          {highRisk.filter(p => (category === 'All' || p.category === category) && (!overdueOnly || p.status === 'overdue')).map(p => {
            const sm = STATUS_META[p.status] || {label:p.status,color:''}
            const rm = RISK_META[p.risk] || {variant:'outline'}
            return (
              <div key={p.id} className={`bg-surface-elevated rounded-xl border p-4 hover:shadow-sm transition-shadow ${p.status === 'overdue' ? 'border-status-critical/30' : 'border-border-subtle'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-default flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text-primary text-sm">{p.name}</span>
                      <span className="text-xs text-text-muted">{p.age} yrs</span>
                      <Badge variant={rm.variant} className="capitalize">{p.risk} risk</Badge>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sm.color}`}>{sm.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
                      <span>Category: {p.category}</span>
                      <span>Last visit: {p.last_visit}</span>
                      <span>Due: {p.next_due}</span>
                      <span>Provider: {p.provider}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button onClick={() => setSelected(p)} size="sm" variant="outline" className="text-xs">View</Button>
                    <Button onClick={() => setEditing(p)} size="sm" className="bg-brand-default text-white text-xs">Schedule</Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <RecordDetails title="Follow-up Details" record={selected} onClose={() => setSelected(null)} />
      {editing && <RecordEditor key={editing.id} title="Schedule Follow-up" initial={editing} fields={followUpFields} onSave={values => saveFollowUp(editing.id, values, true)} onClose={() => setEditing(null)} />}
    </AppLayout>
  )
}
