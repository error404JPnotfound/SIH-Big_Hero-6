import { useEffect, useState } from 'react'
import { Modal } from './ui/Modal'

function Fields({ value }) {
  if (value === null || value === undefined || value === '') return <span className="text-text-muted">Not recorded</span>
  if (Array.isArray(value)) return value.length ? <div className="space-y-3">{value.map((row, i) => <div key={row?.id || i} className="border border-border-subtle rounded-lg p-3"><Fields value={row} /></div>)}</div> : <span>No records</span>
  if (typeof value === 'object') return <dl className="space-y-3">{Object.entries(value).filter(([key]) => key !== 'id' && !key.endsWith('_id')).map(([key, entry]) => <div key={key}><dt className="font-semibold capitalize">{key.replaceAll('_', ' ')}</dt><dd className="text-sm break-words"><Fields value={entry} /></dd></div>)}</dl>
  return <span>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
}

export function RecordDetails({ title, record, load, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setData(null); setError('')
    if (record) Promise.resolve().then(() => load ? load(record.id) : record)
      .then(value => { if (active) setData(value) })
      .catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [record, load])
  return <Modal open={!!record} onClose={onClose} title={title} size="lg">
    {error ? <p role="alert" className="text-status-critical">{error}</p> : data ? <Fields value={data} /> : <p>Loading record…</p>}
  </Modal>
}
