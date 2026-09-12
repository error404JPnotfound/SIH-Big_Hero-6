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

// ─── Rich facility data for FacilityFinder (Khandwa district, MP) ─────────────

export const MOCK_DOCTORS_BY_FACILITY = {
  'f-001': [
    { id: 'doc-01', name: 'Dr. Arjun Mehta',    specialization: 'General Physician',     isAvailable: true,  phone: '07322-234567' },
    { id: 'doc-02', name: 'Dr. Priyanka Das',   specialization: 'Gynaecologist',         isAvailable: true,  phone: '07322-234568' },
    { id: 'doc-03', name: 'Dr. Ramesh Joshi',   specialization: 'Paediatrician',         isAvailable: false, phone: '07322-234569' },
  ],
  'f-002': [
    { id: 'doc-04', name: 'Dr. Sunita Rao',     specialization: 'General Medicine',      isAvailable: true,  phone: '07322-245001' },
    { id: 'doc-05', name: 'Dr. Vijay Sharma',   specialization: 'Orthopaedics',          isAvailable: true,  phone: '07322-245002' },
    { id: 'doc-06', name: 'Dr. Anita Patel',    specialization: 'Gynaecology',           isAvailable: true,  phone: '07322-245003' },
    { id: 'doc-07', name: 'Dr. K. Iyer',        specialization: 'Internal Medicine',     isAvailable: false, phone: '07322-245004' },
  ],
  'f-003': [
    { id: 'doc-08', name: 'Dr. Mohit Gupta',    specialization: 'General Physician',     isAvailable: true,  phone: '07322-256001' },
  ],
  'f-004': [
    { id: 'doc-09', name: 'Dr. Leela Sharma',   specialization: 'General Physician',     isAvailable: true,  phone: '07322-267001' },
    { id: 'doc-10', name: 'Dr. Nikhil Tiwari',  specialization: 'Dental Surgeon',        isAvailable: true,  phone: '07322-267002' },
  ],
  'f-005': [
    { id: 'doc-11', name: 'Dr. Rupa Verma',     specialization: 'General Physician',     isAvailable: false, phone: '07322-278001' },
  ],
  'f-006': [
    { id: 'doc-12', name: 'Dr. S. Krishnan',    specialization: 'Radiologist',           isAvailable: true,  phone: '07322-289001' },
    { id: 'doc-13', name: 'Dr. Meena Singh',    specialization: 'Pathologist',           isAvailable: true,  phone: '07322-289002' },
  ],
}

