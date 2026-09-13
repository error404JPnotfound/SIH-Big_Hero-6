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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Please sign in to continue.')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, phone, preferred_language, is_active, facility_id')
    .eq('id', user.id)
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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data, error } = await supabase
    .from('patients')
    .select(`
      id, patient_code, dob, gender, blood_group,
      address, emergency_contact, allergies, is_high_risk,
      profiles:profile_id (full_name, phone, email)
    `)
    .eq('profile_id', session.user.id)
    .maybeSingle()
  if (error) {
    throw error
  }
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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

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
  if (error) {
    console.warn('[db] getMyAppointments warning:', error.message)
    return []
  }
  return data || []
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
  if (!user) throw new Error('Please sign in to book an appointment.')

  let resolvedDoctorId = doctorId

  // If doctorId is missing or empty, resolve an appropriate active doctor
  if (!resolvedDoctorId) {
    // 1. Try to find an available doctor at this specific facility
    if (facilityId) {
      const { data: facDocs } = await supabase
        .from('doctors')
        .select('id')
        .eq('facility_id', facilityId)
        .eq('is_available', true)
        .limit(1)
      if (facDocs?.length) {
        resolvedDoctorId = facDocs[0].id
      }
    }

    // 2. If no facility doctor found, pick any available doctor from the system
    if (!resolvedDoctorId) {
      const { data: anyDocs } = await supabase
        .from('doctors')
        .select('id')
        .eq('is_available', true)
        .limit(1)
      if (anyDocs?.length) {
        resolvedDoctorId = anyDocs[0].id
      }
    }

    // 3. Fallback to any doctor row in the database
    if (!resolvedDoctorId) {
      const { data: fallbackDocs } = await supabase
        .from('doctors')
        .select('id')
        .limit(1)
      if (fallbackDocs?.length) {
        resolvedDoctorId = fallbackDocs[0].id
      }
    }
  }

  if (!resolvedDoctorId) {
    throw new Error('No attending doctor is currently available to assign to this appointment.')
  }

  const { data, error } = await supabase.rpc('book_appointment', {
    p_patient_profile_id: user.id,
    p_doctor_id: resolvedDoctorId,
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

/** Approve appointment (doctor) */
export async function approveAppointment(appointmentId) {
  return updateAppointmentStatus(appointmentId, 'confirmed')
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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  try {
    const patientResult = await supabase
      .from('patients').select('id').eq('profile_id', session.user.id).single()
    if (patientResult.error || !patientResult.data) return []

    const { data, error } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patientResult.data.id)
      .order('recorded_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.warn('[db] getMyVitals warning:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('[db] getMyVitals exception:', err.message)
    return []
  }
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Please sign in to continue.')
  const doctorResult = await supabase
    .from('doctors').select('id, facility_id').eq('profile_id', user.id).eq('account_status', 'approved').single()
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
  const patient = await getMyPatientRecord()
  if (!patient) return []
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      id, issued_at, pdf_url,
      doctors:doctor_id (
        specialization,
        profiles:profile_id (full_name),
        facilities:facility_id (name)
      ),
      prescription_items (id, medicine_name, dosage, frequency, duration, instructions)
    `)
    .eq('patient_id', patient.id)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Create a prescription with items */
export async function createPrescription(patientId, consultationId, items) {
  if (!patientId || !Array.isArray(items) || !items.length || items.some(i => !i || !['medicine_name','dosage','frequency','duration'].every(k => String(i[k] || '').trim()))) {
    throw new Error('Enter medicine name, dosage, frequency and duration for every item.')
  }
  const { data, error } = await supabase.rpc('issue_prescription', {
    p_patient_id: patientId, p_consultation_id: consultationId || null,
    p_items: items.map(item => Object.fromEntries(['medicine_name','dosage','frequency','duration','instructions'].map(k => [k, String(item[k] || '').trim()])))
  })
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Prescription setup is incomplete. Apply portal_integration_migration.sql in Supabase.')
    throw error
  }
  window.dispatchEvent(new Event('careconnect:records-updated'))
  return data
}

// ──────────────────────────────────────────────────────────────
// REFERRALS
// ──────────────────────────────────────────────────────────────

/** Get my referrals (as patient) */
export async function getMyReferrals() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('referrals')
    .select(`
      id, department, reason, urgency, status, notes, created_at, updated_at,
      from_fac:from_facility ( name ),
      to_fac:to_facility ( name ),
      referring_doctor:referring_doctor ( profiles:profile_id (full_name) )
    `)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[db] getMyReferrals warning:', error.message)
    return []
  }
  return data || []
}

/** Get patient's own follow-up schedule */
export async function getMyFollowUps() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  try {
    const { data: patientRow, error: patientErr } = await supabase
      .from('patients').select('id').eq('profile_id', session.user.id).single()
    if (patientErr || !patientRow) return []

    const { data, error } = await supabase
      .from('follow_ups')
      .select('id, category, risk_level, last_visit, next_due, notes, status')
      .eq('patient_id', patientRow.id)
      .order('next_due', { ascending: true })
    if (error) {
      console.warn('[db] getMyFollowUps warning:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('[db] getMyFollowUps exception:', err.message)
    return []
  }
}

/** Get patient's active queue entry for today */
export async function getMyQueueEntry() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find today's appointments for this patient
    const { data: appts, error: apptErr } = await supabase
      .from('appointments')
      .select(`
        id, facility_id,
        facilities:facility_id ( id, name )
      `)
      .in('status', ['scheduled','confirmed','in_progress'])
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
    if (apptErr || !appts || appts.length === 0) return null

    const appt = appts[0]

    // Find the queue entry for this appointment
    const { data: queue, error: qErr } = await supabase
      .from('queues')
      .select('id, queue_number, position, status, facility_id')
      .eq('appointment_id', appt.id)
      .single()
    if (qErr && qErr.code !== 'PGRST116') return null

    return queue ? { ...queue, facility: appt.facilities, appointment_id: appt.id } : null
  } catch (err) {
    console.warn('[db] getMyQueueEntry exception:', err.message)
    return null
  }
}

/** Cancel an appointment (patient action) */
export async function cancelAppointment(appointmentId) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(appointmentId))
  if (!isUuid) {
    return { id: appointmentId, status: 'cancelled' }
  }

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .maybeSingle()
  if (error) throw error
  return data || { id: appointmentId, status: 'cancelled' }
}

/** Get patient's consultation + diagnosis + prescription timeline for Records */
export async function getMyConsultationTimeline() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  try {
    const { data: patientRow, error: patientErr } = await supabase
      .from('patients').select('id').eq('profile_id', session.user.id).single()
    if (patientErr || !patientRow) return []

    const { data, error } = await supabase
      .from('consultations')
      .select(`
        id, chief_complaint, clinical_findings, assessment, plan,
        started_at, created_at,
        doctors:doctor_id ( profiles:profile_id (full_name) ),
        facilities:facility_id ( name ),
        diagnoses ( id, icd_code, description, is_chronic, created_at ),
        prescriptions ( id, issued_at,
          prescription_items ( medicine_name, dosage, frequency, duration )
        )
      `)
      .eq('patient_id', patientRow.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.warn('[db] getMyConsultationTimeline warning:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('[db] getMyConsultationTimeline exception:', err.message)
    return []
  }
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

/**
 * Get the current patient's diagnostic test requests.
 * Resolves patient_id explicitly for belt-and-suspenders safety,
 * joins doctor name via doctors → profiles and facility name.
 * Ordered newest first. RLS also restricts rows to own patient.
 */
export async function getMyDiagnostics() {
  const patient = await getMyPatientRecord()
  if (!patient) return []
  const { data, error } = await supabase.from('diagnostics').select(
    'id,test_name,status,scheduled_at,result_notes,report_url,created_at,updated_at,doctors:requested_by(id,specialization,profiles:profile_id(full_name)),facilities:facility_id(id,name,type,address)'
  ).eq('patient_id', patient.id).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * Generate a time-limited signed URL for a diagnostic report stored in Supabase Storage.
 * @param {string} reportUrl - Full https URL or a Storage path e.g. "reports/uuid/file.pdf"
 * @param {string} [bucket='reports'] - Storage bucket name
 * @param {number} [expiresIn=3600] - Seconds until expiry
 * @returns {Promise<string>} A usable URL for viewing or downloading the report
 */
export async function getDiagnosticSignedUrl(reportUrl, bucket = 'reports', expiresIn = 3600) {
  if (!reportUrl) throw new Error('No report URL provided')

  // If already a full HTTP URL, return it as-is
  if (reportUrl.startsWith('http://') || reportUrl.startsWith('https://')) {
    return reportUrl
  }

  // Otherwise it's a Supabase Storage path — create a signed URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(reportUrl, expiresIn)
  if (error) throw error
  return data.signedUrl
}

/** Subscribe to realtime diagnostic changes */
export function subscribeToDiagnostics(callback) {
  return supabase
    .channel('realtime:diagnostics')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'diagnostics',
    }, callback)
    .subscribe()
}

/** Doctor: request a diagnostic test */
export async function requestDiagnostic({ patientId, facilityId, testName, scheduledAt }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Please sign in to continue.')
  const doctorResult = await supabase
    .from('doctors').select('id').eq('profile_id', user.id).single()
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

/** Get a single facility by ID */
export async function getFacilityById(id) {
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}


/** Get doctors at a facility */
export async function getDoctorsByFacility(facilityId) {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      id, specialization, is_available, account_status,
      profiles:profile_id (full_name, phone)
    `)
    .eq('facility_id', facilityId)
    .eq('is_available', true)
    .eq('account_status', 'approved')
  if (error) {
    console.warn('[db] getDoctorsByFacility warning:', error.message)
    return []
  }
  return data || []
}

/** Get all available active doctors (fallback for facilities without specific doctors) */
export async function getAvailableDoctors() {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      id,
      profile_id,
      facility_id,
      specialization,
      department,
      qualification,
      experience_years,
      designation,
      consultation_type,
      available_days,
      working_hours,
      emergency_duty,
      is_available,
      account_status,
      profiles:profile_id (
        id,
        full_name,
        phone,
        email
      ),
      facilities:facility_id (
        id,
        name,
        type,
        district
      )
    `)
    .eq('account_status', 'approved')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[db] getAvailableDoctors error:',
      error
    )

    throw error
  }

  return (data || []).map(doc => ({
    id: doc.id,

    profile_id: doc.profile_id,

    facility_id: doc.facility_id,

    name:
      doc.profiles?.full_name ||
      'Doctor',

    email:
      doc.profiles?.email ||
      '',

    phone:
      doc.profiles?.phone ||
      '',

    specialization:
      doc.specialization ||
      doc.department ||
      'General Medicine',

    department:
      doc.department ||
      '',

    qualification:
      doc.qualification ||
      '',

    experience:
      doc.experience_years ||
      0,

    designation:
      doc.designation ||
      'Doctor',

    consultation_type:
      doc.consultation_type,

    available_days:
      doc.available_days || [],

    working_hours:
      doc.working_hours,

    emergency_duty:
      doc.emergency_duty,

    facility:
      doc.facilities?.name ||
      'Healthcare Facility',

    facility_type:
      doc.facilities?.type ||
      '',

    district:
      doc.facilities?.district ||
      '',

    is_available:
      doc.is_available,

    account_status:
      doc.account_status,
  }))
}

// ──────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ──────────────────────────────────────────────────────────────

/** Get admin analytics snapshot */


/** Get quality indicators for admin dashboard */


/** Get rich quality monitor metrics */


/** Get weekly consultations for admin dashboard */


export async function getAdminDoctors() {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      id,
      profile_id,
      facility_id,
      specialization,
      gender,
      qualification,
      experience_years,
      department,
      designation,
      reg_number,
      available_days,
      working_hours,
      consultation_type,
      emergency_duty,
      account_status,
      rejection_reason,
      is_available,
      created_at,
      profiles:profile_id (full_name, email, phone),
      facilities:facility_id (name)
    `)
  if (error) throw error

  return (data || [])
    .map(doc => ({
      ...doc,
      name: doc.profiles?.full_name || `Doctor ${doc.reg_number}`,
      email: doc.profiles?.email || '',
      phone: doc.profiles?.phone || '',
      facility: doc.facilities?.name || 'No facility',
      status: doc.account_status === 'pending'
        ? 'Pending'
        : doc.account_status === 'rejected'
          ? 'Rejected'
          : doc.is_available
            ? 'Active'
            : 'On Leave',
    }))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
}

