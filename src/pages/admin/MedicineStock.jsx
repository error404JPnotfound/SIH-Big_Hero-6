import { saveStock } from '../../lib/adminLive'
import { RecordEditor } from '../../components/RecordEditor'
import { useLiveRecords } from '../../hooks/useLiveRecords'
import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { getAdminMedicineStock } from '../../lib/db'
import { Search, Filter, Pill, AlertTriangle } from 'lucide-react'

export default function MedicineStock() {
  const { data: medicines, loading, error } = useLiveRecords(getAdminMedicineStock)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filteredOnly, setFilteredOnly] = useState(false)


  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {error && <p role="alert" className="p-4 text-status-critical border rounded-xl">Unable to load live data: {error}</p>}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Medicine Stock</h1>
            <p className="text-muted text-sm">District inventory and shortage alerts</p>
          </div>
          <div className="flex gap-2">
            <button 
              aria-label="Search" onClick={() => { setShowSearch(!showSearch); setSearchQuery('') }}
              className={`p-2 border rounded-lg transition-colors ${showSearch ? 'border-teal text-teal bg-teal-light/50' : 'border-border text-muted hover:bg-bg'}`}
            >
              <Search className="w-4 h-4" />
            </button>
            <button aria-label="Toggle filter" aria-pressed={filteredOnly} onClick={() => setFilteredOnly(v => !v)} className="p-2 border border-border rounded-lg text-muted hover:bg-bg"><Filter className="w-4 h-4" /></button>
          </div>
        </div>

        {showSearch && (
          <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search medicines by name or facility..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-teal transition-colors"
            />
          </div>
        )}

        {filteredOnly && <p className="text-sm text-brand-default">Showing stock shortages</p>}
        {loading ? (
          <div className="text-center py-12 text-muted">Loading...</div>
        ) : error ? null : (
          <div className="space-y-3">
            {medicines.filter(med => !filteredOnly || !med.is_available).filter(med => !searchQuery || med.name.toLowerCase().includes(searchQuery.toLowerCase()) || med.facility.toLowerCase().includes(searchQuery.toLowerCase())).map((med) => (
              <div key={med.id} className={`bg-surface border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow ${!med.is_available ? 'border-critical/30 bg-critical-bg/30' : 'border-border'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${!med.is_available ? 'bg-critical-bg text-critical' : 'bg-teal/10 text-teal'}`}>
                  {med.is_available ? <Pill className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-navy text-sm truncate">{med.name}</h3>
                    <Badge variant={med.is_available ? 'success' : 'critical'}>
                      {med.is_available ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted">
                    <span>{med.facility}</span>
                    <span className="font-medium text-text">
                      Qty: {med.quantity.toLocaleString()} {med.unit}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setSelected(med)} className="px-4 py-1.5 text-sm font-medium border border-border rounded-lg text-navy hover:bg-bg transition-colors">
                    Update Stock
                  </button>
                </div>
              </div>
            ))}
            
            {medicines.filter(med => !filteredOnly || !med.is_available).filter(med => !searchQuery || med.name.toLowerCase().includes(searchQuery.toLowerCase()) || med.facility.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-muted">No medicines found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
      {selected && <RecordEditor key={selected.id} title={`Update Stock: ${selected.name}`} initial={selected} fields={[{name:'quantity',label:'Quantity',type:'number',min:0,required:true},{name:'unit',label:'Unit',required:true}]} onSave={values => saveStock(selected.id, values)} onClose={() => setSelected(null)} />}
    </AppLayout>
  )
}
