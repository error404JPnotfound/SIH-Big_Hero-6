import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Demo users for offline/demo mode (no Supabase needed)
const DEMO_USERS = {
  patient: { id: 'p-demo', role: 'patient', name: 'Priya Sharma',    email: 'patient@demo.com' },
  doctor:  { id: 'd-demo', role: 'doctor',  name: 'Dr. Arjun Mehta', email: 'doctor@demo.com'  },
  admin:   { id: 'a-demo', role: 'admin',   name: 'Admin User',      email: 'admin@demo.com'   },
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)   // { id, role, name, email, ... }
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  const getAccessProfile = async (authUser, expectedRole = null) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, email, preferred_language, is_active, facility_id')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) {
      throw new Error('Your account profile is missing. Please register again or contact the administrator.')
    }
    if (!profile.is_active) {
      throw new Error('Your account is inactive. Please contact the administrator.')
    }
    if (expectedRole && profile.role !== expectedRole) {
      throw new Error(`This account is registered as ${profile.role}. Please use the ${profile.role} sign-in option.`)
    }

    if (profile.role === 'doctor') {
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('account_status, rejection_reason')
        .eq('profile_id', authUser.id)
        .maybeSingle()

      if (doctorError) throw doctorError
      if (!doctor) {
        throw new Error('Your doctor registration is not complete. Please contact the administrator.')
      }
      if (doctor.account_status === 'pending') {
        throw new Error('Your registration is under review.')
      }
      if (doctor.account_status === 'rejected') {
        throw new Error(doctor.rejection_reason
          ? `Your registration was not approved: ${doctor.rejection_reason}`
          : 'Your registration was not approved.')
      }
      if (doctor.account_status !== 'approved') {
        throw new Error('Your doctor account has not been approved yet.')
      }
    }

    return profile
  }

  const toAppUser = (profile, authUser) => ({
    id: profile.id,
    role: profile.role,
    name: profile.full_name,
    email: profile.email || authUser.email,
    phone: profile.phone || authUser.phone,
    language: profile.preferred_language,
    facilityId: profile.facility_id,
    isActive: profile.is_active,
  })

  // Fetch profile from DB and merge into user object
  const hydrateUser = async (authUser) => {
    if (!authUser) { setUser(null); return }
    try {
      const profile = await getAccessProfile(authUser)
      setUser(toAppUser(profile, authUser))
    } catch (err) {
      console.warn('Account access check failed:', err.message)
      setUser(null)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      // 1. Check real Supabase session first
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await hydrateUser(session.user)
          sessionStorage.removeItem('demo_user')
          setDemoMode(false)
          if (isMounted) setLoading(false)
          return
        }
      } catch (err) {
        console.warn('Failed to retrieve session:', err)
      }

      // 2. If no active session, check if demo_user was saved
      const savedDemo = sessionStorage.getItem('demo_user')
      if (savedDemo) {
        try {
          const parsed = JSON.parse(savedDemo)
          // If demo was patient or doctor, sign in to Supabase demo account so live queries succeed
          if (parsed.role === 'patient') {
            const { data } = await supabase.auth.signInWithPassword({
              email: 'patient1.demo@careconnect.example',
              password: 'Password123!',
            })
            if (data?.user) {
              await hydrateUser(data.user)
              setDemoMode(true)
              if (isMounted) setLoading(false)
              return
            }
          } else if (parsed.role === 'doctor') {
            const { data } = await supabase.auth.signInWithPassword({
              email: 'diyathakrar68@gmail.com',
              password: 'Password123!',
            })
            if (data?.user) {
              await hydrateUser(data.user)
              setDemoMode(true)
              if (isMounted) setLoading(false)
              return
            }
          }
          setUser(parsed)
          setDemoMode(true)
        } catch {
          sessionStorage.removeItem('demo_user')
        }
      }

      if (isMounted) setLoading(false)
    }

    initAuth()

    // 3. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
        if (session?.user) {
          await hydrateUser(session.user)
        } else if (!sessionStorage.getItem('demo_user')) {
          setUser(null)
          setDemoMode(false)
        }
        if (isMounted) setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // ── Sign in with Email & Password ─────────────────────────────
  const signInWithEmail = async (email, password, expectedRole) => {
    sessionStorage.removeItem('demo_user')
    setDemoMode(false)
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    if (error) throw error

    try {
      const profile = await getAccessProfile(data.user, expectedRole)
      setUser(toAppUser(profile, data.user))
      return { ...data, role: profile.role }
    } catch (accessError) {
      await supabase.auth.signOut()
      setUser(null)
      throw accessError
    }
  }

  // ── Sign in with Phone (send OTP) ─────────────────────────────
  const signInWithPhone = async (phone) => {
    sessionStorage.removeItem('demo_user')
    setDemoMode(false)
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) throw error
  }

  // ── Verify OTP ────────────────────────────────────────────────
  const verifyOtp = async (phone, token, expectedRole) => {
    sessionStorage.removeItem('demo_user')
    setDemoMode(false)
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    if (error) throw error
    try {
      const profile = await getAccessProfile(data.user, expectedRole)
      setUser(toAppUser(profile, data.user))
      return { ...data, role: profile.role }
    } catch (accessError) {
      await supabase.auth.signOut()
      setUser(null)
      throw accessError
    }
  }

  const resetPassword = async (email) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) throw new Error('Enter your email address first.')
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  }

  const updatePassword = async (password) => {
    if (password.length < 8) throw new Error('Password must be at least 8 characters.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setPasswordRecovery(false)
    await supabase.auth.signOut()
    setUser(null)
  }

  // ── Register new user ─────────────────────────────────────────
  // Pass role in options.data so the DB trigger reads it from user_metadata
  const register = async ({ email, password, phone, full_name, role = 'patient' }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role, phone },
      },
    })
    if (error) throw error
    return data
  }

  // ── Demo mode login ───────────────────────────────────────────
  const loginDemo = async (role) => {
    setLoading(true)
    if (role === 'patient') {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'patient1.demo@careconnect.example',
          password: 'Password123!',
        })
        if (!error && data?.user) {
          sessionStorage.setItem('demo_user', JSON.stringify({
            id: data.user.id,
            role: 'patient',
            name: 'Aarav Demo',
            email: 'patient1.demo@careconnect.example',
          }))
          setDemoMode(true)
          await hydrateUser(data.user)
          setLoading(false)
          return data.user
        }
      } catch (err) {
        console.warn('Demo patient login error:', err)
      }
    } else if (role === 'doctor') {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'diyathakrar68@gmail.com',
          password: 'Password123!',
        })
        if (!error && data?.user) {
          sessionStorage.setItem('demo_user', JSON.stringify({
            id: data.user.id,
            role: 'doctor',
            name: 'Dr. Diya Thakrar',
            email: 'diyathakrar68@gmail.com',
          }))
          setDemoMode(true)
          await hydrateUser(data.user)
          setLoading(false)
          return data.user
        }
      } catch (err) {
        console.warn('Doctor demo login error:', err)
      }
    }

    // Fallback if network fails
    const u = DEMO_USERS[role]
    sessionStorage.setItem('demo_user', JSON.stringify(u))
    setUser(u)
    setDemoMode(true)
    setLoading(false)
    return u
  }

  // ── Sign out ──────────────────────────────────────────────────
  const logout = async () => {
    sessionStorage.removeItem('demo_user')
    setDemoMode(false)
    setUser(null)
    try {
      await supabase.auth.signOut()
    } catch {}
  }

  // ── Convenience role checks ───────────────────────────────────
  const isPatient = user?.role === 'patient'
  const isDoctor  = user?.role === 'doctor'
  const isAdmin   = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      user, loading, demoMode, passwordRecovery,
      isPatient, isDoctor, isAdmin,
      signInWithEmail, signInWithPhone, verifyOtp,
      register, resetPassword, updatePassword, loginDemo, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
