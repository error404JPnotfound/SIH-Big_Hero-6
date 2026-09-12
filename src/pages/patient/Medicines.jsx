/**
 * Medicines.jsx — /patient/medicines
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully dynamic: searches medicine availability via searchMedicines() RPC.
 * Debounced input. Loading / empty / error states. No mock data.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Misc'
import { searchMedicines } from '../../lib/db'
import { Pill, Search, MapPin, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function Medicines() {
  const [query,    setQuery]    = useState('')
  const [filter,   setFilter]   = useState('all')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [searched, setSearched] = useState(false)

  const debounceRef = useRef(null)

  const runSearch = useCallback(async (q, f) => {
    setLoading(true)
    setError(null)
    try {
      const availOnly = f === 'available' ? true : f === 'unavailable' ? false : null
      const data = await searchMedicines(q.trim(), null, availOnly)
      setResults(data || [])
    } catch (err) {
      console.error('[Medicines] search error:', err)
      setError(err.message || 'Failed to search medicines.')
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch(query, filter)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, filter, runSearch])

  // Initial load (show all)
  useEffect(() => {
    runSearch('', 'all')
  }, [runSearch])

  // Client-side govt filter (search_medicines RPC doesn't have p_govt param)
  const displayed = filter === 'govt'
    ? results.filter(m => m.is_govt)
    : results

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Medicine Availability</h1>
          <p className="text-text-muted text-sm">Check real-time medicine stock at nearby facilities</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border-subtle bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-brand-default"
            placeholder="Search medicine name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all',         label: 'All' },
            { id: 'available',   label: 'Available Now' },
            { id: 'unavailable', label: 'Out of Stock' },
            { id: 'govt',        label: 'Govt Facility' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === f.id
                  ? 'bg-brand-default text-white border-brand-default'
                  : 'border-border-subtle text-text-muted hover:border-brand-default hover:text-brand-default'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-status-critical-bg text-status-critical text-xs rounded-lg border border-status-critical/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          {loading && !searched ? (
            [1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : displayed.length === 0 && searched && !loading ? (
            <div className="text-center py-12 text-text-muted">
              <Pill className="w-10 h-10 mx-auto mb-3 text-border" />
              <p className="text-sm font-medium text-text-primary">No medicines found</p>
              {query && <p className="text-xs mt-1">No results for "{query}"</p>}
              {!query && <p className="text-xs mt-1">Try searching for a medicine name above.</p>}
            </div>
          ) : (
            displayed.map((m, idx) => (
              <div key={`${m.medicine_id}-${m.facility_id}-${idx}`}
                className="bg-surface-elevated rounded-xl border border-border-subtle p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${m.is_available ? 'bg-status-success-bg' : 'bg-status-critical-bg'}`}>
                    <Pill className={`w-5 h-5 ${m.is_available ? 'text-status-success' : 'text-status-critical'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-text-primary text-sm">{m.name}</h3>
                      {m.generic_name && m.generic_name !== m.name && (
                        <span className="text-xs text-text-muted">({m.generic_name})</span>
                      )}
                      <Badge variant={m.is_available ? 'success' : 'critical'}>
                        {m.is_available
                          ? <><CheckCircle2 className="w-3 h-3" /> Available</>
                          : <><XCircle     className="w-3 h-3" /> Out of Stock</>}
                      </Badge>
                      {m.is_govt && <Badge variant="blue">Govt</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.facility_name}</span>
                      {m.quantity != null && m.is_available && (
                        <span>{m.quantity} {m.unit || 'units'} in stock</span>
                      )}
                      {m.updated_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />Updated {new Date(m.updated_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
