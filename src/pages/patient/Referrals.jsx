import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Timeline } from '../../components/ui/Misc'
import { MOCK_REFERRALS } from '../../lib/mockData'
import { ClipboardList, Calendar, ArrowRight, Clock } from 'lucide-react'

const STATUS_STEPS = ['Created', 'Pending', 'Accepted', 'Scheduled', 'In Progress', 'Completed']
const statusVariant = { created: 'default', pending: 'warning', accepted: 'success', scheduled: 'blue', completed: 'outline' }

function ReferralCard({ ref: r }) {
  const stepIdx = STATUS_STEPS.findIndex(s => s.toLowerCase() === r.status)
  return (
    <div className="bg-surface-elevated rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
      <div className="px-5 pt-5 pb-4 flex items-start gap-3 border-b border-border-subtle">
        <div className="w-10 h-10 rounded-xl bg-status-warning-bg flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-status-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary text-sm">{r.dept} — {r.to}</h3>
            <Badge variant={statusVariant[r.status] || 'default'} className="capitalize">{r.status}</Badge>
          </div>
          <p className="text-xs text-text-muted mt-0.5">{r.reason}</p>
          <p className="text-xs text-text-muted mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Referred on {new Date(r.date).toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-1">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-full flex flex-col items-center gap-1 ${i <= stepIdx ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < stepIdx ? 'bg-status-success text-white' : i === stepIdx ? 'bg-brand-default text-white' : 'bg-border text-text-muted'}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                <span className="text-center text-xs text-text-muted leading-tight hidden sm:block">{s}</span>
              </div>
              {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < stepIdx ? 'bg-status-success' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="text-xs font-medium text-text-muted">Referring Doctor: {r.doctor}</p>
        {r.status === 'pending' && (
          <p className="text-xs text-status-warning font-medium mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting acceptance from {r.to}
          </p>
        )}
      </div>
    </div>
  )
}

export default function Referrals() {
  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Referrals</h1>
          <p className="text-text-muted text-sm">Track your referral journey from PHC to Specialist</p>
        </div>

        {/* Referral path info */}
        <div className="bg-navy rounded-2xl p-5 text-surface text-sm">
          <p className="font-semibold mb-3 text-brand-default">Referral Pathway</p>
          <div className="flex items-center gap-2 flex-wrap text-surface/70 text-xs">
            {['Sub-Centre', 'PHC', 'Rural Hospital', 'District Hospital', 'Specialist'].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <span className="text-surface/90">{s}</span>
                {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-brand-default" />}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {MOCK_REFERRALS.map(r => <ReferralCard key={r.id} ref={r} />)}
        </div>
      </div>
    </AppLayout>
  )
}
