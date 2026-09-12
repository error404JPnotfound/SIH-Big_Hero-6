import { cn } from '../../lib/utils'

export function Input({ label, id, error, className, leftIcon: LeftIcon, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-text">{label}</label>}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id}
          className={cn(
            'w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted',
            'focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors',
            'disabled:bg-bg disabled:cursor-not-allowed',
            LeftIcon && 'pl-9',
            error && 'border-critical focus:ring-critical',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  )
}

export function Select({ label, id, error, children, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-text">{label}</label>}
      <select
        id={id}
        className={cn(
          'w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text',
          'focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors',
          error && 'border-critical',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  )
}

export function Textarea({ label, id, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-text">{label}</label>}
      <textarea
        id={id}
        className={cn(
          'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted resize-none',
          'focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors',
          error && 'border-critical',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  )
}
