/**
 * src/services/notificationService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LocalStorage-backed reactive notification service for CareConnect.
 * Dispatches browser CustomEvent 'careconnect:notifications-updated'
 * so any open UI component / hook updates immediately.
 *
 * Dynamically synchronizes queue notifications according to the My Queue tab
 * and active appointments/queues.
 */
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

export const notificationService = {
  getNotifications(userId) {
    try {
      const key = getStorageKey(userId)
      const raw = localStorage.getItem(key)
      if (!raw) {
        localStorage.setItem(key, JSON.stringify(DEFAULT_NOTIFICATIONS))
        return DEFAULT_NOTIFICATIONS
      }
      return JSON.parse(raw) || []
    } catch {
      return DEFAULT_NOTIFICATIONS
    }
  },

  getUnreadCount(userId) {
    const list = this.getNotifications(userId)
    return list.filter(n => n.unread).length
  },

  markAsRead(id, userId) {
    try {
      const key = getStorageKey(userId)
      const list = this.getNotifications(userId)
      const updated = list.map(n => n.id === id ? { ...n, unread: false } : n)
      localStorage.setItem(key, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('careconnect:notifications-updated'))
      return updated
    } catch {
      return []
    }
  },

  markAllAsRead(userId) {
    try {
      const key = getStorageKey(userId)
      const list = this.getNotifications(userId)
      const updated = list.map(n => ({ ...n, unread: false }))
      localStorage.setItem(key, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('careconnect:notifications-updated'))
      return updated
    } catch {
      return []
    }
  },

  addNotification(notif, userId) {
    try {
      const key = getStorageKey(userId)
      const list = this.getNotifications(userId)
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
      localStorage.setItem(key, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('careconnect:notifications-updated'))
      return newEntry
    } catch {
      return null
    }
  },

  deleteNotification(id, userId) {
    try {
      const key = getStorageKey(userId)
      const list = this.getNotifications(userId)
      const target = list.find(n => n.id === id)
      if (target && target.type === 'queue') {
        const dismissedKey = `careconnect_dismissed_queue_${userId || 'patient'}`
        sessionStorage.setItem(dismissedKey, `${target.queueNumber}-${target.currentNumber}-${target.patientsAhead}`)
      }
      const updated = list.filter(n => n.id !== id)
      localStorage.setItem(key, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('careconnect:notifications-updated'))
      return updated
    } catch {
      return []
    }
  },

  clearAll(userId) {
    try {
      const key = getStorageKey(userId)
      localStorage.setItem(key, JSON.stringify([]))
      window.dispatchEvent(new CustomEvent('careconnect:notifications-updated'))
      return []
    } catch {
      return []
    }
  },

  /**
   * Dynamically sync queue notification according to the My Queue tab state
   */
  syncQueueNotification(queueInfo, userId) {
    try {
      const key = getStorageKey(userId)
      const list = this.getNotifications(userId)

      // If no queue today, remove any outdated queue notification
      if (!queueInfo || !queueInfo.hasQueue) {
        const updated = list.filter(n => n.type !== 'queue')
        if (updated.length !== list.length) {
          localStorage.setItem(key, JSON.stringify(updated))
          window.dispatchEvent(new CustomEvent('careconnect:notifications-updated'))
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
        // Place active live queue notification at the top of the list
        updated = [queueNotif, ...list]
      }

      localStorage.setItem(key, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('careconnect:notifications-updated'))
    } catch (err) {
      console.warn('[notificationService] syncQueueNotification error:', err)
    }
  },

  /**
   * Proactively resolves active queue from DB or local appointments and syncs notification
   */
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
      } else {
        this.syncQueueNotification({ hasQueue: false }, userId)
      }
    } catch (err) {
      console.warn('[notificationService] ensureQueueSynced error:', err)
    }
  }
}
