import { supabase } from './supabase'

async function doctorId() {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sign in to continue.')
  const { data, error } = await supabase.from('doctors').select('id').eq('profile_id', user.id).eq('account_status', 'approved').single()
  if (error) throw error
  return data.id
}

export async function saveDiagnostic(id, values) {
  const owner = await doctorId()
  const status = values.status
  if (!['requested','scheduled','sample_collected','processing','result_ready','reviewed'].includes(status)) throw new Error('Select a valid diagnostic status.')
  const notes = String(values.result_notes || '').trim()
  if (['result_ready','reviewed'].includes(status) && !notes) throw new Error('Record the result notes before marking the result available.')
  const { error } = await supabase.from('diagnostics').update({ status, result_notes: notes || null, updated_at: new Date().toISOString() }).eq('id', id).eq('requested_by', owner).select('id').single()
  if (error) throw error
}

export async function saveFollowUp(id, values, admin = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.next_due || '') || Number.isNaN(new Date(values.next_due).getTime())) throw new Error('Select a valid follow-up date.')
  if (!['on_track','due_soon','overdue'].includes(values.status)) throw new Error('Select a valid follow-up status.')
  let query = supabase.from('follow_ups').update({ next_due: values.next_due, status: values.status, notes: String(values.notes || '').trim() || null, updated_at: new Date().toISOString() }).eq('id', id)
  if (!admin) query = query.eq('doctor_id', await doctorId())
  const { error } = await query.select('id').single()
  if (error) throw error
}

export const followUpFields = [{name:'next_due',label:'Next due date',type:'date',required:true},{name:'status',label:'Status',options:['on_track','due_soon','overdue']},{name:'notes',label:'Notes'}]
