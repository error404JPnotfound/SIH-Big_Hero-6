import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { KPICard } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Misc'
import {
  Calendar, Activity, ClipboardList, Pill, Stethoscope, PhoneCall,
  AlertCircle, FileText, Heart, Droplets, Weight, TrendingUp, ChevronRight, Clock
} from 'lucide-react'
import {
  MOCK_PATIENT, MOCK_VITALS, MOCK_APPOINTMENTS, MOCK_QUEUE, MOCK_REFERRALS
} from '../../lib/mockData'

function VitalCard({ icon: Icon, label, value, unit, status = 'normal' }) {
  const statusColor = { normal: 'text-success', warning: 'text-warning', critical: 'text-critical' }
  return (
    <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-teal-light flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-teal" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className={`text-lg font-bold ${statusColor[status]}`}>{value}<span className="text-xs font-normal text-muted ml-1">{unit}</span></p>
      </div>
    </div>
  )
}

function AppointmentCard({ appt, onView }) {
  const statusVariant = { confirmed: 'success', pending: 'warning', cancelled: 'critical' }
  return (
    <div className="flex items-start gap-4 p-4 bg-surface rounded-xl border border-border hover:shadow-sm transition-shadow">
      <div className="flex flex-col items-center text-center bg-teal-light rounded-lg p-2 w-14 flex-shrink-0">
        <span className="text-xs font-medium text-teal">{new Date(appt.date).toLocaleString('en', { month: 'short' }).toUpperCase()}</span>
        <span className="text-xl font-bold text-navy">{new Date(appt.date).getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-navy text-sm">{appt.doctor}</span>
          <Badge variant={statusVariant[appt.status]}>{appt.status}</Badge>
        </div>
        <p className="text-xs text-muted mt-0.5">{appt.facility} · {appt.type}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.time}</span>
          <span>Queue: <strong className="text-navy">{appt.queue_no}</strong></span>
          <span className="capitalize">{appt.mode}</span>
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={onView}><ChevronRight className="w-4 h-4" /></Button>
    </div>
  )
}

function QuickActions({ navigate }) {
  const actions = [
    { label: 'Book Appointment', icon: Calendar, color: 'bg-teal-light text-teal', href: '/patient/appointments' },
    { label: 'Talk to Doctor', icon: PhoneCall, color: 'bg-blue-light text-blue', href: '/patient/appointments?mode=tele' },
    { label: 'Health Records', icon: FileText, color: 'bg-success-bg text-success', href: '/patient/records' },
    { label: 'Track Referral', icon: ClipboardList, color: 'bg-warning-bg text-warning', href: '/patient/referrals' },
    { label: 'Find Medicine', icon: Pill, color: 'bg-teal-light text-teal', href: '/patient/medicines' },
    { label: 'Diagnostics', icon: Activity, color: 'bg-blue-light text-blue', href: '/patient/diagnostics' },
    { label: 'My Queue', icon: Clock, color: 'bg-success-bg text-success', href: '/patient/queue' },
    { label: 'Emergency', icon: AlertCircle, color: 'bg-critical-bg text-critical', href: '/patient/emergency' },
  ]
  return (
    <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {actions.map(a => (
        <button
          key={a.label}
          onClick={() => navigate(a.href)}
          className="flex flex-col items-center gap-2 p-3 bg-surface rounded-xl border border-border hover:shadow-sm hover:-translate-y-0.5 transition-all text-center group"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.color}`}>
            <a.icon className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium text-text leading-tight">{a.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function PatientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const name = user?.name || MOCK_PATIENT.name
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-navy">{greeting}, {name.split(' ')[0]} 👋</h1>
          <p className="text-muted text-sm mt-0.5">Here's your health summary for today, {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        {/* Alert — upcoming appointment */}
        <Alert type="info" title="Appointment in 2 hours">
          Dr. Arjun Mehta at PHC Khandwa — 10:30 AM · Queue No: A-027 · 6 patients ahead
        </Alert>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Next Appointment" value="Today" subtitle="10:30 AM · PHC Khandwa" icon={Calendar} color="teal" />
          <KPICard title="Queue Position" value="A-027" subtitle="6 patients ahead · ~35 min" icon={Clock} color="blue" />
          <KPICard title="Active Referrals" value="1" subtitle="Cardiology — Accepted" icon={ClipboardList} color="warning" />
          <KPICard title="Follow-ups Due" value="2" subtitle="Next: Sept 15" icon={AlertCircle} color="critical" />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Quick Actions</h2>
          <QuickActions navigate={navigate} />
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Vitals */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy">Health Overview</h2>
              <span className="text-xs text-muted">Updated Sept 10</span>
            </div>
            <VitalCard icon={Heart} label="Blood Pressure" value={MOCK_VITALS.bp} unit="mmHg" status="normal" />
            <VitalCard icon={Droplets} label="Blood Sugar" value={MOCK_VITALS.sugar} unit="" status="normal" />
            <VitalCard icon={Weight} label="Weight" value={MOCK_VITALS.weight} unit="" status="normal" />
            <VitalCard icon={TrendingUp} label="Heart Rate" value={MOCK_VITALS.heart_rate} unit="" status="normal" />
          </div>

          {/* Appointments */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy">Upcoming Appointments</h2>
              <Button size="sm" variant="ghost" onClick={() => navigate('/patient/appointments')}>View all</Button>
            </div>
            <div className="space-y-3">
              {MOCK_APPOINTMENTS.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} onView={() => navigate(`/patient/appointments`)} />
              ))}
            </div>

            {/* Referral Summary */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-navy">Active Referrals</h2>
                <Button size="sm" variant="ghost" onClick={() => navigate('/patient/referrals')}>View all</Button>
              </div>
              {MOCK_REFERRALS.filter(r => r.status !== 'completed').map(ref => (
                <div key={ref.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
                  <div className="w-8 h-8 rounded-lg bg-warning-bg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy">{ref.to} — {ref.dept}</p>
                    <p className="text-xs text-muted">{ref.reason}</p>
                  </div>
                  <Badge variant={ref.status === 'accepted' ? 'success' : 'warning'}>{ref.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
