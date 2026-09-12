import { useState } from 'react'
import { cn } from '../../lib/utils'

export function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div className={cn('flex gap-1 border-b border-border-subtle', className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap',
            activeTab === tab.id
              ? 'text-brand-default border-b-2 border-brand-default -mb-px bg-subtle/30'
              : 'text-text-muted hover:text-text hover:bg-bg'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function useTabs(initial) {
  const [activeTab, setActiveTab] = useState(initial)
  return [activeTab, setActiveTab]
}
