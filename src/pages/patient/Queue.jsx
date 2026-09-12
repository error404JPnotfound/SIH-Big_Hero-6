import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Misc'
import { MOCK_QUEUE } from '../../lib/mockData'
import { Users, Clock, RefreshCw } from 'lucide-react'

export default function Queue() {
  const q = MOCK_QUEUE
  const pct = Math.max(0, 100 - (q.ahead / 10) * 100)

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Queue</h1>
          <p className="text-text-muted text-sm">Real-time queue position at PHC Khandwa</p>
        </div>

        <Alert type="info" title="Consultation in progress">
          Patients are being called. Please be ready when your number is announced.
        </Alert>

        {/* Queue display */}
        <div className="bg-surface-elevated rounded-2xl border border-border-subtle p-8 text-center shadow-sm">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Now Serving</p>
              <div className="text-5xl font-black text-status-success">{q.current}</div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Your Number</p>
              <div className="text-5xl font-black text-brand-default">{q.yours}</div>
            </div>
          </div>

          <div className="w-full bg-border rounded-full h-3 mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal to-blue rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-canvas rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Patients Ahead</span>
              </div>
              <div className="text-3xl font-bold text-text-primary">{q.ahead}</div>
            </div>
            <div className="bg-canvas rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Est. Wait</span>
              </div>
              <div className="text-3xl font-bold text-text-primary">{q.eta_minutes}<span className="text-sm font-normal ml-1">min</span></div>
            </div>
          </div>
        </div>

        {/* Live queue list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Queue Status</h2>
            <button className="flex items-center gap-1 text-xs text-brand-default hover:underline">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          <div className="bg-surface-elevated rounded-xl border border-border-subtle overflow-hidden">
            {['A-021 (Current)', 'A-022', 'A-023', 'A-024', 'A-025', 'A-026', 'A-027 (You)'].map((item, i) => (
              <div key={item} className={`flex items-center justify-between px-4 py-3 text-sm border-b border-border-subtle last:border-0 ${i === 0 ? 'bg-status-success-bg' : item.includes('You') ? 'bg-subtle' : ''}`}>
                <span className={`font-mono font-bold ${i === 0 ? 'text-status-success' : item.includes('You') ? 'text-brand-default' : 'text-text-muted'}`}>{item}</span>
                {i === 0 && <Badge variant="success">In Consultation</Badge>}
                {item.includes('You') && <Badge variant="default">← You</Badge>}
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full" variant="outline">
          Notify me when 2 patients ahead
        </Button>
      </div>
    </AppLayout>
  )
}