export async function submitDoctorRegistration(form) {
  const required = ['fullName', 'phone', 'email', 'password', 'regNumber', 'qualification', 'specialization', 'experience', 'department', 'facilityId', 'designation']
  const missing = required.filter(key => !String(form[key] ?? '').trim())
  if (missing.length) throw new Error('Please fill in all required doctor registration fields.')

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: form.email.trim(),
    password: form.password,
    options: {
      data: {
        full_name: form.fullName.trim(),
        role: 'doctor',
        phone: form.phone.trim(),
      },
    },
  })
  if (signUpError) throw signUpError

  const authUser = signUpData.user
  if (!authUser?.id) throw new Error('Doctor account could not be created.')

  const { data, error } = await supabase
    .from('doctors')
    .insert({
      profile_id: authUser.id,
      facility_id: form.facilityId,
      specialization: form.specialization.trim(),
      reg_number: form.regNumber.trim(),
      gender: form.gender || null,
      qualification: form.qualification.trim(),
      experience_years: Number(form.experience),
      department: form.department,
      designation: form.designation.trim(),
      available_days: form.availableDays || [],
      working_hours: form.workingHours || null,
      consultation_type: form.consultationType || 'in_person',
      emergency_duty: !!form.emergencyDuty,
      account_status: 'pending',
      rejection_reason: null,
      is_available: false,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.auth.signOut()
  return data
}

export async function updateDoctorApprovalStatus(doctorId, status, rejectionReason = null) {
  if (!['approved', 'rejected'].includes(status)) throw new Error('Invalid doctor approval status.')
  const { data, error } = await supabase
    .from('doctors')
    .update({
      account_status: status,
      rejection_reason: status === 'rejected' ? rejectionReason : null,
      is_available: status === 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', doctorId)
    .select()
    .single()
  if (error) throw error

  if (data?.profile_id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_active: status === 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.profile_id)
    if (profileError) throw profileError
  }

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

// ──────────────────────────────────────────────────────────────
// DOCTOR SPECIALIZED HELPERS
// ──────────────────────────────────────────────────────────────

/** Fetch doctor profile by Auth user profile ID */
export async function getDoctorByProfileId(profileId) {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      id, facility_id, specialization, reg_number, is_available, account_status, rejection_reason,
      facilities:facility_id (id, name, type, address, district)
    `)
    .eq('profile_id', profileId)
    .single()
  if (error) throw error
  return data
}

/** Update doctor availability toggle */
export async function updateDoctorAvailability(doctorId, isAvailable) {
  const { data, error } = await supabase
    .from('doctors')
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq('id', doctorId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Get full doctor queue for facility & optional doctor filter */
export async function getDoctorQueue(facilityId, doctorId = null) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('queues')
    .select(`
      id, queue_number, position, status, called_at, started_at, created_at,
      appointments:appointment_id (
        id, doctor_id, reason, mode, scheduled_at, status,
        patients:patient_id (
          id, patient_code, dob, gender, blood_group, allergies, is_high_risk,
          profiles:profile_id (full_name, phone, email)
        )
      )
    `)
    .eq('facility_id', facilityId)
    .gte('created_at', today.toISOString())
    .order('position', { ascending: true })

  if (error) throw error

  if (doctorId) {
    return (data || []).filter(item => item.appointments?.doctor_id === doctorId)
  }
  return data || []
}

/** Fetch full patient profile including history, vitals, referrals, diagnostics, and prescriptions */
export async function getPatientProfileById(patientId) {
  const { data: patient, error: pErr } = await supabase
    .from('patients')
    .select(`
      id, patient_code, dob, gender, blood_group, address, emergency_contact, allergies, is_high_risk, created_at,
      profiles:profile_id (full_name, phone, email)
    `)
    .eq('id', patientId)
    .single()

  if (pErr) throw pErr

  const [vitalsRes, apptsRes, referralsRes, diagnosticsRes, prescriptionsRes, diagnosesRes] = await Promise.all([
    supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(10),

    supabase
      .from('appointments')
      .select(`
        id, scheduled_at, mode, status, reason, notes, created_at,
        doctors:doctor_id ( specialization, profiles:profile_id (full_name) ),
        facilities:facility_id ( name )
      `)
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: false })
      .limit(20),

    supabase
      .from('referrals')
      .select(`
        id, department, reason, urgency, status, notes, created_at,
        from_facility:from_facility ( name ),
        to_facility:to_facility ( name ),
        referring_doctor:referring_doctor ( profiles:profile_id (full_name) )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),

    supabase
      .from('diagnostics')
      .select(`
        id, test_name, status, scheduled_at, result_notes, report_url, created_at,
        facilities:facility_id ( name ),
        requested_by:requested_by ( profiles:profile_id (full_name) )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),

    supabase
      .from('prescriptions')
      .select(`
        id, issued_at,
        doctors:doctor_id ( profiles:profile_id (full_name) ),
        prescription_items ( id, medicine_name, dosage, frequency, duration, instructions )
      `)
      .eq('patient_id', patientId)
      .order('issued_at', { ascending: false }),
    supabase.from('diagnoses').select('id, description, is_chronic, created_at').eq('patient_id', patientId).order('created_at', { ascending: false }),
  ])

  for (const result of [vitalsRes, apptsRes, referralsRes, diagnosticsRes, prescriptionsRes, diagnosesRes]) {
    if (result.error) throw result.error
  }

  return {
    patient,
    diagnoses: diagnosesRes.data || [],
    vitals: vitalsRes.data || [],
    appointments: apptsRes.data || [],
    referrals: referralsRes.data || [],
    diagnostics: diagnosticsRes.data || [],
    prescriptions: prescriptionsRes.data || [],
  }
}

/** Save complete consultation notes */
export async function saveConsultationComplete({
  appointmentId,
  patientId,
  doctorId,
  facilityId,
  chiefComplaint,
  clinicalFindings,
  assessment,
  plan,
}) {
  const { data: consultation, error: cErr } = await supabase
    .from('consultations')
    .insert({
      appointment_id: appointmentId || null,
      patient_id: patientId,
      doctor_id: doctorId,
      facility_id: facilityId || null,
      chief_complaint: chiefComplaint,
      clinical_findings: clinicalFindings,
      assessment: assessment,
      plan: plan,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (cErr) throw cErr
  return consultation
}


export async function getDoctorPatients(profileId) {
  const doctor = await getDoctorByProfileId(profileId)
  const { data, error } = await supabase.from('appointments')
    .select('patients:patient_id (id, patient_code, profiles:profile_id (full_name))')
    .eq('doctor_id', doctor.id)
  if (error) throw error
  return [...new Map((data || []).filter(row => row.patients).map(row => [row.patients.id, row.patients])).values()]
}

/** Doctor: fetch clinical worklists for referrals, diagnostics, prescriptions and follow-ups */
export async function getDoctorClinicalWorklists(profileId) {
  const doctor = await getDoctorByProfileId(profileId)

  const [referralsRes, diagnosticsRes, prescriptionsRes, followUpsRes] = await Promise.all([
    supabase
      .from('referrals')
      .select(`
        id, department, reason, urgency, status, notes, created_at,
        patients:patient_id (id, patient_code, profiles:profile_id (full_name, phone)),
        from_facility:from_facility (name),
        to_facility:to_facility (name)
      `)
      .eq('referring_doctor', doctor.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('diagnostics')
      .select(`
        id, test_name, status, scheduled_at, result_notes, report_url, created_at,
        patients:patient_id (id, patient_code, profiles:profile_id (full_name, phone)),
        facilities:facility_id (name)
      `)
      .eq('requested_by', doctor.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('prescriptions')
      .select(`
        id, issued_at, pdf_url,
        patients:patient_id (id, patient_code, profiles:profile_id (full_name, phone)),
        prescription_items (id, medicine_name, dosage, frequency, duration, instructions)
      `)
      .eq('doctor_id', doctor.id)
      .order('issued_at', { ascending: false }),

    supabase
      .from('follow_ups')
      .select(`
        id, category, risk_level, last_visit, next_due, status, notes,
        patients:patient_id (id, patient_code, profiles:profile_id (full_name, phone))
      `)
      .eq('doctor_id', doctor.id)
      .order('next_due', { ascending: true }),
  ])

  for (const result of [referralsRes, diagnosticsRes, prescriptionsRes, followUpsRes]) {
    if (result.error) throw result.error
  }

  return {
    doctor,
    referrals: referralsRes.data || [],
    diagnostics: diagnosticsRes.data || [],
    prescriptions: prescriptionsRes.data || [],
    followUps: followUpsRes.data || [],
  }
}
export { dashboard as getAdminDashboard, quality as getQualityIndicators, quality as getQualityMonitorMetrics, weekly as getWeeklyConsultations, patients as getAdminPatients, referrals as getAdminReferrals, stock as getAdminMedicineStock } from './adminLive'
