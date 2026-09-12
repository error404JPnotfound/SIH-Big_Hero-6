import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Textarea, Input, Select } from '../../components/ui/Input'
import { Tabs, useTabs } from '../../components/ui/Tabs'
import { Alert } from '../../components/ui/Misc'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  updateQueueStatus,
  updateAppointmentStatus,
  updateDoctorAvailability,
  getDoctorQueue,
  saveConsultationComplete,
  recordVitals,
  createPrescription,
  createReferral,
  getFacilities,
} from '../../lib/db'
import { Play, SkipForward, Clock, AlertCircle, Plus, Loader2, RefreshCw } from 'lucide-react'

const PRIORITY_MAP = {
  emergency: { variant: 'critical', label: 'Emergency' },
  high:      { variant: 'critical', label: 'High' },
  low:       { variant: 'success', label: 'Low' },
}

function getAge(dob) {
  if (!dob) return '—'
  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return '—'

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

function getWaitingTime(createdAt, status) {
  if (!createdAt) return '—'
  if (status === 'in_consultation') return 'In consultation'

  const started = new Date(createdAt).getTime()
  if (Number.isNaN(started)) return '—'

  const minutes = Math.max(0, Math.floor((Date.now() - started) / 60000))
  if (minutes < 60) return `${minutes} mins`

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `${hours}h ${remaining}m`
}

function PrescriptionForm({ onSave, loading }) {
  const [items, setItems] = useState([{ medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  const addItem = () => setItems(i => [...i, { medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  const setField = (idx, field, val) => setItems(items => items.map((it, i) => i === idx ? { ...it, [field]: val } : it))

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="bg-canvas rounded-xl p-4 border border-border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Medicine {idx + 1}</p>
            {items.length > 1 && (
              <button onClick={() => setItems(i => i.filter((_, i2) => i2 !== idx))} className="text-xs text-status-critical hover:underline">
                Remove
              </button>
            )}
          </div>
          <Input label="Medicine Name" placeholder="e.g. Paracetamol 500mg" value={item.medicine_name} onChange={e => setField(idx, 'medicine_name', e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Dosage" placeholder="1 tablet" value={item.dosage} onChange={e => setField(idx, 'dosage', e.target.value)} />
            <Input label="Frequency" placeholder="Twice daily" value={item.frequency} onChange={e => setField(idx, 'frequency', e.target.value)} />
            <Input label="Duration" placeholder="5 days" value={item.duration} onChange={e => setField(idx, 'duration', e.target.value)} />
          </div>
          <Input label="Instructions" placeholder="After food" value={item.instructions} onChange={e => setField(idx, 'instructions', e.target.value)} />
        </div>
      ))}
      <button onClick={addItem} className="flex items-center gap-1.5 text-sm text-brand-default font-medium hover:underline">
        <Plus className="w-4 h-4" /> Add medicine
      </button>
      <Button className="w-full bg-brand-default text-white hover:bg-brand-hover" size="lg" disabled={loading} onClick={() => onSave(items)}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Prescription'}
      </Button>
    </div>
  )
}

function ConsultationModal({ patient, doctor, open, onClose, onFinishConsultation }) {
  const [tab, setTab] = useTabs('notes')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [facilities, setFacilities] = useState([])

  // Form states
  const [notes, setNotes] = useState({ chiefComplaint: '', clinicalFindings: '', assessment: '', plan: '' })
  const [vitals, setVitals] = useState({ bp_systolic: '', bp_diastolic: '', heart_rate: '', temperature: '', spo2: '', blood_sugar: '', weight: '' })
  const [referral, setReferral] = useState({ toFacilityId: '', department: '', reason: '', urgency: 'routine', notes: '' })

  useEffect(() => {
    if (open) {
      setStatusMsg('')
      setErrorMsg('')
      getFacilities().then(data => setFacilities(data || [])).catch(console.error)
    }
  }, [open])

  if (!patient) return null

  const handleSaveNotes = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      if (patient.patient_id && doctor?.id) {
        await saveConsultationComplete({
          appointmentId: patient.appointment_id,
          patientId: patient.patient_id,
          doctorId: doctor.id,
          facilityId: doctor.facility_id,
          ...notes,
        })
      }
      setStatusMsg('Consultation notes saved successfully!')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save notes.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveVitals = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      if (patient.patient_id) {
        await recordVitals(patient.patient_id, null, {
          bp_systolic: vitals.bp_systolic ? parseInt(vitals.bp_systolic, 10) : null,
          bp_diastolic: vitals.bp_diastolic ? parseInt(vitals.bp_diastolic, 10) : null,
          heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate, 10) : null,
          temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
          spo2: vitals.spo2 ? parseInt(vitals.spo2, 10) : null,
          blood_sugar: vitals.blood_sugar ? parseFloat(vitals.blood_sugar) : null,
          weight: vitals.weight ? parseFloat(vitals.weight) : null,
        })
      }
      setStatusMsg('Patient vitals recorded successfully!')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save vitals.')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePrescription = async (items) => {
    setLoading(true)
    setErrorMsg('')
    try {
      if (!items.length || items.some(item => !item.medicine_name.trim())) throw new Error('Enter a medicine name for each prescription item.')
      if (patient.patient_id) {
        await createPrescription(patient.patient_id, null, items)
      }
      setStatusMsg('Prescription saved successfully!')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create prescription.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReferral = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      if (!referral.toFacilityId || !referral.reason.trim()) throw new Error('Select a facility and enter a referral reason.')
      if (patient.patient_id && referral.toFacilityId) {
        await createReferral({
          patientId: patient.patient_id,
          toFacilityId: referral.toFacilityId,
          department: referral.department,
          reason: referral.reason,
          urgency: referral.urgency,
          notes: referral.notes,
        })
      }
      setStatusMsg('Referral created successfully!')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create referral.')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteConsultation = async () => {
    setLoading(true)
    try {
      await onFinishConsultation(patient)
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete consultation.')
    } finally {
      setLoading(false)
    }
  }

  const pm = PRIORITY_MAP[patient.priority] || PRIORITY_MAP.low

  return (
    <Modal open={open} onClose={onClose} title={`Consultation — ${patient.name}`} size="xl">
      <div className="flex items-center gap-3 mb-5 p-3 bg-canvas rounded-xl border border-border-subtle">
        <div className="w-10 h-10 rounded-full bg-brand-default flex items-center justify-center text-white font-bold">{patient.name?.[0] || 'P'}</div>
        <div>
          <p className="font-semibold text-text-primary text-sm">{patient.name} · {patient.age} yrs</p>
          <p className="text-xs text-text-muted">{patient.reason || 'General Consultation'}</p>
        </div>
        <Badge variant={pm.variant} className="ml-auto">{pm.label}</Badge>
      </div>

      {statusMsg && <Alert type="success" title="Success">{statusMsg}</Alert>}
      {errorMsg && <Alert type="critical" title="Error">{errorMsg}</Alert>}

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
          <Textarea label="Chief Complaint" placeholder="Patient's main complaint in their own words..." rows={3} value={notes.chiefComplaint} onChange={e => setNotes(n => ({ ...n, chiefComplaint: e.target.value }))} />
          <Textarea label="Clinical Findings" placeholder="Physical examination findings, observations..." rows={4} value={notes.clinicalFindings} onChange={e => setNotes(n => ({ ...n, clinicalFindings: e.target.value }))} />
          <Textarea label="Assessment / Diagnosis" placeholder="Clinical assessment and diagnosis..." rows={3} value={notes.assessment} onChange={e => setNotes(n => ({ ...n, assessment: e.target.value }))} />
          <Textarea label="Plan" placeholder="Treatment plan, follow-up instructions..." rows={3} value={notes.plan} onChange={e => setNotes(n => ({ ...n, plan: e.target.value }))} />
          <div className="flex gap-2">
            <Button className="bg-brand-default text-white hover:bg-brand-hover flex-1" disabled={loading} onClick={handleSaveNotes}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Notes'}
            </Button>
            <Button className="bg-brand-default text-white hover:bg-brand-hover flex-1" disabled={loading} onClick={handleCompleteConsultation}>
              Complete Consultation & Close
            </Button>
          </div>
        </div>
      )}

      {tab === 'vitals' && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Systolic BP (mmHg)" placeholder="120" value={vitals.bp_systolic} onChange={e => setVitals(v => ({ ...v, bp_systolic: e.target.value }))} />
          <Input label="Diastolic BP (mmHg)" placeholder="80" value={vitals.bp_diastolic} onChange={e => setVitals(v => ({ ...v, bp_diastolic: e.target.value }))} />
          <Input label="Heart Rate (bpm)" placeholder="72" value={vitals.heart_rate} onChange={e => setVitals(v => ({ ...v, heart_rate: e.target.value }))} />
          <Input label="Temperature (°F)" placeholder="98.6" value={vitals.temperature} onChange={e => setVitals(v => ({ ...v, temperature: e.target.value }))} />
          <Input label="SpO2 (%)" placeholder="98" value={vitals.spo2} onChange={e => setVitals(v => ({ ...v, spo2: e.target.value }))} />
          <Input label="Blood Sugar (mg/dL)" placeholder="110" value={vitals.blood_sugar} onChange={e => setVitals(v => ({ ...v, blood_sugar: e.target.value }))} />
          <Input label="Weight (kg)" placeholder="65" value={vitals.weight} onChange={e => setVitals(v => ({ ...v, weight: e.target.value }))} />
          <div className="col-span-2">
            <Button className="bg-brand-default text-white hover:bg-brand-hover w-full" disabled={loading} onClick={handleSaveVitals}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Vitals'}
            </Button>
          </div>
        </div>
      )}

      {tab === 'prescribe' && (
        <PrescriptionForm onSave={handleSavePrescription} loading={loading} />
      )}

      {tab === 'refer' && (
        <div className="space-y-4">
          <Select label="Refer To Facility" value={referral.toFacilityId} onChange={e => setReferral(r => ({ ...r, toFacilityId: e.target.value }))}>
            <option value="">Select facility...</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.type?.replace('_', ' ')})</option>
            ))}
          </Select>
          <Select label="Department" value={referral.department} onChange={e => setReferral(r => ({ ...r, department: e.target.value }))}>
            <option value="">Select department...</option>
            <option>Cardiology</option>
            <option>Gynaecology</option>
            <option>Orthopaedics</option>
            <option>General Surgery</option>
            <option>General Medicine</option>
            <option>Pediatrics</option>
          </Select>
          <Textarea label="Reason for Referral" placeholder="Clinical reason and urgency..." rows={4} value={referral.reason} onChange={e => setReferral(r => ({ ...r, reason: e.target.value }))} />
          <Select label="Priority" value={referral.urgency} onChange={e => setReferral(r => ({ ...r, urgency: e.target.value }))}>
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </Select>
          <Button className="bg-brand-default text-white hover:bg-brand-hover w-full" disabled={loading} onClick={handleCreateReferral}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Referral'}
          </Button>
        </div>
      )}
    </Modal>
  )
}

