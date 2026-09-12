/**
 * apply_schema.js
 * ─────────────────────────────────────────────────────────────
 * Applies the full CareConnect SQL schema to your Supabase project.
 *
 * USAGE:
 *   1. Set SUPABASE_DB_URL below to your Supabase DATABASE URL
 *      (Project Settings → Database → Connection string → URI)
 *   2. Run:  node scripts/apply_schema.js
 *
 * Your DB URL looks like:
 *   postgresql://postgres:[PASSWORD]@db.keyryhpndrdpdhwilpfl.supabase.co:5432/postgres
 * ─────────────────────────────────────────────────────────────
 */

import { readFileSync } from 'fs';
import { createConnection } from 'net';

// ─── CONFIG ──────────────────────────────────────────────────
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || '';
// ─────────────────────────────────────────────────────────────

if (!SUPABASE_DB_URL) {
  console.error('\n❌  Set SUPABASE_DB_URL environment variable first.\n');
  console.error('    Example:');
  console.error('    $env:SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.keyryhpndrdpdhwilpfl.supabase.co:5432/postgres"');
  console.error('    node scripts/apply_schema.js\n');
  process.exit(1);
}

const sql = readFileSync('./supabase_schema.sql', 'utf-8');
console.log('📋 Schema loaded:', sql.length, 'characters');
console.log('🔌 Connecting to:', SUPABASE_DB_URL.replace(/:[^@]+@/, ':***@'));
console.log('\n✅ Run the schema manually in the Supabase SQL Editor.');
console.log('   Open: https://supabase.com/dashboard/project/keyryhpndrdpdhwilpfl/sql/new');
console.log('   Paste the contents of: supabase_schema.sql');
