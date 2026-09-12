/**
 * lib/db.js
 * ─────────────────────────────────────────────────────────────
 * All Supabase data operations for CareConnect.
 * Every function falls back gracefully when running in demo mode.
 *
 * Usage:
 *   import { getMyProfile, getMyAppointments } from '../lib/db'
 * ─────────────────────────────────────────────────────────────
 */
import { supabase } from './supabase'

// ──────────────────────────────────────────────────────────────
// PROFILES
// ──────────────────────────────────────────────────────────────

/** Fetch the current user's profile from the profiles table */
export async function getMyProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, phone, preferred_language, is_active, facility_id')
    .single()
  if (error) throw error
  return data
}

/** Update profile fields (name, language, avatar) */
export async function updateProfile(updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: list all profiles with optional role filter */
export async function adminListProfiles(role = null) {
  let query = supabase
    .from('profiles')
    .select('id, role, full_name, email, phone, is_active, created_at')
    .order('created_at', { ascending: false })
  if (role) query = query.eq('role', role)
  const { data, error } = await query
  if (error) throw error
  return data
}

/** Admin: change a user's role */
export async function adminSetRole(userId, newRole) {
  const { error } = await supabase.rpc('admin_set_role', {
    p_user_id: userId,
    p_new_role: newRole,
  })
  if (error) throw error
}

// ──────────────────────────────────────────────────────────────
// PATIENTS
// ──────────────────────────────────────────────────────────────

/** Fetch my patient record */
export async function getMyPatientRecord() {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      id, patient_code, dob, gender, blood_group,
      address, emergency_contact, allergies, is_high_risk,
      profiles:profile_id (full_name, phone, email)
    `)
    .single()
  if (error) throw error
  return data
}

/** Update patient demographics */
export async function updatePatientRecord(patientId, updates) {
  const { data, error } = await supabase
    .from('patients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', patientId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────────────────────
// APPOINTMENTS
// ──────────────────────────────────────────────────────────────

/** Get patient's own appointments (upcoming + past) */
export async function getMyAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, scheduled_at, mode, status, reason, notes, created_at,
      doctors:doctor_id (
        id, specialization,
        profiles:profile_id (full_name)
      ),
      facilities:facility_id (id, name, type, address),
      queues (id, queue_number, position, status)
    `)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data
}

/** Doctor: get today's appointments for their facility */
export async function getDoctorTodayAppointments(doctorId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, scheduled_at, mode, status, reason,
      patients:patient_id (
        id, patient_code, dob, blood_group, allergies, is_high_risk,
        profiles:profile_id (full_name, phone)
      ),
      queues (id, queue_number, position, status, called_at, started_at)
    `)
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', tomorrow.toISOString())
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data
}

/** Book an appointment using the DB function (returns queue number) */
export async function bookAppointment({ doctorId, facilityId, scheduledAt, mode, reason }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.rpc('book_appointment', {
    p_patient_profile_id: user.id,
    p_doctor_id: doctorId,
    p_facility_id: facilityId,
    p_scheduled_at: scheduledAt,
    p_mode: mode,
    p_reason: reason,
  })
  if (error) throw error
  return data  // { appointment_id, queue_number, position }
}

/** Update appointment status (doctor/admin) */
export async function updateAppointmentStatus(appointmentId, status) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────────────────────
// QUEUE
// ──────────────────────────────────────────────────────────────

/** Get live queue for a facility (Realtime subscribed separately) */
export async function getFacilityQueue(facilityId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('queues')
    .select(`
      id, queue_number, position, status, called_at, started_at, created_at,
      appointments:appointment_id (
        id, reason, mode,
        patients:patient_id (
          id, is_high_risk,
          profiles:profile_id (full_name, phone)
        )
      )
    `)
    .eq('facility_id', facilityId)
    .gte('created_at', today.toISOString())
    .in('status', ['waiting', 'in_consultation'])
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

/** Update queue entry status */
export async function updateQueueStatus(queueId, status) {
  const updates = { status }
  if (status === 'in_consultation') updates.started_at = new Date().toISOString()
  if (status === 'completed')       updates.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('queues')
    .update(updates)
    .eq('id', queueId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Subscribe to realtime queue changes */
export function subscribeToQueue(facilityId, callback) {
  return supabase
    .channel(`queue:${facilityId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'queues',
      filter: `facility_id=eq.${facilityId}`,
    }, callback)
    .subscribe()
}

