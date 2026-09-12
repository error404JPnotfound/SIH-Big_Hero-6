import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Trash2, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { notificationService } from '../../services/notificationService'

export default function NotificationDropdown({ userId }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const reload = () => {
    setNotifications(notificationService.getNotifications(userId))
  }

  useEffect(() => {
    reload()
    notificationService.ensureQueueSynced(userId)
    const handleUpdate = () => reload()
    window.addEventListener('careconnect:notifications-updated', handleUpdate)
    return () => window.removeEventListener('careconnect:notifications-updated', handleUpdate)
  }, [userId])

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const unreadCount = notifications.filter(n => n.unread).length

  const handleMarkAllRead = (e) => {
    e.stopPropagation()
    notificationService.markAllAsRead(userId)
  }

  const handleClearAll = (e) => {
    e.stopPropagation()
    notificationService.clearAll(userId)
  }

  const handleDeleteItem = (e, id) => {
    e.stopPropagation()
    notificationService.deleteNotification(id, userId)
  }

  const handleItemClick = (item) => {
    if (item.unread) {
      notificationService.markAsRead(item.id, userId)
    }
    if (item.link) {
      setOpen(false)
      navigate(item.link)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Icon Button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Notifications"
        aria-expanded={open}
        className={cn(
          'relative p-2 rounded-lg transition-all duration-150 focus:outline-none',
          open
            ? 'bg-bg text-brand-default'
            : 'hover:bg-bg text-text-muted hover:text-text-primary'
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-default rounded-full ring-2 ring-surface-elevated" />
        )}
      </button>

      {/* Notifications Popover */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2.5 sm:mt-3 z-50',
            'w-80 sm:w-[390px] max-w-[calc(100vw-2rem)]',
            'bg-surface-elevated rounded-3xl p-5 sm:p-6',
            'shadow-2xl border border-border-subtle/80',
            'animate-in fade-in zoom-in-95 duration-150 origin-top-right'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-text-primary">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="text-xs sm:text-sm font-semibold text-brand-default hover:text-brand-dark transition-colors cursor-pointer"
                >
                  {unreadCount} unread
                </button>
              ) : (
                <span className="text-xs sm:text-sm font-semibold text-text-muted">
                  0 unread
                </span>
              )}
              {notifications.length > 0 && (
                <>
                  <span className="text-border-subtle text-xs">·</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    title="Clear all notifications"
                    className="text-xs sm:text-sm font-medium text-text-muted hover:text-status-critical transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border-subtle/60 my-4" />

          {/* Notification Items List */}
          <div className="space-y-4 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <Bell className="w-8 h-8 text-border mb-2" />
                <p className="text-sm font-semibold text-text-primary">No notifications</p>
                <p className="text-xs text-text-muted mt-0.5">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="cursor-pointer group flex flex-col gap-1 p-2.5 -mx-2 rounded-2xl hover:bg-canvas/80 transition-colors relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-bold text-sm text-text-primary group-hover:text-brand-default transition-colors leading-snug">
                      {item.title}
                    </h4>
                    {item.unread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-default flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed mt-0.5">
                    {item.message}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-text-muted/70 font-medium">
                      {item.time}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      title="Clear this notification"
                      className="text-[11px] font-semibold text-text-muted hover:text-status-critical transition-colors flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-status-critical-bg"
                    >
                      <X className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
