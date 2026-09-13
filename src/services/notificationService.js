/**
 * src/services/notificationService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Hybrid Reactive Notification Service for CareConnect.
 * Supports:
 *  - Supabase database notifications table (when logged in with valid session)
 *  - LocalStorage reactive store (always available for local/demo/offline actions)
 *  - Real-time queue synchronization with My Queue tab
 *  - Global custom events for instantaneous UI updates
 */
import { supabase } from '../lib/supabase'
import { getMyQueueEntry } from '../lib/db'
import { appointmentService } from './api'

export function formatNotificationTime(date = new Date()) {
  const d = new Date(date)
  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12
  hours = hours ? hours : 12
  const formattedHours = String(hours).padStart(2, '0')
  return `${formattedHours}:${minutes} ${ampm}`
}

export const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-ref-0001',
    title: 'Referral Transmitted Successfully',
    message: 'Your referral REF-2026-0001 to District Hospital Rajkot (Cardiology) has been received by the specialist department.',
    time: '06:05 pm',
    timestamp: Date.now() - 3600000,
    unread: true,
    link: '/patient/appointments?tab=referrals',
    type: 'referral'
  },
  {
    id: 'notif-fu-0002',
    title: 'Follow-up Reminder',
    message: 'Your next follow-up appointment is scheduled for 18 September 2026.',
    time: '05:00 pm',
    timestamp: Date.now() - 7200000,
    unread: true,
    link: '/patient/appointments',
    type: 'follow_up'
  }
]

function getStorageKey(userId) {
  return `careconnect_notifications_${userId || 'patient'}`
}

function getStored(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(DEFAULT_NOTIFICATIONS))
      return DEFAULT_NOTIFICATIONS
    }
    return JSON.parse(raw) || []
  } catch {
    return DEFAULT_NOTIFICATIONS
  }
}

function setStored(userId, list) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('careconnect:notifications-updated'))
  } catch {}
}

