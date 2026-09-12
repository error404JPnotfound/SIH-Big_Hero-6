import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/Misc'
import { MOCK_HIGH_RISK } from '../../lib/mockData'
import { AlertCircle, Baby, Heart, Pill, Users, Filter } from 'lucide-react'

const RISK_META = {
  critical: { variant: 'critical' }, high: { variant: 'critical' },
  medium: { variant: 'warning' }, low: { variant: 'success' },
}

const STATUS_META = {
  overdue: { label: 'Overdue', color: 'text-critical bg-critical-bg' },
  due_soon: { label: 'Due Soon', color: 'text-warning bg-warning-bg' },
  on_track: { label: 'On Track', color: 'text-success bg-success-bg' },
}

const CATEGORIES = ['All', 'Maternal Health', 'Child Health', 'Diabetes', 'Hypertension', 'TB', 'Elderly Care']

export default function HighRisk() {
  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">High-Risk Patients</h1>
            <p className="text-muted text-sm">Monitor and coordinate care for vulnerable patients</p>
          </div>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4" /> Filter</Button>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${c === 'All' ? 'bg-navy text-surface border-navy' : 'border-border text-muted hover:border-teal hover:text-teal'}`}>{c}</button>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Critical', value: 3, icon: AlertCircle, color: 'text-critical bg-critical-bg' },
            { label: 'Overdue', value: 8, icon: AlertCircle, color: 'text-warning bg-warning-bg' },
            { label: 'Due This Week', value: 15, icon: Heart, color: 'text-blue bg-blue-light' },
            { label: 'Total Monitored', value: MOCK_HIGH_RISK.length, icon: Users, color: 'text-navy bg-navy/5' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-border p-4 flex items-center gap-3 ${s.color.split(' ')[1]}`}>
              <s.icon className={`w-6 h-6 flex-shrink-0 ${s.color.split(' ')[0]}`} />
              <div>
                <p className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Patient cards */}
        <div className="space-y-3">
          {MOCK_HIGH_RISK.map(p => {
            const sm = STATUS_META[p.status]
            const rm = RISK_META[p.risk]
            return (
              <div key={p.id} className={`bg-surface rounded-xl border p-4 hover:shadow-sm transition-shadow ${p.status === 'overdue' ? 'border-critical/30' : 'border-border'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-navy text-sm">{p.name}</span>
                      <span className="text-xs text-muted">{p.age} yrs</span>
                      <Badge variant={rm.variant} className="capitalize">{p.risk} risk</Badge>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sm.color}`}>{sm.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                      <span>Category: {p.category}</span>
                      <span>Last visit: {p.last_visit}</span>
                      <span>Due: {p.next_due}</span>
                      <span>Provider: {p.provider}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" className="text-xs">View</Button>
                    <Button size="sm" className="bg-teal text-white text-xs">Schedule</Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
