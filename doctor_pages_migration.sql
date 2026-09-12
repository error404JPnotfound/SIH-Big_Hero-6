-- Run once in the Supabase SQL Editor for an existing database.
-- Allow doctors to read profiles of patients assigned to their appointments.
begin;
drop policy if exists "profiles: assigned doctor read" on public.profiles;
create policy "profiles: assigned doctor read"
  on public.profiles for select to authenticated
  using (
    public.is_doctor() and exists (
      select 1 from public.patients p
      join public.appointments a on a.patient_id = p.id
      join public.doctors d on d.id = a.doctor_id
      where p.profile_id = profiles.id and d.profile_id = auth.uid()
    )
  );
commit;
