import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { KPICard } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Misc'
import { MOCK_DOCTOR, MOCK_DOCTOR_QUEUE } from '../../lib/mockData'
import {
  Users, CheckCircle2, AlertCircle, Clock, Stethoscope, FileText,
  Pill, ChevronRight, Play, Eye
} from 'lucide-react'

const PRIORITY_META = {
  high:   { variant: 'critical', label: 'High Priority' },
  medium: { variant: 'warning', label: 'Medium' },
  low:    { variant: 'success', label: 'Low' },
}

function PatientQueueRow({ patient, onStart }) {
  const pm = PRIORITY_META[patient.priority]
  return (
    <tr className="border-b border-border hover:bg-bg transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono font-bold text-teal text-sm">{patient.queue_no}</span>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-semibold text-navy text-sm">{patient.name}</p>
          <p className="text-xs text-muted">{patient.age} yrs · {patient.reason}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={pm.variant}>{pm.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" /> {patient.waiting_since}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-teal text-white" onClick={() => onStart(patient)}>
            <Play className="w-3 h-3" /> Start
          </Button>
          <Button size="sm" variant="ghost"><Eye className="w-3 h-3" /></Button>
        </div>
      </td>
    </tr>
  )
}

export default function DoctorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const name = user?.name || MOCK_DOCTOR.name
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const [activePatient, setActivePatient] = useState(null)

  return (
    <AppLayout role="doctor">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-navy">{greeting}, {name} 👋</h1>
            <p className="text-muted text-sm">PHC Khandwa · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-bg border border-success/20 text-success text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Clinic Open
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Total Today" value={MOCK_DOCTOR.patients_today} icon={Users} color="navy" />
          <KPICard title="Waiting" value={MOCK_DOCTOR.waiting} icon={Clock} color="warning" />
          <KPICard title="Completed" value={MOCK_DOCTOR.completed} icon={CheckCircle2} color="success" />
          <KPICard title="High Risk" value={MOCK_DOCTOR.high_risk} icon={AlertCircle} color="critical" />
          <KPICard title="Emergency" value="0" icon={AlertCircle} color="teal" />
          <KPICard title="Follow-ups" value="5" icon={Stethoscope} color="blue" />
        </div>

        {/* Emergency alert */}
        {activePatient && (
          <Alert type="info" title={`Active Consultation: ${activePatient.name}`}>
            {activePatient.age} yrs — {activePatient.reason} — Queue: {activePatient.queue_no}
          </Alert>
        )}

        {/* Today's Queue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-navy">Today's Queue</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{MOCK_DOCTOR_QUEUE.length} patients waiting</span>
              <Button size="sm" variant="outline" onClick={() => navigate('/doctor/queue')}>Full Queue View</Button>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Queue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Waiting</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_DOCTOR_QUEUE.map(p => (
                    <PatientQueueRow key={p.id} patient={p} onStart={setActivePatient} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick action grid */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: 'Manage Queue', desc: 'Call, skip, complete patients', icon: Users, href: '/doctor/queue', color: 'teal' },
            { title: 'Patient Records', desc: 'View full clinical histories', icon: FileText, href: '/doctor/patients', color: 'blue' },
            { title: 'Pending Referrals', desc: '3 referrals awaiting action', icon: CheckCircle2, href: '/doctor/referrals', color: 'warning' },
          ].map(a => (
            <button key={a.title} onClick={() => navigate(a.href)}
              className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all text-left">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color === 'teal' ? 'bg-teal-light text-teal' : a.color === 'blue' ? 'bg-blue-light text-blue' : 'bg-warning-bg text-warning'}`}>
                <a.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-navy text-sm">{a.title}</p>
                <p className="text-xs text-muted">{a.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted ml-auto" />
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
