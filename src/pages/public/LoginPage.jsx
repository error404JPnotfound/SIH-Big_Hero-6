import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { HeartPulse, Phone, Mail, ArrowLeft, Eye, EyeOff, ShieldCheck, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

const ROLES = [
  { id: 'patient', label: 'Patient',         emoji: '🧑',  desc: 'Access appointments, records & referrals' },
  { id: 'doctor',  label: 'Doctor',          emoji: '👨‍⚕️', desc: 'Manage patients, queue & prescriptions' },
  { id: 'admin',   label: 'Administrator',   emoji: '⚙️',  desc: 'Facility oversight & quality monitoring' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithPhone, verifyOtp, loginDemo } = useAuth()

  const [step, setStep]               = useState('role')     // role | login | otp
  const [tab, setTab]                 = useState('phone')    // phone | email
  const [selectedRole, setSelectedRole] = useState(null)

  // Form fields
  const [phone, setPhone]       = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp]           = useState(['','','','','',''])
  const [showPass, setShowPass] = useState(false)

  // UI states
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')

  const clearFeedback = () => { setError(''); setInfo('') }

  // ── Step 1 → 2 ────────────────────────────────────────────────
  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    setStep('login')
    clearFeedback()
  }

  // ── Phone login: send OTP ──────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    clearFeedback()
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit phone number.')
      return
    }
    setLoading(true)
    try {
      const formattedPhone = '+91' + phone.replace(/\D/g, '').slice(-10)
      await signInWithPhone(formattedPhone)
      setInfo(`OTP sent to +91 ${phone.slice(-10)}`)
      setStep('otp')
    } catch (err) {
      console.error(err)
      setError('Unable to send your verification code right now. Please check your phone number and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Email login ────────────────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    clearFeedback()
    if (!email || !password) { setError('Enter email and password.'); return }
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      navigate(`/${selectedRole}`)
    } catch (err) {
      console.error(err)
      setError('We couldn’t sign you in with those details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP verification ──────────────────────────────────────────
  const handleOtpChange = async (i, v) => {
    if (!/^\d?$/.test(v)) return
    const next = [...otp]
    next[i] = v
    setOtp(next)
    if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus()

    if (next.every(d => d)) {
      setLoading(true)
      clearFeedback()
      try {
        const formattedPhone = '+91' + phone.replace(/\D/g, '').slice(-10)
        await verifyOtp(formattedPhone, next.join(''))
        navigate(`/${selectedRole}`)
      } catch (err) {
        console.error(err)
        setError('That code didn’t work. Please check and try again.')
        setOtp(['','','','','',''])
        document.getElementById('otp-0')?.focus()
      } finally {
        setLoading(false)
      }
    }
  }

  // ── Demo mode ─────────────────────────────────────────────────
  const handleDemo = async () => {
    setLoading(true)
    try {
      await loginDemo(selectedRole)
      navigate(`/${selectedRole}`)
    } catch (err) {
      console.warn('Demo login error:', err)
      navigate(`/${selectedRole}`)
    } finally {
      setLoading(false)
    }
  }

  const currentRole = ROLES.find(r => r.id === selectedRole)

  return (
    <div className="min-h-screen bg-canvas flex">

      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 bg-subtle/40 border-r border-border-subtle flex-col justify-between p-12">
        <div className="flex items-center gap-2 text-text-primary font-bold text-2xl">
          <HeartPulse className="w-8 h-8 text-brand-default" />
          CareConnect
        </div>
        <div>
          <h2 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            One connected healthcare journey — from the local health centre to the specialist.
          </h2>
          <p className="text-text-muted text-lg mb-8">
            Trusted by thousands of patients, doctors, and healthcare workers across rural India.
          </p>
          <div className="space-y-3">
            {[
              'Secure, private health records with RLS encryption',
              'Real-time appointment & queue management',
              'Works offline — syncs when connection returns',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-text-primary/80 text-sm">
                <ShieldCheck className="w-4 h-4 text-brand-default flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-text-muted text-xs">
          &copy; {new Date().getFullYear()} CareConnect. Strengthening public health systems.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden text-text-primary font-bold text-xl mb-8">
            <HeartPulse className="w-6 h-6 text-brand-default" />
            CareConnect
          </div>

          {/* Back button */}
          {step !== 'role' && (
            <button
              onClick={() => { setStep(step === 'otp' ? 'login' : 'role'); clearFeedback(); setOtp(['','','','','','']) }}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          {/* ── STEP 1: Role Selection ── */}
          {step === 'role' && (
            <>
              <h1 className="text-2xl font-bold text-text-primary mb-1">Welcome to CareConnect</h1>
              <p className="text-text-muted text-sm mb-8">Choose how you're accessing the platform today.</p>
              <div className="space-y-3">
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className="w-full flex items-center gap-4 p-4 bg-surface-elevated rounded-xl border border-border-subtle hover:border-brand-default hover:shadow-sm text-left transition-all group"
                  >
                    <span className="text-3xl">{role.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary">{role.label}</p>
                      <p className="text-xs text-text-muted">{role.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-border group-hover:text-teal transition-colors" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── STEP 2: Login Form ── */}
          {step === 'login' && currentRole && (
            <>
              <div className="mb-6">
                <span className="text-3xl">{currentRole.emoji}</span>
                <h1 className="text-2xl font-bold text-text-primary mt-2">
                  Sign in as {currentRole.label}
                </h1>
                <p className="text-sm text-text-muted">Use your registered phone number or email address.</p>
              </div>

              {/* Tab switcher */}
              <div className="flex bg-canvas rounded-lg p-1 mb-6 border border-border-subtle">
                <button
                  onClick={() => { setTab('phone'); clearFeedback() }}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all',
                    tab === 'phone' ? 'bg-surface-elevated shadow-sm text-brand-default border border-brand-default/20' : 'text-text-muted hover:text-text border border-transparent'
                  )}
                >
                  <Phone className="w-3.5 h-3.5" /> Phone / OTP
                </button>
                <button
                  onClick={() => { setTab('email'); clearFeedback() }}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all',
                    tab === 'email' ? 'bg-surface-elevated shadow-sm text-brand-default border border-brand-default/20' : 'text-text-muted hover:text-text border border-transparent'
                  )}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
              </div>

              {/* Phone form */}
              {tab === 'phone' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-text-primary block mb-1.5">Phone Number</label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 bg-canvas border border-border-subtle rounded-lg text-sm text-text-muted font-medium">+91</span>
                      <input
                        type="tel" inputMode="numeric" maxLength={10}
                        placeholder="98765 43210"
                        value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 h-10 px-3 rounded-lg border border-border-subtle bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-brand-default"
                      />
                    </div>
                  </div>
                  {error && (
                    <div className="flex items-start gap-2 bg-status-critical-bg/50 border border-status-critical/20 px-3 py-2 rounded-lg text-status-critical">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-xs">{error}</p>
                    </div>
                  )}
                  {info  && <p className="text-xs text-status-success bg-status-success-bg px-3 py-2 rounded-lg">{info}</p>}
                  <Button type="submit" className="w-full bg-brand-default text-white" size="lg" loading={loading}>
                    Send OTP
                  </Button>
                </form>
              )}

              {/* Email form */}
              {tab === 'email' && (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <Input label="Email Address" id="email" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} leftIcon={Mail} />
                  <div className="relative">
                    <Input label="Password" id="password" type={showPass ? 'text' : 'password'}
                      placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-8 text-text-muted hover:text-text">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-right">
                    <a href="#" className="text-xs text-brand-default hover:underline">Forgot password?</a>
                  </div>
                  {error && (
                    <div className="flex items-start gap-2 bg-status-critical-bg/50 border border-status-critical/20 px-3 py-2 rounded-lg text-status-critical">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-xs">{error}</p>
                    </div>
                  )}
                  <Button type="submit" className="w-full bg-brand-default text-white" size="lg" loading={loading}>
                    Sign In
                  </Button>
                </form>
              )}

              {/* Demo shortcut */}
              <div className="mt-5 p-5 bg-surface-elevated shadow-sm rounded-xl border border-border-subtle hover:border-brand-default/40 transition-colors">
                <p className="text-sm font-bold text-text-primary mb-1 flex items-center gap-1.5">
                  ✨ Instant Live Demo
                </p>
                <p className="text-xs text-text-muted mb-4 leading-relaxed">
                  {selectedRole === 'doctor'
                    ? 'Explore the Doctor portal with live Supabase data (Dr. Diya Thakrar — seeded appointments, queues & prescriptions).'
                    : 'Explore the Patient portal with live Supabase data (Aarav Demo — real appointments, referrals, vitals & diagnostics).'}
                </p>
                <Button
                  variant="outline" size="sm" className="w-full border-brand-default/20 bg-subtle/30 text-brand-default hover:bg-brand-hover hover:text-white shadow-none"
                  onClick={handleDemo} loading={loading}
                >
                  Enter Demo as {currentRole.label}
                </Button>
              </div>
            </>
          )}

          {/* ── STEP 3: OTP Verification ── */}
          {step === 'otp' && (
            <>
              <div className="mb-6">
                <div className="w-14 h-14 rounded-full bg-subtle flex items-center justify-center text-2xl mb-4">📱</div>
                <h1 className="text-2xl font-bold text-text-primary">Verify your phone</h1>
                <p className="text-sm text-text-muted mt-1">
                  Enter the 6-digit code sent to{' '}
                  <strong className="text-text-primary">+91 {phone.slice(-10)}</strong>
                </p>
              </div>

              <div className="flex gap-2 justify-between mb-6">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text" inputMode="numeric" maxLength={1}
                    value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !d && i > 0) {
                        document.getElementById(`otp-${i - 1}`)?.focus()
                      }
                    }}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-border-subtle bg-surface-elevated text-text-primary focus:border-brand-default focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {loading && <p className="text-center text-sm text-text-muted mb-4 animate-pulse">Verifying...</p>}
              {error && (
                <div className="flex items-start gap-2 bg-status-critical-bg/50 border border-status-critical/20 px-3 py-2 rounded-lg text-status-critical mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-xs">{error}</p>
                </div>
              )}

              <p className="text-center text-sm text-text-muted mb-4">
                Didn't receive it?{' '}
                <button
                  className="text-brand-default font-medium hover:underline"
                  onClick={handleSendOtp}
                >
                  Resend OTP
                </button>
              </p>

              {/* Demo bypass */}
              <div className="p-5 bg-surface-elevated shadow-sm rounded-xl border border-border-subtle hover:border-brand-default/40 transition-colors mt-6">
                <p className="text-sm font-bold text-text-primary mb-1 flex items-center gap-1.5">
                  ✨ Demo Mode
                </p>
                <p className="text-xs text-text-muted mb-4 leading-relaxed">
                  No real Supabase project? Explore the portal instantly with realistic sample data.
                </p>
                <Button
                  variant="outline" size="sm" className="w-full border-brand-default/20 bg-subtle/30 text-brand-default hover:bg-brand-hover hover:text-white shadow-none"
                  onClick={handleDemo} loading={loading}
                >
                  Skip — Enter Demo Mode
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