export const notificationService = {
  async getNotifications(userId) {
    const local = getStored(userId)

    // Optionally fetch Supabase notifications if authenticated user exists
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const { data: dbNotifs, error } = await supabase
          .from('notifications')
          .select('id,type,title,body,is_read,action_url,created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!error && dbNotifs && dbNotifs.length > 0) {
          const mapped = dbNotifs.map(n => ({
            id: n.id,
            title: n.title,
            message: n.body,
            unread: !n.is_read,
            link: n.action_url || ({
              prescription: '/patient/diagnostics',
              diagnostic: '/patient/diagnostics',
              appointment: '/patient/appointments',
              referral: '/patient/appointments?tab=referrals',
              queue: '/patient/queue'
            })[n.type] || '/patient/appointments',
            time: formatNotificationTime(new Date(n.created_at)),
            timestamp: new Date(n.created_at).getTime(),
            type: n.type || 'general'
          }))

          // Merge local and db notifications
          const dbIds = new Set(mapped.map(m => m.id))
          const merged = [...mapped]
          for (const l of local) {
            if (!dbIds.has(l.id)) merged.push(l)
          }
          return merged
        }
      }
    } catch {
      // Graceful fallback to local
    }

    return local
  },

  getUnreadCount(userId) {
    const list = getStored(userId)
    return list.filter(n => n.unread).length
  },

  async markAsRead(id, userId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id))
    if (isUuid) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      } catch {}
    }

    const list = getStored(userId)
    const updated = list.map(n => n.id === id ? { ...n, unread: false } : n)
    setStored(userId, updated)
    return updated
  },

  async markAllAsRead(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id)
      }
    } catch {}

    const list = getStored(userId)
    const updated = list.map(n => ({ ...n, unread: false }))
    setStored(userId, updated)
    return updated
  },

  async deleteNotification(id, userId) {
    const target = getStored(userId).find(n => n.id === id)
    if (target && target.type === 'queue') {
      sessionStorage.setItem(`careconnect_dismissed_queue_${userId || 'patient'}`, `${target.queueNumber}-${target.currentNumber}-${target.patientsAhead}`)
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id))
    if (isUuid) {
      try {
        await supabase.from('notifications').delete().eq('id', id)
      } catch {}
    }

    const list = getStored(userId)
    const updated = list.filter(n => n.id !== id)
    setStored(userId, updated)
    return updated
  },

  async clearAll(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await supabase.from('notifications').delete().eq('user_id', session.user.id)
      }
    } catch {}

    setStored(userId, [])
    return []
  },

  addNotification(notif, userId) {
    try {
      const list = getStored(userId)
      const newEntry = {
        id: notif.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: notif.title || 'Notification',
        message: notif.message || '',
        time: notif.time || formatNotificationTime(new Date()),
        timestamp: Date.now(),
        unread: true,
        link: notif.link || null,
        type: notif.type || 'general',
      }
      const updated = [newEntry, ...list]
      setStored(userId, updated)

      // Optionally save to Supabase if session active
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          supabase.from('notifications').insert({
            user_id: session.user.id,
            title: newEntry.title,
            body: newEntry.message,
            action_url: newEntry.link,
            type: newEntry.type,
            is_read: false
          }).catch(() => {})
        }
      }).catch(() => {})

      return newEntry
    } catch (e) {
      console.warn('Failed to add notification:', e)
      return null
    }
  },

  syncQueueNotification(queueInfo, userId) {
    try {
      const list = getStored(userId)

      if (!queueInfo || !queueInfo.hasQueue) {
        const updated = list.filter(n => n.type !== 'queue')
        if (updated.length !== list.length) {
          setStored(userId, updated)
        }
        return
      }

      const qNum = queueInfo.queueNumber || 'A-01'
      const facName = queueInfo.facilityName || 'Healthcare Centre'
      const patientsAhead = Math.max(0, queueInfo.patientsAhead ?? 0)
      const curNum = queueInfo.currentNumber || qNum
      const etaMinutes = queueInfo.etaMinutes ?? (patientsAhead * 5)
      const isCalled = patientsAhead === 0 || queueInfo.status === 'in_consultation' || queueInfo.status === 'called'

      let title = `Live Queue: Token ${qNum}`
      let message = `Now serving ${curNum} at ${facName}. You have ${patientsAhead} patients ahead (Est. wait: ${etaMinutes} min).`

      if (isCalled) {
        title = `🎯 Your Turn — Token ${qNum}`
        message = `Token ${qNum} is now being called at ${facName}. Please proceed to the consultation room.`
      } else if (patientsAhead === 1) {
        title = `🔔 Queue Alert: You're Next!`
        message = `Now serving ${curNum} at ${facName}. Only 1 patient ahead of token ${qNum} (Est. wait: ${etaMinutes || 5} min).`
      }

      const dismissedKey = `careconnect_dismissed_queue_${userId || 'patient'}`
      const dismissedState = sessionStorage.getItem(dismissedKey)
      const stateSig = `${qNum}-${curNum}-${patientsAhead}`
      if (dismissedState === stateSig) {
        return
      }

      const existingIndex = list.findIndex(n => n.type === 'queue')
      const queueNotif = {
        id: existingIndex >= 0 ? list[existingIndex].id : `notif-queue-${qNum}`,
        title,
        message,
        time: formatNotificationTime(new Date()),
        timestamp: Date.now(),
        unread: true,
        link: '/patient/queue',
        type: 'queue',
        queueNumber: qNum,
        patientsAhead,
        currentNumber: curNum,
      }

      let updated
      if (existingIndex >= 0) {
        updated = [...list]
        const prev = updated[existingIndex]
        const changed = prev.patientsAhead !== patientsAhead || prev.currentNumber !== curNum || prev.title !== title
        updated[existingIndex] = {
          ...queueNotif,
          unread: changed ? true : prev.unread,
          time: changed ? queueNotif.time : prev.time
        }
      } else {
        updated = [queueNotif, ...list]
      }

      setStored(userId, updated)
    } catch (err) {
      console.warn('[notificationService] syncQueueNotification error:', err)
    }
  },

  async ensureQueueSynced(userId) {
    try {
      let entry = await getMyQueueEntry().catch(() => null)

      if (!entry) {
        const appts = await appointmentService.getAll().catch(() => [])
        const activeAppt = appts.find(a => {
          if (['cancelled', 'completed'].includes(a.status?.toLowerCase())) return false
          return !!(a.queueNo || a.queue_no)
        })
        if (activeAppt) {
          const qNum = activeAppt.queueNo || activeAppt.queue_no || 'A-027'
          entry = {
            queue_number: qNum,
            facility: { name: activeAppt.facility || activeAppt.facilityName || 'District Hospital Rajkot' },
            status: 'waiting',
            position: 3
          }
        }
      }

      if (entry && entry.queue_number) {
        const qNum = entry.queue_number
        const rawNum = parseInt(qNum.replace(/\D/g, '') || '27', 10)
        const prefix = qNum.replace(/\d+/g, '') || 'A-'
        const patientsAhead = Math.max(0, (entry.position != null ? entry.position - 1 : 2))
        const currentRaw = Math.max(1, rawNum - patientsAhead)
        const currentNumber = `${prefix}${String(currentRaw).padStart(2, '0')}`
        const etaMinutes = patientsAhead * 5

        this.syncQueueNotification({
          hasQueue: true,
          queueNumber: qNum,
          facilityName: entry.facility?.name || 'District Hospital Rajkot',
          currentNumber,
          patientsAhead,
          etaMinutes,
          status: entry.status || 'waiting'
        }, userId)
      }
    } catch (err) {
      console.warn('[notificationService] ensureQueueSynced error:', err)
    }
  }
}