export default function DoctorQueue() {
  const { user, demoMode } = useAuth()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePatient, setActivePatient] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [searchParams] = useSearchParams()
  const searchQuery = (searchParams.get('q') || '').toLowerCase()
  const isDoctorSession = user?.role === 'doctor' && !demoMode && user?.id && !String(user.id).endsWith('-demo')

  const fetchDoctorAndQueue = useCallback(async () => {
    if (!isDoctorSession) {
      setDoctor(null)
      setQueue([])
      setLoading(false)
      return
    }
    setError('')
    try {
      const { data: doctorData, error: dErr } = await supabase
        .from('doctors')
        .select(`
          id, facility_id, specialization, is_available,
          facilities:facility_id (id, name, type)
        `)
        .eq('profile_id', user.id)
        .single()

      if (dErr) throw dErr
      setDoctor(doctorData)

      const rawQueue = await getDoctorQueue(doctorData.facility_id, doctorData.id)
      setQueue(rawQueue)
    } catch (err) {
      console.error('Failed to fetch doctor queue:', err)
      setError(err.message || 'Unable to load live queue.')
    } finally {
      setLoading(false)
    }
  }, [isDoctorSession, user?.id])

  useEffect(() => {
    if (!user || user.role === 'doctor') return
    navigate(`/${user.role}`, { replace: true })
  }, [navigate, user])

  useEffect(() => {
    fetchDoctorAndQueue()
  }, [fetchDoctorAndQueue])

  // Realtime subscription
  useEffect(() => {
    if (!doctor?.facility_id || !isDoctorSession) return undefined

    const channel = supabase
      .channel(`doctor-queue:${doctor.facility_id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queues', filter: `facility_id=eq.${doctor.facility_id}`
      }, fetchDoctorAndQueue)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [doctor?.facility_id, isDoctorSession, fetchDoctorAndQueue])

  // Map queue to formatted patients
  const queuePatients = useMemo(() => {
    if (!isDoctorSession) {
      return []
    }
    return queue.map(item => {
      const appt = item.appointments
      const pat = appt?.patients
      let priority = 'low'
      if (item.status === 'emergency') priority = 'emergency'
      else if (pat?.is_high_risk) priority = 'high'

      return {
        id: item.id,
        appointment_id: appt?.id,
        patient_id: pat?.id,
        queue_no: item.queue_number,
        queue_status: item.status,
        name: pat?.profiles?.full_name || 'Patient',
        age: getAge(pat?.dob),
        reason: appt?.reason || 'General Consultation',
        priority,
        waiting_since: getWaitingTime(item.created_at, item.status),
        appointment: appt?.scheduled_at ? new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      }
    }).filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery) || p.reason.toLowerCase().includes(searchQuery) || String(p.queue_no).includes(searchQuery))
  }, [queue, isDoctorSession, searchQuery])

  const stats = useMemo(() => {
    const waiting = queuePatients.filter(p => p.queue_status === 'waiting' || p.queue_status === 'emergency').length
    const completed = queuePatients.filter(p => p.queue_status === 'completed').length
    const highPriority = queuePatients.filter(p => p.priority === 'high' || p.priority === 'emergency').length
    return { waiting, completed, highPriority }
  }, [queuePatients])

  const handleStart = async (patient) => {
    setActivePatient(patient)
    setModalOpen(true)
    if (isDoctorSession && patient.id && patient.appointment_id) {
      try {
        await Promise.all([
          updateQueueStatus(patient.id, 'in_consultation'),
          updateAppointmentStatus(patient.appointment_id, 'in_progress'),
        ])
        fetchDoctorAndQueue()
      } catch (err) {
        setError(err.message || 'Unable to start consultation.')
        setModalOpen(false)
      }
    }
  }

  const handleFinishConsultation = async (patient) => {
    if (isDoctorSession && patient?.id && patient?.appointment_id) {
      await Promise.all([
        updateQueueStatus(patient.id, 'completed'),
        updateAppointmentStatus(patient.appointment_id, 'completed'),
      ])
      await fetchDoctorAndQueue()
    }
  }

  const handleNextPatient = async () => {
    const next = queuePatients.find(p => p.queue_status === 'waiting' || p.queue_status === 'emergency')
    if (next) {
      handleStart(next)
    }
  }

  const handleSkip = async (patient) => {
    if (!patient?.id || !isDoctorSession) return
    setActionLoadingId(patient.id)
    try {
      await updateQueueStatus(patient.id, 'skipped')
      await fetchDoctorAndQueue()
    } catch (err) {
      setError(err.message || 'Unable to skip patient.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleTogglePause = async () => {
    if (!doctor?.id || !isDoctorSession) return
    try {
      const updated = await updateDoctorAvailability(doctor.id, !doctor.is_available)
      setDoctor(prev => ({ ...prev, is_available: updated.is_available }))
    } catch (err) {
      setError(err.message || 'Unable to update availability.')
    }
  }

  const facilityName = doctor?.facilities?.name || 'PHC Facility'

  return (
    <AppLayout role="doctor">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Today's Queue</h1>
            <p className="text-text-muted text-sm">{facilityName} · {stats.waiting} patients waiting</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchDoctorAndQueue}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleTogglePause}>
              {doctor?.is_available === false ? 'Resume Queue' : 'Pause Queue'}
            </Button>
            <Button className="bg-brand-default text-white hover:bg-brand-hover" size="sm" onClick={handleNextPatient} disabled={stats.waiting === 0}>
              Next Patient
            </Button>
          </div>
        </div>

        {demoMode && <Alert type="info" title="Doctor login required">Sign in with a Supabase doctor account to view your live queue.</Alert>}
        {error && <Alert type="critical" title="Error">{error}</Alert>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Waiting', value: stats.waiting, color: 'text-status-warning' },
            { label: 'Completed Today', value: stats.completed, color: 'text-status-success' },
            { label: 'High Priority', value: stats.highPriority, color: 'text-status-critical' },
          ].map(s => (
            <div key={s.label} className="bg-surface-elevated rounded-xl border border-border-subtle p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{loading ? '—' : s.value}</div>
              <div className="text-xs text-text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Queue cards */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-surface-elevated rounded-xl border border-border-subtle p-8 text-center text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading live queue...
            </div>
          ) : queuePatients.length === 0 ? (
            <div className="bg-surface-elevated rounded-xl border border-border-subtle p-8 text-center text-text-muted">
              No patients in the queue for today.
            </div>
          ) : (
            queuePatients.map((patient) => {
              const pm = PRIORITY_MAP[patient.priority] || PRIORITY_MAP.low
              const isActioning = actionLoadingId === patient.id

              return (
                <div key={patient.id} className={`bg-surface-elevated rounded-xl border p-4 hover:shadow-sm transition-shadow ${patient.priority === 'high' || patient.priority === 'emergency' ? 'border-status-critical/30' : 'border-border-subtle'}`}>
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    {/* Queue number */}
                    <div className="w-14 h-14 rounded-xl bg-navy flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs text-surface/50">No.</span>
                      <span className="font-bold text-brand-default font-mono">{patient.queue_no}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-primary">{patient.name}</span>
                        <span className="text-sm text-text-muted">{patient.age} yrs</span>
                        <Badge variant={pm.variant}>{pm.label}</Badge>
                        {(patient.priority === 'high' || patient.priority === 'emergency') && <AlertCircle className="w-4 h-4 text-status-critical" />}
                        {patient.queue_status === 'in_consultation' && <Badge variant="info">Active Consultation</Badge>}
                        {patient.queue_status === 'skipped' && <Badge variant="warning">Skipped</Badge>}
                        {patient.queue_status === 'completed' && <Badge variant="success">Completed</Badge>}
                      </div>
                      <p className="text-sm text-text-muted mt-0.5">{patient.reason}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Waiting {patient.waiting_since}</span>
                        <span>Appt: {patient.appointment}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => navigate(patient.patient_id ? `/doctor/patients?id=${patient.patient_id}` : '/doctor/patients')}>
                        Records
                      </Button>
                      {!demoMode && patient.queue_status === 'waiting' && (
                        <Button size="sm" variant="outline" disabled={isActioning} onClick={() => handleSkip(patient)}>
                          <SkipForward className="w-3.5 h-3.5" /> Skip
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className={patient.queue_status === 'in_consultation'
                          ? 'border border-border-subtle bg-canvas text-text-primary shadow-none hover:bg-bg'
                          : 'bg-brand-default text-white hover:bg-brand-hover'}
                        onClick={() => handleStart(patient)}
                        disabled={patient.queue_status === 'completed'}
                      >
                        <Play className="w-3.5 h-3.5" /> {patient.queue_status === 'in_consultation' ? 'Resume Consult' : 'Consult'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <ConsultationModal
        key={activePatient?.id || "none"}
        patient={activePatient}
        doctor={doctor}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onFinishConsultation={handleFinishConsultation}
      />
    </AppLayout>
  )
}
