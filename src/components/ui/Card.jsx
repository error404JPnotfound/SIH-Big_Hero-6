import { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn('bg-surface rounded-xl border border-border shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return <div className={cn('px-6 pt-5 pb-4 border-b border-border', className)}>{children}</div>
}

export function CardTitle({ children, className }) {
  return <h3 className={cn('text-base font-semibold text-navy', className)}>{children}</h3>
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
    teal:     { bg: 'bg-teal-light', text: 'text-teal', icon: 'bg-teal/20' },
    blue:     { bg: 'bg-blue-light', text: 'text-blue', icon: 'bg-blue/20' },
    success:  { bg: 'bg-success-bg', text: 'text-success', icon: 'bg-success/20' },
    warning:  { bg: 'bg-warning-bg', text: 'text-warning', icon: 'bg-warning/20' },
    critical: { bg: 'bg-critical-bg', text: 'text-critical', icon: 'bg-critical/20' },
    navy:     { bg: 'bg-navy/5', text: 'text-navy', icon: 'bg-navy/10' },
  }
  const c = colors[color]
  return (
    <div
      className={cn('bg-surface rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">{title}</p>
          <p className={cn('text-2xl font-bold', c.text)}>
            <AnimatedNumber value={value} />
          </p>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', c.icon)}>
            <Icon className={cn('w-5 h-5', c.text)} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className={cn('text-xs font-medium', trend >= 0 ? 'text-success' : 'text-critical')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
          </span>
        </div>
      )}
    </div>
  )
}
