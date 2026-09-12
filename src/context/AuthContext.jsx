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
    let isMounted = true

    async function initAuth() {
      // 1. Check real Supabase session first
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await hydrateUser(session.user)
          if (sessionStorage.getItem('demo_user')) {
            setDemoMode(true)
          }
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
      async (_event, session) => {
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
  const signInWithEmail = async (email, password) => {
    sessionStorage.removeItem('demo_user')
    setDemoMode(false)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // ── Sign in with Phone (send OTP) ─────────────────────────────
  const signInWithPhone = async (phone) => {
    sessionStorage.removeItem('demo_user')
    setDemoMode(false)
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) throw error
  }

  // ── Verify OTP ────────────────────────────────────────────────
  const verifyOtp = async (phone, token) => {
    sessionStorage.removeItem('demo_user')
    setDemoMode(false)
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
