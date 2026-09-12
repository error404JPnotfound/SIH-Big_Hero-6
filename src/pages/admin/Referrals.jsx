import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { getAdminReferrals } from '../../lib/db'
import { Search, Filter, ArrowRight } from 'lucide-react'

export default function Referrals() {
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminReferrals()
        if (data) setReferrals(data)
      } catch (err) {
        console.error('Error loading referrals:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success'
      case 'pending': return 'warning'
      case 'cancelled': return 'critical'
      default: return 'outline'
    }
  }

  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Referrals Dashboard</h1>
            <p className="text-muted text-sm">Monitor inter-facility patient transfers</p>
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
              placeholder="Search referrals by patient name, code, facility, or department..." 
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
            {referrals.filter(ref => !searchQuery || ref.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || ref.patient_code.toLowerCase().includes(searchQuery.toLowerCase()) || ref.from_facility.toLowerCase().includes(searchQuery.toLowerCase()) || ref.to_facility.toLowerCase().includes(searchQuery.toLowerCase()) || ref.department.toLowerCase().includes(searchQuery.toLowerCase())).map((ref, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs px-2 py-0.5 bg-bg rounded text-muted">{ref.patient_code}</span>
                    <h3 className="font-semibold text-navy text-sm truncate">{ref.patient_name}</h3>
                    <Badge variant={getStatusColor(ref.status)} className="capitalize ml-auto md:ml-0">
                      {ref.status}
                    </Badge>
                    {ref.urgency === 'urgent' && <Badge variant="critical">Urgent</Badge>}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <span className="font-medium text-text">{ref.from_facility}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span className="font-medium text-text">{ref.to_facility}</span>
                    <span className="mx-2 text-border">|</span>
                    <span>{ref.department}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button className="px-4 py-1.5 text-sm font-medium border border-border rounded-lg text-navy hover:bg-bg transition-colors">
                    Review
                  </button>
                </div>
              </div>
            ))}
            
            {referrals.filter(ref => !searchQuery || ref.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || ref.patient_code.toLowerCase().includes(searchQuery.toLowerCase()) || ref.from_facility.toLowerCase().includes(searchQuery.toLowerCase()) || ref.to_facility.toLowerCase().includes(searchQuery.toLowerCase()) || ref.department.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-muted">No referrals found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
