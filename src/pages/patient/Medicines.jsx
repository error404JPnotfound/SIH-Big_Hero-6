import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { MOCK_MEDICINES } from '../../lib/mockData'
import { getMyPrescriptions } from '../../lib/db'
import { Pill, Search, MapPin, Clock, CheckCircle2, XCircle, Filter, Loader2 } from 'lucide-react'

export default function Medicines() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [prescribedMedicines, setPrescribedMedicines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const data = await getMyPrescriptions()
        const medNames = []
        data?.forEach(p => {
          p.prescription_items?.forEach(item => {
            if (item.medicine_name) {
              medNames.push(item.medicine_name.toLowerCase().trim())
            }
          })
        })
        setPrescribedMedicines(medNames)
      } catch (err) {
        console.error('Error fetching prescriptions:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPrescriptions()
  }, [])

  const filtered = MOCK_MEDICINES.filter(m => {
    const isPrescribed = prescribedMedicines.some(pMed => 
      m.name.toLowerCase().includes(pMed) || pMed.includes(m.name.toLowerCase())
    )
    const matchQuery = m.name.toLowerCase().includes(query.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'available' && m.available)
    return isPrescribed && matchQuery && matchFilter
  })

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Prescribed Medicines</h1>
          <p className="text-text-muted text-sm">Check real-time availability of your prescribed medicines at nearby facilities</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border-subtle bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-brand-default"
            placeholder="Search medicine name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[{ id: 'all', label: 'All' }, { id: 'available', label: 'Available Now' }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === f.id ? 'bg-brand-default text-white border-brand-default' : 'border-border-subtle text-text-muted hover:border-brand-default hover:text-brand-default'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-default" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(m => (
              <div key={m.id} className="bg-surface-elevated rounded-xl border border-border-subtle p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${m.available ? 'bg-status-success-bg' : 'bg-status-critical-bg'}`}>
                    <Pill className={`w-5 h-5 ${m.available ? 'text-status-success' : 'text-status-critical'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-text-primary text-sm">{m.name}</h3>
                      <Badge variant={m.available ? 'success' : 'critical'}>
                        {m.available ? <><CheckCircle2 className="w-3 h-3" /> Available</> : <><XCircle className="w-3 h-3" /> Unavailable</>}
                      </Badge>
                      {m.govt && <Badge variant="blue">Govt</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.facility}</span>
                      <span>{m.distance}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Updated {m.updated}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-text-muted">
              <Pill className="w-10 h-10 mx-auto mb-3 text-border" />
              {prescribedMedicines.length === 0 ? (
                <p>You have no prescribed medicines on record.</p>
              ) : (
                <p>No prescribed medicines found matching "{query}" or current filters.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
