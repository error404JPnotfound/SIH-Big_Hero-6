import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { HeartPulse, Mail, User, Phone, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    try {
      await register({
        email,
        password,
        phone: phone ? `+91${phone.replace(/\D/g, '').slice(-10)}` : undefined,
        full_name: fullName,
        role: 'patient' // Defaulting to patient for 'Get Care'
      })
      // Auto-redirect to patient portal after successful registration
      navigate('/patient')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
            Join the connected healthcare network.
          </h2>
          <p className="text-surface/60 text-lg mb-8">
            Get access to trusted doctors, book appointments, and keep all your medical records in one secure place.
          </p>
          <div className="space-y-3">
            {[
              'Secure, private health records with RLS encryption',
              'Real-time appointment & queue management',
              'Easy specialist referrals',
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

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy mb-1">Create your account</h1>
            <p className="text-muted text-sm">Sign up as a patient to access care.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <Input 
              label="Full Name" 
              id="fullName" 
              placeholder="Priya Sharma"
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              leftIcon={User} 
            />

            <Input 
              label="Email Address" 
              id="email" 
              type="email" 
              placeholder="you@example.com"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              leftIcon={Mail} 
            />

            <div>
              <label className="text-sm font-medium text-text block mb-1.5">Phone Number (Optional)</label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-bg border border-border rounded-lg text-sm text-muted font-medium">+91</span>
                <input
                  type="tel" 
                  inputMode="numeric" 
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone} 
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
            </div>

            <div className="relative">
              <Input 
                label="Password" 
                id="password" 
                type={showPass ? 'text' : 'password'}
                placeholder="Create a strong password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              <button 
                type="button" 
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-8 text-muted hover:text-text"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && <p className="text-xs text-critical bg-critical-bg px-3 py-2 rounded-lg">{error}</p>}

            <Button type="submit" className="w-full bg-teal text-white mt-2" size="lg" loading={loading}>
              Sign Up
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-teal font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
