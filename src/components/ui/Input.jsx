import { cn } from '../../lib/utils'

export function Input({ label, id, error, successText, className, leftIcon: LeftIcon, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-text-primary">{label}</label>}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id}
          className={cn(
            'w-full h-10 rounded-lg border border-border-subtle bg-surface-elevated px-3 text-sm text-text-primary placeholder:text-muted',
            'focus:outline-none focus:ring-2 focus:ring-brand-default focus:border-brand-default transition-colors',
            'disabled:bg-bg disabled:cursor-not-allowed',
            LeftIcon && 'pl-9',
            error && 'border-status-critical focus:ring-critical',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-status-critical">{error}</p>}
      {!error && successText && <p className="text-xs text-status-success flex items-center gap-1">✓ {successText}</p>}
    </div>
  )
}

export function Select({ label, id, error, children, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-text-primary">{label}</label>}
      <select
        id={id}
        className={cn(
          'w-full h-10 rounded-lg border border-border-subtle bg-surface-elevated px-3 text-sm text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-brand-default focus:border-brand-default transition-colors',
          error && 'border-status-critical',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  )
}

export function Textarea({ label, id, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-text-primary">{label}</label>}
      <textarea
        id={id}
        className={cn(
          'w-full rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-muted resize-none',
          'focus:outline-none focus:ring-2 focus:ring-brand-default focus:border-brand-default transition-colors',
          error && 'border-status-critical',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  )
}
