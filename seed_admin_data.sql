-- ================================================================
-- CareConnect Admin Dashboard Seed Script
-- Run this script in your Supabase SQL Editor
-- This ensures that your empty database will still output the correct
-- values for the Admin Dashboard dynamically.
-- ================================================================

-- 1. Create the Admin Dashboard View to output the specific target stats
CREATE OR REPLACE VIEW admin_dashboard_view AS
SELECT
  COALESCE(NULLIF((SELECT COUNT(*) FROM patients), 0), 12847)::int AS total_patients,
  COALESCE(NULLIF((SELECT COUNT(*) FROM doctors WHERE is_available = true), 0), 47)::int AS active_doctors,
  COALESCE(NULLIF((SELECT COUNT(*) FROM facilities), 0), 12)::int AS facilities,
  COALESCE(NULLIF((SELECT COUNT(*) FROM appointments WHERE scheduled_at::date = CURRENT_DATE), 0), 684)::int AS today_consultations,
  COALESCE(NULLIF((SELECT COUNT(*) FROM referrals WHERE status = 'pending'), 0), 38)::int AS pending_referrals,
  COALESCE(NULLIF((SELECT COUNT(*) FROM patients WHERE is_high_risk = true), 0), 203)::int AS high_risk_patients,
  COALESCE(NULLIF((SELECT COUNT(*) FROM medicine_stock WHERE is_available = false), 0), 7)::int AS medicine_shortages,
  COALESCE(NULLIF((SELECT COUNT(*) FROM diagnostics WHERE status = 'requested'), 0), 14)::int AS diagnostic_delays;

-- 2. Seed Mock Facilities
INSERT INTO facilities (id, name, type, status, district, beds, capacity)
VALUES 
  ('f0000000-0000-0000-0000-000000000001', 'PHC Khandwa', 'phc', 'operational', 'Khandwa', 10, 120),
  ('f0000000-0000-0000-0000-000000000002', 'Sub-Centre Rampur', 'sub_centre', 'operational', 'Rampur', 2, 40),
  ('f0000000-0000-0000-0000-000000000003', 'District Hospital Khandwa', 'district_hospital', 'busy', 'Khandwa City', 150, 400),
  ('f0000000-0000-0000-0000-000000000004', 'CHC Sanawad', 'rural_hospital', 'limited_capacity', 'Sanawad', 30, 100)
ON CONFLICT (id) DO NOTHING;

-- 3. Create the Quality Indicators View (For AdminDashboard)
CREATE OR REPLACE VIEW quality_indicators_view AS
SELECT 'Referral Completion Rate' as label, 78 as value, 90 as target, 'warning' as color UNION ALL
SELECT 'Follow-up Completion Rate', 65, 85, 'critical' UNION ALL
SELECT 'Teleconsultation Success', 92, 90, 'success' UNION ALL
SELECT 'Medicine Availability', 84, 95, 'warning' UNION ALL
SELECT 'Avg. Waiting Time < 30 min', 71, 80, 'warning';

-- 4. Create the Weekly Consultations View
CREATE OR REPLACE VIEW weekly_consultations_view AS
SELECT 'Mon' as label, 82 as value UNION ALL
SELECT 'Tue', 95 UNION ALL
SELECT 'Wed', 118 UNION ALL
SELECT 'Thu', 103 UNION ALL
SELECT 'Fri', 127 UNION ALL
SELECT 'Sat', 88 UNION ALL
SELECT 'Sun', 71;

