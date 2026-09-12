import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { MOCK_DIAGNOSTICS } from '../../lib/mockData'
import { Activity, Download, Eye, Calendar } from 'lucide-react'

const STATUS_META = {
  requested:       { label: 'Requested', variant: 'outline' },
  scheduled:       { label: 'Scheduled', variant: 'blue' },
  sample_collected:{ label: 'Sample Collected', variant: 'warning' },
  processing:      { label: 'Processing', variant: 'warning' },
  result_ready:    { label: 'Result Ready', variant: 'success' },
}

export default function Diagnostics() {
  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Diagnostics</h1>
          <p className="text-text-muted text-sm">Track your test requests and results</p>
        </div>

        <div className="space-y-4">
          {MOCK_DIAGNOSTICS.map(dx => {
            const meta = STATUS_META[dx.status] || { label: dx.status, variant: 'outline' }
            return (
              <div key={dx.id} className="bg-surface-elevated rounded-xl border border-border-subtle p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-secondary-light flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-brand-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-text-primary text-sm">{dx.name}</h3>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">Requested by {dx.requested_by}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(dx.date).toLocaleDateString('en-IN')}</span>
                      <span>{dx.facility}</span>
                    </div>
                    {dx.result && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-medium text-status-success">Result: {dx.result}</span>
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          <Eye className="w-3 h-3" /> View Report
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7">
                          <Download className="w-3 h-3" /> Download
                        </Button>
                      </div>
                    )}
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
