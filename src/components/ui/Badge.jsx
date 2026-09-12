import { cn } from '../../lib/utils'

export function Badge({ children, variant = 'default', className }) {
  const variants = {
    default:  'bg-teal-light text-teal',
    blue:     'bg-blue-light text-blue',
    success:  'bg-success-bg text-success',
    warning:  'bg-warning-bg text-warning',
    critical: 'bg-critical-bg text-critical',
    navy:     'bg-navy text-white',
    outline:  'border border-border text-muted bg-transparent',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}