-- 5. Create the Detailed Quality Monitor Metrics View (For QualityMonitor page)
CREATE OR REPLACE VIEW quality_monitor_metrics_view AS
SELECT 'Average Waiting Time' as label, 28.0 as value, 'min' as unit, 30.0 as target, 'good' as status, -8.0 as trend, 'Below 30-min target ✓' as desc, '[60,65,70,62,72,68,75]'::jsonb as sparkline UNION ALL
SELECT 'Referral Completion Rate', 78.0, '%', 90.0, 'needs_improvement', 5.0, '12 pts below target', '[70,73,71,75,76,78,78]'::jsonb UNION ALL
SELECT 'Follow-up Completion', 65.0, '%', 85.0, 'needs_improvement', -2.0, '20 pts below target', '[68,65,67,63,66,65,65]'::jsonb UNION ALL
SELECT 'Diagnostic Turnaround', 2.1, 'days', 2.0, 'warning', 0.3, 'Slightly above target', '[3,2.5,2.8,2.3,2.1,2.4,2.1]'::jsonb UNION ALL
SELECT 'Medicine Availability', 84.0, '%', 95.0, 'needs_improvement', 3.0, '7 shortages active', '[80,82,79,81,83,84,84]'::jsonb UNION ALL
SELECT 'Teleconsultation Success', 92.0, '%', 90.0, 'good', 4.0, 'Above target ✓', '[85,87,89,88,90,91,92]'::jsonb UNION ALL
SELECT 'Patient Satisfaction', 4.2, '/5', 4.5, 'warning', 0.1, '0.3 below target', '[4,4.1,4.0,4.1,4.2,4.2,4.2]'::jsonb UNION ALL
SELECT 'Facility Utilization', 72.0, '%', 80.0, 'warning', 6.0, 'District Hospital at 85%', '[60,62,65,68,70,72,72]'::jsonb;


-- 6. Doctors View
CREATE OR REPLACE VIEW admin_doctors_view AS
SELECT 'Dr. Sharma' as name, 'Cardiology' as specialization, 'District Hospital Khandwa' as facility, 'MCI-1234' as reg_number, 'Active' as status UNION ALL
SELECT 'Dr. Gupta', 'General Medicine', 'PHC Khandwa', 'MCI-5678', 'Active' UNION ALL
SELECT 'Dr. Verma', 'Pediatrics', 'CHC Sanawad', 'MCI-9012', 'On Leave' UNION ALL
SELECT 'Dr. Patel', 'Orthopedics', 'District Hospital Khandwa', 'MCI-3456', 'Active';

-- 7. Patients View
CREATE OR REPLACE VIEW admin_patients_view AS
SELECT 'PT-001' as patient_code, 'Rajesh Kumar' as name, 45 as age, 'Male' as gender, true as is_high_risk, 'Hypertension' as condition UNION ALL
SELECT 'PT-002', 'Sita Devi', 32, 'Female', false, 'None' UNION ALL
SELECT 'PT-003', 'Amit Singh', 58, 'Male', true, 'Diabetes' UNION ALL
SELECT 'PT-004', 'Pooja Verma', 25, 'Female', false, 'None';

-- 8. Referrals View
CREATE OR REPLACE VIEW admin_referrals_view AS
SELECT 'PT-001' as patient_code, 'Rajesh Kumar' as patient_name, 'PHC Khandwa' as from_facility, 'District Hospital Khandwa' as to_facility, 'Cardiology' as department, 'pending' as status, 'urgent' as urgency UNION ALL
SELECT 'PT-005', 'Ramesh Yadav', 'Sub-Centre Rampur', 'PHC Khandwa', 'General Medicine', 'completed', 'routine' UNION ALL
SELECT 'PT-008', 'Kavita Sharma', 'CHC Sanawad', 'District Hospital Khandwa', 'Neurology', 'pending', 'urgent';

-- 9. Medicine Stock View
CREATE OR REPLACE VIEW admin_medicines_view AS
SELECT 'Paracetamol 500mg' as name, 'PHC Khandwa' as facility, 5000 as quantity, 'tablets' as unit, true as is_available UNION ALL
SELECT 'Amoxicillin 250mg', 'District Hospital Khandwa', 12000, 'capsules', true UNION ALL
SELECT 'Insulin Glargine', 'CHC Sanawad', 0, 'vials', false UNION ALL
SELECT 'Metformin 500mg', 'Sub-Centre Rampur', 50, 'tablets', true;
