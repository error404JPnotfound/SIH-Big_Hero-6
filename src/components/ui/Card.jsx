import { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn('bg-surface-elevated rounded-xl border border-border-subtle shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return <div className={cn('px-6 pt-5 pb-4 border-b border-border-subtle', className)}>{children}</div>
}

export function CardTitle({ children, className }) {
  return <h3 className={cn('text-base font-semibold text-text-primary', className)}>{children}</h3>
}

export function CardBody({ children, className }) {
  return <div className={cn('p-6', className)}>{children}</div>
}

function AnimatedNumber({ value, duration = 2000 }) {
  const [count, setCount] = useState(0)
  
  const isString = typeof value === 'string'
  const numericValue = isString ? parseFloat(value.replace(/,/g, '')) : parseFloat(value)
  
  useEffect(() => {
    if (isNaN(numericValue) || numericValue === 0) {
      setCount(numericValue || value)
      return
    }
    
    let startTime = null
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      setCount(Math.floor(numericValue * easeOutQuart(progress)))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(numericValue)
      }
    }
    const req = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(req)
  }, [numericValue, duration, value])
  
  if (isNaN(numericValue)) return <>{value}</>
  return <>{isString && typeof value === 'string' && value.includes(',') ? count.toLocaleString() : count}</>
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, color = 'teal', onClick }) {
  const colors = {
    teal:     { bg: 'bg-subtle', text: 'text-brand-default', icon: 'bg-brand-default/20' },
    blue:     { bg: 'bg-brand-secondary-light', text: 'text-brand-secondary', icon: 'bg-brand-secondary/20' },
    success:  { bg: 'bg-status-success-bg', text: 'text-status-success', icon: 'bg-status-success/20' },
    warning:  { bg: 'bg-status-warning-bg', text: 'text-status-warning', icon: 'bg-status-warning/20' },
    critical: { bg: 'bg-status-critical-bg', text: 'text-status-critical', icon: 'bg-status-critical/20' },
    navy:     { bg: 'bg-navy/5', text: 'text-text-primary', icon: 'bg-navy/10' },
  }
  const c = colors[color]
  return (
    <div
      className={cn('bg-surface-elevated rounded-xl border border-border-subtle p-5 shadow-sm hover:shadow-md transition-shadow', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <div className="flex flex-col">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 leading-snug">{title}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={cn('text-2xl font-bold', c.text)}>
              <AnimatedNumber value={value} />
            </p>
            {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', c.icon)}>
              <Icon className={cn('w-5 h-5', c.text)} />
            </div>
          )}
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <span className={cn('text-xs font-medium', trend >= 0 ? 'text-status-success' : 'text-status-critical')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
          </span>
        </div>
      )}
    </div>
  )
}
