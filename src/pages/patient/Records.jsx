import AppLayout from '../../components/layout/AppLayout'
import { Tabs, useTabs } from '../../components/ui/Tabs'
import { Badge } from '../../components/ui/Badge'
import { Timeline } from '../../components/ui/Misc'
import { MOCK_PATIENT, MOCK_VITALS, MOCK_REFERRALS, MOCK_DIAGNOSTICS } from '../../lib/mockData'
import { Heart, Droplets, Weight, TrendingUp, User, Phone, MapPin } from 'lucide-react'

const TIMELINE_EVENTS = [
  { title: 'General Consultation', subtitle: 'Dr. Arjun Mehta · PHC Khandwa', date: 'Sept 10, 2026', color: 'bg-brand-default border-brand-default' },
  { title: 'Blood Test Requested', subtitle: 'Complete Blood Count + HbA1c', date: 'Sept 10, 2026', color: 'bg-brand-secondary border-blue' },
  { title: 'Referral Created', subtitle: 'Cardiology · District Hospital', date: 'Sept 8, 2026', color: 'bg-status-warning border-status-warning' },
  { title: 'Diagnosis: Hypertension Stage 1', subtitle: 'BP: 145/92 recorded', date: 'Sept 5, 2026', color: 'bg-status-critical border-status-critical' },
  { title: 'Prescription', subtitle: 'Amlodipine 5mg · 30 days', date: 'Sept 5, 2026', color: 'bg-status-success border-status-success' },
  { title: 'CBC Result: Normal', subtitle: 'All values within normal range', date: 'Sept 2, 2026', color: 'bg-status-success border-status-success' },
  { title: 'First Visit — PHC', subtitle: 'Chief complaint: Headache, Fatigue', date: 'Aug 20, 2026', color: 'bg-brand-default border-brand-default' },
]

export default function Records() {
  const [tab, setTab] = useTabs('overview')

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Health Records</h1>
          <p className="text-text-muted text-sm">Your complete longitudinal health history</p>
        </div>

        {/* Patient header card */}
        <div className="bg-navy rounded-2xl p-6 flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-default flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {MOCK_PATIENT.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-surface">{MOCK_PATIENT.name}</h2>
              <Badge variant="default">{MOCK_PATIENT.patient_id}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-surface/60 flex-wrap">
              <span>{MOCK_PATIENT.age} yrs · {MOCK_PATIENT.gender}</span>
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{MOCK_PATIENT.phone}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Khandwa, MP</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-status-critical/20 text-status-critical font-medium">Blood: {MOCK_PATIENT.blood_group}</span>
            </div>
          </div>
        </div>

        {/* Vitals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Heart, label: 'Blood Pressure', value: MOCK_VITALS.bp, unit: 'mmHg', color: 'text-status-critical' },
            { icon: Droplets, label: 'Blood Sugar', value: MOCK_VITALS.sugar, color: 'text-brand-secondary' },
            { icon: Weight, label: 'Weight', value: MOCK_VITALS.weight, color: 'text-status-success' },
            { icon: TrendingUp, label: 'Heart Rate', value: MOCK_VITALS.heart_rate, color: 'text-status-warning' },
          ].map(v => (
            <div key={v.label} className="bg-surface-elevated rounded-xl border border-border-subtle p-4">
              <v.icon className={`w-5 h-5 mb-2 ${v.color}`} />
              <p className="text-xs text-text-muted">{v.label}</p>
              <p className={`text-lg font-bold ${v.color}`}>{v.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'timeline', label: 'Health Timeline' },
            { id: 'referrals', label: 'Referrals' },
            { id: 'diagnostics', label: 'Diagnostics' },
          ]}
          activeTab={tab}
          onChange={setTab}
        />

        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-surface-elevated rounded-xl border border-border-subtle p-5">
              <h3 className="font-semibold text-text-primary mb-3">Medical Conditions</h3>
              <div className="flex flex-wrap gap-2">
                {['Hypertension Stage 1', 'Pre-diabetic'].map(c => <Badge key={c} variant="warning">{c}</Badge>)}
              </div>
            </div>
            <div className="bg-surface-elevated rounded-xl border border-border-subtle p-5">
              <h3 className="font-semibold text-text-primary mb-3">Allergies</h3>
              <div className="flex flex-wrap gap-2">
                {['Penicillin'].map(a => <Badge key={a} variant="critical">{a}</Badge>)}
              </div>
            </div>
            <div className="bg-surface-elevated rounded-xl border border-border-subtle p-5">
              <h3 className="font-semibold text-text-primary mb-3">Current Medications</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-primary font-medium">Amlodipine 5mg</span><span className="text-text-muted">1 tablet · Once daily</span></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <div className="bg-surface-elevated rounded-xl border border-border-subtle p-6">
            <h3 className="font-semibold text-text-primary mb-4">Health Journey Timeline</h3>
            <Timeline items={TIMELINE_EVENTS} />
          </div>
        )}

        {tab === 'referrals' && (
          <div className="space-y-3">
            {MOCK_REFERRALS.map(r => (
              <div key={r.id} className="bg-surface-elevated rounded-xl border border-border-subtle p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary text-sm">{r.dept} — {r.to}</p>
                    <p className="text-xs text-text-muted">{r.reason}</p>
                  </div>
                  <Badge variant={r.status === 'completed' ? 'outline' : 'success'}>{r.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'diagnostics' && (
          <div className="space-y-3">
            {MOCK_DIAGNOSTICS.map(dx => (
              <div key={dx.id} className="bg-surface-elevated rounded-xl border border-border-subtle p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary text-sm">{dx.name}</p>
                    <p className="text-xs text-text-muted">{dx.facility} · {dx.date}</p>
                  </div>
                  <Badge variant={dx.status === 'result_ready' ? 'success' : 'warning'}>{dx.status.replace(/_/g, ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
