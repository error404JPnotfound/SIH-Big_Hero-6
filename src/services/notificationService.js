import { supabase } from '../lib/supabase'
async function currentUser(userId) {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user || (userId && userId !== data.user.id)) throw new Error('Sign in to view your notifications.')
  return data.user.id
}
export const notificationService = {
  async getNotifications(userId) {
    const id = await currentUser(userId)
    const { data, error } = await supabase.from('notifications').select('id,type,title,body,is_read,action_url,created_at')
      .eq('user_id', id).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return data.map(n => ({ ...n, message: n.body, unread: !n.is_read,
      link: n.action_url || ({ prescription: '/patient/diagnostics', diagnostic: '/patient/diagnostics', appointment: '/patient/appointments', referral: '/patient/appointments?tab=referrals', queue: '/patient/queue' })[n.type],
      time: new Date(n.created_at).toLocaleString('en-IN') }))
  },
  async markAsRead(id, userId) { return this.update(userId, [id], false) },
  async markAllAsRead(userId) { return this.update(userId, null, false) },
  async deleteNotification(id, userId) { return this.update(userId, [id], true) },
  async clearAll(userId) { return this.update(userId, null, true) },
  async update(userId, ids, remove) {
    const id = await currentUser(userId)
    let query = remove ? supabase.from('notifications').delete() : supabase.from('notifications').update({ is_read: true })
    query = query.eq('user_id', id)
    if (ids) query = query.in('id', ids)
    const { error } = await query
    if (error) throw error
  },
}