export const MOCK_FACILITIES = [
  {
    id: 'f-001',
    name: 'PHC Khandwa',
    type: 'PHC',
    address: 'Near Bus Stand, Civil Lines, Khandwa',
    village: 'Khandwa',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.8265,
    longitude: 76.3572,
    phone: '07322-234567',
    emergencyPhone: '07322-234500',
    services: ['OPD', 'Maternal & Child Health', 'Immunisation', 'Family Planning', 'TB DOTS', 'Malaria Control', 'First Aid'],
    diagnosticsAvailable: ['Blood Sugar', 'Haemoglobin', 'Urine Routine', 'Malaria Test', 'Pregnancy Test'],
    emergencyAvailable: true,
    openingHours: 'Mon–Sat 8:00 AM – 2:00 PM',
    bedCapacity: 10,
    availableBeds: 4,
    doctorsAvailableNow: 2,
  },
  {
    id: 'f-002',
    name: 'District Hospital Khandwa',
    type: 'District Hospital',
    address: 'Hospital Road, Khandwa City',
    village: 'Khandwa',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.8198,
    longitude: 76.3489,
    phone: '07322-245000',
    emergencyPhone: '07322-245001',
    services: ['OPD', 'Emergency', 'Surgery', 'Maternity', 'Paediatrics', 'Orthopaedics', 'ICU', 'Blood Bank', 'X-Ray', 'Dialysis'],
    diagnosticsAvailable: ['Complete Blood Count', 'Blood Culture', 'X-Ray', 'Ultrasound', 'ECG', 'CT Scan', 'Pathology Lab'],
    emergencyAvailable: true,
    openingHours: '24 × 7',
    bedCapacity: 150,
    availableBeds: 23,
    doctorsAvailableNow: 4,
  },
  {
    id: 'f-003',
    name: 'Sub-Centre Rampur',
    type: 'Sub-Centre',
    address: 'Main Road, Village Rampur',
    village: 'Rampur',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.8420,
    longitude: 76.3290,
    phone: '07322-256100',
    emergencyPhone: null,
    services: ['Basic OPD', 'Immunisation', 'Ante-natal Check', 'Family Planning Counselling'],
    diagnosticsAvailable: ['Pregnancy Test', 'Malaria RDT'],
    emergencyAvailable: false,
    openingHours: 'Mon, Wed, Fri 9:00 AM – 1:00 PM',
    bedCapacity: 2,
    availableBeds: 2,
    doctorsAvailableNow: 1,
  },
  {
    id: 'f-004',
    name: 'CHC Sanawad',
    type: 'CHC',
    address: 'Sanawad Town, Near Narmada Bridge',
    village: 'Sanawad',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.7738,
    longitude: 76.0630,
    phone: '07322-267000',
    emergencyPhone: '07322-267999',
    services: ['OPD', 'Emergency', 'Maternity', 'Minor Surgery', 'Dental', 'Eye Care', 'Physiotherapy'],
    diagnosticsAvailable: ['Blood Tests', 'X-Ray', 'ECG', 'Urine Routine', 'Ultrasound'],
    emergencyAvailable: true,
    openingHours: 'Mon–Sat 8:00 AM – 4:00 PM',
    bedCapacity: 30,
    availableBeds: 8,
    doctorsAvailableNow: 2,
  },
  {
    id: 'f-005',
    name: 'PHC Khalwa',
    type: 'PHC',
    address: 'Khalwa Block Office Road, Khalwa',
    village: 'Khalwa',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.6950,
    longitude: 76.4800,
    phone: '07322-278200',
    emergencyPhone: null,
    services: ['OPD', 'Maternal Health', 'Immunisation', 'TB DOTS'],
    diagnosticsAvailable: ['Blood Sugar', 'Haemoglobin', 'Pregnancy Test'],
    emergencyAvailable: false,
    openingHours: 'Mon–Sat 9:00 AM – 1:00 PM',
    bedCapacity: 6,
    availableBeds: 3,
    doctorsAvailableNow: 1,
  },
  {
    id: 'f-006',
    name: 'Diagnostic Centre Khandwa',
    type: 'Diagnostic Centre',
    address: 'MG Road, Khandwa City',
    village: 'Khandwa',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.8310,
    longitude: 76.3590,
    phone: '07322-289100',
    emergencyPhone: null,
    services: ['Pathology', 'Radiology', 'Cardiology Investigations', 'Sample Collection'],
    diagnosticsAvailable: ['Complete Blood Count', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test', 'HbA1c', 'Thyroid Panel', 'X-Ray', 'Ultrasound', 'ECG', 'Echo', 'MRI', 'CT Scan'],
    emergencyAvailable: false,
    openingHours: 'Mon–Sat 7:00 AM – 8:00 PM',
    bedCapacity: 0,
    availableBeds: 0,
    doctorsAvailableNow: 2,
  },
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

export const MOCK_HIGH_RISK = [
  { id: 'hr-001', name: 'Suresh Patel', age: 58, category: 'Hypertension', risk: 'high', last_visit: '2026-09-01', next_due: '2026-09-15', provider: 'Dr. Arjun Mehta', status: 'overdue' },
  { id: 'hr-002', name: 'Meena Bai', age: 32, category: 'Maternal Health', risk: 'medium', last_visit: '2026-09-05', next_due: '2026-09-19', provider: 'Dr. Priyanka Das', status: 'due_soon' },
  { id: 'hr-003', name: 'Mohammed Khan', age: 67, category: 'TB', risk: 'high', last_visit: '2026-09-10', next_due: '2026-09-24', provider: 'Dr. Arjun Mehta', status: 'on_track' },
  { id: 'hr-004', name: 'Ramabai Devi', age: 71, category: 'Diabetes', risk: 'critical', last_visit: '2026-08-20', next_due: '2026-09-05', provider: 'Dr. Arjun Mehta', status: 'overdue' },
]
