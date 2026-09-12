// Mock data for demonstration - replace with Supabase queries in production

export const MOCK_PATIENT = {
  id: 'p-001',
  name: 'Priya Sharma',
  age: 34,
  gender: 'Female',
  phone: '+91 98765 43210',
  dob: '1990-03-15',
  address: 'Village Rampur, Block Khandwa, Madhya Pradesh - 450001',
  blood_group: 'B+',
  emergency_contact: 'Ramesh Sharma: +91 87654 32109',
  preferred_language: 'Hindi',
  patient_id: 'PHC-MP-2024-00432',
  avatar: null,
}

export const MOCK_DOCTOR = {
  id: 'd-001',
  name: 'Dr. Arjun Mehta',
  specialization: 'General Physician & Community Medicine',
  facility: 'Primary Health Centre, Khandwa',
  reg_no: 'MCI-2015-04823',
  phone: '+91 99001 12345',
  email: 'arjun.mehta@pdhc.gov.in',
  avatar: null,
  patients_today: 28,
  completed: 14,
  waiting: 8,
  high_risk: 3,
}

export const MOCK_APPOINTMENTS = [
  { id: 'a-001', date: '2026-09-12', time: '10:30', doctor: 'Dr. Arjun Mehta', facility: 'PHC Khandwa', type: 'Follow-up', status: 'confirmed', mode: 'in-person', queue_no: 'A-027' },
  { id: 'a-002', date: '2026-09-18', time: '14:00', doctor: 'Dr. Sunita Rao', facility: 'District Hospital Khandwa', type: 'Specialist Consultation', status: 'pending', mode: 'teleconsultation', queue_no: 'B-004' },
]

export const MOCK_QUEUE = {
  current: 'A-021',
  yours: 'A-027',
  ahead: 6,
  eta_minutes: 35,
}

export const MOCK_VITALS = {
  bp: '118/76',
  sugar: '98 mg/dL',
  weight: '62 kg',
  heart_rate: '74 bpm',
  last_updated: '2026-09-10T09:15:00',
}

export const MOCK_REFERRALS = [
  { id: 'r-001', to: 'District Hospital Khandwa', dept: 'Cardiology', reason: 'Chest pain evaluation', date: '2026-09-08', status: 'accepted', doctor: 'Dr. Arjun Mehta' },
  { id: 'r-002', to: 'Sub-Division Hospital', dept: 'Ophthalmology', reason: 'Routine vision checkup', date: '2026-08-20', status: 'completed', doctor: 'Dr. Priyanka Das' },
]

export const MOCK_MEDICINES = [
  { id: 'm-001', name: 'Paracetamol 500mg', available: true, facility: 'PHC Khandwa', distance: '2.1 km', updated: '12 mins ago', govt: true },
  { id: 'm-002', name: 'Metformin 500mg', available: true, facility: 'PHC Khandwa', distance: '2.1 km', updated: '1 hour ago', govt: true },
  { id: 'm-003', name: 'Amoxicillin 250mg', available: false, facility: 'Sub-Centre Rampur', distance: '0.4 km', updated: '3 hours ago', govt: true },
  { id: 'm-004', name: 'Amlodipine 5mg', available: true, facility: 'CHC Sanawad', distance: '8.7 km', updated: '45 mins ago', govt: true },
  { id: 'm-005', name: 'Atorvastatin 10mg', available: true, facility: 'District Hospital Khandwa', distance: '14 km', updated: '2 hours ago', govt: false },
]

export const MOCK_DIAGNOSTICS = [
  { id: 'dx-001', name: 'Complete Blood Count', requested_by: 'Dr. Arjun Mehta', facility: 'PHC Lab, Khandwa', date: '2026-09-05', status: 'result_ready', result: 'Normal' },
  { id: 'dx-002', name: 'HbA1c', requested_by: 'Dr. Arjun Mehta', facility: 'District Hospital Lab', date: '2026-09-10', status: 'scheduled', result: null },
  { id: 'dx-003', name: 'Chest X-Ray', requested_by: 'Dr. Sunita Rao', facility: 'District Hospital Khandwa', date: '2026-09-08', status: 'processing', result: null },
]

export const MOCK_DOCTOR_QUEUE = [
  { id: 'q-001', queue_no: 'A-022', name: 'Suresh Patel', age: 58, reason: 'Hypertension follow-up', priority: 'high', waiting_since: '35 mins', appointment: '09:30' },
  { id: 'q-002', queue_no: 'A-023', name: 'Meena Bai', age: 32, reason: 'Prenatal checkup (32 weeks)', priority: 'medium', waiting_since: '28 mins', appointment: '09:45' },
  { id: 'q-003', queue_no: 'A-024', name: 'Raju Kumar', age: 45, reason: 'Diabetes management', priority: 'medium', waiting_since: '22 mins', appointment: '10:00' },
  { id: 'q-004', queue_no: 'A-025', name: 'Anjali Verma', age: 7, reason: 'Fever, 3 days', priority: 'low', waiting_since: '15 mins', appointment: '10:15' },
  { id: 'q-005', queue_no: 'A-026', name: 'Mohammed Khan', age: 67, reason: 'TB treatment follow-up', priority: 'high', waiting_since: '8 mins', appointment: '10:30' },
]

export const MOCK_FACILITIES = [
  { id: 'f-001', name: 'PHC Khandwa', type: 'Primary Health Centre', status: 'operational', doctors: 4, patients_today: 87, capacity: 120, location: 'Khandwa', beds: 10 },
  { id: 'f-002', name: 'Sub-Centre Rampur', type: 'Sub-Centre', status: 'operational', doctors: 1, patients_today: 32, capacity: 40, location: 'Rampur', beds: 2 },
  { id: 'f-003', name: 'District Hospital Khandwa', type: 'District Hospital', status: 'busy', doctors: 18, patients_today: 342, capacity: 400, location: 'Khandwa City', beds: 150 },
  { id: 'f-004', name: 'CHC Sanawad', type: 'Rural Hospital', status: 'limited_capacity', doctors: 6, patients_today: 98, capacity: 100, location: 'Sanawad', beds: 30 },
]

export const MOCK_HIGH_RISK = [
  { id: 'hr-001', name: 'Suresh Patel', age: 58, category: 'Hypertension', risk: 'high', last_visit: '2026-09-01', next_due: '2026-09-15', provider: 'Dr. Arjun Mehta', status: 'overdue' },
  { id: 'hr-002', name: 'Meena Bai', age: 32, category: 'Maternal Health', risk: 'medium', last_visit: '2026-09-05', next_due: '2026-09-19', provider: 'Dr. Priyanka Das', status: 'due_soon' },
  { id: 'hr-003', name: 'Mohammed Khan', age: 67, category: 'TB', risk: 'high', last_visit: '2026-09-10', next_due: '2026-09-24', provider: 'Dr. Arjun Mehta', status: 'on_track' },
  { id: 'hr-004', name: 'Ramabai Devi', age: 71, category: 'Diabetes', risk: 'critical', last_visit: '2026-08-20', next_due: '2026-09-05', provider: 'Dr. Arjun Mehta', status: 'overdue' },
]

export const MOCK_ADMIN_STATS = {
  total_patients: 12847,
  active_doctors: 47,
  facilities: 12,
  today_consultations: 684,
  pending_referrals: 38,
  high_risk_patients: 203,
  medicine_shortages: 7,
  diagnostic_delays: 14,
}
