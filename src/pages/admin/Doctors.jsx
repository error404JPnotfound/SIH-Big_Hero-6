import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Misc'
import { getAdminDoctors, updateDoctorApprovalStatus } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import { Building2, CheckCircle2, Filter, Search, Stethoscope, XCircle } from 'lucide-react'

const statusTabs = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

function badgeVariant(status) {
  if (status === 'approved' || status === 'Active') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'critical'
  return 'outline'
}

export default function Doctors() {
  const { demoMode } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [tab, setTab] = useState('pending')
  const [rejectionReasons, setRejectionReasons] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    if (demoMode) {
      setDoctors([])
      setLoading(false)
      return
    }
    try {
      const data = await getAdminDoctors()
      setDoctors(data || [])
    } catch (err) {
      console.error('Error loading doctors:', err)
      setError(err.message || 'Unable to load doctors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [demoMode])

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return doctors.filter(doc => {
      const matchesStatus = tab === 'all' || doc.account_status === tab || (!doc.account_status && tab === 'approved')
      const matchesSearch = !q || (
        doc.name?.toLowerCase().includes(q) ||
        doc.specialization?.toLowerCase().includes(q) ||
        doc.facility?.toLowerCase().includes(q) ||
        doc.reg_number?.toLowerCase().includes(q) ||
        doc.email?.toLowerCase().includes(q)
      )
      return matchesStatus && matchesSearch
    })
  }, [doctors, searchQuery, tab])

  const statusCounts = useMemo(() => ({
    pending: doctors.filter(d => d.account_status === 'pending').length,
    approved: doctors.filter(d => d.account_status === 'approved' || !d.account_status).length,
    rejected: doctors.filter(d => d.account_status === 'rejected').length,
    all: doctors.length,
  }), [doctors])

  const setStatus = async (doctor, status) => {
    if (demoMode) {
      setError('Doctor approvals require a real Supabase admin login. Sign out of Demo Mode and sign in with an approved admin account.')
      return
    }
    setSavingId(`${doctor.id}:${status}`)
    setError('')
    setSuccess('')
    try {
      await updateDoctorApprovalStatus(doctor.id, status, rejectionReasons[doctor.id] || null)
      setSuccess(`${doctor.name} was ${status}.`)
      await load()
    } catch (err) {
      console.error('Doctor approval update failed:', err)
      setError(err.message || 'Unable to update doctor status.')
    } finally {
      setSavingId('')
    }
  }

  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Doctors Directory</h1>
            <p className="text-text-muted text-sm">Review doctor registrations and manage approved clinicians</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setShowSearch(!showSearch); setSearchQuery('') }}
              className={showSearch ? 'border-brand-default text-brand-default bg-subtle' : ''}
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
          </div>
        </div>

        {demoMode && (
          <Alert type="info" title="Real admin login required">
            Demo Mode cannot read or approve Supabase doctor registrations. Sign out and log in with a real admin account to review pending doctors.
          </Alert>
        )}
        {error && <Alert type="critical" title="Doctor update failed">{error}</Alert>}
        {success && <Alert type="success" title="Doctor status updated">{success}</Alert>}

        <div className="flex flex-wrap gap-2">
          {statusTabs.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${tab === item.id ? 'bg-brand-default border-brand-default text-white' : 'bg-surface-elevated border-border-subtle text-text-muted hover:text-text-primary'}`}
            >
              {item.label} <span className="ml-1 opacity-80">({statusCounts[item.id]})</span>
            </button>
          ))}
        </div>

        {showSearch && (
          <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              autoFocus
              type="text"
              placeholder="Search doctors by name, email, specialization, facility, or registration number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-elevated border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-default transition-colors"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-text-muted">Loading...</div>
        ) : (
          <div className="space-y-3">
            {filteredDoctors.map((doc, i) => (
              <div key={doc.id || i} className="bg-surface-elevated border border-border-subtle rounded-xl p-4 space-y-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-default flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {(doc.name || 'D').charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-text-primary text-base truncate">{doc.name}</h3>
                      <Badge variant={badgeVariant(doc.account_status || doc.status)}>{doc.account_status || doc.status || 'approved'}</Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-text-muted">
                      <span className="flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> {doc.specialization || 'Not specified'}</span>
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {doc.facility || 'No facility'}</span>
                      <span>Email: {doc.email || '—'}</span>
                      <span>Phone: {doc.phone || '—'}</span>
                      <span>Registration: <span className="font-mono">{doc.reg_number}</span></span>
                      <span>Qualification: {doc.qualification || '—'}</span>
                      <span>Experience: {doc.experience_years ?? '—'} years</span>
                      <span>Department: {doc.department || '—'}</span>
                      <span>Designation: {doc.designation || '—'}</span>
                      <span>Consultation: {String(doc.consultation_type || '—').replace(/_/g, ' ')}</span>
                      <span>Emergency Duty: {doc.emergency_duty ? 'Yes' : 'No'}</span>
                      <span>Available Days: {doc.available_days?.length ? doc.available_days.join(', ') : '—'}</span>
                      <span>Working Hours: {doc.working_hours || '—'}</span>
                    </div>
                    {doc.rejection_reason && (
                      <p className="text-sm text-status-critical mt-2">Rejection reason: {doc.rejection_reason}</p>
                    )}
                  </div>
                </div>

                {doc.account_status === 'pending' && (
                  <div className="flex flex-col md:flex-row gap-2 md:items-center border-t border-border-subtle pt-4">
                    <input
                      type="text"
                      placeholder="Optional rejection reason"
                      value={rejectionReasons[doc.id] || ''}
                      onChange={e => setRejectionReasons(prev => ({ ...prev, [doc.id]: e.target.value }))}
                      className="flex-1 bg-canvas border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-default"
                    />
                    <Button
                      size="sm"
                      className="bg-status-success text-white hover:bg-status-success/90"
                      loading={savingId === `${doc.id}:approved`}
                      onClick={() => setStatus(doc, 'approved')}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={savingId === `${doc.id}:rejected`}
                      onClick={() => setStatus(doc, 'rejected')}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {filteredDoctors.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border-subtle rounded-xl">
                <p className="text-text-muted">No doctors found for this view.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
