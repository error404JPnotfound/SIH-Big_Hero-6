import { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'

export function StatusDot({ status }) {
  const map = {
    operational: { color: 'bg-success', label: 'Operational' },
    busy:         { color: 'bg-warning', label: 'Busy' },
    limited_capacity: { color: 'bg-warning', label: 'Limited' },
    critical:     { color: 'bg-critical', label: 'Critical' },
    confirmed:    { color: 'bg-success', label: 'Confirmed' },
    pending:      { color: 'bg-warning', label: 'Pending' },
    cancelled:    { color: 'bg-critical', label: 'Cancelled' },
    completed:    { color: 'bg-muted', label: 'Completed' },
    overdue:      { color: 'bg-critical animate-pulse', label: 'Overdue' },
    due_soon:     { color: 'bg-warning', label: 'Due Soon' },
    on_track:     { color: 'bg-success', label: 'On Track' },
  }
  const s = map[status] || { color: 'bg-muted', label: status }
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', s.color)} />
      <span className="text-xs text-muted capitalize">{s.label}</span>
    </div>
  )
}

export function Timeline({ items }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
      <div className="space-y-6">
        {items.map((item, i) => (
          <div key={i} className="relative flex gap-4">
            <div className={cn('absolute -left-4 w-4 h-4 rounded-full border-2 border-surface flex-shrink-0 mt-0.5',
              item.color || 'bg-teal border-teal')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text">{item.title}</p>
              {item.subtitle && <p className="text-xs text-muted mt-0.5">{item.subtitle}</p>}
              {item.date && <p className="text-xs text-muted mt-1">{item.date}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProgressBar({ value, max = 100, color = 'teal', label, showLabel = true, className }) {
  const [currentValue, setCurrentValue] = useState(0)
  
  useEffect(() => {
    // Small delay to allow the CSS transition to trigger after mount
    const timer = setTimeout(() => {
      setCurrentValue(value)
    }, 100)
    return () => clearTimeout(timer)
  }, [value])

  const pct = Math.min(100, (currentValue / max) * 100)
  const colorMap = { teal: 'bg-teal', blue: 'bg-blue', success: 'bg-success', warning: 'bg-warning', critical: 'bg-critical' }
  return (
    <div className={cn('w-full', className)}>
      {(label || showLabel) && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-xs text-muted">{label}</span>}
          {showLabel && <span className="text-xs font-medium text-text">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000 ease-out', colorMap[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-bg flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted" />
        </div>
      )}
      <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
      {description && <p className="text-sm text-muted max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-border rounded-lg', className)} />
}

export function Alert({ type = 'info', title, children, className }) {
  const types = {
    info:     { bg: 'bg-blue-light border-blue/30', icon: '💡', text: 'text-blue' },
    success:  { bg: 'bg-success-bg border-success/30', icon: '✅', text: 'text-success' },
    warning:  { bg: 'bg-warning-bg border-warning/30', icon: '⚠️', text: 'text-warning' },
    critical: { bg: 'bg-critical-bg border-critical/30', icon: '🚨', text: 'text-critical' },
  }
  const t = types[type]
  return (
    <div className={cn('rounded-xl border p-4 flex gap-3', t.bg, className)}>
      <span className="text-lg flex-shrink-0">{t.icon}</span>
      <div>
        {title && <p className={cn('font-semibold text-sm', t.text)}>{title}</p>}
        {children && <p className="text-sm text-muted mt-0.5">{children}</p>}
      </div>
    </div>
  )
}
