-- ================================================================
-- CareConnect: Doctor self-registration with admin approval
-- Run this in Supabase SQL Editor before testing doctor registration.
-- Uses the existing doctors table; no separate registration table is created.
-- ================================================================

alter table doctors
  add column if not exists gender text,
  add column if not exists qualification text,
  add column if not exists experience_years int,
  add column if not exists department text,
  add column if not exists designation text,
  add column if not exists available_days text[] not null default '{}',
  add column if not exists working_hours text,
  add column if not exists consultation_type text not null default 'in_person',
  add column if not exists emergency_duty boolean not null default false,
  add column if not exists account_status text not null default 'pending',
  add column if not exists rejection_reason text;

update doctors
set
  qualification = coalesce(nullif(trim(qualification), ''), 'MBBS'),
  experience_years = coalesce(experience_years, 0),
  department = coalesce(nullif(trim(department), ''), specialization),
  designation = coalesce(nullif(trim(designation), ''), 'Doctor'),
  account_status = case
    when account_status in ('approved', 'rejected') then account_status
    else 'approved'
  end
where
  qualification is null
  or experience_years is null
  or department is null
  or designation is null;

alter table doctors
  drop constraint if exists doctors_account_status_check;
alter table doctors
  add constraint doctors_account_status_check
  check (account_status in ('pending', 'approved', 'rejected'));

alter table doctors
  drop constraint if exists doctors_required_registration_fields;
alter table doctors
  add constraint doctors_required_registration_fields
  check (
    length(trim(coalesce(specialization, ''))) > 0
    and length(trim(coalesce(reg_number, ''))) > 0
    and length(trim(coalesce(qualification, ''))) > 0
    and experience_years is not null
    and experience_years >= 0
    and length(trim(coalesce(department, ''))) > 0
    and length(trim(coalesce(designation, ''))) > 0
    and facility_id is not null
  );

create unique index if not exists doctors_reg_number_unique_idx
  on doctors (lower(reg_number));

create unique index if not exists profiles_email_unique_idx
  on profiles (lower(email))
  where email is not null;

drop policy if exists "profiles: admin update doctor status" on profiles;
create policy "profiles: admin update doctor status"
  on profiles for update
  using (is_admin())
  with check (is_admin());

drop view if exists admin_doctors_view;
create view admin_doctors_view
  with (security_invoker = true)
as
select
  d.id,
  d.profile_id,
  coalesce(p.full_name, 'Doctor ' || d.reg_number) as name,
  p.email,
  p.phone,
  d.specialization,
  d.gender,
  d.qualification,
  d.experience_years,
  d.department,
  d.designation,
  f.name as facility,
  d.facility_id,
  d.reg_number,
  d.available_days,
  d.working_hours,
  d.consultation_type,
  d.emergency_duty,
  d.account_status,
  d.rejection_reason,
  d.created_at,
  case
    when d.account_status = 'pending' then 'Pending'
    when d.account_status = 'rejected' then 'Rejected'
    when d.is_available then 'Active'
    else 'On Leave'
  end as status
from doctors d
left join facilities f on f.id = d.facility_id
left join profiles p on p.id = d.profile_id;

grant select on admin_doctors_view to authenticated;
grant select on admin_doctors_view to anon;
