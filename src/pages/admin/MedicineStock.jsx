import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { getAdminMedicineStock } from '../../lib/db'
import { Search, Filter, Pill, AlertTriangle } from 'lucide-react'

export default function MedicineStock() {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminMedicineStock()
        if (data) setMedicines(data)
      } catch (err) {
        console.error('Error loading medicines:', err)
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
            <h1 className="text-2xl font-bold text-navy">Medicine Stock</h1>
            <p className="text-muted text-sm">District inventory and shortage alerts</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 border border-border rounded-lg text-muted hover:bg-bg"><Search className="w-4 h-4" /></button>
            <button className="p-2 border border-border rounded-lg text-muted hover:bg-bg"><Filter className="w-4 h-4" /></button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted">Loading...</div>
        ) : (
          <div className="space-y-3">
            {medicines.map((med, i) => (
              <div key={i} className={`bg-surface border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow ${!med.is_available ? 'border-critical/30 bg-critical-bg/30' : 'border-border'}`}>
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
                  <button className="px-4 py-1.5 text-sm font-medium border border-border rounded-lg text-navy hover:bg-bg transition-colors">
                    Order Stock
                  </button>
                </div>
              </div>
            ))}
            
            {medicines.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-muted">No medicines found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
