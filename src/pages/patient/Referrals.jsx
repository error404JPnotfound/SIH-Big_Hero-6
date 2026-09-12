/**
 * Referrals.jsx — /patient/referrals
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully dynamic: loads referrals from Supabase via getMyReferrals().
 * No mock data. Loading / empty / error states included.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Misc'
import { getMyReferrals } from '../../lib/db'
import { ClipboardList, Calendar, ArrowRight, Clock, AlertCircle } from 'lucide-react'

const STATUS_STEPS    = ['Created', 'Pending', 'Accepted', 'Scheduled', 'In Progress', 'Completed']
const STATUS_STEP_MAP = { created: 0, pending: 1, accepted: 2, scheduled: 3, in_progress: 4, completed: 5 }
const statusVariant   = { created: 'default', pending: 'warning', accepted: 'success', scheduled: 'blue', in_progress: 'blue', completed: 'outline', cancelled: 'critical' }

function ReferralCard({ r }) {
  const stepIdx    = STATUS_STEP_MAP[r.status] ?? 0
  const toName     = r.to_fac?.name || r.department || '—'
  const fromName   = r.from_fac?.name || '—'
  const doctorName = r.referring_doctor?.profiles?.full_name || '—'
  const dateStr    = r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="bg-surface-elevated rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
      <div className="px-5 pt-5 pb-4 flex items-start gap-3 border-b border-border-subtle">
        <div className="w-10 h-10 rounded-xl bg-status-warning-bg flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-status-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary text-sm">{r.department} — {toName}</h3>
            <Badge variant={statusVariant[r.status] || 'default'} className="capitalize">{r.status?.replace('_', ' ')}</Badge>
          </div>
          <p className="text-xs text-text-muted mt-0.5">{r.reason}</p>
          <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />Referred on {dateStr}
          </p>
          {fromName !== '—' && (
            <p className="text-xs text-text-muted mt-0.5">From: {fromName}</p>
          )}
        </div>
      </div>

      {/* Progress stepper */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-1">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-full flex flex-col items-center gap-1 ${i <= stepIdx ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i < stepIdx  ? 'bg-status-success text-white'
                  : i === stepIdx ? 'bg-brand-default text-white'
                  : 'bg-border text-text-muted'}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                <span className="text-center text-xs text-text-muted leading-tight hidden sm:block">{s}</span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < stepIdx ? 'bg-status-success' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="text-xs font-medium text-text-muted">Referring Doctor: {doctorName}</p>
        {r.urgency && r.urgency !== 'routine' && (
          <p className="text-xs text-status-warning font-medium mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Urgency: {r.urgency}
          </p>
        )}
        {r.status === 'pending' && (
          <p className="text-xs text-status-warning font-medium mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting acceptance from {toName}
          </p>
        )}
        {r.notes && (
          <p className="text-xs text-text-muted mt-1 italic">"{r.notes}"</p>
        )}
      </div>
    </div>
  )
}

export default function Referrals() {
  const { user, loading: authLoading } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMyReferrals()
      setReferrals(data || [])
    } catch (err) {
      console.warn('[Referrals] fetch error:', err)
      setError(err.message || 'Failed to load referrals.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      load()
    }
  }, [authLoading, user, load])

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Referrals</h1>
          <p className="text-text-muted text-sm">Track your referral journey from PHC to Specialist</p>
        </div>

        {/* Referral pathway info */}
        <div className="bg-navy rounded-2xl p-5 text-surface text-sm">
          <p className="font-semibold mb-3 text-brand-default">Referral Pathway</p>
          <div className="flex items-center gap-2 flex-wrap text-surface/70 text-xs">
            {['Sub-Centre', 'PHC', 'Rural Hospital', 'District Hospital', 'Specialist'].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <span className="text-surface/90">{s}</span>
                {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-brand-default" />}
              </span>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-status-critical-bg text-status-critical text-xs rounded-lg border border-status-critical/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div><p>{error}</p><button onClick={load} className="underline mt-1">Retry</button></div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1,2].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && referrals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-canvas flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">No referrals found</h3>
            <p className="text-xs text-text-muted mt-1 max-w-xs">Your doctor will create referrals here when you need specialist care.</p>
          </div>
        )}

        {/* Referral cards */}
        {!loading && !error && referrals.length > 0 && (
          <div className="space-y-4">
            {referrals.map(r => <ReferralCard key={r.id} r={r} />)}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
