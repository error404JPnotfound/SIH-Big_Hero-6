import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { getAdminDoctors } from '../../lib/db'
import { Stethoscope, Building2, MapPin, Search, Filter } from 'lucide-react'

export default function Doctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminDoctors()
        if (data) setDoctors(data)
      } catch (err) {
        console.error('Error loading doctors:', err)
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
            <h1 className="text-2xl font-bold text-navy">Doctors Directory</h1>
            <p className="text-muted text-sm">Manage and monitor medical staff across facilities</p>
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
            {doctors.map((doc, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 rounded-full bg-teal flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {doc.name.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-navy text-base truncate">{doc.name}</h3>
                    <Badge variant={doc.status === 'Active' ? 'success' : 'outline'}>{doc.status}</Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                    <span className="flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> {doc.specialization}</span>
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {doc.facility}</span>
                    <span className="text-xs px-2 py-0.5 bg-bg rounded-md font-mono">{doc.reg_number}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button className="px-4 py-1.5 text-sm font-medium border border-border rounded-lg text-navy hover:bg-bg transition-colors">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
            
            {doctors.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-muted">No doctors found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
