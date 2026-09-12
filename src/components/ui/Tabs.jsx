import { useState } from 'react'
import { cn } from '../../lib/utils'

export function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div className={cn('flex gap-1 border-b border-border', className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap',
            activeTab === tab.id
              ? 'text-teal border-b-2 border-teal -mb-px bg-teal-light/30'
              : 'text-muted hover:text-text hover:bg-bg'
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
