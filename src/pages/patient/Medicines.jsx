/**
 * Medicines.jsx — /patient/medicines
 * ─────────────────────────────────────────────────────────────────────────────
 * Restrictive & Patient-Centric Medicine Portal:
 * ONLY medicines prescribed by an authorized doctor during consultations
 * are accessible here. General unprescribed catalog browsing is prohibited.
 *
 * Pulls directly from Supabase `prescriptions` and `prescription_items`.
 * Cross-references facility stock for dispensary pickup status.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Modal'
import { getMyPrescriptions, searchMedicines } from '../../lib/db'
import {
  Pill,
  Search,
  Calendar,
  Clock,
  UserCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Printer,
  Info
} from 'lucide-react'

export default function Medicines() {
  const navigate = useNavigate()

  const [prescriptions, setPrescriptions] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'completed' | 'in_stock'
  const [selectedPrescription, setSelectedPrescription] = useState(null)

  // Fetch only doctor-prescribed medicines
  useEffect(() => {
    let isMounted = true

    async function loadPrescribedMedicines() {
      setLoading(true)
      setError(null)
      try {
        const data = await getMyPrescriptions()
        if (!isMounted) return
        setPrescriptions(data || [])

        // Collect unique medicine names to check facility pharmacy stock
        const uniqueNames = new Set()
        ;(data || []).forEach(p => {
          ;(p.prescription_items || []).forEach(item => {
            if (item.medicine_name) {
              uniqueNames.add(item.medicine_name.trim().toLowerCase())
            }
          })
        })

        // Check stock availability specifically for the patient's prescribed medicines
        const stockResults = {}
        await Promise.allSettled(
          Array.from(uniqueNames).map(async (name) => {
            try {
              const matches = await searchMedicines(name, null, null)
              if (matches && matches.length > 0) {
                stockResults[name] = matches[0]
              }
            } catch (err) {
              console.warn(`Stock check skipped for ${name}:`, err)
            }
          })
        )

        if (isMounted) {
          setStockMap(stockResults)
        }
      } catch (err) {
        console.error('Failed to load prescribed medicines:', err)
        if (isMounted) {
          setError(err.message || 'Unable to retrieve your prescribed medicines.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadPrescribedMedicines()
    return () => { isMounted = false }
  }, [])

  // Flatten prescriptions into individual prescribed medicine entries
  const prescribedMedicines = useMemo(() => {
    const list = []
    prescriptions.forEach((p) => {
      const doctorName = p.doctors?.profiles?.full_name || 'Authorized Medical Officer'
      const specialization = p.doctors?.specialization || 'General Medicine'
      const facilityName = p.doctors?.facilities?.name || 'CareConnect Health Centre'
      const issuedDate = p.issued_at ? new Date(p.issued_at) : new Date()

      ;(p.prescription_items || []).forEach((item) => {
        // Parse duration (e.g. "5 days", "10", "2 weeks")
        const durationDays = parseInt(item.duration, 10) || 7
        const expiryDate = new Date(issuedDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
        const isActive = new Date() <= expiryDate

        const normalizedName = (item.medicine_name || '').trim().toLowerCase()
        const stockInfo = stockMap[normalizedName] || null

        list.push({
          id: item.id || `${p.id}-${item.medicine_name}`,
          prescriptionId: p.id,
          prescriptionDate: issuedDate,
          pdfUrl: p.pdf_url,
          doctorName,
          specialization,
          facilityName,
          medicineName: item.medicine_name || 'Prescribed Medicine',
          dosage: item.dosage || 'As directed',
          frequency: item.frequency || 'Daily',
          duration: item.duration || 'As prescribed',
          instructions: item.instructions || 'Take as advised by doctor',
          isActive,
          expiryDate,
          stockInfo,
          rawPrescription: p,
        })
      })
    })

    return list
  }, [prescriptions, stockMap])

  // Apply search query and status filters exclusively on prescribed medicines
  const filteredMedicines = useMemo(() => {
    return prescribedMedicines.filter((med) => {
      // Search matches medicine name, doctor name, dosage, or instructions
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q ||
        med.medicineName.toLowerCase().includes(q) ||
        med.doctorName.toLowerCase().includes(q) ||
        med.instructions.toLowerCase().includes(q) ||
        med.dosage.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (statusFilter === 'active') return med.isActive
      if (statusFilter === 'completed') return !med.isActive
      if (statusFilter === 'in_stock') return med.stockInfo?.is_available === true

      return true
    })
  }, [prescribedMedicines, searchQuery, statusFilter])

  // Counts for quick filter stats
  const stats = useMemo(() => {
    const total = prescribedMedicines.length
    const active = prescribedMedicines.filter(m => m.isActive).length
    const completed = prescribedMedicines.filter(m => !m.isActive).length
    const inStock = prescribedMedicines.filter(m => m.stockInfo?.is_available).length
    return { total, active, completed, inStock }
  }, [prescribedMedicines])

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">My Prescribed Medicines</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-light text-brand-default border border-brand-default/20">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-default" />
                Doctor Prescribed Only
              </span>
            </div>
            <p className="text-text-muted text-sm mt-1">
              Only medications officially prescribed by your consulting physician are accessible here.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/patient/appointments')}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <Calendar className="w-4 h-4 text-brand-default" />
            Book Consultation
          </Button>
        </div>

        {/* Regulatory Notice Banner */}
        <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20 rounded-2xl p-4 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-brand-default flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-text-primary text-sm">
              Clinical Dispensation Protection
            </p>
            <p className="text-text-muted leading-relaxed">
              In accordance with national healthcare safety protocols, only verified medications prescribed by your attending doctor during a registered consultation can be viewed or dispensed. Self-medication without clinical oversight is restricted.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border-subtle bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-brand-default text-text-primary placeholder:text-text-muted shadow-sm transition-all"
              placeholder="Search your prescribed medicines by name, doctor, or dosage…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {[
              { id: 'all', label: `All Prescribed (${stats.total})` },
              { id: 'active', label: `Active Courses (${stats.active})` },
              { id: 'completed', label: `Completed (${stats.completed})` },
              { id: 'in_stock', label: `In Stock at Dispensary (${stats.inStock})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  statusFilter === tab.id
                    ? 'bg-brand-default text-white border-brand-default shadow-sm'
                    : 'border-border-subtle text-text-muted hover:border-brand-default hover:text-brand-default bg-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-status-critical-bg text-status-critical text-xs rounded-xl border border-status-critical/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Medicines List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="bg-surface-elevated rounded-2xl border border-border-subtle p-8 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-subtle text-brand-default mx-auto flex items-center justify-center">
                <Pill className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-text-primary">
                  {searchQuery ? 'No Matching Prescribed Medicines' : 'No Prescribed Medicines Found'}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {searchQuery
                    ? `No prescribed medicines match "${searchQuery}". Remember that only medicines prescribed to you by a doctor are accessible.`
                    : 'Only medicines prescribed by your doctor during an approved consultation are accessible here. If you need medical care, please schedule an appointment.'}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/patient/appointments')}
                className="bg-brand-default hover:bg-brand-dark text-white text-xs font-semibold px-4 py-2"
              >
                Book Doctor Appointment
              </Button>
            </div>
          ) : (
            filteredMedicines.map((med) => (
              <div
                key={med.id}
                className="bg-surface-elevated rounded-2xl border border-border-subtle p-5 hover:border-brand-default/40 transition-all shadow-sm group hover:shadow-md space-y-4"
              >
                {/* Top Row: Medicine Info & Status Badges */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      med.isActive ? 'bg-status-success-bg text-status-success' : 'bg-subtle text-text-muted'
                    }`}>
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-text-primary text-base">
                          {med.medicineName}
                        </h3>
                        <Badge variant={med.isActive ? 'success' : 'outline'}>
                          {med.isActive ? 'Active Course' : 'Course Completed'}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-default bg-brand-light px-2 py-0.5 rounded-full border border-brand-default/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Doctor Verified
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-text-primary flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-brand-default" />
                          {med.doctorName}
                        </span>
                        <span>•</span>
                        <span>{med.specialization}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {med.facilityName}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* View Prescription Slip Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedPrescription(med)}
                    className="text-xs text-brand-default hover:bg-brand-light flex items-center gap-1.5 self-end sm:self-start flex-shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View Rx Slip
                  </Button>
                </div>

                {/* Dosage & Schedule Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-canvas/60 rounded-xl p-3 border border-border-subtle/60 text-xs">
                  <div>
                    <span className="text-[11px] text-text-muted block">Dosage</span>
                    <strong className="text-text-primary font-semibold">{med.dosage}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-muted block">Frequency</span>
                    <strong className="text-text-primary font-semibold">{med.frequency}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-muted block">Duration</span>
                    <strong className="text-text-primary font-semibold">{med.duration}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-muted block">Prescribed Date</span>
                    <strong className="text-text-primary font-semibold">
                      {med.prescriptionDate.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </div>
                </div>

                {/* Instructions & Pharmacy Stock Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border-subtle/40 text-xs">
                  <div className="flex items-start gap-1.5 text-text-muted">
                    <Info className="w-3.5 h-3.5 text-brand-default flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-text-primary font-medium">Doctor's Advice: </strong>
                      {med.instructions}
                    </span>
                  </div>

                  {/* Stock availability check */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {med.stockInfo ? (
                      med.stockInfo.is_available ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-success bg-status-success-bg px-2.5 py-1 rounded-lg border border-status-success/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          In Stock ({med.stockInfo.quantity || 'Available'} units at {med.stockInfo.facility_name})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-warning bg-status-warning-bg px-2.5 py-1 rounded-lg border border-status-warning/20">
                          <Clock className="w-3.5 h-3.5" />
                          Out of stock at dispensary · Check main pharmacy
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted bg-canvas px-2.5 py-1 rounded-lg border border-border-subtle">
                        <Building2 className="w-3.5 h-3.5" />
                        Available for collection at {med.facilityName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Digital Prescription Slip Modal */}
        {selectedPrescription && (
          <Modal
            open={!!selectedPrescription}
            onClose={() => setSelectedPrescription(null)}
            title="Official Clinical Prescription"
            size="lg"
          >
            <div className="space-y-6 text-xs text-text-primary p-2">
              {/* Header */}
              <div className="border-b border-border-subtle pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-brand-default" />
                    CareConnect e-Prescription
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Authorized National Health Stack Digital Prescription
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-text-muted block">Date Issued</span>
                  <span className="font-semibold text-xs">
                    {selectedPrescription.prescriptionDate.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Doctor & Facility Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-canvas p-4 rounded-xl border border-border-subtle">
                <div>
                  <span className="text-[11px] text-text-muted uppercase font-bold tracking-wider block">
                    Prescribing Practitioner
                  </span>
                  <p className="font-bold text-text-primary text-sm mt-0.5">
                    {selectedPrescription.doctorName}
                  </p>
                  <p className="text-xs text-text-muted">{selectedPrescription.specialization}</p>
                  <p className="text-xs text-brand-default font-mono mt-1">Verified Medical License</p>
                </div>
                <div>
                  <span className="text-[11px] text-text-muted uppercase font-bold tracking-wider block">
                    Facility / Hospital
                  </span>
                  <p className="font-bold text-text-primary text-sm mt-0.5">
                    {selectedPrescription.facilityName}
                  </p>
                  <p className="text-xs text-text-muted">Outpatient Clinical Department</p>
                </div>
              </div>

              {/* Prescribed Medications Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-brand-default font-bold text-sm">
                  <Pill className="w-4 h-4" />
                  <span>Rx — Prescribed Medication</span>
                </div>
                <div className="border border-border-subtle rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas border-b border-border-subtle text-text-muted">
                      <tr>
                        <th className="p-3">Medicine Name</th>
                        <th className="p-3">Dosage</th>
                        <th className="p-3">Frequency</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {(selectedPrescription.rawPrescription?.prescription_items || [selectedPrescription]).map((item, idx) => (
                        <tr key={idx} className="hover:bg-canvas/50">
                          <td className="p-3 font-semibold text-text-primary">{item.medicine_name || item.medicineName}</td>
                          <td className="p-3">{item.dosage}</td>
                          <td className="p-3">{item.frequency}</td>
                          <td className="p-3">{item.duration}</td>
                          <td className="p-3 text-text-muted">{item.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Compliance & Signature Footer */}
              <div className="border-t border-border-subtle pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[11px] text-text-muted space-y-0.5">
                  <p className="font-semibold text-text-primary">Valid Digital Prescription</p>
                  <p>Electronically generated and authenticated via CareConnect Doctor Portal.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Print Rx
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setSelectedPrescription(null)}
                    className="bg-brand-default text-white"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  )
}