// ──────────────────────────────────────────────────────────────
// VITALS
// ──────────────────────────────────────────────────────────────

/** Get patient's vitals history */
export async function getMyVitals(limit = 10) {
  const patientResult = await supabase
    .from('patients').select('id').single()
  if (patientResult.error) throw patientResult.error

  const { data, error } = await supabase
    .from('vitals')
    .select('*')
    .eq('patient_id', patientResult.data.id)
    .order('recorded_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

/** Doctor: record vitals */
export async function recordVitals(patientId, consultationId, vitalsData) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('vitals')
    .insert({
      patient_id: patientId,
      consultation_id: consultationId,
      recorded_by: user.id,
      ...vitalsData,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────────────────────
// CONSULTATIONS
// ──────────────────────────────────────────────────────────────

/** Start a new consultation */
export async function startConsultation(appointmentId, patientId) {
  const doctorResult = await supabase
    .from('doctors').select('id, facility_id').single()
  if (doctorResult.error) throw doctorResult.error

  const { data, error } = await supabase
    .from('consultations')
    .insert({
      appointment_id: appointmentId,
      patient_id: patientId,
      doctor_id: doctorResult.data.id,
      facility_id: doctorResult.data.facility_id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Save consultation notes */
export async function saveConsultationNotes(consultationId, notes) {
  const { data, error } = await supabase
    .from('consultations')
    .update({ ...notes, ended_at: new Date().toISOString() })
    .eq('id', consultationId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────────────────────
// PRESCRIPTIONS
// ──────────────────────────────────────────────────────────────

/** Get patient's prescriptions */
export async function getMyPrescriptions() {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      id, issued_at, pdf_url,
      doctors:doctor_id ( profiles:profile_id (full_name) ),
      prescription_items (id, medicine_name, dosage, frequency, duration, instructions)
    `)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return data
}

/** Create a prescription with items */
export async function createPrescription(patientId, consultationId, items) {
  const doctorResult = await supabase
    .from('doctors').select('id').single()
  if (doctorResult.error) throw doctorResult.error

  // Insert prescription header
  const { data: prescription, error: presErr } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: patientId,
      doctor_id: doctorResult.data.id,
      consultation_id: consultationId,
    })
    .select()
    .single()
  if (presErr) throw presErr

  // Insert line items
  const itemRows = items.map(item => ({
    prescription_id: prescription.id,
    ...item,
  }))
  const { error: itemErr } = await supabase
    .from('prescription_items')
    .insert(itemRows)
  if (itemErr) throw itemErr

  return prescription
}

// ──────────────────────────────────────────────────────────────
// REFERRALS
// ──────────────────────────────────────────────────────────────

/** Get my referrals (as patient) */
export async function getMyReferrals() {
  const { data, error } = await supabase
    .from('referrals')
    .select(`
      id, department, reason, urgency, status, notes, created_at, updated_at,
      from_facility:from_facility ( name ),
      to_facility:to_facility     ( name ),
      referring_doctor:referring_doctor ( profiles:profile_id (full_name) )
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Doctor: create a referral using the DB function */
export async function createReferral({ patientId, toFacilityId, department, reason, urgency, notes }) {
  const { data, error } = await supabase.rpc('create_referral', {
    p_patient_id:  patientId,
    p_to_facility: toFacilityId,
    p_department:  department,
    p_reason:      reason,
    p_urgency:     urgency,
    p_notes:       notes,
  })
  if (error) throw error
  return data  // referral UUID
}

/** Doctor/Admin: update referral status */
export async function updateReferralStatus(referralId, status) {
  const { error } = await supabase.rpc('update_referral_status', {
    p_referral_id: referralId,
    p_new_status: status,
  })
  if (error) throw error
}

// ──────────────────────────────────────────────────────────────
// DIAGNOSTICS
// ──────────────────────────────────────────────────────────────

/** Get patient's diagnostic tests */
export async function getMyDiagnostics() {
  const { data, error } = await supabase
    .from('diagnostics')
    .select(`
      id, test_name, status, scheduled_at, result_notes, report_url, created_at,
      facilities:facility_id (name),
      requested_by:requested_by ( profiles:profile_id (full_name) )
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Doctor: request a diagnostic test */
export async function requestDiagnostic({ patientId, facilityId, testName, scheduledAt }) {
  const doctorResult = await supabase
    .from('doctors').select('id').single()
  if (doctorResult.error) throw doctorResult.error

  const { data, error } = await supabase
    .from('diagnostics')
    .insert({
      patient_id: patientId,
      requested_by: doctorResult.data.id,
      facility_id: facilityId,
      test_name: testName,
      scheduled_at: scheduledAt,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────────────────────
// MEDICINES
// ──────────────────────────────────────────────────────────────

/** Full-text medicine search using DB function */
export async function searchMedicines(query, facilityId = null, availableOnly = null) {
  const { data, error } = await supabase.rpc('search_medicines', {
    p_query:       query,
    p_facility_id: facilityId,
    p_available:   availableOnly,
  })
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────────────────────
// FOLLOW-UPS (High-Risk)
// ──────────────────────────────────────────────────────────────

/** Admin: get all high-risk follow-ups */
export async function getHighRiskFollowUps() {
  const { data, error } = await supabase
    .from('follow_ups')
    .select(`
      id, category, risk_level, last_visit, next_due, notes, status,
      patients:patient_id (
        id, patient_code,
        profiles:profile_id (full_name, phone)
      ),
      doctors:doctor_id (
        profiles:profile_id (full_name)
      )
    `)
    .in('status', ['overdue', 'due_soon'])
    .order('next_due', { ascending: true })
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────────────────────

/** Get current user's notifications */
export async function getMyNotifications(unreadOnly = false) {
  let query = supabase
    .from('notifications')
    .select('id, type, title, body, is_read, action_url, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (unreadOnly) query = query.eq('is_read', false)
  const { data, error } = await query
  if (error) throw error
  return data
}

/** Mark notifications as read */
export async function markNotificationsRead(ids) {
  const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids })
  if (error) throw error
}

/** Subscribe to realtime notifications */
export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, callback)
    .subscribe()
}

// ──────────────────────────────────────────────────────────────
// FACILITIES
// ──────────────────────────────────────────────────────────────

/** Get all facilities (public, no RLS) */
export async function getFacilities() {
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .order('type', { ascending: true })
  if (error) throw error
  return data
}

/** Get doctors at a facility */
export async function getDoctorsByFacility(facilityId) {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      id, specialization, is_available,
      profiles:profile_id (full_name, phone)
    `)
    .eq('facility_id', facilityId)
    .eq('is_available', true)
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ──────────────────────────────────────────────────────────────

/** Get admin analytics snapshot */
export async function getAdminDashboard() {
  const { data, error } = await supabase
    .from('admin_dashboard_view')
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Get quality indicators for admin dashboard */
export async function getQualityIndicators() {
  const { data, error } = await supabase
    .from('quality_indicators_view')
    .select('*')
  if (error) throw error
  return data
}

/** Get rich quality monitor metrics */
export async function getQualityMonitorMetrics() {
  const { data, error } = await supabase
    .from('quality_monitor_metrics_view')
    .select('*')
  if (error) throw error
  return data
}

/** Get weekly consultations for admin dashboard */
export async function getWeeklyConsultations() {
  const { data, error } = await supabase
    .from('weekly_consultations_view')
    .select('*')
  if (error) throw error
  return data
}

export async function getAdminDoctors() {
  const { data, error } = await supabase.from('admin_doctors_view').select('*')
  if (error) throw error
  return data
}

export async function getAdminPatients() {
  const { data, error } = await supabase.from('admin_patients_view').select('*')
  if (error) throw error
  return data
}

export async function getAdminReferrals() {
  const { data, error } = await supabase.from('admin_referrals_view').select('*')
  if (error) throw error
  return data
}

export async function getAdminMedicineStock() {
  const { data, error } = await supabase.from('admin_medicines_view').select('*')
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────────────────────
// TRIAGE
// ──────────────────────────────────────────────────────────────

/** Submit triage via DB function — returns outcome level */
export async function submitTriage({ patientId, symptom, duration, severity, hasChronic }) {
  const { data, error } = await supabase.rpc('submit_triage', {
    p_patient_id:   patientId,
    p_symptom:      symptom,
    p_duration:     duration,
    p_severity:     severity,
    p_has_chronic:  hasChronic,
  })
  if (error) throw error
  return data  // 'routine' | 'priority' | 'urgent' | 'emergency'
}
