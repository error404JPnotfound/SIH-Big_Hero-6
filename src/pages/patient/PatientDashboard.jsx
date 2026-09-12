import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { KPICard } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Misc'
import SymptomTriage from '../../components/ui/SymptomTriage'
import {
  Calendar, Activity, ClipboardList, Pill, Stethoscope, PhoneCall,
  AlertCircle, FileText, Heart, Droplets, Weight, TrendingUp, ChevronRight, Clock
} from 'lucide-react'
import {
  MOCK_PATIENT, MOCK_VITALS, MOCK_APPOINTMENTS, MOCK_QUEUE, MOCK_REFERRALS
} from '../../lib/mockData'

function VitalCard({ icon: Icon, label, value, unit, status = 'normal' }) {
  const statusColor = { normal: 'text-status-success', warning: 'text-status-warning', critical: 'text-status-critical' }
  const bgTone = { normal: 'bg-status-success-bg', warning: 'bg-status-warning-bg', critical: 'bg-status-critical-bg' }
  
  return (
    <div className="bg-canvas rounded-2xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow border border-transparent hover:border-border-subtle">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-full ${bgTone[status]} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${statusColor[status]}`} />
        </div>
      </div>
      <div>
        <p className={`text-xl sm:text-2xl font-bold text-text-primary`}>{value}<span className="text-xs sm:text-sm font-medium text-text-muted ml-1">{unit}</span></p>
        <span className="text-xs font-medium text-text-muted leading-tight mt-1 inline-block">{label}</span>
      </div>
    </div>
  )
}

function AppointmentCard({ appt, onView }) {
  const statusVariant = { confirmed: 'success', pending: 'warning', cancelled: 'critical' }
  const borderTone = { confirmed: 'border-status-success', pending: 'border-status-warning', cancelled: 'border-status-critical' }
  
  return (
    <div className={`relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-surface-elevated rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 ${borderTone[appt.status]}`}>
      <div className="flex flex-col items-center justify-center text-center bg-canvas rounded-xl w-14 h-14 flex-shrink-0">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{new Date(appt.date).toLocaleString('en', { month: 'short' })}</span>
        <span className="text-xl font-black text-text-primary leading-none mt-0.5">{new Date(appt.date).getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-text-primary text-base">{appt.doctor}</span>
          <Badge variant={statusVariant[appt.status]}>{appt.status}</Badge>
        </div>
        <p className="text-sm text-text-muted">{appt.facility} · {appt.type}</p>
        <div className="flex items-center gap-4 mt-2 text-xs font-medium text-text-muted">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{appt.time}</span>
          <span className="flex items-center gap-1.5">Queue: <strong className="text-text-primary">{appt.queue_no}</strong></span>
          <span className="capitalize px-2 py-0.5 bg-canvas rounded-md border border-border-subtle">{appt.mode}</span>
        </div>
      </div>
      <Button size="sm" variant="ghost" className="w-full sm:w-auto mt-2 sm:mt-0 bg-subtle hover:bg-brand-light text-brand-default" onClick={onView}>Details</Button>
    </div>
  )
}

function QuickActions({ navigate }) {
  const actions = [
    { label: 'Book Appt', icon: Calendar, color: 'text-brand-default', bg: 'bg-subtle', hover: 'hover:bg-brand-default hover:text-white', href: '/patient/appointments' },
    { label: 'Telehealth', icon: PhoneCall, color: 'text-brand-secondary', bg: 'bg-brand-secondary-light', hover: 'hover:bg-brand-secondary hover:text-white', href: '/patient/appointments?mode=tele' },
    { label: 'Records', icon: FileText, color: 'text-status-success', bg: 'bg-status-success-bg', hover: 'hover:bg-status-success hover:text-white', href: '/patient/records' },
    { label: 'Referrals', icon: ClipboardList, color: 'text-status-warning', bg: 'bg-status-warning-bg', hover: 'hover:bg-status-warning hover:text-white', href: '/patient/appointments?tab=referrals' },
    { label: 'Medicines', icon: Pill, color: 'text-brand-default', bg: 'bg-subtle', hover: 'hover:bg-brand-default hover:text-white', href: '/patient/medicines' },
    { label: 'Diagnostics', icon: Activity, color: 'text-brand-secondary', bg: 'bg-brand-secondary-light', hover: 'hover:bg-brand-secondary hover:text-white', href: '/patient/diagnostics' },
    { label: 'My Queue', icon: Clock, color: 'text-status-success', bg: 'bg-status-success-bg', hover: 'hover:bg-status-success hover:text-white', href: '/patient/queue' },
    { label: 'Emergency', icon: AlertCircle, color: 'text-status-critical', bg: 'bg-status-critical-bg', hover: 'hover:bg-status-critical hover:text-white', href: '/patient/emergency' },
  ]
  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
      {actions.map(a => (
        <button
          key={a.label}
          onClick={() => navigate(a.href)}
          className="flex flex-col items-center gap-2.5 group focus:outline-none"
        >
          <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1 ${a.bg} ${a.color} ${a.hover}`}>
            <a.icon className="w-6 h-6" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-text-muted group-hover:text-text-primary transition-colors text-center leading-tight px-1">{a.label}</span>
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
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Unified Hero Banner */}
        <div className="bg-brand-default rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg relative overflow-hidden">
          {/* Decorative backdrop */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{greeting}, {name.split(' ')[0]} 👋</h1>
            <p className="text-brand-light text-sm font-medium opacity-90">Your health journey, seamlessly connected.</p>
          </div>
          
          <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 w-full md:w-auto">
             <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
               <Calendar className="w-5 h-5 text-white" />
             </div>
             <div>
               <p className="text-white font-semibold text-sm">Appointment in 2 hours</p>
               <p className="text-white/80 text-xs mt-0.5">Dr. Arjun Mehta · PHC Khandwa</p>
             </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-5">
             <h2 className="text-lg font-bold text-text-primary">Quick Actions</h2>
          </div>
          <QuickActions navigate={navigate} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <KPICard title="Next Appointment" value="Today" subtitle="10:30 AM · PHC Khandwa" icon={Calendar} color="teal" />
          <KPICard title="Queue Position" value="A-027" subtitle="6 patients ahead" icon={Clock} color="blue" />
          <div className="cursor-pointer" onClick={() => navigate('/patient/appointments?tab=referrals')}>
            <KPICard title="Active Referrals" value="1" subtitle="Cardiology" icon={ClipboardList} color="warning" />
          </div>
          <KPICard title="Follow-ups Due" value="2" subtitle="Next: Sept 15" icon={AlertCircle} color="critical" />
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Appointments, Triage & Referrals */}
          <div className="lg:col-span-8 space-y-8">
            <SymptomTriage />

            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-text-primary">Upcoming Appointments</h2>
                <Button size="sm" variant="ghost" className="text-brand-default hover:bg-subtle" onClick={() => navigate('/patient/appointments')}>View all</Button>
              </div>
              <div className="space-y-4">
                {MOCK_APPOINTMENTS.map(appt => (
                  <AppointmentCard key={appt.id} appt={appt} onView={() => navigate(`/patient/appointments`)} />
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-text-primary">Active Referrals</h2>
                <Button size="sm" variant="ghost" className="text-brand-default hover:bg-subtle" onClick={() => navigate('/patient/appointments?tab=referrals')}>View all</Button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {MOCK_REFERRALS.filter(r => r.status !== 'completed').map(ref => (
                  <div
                    key={ref.id}
                    onClick={() => navigate('/patient/appointments?tab=referrals')}
                    className="cursor-pointer relative overflow-hidden flex flex-col gap-3 p-5 bg-surface-elevated rounded-2xl shadow-sm border border-border-subtle hover:border-brand-default/30 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-status-warning-bg flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-5 h-5 text-status-warning" />
                      </div>
                      <Badge variant={ref.status === 'accepted' ? 'success' : 'warning'}>{ref.status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary mb-1">{ref.to}</p>
                      <p className="text-xs font-medium text-text-muted">{ref.dept} · {ref.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Area: Vitals & Emergency */}
          <div className="lg:col-span-4 space-y-8">
            {/* Emergency Section */}
            <div className="bg-status-critical-bg rounded-3xl p-6 md:p-8 border border-status-critical/20 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-status-critical/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-status-critical flex items-center justify-center shadow-lg shadow-status-critical/30 mb-5">
                  <PhoneCall className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-status-critical mb-3">Emergency Help</h2>
                <p className="text-sm text-status-critical/80 mb-6 font-medium leading-relaxed">Need urgent medical assistance? We are available 24/7.</p>
                <Button className="w-full bg-status-critical hover:bg-status-critical/90 text-white shadow-sm py-2.5" onClick={() => navigate('/patient/emergency')}>
                  Contact Emergency
                </Button>
              </div>
            </div>

            {/* Vitals Grid */}
            <div className="bg-surface-elevated rounded-3xl p-6 md:p-7 border border-border-subtle shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-default"/> Health Overview
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <VitalCard icon={Heart} label="Blood Pressure" value={MOCK_VITALS.bp} unit="mmHg" status="normal" />
                <VitalCard icon={Droplets} label="Blood Sugar" value={MOCK_VITALS.sugar} unit="" status="normal" />
                <VitalCard icon={Weight} label="Weight" value={MOCK_VITALS.weight} unit="" status="normal" />
                <VitalCard icon={TrendingUp} label="Heart Rate" value={MOCK_VITALS.heart_rate} unit="" status="normal" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
