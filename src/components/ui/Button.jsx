import { cn } from '../../lib/utils'

export function Button({ children, variant = 'primary', size = 'md', className, disabled, loading, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none'
  const variants = {
    primary:  'bg-brand-default text-white hover:bg-brand-hover/90 active:scale-[0.98] shadow-sm',
    blue:     'bg-brand-secondary text-white hover:bg-blue/90 active:scale-[0.98] shadow-sm',
    navy:     'bg-navy text-white hover:bg-navy/90 active:scale-[0.98]',
    outline:  'border border-border-subtle bg-surface-elevated text-text-primary hover:bg-bg active:scale-[0.98]',
    ghost:    'text-text-muted hover:bg-bg hover:text-text active:scale-[0.98]',
    danger:   'bg-status-critical text-white hover:bg-critical/90 active:scale-[0.98]',
    success:  'bg-status-success text-white hover:bg-success/90 active:scale-[0.98]',
  }
  const sizes = {
    sm:   'px-3 py-1.5 text-sm h-8',
    md:   'px-4 py-2 text-sm h-10',
    lg:   'px-6 py-2.5 text-base h-11',
    xl:   'px-8 py-3 text-base h-12',
    icon: 'p-2 h-10 w-10',
  }
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
