import AppLayout from '../../components/layout/AppLayout'
import { ProgressBar } from '../../components/ui/Misc'
import { Badge } from '../../components/ui/Badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const METRICS = [
  { label: 'Average Waiting Time', value: 28, unit: 'min', target: 30, status: 'good', trend: -8, desc: 'Below 30-min target ✓' },
  { label: 'Referral Completion Rate', value: 78, unit: '%', target: 90, status: 'needs_improvement', trend: 5, desc: '12 pts below target' },
  { label: 'Follow-up Completion', value: 65, unit: '%', target: 85, status: 'needs_improvement', trend: -2, desc: '20 pts below target' },
  { label: 'Diagnostic Turnaround', value: 2.1, unit: 'days', target: 2, status: 'warning', trend: 0.3, desc: 'Slightly above target' },
  { label: 'Medicine Availability', value: 84, unit: '%', target: 95, status: 'needs_improvement', trend: 3, desc: '7 shortages active' },
  { label: 'Teleconsultation Success', value: 92, unit: '%', target: 90, status: 'good', trend: 4, desc: 'Above target ✓' },
  { label: 'Patient Satisfaction', value: 4.2, unit: '/5', target: 4.5, status: 'warning', trend: 0.1, desc: '0.3 below target' },
  { label: 'Facility Utilization', value: 72, unit: '%', target: 80, status: 'warning', trend: 6, desc: 'District Hospital at 85%' },
]

// Line-like sparkline using CSS
function Sparkline({ data }) {
  return (
    <div className="flex items-end gap-0.5 h-8 w-16">
      {data.map((v, i) => (
        <div key={i} className="flex-1 bg-teal rounded-sm opacity-60" style={{ height: `${v}%` }} />
      ))}
    </div>
  )
}

const SPARKLINES = {
  0: [60,65,70,62,72,68,75],
  1: [70,73,71,75,76,78,78],
  2: [68,65,67,63,66,65,65],
  3: [3,2.5,2.8,2.3,2.1,2.4,2.1],
  4: [80,82,79,81,83,84,84],
  5: [85,87,89,88,90,91,92],
  6: [4,4.1,4.0,4.1,4.2,4.2,4.2],
  7: [60,62,65,68,70,72,72],
}

export default function QualityMonitor() {
  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-navy">Quality Monitoring</h1>
          <p className="text-muted text-sm">Healthcare quality indicators across Khandwa district</p>
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap text-xs">
          {[
            { label: 'Meeting Target', color: 'bg-success' },
            { label: 'Needs Improvement', color: 'bg-critical' },
            { label: 'Watch', color: 'bg-warning' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${l.color}`} />
              <span className="text-muted">{l.label}</span>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {METRICS.map((m, i) => {
            const isGood = m.status === 'good'
            const isBad = m.status === 'needs_improvement'
            const barColor = isGood ? 'success' : isBad ? 'critical' : 'warning'
            const TrendIcon = m.trend > 0 ? TrendingUp : m.trend < 0 ? TrendingDown : Minus
            const trendColor = (m.status === 'good' && m.trend > 0) || (m.status === 'needs_improvement' && m.unit === 'days' && m.trend < 0) ? 'text-success' : 'text-critical'

            return (
              <div key={m.label} className={`bg-surface rounded-xl border p-5 ${isBad ? 'border-critical/20' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy">{m.label}</p>
                    <p className="text-xs text-muted mt-0.5">{m.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${isGood ? 'text-success' : isBad ? 'text-critical' : 'text-warning'}`}>{m.value}{m.unit}</p>
                    <div className={`flex items-center gap-0.5 text-xs ${trendColor} justify-end`}>
                      <TrendIcon className="w-3 h-3" />{Math.abs(m.trend)}{m.unit === '%' ? '%' : ''}
                    </div>
                  </div>
                </div>
                <ProgressBar value={typeof m.value === 'number' && m.unit === '%' ? m.value : (m.value / (m.target * 1.5)) * 100} max={100} color={barColor} label={`Target: ${m.target}${m.unit}`} />
                <div className="mt-3 flex items-end justify-between">
                  <Sparkline data={SPARKLINES[i]} />
                  <span className="text-xs text-muted">7-day trend</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
