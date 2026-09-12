import { cn } from '../../lib/utils'

export function Badge({ children, variant = 'default', className }) {
  const variants = {
    default:  'bg-subtle text-brand-default',
    blue:     'bg-brand-secondary-light text-brand-secondary',
    success:  'bg-status-success-bg text-status-success',
    warning:  'bg-status-warning-bg text-status-warning',
    critical: 'bg-status-critical-bg text-status-critical',
    navy:     'bg-navy text-white',
    outline:  'border border-border-subtle text-text-muted bg-transparent',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}
