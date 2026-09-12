import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/Misc'
import { useState, useEffect } from 'react'
import { getFacilities } from '../../lib/db'
import { Building2, Users, Stethoscope, Bed, Wifi, Plus, MapPin } from 'lucide-react'

const STATUS_META = {
  operational: { variant: 'success', label: 'Operational' },
  busy: { variant: 'warning', label: 'Busy' },
  limited_capacity: { variant: 'warning', label: 'Limited Capacity' },
  critical: { variant: 'critical', label: 'Critical' },
}

function FacilityCard({ fac }) {
  const meta = STATUS_META[fac.status]
  const patientsToday = fac.patients_today || 0
  const capacity = fac.capacity || 100
  const load = Math.round((patientsToday / capacity) * 100)
  const loadColor = load > 85 ? 'critical' : load > 65 ? 'warning' : 'success'

  return (
    <div className="bg-surface-elevated rounded-2xl border border-border-subtle p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-sm">{fac.name}</h3>
            <p className="text-xs text-text-muted">{fac.type}</p>
          </div>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      <div className="flex items-center gap-1 text-xs text-text-muted mb-4">
        <MapPin className="w-3 h-3" />{fac.location}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center mb-4">
        <div className="bg-canvas rounded-lg py-2">
          <div className="flex items-center justify-center gap-1 mb-1"><Stethoscope className="w-3 h-3 text-brand-default" /></div>
          <p className="text-base font-bold text-text-primary">{fac.doctors || 0}</p>
          <p className="text-xs text-text-muted">Doctors</p>
        </div>
        <div className="bg-canvas rounded-lg py-2">
          <div className="flex items-center justify-center gap-1 mb-1"><Users className="w-3 h-3 text-brand-secondary" /></div>
          <p className="text-base font-bold text-text-primary">{patientsToday}</p>
          <p className="text-xs text-text-muted">Today</p>
        </div>
        <div className="bg-canvas rounded-lg py-2">
          <div className="flex items-center justify-center gap-1 mb-1"><Bed className="w-3 h-3 text-status-success" /></div>
          <p className="text-base font-bold text-text-primary">{fac.beds || 0}</p>
          <p className="text-xs text-text-muted">Beds</p>
        </div>
        </div>
      </div>

      <ProgressBar value={patientsToday} max={capacity} color={loadColor} label="Patient Load" />

      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" className="flex-1">Details</Button>
        <Button className="flex-1 bg-brand-default text-white" size="sm">Manage</Button>
      </div>
    </div>
  )
}

export default function Facilities() {
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getFacilities()
        if (data) setFacilities(data)
      } catch (err) {
        console.error('Error loading facilities:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Facility Management</h1>
            <p className="text-text-muted text-sm">{facilities.length} facilities across Khandwa district</p>
          </div>
          <Button className="bg-brand-default text-white"><Plus className="w-4 h-4" /> Add Facility</Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Facilities', value: facilities.length, color: 'text-text-primary' },
            { label: 'Operational', value: facilities.filter(f => f.status === 'operational').length, color: 'text-status-success' },
            { label: 'Busy/Limited', value: facilities.filter(f => ['busy','limited_capacity'].includes(f.status)).length, color: 'text-status-warning' },
            { label: 'Total Doctors', value: facilities.reduce((s, f) => s + (f.doctors || 0), 0), color: 'text-brand-default' },
          ].map(s => (
            <div key={s.label} className="bg-surface-elevated rounded-xl border border-border-subtle p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {facilities.map(fac => <FacilityCard key={fac.id} fac={fac} />)}
        </div>
      </div>
    </AppLayout>
  )
}
