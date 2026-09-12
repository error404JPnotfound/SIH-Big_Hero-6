import { supabase } from './supabase'

// Paginate so dashboard totals do not stop at the API row limit.
export async function rows(table, select = '*') {
  const result = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from(table).select(select).order('id').range(offset, offset + 999)
    if (error) throw error
    result.push(...data)
    if (data.length < 1000) return result
  }
}
export async function patients() {
  return (await rows('patients', '*, profiles:profile_id(full_name)')).map(p => {
    const birth = p.dob && new Date(p.dob)
    const now = new Date()
    let age = birth ? now.getFullYear() - birth.getFullYear() : '—'
    if (birth && (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()))) age--
    return { ...p, name: p.profiles?.full_name || p.patient_code || 'Unnamed patient', age, gender: p.gender || 'Not recorded', condition: (p.allergies || []).join(', ') }
  })
}
export async function referrals() {
  return (await rows('referrals', '*, patients:patient_id(patient_code,profiles:profile_id(full_name)), origin:from_facility(name), destination:to_facility(name)')).map(r => ({ ...r, patient_name: r.patients?.profiles?.full_name || 'Unnamed patient', patient_code: r.patients?.patient_code || '', from_facility: r.origin?.name || 'Unassigned', to_facility: r.destination?.name || 'Unassigned', department: r.department || '' }))
}
export async function stock() {
  return (await rows('medicine_stock', '*, medicines:medicine_id(name), facilities:facility_id(name)')).map(m => ({ ...m, name: m.medicines?.name || 'Unnamed medicine', facility: m.facilities?.name || 'Unassigned', quantity: m.quantity ?? 0, unit: m.unit || '', is_available: m.is_available && m.quantity > 0 }))
}
export async function facilities() {
  const [list, doctors, appointments] = await Promise.all([
    rows('facilities'), rows('doctors','id,facility_id,account_status,profiles:profile_id(is_active)'),
    rows('appointments','id,facility_id,patient_id,scheduled_at,status'),
  ])
  const today = new Date().toDateString()
  return list.map(f => ({ ...f, location: [f.address, f.district, f.state].filter(Boolean).join(', '),
    doctors: doctors.filter(d => d.facility_id === f.id && d.account_status === 'approved' && d.profiles?.is_active).length,
    patients_today: new Set(appointments.filter(a => a.facility_id === f.id && a.status !== 'cancelled' && new Date(a.scheduled_at).toDateString() === today).map(a => a.patient_id)).size,
  }))
}

export async function saveStock(id, values) {
  const quantity = Number(values.quantity)
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647) throw new Error('Quantity must be a nonnegative whole number within the supported range.')
  const { error, data } = await supabase.from('medicine_stock').update({ quantity, unit: String(values.unit || '').trim(), is_available: quantity > 0, updated_at: new Date().toISOString() }).eq('id', id).select('id').single()
  if (error) throw error
  return data
}

export async function saveFacility(id, values) {
  if (!String(values.name || '').trim()) throw new Error('Facility name is required.')
  const payload = Object.fromEntries(['name','type','status','address','district','state','phone'].map(k => [k, String(values[k] || '').trim()]))
  for (const key of ['capacity','beds']) {
    payload[key] = Number(values[key])
    if (!Number.isSafeInteger(payload[key]) || payload[key] < 0) throw new Error('Capacity and beds must be nonnegative whole numbers.')
  }
  const query = id ? supabase.from('facilities').update(payload).eq('id', id) : supabase.from('facilities').insert(payload)
  const { data, error } = await query.select('id').single()
  if (error) throw error
  return data
}
export async function dashboard() {
  const [p, d, f, c, r, m, dx] = await Promise.all([rows('patients','id,is_high_risk'), rows('doctors','id,account_status,profiles:profile_id(is_active)'), rows('facilities','id'), rows('consultations','id,created_at'), rows('referrals','id,status'), stock(), rows('diagnostics','id,status,scheduled_at')])
  const today = new Date().toLocaleDateString('en-CA')
  return { total_patients:p.length, active_doctors:d.filter(x => x.account_status === 'approved' && x.profiles?.is_active).length, facilities:f.length, today_consultations:c.filter(x => new Date(x.created_at).toLocaleDateString('en-CA') === today).length, pending_referrals:r.filter(x => x.status === 'pending').length, high_risk_patients:p.filter(x => x.is_high_risk).length, medicine_shortages:m.filter(x => !x.is_available).length, diagnostic_delays:dx.filter(x => !['result_ready','reviewed','cancelled'].includes(x.status) && x.scheduled_at && new Date(x.scheduled_at) < new Date()).length }
}
export async function weekly() {
  const data = await rows('consultations','id,created_at')
  return Array.from({length:7}, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - 6 + i)
    return { label:date.toLocaleDateString('en-IN',{weekday:'short'}), value:data.filter(x => new Date(x.created_at).toDateString() === date.toDateString()).length }
  })
}
export async function quality() {
  const [r, f, m, dx] = await Promise.all([rows('referrals','id,status'), rows('follow_ups','id,status'), stock(), rows('diagnostics','id,status')])
  return [
    ['Referral Completion Rate',r,r.filter(x => x.status === 'completed').length,90],
    ['Follow-ups On Track',f,f.filter(x => x.status === 'on_track').length,85],
    ['Medicine Availability',m,m.filter(x => x.is_available).length,95],
    ['Diagnostic Results Available',dx,dx.filter(x => ['result_ready','reviewed'].includes(x.status)).length,90],
  ].map(([label, data, count, target]) => {
    const value = data.length ? Math.round(count / data.length * 100) : null
    return { label, value, target, unit:'%', status:value === null ? 'unknown' : value >= target ? 'good' : 'needs_improvement', color:value >= target ? 'success' : 'warning', desc:`${count} of ${data.length} records · current totals`, trend:null, sparkline:[] }
  })
}
