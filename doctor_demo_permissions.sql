-- Run in Supabase SQL Editor, then rerun the local seed script.
-- Grants only the server role access; does not disable RLS.
begin;
grant usage on schema public to service_role;
grant select, insert, update on table
  public.facilities, public.profiles, public.doctors, public.patients,
  public.appointments, public.queues, public.consultations, public.vitals,
  public.diagnoses, public.prescriptions, public.prescription_items,
  public.referrals, public.diagnostics, public.follow_ups
to service_role;

grant select on table
  public.facilities, public.medicines, public.medicine_stock
to anon, authenticated;

grant select, insert, update on table
  public.profiles, public.patients, public.doctors, public.appointments,
  public.queues, public.consultations, public.vitals, public.diagnoses,
  public.prescriptions, public.prescription_items, public.referrals,
  public.diagnostics, public.follow_ups, public.notifications,
  public.emergency_cases, public.consent_records
to authenticated;
commit;
