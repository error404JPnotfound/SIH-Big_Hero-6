import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
process.loadEnvFile('.env')
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {auth:{persistSession:false,autoRefreshToken:false}})
const { error } = await client.auth.signInWithPassword({email:process.env.CHECK_EMAIL,password:process.env.CHECK_PASSWORD})
if (error) throw error
try {
  globalThis.checkClient = client
  const source = (await readFile('src/lib/adminLive.js','utf8')).replace("import { supabase } from './supabase'", 'const supabase = globalThis.checkClient')
  const live = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
  for (const name of ['patients','referrals','stock','dashboard','quality','weekly']) {
    try { const result = await live[name](); console.log(name, JSON.stringify(Array.isArray(result) ? {rows:result.length} : result)) }
    catch (err) { console.error(name, err.message); process.exitCode=1 }
  }
  for (const table of ['prescriptions','prescription_items','follow_ups']) {
    const result = await client.from(table).select('id',{count:'exact',head:true})
    console.log(table, result.error?.message || {count:result.count})
    if (result.error) process.exitCode=1
  }
} finally { await client.auth.signOut() }
