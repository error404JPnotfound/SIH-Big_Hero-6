import { facilities as getLiveFacilities } from '../../lib/adminLive'
import { useLiveRecords } from '../../hooks/useLiveRecords'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { KPICard } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ProgressBar, Alert } from '../../components/ui/Misc'
import { getAdminDashboard, getHighRiskFollowUps, getQualityIndicators, getWeeklyConsultations } from '../../lib/db'
import {
  Users, Stethoscope, Building2, Activity, ClipboardList, AlertCircle,
  Pill, Clock, TrendingUp, TrendingDown, ChevronRight
} from 'lucide-react'

function FacilityRow({ fac }) {
  const statusMeta = {
    operational: { variant: 'success', label: 'Operational' },
    busy: { variant: 'warning', label: 'Busy' },
    limited_capacity: { variant: 'warning', label: 'Limited' },
    critical: { variant: 'critical', label: 'Critical' },
  }
  const meta = statusMeta[fac.status] || { variant: 'outline', label: fac.status || 'Unknown' }
  const patientsToday = fac.patients_today || 0
  const capacity = fac.capacity ?? 0
  const load = Math.round((patientsToday / capacity) * 100)
  const loadColor = load > 85 ? 'critical' : load > 65 ? 'warning' : 'success'

  return (
    <div className="flex items-center gap-4 p-4 border-b border-border-subtle last:border-0 hover:bg-bg transition-colors">
      <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 text-text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-text-primary text-sm truncate">{fac.name}</p>
          <Badge variant={meta.variant} className="text-xs">{meta.label}</Badge>
        </div>
        <p className="text-xs text-text-muted">{fac.type} · {fac.location}</p>
      </div>
      <div className="hidden md:block w-32">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-text-muted">Load</span>
          <span className="font-medium">{patientsToday}/{capacity}</span>
        </div>
        <ProgressBar value={patientsToday} max={capacity} color={loadColor} showLabel={false} />
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-text-primary">{fac.doctors || 0}</p>
        <p className="text-xs text-text-muted">Doctors</p>
      </div>
    </div>
  )
}

