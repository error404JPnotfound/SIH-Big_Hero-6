import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Textarea, Input, Select } from '../../components/ui/Input'
import { Tabs, useTabs } from '../../components/ui/Tabs'
import { MOCK_DOCTOR_QUEUE } from '../../lib/mockData'
import { Play, SkipForward, CheckCircle2, Clock, AlertCircle, User, Plus } from 'lucide-react'

const PRIORITY_MAP = {
  high:   { variant: 'critical', label: 'High' },
  medium: { variant: 'warning', label: 'Medium' },
  low:    { variant: 'success', label: 'Low' },
}

function PrescriptionForm({ onSave }) {
  const [items, setItems] = useState([{ medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  const addItem = () => setItems(i => [...i, { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  const setField = (idx, field, val) => setItems(items => items.map((it, i) => i === idx ? { ...it, [field]: val } : it))

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="bg-bg rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-navy">Medicine {idx + 1}</p>
            {items.length > 1 && <button onClick={() => setItems(i => i.filter((_, i2) => i2 !== idx))} className="text-xs text-critical hover:underline">Remove</button>}
          </div>
          <Input label="Medicine Name" placeholder="e.g. Paracetamol 500mg" value={item.medicine} onChange={e => setField(idx, 'medicine', e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Dosage" placeholder="1 tablet" value={item.dosage} onChange={e => setField(idx, 'dosage', e.target.value)} />
            <Input label="Frequency" placeholder="Twice daily" value={item.frequency} onChange={e => setField(idx, 'frequency', e.target.value)} />
            <Input label="Duration" placeholder="5 days" value={item.duration} onChange={e => setField(idx, 'duration', e.target.value)} />
          </div>
          <Input label="Instructions" placeholder="After food" value={item.instructions} onChange={e => setField(idx, 'instructions', e.target.value)} />
        </div>
      ))}
      <button onClick={addItem} className="flex items-center gap-1.5 text-sm text-teal font-medium hover:underline">
        <Plus className="w-4 h-4" /> Add medicine
      </button>
      <Button className="w-full bg-teal text-white" size="lg" onClick={() => onSave(items)}>
        Save & Send Prescription
      </Button>
    </div>
  )
}

function ConsultationModal({ patient, open, onClose }) {
  const [tab, setTab] = useTabs('notes')
  const [prescribed, setPrescribed] = useState(false)

  if (!patient) return null

  return (
    <Modal open={open} onClose={onClose} title={`Consultation — ${patient.name}`} size="xl">
      <div className="flex items-center gap-3 mb-5 p-3 bg-bg rounded-xl border border-border">
        <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-white font-bold">{patient.name[0]}</div>
        <div>
          <p className="font-semibold text-navy text-sm">{patient.name} · {patient.age} yrs</p>
          <p className="text-xs text-muted">{patient.reason}</p>
        </div>
        <Badge variant={PRIORITY_MAP[patient.priority].variant} className="ml-auto">{PRIORITY_MAP[patient.priority].label}</Badge>
      </div>

      <Tabs
        tabs={[
          { id: 'notes', label: 'Consultation Notes' },
          { id: 'vitals', label: 'Record Vitals' },
          { id: 'prescribe', label: 'Prescribe' },
          { id: 'refer', label: 'Refer' },
        ]}
        activeTab={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === 'notes' && (
        <div className="space-y-4">
          <Textarea label="Chief Complaint" placeholder="Patient's main complaint in their own words..." rows={3} />
          <Textarea label="Clinical Findings" placeholder="Physical examination findings, observations..." rows={4} />
          <Textarea label="Assessment / Diagnosis" placeholder="Clinical assessment and diagnosis..." rows={3} />
          <Textarea label="Plan" placeholder="Treatment plan, follow-up instructions..." rows={3} />
          <Button className="bg-teal text-white w-full">Save Notes</Button>
        </div>
      )}

      {tab === 'vitals' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Blood Pressure', placeholder: '120/80 mmHg', id: 'bp' },
            { label: 'Heart Rate', placeholder: '72 bpm', id: 'hr' },
            { label: 'Temperature', placeholder: '98.6°F', id: 'temp' },
            { label: 'SpO2', placeholder: '98%', id: 'spo2' },
            { label: 'Blood Sugar (RBS)', placeholder: '110 mg/dL', id: 'bs' },
            { label: 'Weight', placeholder: '65 kg', id: 'wt' },
          ].map(v => <Input key={v.id} label={v.label} placeholder={v.placeholder} />)}
          <div className="col-span-2">
            <Button className="bg-teal text-white w-full">Save Vitals</Button>
          </div>
        </div>
      )}

      {tab === 'prescribe' && (
        prescribed
          ? <div className="text-center py-8 text-success">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
              <p className="font-semibold">Prescription saved & sent to patient.</p>
            </div>
          : <PrescriptionForm onSave={() => setPrescribed(true)} />
      )}

      {tab === 'refer' && (
        <div className="space-y-4">
          <Select label="Refer To Facility">
            <option>Select facility...</option>
            <option>District Hospital Khandwa</option>
            <option>CHC Sanawad</option>
            <option>Sub-Division Hospital</option>
          </Select>
          <Select label="Department">
            <option>Select department...</option>
            <option>Cardiology</option>
            <option>Gynaecology</option>
            <option>Orthopaedics</option>
            <option>General Surgery</option>
          </Select>
          <Textarea label="Reason for Referral" placeholder="Clinical reason and urgency..." rows={4} />
          <Select label="Priority">
            <option>Routine</option>
            <option>Urgent</option>
            <option>Emergency</option>
          </Select>
          <Button className="bg-teal text-white w-full">Create Referral</Button>
        </div>
      )}
    </Modal>
  )
}

export default function DoctorQueue() {
  const [activePatient, setActivePatient] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleStart = (patient) => {
    setActivePatient(patient)
    setModalOpen(true)
  }

  return (
    <AppLayout role="doctor">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Today's Queue</h1>
            <p className="text-muted text-sm">PHC Khandwa · {MOCK_DOCTOR_QUEUE.length} patients waiting</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Pause Queue</Button>
            <Button className="bg-teal text-white" size="sm">Next Patient</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Waiting', value: MOCK_DOCTOR_QUEUE.length, color: 'text-warning' },
            { label: 'Completed', value: 14, color: 'text-success' },
            { label: 'High Priority', value: MOCK_DOCTOR_QUEUE.filter(p => p.priority === 'high').length, color: 'text-critical' },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-xl border border-border p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Queue cards */}
        <div className="space-y-3">
          {MOCK_DOCTOR_QUEUE.map((patient, idx) => (
            <div key={patient.id} className={`bg-surface rounded-xl border p-4 hover:shadow-sm transition-shadow ${patient.priority === 'high' ? 'border-critical/30' : 'border-border'}`}>
              <div className="flex items-center gap-4">
                {/* Queue number */}
                <div className="w-14 h-14 rounded-xl bg-navy flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs text-surface/50">No.</span>
                  <span className="font-bold text-teal font-mono">{patient.queue_no}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy">{patient.name}</span>
                    <span className="text-sm text-muted">{patient.age} yrs</span>
                    <Badge variant={PRIORITY_MAP[patient.priority].variant}>{PRIORITY_MAP[patient.priority].label}</Badge>
                    {patient.priority === 'high' && <AlertCircle className="w-4 h-4 text-critical" />}
                  </div>
                  <p className="text-sm text-muted mt-0.5">{patient.reason}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Waiting {patient.waiting_since}</span>
                    <span>Appt: {patient.appointment}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" variant="ghost">Records</Button>
                  <Button size="sm" className="bg-teal text-white" onClick={() => handleStart(patient)}>
                    <Play className="w-3.5 h-3.5" /> Consult
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConsultationModal patient={activePatient} open={modalOpen} onClose={() => setModalOpen(false)} />
    </AppLayout>
  )
}
