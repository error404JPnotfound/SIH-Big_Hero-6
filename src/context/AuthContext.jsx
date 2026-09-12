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

  // Fetch profile from DB and merge into user object
  const hydrateUser = async (authUser) => {
    if (!authUser) { setUser(null); return }
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, phone, email, preferred_language, is_active, facility_id')
        .eq('id', authUser.id)
        .single()

      if (error) throw error

      setUser({
        id:       profile.id,
        role:     profile.role,
        name:     profile.full_name,
        email:    profile.email || authUser.email,
        phone:    profile.phone || authUser.phone,
        language: profile.preferred_language,
        facilityId: profile.facility_id,
        isActive: profile.is_active,
      })
    } catch (err) {
      console.warn('Profile not yet created, using auth metadata:', err.message)
      // Fallback: use data embedded in JWT / user_metadata
      setUser({
        id:   authUser.id,
        role: authUser.user_metadata?.role || 'patient',
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email,
        phone: authUser.phone,
      })
    }
  }

  useEffect(() => {
    // 1. Check demo session
    const demoUser = sessionStorage.getItem('demo_user')
    if (demoUser) {
      setUser(JSON.parse(demoUser))
      setDemoMode(true)
      setLoading(false)
      return
    }

    // 2. Check real Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrateUser(session?.user ?? null).finally(() => setLoading(false))
    }).catch(() => setLoading(false))

    // 3. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await hydrateUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ── Sign in with Email & Password ─────────────────────────────
  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // ── Sign in with Phone (send OTP) ─────────────────────────────
  const signInWithPhone = async (phone) => {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) throw error
  }

  // ── Verify OTP ────────────────────────────────────────────────
  const verifyOtp = async (phone, token) => {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    if (error) throw error
    return data
  }

  // ── Register new user ─────────────────────────────────────────
  // Pass role in options.data so the DB trigger reads it from user_metadata
  const register = async ({ email, password, phone, full_name, role = 'patient' }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone,
      options: {
        data: { full_name, role, phone },
      },
    })
    if (error) throw error
    return data
  }

  // ── Demo mode login (no Supabase required) ────────────────────
  const loginDemo = async (role) => {
    const u = DEMO_USERS[role]
    sessionStorage.setItem('demo_user', JSON.stringify(u))
    setUser(u)
    setDemoMode(true)
    return u
  }

  // ── Sign out ──────────────────────────────────────────────────
  const logout = async () => {
    sessionStorage.removeItem('demo_user')
    setDemoMode(false)
    setUser(null)
    if (!demoMode) await supabase.auth.signOut()
  }

  // ── Convenience role checks ───────────────────────────────────
  const isPatient = user?.role === 'patient'
  const isDoctor  = user?.role === 'doctor'
  const isAdmin   = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      user, loading, demoMode,
      isPatient, isDoctor, isAdmin,
      signInWithEmail, signInWithPhone, verifyOtp,
      register, loginDemo, logout,
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
