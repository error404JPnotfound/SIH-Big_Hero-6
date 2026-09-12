import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveRecords } from '../hooks/useLiveRecords'
import { getMyPrescriptions } from '../lib/db'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

export default function PatientPrescriptions() {
  const { data, loading, error } = useLiveRecords(getMyPrescriptions)
  const [selected, setSelected] = useState(null)
  const [params, setParams] = useSearchParams()
  const active = selected || data.find(rx => rx.id === params.get('prescription'))
  const close = () => { setSelected(null); setParams(previous => { previous.delete('prescription'); return previous }, { replace: true }) }
  return <section className="space-y-3">
    <h2 className="text-xl font-semibold text-text-primary">My Prescriptions</h2>
    {loading && <p>Loading prescriptions…</p>}
    {error && <p role="alert" className="text-status-critical">{error}</p>}
    {!loading && !error && !data.length && <p>No prescriptions have been issued yet.</p>}
    {!error && data.map(rx => <div key={rx.id} className="p-4 bg-surface-elevated border border-border-subtle rounded-xl flex justify-between gap-4">
      <div><p className="font-semibold">{rx.doctors?.profiles?.full_name || 'Doctor not recorded'}</p><p>{new Date(rx.issued_at).toLocaleDateString('en-IN')} · {rx.prescription_items.length} medicines</p></div>
      <Button variant="outline" onClick={() => setSelected(rx)}>View Result</Button>
    </div>)}
    <Modal open={!!active} onClose={close} title="Prescription" size="lg">
      {active && <div className="space-y-4"><p>Prescribed by {active.doctors?.profiles?.full_name || 'Doctor not recorded'} · {new Date(active.issued_at).toLocaleString('en-IN')}</p>
        {active.prescription_items.map(item => <div key={item.id} className="p-4 border border-border-subtle rounded-xl"><h3 className="font-semibold">{item.medicine_name}</h3><p>{item.dosage} · {item.frequency} · {item.duration}</p>{item.instructions && <p>Instructions: {item.instructions}</p>}</div>)}
      </div>}
    </Modal>
  </section>
}
