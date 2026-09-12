/**
 * Queue.jsx — /patient/queue
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully dynamic: resolves patient's active queue entry from today's appointments,
 * subscribes to Supabase Realtime for live updates. No mock data.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert, Skeleton } from '../../components/ui/Misc'
import { getMyQueueEntry, getFacilityQueue, subscribeToQueue } from '../../lib/db'
import { Users, Clock, RefreshCw, AlertCircle, CalendarX, Loader2 } from 'lucide-react'

export default function Queue() {
  const { user, loading: authLoading } = useAuth()
  const [myEntry,   setMyEntry]   = useState(null)   // patient's own queue row
  const [queueList, setQueueList] = useState([])      // full facility queue
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const channelRef = useRef(null)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const entry = await getMyQueueEntry()
      setMyEntry(entry)

      if (entry?.facility_id) {
        const list = await getFacilityQueue(entry.facility_id)
        setQueueList(list || [])
        // Set up realtime subscription
        if (channelRef.current) {
          channelRef.current.unsubscribe()
        }
        channelRef.current = subscribeToQueue(entry.facility_id, () => {
          // Reload full queue on any change
          getFacilityQueue(entry.facility_id)
            .then(l => setQueueList(l || []))
            .catch(() => {})
        })
      } else {
        setQueueList([])
      }
      setLastRefresh(new Date())
    } catch (err) {
      console.warn('[Queue] error:', err)
      setError(err.message || 'Failed to load queue.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      loadQueue()
    }
    return () => {
      if (channelRef.current) channelRef.current.unsubscribe()
    }
  }, [authLoading, user, loadQueue])

  // Calculate queue display values
  const inConsultation = queueList.find(q => q.appointments?.status === 'in_progress' || q.status === 'in_consultation')
  const currentNo      = inConsultation?.queue_number || '—'
  const myPosition     = myEntry?.position ?? null
  const myQueueNo      = myEntry?.queue_number || '—'
  const waiting        = queueList.filter(q => q.status === 'waiting')
  const myIdx          = waiting.findIndex(q => q.id === myEntry?.id)
  const patientsAhead  = myIdx >= 0 ? myIdx : (myPosition != null ? Math.max(0, myPosition - 1) : 0)
  const etaMinutes     = patientsAhead * 5
  const progressPct    = queueList.length > 0
    ? Math.min(100, Math.max(5, 100 - (patientsAhead / (queueList.length || 1)) * 100))
    : 0

  const hasQueue = myEntry != null

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Queue</h1>
          <p className="text-text-muted text-sm">
            {hasQueue && myEntry?.facility?.name
              ? `Real-time queue position at ${myEntry.facility.name}`
              : 'Real-time OPD queue position'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-status-critical-bg text-status-critical text-xs rounded-lg border border-status-critical/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p>{error}</p>
              <button onClick={loadQueue} className="underline mt-1">Retry</button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-52 rounded-2xl" />
          </div>
        )}

        {/* No queue today */}
        {!loading && !error && !hasQueue && (
          <div className="flex flex-col items-center justify-center py-16 bg-surface-elevated rounded-2xl border border-border-subtle text-center">
            <div className="w-16 h-16 rounded-full bg-canvas flex items-center justify-center mb-4">
              <CalendarX className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="font-semibold text-text-primary">No Active Queue Today</h3>
            <p className="text-xs text-text-muted mt-2 max-w-xs">
              You'll appear in the queue after booking and confirming an appointment for today.
            </p>
            <p className="text-xs text-text-muted mt-1">
              Last refreshed: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <Button size="sm" variant="outline" className="mt-4" onClick={loadQueue}>
              <RefreshCw className="w-3.5 h-3.5" /> Check Again
            </Button>
          </div>
        )}

        {/* Active queue */}
        {!loading && !error && hasQueue && (
          <>
            <Alert type="info" title="Consultation in progress">
              Patients are being called at {myEntry?.facility?.name || 'the facility'}. Please be ready when your number is announced.
            </Alert>

            {/* Queue display */}
            <div className="bg-surface-elevated rounded-2xl border border-border-subtle p-8 text-center shadow-sm">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Now Serving</p>
                  <div className="text-5xl font-black text-status-success">{currentNo}</div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Your Number</p>
                  <div className="text-5xl font-black text-brand-default">{myQueueNo}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-border rounded-full h-3 mb-6 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal to-blue rounded-full transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-canvas rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Patients Ahead</span>
                  </div>
                  <div className="text-3xl font-bold text-text-primary">{patientsAhead}</div>
                </div>
                <div className="bg-canvas rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Est. Wait</span>
                  </div>
                  <div className="text-3xl font-bold text-text-primary">
                    {etaMinutes}<span className="text-sm font-normal ml-1">min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live queue list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text-primary">Live Queue Status</h2>
                <button onClick={loadQueue} className="flex items-center gap-1 text-xs text-brand-default hover:underline">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              <div className="bg-surface-elevated rounded-xl border border-border-subtle overflow-hidden">
                {queueList.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-text-muted">No queue entries yet.</div>
                ) : (
                  queueList.map((item, i) => {
                    const isCurrent = item.status === 'in_consultation'
                    const isMe      = item.id === myEntry?.id
                    return (
                      <div key={item.id}
                        className={`flex items-center justify-between px-4 py-3 text-sm border-b border-border-subtle last:border-0
                          ${isCurrent ? 'bg-status-success-bg' : isMe ? 'bg-subtle' : ''}`}>
                        <span className={`font-mono font-bold ${isCurrent ? 'text-status-success' : isMe ? 'text-brand-default' : 'text-text-muted'}`}>
                          {item.queue_number}
                          {isCurrent ? ' (Current)' : isMe ? ' (You)' : ''}
                        </span>
                        {isCurrent && <Badge variant="success">In Consultation</Badge>}
                        {isMe && !isCurrent && <Badge variant="default">← You</Badge>}
                      </div>
                    )
                  })
                )}
              </div>
              <p className="text-xs text-text-muted mt-2 text-right">
                Last updated: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
