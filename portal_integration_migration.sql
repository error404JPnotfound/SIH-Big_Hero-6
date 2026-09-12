-- Apply once in Supabase SQL Editor. Additive migration; no records are deleted.
begin;

create or replace function public.issue_prescription(p_patient_id uuid, p_consultation_id uuid, p_items jsonb)
returns public.prescriptions
language plpgsql security definer set search_path = public
as $$
declare
  v_doctor uuid;
  v_patient_profile uuid;
  v_prescription public.prescriptions;
begin
  select d.id into v_doctor from public.doctors d
    join public.profiles p on p.id = d.profile_id
    where d.profile_id = auth.uid() and d.account_status = 'approved'
      and p.is_active and p.role = 'doctor';
  if v_doctor is null then raise exception 'An approved doctor account is required.' using errcode = '42501'; end if;
  if p_patient_id is null or not exists (
    select 1 from public.appointments a where a.patient_id = p_patient_id and a.doctor_id = v_doctor
    union all
    select 1 from public.consultations c where c.patient_id = p_patient_id and c.doctor_id = v_doctor
  ) then raise exception 'This patient is not assigned to you.' using errcode = '42501'; end if;
  if p_consultation_id is not null and not exists (
    select 1 from public.consultations where id = p_consultation_id and doctor_id = v_doctor and patient_id = p_patient_id
  ) then raise exception 'Consultation does not match this doctor and patient.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Medicine items must be an array.'; end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then raise exception 'Enter between 1 and 100 medicines.'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where jsonb_typeof(item) <> 'object' or exists (
      select 1 from unnest(array['medicine_name','dosage','frequency','duration']) k
      where nullif(btrim(item->>k), '') is null
    )
  ) then raise exception 'Every medicine requires a name, dosage, frequency and duration.'; end if;
  insert into public.prescriptions(patient_id, doctor_id, consultation_id)
    values(p_patient_id, v_doctor, p_consultation_id) returning * into v_prescription;
  insert into public.prescription_items(prescription_id, medicine_name, dosage, frequency, duration, instructions)
    select v_prescription.id, btrim(item->>'medicine_name'), btrim(item->>'dosage'),
      btrim(item->>'frequency'), btrim(item->>'duration'), nullif(btrim(item->>'instructions'), '')
    from jsonb_array_elements(p_items) item;
  select profile_id into v_patient_profile from public.patients where id = p_patient_id;
  if v_patient_profile is not null then
    insert into public.notifications(user_id, type, title, body, action_url)
      values(v_patient_profile, 'prescription', 'New prescription',
        'Your doctor has issued a prescription. Open it to view the medicines and instructions.',
        '/patient/diagnostics?prescription=' || v_prescription.id::text);
  end if;
  return v_prescription;
end;
$$;
revoke all on function public.issue_prescription(uuid,uuid,jsonb) from public, anon;
grant execute on function public.issue_prescription(uuid,uuid,jsonb) to authenticated;

-- Generate notifications in the same transaction as the clinical change.
create or replace function public.notify_portal_event()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_profile uuid;
  v_title text;
  v_body text;
  v_link text;
  v_type text;
begin
  if tg_table_name = 'diagnostics' then
    if tg_op = 'UPDATE' and new.status is not distinct from old.status
      and new.result_notes is not distinct from old.result_notes and new.report_url is not distinct from old.report_url then return new; end if;
    select profile_id into v_profile from public.patients where id = new.patient_id;
    v_type := 'diagnostic'; v_link := '/patient/diagnostics';
    v_title := case when new.status::text in ('result_ready','reviewed') then 'Diagnostic result available' else 'Diagnostic request updated' end;
    v_body := 'Your diagnostic record has been updated. Open Diagnostics for the current status and any results.';
  elsif tg_table_name = 'follow_ups' then
    if tg_op = 'UPDATE' and new.next_due is not distinct from old.next_due and new.status is not distinct from old.status then return new; end if;
    select profile_id into v_profile from public.patients where id = new.patient_id;
    v_type := 'follow_up'; v_link := '/patient/appointments'; v_title := 'Follow-up updated';
    v_body := 'Your doctor has updated your follow-up. Next due: ' || coalesce(new.next_due::text, 'not yet scheduled') || '.';
  elsif tg_table_name = 'queues' then
    if new.status is not distinct from old.status or new.status::text not in ('called','in_consultation','completed','skipped') then return new; end if;
    select p.profile_id into v_profile from public.appointments a join public.patients p on p.id = a.patient_id where a.id = new.appointment_id;
    v_type := 'queue'; v_link := '/patient/queue'; v_title := 'Queue status updated';
    v_body := 'Your queue status is now ' || replace(new.status::text, '_', ' ') || '.';
  elsif tg_table_name = 'appointments' then
    if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
    select profile_id into v_profile from public.doctors where id = new.doctor_id;
    v_type := 'appointment'; v_link := '/doctor/queue'; v_title := 'Appointment updated';
    v_body := 'An appointment assigned to you has been updated. Open your queue for details.';
  end if;
  if v_profile is not null then
    insert into public.notifications(user_id, type, title, body, action_url)
      values(v_profile, v_type, v_title, v_body, v_link);
  end if;
  return new;
end;
$$;
revoke all on function public.notify_portal_event() from public, anon, authenticated;
drop trigger if exists portal_diagnostic_notification on public.diagnostics;
create trigger portal_diagnostic_notification after insert or update on public.diagnostics for each row execute function public.notify_portal_event();
drop trigger if exists portal_follow_up_notification on public.follow_ups;
create trigger portal_follow_up_notification after insert or update on public.follow_ups for each row execute function public.notify_portal_event();
drop trigger if exists portal_queue_notification on public.queues;
create trigger portal_queue_notification after update on public.queues for each row execute function public.notify_portal_event();
drop trigger if exists portal_appointment_notification on public.appointments;
create trigger portal_appointment_notification after insert or update on public.appointments for each row execute function public.notify_portal_event();

alter table public.notifications enable row level security;
drop policy if exists "notifications: own" on public.notifications;
drop policy if exists "portal notifications read own" on public.notifications;
create policy "portal notifications read own" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "portal notifications update own" on public.notifications;
create policy "portal notifications update own" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "portal notifications delete own" on public.notifications;
create policy "portal notifications delete own" on public.notifications for delete to authenticated using (user_id = auth.uid());
revoke all on public.notifications from anon;
revoke insert, update on public.notifications from authenticated;
grant select, delete on public.notifications to authenticated;
grant update(is_read) on public.notifications to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then alter publication supabase_realtime add table public.notifications; end if;
end $$;
notify pgrst, 'reload schema';
commit;
