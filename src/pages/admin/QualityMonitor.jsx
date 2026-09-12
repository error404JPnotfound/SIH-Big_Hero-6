import { useLiveRecords } from '../../hooks/useLiveRecords'
import AppLayout from '../../components/layout/AppLayout'
import { ProgressBar } from '../../components/ui/Misc'
import { Badge } from '../../components/ui/Badge'
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getQualityMonitorMetrics } from '../../lib/db'

// Line-like sparkline using CSS
function Sparkline({ data = [] }) {
  return (
    <div className="flex items-end gap-0.5 h-8 w-16">
      {data.map((v, i) => (
        <div key={i} className="flex-1 bg-brand-default rounded-sm opacity-60" style={{ height: `${v}%` }} />
      ))}
    </div>
  )
}

export default function QualityMonitor() {
  const { data: metrics, loading, error } = useLiveRecords(getQualityMonitorMetrics)


  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {error && <p role="alert" className="p-4 text-status-critical border rounded-xl">Unable to load live data: {error}</p>}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Quality Monitoring</h1>
          <p className="text-text-muted text-sm">Healthcare quality indicators across Khandwa district</p>
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap text-xs">
          {[
            { label: 'Meeting Target', color: 'bg-status-success' },
            { label: 'Needs Improvement', color: 'bg-status-critical' },
            { label: 'Watch', color: 'bg-status-warning' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${l.color}`} />
              <span className="text-text-muted">{l.label}</span>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {metrics.map((m, i) => {
            const isGood = m.status === 'good'
            const isBad = m.status === 'needs_improvement'
            const barColor = isGood ? 'success' : isBad ? 'critical' : 'warning'
            const TrendIcon = m.trend > 0 ? TrendingUp : m.trend < 0 ? TrendingDown : Minus
            const trendColor = (m.status === 'good' && m.trend > 0) || (m.status === 'needs_improvement' && m.unit === 'days' && m.trend < 0) ? 'text-status-success' : 'text-status-critical'

            return (
              <div key={m.label} className={`bg-surface-elevated rounded-xl border p-5 ${isBad ? 'border-status-critical/20' : 'border-border-subtle'}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">{m.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{m.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${isGood ? 'text-status-success' : isBad ? 'text-status-critical' : 'text-status-warning'}`}>{m.value === null ? 'No data' : `${m.value}${m.unit}`}</p>
                    <div hidden={m.trend === null} className={`flex items-center gap-0.5 text-xs ${trendColor} justify-end`}>
                      <TrendIcon className="w-3 h-3" />{Math.abs(m.trend)}{m.unit === '%' ? '%' : ''}
                    </div>
                  </div>
                </div>
                <ProgressBar value={typeof m.value === 'number' && m.unit === '%' ? m.value : (m.value / (m.target * 1.5)) * 100} max={100} color={barColor} label={`Target: ${m.target}${m.unit}`} />
                <div className="mt-3 flex items-end justify-between">
                  <Sparkline data={m.sparkline} />
                  <span className="text-xs text-text-muted">Live totals · refreshes every 15 seconds</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
