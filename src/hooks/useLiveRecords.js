import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
export function useLiveRecords(fetcher) {
  const { user, demoMode } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    let running = false
    setData([])
    setError('')
    setLoading(true)
    async function refresh() {
      if (running) return
      running = true
      try {
        if (!user || demoMode) throw new Error('Sign in with your real account to view live records.')
        const result = await fetcher()
        if (active) { setData(result); setError('') }
      } catch (err) { if (active) setError(err.message) }
      finally { running = false; if (active) setLoading(false) }
    }
    refresh()
    const timer = setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    window.addEventListener('careconnect:records-updated', refresh)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('careconnect:records-updated', refresh) }
  }, [fetcher, user?.id, demoMode])
  return { data, loading, error }
}
