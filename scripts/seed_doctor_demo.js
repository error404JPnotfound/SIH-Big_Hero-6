// Run locally: node --env-file=.env scripts/seed_doctor_demo.js
// Server-only script. Never import into the frontend.
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) throw new Error('Missing Supabase URL or server secret in .env')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const db = createClient(url, key, options)
const id = label => {
  const hex = createHash('sha256').update(`careconnect-doctor-demo-v1:${label}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
const check = result => { if (result.error) throw new Error(result.error.message); return result.data }
const save = async (table, rows, onConflict = 'id') => {
  check(await db.from(table).upsert(rows, { onConflict }))
}
const now = new Date()
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
const today = hour => new Date(`${date}T${hour}:00+05:30`).toISOString()
const daysAgo = days => new Date(now.getTime() - days * 86400000).toISOString()
const users = []
for (let page = 1; ; page++) {
  const data = check(await db.auth.admin.listUsers({ page, perPage: 100 }))
  users.push(...data.users)
  if (data.users.length < 100) break
}
let doctorPassword
async function account(email, name, role, { allowExisting = false } = {}) {
  const existing = users.find(user => user.email === email)
  if (existing) {
    if (existing.user_metadata?.demo_seed !== 'doctor-v1' && !allowExisting) throw new Error(`Refusing to change unmarked account ${email}`)
    if (role === 'doctor') {
      doctorPassword = randomBytes(18).toString('base64url') + '!aA1'
      check(await db.auth.admin.updateUserById(existing.id, {
        password: doctorPassword,
        email_confirm: true,
        user_metadata: {
          ...existing.user_metadata,
          full_name: name,
          role,
          demo_seed: 'doctor-v1',
        },
      }))
    }
    return existing.id
  }
  const password = randomBytes(18).toString('base64url') + '!aA1'
  const data = check(await db.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { full_name: name, role, demo_seed: 'doctor-v1' } }))
  if (role === 'doctor') doctorPassword = password
  return data.user.id
}

const facility = id('facility'), hospital = id('hospital'), doctor = id('doctor')
await save('facilities', [
  { id: facility, name: 'DEMO - CareConnect PHC', type: 'phc', status: 'operational', district: 'Khandwa', state: 'Madhya Pradesh', capacity: 100, beds: 10 },
  { id: hospital, name: 'DEMO - Referral Hospital', type: 'district_hospital', status: 'operational', district: 'Khandwa', state: 'Madhya Pradesh', capacity: 200, beds: 50 },
])
const email = process.env.DOCTOR_DEMO_EMAIL || 'diyathakrar68@gmail.com'
const doctorName = process.env.DOCTOR_DEMO_NAME || 'Dr. Diya Thakrar'
const profile = await account(email, doctorName, 'doctor', { allowExisting: true })
await save('profiles', { id: profile, email, full_name: doctorName, role: 'doctor', facility_id: facility, is_active: true })
await save('doctors', { id: doctor, profile_id: profile, facility_id: facility, specialization: 'General Medicine', reg_number: 'DEMO-DOCTOR-V1', qualification: 'MBBS', experience_years: 5, department: 'General Medicine', designation: 'Doctor', account_status: 'approved', is_available: true })
// Print immediately so credentials remain available even if a later insert fails.
console.log('Demo doctor email:', email)
console.log(`Demo doctor password: ${doctorPassword}`)

const samples = [
  ['Aarav Demo', '1980-04-12', 'male', 'O+', 'Blood pressure follow-up', true],
  ['Meera Demo', '1992-08-23', 'female', 'B+', 'Routine wellness review', false],
  ['Rohan Demo', '1975-01-18', 'male', 'A+', 'Blood sugar follow-up', true],
  ['Kavya Demo', '2000-11-07', 'female', 'AB+', 'Seasonal cough review', false],
  ['Ishaan Demo', '1988-06-15', 'male', 'O-', 'Annual health review', false],
]
for (const [index, [name, dob, gender, blood_group, reason, risk]] of samples.entries()) {
  const n = index + 1, patient = id(`patient-${n}`), appointment = id(`appointment-${n}`)
  const consultation = id(`consultation-${n}`), prescription = id(`prescription-${n}`)
  const patientEmail = `patient${n}.demo@careconnect.example`
  const patientProfile = await account(patientEmail, name, 'patient')
  await save('profiles', { id: patientProfile, email: patientEmail, full_name: name, role: 'patient', is_active: true })
  // The signup trigger may already have generated the patient ID: preserve it.
  const existing = check(await db.from('patients').select('id').eq('profile_id', patientProfile).maybeSingle())
  const patientId = existing?.id || patient
  await save('patients', { id: patientId, profile_id: patientProfile, patient_code: `DEMO-DOC-${n}`, dob, gender, blood_group,
    address: 'Fictional demo address, Khandwa', allergies: risk ? ['Demo allergy: penicillin'] : [], is_high_risk: risk })
  await save('appointments', [
    { id: appointment, patient_id: patientId, doctor_id: doctor, facility_id: facility, scheduled_at: today(`1${index}:00`), mode: index === 1 ? 'teleconsultation' : 'in_person', status: index === 4 ? 'completed' : index === 0 ? 'in_progress' : 'confirmed', reason, notes: 'Fictional demo data' },
    { id: id(`history-${n}`), patient_id: patientId, doctor_id: doctor, facility_id: facility, scheduled_at: daysAgo(14), mode: 'in_person', status: 'completed', reason: 'Previous demo consultation', notes: 'Fictional demo history' },
  ])
  await save('queues', { id: id(`queue-${n}`), appointment_id: appointment, facility_id: facility, queue_number: `DEMO-${n.toString().padStart(3, '0')}`, position: n,
    status: index === 4 ? 'completed' : index === 0 ? 'in_consultation' : 'waiting', created_at: now.toISOString(),
    started_at: index === 0 || index === 4 ? now.toISOString() : null, completed_at: index === 4 ? now.toISOString() : null })
  await save('consultations', { id: consultation, appointment_id: id(`history-${n}`), patient_id: patientId, doctor_id: doctor, facility_id: facility,
    chief_complaint: reason, assessment: 'Fictional assessment for testing', plan: 'Demo follow-up', started_at: daysAgo(14), ended_at: daysAgo(14) })
  await save('vitals', [0, 1].map(v => ({ id: id(`vitals-${n}-${v}`), patient_id: patientId, consultation_id: consultation, recorded_by: profile,
    bp_systolic: 118 + n * 4 + v, bp_diastolic: 76 + n, heart_rate: 70 + n, temperature: 36.8, spo2: 98,
    blood_sugar: 90 + n * 12, weight: 60 + n * 3, height: 165 + n, recorded_at: daysAgo(v * 14) })))
  await save('diagnoses', { id: id(`diagnosis-${n}`), consultation_id: consultation, patient_id: patientId, description: `${reason} (demo)`, is_chronic: risk })
  await save('prescriptions', { id: prescription, consultation_id: consultation, patient_id: patientId, doctor_id: doctor, issued_at: daysAgo(14) })
  await save('prescription_items', { id: id(`item-${n}`), prescription_id: prescription, medicine_name: 'DEMO medicine - not for clinical use', dosage: 'Sample dose', frequency: 'Sample frequency', duration: '7 days', instructions: 'Fictional record for UI testing only' })
  await save('referrals', { id: id(`referral-${n}`), patient_id: patientId, referring_doctor: doctor, from_facility: facility, to_facility: hospital,
    department: risk ? 'General Medicine' : 'Diagnostics', reason: 'Fictional specialist review', urgency: risk ? 'urgent' : 'routine', status: index === 4 ? 'completed' : 'pending', notes: 'Demo referral' })
  await save('diagnostics', { id: id(`diagnostic-${n}`), patient_id: patientId, requested_by: doctor, facility_id: hospital, test_name: index % 2 ? 'Complete blood count (demo)' : 'Blood glucose (demo)',
    status: index % 2 ? 'scheduled' : 'result_ready', scheduled_at: today('15:00'), result_notes: index % 2 ? null : 'Fictional result available for UI testing' })
  await save('follow_ups', { id: id(`followup-${n}`), patient_id: patientId, doctor_id: doctor, category: reason, risk_level: risk ? 'high' : 'low', last_visit: daysAgo(14).slice(0, 10), next_due: date, status: 'due_soon', notes: 'Demo follow-up' })
}
console.log('Seeded 5 patients, 10 appointments, 5 queue entries, 10 vitals, and 5 each of consultations, diagnoses, prescriptions, referrals, diagnostics and follow-ups.')
if (doctorPassword) {
  const client = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, options)
  check(await client.auth.signInWithPassword({ email, password: doctorPassword }))
  const visible = check(await client.from('appointments').select('id, patients:patient_id (id, profiles:profile_id (full_name))').eq('doctor_id', doctor))
  console.log('Authenticated doctor can read appointments:', visible.length)
  const namesVisible = visible.every(row => row.patients?.profiles?.full_name)
  console.log('Patient names visible:', namesVisible)
  if (!namesVisible) console.log('ACTION REQUIRED: run doctor_pages_migration.sql in Supabase SQL Editor to enable patient name access.')
  const requiredTables = ['queues', 'vitals', 'diagnoses', 'prescriptions', 'prescription_items', 'referrals', 'diagnostics', 'follow_ups']
  const accessCounts = {}
  for (const table of requiredTables) {
    const rows = check(await client.from(table).select('id'))
    accessCounts[table] = rows.length
  }
  console.log('Authenticated table access:', accessCounts)
  await client.auth.signOut()
}
