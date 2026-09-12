-- ================================================================
-- CareConnect Full Database Seed Script (Real INSERTs)
-- Run this script in your Supabase SQL Editor to populate tables.
-- ================================================================

-- 1. Insert Facilities
INSERT INTO facilities (id, name, type, status, district, beds, capacity)
VALUES 
  ('f0000000-0000-0000-0000-000000000001', 'PHC Khandwa', 'phc', 'operational', 'Khandwa', 10, 120),
  ('f0000000-0000-0000-0000-000000000002', 'Sub-Centre Rampur', 'sub_centre', 'operational', 'Rampur', 2, 40),
  ('f0000000-0000-0000-0000-000000000003', 'District Hospital Khandwa', 'district_hospital', 'busy', 'Khandwa City', 150, 400),
  ('f0000000-0000-0000-0000-000000000004', 'CHC Sanawad', 'rural_hospital', 'limited_capacity', 'Sanawad', 30, 100)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Doctors (profile_id left NULL for demo purposes)
INSERT INTO doctors (id, facility_id, specialization, reg_number, is_available)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'Cardiology', 'MCI-1234', true),
  ('d0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'General Medicine', 'MCI-5678', true),
  ('d0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000004', 'Pediatrics', 'MCI-9012', false),
  ('d0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', 'Orthopedics', 'MCI-3456', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Patients (profile_id left NULL for demo purposes)
INSERT INTO patients (id, patient_code, dob, gender, blood_group, is_high_risk)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'PT-001', '1978-05-12', 'male', 'O+', true),
  ('a0000000-0000-0000-0000-000000000002', 'PT-002', '1991-08-22', 'female', 'A+', false),
  ('a0000000-0000-0000-0000-000000000003', 'PT-003', '1965-11-03', 'male', 'B+', true),
  ('a0000000-0000-0000-0000-000000000004', 'PT-004', '1998-02-15', 'female', 'AB+', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Medicines
INSERT INTO medicines (id, name, generic_name, category)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Paracetamol 500mg', 'Acetaminophen', 'Analgesic'),
  ('b0000000-0000-0000-0000-000000000002', 'Amoxicillin 250mg', 'Amoxicillin', 'Antibiotic'),
  ('b0000000-0000-0000-0000-000000000003', 'Insulin Glargine', 'Insulin', 'Antidiabetic'),
  ('b0000000-0000-0000-0000-000000000004', 'Metformin 500mg', 'Metformin', 'Antidiabetic')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Medicine Stock
INSERT INTO medicine_stock (medicine_id, facility_id, is_available, quantity, unit)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', true, 5000, 'tablets'),
  ('b0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', true, 12000, 'capsules'),
  ('b0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000004', false, 0, 'vials'),
  ('b0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', true, 50, 'tablets')
ON CONFLICT (medicine_id, facility_id) DO NOTHING;

-- 6. Insert Referrals
INSERT INTO referrals (patient_id, referring_doctor, from_facility, to_facility, department, reason, urgency, status)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'Cardiology', 'Severe chest pain, requires ECG.', 'urgent', 'pending'),
  ('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'General Medicine', 'Persistent fever and cough.', 'routine', 'completed'),
  ('a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', 'Neurology', 'Frequent migraines and blurred vision.', 'urgent', 'pending');

-- 7. Insert Appointments
INSERT INTO appointments (patient_id, doctor_id, facility_id, scheduled_at, mode, status)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', NOW(), 'in_person', 'scheduled'),
  ('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', NOW(), 'teleconsultation', 'in_progress');
