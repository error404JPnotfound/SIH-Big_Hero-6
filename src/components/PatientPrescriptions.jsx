import { useCallback, useEffect, useState } from 'react'
import { getMyPrescriptions } from '../lib/db'
import { supabase } from '../lib/supabase'
import {
  Pill,
  Calendar,
  UserRound,
  Building2,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* ==========================================
     LOAD LOGGED-IN PATIENT'S PRESCRIPTIONS
  ========================================== */

  const loadPrescriptions = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getMyPrescriptions()

      setPrescriptions(data || [])
    } catch (err) {
      console.error(
        '[PatientPrescriptions] Failed to load prescriptions:',
        err
      )

      setError(
        err?.message ||
          'Unable to load your prescriptions.'
      )

      setPrescriptions([])
    } finally {
      setLoading(false)
    }
  }, [])

  /* ==========================================
     INITIAL LOAD
  ========================================== */

  useEffect(() => {
    loadPrescriptions()
  }, [loadPrescriptions])

  /* ==========================================
     REFRESH WHEN DOCTOR CREATES PRESCRIPTION
     IN SAME BROWSER
  ========================================== */

  useEffect(() => {
    const handleRecordsUpdated = () => {
      loadPrescriptions()
    }

    window.addEventListener(
      'careconnect:records-updated',
      handleRecordsUpdated
    )

    return () => {
      window.removeEventListener(
        'careconnect:records-updated',
        handleRecordsUpdated
      )
    }
  }, [loadPrescriptions])

  /* ==========================================
     SUPABASE REALTIME

     This handles doctor and patient being
     logged in on different devices/browsers.
  ========================================== */

  useEffect(() => {
    const channel = supabase
      .channel('patient-prescriptions-live')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
        },
        () => {
          loadPrescriptions()
        }
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescription_items',
        },
        () => {
          loadPrescriptions()
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadPrescriptions])

  /* ==========================================
     DATE FORMAT
  ========================================== */

  function formatDate(date) {
    if (!date) return '—'

    return new Date(date).toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  /* ==========================================
     DOCTOR NAME
  ========================================== */

  function getDoctorName(prescription) {
    const name =
      prescription?.doctors?.profiles?.full_name

    if (name) {
      return name.startsWith('Dr.')
        ? name
        : `Dr. ${name}`
    }

    return 'Doctor'
  }

  /* ==========================================
     FACILITY NAME
  ========================================== */

  function getFacilityName(prescription) {
    return (
      prescription?.doctors?.facilities?.name ||
      'Healthcare Facility'
    )
  }

  /* ==========================================
     UI
  ========================================== */

  return (
    <section className="space-y-4">
      {/* HEADER */}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Pill className="w-5 h-5 text-brand-default" />
            My Prescriptions
          </h2>

          <p className="text-xs text-text-muted mt-1">
            Medicines prescribed by your doctor
          </p>
        </div>

        <button
          type="button"
          onClick={loadPrescriptions}
          disabled={loading}
          className="
            flex
            items-center
            gap-1.5
            text-xs
            text-brand-default
            font-medium
            hover:underline
            disabled:opacity-50
          "
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              loading ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* LOADING */}

      {loading && (
        <div
          className="
            bg-surface-elevated
            border
            border-border-subtle
            rounded-xl
            p-8
            text-center
          "
        >
          <Loader2
            className="
              w-6
              h-6
              animate-spin
              text-brand-default
              mx-auto
              mb-2
            "
          />

          <p className="text-sm text-text-muted">
            Loading prescriptions...
          </p>
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div
          className="
            bg-status-error/10
            border
            border-status-error/20
            rounded-xl
            p-4
            flex
            gap-3
          "
        >
          <AlertCircle className="w-5 h-5 text-status-error flex-shrink-0" />

          <div>
            <p className="text-sm font-semibold text-status-error">
              Unable to load prescriptions
            </p>

            <p className="text-xs text-status-error mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* NO PRESCRIPTIONS */}

      {!loading &&
        !error &&
        prescriptions.length === 0 && (
          <div
            className="
              bg-surface-elevated
              border
              border-border-subtle
              rounded-xl
              p-8
              text-center
            "
          >
            <div
              className="
                w-14
                h-14
                rounded-full
                bg-brand-secondary-light
                flex
                items-center
                justify-center
                mx-auto
                mb-3
              "
            >
              <Pill className="w-7 h-7 text-brand-secondary" />
            </div>

            <h3 className="font-semibold text-text-primary text-sm">
              No prescriptions yet
            </h3>

            <p className="text-xs text-text-muted mt-1">
              Prescriptions issued by your doctor
              will appear here.
            </p>
          </div>
        )}

      {/* PRESCRIPTIONS */}

      {!loading &&
        !error &&
        prescriptions.length > 0 && (
          <div className="space-y-4">
            {prescriptions.map(
              (prescription, prescriptionIndex) => (
                <div
                  key={prescription.id}
                  className="
                    bg-surface-elevated
                    border
                    border-border-subtle
                    rounded-xl
                    overflow-hidden
                    shadow-sm
                  "
                >
                  {/* PRESCRIPTION HEADER */}

                  <div
                    className="
                      p-4
                      bg-canvas
                      border-b
                      border-border-subtle
                    "
                  >
                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-3
                        flex-wrap
                      "
                    >
                      <div>
                        <p className="font-bold text-text-primary">
                          Prescription #
                          {prescriptions.length -
                            prescriptionIndex}
                        </p>

                        <div
                          className="
                            flex
                            items-center
                            gap-1.5
                            mt-1
                            text-xs
                            text-text-muted
                          "
                        >
                          <Calendar className="w-3.5 h-3.5" />

                          Issued on{' '}
                          {formatDate(
                            prescription.issued_at
                          )}
                        </div>
                      </div>

                      <span
                        className="
                          px-2.5
                          py-1
                          rounded-full
                          bg-status-success-bg
                          text-status-success
                          text-xs
                          font-semibold
                        "
                      >
                        Active Prescription
                      </span>
                    </div>

                    {/* DOCTOR */}

                    <div
                      className="
                        grid
                        sm:grid-cols-2
                        gap-2
                        mt-3
                      "
                    >
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <UserRound className="w-3.5 h-3.5" />

                        <span>
                          Prescribed by{' '}
                          <strong className="text-text-primary">
                            {getDoctorName(
                              prescription
                            )}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Building2 className="w-3.5 h-3.5" />

                        <span>
                          {getFacilityName(
                            prescription
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MEDICINES */}

                  <div className="p-4 space-y-3">
                    {(prescription.prescription_items ||
                      []).length === 0 ? (
                      <p className="text-sm text-text-muted">
                        No medicine details available.
                      </p>
                    ) : (
                      prescription.prescription_items.map(
                        (medicine, index) => (
                          <div
                            key={
                              medicine.id ||
                              `${prescription.id}-${index}`
                            }
                            className="
                              border
                              border-border-subtle
                              rounded-xl
                              p-4
                              bg-canvas
                            "
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="
                                  w-9
                                  h-9
                                  bg-brand-secondary-light
                                  rounded-lg
                                  flex
                                  items-center
                                  justify-center
                                  flex-shrink-0
                                "
                              >
                                <Pill className="w-4 h-4 text-brand-secondary" />
                              </div>

                              <div className="flex-1">
                                <h4
                                  className="
                                    font-semibold
                                    text-text-primary
                                  "
                                >
                                  {
                                    medicine.medicine_name
                                  }
                                </h4>

                                <div
                                  className="
                                    grid
                                    sm:grid-cols-3
                                    gap-3
                                    mt-3
                                  "
                                >
                                  <div>
                                    <p className="text-[11px] text-text-muted uppercase">
                                      Dosage
                                    </p>

                                    <p className="text-sm font-medium text-text-primary">
                                      {medicine.dosage ||
                                        '—'}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[11px] text-text-muted uppercase">
                                      Frequency
                                    </p>

                                    <p className="text-sm font-medium text-text-primary">
                                      {medicine.frequency ||
                                        '—'}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[11px] text-text-muted uppercase">
                                      Duration
                                    </p>

                                    <p className="text-sm font-medium text-text-primary">
                                      {medicine.duration ||
                                        '—'}
                                    </p>
                                  </div>
                                </div>

                                {medicine.instructions && (
                                  <div
                                    className="
                                      mt-3
                                      pt-3
                                      border-t
                                      border-border-subtle
                                      flex
                                      items-start
                                      gap-2
                                    "
                                  >
                                    <Clock className="w-3.5 h-3.5 text-text-muted mt-0.5" />

                                    <p className="text-xs text-text-muted">
                                      <span className="font-semibold text-text-primary">
                                        Instructions:
                                      </span>{' '}
                                      {
                                        medicine.instructions
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
    </section>
  )
}