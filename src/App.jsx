import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

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
  const protect = (role, element) => <ProtectedRoute role={role}>{element}</ProtectedRoute>

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Patient */}
          <Route path="/patient" element={protect('patient', <PatientDashboard />)} />
          <Route path="/patient/facilities" element={protect('patient', <FacilityFinder />)} />
          <Route path="/patient/facilities/:id" element={protect('patient', <FacilityDetails />)} />
          <Route path="/patient/appointments" element={protect('patient', <Appointments />)} />
          <Route path="/patient/queue" element={protect('patient', <Queue />)} />
          <Route path="/patient/medicines" element={protect('patient', <Medicines />)} />
          <Route path="/patient/referrals" element={protect('patient', <Navigate to="/patient/appointments?tab=referrals" replace />)} />
          <Route path="/patient/diagnostics" element={protect('patient', <Diagnostics />)} />
          <Route path="/patient/records" element={protect('patient', <Records />)} />

          {/* Doctor */}
          <Route path="/doctor" element={protect('doctor', <DoctorDashboard />)} />
          <Route path="/doctor/queue" element={protect('doctor', <DoctorQueue />)} />
          <Route path="/doctor/patients" element={protect('doctor', <PatientProfile />)} />
          <Route path="/doctor/referrals" element={protect('doctor', <DoctorWorklist type="referrals" />)} />
          <Route path="/doctor/diagnostics" element={protect('doctor', <DoctorWorklist type="diagnostics" />)} />
          <Route path="/doctor/prescriptions" element={protect('doctor', <DoctorWorklist type="prescriptions" />)} />
          <Route path="/doctor/follow-ups" element={protect('doctor', <DoctorWorklist type="followUps" />)} />

          {/* Admin */}
          <Route path="/admin" element={protect('admin', <AdminDashboard />)} />
          <Route path="/admin/facilities" element={protect('admin', <Facilities />)} />
          <Route path="/admin/high-risk" element={protect('admin', <HighRisk />)} />
          <Route path="/admin/quality" element={protect('admin', <QualityMonitor />)} />
          <Route path="/admin/doctors" element={protect('admin', <Doctors />)} />
          <Route path="/admin/patients" element={protect('admin', <Patients />)} />
          <Route path="/admin/referrals" element={protect('admin', <ReferralsAdmin />)} />
          <Route path="/admin/medicines" element={protect('admin', <MedicineStock />)} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
