import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

// Public pages
import LandingPage from './pages/public/LandingPage'
import LoginPage from './pages/public/LoginPage'
import RegisterPage from './pages/public/RegisterPage'

// Patient portal
import PatientDashboard from './pages/patient/PatientDashboard'
import Appointments from './pages/patient/Appointments'
import Queue from './pages/patient/Queue'
import Medicines from './pages/patient/Medicines'
import Diagnostics from './pages/patient/Diagnostics'
import Records from './pages/patient/Records'
import FacilityFinder from './pages/patient/FacilityFinder'
import FacilityDetails from './pages/patient/FacilityDetails'

// Doctor portal
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorQueue from './pages/doctor/DoctorQueue'
import PatientProfile from './pages/doctor/PatientProfile'
import DoctorWorklist from './pages/doctor/DoctorWorklist'

// Admin portal
import AdminDashboard from './pages/admin/AdminDashboard'
import Facilities from './pages/admin/Facilities'
import HighRisk from './pages/admin/HighRisk'
import QualityMonitor from './pages/admin/QualityMonitor'
import Doctors from './pages/admin/Doctors'
import Patients from './pages/admin/Patients'
import ReferralsAdmin from './pages/admin/Referrals'
import MedicineStock from './pages/admin/MedicineStock'

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Patient */}
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/patient/facilities" element={<FacilityFinder />} />
          <Route path="/patient/facilities/:id" element={<FacilityDetails />} />
          <Route path="/patient/appointments" element={<Appointments />} />
          <Route path="/patient/queue" element={<Queue />} />
          <Route path="/patient/medicines" element={<Medicines />} />
          <Route path="/patient/referrals" element={<Navigate to="/patient/appointments?tab=referrals" replace />} />
          <Route path="/patient/diagnostics" element={<Diagnostics />} />
          <Route path="/patient/records" element={<Records />} />

          {/* Doctor */}
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor/queue" element={<DoctorQueue />} />
          <Route path="/doctor/referrals" element={<PatientProfile />} />
          <Route path="/doctor/follow-ups" element={<DoctorWorklist type="followUps" />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/facilities" element={<Facilities />} />
          <Route path="/admin/high-risk" element={<HighRisk />} />
          <Route path="/admin/quality" element={<QualityMonitor />} />
          <Route path="/admin/doctors" element={<Doctors />} />
          <Route path="/admin/patients" element={<Patients />} />
          <Route path="/admin/referrals" element={<ReferralsAdmin />} />
          <Route path="/admin/medicines" element={<MedicineStock />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
