import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { getAdminPatients } from '../../lib/db'
import { Search, Filter, AlertCircle } from 'lucide-react'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminPatients()
        if (data) setPatients(data)
      } catch (err) {
        console.error('Error loading patients:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Patient Registry</h1>
            <p className="text-muted text-sm">District-wide patient database</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setShowSearch(!showSearch); setSearchQuery('') }}
              className={`p-2 border rounded-lg transition-colors ${showSearch ? 'border-teal text-teal bg-teal-light/50' : 'border-border text-muted hover:bg-bg'}`}
            >
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 border border-border rounded-lg text-muted hover:bg-bg"><Filter className="w-4 h-4" /></button>
          </div>
        </div>

        {showSearch && (
          <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search patients by name, code, or condition..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-teal transition-colors"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted">Loading...</div>
        ) : (
          <div className="space-y-3">
            {patients.filter(pt => !searchQuery || pt.name.toLowerCase().includes(searchQuery.toLowerCase()) || pt.patient_code.toLowerCase().includes(searchQuery.toLowerCase()) || (pt.condition && pt.condition.toLowerCase().includes(searchQuery.toLowerCase()))).map((pt, i) => (
              <div key={i} className={`bg-surface border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow ${pt.is_high_risk ? 'border-critical/30' : 'border-border'}`}>
                <div className="w-12 h-12 rounded-full bg-blue-light text-blue flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {pt.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-navy text-base truncate">{pt.name}</h3>
                    {pt.is_high_risk && (
                      <Badge variant="critical" className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> High Risk
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                    <span className="font-mono px-2 py-0.5 bg-bg rounded text-xs">{pt.patient_code}</span>
                    <span>{pt.age} yrs, {pt.gender}</span>
                    {pt.condition && pt.condition !== 'None' && (
                      <span className="text-critical">{pt.condition}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button className="px-4 py-1.5 text-sm font-medium border border-border rounded-lg text-navy hover:bg-bg transition-colors">
                    View Records
                  </button>
                </div>
              </div>
            ))}

            {patients.filter(pt => !searchQuery || pt.name.toLowerCase().includes(searchQuery.toLowerCase()) || pt.patient_code.toLowerCase().includes(searchQuery.toLowerCase()) || (pt.condition && pt.condition.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-muted">No patients found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
