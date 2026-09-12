/**
 * hooks/useSupabase.js
 * ─────────────────────────────────────────────────────────────
 * Custom React hooks that wrap the db.js data layer.
 * Each hook handles loading, error, and data state automatically.
 *
 * Usage:
 *   const { data: appointments, loading, error, refetch } = useAppointments()
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  getMyAppointments, getMyPatientRecord, getMyVitals,
  getMyReferrals, getMyDiagnostics, getMyNotifications,
  getFacilities, getDoctorsByFacility, getMyPrescriptions,
  getDoctorTodayAppointments, getFacilityQueue, getDoctorByProfileId,
  getPatientProfileById, getHighRiskFollowUps, getAdminDashboard, searchMedicines,
  subscribeToQueue, subscribeToNotifications, markNotificationsRead,
} from '../lib/db'
import { useAuth } from '../context/AuthContext'

/** Generic async data hook */
function useAsync(fn, deps = [], enabled = true) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(!!enabled)
  const [error, setError]     = useState(null)

  const run = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
    } catch (err) {
      console.error('[useAsync]', err)
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])

  return { data, loading, error, refetch: run }
}

// ──────────────────────────────────────────────────────────────
// PATIENT HOOKS
// ──────────────────────────────────────────────────────────────

/** My patient record */
export function usePatientRecord() {
  const { user, demoMode } = useAuth()
  return useAsync(
    () => getMyPatientRecord(),
    [user?.id],
    !!user && !demoMode
  )
}

/** My appointments */
export function useAppointments() {
  const { user, demoMode } = useAuth()
  return useAsync(
    () => getMyAppointments(),
    [user?.id],
    !!user && !demoMode
  )
}

/** My vitals history */
export function useVitals() {
  const { user, demoMode } = useAuth()
  return useAsync(
    () => getMyVitals(10),
    [user?.id],
    !!user && !demoMode
  )
}

/** My referrals */
export function useReferrals() {
  const { user, demoMode } = useAuth()
  return useAsync(
    () => getMyReferrals(),
    [user?.id],
    !!user && !demoMode
  )
}

/** My diagnostics */
export function useDiagnostics() {
  const { user, demoMode } = useAuth()
  return useAsync(
    () => getMyDiagnostics(),
    [user?.id],
    !!user && !demoMode
  )
}

/** My prescriptions */
export function usePrescriptions() {
  const { user, demoMode } = useAuth()
  return useAsync(
    () => getMyPrescriptions(),
    [user?.id],
    !!user && !demoMode
  )
}

/** Medicine search with debounce */
export function useMedicines(query, facilityId = null, availableOnly = null) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await searchMedicines(query, facilityId, availableOnly)
        setData(result || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, 350)  // 350ms debounce
    return () => clearTimeout(timeout)
  }, [query, facilityId, availableOnly])

  return { data, loading, error }
}

// ──────────────────────────────────────────────────────────────
// DOCTOR HOOKS
// ──────────────────────────────────────────────────────────────

/** Doctor's today appointments */
export function useDoctorTodayAppointments(doctorId) {
  const { user, demoMode } = useAuth()
  return useAsync(
    () => getDoctorTodayAppointments(doctorId),
    [doctorId],
    !!doctorId && !demoMode
  )
}

/** Live queue for a facility with Realtime subscription */
export function useLiveQueue(facilityId) {
  const [queue, setQueue]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const { demoMode } = useAuth()

  useEffect(() => {
    if (!facilityId || demoMode) { setLoading(false); return }

    // Initial fetch
    getFacilityQueue(facilityId)
      .then(data => setQueue(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))

    // Realtime subscription
    const sub = subscribeToQueue(facilityId, () => {
      getFacilityQueue(facilityId)
        .then(data => setQueue(data || []))
        .catch(err => setError(err.message))
    })

    return () => { sub.unsubscribe() }
  }, [facilityId, demoMode])

  return { queue, loading, error }
}

/** Doctor's profile info */
export function useDoctorProfile() {
  const { user, demoMode } = useAuth()
  return useAsync(
    () => getDoctorByProfileId(user?.id),
    [user?.id],
    !!user?.id && !demoMode
  )
}

/** Detailed patient profile data (vitals, appts, referrals, etc.) */
export function usePatientProfileDetails(patientId) {
  const { demoMode } = useAuth()
  return useAsync(
    () => getPatientProfileById(patientId),
    [patientId],
    !!patientId && !demoMode
  )
}

// ──────────────────────────────────────────────────────────────
// NOTIFICATIONS HOOK
// ──────────────────────────────────────────────────────────────

/** Realtime notifications with unread count */
export function useNotifications() {
  const { user, demoMode } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [unreadCount, setUnreadCount]     = useState(0)

  const refresh = useCallback(async () => {
    if (!user || demoMode) { setLoading(false); return }
    try {
      const data = await getMyNotifications()
      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.is_read).length)
    } catch (err) {
      console.error('[useNotifications]', err)
    } finally {
      setLoading(false)
    }
  }, [user, demoMode])

  useEffect(() => {
    refresh()
    if (!user || demoMode) return

    const sub = subscribeToNotifications(user.id, () => refresh())
    return () => { sub.unsubscribe() }
  }, [user, demoMode, refresh])

  const markRead = useCallback(async (ids) => {
    await markNotificationsRead(ids)
    setNotifications(prev => prev.map(n =>
      ids.includes(n.id) ? { ...n, is_read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - ids.length))
  }, [])

  return { notifications, loading, unreadCount, markRead, refetch: refresh }
}

// ──────────────────────────────────────────────────────────────
// SHARED HOOKS
// ──────────────────────────────────────────────────────────────

/** All facilities */
export function useFacilities() {
  return useAsync(() => getFacilities(), [], true)
}

/** Doctors at a facility */
export function useFacilityDoctors(facilityId) {
  return useAsync(
    () => getDoctorsByFacility(facilityId),
    [facilityId],
    !!facilityId
  )
}

// ──────────────────────────────────────────────────────────────
// ADMIN HOOKS
// ──────────────────────────────────────────────────────────────

/** Admin operations dashboard stats */
export function useAdminDashboard() {
  const { user, isAdmin, demoMode } = useAuth()
  return useAsync(
    () => getAdminDashboard(),
    [user?.id],
    !!user && isAdmin && !demoMode
  )
}

/** High-risk follow-ups */
export function useHighRiskFollowUps() {
  const { user, isAdmin, demoMode } = useAuth()
  return useAsync(
    () => getHighRiskFollowUps(),
    [user?.id],
    !!user && isAdmin && !demoMode
  )
}
