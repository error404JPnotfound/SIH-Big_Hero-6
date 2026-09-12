import PatientPrescriptions from '../../components/PatientPrescriptions'
/**
 * Diagnostics.jsx — /patient/diagnostics
 * ─────────────────────────────────────────────────────────────────────────────
 * My Diagnostics page: fetches real diagnostic records from Supabase for the
 * currently logged-in patient.
 *
 * Requirements fulfilled:
 * - Dynamic Supabase fetching for logged-in patient only (patient_id filtering)
 * - Realtime updates via Supabase channel
 * - Detailed diagnostic item card:
 *     • Test name & category
 *     • Prescribed by Doctor
 *     • Hospital / Laboratory name
 *     • Prescribed date & Scheduled date
 *     • Test status badge (Pending, Scheduled, In Progress, Completed, Cancelled)
 *     • Result status indicator (Available vs Pending)
 *     • Result notes preview
 * - "View Result" button: opens modal displaying full clinical findings, doctor,
 *   dates, and embedded Supabase report PDF viewer
 * - "Download" button: fetches and downloads actual PDF
 * - Professional loading skeleton, empty state, and error handling
 * - Preserves existing CareConnect layout, sidebar, header, and design system
 */
import { useState, useEffect, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Misc'
import { useAuth } from '../../context/AuthContext'
import { getMyDiagnostics, getDiagnosticSignedUrl, subscribeToDiagnostics } from '../../lib/db'
import {
  Activity, Download, Eye, Calendar, Clock,
  Loader2, AlertCircle, FlaskConical, ExternalLink,
  CheckCircle2, Building2
} from 'lucide-react'

// ── Status display metadata (mapped to standardized badges) ──────────────────
const STATUS_META = {
  requested:        { label: 'Pending',          variant: 'outline'  },
  pending:          { label: 'Pending',          variant: 'outline'  },
  scheduled:        { label: 'Scheduled',        variant: 'blue'     },
  sample_collected: { label: 'In Progress',      variant: 'warning'  },
  processing:       { label: 'In Progress',      variant: 'warning'  },
  in_progress:      { label: 'In Progress',      variant: 'warning'  },
  result_ready:     { label: 'Completed',        variant: 'success'  },
  reviewed:         { label: 'Completed',        variant: 'success'  },
  completed:        { label: 'Completed',        variant: 'success'  },
  cancelled:        { label: 'Cancelled',        variant: 'critical' },
}

// ── Infer category from test name ───────────────────────────────────────────
function getTestCategory(testName = '') {
  const lower = testName.toLowerCase()
  if (lower.includes('blood') || lower.includes('cbc') || lower.includes('glucose') || lower.includes('lipid') || lower.includes('hemoglobin') || lower.includes('platelet')) {
    return 'Hematology & Biochemistry'
  }
  if (lower.includes('x-ray') || lower.includes('mri') || lower.includes('ct') || lower.includes('ultrasound') || lower.includes('scan') || lower.includes('radiograph')) {
    return 'Radiology & Imaging'
  }
  if (lower.includes('urine') || lower.includes('stool') || lower.includes('biopsy') || lower.includes('pap') || lower.includes('culture')) {
    return 'Clinical Pathology'
  }
  if (lower.includes('ecg') || lower.includes('echo') || lower.includes('cardio') || lower.includes('tmt')) {
    return 'Cardiology'
  }
  return 'Diagnostic Laboratory'
}

// ── View Result / Report Modal ─────────────────────────────────────────────
function ResultModal({ open, onClose, diagnostic, onDownload, isDownloading }) {
  const [url, setUrl]         = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  useEffect(() => {
    let active = true
    setUrl(null)
    setError(null)
    setLoading(false)
    if (!open || !diagnostic?.report_url) return
    setLoading(true)
    getDiagnosticSignedUrl(diagnostic.report_url)
      .then(value => { if (active) setUrl(value) })
      .catch(err => { if (active) setError(err.message || 'Report could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, diagnostic])
  const handleClose = onClose

  if (!diagnostic) return null

  const doctorName = diagnostic.doctors?.profiles?.full_name || 
    (diagnostic.doctors?.specialization ? `Dr. (${diagnostic.doctors.specialization})` : 'Doctor not recorded')
  const facilityName = diagnostic.facilities?.name || 'Facility not recorded'
  const requestedDate = diagnostic.created_at ? new Date(diagnostic.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const resultDate = diagnostic.updated_at ? new Date(diagnostic.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : requestedDate
  const statusMeta = STATUS_META[diagnostic.status] || { label: diagnostic.status, variant: 'outline' }
  const isCompleted = ['result_ready', 'reviewed', 'completed'].includes(diagnostic.status) || !!diagnostic.result_notes

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Diagnostic Result: ${diagnostic.test_name}`}
      size="xl"
    >
      <div className="space-y-4 pt-1">
        {/* Clinical Summary Bar */}
        <div className="bg-canvas rounded-xl p-4 border border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-text-muted block text-[11px]">Test Status</span>
            <div className="mt-1"><Badge variant={statusMeta.variant}>{statusMeta.label}</Badge></div>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Prescribed by</span>
            <span className="font-semibold text-text-primary block mt-1">{doctorName}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Facility</span>
            <span className="font-semibold text-text-primary block mt-1">{facilityName}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Result Date</span>
            <span className="font-semibold text-text-primary block mt-1">{resultDate}</span>
          </div>
        </div>

        {/* Clinical Findings & Notes */}
        <div className="bg-surface-elevated rounded-xl p-4 border border-border-subtle">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-brand-secondary" /> Clinical Findings & Interpretation
          </h4>
          <p className="text-sm font-medium text-text-primary bg-canvas p-3 rounded-lg border border-border-subtle leading-relaxed">
            {diagnostic.result_notes || 'No result notes have been recorded yet.'}
          </p>
        </div>

        {/* PDF Report Viewer */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
            <p className="text-sm">Fetching diagnostic report from Supabase…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
            <AlertCircle className="w-9 h-9 text-status-error" />
            <p className="text-sm font-medium text-text-primary">Failed to load report</p>
            <p className="text-xs text-text-muted max-w-xs">{error}</p>
          </div>
        )}

        {url && !loading && !error && (
          <div className="flex flex-col gap-3">
            <iframe
              src={url}
              title={`Report: ${diagnostic.test_name}`}
              className="w-full rounded-lg border border-border-subtle shadow-inner bg-canvas"
              style={{ height: '52vh', minHeight: '340px' }}
            />
            <div className="flex items-center gap-2 justify-between pt-2 border-t border-border-subtle flex-wrap">
              <span className="text-xs text-text-muted">Uploaded diagnostic report</span>
              <div className="flex items-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-brand-secondary hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1"
                  loading={isDownloading}
                  onClick={() => onDownload(diagnostic)}
                >
                  <Download className="w-3 h-3" /> Download Report PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Diagnostics() {
  const { user, loading: authLoading } = useAuth()

  const [diagnostics, setDiagnostics]     = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  // Result / report modal state
  const [modalOpen, setModalOpen]         = useState(false)
  const [selectedDx, setSelectedDx]       = useState(null)

  // Per-row download loading state
  const [downloadingId, setDownloadingId] = useState(null)

  // ── Fetch diagnostics ────────────────────────────────────────────────────
  const loadDiagnostics = useCallback(async () => {
    if (authLoading) return
    setLoading(true)
    setError(null)
    try {
      const data = await getMyDiagnostics()
      setDiagnostics(data || [])
    } catch (err) {
      console.error('[Diagnostics] fetch error:', err)
      setError(err.message || 'Failed to load diagnostics. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [authLoading])

  useEffect(() => {
    if (!authLoading) {
      loadDiagnostics()

      // Subscribe to realtime database updates on diagnostics table
      const sub = subscribeToDiagnostics(() => {
        loadDiagnostics()
      })

      return () => {
        sub?.unsubscribe?.()
      }
    }
  }, [authLoading, loadDiagnostics])

  // ── View Result / Report handler ─────────────────────────────────────────
  const handleViewResult = (dx) => {
    setSelectedDx(dx)
    setModalOpen(true)
  }

  // ── Download handler ─────────────────────────────────────────────────────
  const handleDownload = async (dx) => {
    setDownloadingId(dx.id)
    try {
      let downloadUrl = null
      let isBlob = false

      if (!dx.report_url) throw new Error('No report file has been uploaded. You can view the recorded result notes on this page.')
      const rawUrl = await getDiagnosticSignedUrl(dx.report_url)
      const res = await fetch(rawUrl)
      if (!res.ok) throw new Error('The report file could not be downloaded.')
      downloadUrl = URL.createObjectURL(await res.blob())
      isBlob = true

      // Trigger actual PDF file download
      const fileName = `${(dx.test_name || 'Diagnostic').replace(/[^a-zA-Z0-9_-]/g, '_')}_Report.pdf`
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      if (isBlob) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000)
      }
    } catch (err) {
      alert('Could not download the report: ' + (err.message || 'Unknown error'))
    } finally {
      setDownloadingId(null)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getDoctorName = (dx) =>
    dx.doctors?.profiles?.full_name || 
    (dx.doctors?.specialization ? `Dr. (${dx.doctors.specialization})` : 'Doctor not recorded')

  const getFacilityName = (dx) =>
    dx.facilities?.name || 'Facility not recorded'

  const getDisplayDate = (dx) => {
    const raw = dx.created_at || dx.scheduled_at
    if (!raw) return '—'
    return new Date(raw).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Diagnostics</h1>
          <p className="text-text-muted text-sm">Track your test requests and results</p>
        </div>

        <PatientPrescriptions />
        {/* ── Loading skeleton state ── */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-surface-elevated rounded-xl border border-border-subtle p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-36" />
                <div className="flex gap-4 pt-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error state ── */}
        {!loading && error && (
          <div className="flex items-start gap-3 p-4 bg-status-error/10 border border-status-error/20 rounded-xl text-status-error">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Failed to load diagnostics</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
              <button
                onClick={loadDiagnostics}
                className="mt-2 text-xs underline opacity-80 hover:opacity-100"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Empty state (strictly when data is loaded, no error, length is 0) ── */}
        {!loading && !error && diagnostics.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-secondary-light flex items-center justify-center">
              <FlaskConical className="w-8 h-8 text-brand-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-sm">No diagnostic tests found</h3>
              <p className="text-text-muted text-xs mt-1 max-w-xs">
                Your doctor will add diagnostic test requests here once prescribed.
              </p>
            </div>
          </div>
        )}

        {/* ── Diagnostic cards ── */}
        {!loading && !error && diagnostics.length > 0 && (
          <div className="space-y-4">
            {diagnostics.map(dx => {
              const meta = STATUS_META[dx.status] || { label: dx.status, variant: 'outline' }
              const hasResult = !!(
                dx.result_notes ||
                dx.report_url ||
                ['result_ready', 'reviewed', 'completed'].includes(dx.status)
              )
              const isDownloading = downloadingId === dx.id

              return (
                <div
                  key={dx.id}
                  className="bg-surface-elevated rounded-xl border border-border-subtle p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl bg-brand-secondary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-5 h-5 text-brand-secondary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Category + Status badge */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-secondary">
                          {getTestCategory(dx.test_name)}
                        </span>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>

                      {/* Test Name */}
                      <h3 className="font-bold text-text-primary text-base leading-snug">{dx.test_name}</h3>

                      {/* Prescribed by */}
                      <p className="text-xs text-text-muted mt-1">
                        Prescribed by <strong className="text-text-primary font-semibold">{getDoctorName(dx)}</strong>
                      </p>

                      {/* Metadata: Dates & Facility */}
                      <div className="flex items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-text-muted flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-text-muted" />
                          Prescribed: {getDisplayDate(dx)}
                        </span>
                        {dx.scheduled_at && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-text-muted" />
                            Scheduled: {new Date(dx.scheduled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-text-muted" />
                          {getFacilityName(dx)}
                        </span>
                      </div>

                      {/* Result Status & Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          {hasResult ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-success bg-status-success-bg px-2.5 py-1 rounded-md border border-status-success/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Result Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-muted bg-canvas px-2.5 py-1 rounded-md border border-border-subtle">
                              <Clock className="w-3.5 h-3.5 text-text-muted" /> Result Pending
                            </span>
                          )}
                          {dx.result_notes && (
                            <span className="text-xs text-text-muted hidden sm:inline-block truncate max-w-xs">
                              {dx.result_notes}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          {hasResult && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 gap-1.5 bg-canvas hover:bg-subtle"
                                onClick={() => handleViewResult(dx)}
                              >
                                <Eye className="w-3.5 h-3.5 text-brand-secondary" /> View Result
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-8 gap-1.5 text-text-muted hover:text-text-primary"
                                loading={isDownloading}
                                onClick={() => handleDownload(dx)}
                              >
                                <Download className="w-3.5 h-3.5" /> Download
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Result & Report viewer modal */}
      <ResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        diagnostic={selectedDx}
        patientName={user?.name}
        onDownload={handleDownload}
        isDownloading={downloadingId === selectedDx?.id}
      />
    </AppLayout>
  )
}
