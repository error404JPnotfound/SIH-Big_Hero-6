import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Tabs, useTabs } from '../../components/ui/Tabs'
import { Timeline } from '../../components/ui/Misc'
import { MOCK_REFERRALS, MOCK_DIAGNOSTICS, MOCK_VITALS } from '../../lib/mockData'
import { Heart, Droplets, Weight, TrendingUp, User, Phone, AlertTriangle } from 'lucide-react'

const PATIENT = {
  name: 'Suresh Patel', age: 58, gender: 'Male', id: 'PHC-MP-2024-00201',
  conditions: ['Hypertension Stage 1', 'Pre-diabetic'], allergies: ['Aspirin'],
  medications: [{ name: 'Amlodipine 5mg', dosage: '1 tablet once daily', since: 'Aug 2026' }],
}

const TIMELINE = [
  { title: 'Consultation — Hypertension Follow-up', subtitle: 'Dr. Arjun Mehta · PHC Khandwa', date: 'Sept 10, 2026', color: 'bg-teal border-teal' },
  { title: 'BP: 148/94 — Elevated', subtitle: 'Amlodipine dosage reviewed', date: 'Sept 10, 2026', color: 'bg-critical border-critical' },
  { title: 'HbA1c Requested', subtitle: 'Pre-diabetes monitoring', date: 'Sept 5, 2026', color: 'bg-blue border-blue' },
  { title: 'First Hypertension Diagnosis', subtitle: 'BP: 155/98', date: 'Aug 20, 2026', color: 'bg-critical border-critical' },
]

export default function PatientProfile() {
  const [tab, setTab] = useTabs('overview')
  return (
    <AppLayout role="doctor">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Patient header */}
        <div className="bg-navy rounded-2xl p-6 flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-teal flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {PATIENT.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-surface">{PATIENT.name}</h1>
              <Badge variant="default">{PATIENT.id}</Badge>
              <Badge variant="critical"><AlertTriangle className="w-3 h-3" /> High Risk</Badge>
            </div>
            <p className="text-surface/60 text-sm mt-1">{PATIENT.age} yrs · {PATIENT.gender}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {PATIENT.conditions.map(c => <Badge key={c} variant="warning">{c}</Badge>)}
              {PATIENT.allergies.map(a => <Badge key={a} variant="critical">⚠ Allergy: {a}</Badge>)}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="border-surface/20 text-surface hover:bg-surface/10">Edit</Button>
            <Button size="sm" className="bg-teal text-white">Start Consultation</Button>
          </div>
        </div>

        {/* Vitals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Heart, label: 'Blood Pressure', value: '148/94', unit: 'mmHg', color: 'text-critical', bg: 'bg-critical-bg' },
            { icon: Droplets, label: 'Blood Sugar', value: '118', unit: 'mg/dL', color: 'text-warning', bg: 'bg-warning-bg' },
            { icon: Weight, label: 'Weight', value: '78', unit: 'kg', color: 'text-blue', bg: 'bg-blue-light' },
            { icon: TrendingUp, label: 'Heart Rate', value: '82', unit: 'bpm', color: 'text-success', bg: 'bg-success-bg' },
          ].map(v => (
            <div key={v.label} className={`rounded-xl border border-border p-4 ${v.bg}`}>
              <v.icon className={`w-5 h-5 mb-2 ${v.color}`} />
              <p className="text-xs text-muted">{v.label}</p>
              <p className={`text-xl font-bold ${v.color}`}>{v.value}<span className="text-xs font-normal ml-1 text-muted">{v.unit}</span></p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'timeline', label: 'History Timeline' },
            { id: 'referrals', label: 'Referrals' },
            { id: 'diagnostics', label: 'Diagnostics' },
          ]}
          activeTab={tab}
          onChange={setTab}
        />

        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="font-semibold text-navy mb-3">Active Medications</h3>
              {PATIENT.medications.map(m => (
                <div key={m.name} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                  <span className="font-medium text-navy">{m.name}</span>
                  <span className="text-muted">{m.dosage}</span>
                </div>
              ))}
            </div>
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="font-semibold text-navy mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">New Prescription</Button>
                <Button variant="outline" size="sm" className="w-full justify-start">Request Diagnostic</Button>
                <Button variant="outline" size="sm" className="w-full justify-start">Create Referral</Button>
                <Button variant="outline" size="sm" className="w-full justify-start">Schedule Follow-up</Button>
              </div>
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <div className="bg-surface rounded-xl border border-border p-6">
            <Timeline items={TIMELINE} />
          </div>
        )}

        {tab === 'referrals' && (
          <div className="space-y-3">
            {MOCK_REFERRALS.map(r => (
              <div key={r.id} className="bg-surface rounded-xl border border-border p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-navy text-sm">{r.dept} — {r.to}</p>
                  <p className="text-xs text-muted">{r.reason} · {r.date}</p>
                </div>
                <Badge variant={r.status === 'completed' ? 'outline' : 'success'}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}

        {tab === 'diagnostics' && (
          <div className="space-y-3">
            {MOCK_DIAGNOSTICS.map(dx => (
              <div key={dx.id} className="bg-surface rounded-xl border border-border p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-navy text-sm">{dx.name}</p>
                  <p className="text-xs text-muted">{dx.facility} · {dx.date}</p>
                </div>
                <Badge variant={dx.status === 'result_ready' ? 'success' : 'warning'}>{dx.status.replace(/_/g,' ')}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
