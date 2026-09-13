-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: Allow patients to read doctor profiles
-- Problem:   profiles RLS only allows "own row" or admin reads.
--            When a patient queries doctors with embedded profiles join, the
--            profiles join returns NULL -> doctor names appear as "Dr. Unknown".
-- Fix:       Add a policy letting any authenticated patient read profiles of
--            rows that belong to an approved doctor.
-- ──────────────────────────────────────────────────────────────────────────────

-- Drop if already exists (idempotent)
drop policy if exists "profiles: patient read doctor profiles" on public.profiles;

-- Allow patients to read the profile of any approved doctor
create policy "profiles: patient read doctor profiles"
  on public.profiles for select
  to authenticated
  using (
    -- The profile being read must belong to an approved doctor
    exists (
      select 1 from public.doctors d
      where d.profile_id = profiles.id
        and d.account_status = 'approved'
    )
  );
