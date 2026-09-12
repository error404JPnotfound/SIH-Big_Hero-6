import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { HeartPulse, Phone, Mail, ArrowLeft, Eye, EyeOff, ShieldCheck, ChevronRight } from 'lucide-react'
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
      setError(err.message || 'Failed to send OTP. Please try again.')
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
      setError(err.message || 'Login failed. Check your credentials.')
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
        setError('Invalid OTP. Please try again.')
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
    await new Promise(r => setTimeout(r, 500))
    await loginDemo(selectedRole)
    navigate(`/${selectedRole}`)
  }

  const currentRole = ROLES.find(r => r.id === selectedRole)

  return (
    <div className="min-h-screen bg-bg flex">

      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 gradient-navy flex-col justify-between p-12">
        <div className="flex items-center gap-2 text-surface font-bold text-2xl">
          <HeartPulse className="w-8 h-8 text-teal" />
          CareConnect
        </div>
        <div>
          <h2 className="text-4xl font-bold text-surface leading-tight mb-4">
            One connected healthcare journey — from the local health centre to the specialist.
          </h2>
          <p className="text-surface/60 text-lg mb-8">
            Trusted by thousands of patients, doctors, and healthcare workers across rural India.
          </p>
          <div className="space-y-3">
            {[
              'Secure, private health records with RLS encryption',
              'Real-time appointment & queue management',
              'Works offline — syncs when connection returns',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-surface/80 text-sm">
                <ShieldCheck className="w-4 h-4 text-teal flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-surface/30 text-xs">
          &copy; {new Date().getFullYear()} CareConnect. Strengthening public health systems.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden text-navy font-bold text-xl mb-8">
            <HeartPulse className="w-6 h-6 text-teal" />
            CareConnect
          </div>

          {/* Back button */}
          {step !== 'role' && (
            <button
              onClick={() => { setStep(step === 'otp' ? 'login' : 'role'); clearFeedback(); setOtp(['','','','','','']) }}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          {/* ── STEP 1: Role Selection ── */}
          {step === 'role' && (
            <>
              <h1 className="text-2xl font-bold text-navy mb-1">Welcome to CareConnect</h1>
              <p className="text-muted text-sm mb-8">Choose how you're accessing the platform today.</p>
              <div className="space-y-3">
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className="w-full flex items-center gap-4 p-4 bg-surface rounded-xl border border-border hover:border-teal hover:shadow-sm text-left transition-all group"
                  >
                    <span className="text-3xl">{role.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-navy">{role.label}</p>
                      <p className="text-xs text-muted">{role.desc}</p>
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
                <h1 className="text-2xl font-bold text-navy mt-2">
                  Sign in as {currentRole.label}
                </h1>
                <p className="text-sm text-muted">Use your registered phone number or email address.</p>
              </div>

              {/* Tab switcher */}
              <div className="flex bg-bg rounded-lg p-1 mb-6 border border-border">
                <button
                  onClick={() => { setTab('phone'); clearFeedback() }}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all',
                    tab === 'phone' ? 'bg-surface shadow-sm text-navy' : 'text-muted hover:text-text'
                  )}
                >
                  <Phone className="w-3.5 h-3.5" /> Phone / OTP
                </button>
                <button
                  onClick={() => { setTab('email'); clearFeedback() }}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all',
                    tab === 'email' ? 'bg-surface shadow-sm text-navy' : 'text-muted hover:text-text'
                  )}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
              </div>

              {/* Phone form */}
              {tab === 'phone' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-text block mb-1.5">Phone Number</label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 bg-bg border border-border rounded-lg text-sm text-muted font-medium">+91</span>
                      <input
                        type="tel" inputMode="numeric" maxLength={10}
                        placeholder="98765 43210"
                        value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                      />
                    </div>
                  </div>
                  {error && <p className="text-xs text-critical bg-critical-bg px-3 py-2 rounded-lg">{error}</p>}
                  {info  && <p className="text-xs text-success bg-success-bg px-3 py-2 rounded-lg">{info}</p>}
                  <Button type="submit" className="w-full bg-teal text-white" size="lg" loading={loading}>
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
                      className="absolute right-3 top-8 text-muted hover:text-text">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-right">
                    <a href="#" className="text-xs text-teal hover:underline">Forgot password?</a>
                  </div>
                  {error && <p className="text-xs text-critical bg-critical-bg px-3 py-2 rounded-lg">{error}</p>}
                  <Button type="submit" className="w-full bg-teal text-white" size="lg" loading={loading}>
                    Sign In
                  </Button>
                </form>
              )}

              {/* Demo shortcut */}
              <div className="mt-5 p-4 bg-teal-light rounded-xl border border-teal/20">
                <p className="text-xs font-semibold text-teal mb-1">✨ Quick Demo Access</p>
                <p className="text-xs text-muted mb-3">
                  Explore the {currentRole.label} portal instantly with realistic sample data. No login needed.
                </p>
                <Button
                  variant="outline" size="sm" className="w-full border-teal text-teal hover:bg-teal hover:text-white"
                  onClick={handleDemo} loading={loading}
                >
                  Enter Demo Mode as {currentRole.label}
                </Button>
              </div>
            </>
          )}

          {/* ── STEP 3: OTP Verification ── */}
          {step === 'otp' && (
            <>
              <div className="mb-6">
                <div className="w-14 h-14 rounded-full bg-teal-light flex items-center justify-center text-2xl mb-4">📱</div>
                <h1 className="text-2xl font-bold text-navy">Verify your phone</h1>
                <p className="text-sm text-muted mt-1">
                  Enter the 6-digit code sent to{' '}
                  <strong className="text-navy">+91 {phone.slice(-10)}</strong>
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
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-border bg-surface text-navy focus:border-teal focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {loading && <p className="text-center text-sm text-muted mb-4 animate-pulse">Verifying...</p>}
              {error && <p className="text-xs text-critical bg-critical-bg px-3 py-2 rounded-lg mb-4">{error}</p>}

              <p className="text-center text-sm text-muted mb-4">
                Didn't receive it?{' '}
                <button
                  className="text-teal font-medium hover:underline"
                  onClick={handleSendOtp}
                >
                  Resend OTP
                </button>
              </p>

              {/* Demo bypass */}
              <div className="p-4 bg-teal-light rounded-xl border border-teal/20">
                <p className="text-xs text-muted mb-2">No real Supabase project? Use demo mode instead:</p>
                <Button
                  variant="outline" size="sm" className="w-full border-teal text-teal hover:bg-teal hover:text-white"
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
