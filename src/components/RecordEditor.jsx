import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

// Mount with a record id as key so form drafts never cross records.
export function RecordEditor({ title, fields, initial, onSave, onClose }) {
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError('')
    try { await onSave(values); window.dispatchEvent(new Event('careconnect:records-updated')); onClose() }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }
  return <Modal open onClose={() => { if (!saving) onClose() }} title={title} size="lg">
    <form onSubmit={submit} className="space-y-4">
      {fields.map(field => <label key={field.name} className="block text-sm font-medium text-text-primary">{field.label}{field.required ? ' *' : ''}
        {field.options ? <select className="mt-1 block w-full bg-surface-elevated border border-border-subtle rounded-lg p-3" required={field.required} value={values[field.name] ?? ''} onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}>
          {field.options.map(option => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
        </select> : <input className="mt-1 block w-full bg-surface-elevated border border-border-subtle rounded-lg p-3" readOnly={field.readOnly} type={field.type || 'text'} min={field.min} step={field.type === 'number' ? 1 : undefined} required={field.required} value={values[field.name] ?? ''} onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))} />}
      </label>)}
      {error && <p role="alert" className="text-status-critical">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" loading={saving}>Save Changes</Button><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button></div>
    </form>
  </Modal>
}