function HighRiskRow({ p }) {
  const riskMeta = {
    critical: { variant: 'critical' }, high: { variant: 'critical' },
    medium: { variant: 'warning' }, low: { variant: 'success' },
  }
  const statusMeta = {
    overdue: { label: 'Overdue', color: 'text-status-critical' },
    due_soon: { label: 'Due Soon', color: 'text-status-warning' },
    on_track: { label: 'On Track', color: 'text-status-success' },
  }
  return (
    <tr className="border-b border-border-subtle hover:bg-bg transition-colors last:border-0">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-text-primary text-sm">{p.name}</p>
          <p className="text-xs text-text-muted">{p.age} yrs</p>
        </div>
      </td>
      <td className="px-4 py-3"><Badge variant={riskMeta[p.risk]?.variant || 'outline'} className="capitalize">{p.risk}</Badge></td>
      <td className="px-4 py-3"><span className="text-xs bg-canvas rounded-full px-2 py-0.5 border border-border-subtle">{p.category}</span></td>
      <td className="px-4 py-3"><span className="text-xs text-text-muted">{p.last_visit}</span></td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold ${statusMeta[p.status]?.color || ''}`}>{statusMeta[p.status]?.label || p.status}</span>
      </td>
    </tr>
  )
}

// Simple bar chart using pure CSS
function BarChart({ data, title }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div>
      <p className="text-sm font-semibold text-text-primary mb-4">{title}</p>
      <div className="flex items-end gap-2 h-28">
        {data.map((d, i) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-brand-default transition-all duration-700"
              style={{ height: `${(d.value / max) * 100}%`, opacity: 0.7 + (i / data.length) * 0.3 }}
              title={`${d.value}`}
            />
            <span className="text-xs text-text-muted text-center leading-tight">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


async function loadDashboard() {
  const [stats, facilities, highRisk, quality, weekly] = await Promise.all([getAdminDashboard(), getLiveFacilities(), getHighRiskFollowUps(), getQualityIndicators(), getWeeklyConsultations()])
  return { stats, facilities, highRisk, quality, weekly }
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const name = user?.name || 'Admin'

  const { data: live, loading, error } = useLiveRecords(loadDashboard)
  const stats = live.stats || { total_patients:0, active_doctors:0, facilities:0, today_consultations:0, pending_referrals:0, high_risk_patients:0, medicine_shortages:0, diagnostic_delays:0 }
  const facilities = live.facilities || []
  const highRisk = (live.highRisk || []).map(hr => ({ id:hr.id, name:hr.patients?.profiles?.full_name || hr.patients?.patient_code || 'Unknown', age:'—', category:hr.category, risk:hr.risk_level, last_visit:hr.last_visit || '—', status:hr.status }))
  const qualityIndicators = live.quality || []
  const weeklyData = live.weekly || []

  const s = stats

  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, {name} 👋</h1>
            <p className="text-text-muted text-sm">Healthcare Operations Overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <Button disabled={loading || !!error} onClick={() => {
            const blob = new Blob([JSON.stringify(live, null, 2)], {type:'application/json'})
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a'); link.href = url; link.download = 'healthcare-report.json'; link.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          }} className="bg-brand-default text-white flex-shrink-0">Generate Report</Button>
        </div>

        {loading && <p>Loading live dashboard…</p>}
        {error && <Alert type="error" title="Dashboard refresh failed">{error}</Alert>}
        {/* Alerts */}
        {s.medicine_shortages > 0 && (
          <Alert type="warning" title={`${s.medicine_shortages} medicine shortages detected`}>
            Several facilities are reporting stock-out conditions. Review and coordinate supply.
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          <KPICard title="Total Patients" value={s.total_patients.toLocaleString()} icon={Users} color="navy"  />
          <KPICard title="Active Doctors" value={s.active_doctors} icon={Stethoscope} color="teal" />
          <KPICard title="Facilities" value={s.facilities} icon={Building2} color="blue" />
          <KPICard title="Today's Consultations" value={s.today_consultations} icon={Activity} color="success"  />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard title="Pending Referrals" value={s.pending_referrals} icon={ClipboardList} color="warning" />
          <KPICard title="High-Risk Patients" value={s.high_risk_patients} icon={AlertCircle} color="critical" />
          <KPICard title="Medicine Shortages" value={s.medicine_shortages} icon={Pill} color="critical" />
          <KPICard title="Diagnostic Delays" value={s.diagnostic_delays} icon={Clock} color="warning" />
        </div>

        {/* Charts + Facilities */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-1 bg-surface-elevated rounded-xl border border-border-subtle p-5">
            <BarChart data={weeklyData} title="Weekly Consultations" />
            <div className="mt-4 flex justify-between text-xs text-text-muted">
              <span>Total this week: <strong className="text-text-primary">{weeklyData.reduce((acc, curr) => acc + curr.value, 0)}</strong></span>
              <span>Last 7 days</span>
            </div>
          </div>

          {/* Quality metrics */}
          <div className="lg:col-span-2 bg-surface-elevated rounded-xl border border-border-subtle p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Quality Indicators</h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/admin/quality')}>View Full Dashboard</Button>
            </div>
            <div className="space-y-4">
              {qualityIndicators.map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-text-muted">{m.label}</span>
                    <span className={`font-semibold ${m.value >= m.target ? 'text-status-success' : 'text-status-warning'}`}>{m.value === null ? 'No data' : `${m.value}%`} <span className="text-text-muted font-normal">/ {m.target}% target</span></span>
                  </div>
                  <ProgressBar value={m.value} max={100} color={m.color} showLabel={false} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Facility grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-surface-elevated rounded-xl border border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Facility Status</h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/admin/facilities')}>Manage</Button>
            </div>
            {facilities.map(fac => <FacilityRow key={fac.id} fac={fac} />)}
          </div>

          {/* High risk patients */}
          <div className="bg-surface-elevated rounded-xl border border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">High-Risk Patients Requiring Attention</h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/admin/high-risk')}>View All</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-canvas border-b border-border-subtle">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Patient</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Risk</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Last Visit</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Status</th>
                </tr></thead>
                <tbody>
                  {highRisk.map(p => <HighRiskRow key={p.id} p={p} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
