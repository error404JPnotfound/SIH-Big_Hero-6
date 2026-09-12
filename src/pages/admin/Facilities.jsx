import { useLiveRecords } from '../../hooks/useLiveRecords'
import { facilities as getLiveFacilities, saveFacility } from '../../lib/adminLive'
import { RecordDetails } from '../../components/RecordDetails'
import { RecordEditor } from '../../components/RecordEditor'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/Misc'
import { useState } from 'react'

import { Building2, Users, Stethoscope, Bed, Wifi, Plus, MapPin } from 'lucide-react'

const STATUS_META = {
  operational: { variant: 'success', label: 'Operational' },
  busy: { variant: 'warning', label: 'Busy' },
  limited_capacity: { variant: 'warning', label: 'Limited Capacity' },
  critical: { variant: 'critical', label: 'Critical' },
}

function FacilityCard({ fac, onDetails, onEdit }) {
  const meta = STATUS_META[fac.status] || {variant: 'outline', label: fac.status || 'Unknown'}
  const patientsToday = fac.patients_today || 0
  const capacity = fac.capacity ?? 0
  const load = capacity > 0 ? Math.round((patientsToday / capacity) * 100) : 0
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

      {capacity > 0 ? <ProgressBar value={patientsToday} max={capacity} color={loadColor} label="Patient Load" /> : <p className="text-sm text-text-muted">Capacity not recorded</p>}

      <div className="flex gap-2 mt-4">
        <Button onClick={() => onDetails(fac)} variant="outline" size="sm" className="flex-1">Details</Button>
        <Button onClick={() => onEdit(fac)} className="flex-1 bg-brand-default text-white" size="sm">Manage</Button>
      </div>
    </div>
  )
}

export default function Facilities() {
  const { data: facilities, loading, error } = useLiveRecords(getLiveFacilities)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Facility Management</h1>
            <p className="text-text-muted text-sm">{facilities.length} facilities in the directory</p>
          </div>
          <Button onClick={() => setEditing({name:'',type:'phc',status:'operational',capacity:0,beds:0})} className="bg-brand-default text-white"><Plus className="w-4 h-4" /> Add Facility</Button>
        </div>

        {error && <p role="alert" className="text-status-critical">{error}</p>}
        <input aria-label="Search facilities" placeholder="Search facilities…" value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 rounded-lg border border-border-subtle bg-surface-elevated" />
        {loading && <p>Loading facilities…</p>}
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
          {facilities.filter(f => f.name.toLowerCase().includes(search.toLowerCase())).map(fac => <FacilityCard key={fac.id} fac={fac} onDetails={setSelected} onEdit={setEditing} />)}
        </div>
      </div>
      <RecordDetails title="Facility Details" record={selected} onClose={() => setSelected(null)} />
      {editing && <RecordEditor key={editing.id || 'new'} title={editing.id ? 'Manage Facility' : 'Add Facility'} initial={editing} onClose={() => setEditing(null)} onSave={values => saveFacility(editing.id, values)} fields={[
        {name:'name',label:'Name',required:true}, {name:'type',label:'Type',options:['sub_centre','phc','rural_hospital','district_hospital','specialist_centre']},
        {name:'status',label:'Status',options:['operational','busy','limited_capacity','critical','closed']},
        {name:'address',label:'Address'}, {name:'district',label:'District'}, {name:'state',label:'State'}, {name:'phone',label:'Phone'},
        {name:'capacity',label:'Daily capacity',type:'number',min:0,required:true}, {name:'beds',label:'Beds',type:'number',min:0,required:true},
      ]} />}
    </AppLayout>
  )
}
