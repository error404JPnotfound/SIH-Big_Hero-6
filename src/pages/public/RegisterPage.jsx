import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Misc'
import { getFacilities, submitDoctorRegistration } from '../../lib/db'
import { HeartPulse, Mail, User, Phone, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Gynecology', 'Dermatology', 'Emergency', 'Diagnostics']
const SPECIALIZATIONS = ['General Physician', 'Cardiologist', 'Pediatrician', 'Orthopedic Surgeon', 'Gynecologist', 'Dermatologist', 'Emergency Physician', 'Radiologist']

const EMPTY_DOCTOR_FORM = {
  fullName: '',
  gender: 'male',
  phone: '',
  email: '',
  password: '',
  regNumber: '',
  qualification: '',
  specialization: '',
  experience: '',
  department: '',
  facilityId: '',
  designation: '',
  availableDays: [],
  workingHoursStart: '',
  workingHoursEnd: '',
  consultationType: 'in_person',
  emergencyDuty: false,
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, '').slice(-10)
  return digits ? `+91${digits}` : ''
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [mode, setMode] = useState('patient')
  const [facilities, setFacilities] = useState([])

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR_FORM)

  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getFacilities().then(setFacilities).catch(err => console.warn('Facilities unavailable:', err.message))
  }, [])

  const isEmailValid = email.length > 5 && email.includes('@') && email.includes('.')
  const isPasswordValid = password.length >= 8

  const updateDoctor = (key, value) => setDoctorForm(prev => ({ ...prev, [key]: value }))
  const toggleDay = day => {
    setDoctorForm(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(item => item !== day)
        : [...prev.availableDays, day],
    }))
  }

  const handlePatientRegister = async () => {
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.')
      return
    }

    await register({
      email,
      password,
      phone: phone ? normalizePhone(phone) : undefined,
      full_name: fullName,
      role: mode === 'admin' ? 'admin' : 'patient',
    })
    navigate(mode === 'admin' ? '/admin' : '/patient')
  }

  const handleDoctorRegister = async () => {
    const payload = {
      ...doctorForm,
      phone: normalizePhone(doctorForm.phone),
      workingHours: doctorForm.workingHoursStart && doctorForm.workingHoursEnd
        ? `${doctorForm.workingHoursStart}-${doctorForm.workingHoursEnd}`
        : '',
    }

    const required = ['fullName', 'phone', 'email', 'password', 'regNumber', 'qualification', 'specialization', 'experience', 'department', 'facilityId', 'designation']
    const missing = required.filter(key => !String(payload[key] ?? '').trim())
    if (missing.length) {
      setError('Please fill in all required doctor registration fields.')
      return
    }
    if (!payload.email.includes('@') || !payload.email.includes('.')) {
      setError('Enter a valid doctor email address.')
      return
    }
    if (!/^\+91\d{10}$/.test(payload.phone)) {
      setError('Enter a valid 10-digit doctor phone number.')
      return
    }
    if (payload.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    await submitDoctorRegistration(payload)
    setSuccess('Your doctor registration was submitted successfully. Your registration is under review.')
    setDoctorForm(EMPTY_DOCTOR_FORM)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'doctor') await handleDoctorRegister()
      else await handlePatientRegister()
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      <div className="hidden lg:flex w-1/2 bg-subtle/40 border-r border-border-subtle flex-col justify-between p-12">
        <div className="flex items-center gap-2 text-text-primary font-bold text-2xl">
          <HeartPulse className="w-8 h-8 text-brand-default" />
          CareConnect
        </div>
        <div>
          <h2 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            Join the connected healthcare network.
          </h2>
          <p className="text-text-muted text-lg mb-8">
            Patients can start care instantly. Doctors are verified by administrators before clinical access is enabled.
          </p>
          <div className="space-y-3">
            {[
              'Secure, private health records with RLS encryption',
              'Real-time appointment & queue management',
              'Verified doctor onboarding with admin approval',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-text-primary/80 text-sm">
                <ShieldCheck className="w-4 h-4 text-brand-default flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-text-muted text-xs">&copy; {new Date().getFullYear()} CareConnect.</p>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-2 lg:hidden text-text-primary font-bold text-xl mb-8">
            <HeartPulse className="w-6 h-6 text-brand-default" />
            CareConnect
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary mb-1">Create your account</h1>
            <p className="text-text-muted text-sm">Choose patient access, apply as a verified doctor, or create an admin account.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1 bg-canvas border border-border-subtle rounded-xl mb-5">
            {['patient', 'doctor', 'admin'].map(item => (
              <button
                key={item}
                type="button"
                onClick={() => { setMode(item); setError(''); setSuccess('') }}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${mode === item ? 'bg-brand-default text-white' : 'text-text-muted hover:bg-surface-elevated'}`}
              >
                {item === 'patient' ? 'Patient' : item === 'doctor' ? 'Doctor' : 'Admin'}
              </button>
            ))}
          </div>

          {success && <Alert type="success" title="Registration submitted" className="mb-4">{success}</Alert>}

          <form onSubmit={handleRegister} className="space-y-4">
            {mode === 'patient' || mode === 'admin' ? (
              <>
                <Input label="Full Name" id="fullName" placeholder={mode === 'admin' ? 'Admin User' : 'Priya Sharma'} value={fullName} onChange={e => setFullName(e.target.value)} leftIcon={User} />
                <Input label="Email Address" id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} leftIcon={Mail} successText={isEmailValid ? 'Email address looks good' : ''} />
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-1.5">Phone Number (Optional)</label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 bg-canvas border border-border-subtle rounded-lg text-sm text-text-muted font-medium">+91</span>
                    <input type="tel" inputMode="numeric" maxLength={10} placeholder="98765 43210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="flex-1 h-10 px-3 rounded-lg border border-border-subtle bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-brand-default" />
                  </div>
                </div>
                <div className="relative">
                  <Input label="Password" id="password" type={showPass ? 'text' : 'password'} placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} successText={isPasswordValid ? 'Password meets requirements' : ''} />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-8 text-text-muted hover:text-text">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="Full Name *" value={doctorForm.fullName} onChange={e => updateDoctor('fullName', e.target.value)} leftIcon={User} />
                  <Select label="Gender" value={doctorForm.gender} onChange={e => updateDoctor('gender', e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                  <Input label="Phone *" value={doctorForm.phone} onChange={e => updateDoctor('phone', e.target.value.replace(/\D/g, ''))} leftIcon={Phone} maxLength={10} placeholder="98765 43210" />
                  <Input label="Email *" type="email" value={doctorForm.email} onChange={e => updateDoctor('email', e.target.value)} leftIcon={Mail} />
                  <Input label="Password *" type="password" value={doctorForm.password} onChange={e => updateDoctor('password', e.target.value)} />
                  <Input label="Medical Registration No. *" value={doctorForm.regNumber} onChange={e => updateDoctor('regNumber', e.target.value)} />
                  <Input label="Qualification *" value={doctorForm.qualification} onChange={e => updateDoctor('qualification', e.target.value)} placeholder="MBBS, MD" />
                  <Select label="Specialization *" value={doctorForm.specialization} onChange={e => updateDoctor('specialization', e.target.value)}>
                    <option value="">Select specialization</option>
                    {SPECIALIZATIONS.map(item => <option key={item} value={item}>{item}</option>)}
                  </Select>
                  <Input label="Experience *" type="number" min="0" value={doctorForm.experience} onChange={e => updateDoctor('experience', e.target.value)} placeholder="Years" />
                  <Select label="Department *" value={doctorForm.department} onChange={e => updateDoctor('department', e.target.value)}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(item => <option key={item} value={item}>{item}</option>)}
                  </Select>
                  <Select label="Healthcare Facility *" value={doctorForm.facilityId} onChange={e => updateDoctor('facilityId', e.target.value)}>
                    <option value="">Select facility</option>
                    {facilities.map(facility => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
                  </Select>
                  <Input label="Designation *" value={doctorForm.designation} onChange={e => updateDoctor('designation', e.target.value)} />
                </div>

                <div>
                  <p className="text-sm font-medium text-text-primary mb-2">Available Days</p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                      <button key={day} type="button" onClick={() => toggleDay(day)} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${doctorForm.availableDays.includes(day) ? 'bg-brand-default text-white border-brand-default' : 'border-border-subtle text-text-muted'}`}>
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="Working Hours Start" type="time" value={doctorForm.workingHoursStart} onChange={e => updateDoctor('workingHoursStart', e.target.value)} />
                  <Input label="Working Hours End" type="time" value={doctorForm.workingHoursEnd} onChange={e => updateDoctor('workingHoursEnd', e.target.value)} />
                  <Select label="Consultation Type" value={doctorForm.consultationType} onChange={e => updateDoctor('consultationType', e.target.value)}>
                    <option value="in_person">In-person</option>
                    <option value="online">Online</option>
                    <option value="both">Both</option>
                  </Select>
                  <label className="flex items-center gap-3 rounded-lg border border-border-subtle p-3">
                    <input type="checkbox" checked={doctorForm.emergencyDuty} onChange={e => updateDoctor('emergencyDuty', e.target.checked)} className="h-4 w-4 accent-brand-default" />
                    <span className="text-sm font-medium text-text-primary">Emergency Duty</span>
                  </label>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-status-critical-bg/50 border border-status-critical/20 px-3 py-2 rounded-lg text-status-critical">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full bg-brand-default text-white mt-2" size="lg" loading={loading}>
              {mode === 'doctor' ? 'Submit Doctor Registration' : mode === 'admin' ? 'Create Admin Account' : 'Sign Up'}
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account? <Link to="/login" className="text-brand-default font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
