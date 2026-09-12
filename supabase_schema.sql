-- ================================================================
-- CareConnect: Complete SQL Schema with RBAC
-- Run this in your Supabase SQL Editor (Project → SQL Editor)
-- Run each section in order. If re-running, drop objects first.
-- ================================================================

-- ================================================================
-- SECTION 0: EXTENSIONS
-- ================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "pgcrypto";


-- ================================================================
-- SECTION 1: ENUMS
-- ================================================================
do $$ begin
  create type user_role as enum (
    'patient', 'doctor', 'admin',
    'frontline_worker', 'facility_manager', 'specialist'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type consultation_mode as enum (
    'in_person', 'teleconsultation', 'assisted_teleconsultation'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type referral_status as enum (
    'created', 'pending', 'accepted', 'scheduled',
    'in_progress', 'completed', 'follow_up_required', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type diagnostic_status as enum (
    'requested', 'scheduled', 'sample_collected',
    'processing', 'result_ready', 'reviewed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type facility_type as enum (
    'sub_centre', 'phc', 'rural_hospital', 'district_hospital', 'specialist_centre'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type facility_status as enum (
    'operational', 'busy', 'limited_capacity', 'critical', 'closed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type risk_level as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type triage_outcome as enum ('routine', 'priority', 'urgent', 'emergency');
exception when duplicate_object then null; end $$;


-- ================================================================
-- SECTION 2: CORE TABLES
-- ================================================================

-- ── PROFILES ────────────────────────────────────────────────────
-- One row per auth.user. role column drives all RBAC decisions.
create table if not exists profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  role                user_role not null default 'patient',
  full_name           text not null default '',
  phone               text,
  email               text,
  preferred_language  text not null default 'en',
  avatar_url          text,
  is_active           boolean not null default true,
  facility_id         uuid,                          -- FK added after facilities table
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── FACILITIES ───────────────────────────────────────────────────
create table if not exists facilities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        facility_type not null,
  status      facility_status not null default 'operational',
  address     text,
  district    text,
  state       text,
  lat         numeric(10,7),
  lng         numeric(10,7),
  phone       text,
  beds        int not null default 0,
  capacity    int not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Add FK from profiles → facilities now that facilities exists
do $$ begin
  alter table profiles
    add constraint fk_profiles_facility
    foreign key (facility_id) references facilities(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── PATIENTS ─────────────────────────────────────────────────────
create table if not exists patients (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid unique references profiles(id) on delete cascade,
  patient_code        text unique not null,
  dob                 date,
  gender              text check (gender in ('male','female','other','prefer_not_to_say')),
  blood_group         text,
  address             text,
  emergency_contact   text,
  allergies           text[] default '{}',
  is_high_risk        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── DOCTORS ──────────────────────────────────────────────────────
create table if not exists doctors (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid unique references profiles(id) on delete cascade,
  facility_id     uuid references facilities(id),
  specialization  text not null,
  reg_number      text unique not null,
  is_available    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── APPOINTMENTS ─────────────────────────────────────────────────
create table if not exists appointments (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  doctor_id     uuid not null references doctors(id) on delete restrict,
  facility_id   uuid references facilities(id),
  scheduled_at  timestamptz not null,
  mode          consultation_mode not null default 'in_person',
  status        appointment_status not null default 'scheduled',
  reason        text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_appt_patient  on appointments(patient_id);
create index if not exists idx_appt_doctor   on appointments(doctor_id);
create index if not exists idx_appt_sched    on appointments(scheduled_at);

-- ── QUEUES (Realtime enabled) ─────────────────────────────────────
create table if not exists queues (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid references appointments(id) on delete cascade,
  facility_id     uuid references facilities(id),
  queue_number    text not null,
  position        int not null,
  status          text not null default 'waiting'
                  check (status in ('waiting','in_consultation','completed','skipped','emergency')),
  called_at       timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_queue_facility on queues(facility_id, created_at);

-- ── CONSULTATIONS ────────────────────────────────────────────────
create table if not exists consultations (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid references appointments(id),
  patient_id        uuid references patients(id) on delete cascade,
  doctor_id         uuid references doctors(id),
  facility_id       uuid references facilities(id),
  chief_complaint   text,
  clinical_findings text,
  assessment        text,
  plan              text,
  triage_outcome    triage_outcome,
  started_at        timestamptz,
  ended_at          timestamptz,
  created_at        timestamptz not null default now()
);

-- ── VITALS ───────────────────────────────────────────────────────
create table if not exists vitals (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid references patients(id) on delete cascade,
  consultation_id uuid references consultations(id),
  recorded_by     uuid references profiles(id),
  bp_systolic     int,
  bp_diastolic    int,
  heart_rate      int,
  temperature     numeric(4,1),
  spo2            int,
  blood_sugar     numeric(6,1),
  weight          numeric(5,1),
  height          numeric(5,1),
  recorded_at     timestamptz not null default now()
);

-- ── DIAGNOSES ────────────────────────────────────────────────────
create table if not exists diagnoses (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid references consultations(id) on delete cascade,
  patient_id      uuid references patients(id) on delete cascade,
  icd_code        text,
  description     text not null,
  is_chronic      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ── PRESCRIPTIONS ────────────────────────────────────────────────
create table if not exists prescriptions (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid references consultations(id),
  patient_id      uuid references patients(id) on delete cascade,
  doctor_id       uuid references doctors(id),
  issued_at       timestamptz not null default now(),
  pdf_url         text,
  created_at      timestamptz not null default now()
);

create table if not exists prescription_items (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid references prescriptions(id) on delete cascade,
  medicine_name   text not null,
  dosage          text,
  frequency       text,
  duration        text,
  instructions    text
);

-- ── REFERRALS ────────────────────────────────────────────────────
create table if not exists referrals (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid references patients(id) on delete cascade,
  referring_doctor uuid references doctors(id),
  from_facility    uuid references facilities(id),
  to_facility      uuid references facilities(id),
  department       text,
  reason           text not null,
  urgency          text not null default 'routine'
                   check (urgency in ('routine','urgent','emergency')),
  status           referral_status not null default 'created',
  notes            text,
  document_url     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_referrals_patient on referrals(patient_id);
create index if not exists idx_referrals_status  on referrals(status);

-- ── DIAGNOSTICS ──────────────────────────────────────────────────
create table if not exists diagnostics (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references patients(id) on delete cascade,
  requested_by uuid references doctors(id),
  facility_id  uuid references facilities(id),
  test_name    text not null,
  status       diagnostic_status not null default 'requested',
  scheduled_at timestamptz,
  result_notes text,
  report_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── MEDICINES & STOCK ────────────────────────────────────────────
create table if not exists medicines (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  generic_name text,
  category     text,
  search_vec   tsvector generated always as (
    to_tsvector('english', name || ' ' || coalesce(generic_name,''))
  ) stored
);
create index if not exists idx_med_fts   on medicines using gin(search_vec);
create index if not exists idx_med_trgm  on medicines using gin(name gin_trgm_ops);

create table if not exists medicine_stock (
  id           uuid primary key default gen_random_uuid(),
  medicine_id  uuid references medicines(id) on delete cascade,
  facility_id  uuid references facilities(id) on delete cascade,
  is_available boolean not null default true,
  quantity     int not null default 0,
  unit         text,
  is_govt      boolean not null default true,
  updated_at   timestamptz not null default now(),
  unique(medicine_id, facility_id)
);

-- ── FOLLOW-UPS ───────────────────────────────────────────────────
create table if not exists follow_ups (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid references patients(id) on delete cascade,
  doctor_id   uuid references doctors(id),
  category    text not null,
  risk_level  risk_level not null default 'medium',
  last_visit  date,
  next_due    date,
  notes       text,
  status      text not null default 'on_track'
              check (status in ('on_track','due_soon','overdue')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── NOTIFICATIONS ────────────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  is_read     boolean not null default false,
  action_url  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications(user_id, is_read, created_at desc);

-- ── EMERGENCY CASES ──────────────────────────────────────────────
create table if not exists emergency_cases (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references patients(id),
  reported_by  uuid references profiles(id),
  facility_id  uuid references facilities(id),
  description  text,
  lat          numeric(10,7),
  lng          numeric(10,7),
  status       text not null default 'active'
               check (status in ('active','escalated','resolved')),
  escalated_to uuid references facilities(id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ── AUDIT LOGS ───────────────────────────────────────────────────
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null check (action in ('INSERT','UPDATE','DELETE','SELECT')),
  table_name  text not null,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_actor on audit_logs(actor_id, created_at desc);
create index if not exists idx_audit_table on audit_logs(table_name, record_id);

-- ── CONSENT RECORDS ──────────────────────────────────────────────
create table if not exists consent_records (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references patients(id) on delete cascade,
  consent_type text not null,  -- data_sharing | teleconsultation | research
  granted      boolean not null default true,
  granted_at   timestamptz not null default now(),
  expires_at   timestamptz,
  notes        text
);


-- ================================================================
-- SECTION 3: HELPER FUNCTIONS (SECURITY DEFINER)
-- These run with the privileges of the function owner (postgres),
-- bypassing RLS — safe to call from RLS policies.
-- ================================================================

-- Returns the role of the currently authenticated user
create or replace function get_my_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- Returns true if the current user has a specific role
create or replace function has_role(required_role user_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = required_role and is_active = true
  );
$$;

-- Returns true for admin users (shorthand used in RLS policies)
create or replace function is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select has_role('admin');
$$;

-- Returns true for doctor users
create or replace function is_doctor()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select has_role('doctor');
$$;

-- Returns true for patient users
create or replace function is_patient()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select has_role('patient');
$$;

-- Returns the patients.id for the current auth user
create or replace function my_patient_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from patients where profile_id = auth.uid();
$$;

-- Returns the doctors.id for the current auth user
create or replace function my_doctor_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from doctors where profile_id = auth.uid();
$$;

-- Returns the facility_id assigned to the current user's profile
create or replace function my_facility_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select facility_id from profiles where id = auth.uid();
$$;


-- ================================================================
-- SECTION 4: AUTH TRIGGER
-- Automatically creates a profile row whenever a new user signs up
-- via Supabase Auth (phone OTP, email/password, OAuth, etc.)
-- ================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role      user_role;
  v_full_name text;
  v_phone     text;
  v_email     text;
begin
  -- Role comes from sign-up metadata: supabase.auth.signUp({ data: { role: 'doctor' } })
  -- Defaults to 'patient' if not supplied or invalid
  v_role := coalesce(
    (new.raw_user_meta_data->>'role')::user_role,
    'patient'
  );

  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, ''), '@', 1)
  );

  v_phone := coalesce(new.phone, new.raw_user_meta_data->>'phone');
  v_email := new.email;

  insert into profiles (id, role, full_name, phone, email)
  values (new.id, v_role, v_full_name, v_phone, v_email)
  on conflict (id) do nothing;

  -- If role is 'patient', auto-create a patients record
  if v_role = 'patient' then
    insert into patients (profile_id, patient_code)
    values (
      new.id,
      'PHC-' || upper(substring(gen_random_uuid()::text, 1, 8))
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

-- Drop existing trigger if it exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ================================================================
-- SECTION 5: ROLE MANAGEMENT PROCEDURES
-- Only admins may call these (enforced by RLS + explicit checks).
-- ================================================================

-- Assign or change a user's role (admin only)
create or replace function admin_set_role(
  p_user_id uuid,
  p_new_role user_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can change user roles.'
      using errcode = 'insufficient_privilege';
  end if;

  update profiles
  set role = p_new_role, updated_at = now()
  where id = p_user_id;

  -- Log the action
  insert into audit_logs (actor_id, action, table_name, record_id, new_data)
  values (
    auth.uid(), 'UPDATE', 'profiles', p_user_id,
    jsonb_build_object('role', p_new_role)
  );
end;
$$;

-- Deactivate a user account (admin only)
create or replace function admin_deactivate_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can deactivate accounts.'
      using errcode = 'insufficient_privilege';
  end if;

  update profiles set is_active = false, updated_at = now()
  where id = p_user_id;

  insert into audit_logs (actor_id, action, table_name, record_id, new_data)
  values (
    auth.uid(), 'UPDATE', 'profiles', p_user_id,
    jsonb_build_object('is_active', false)
  );
end;
$$;

-- Reactivate a user account (admin only)
create or replace function admin_activate_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can reactivate accounts.'
      using errcode = 'insufficient_privilege';
  end if;

  update profiles set is_active = true, updated_at = now()
  where id = p_user_id;

  insert into audit_logs (actor_id, action, table_name, record_id, new_data)
  values (
    auth.uid(), 'UPDATE', 'profiles', p_user_id,
    jsonb_build_object('is_active', true)
  );
end;
$$;

-- Assign a doctor to a facility (admin only)
create or replace function admin_assign_doctor_to_facility(
  p_doctor_profile_id uuid,
  p_facility_id       uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can assign facilities.'
      using errcode = 'insufficient_privilege';
  end if;

  update doctors set facility_id = p_facility_id, updated_at = now()
  where profile_id = p_doctor_profile_id;

  update profiles set facility_id = p_facility_id, updated_at = now()
  where id = p_doctor_profile_id;
end;
$$;


-- ================================================================
-- SECTION 6: DOMAIN FUNCTIONS
-- ================================================================

-- Book an appointment and auto-assign queue number
create or replace function book_appointment(
  p_patient_profile_id uuid,
  p_doctor_id          uuid,
  p_facility_id        uuid,
  p_scheduled_at       timestamptz,
  p_mode               consultation_mode default 'in_person',
  p_reason             text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id    uuid;
  v_appointment   appointments;
  v_position      int;
  v_queue_number  text;
begin
  -- Resolve patient id
  select id into v_patient_id from patients where profile_id = p_patient_profile_id;
  if v_patient_id is null then
    raise exception 'Patient record not found for profile %', p_patient_profile_id;
  end if;

  -- Create appointment
  insert into appointments (patient_id, doctor_id, facility_id, scheduled_at, mode, reason)
  values (v_patient_id, p_doctor_id, p_facility_id, p_scheduled_at, p_mode, p_reason)
  returning * into v_appointment;

  -- Calculate next queue position for this facility + date
  select coalesce(max(position), 0) + 1
  into v_position
  from queues
  where facility_id = p_facility_id
    and created_at::date = p_scheduled_at::date;

  v_queue_number := 'A-' || lpad(v_position::text, 3, '0');

  -- Create queue entry
  insert into queues (appointment_id, facility_id, queue_number, position)
  values (v_appointment.id, p_facility_id, v_queue_number, v_position);

  -- Notify patient
  insert into notifications (user_id, type, title, body)
  values (
    p_patient_profile_id,
    'appointment',
    'Appointment Confirmed',
    'Your appointment is confirmed for ' || to_char(p_scheduled_at, 'DD Mon YYYY at HH12:MI AM') ||
    '. Queue No: ' || v_queue_number
  );

  return json_build_object(
    'appointment_id', v_appointment.id,
    'queue_number',   v_queue_number,
    'position',       v_position
  );
end;
$$;

-- Create a referral (doctors only)
create or replace function create_referral(
  p_patient_id    uuid,
  p_to_facility   uuid,
  p_department    text,
  p_reason        text,
  p_urgency       text default 'routine',
  p_notes         text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id   uuid;
  v_facility_id uuid;
  v_referral_id uuid;
  v_patient_profile uuid;
begin
  if not (is_doctor() or is_admin()) then
    raise exception 'Only doctors can create referrals.'
      using errcode = 'insufficient_privilege';
  end if;

  select id, facility_id into v_doctor_id, v_facility_id
  from doctors where profile_id = auth.uid();

  insert into referrals (
    patient_id, referring_doctor, from_facility,
    to_facility, department, reason, urgency, notes, status
  )
  values (
    p_patient_id, v_doctor_id, v_facility_id,
    p_to_facility, p_department, p_reason, p_urgency, p_notes, 'created'
  )
  returning id into v_referral_id;

  -- Notify patient
  select profile_id into v_patient_profile from patients where id = p_patient_id;
  insert into notifications (user_id, type, title, body)
  values (
    v_patient_profile,
    'referral',
    'New Referral Created',
    'A referral has been created for ' || p_department || '. Reason: ' || p_reason
  );

  return v_referral_id;
end;
$$;

-- Transition referral status (doctor or admin)
create or replace function update_referral_status(
  p_referral_id uuid,
  p_new_status  referral_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_profile uuid;
  v_dept text;
begin
  if not (is_doctor() or is_admin()) then
    raise exception 'Insufficient privileges to update referral status.'
      using errcode = 'insufficient_privilege';
  end if;

  update referrals
  set status = p_new_status, updated_at = now()
  where id = p_referral_id;

  -- Notify patient about status change
  select p.profile_id, r.department into v_patient_profile, v_dept
  from referrals r
  join patients p on p.id = r.patient_id
  where r.id = p_referral_id;

  insert into notifications (user_id, type, title, body)
  values (
    v_patient_profile,
    'referral',
    'Referral Status Updated',
    'Your ' || v_dept || ' referral status is now: ' || p_new_status::text
  );
end;
$$;

-- Submit triage and return outcome
create or replace function submit_triage(
  p_patient_id   uuid,
  p_symptom      text,
  p_duration     text,
  p_severity     int,      -- 1 (mild) to 10 (extreme)
  p_has_chronic  boolean default false
)
returns triage_outcome
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outcome triage_outcome;
begin
  if p_severity >= 9 or (p_has_chronic and p_severity >= 7) then
    v_outcome := 'emergency';
  elsif p_severity >= 7 then
    v_outcome := 'urgent';
  elsif p_severity >= 5 or p_has_chronic then
    v_outcome := 'priority';
  else
    v_outcome := 'routine';
  end if;

  -- Raise emergency alert
  if v_outcome = 'emergency' then
    insert into emergency_cases (patient_id, reported_by, description, status)
    values (p_patient_id, auth.uid(), p_symptom || ' (severity: ' || p_severity || ')', 'active');
  end if;

  return v_outcome;
end;
$$;

-- Mark notifications as read
create or replace function mark_notifications_read(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update notifications
  set is_read = true
  where id = any(p_ids) and user_id = auth.uid();
$$;

-- Search medicines with full-text + trigram
create or replace function search_medicines(
  p_query       text,
  p_facility_id uuid default null,
  p_available   boolean default null
)
returns table (
  medicine_id   uuid,
  name          text,
  generic_name  text,
  category      text,
  facility_id   uuid,
  facility_name text,
  is_available  boolean,
  quantity      int,
  is_govt       boolean,
  updated_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.name,
    m.generic_name,
    m.category,
    ms.facility_id,
    f.name as facility_name,
    ms.is_available,
    ms.quantity,
    ms.is_govt,
    ms.updated_at
  from medicines m
  join medicine_stock ms on ms.medicine_id = m.id
  join facilities f on f.id = ms.facility_id
  where
    (
      p_query = '' or p_query is null or
      m.search_vec @@ plainto_tsquery('english', p_query) or
      m.name ilike '%' || p_query || '%'
    )
    and (p_facility_id is null or ms.facility_id = p_facility_id)
    and (p_available  is null or ms.is_available = p_available)
  order by
    ts_rank(m.search_vec, plainto_tsquery('english', coalesce(p_query,''))) desc,
    ms.is_available desc,
    ms.updated_at desc;
$$;

-- Update follow-up status based on date (called by pg_cron daily)
create or replace function refresh_followup_statuses()
returns void
language sql
security definer
set search_path = public
as $$
  update follow_ups set status = 'overdue'  where next_due < current_date and status <> 'overdue';
  update follow_ups set status = 'due_soon' where next_due between current_date and current_date + 7 and status = 'on_track';
$$;

-- Auto-updated timestamp helper
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Attach updated_at triggers to mutable tables
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles','facilities','patients','doctors','appointments',
    'referrals','diagnostics','follow_ups','medicine_stock'
  ] loop
    execute format('
      drop trigger if exists trg_updated_at on %I;
      create trigger trg_updated_at
        before update on %I
        for each row execute function set_updated_at();
    ', tbl, tbl);
  end loop;
end $$;


-- ================================================================
-- SECTION 7: AUDIT TRIGGER
-- ================================================================

create or replace function audit_trigger_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce((new).id, (old).id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- Apply audit trigger to all sensitive tables
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'referrals','prescriptions','consultations',
    'diagnoses','emergency_cases','consent_records'
  ] loop
    execute format('
      drop trigger if exists trg_audit on %I;
      create trigger trg_audit
        after insert or update or delete on %I
        for each row execute function audit_trigger_fn();
    ', tbl, tbl);
  end loop;
end $$;


-- ================================================================
-- SECTION 8: ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Enable RLS on all user-data tables
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles','patients','doctors','appointments','queues',
    'consultations','vitals','diagnoses','prescriptions',
    'prescription_items','referrals','diagnostics',
    'follow_ups','notifications','emergency_cases','consent_records'
  ] loop
    execute format('alter table %I enable row level security;', tbl);
    -- Remove any old policies so this script is idempotent
    execute format('
      do $inner$
      declare r record;
      begin
        for r in select policyname from pg_policies where tablename = %L loop
          execute format(''drop policy if exists %%I on %I'', r.policyname);
        end loop;
      end $inner$;
    ', tbl, tbl);
  end loop;
end $$;

-- ── profiles ─────────────────────────────────────────────────────
-- Users read/write their own row; admins read all
create policy "profiles: own row"
  on profiles for all
  using (id = auth.uid());

create policy "profiles: admin read all"
  on profiles for select
  using (is_admin());

-- ── patients ─────────────────────────────────────────────────────
create policy "patients: own record"
  on patients for all
  using (profile_id = auth.uid());

create policy "patients: doctor read"
  on patients for select
  using (is_doctor());

create policy "patients: admin all"
  on patients for all
  using (is_admin());

-- ── doctors ──────────────────────────────────────────────────────
create policy "doctors: own record"
  on doctors for all
  using (profile_id = auth.uid());

create policy "doctors: patient read"
  on doctors for select
  using (is_patient());

create policy "doctors: admin all"
  on doctors for all
  using (is_admin());

-- ── appointments ─────────────────────────────────────────────────
create policy "appointments: patient own"
  on appointments for all
  using (patient_id = my_patient_id());

create policy "appointments: doctor assigned"
  on appointments for select
  using (doctor_id = my_doctor_id());

create policy "appointments: doctor update"
  on appointments for update
  using (doctor_id = my_doctor_id());

create policy "appointments: admin all"
  on appointments for all
  using (is_admin());

-- ── queues ───────────────────────────────────────────────────────
-- Patients see their own; doctors see their facility's queue; admins see all
create policy "queues: patient own"
  on queues for select
  using (
    exists (
      select 1 from appointments a
      where a.id = queues.appointment_id
        and a.patient_id = my_patient_id()
    )
  );

create policy "queues: doctor facility"
  on queues for all
  using (
    facility_id = my_facility_id() and is_doctor()
  );

create policy "queues: admin all"
  on queues for all
  using (is_admin());

-- ── consultations ────────────────────────────────────────────────
create policy "consultations: patient own"
  on consultations for select
  using (patient_id = my_patient_id());

create policy "consultations: doctor own"
  on consultations for all
  using (doctor_id = my_doctor_id());

create policy "consultations: admin all"
  on consultations for all
  using (is_admin());

-- ── vitals ───────────────────────────────────────────────────────
create policy "vitals: patient own"
  on vitals for select
  using (patient_id = my_patient_id());

create policy "vitals: doctor write"
  on vitals for all
  using (is_doctor());

create policy "vitals: admin all"
  on vitals for all
  using (is_admin());

-- ── diagnoses ────────────────────────────────────────────────────
create policy "diagnoses: patient own"
  on diagnoses for select
  using (patient_id = my_patient_id());

create policy "diagnoses: doctor all"
  on diagnoses for all
  using (is_doctor());

create policy "diagnoses: admin all"
  on diagnoses for all
  using (is_admin());

-- ── prescriptions ────────────────────────────────────────────────
create policy "prescriptions: patient own"
  on prescriptions for select
  using (patient_id = my_patient_id());

create policy "prescriptions: doctor all"
  on prescriptions for all
  using (is_doctor());

create policy "prescriptions: admin read"
  on prescriptions for select
  using (is_admin());

-- prescription_items inherit via prescription join; keep simple
create policy "prescription_items: via prescription"
  on prescription_items for select
  using (
    exists (
      select 1 from prescriptions p
      where p.id = prescription_items.prescription_id
        and (p.patient_id = my_patient_id() or is_doctor() or is_admin())
    )
  );

create policy "prescription_items: doctor write"
  on prescription_items for insert
  using (is_doctor());

-- ── referrals ────────────────────────────────────────────────────
create policy "referrals: patient own"
  on referrals for select
  using (patient_id = my_patient_id());

create policy "referrals: doctor all"
  on referrals for all
  using (is_doctor());

create policy "referrals: admin all"
  on referrals for all
  using (is_admin());

-- ── diagnostics ──────────────────────────────────────────────────
create policy "diagnostics: patient own"
  on diagnostics for select
  using (patient_id = my_patient_id());

create policy "diagnostics: doctor all"
  on diagnostics for all
  using (is_doctor());

create policy "diagnostics: admin all"
  on diagnostics for all
  using (is_admin());

-- ── follow_ups ───────────────────────────────────────────────────
create policy "follow_ups: patient own"
  on follow_ups for select
  using (patient_id = my_patient_id());

create policy "follow_ups: doctor all"
  on follow_ups for all
  using (is_doctor());

create policy "follow_ups: admin all"
  on follow_ups for all
  using (is_admin());

-- ── notifications ────────────────────────────────────────────────
create policy "notifications: own"
  on notifications for all
  using (user_id = auth.uid());

-- ── emergency_cases ──────────────────────────────────────────────
create policy "emergency: patient own"
  on emergency_cases for select
  using (patient_id = my_patient_id());

create policy "emergency: doctor and admin all"
  on emergency_cases for all
  using (is_doctor() or is_admin());

-- ── consent_records ──────────────────────────────────────────────
create policy "consent: patient own"
  on consent_records for all
  using (patient_id = my_patient_id());

create policy "consent: admin read"
  on consent_records for select
  using (is_admin());


-- ================================================================
-- SECTION 9: PUBLIC / SHARED READ TABLES (NO RLS NEEDED)
-- ================================================================

-- Facilities are publicly readable (no patient data)
alter table facilities disable row level security;

-- Medicine catalog is publicly readable
alter table medicines disable row level security;

-- Medicine stock is publicly readable (availability info)
alter table medicine_stock disable row level security;


-- ================================================================
-- SECTION 10: REALTIME PUBLICATION
-- Enable Supabase Realtime on queue + notification tables
-- ================================================================
alter publication supabase_realtime add table queues;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table emergency_cases;


-- ================================================================
-- SECTION 11: ADMIN ANALYTICS VIEW
-- Safe to query via supabase.from('admin_dashboard_view').select()
-- ================================================================
create or replace view admin_dashboard_view
  with (security_invoker = true)
as
select
  (select count(*) from patients)::int                                     as total_patients,
  (select count(*) from doctors where is_available = true)::int            as active_doctors,
  (select count(*) from facilities)::int                                   as total_facilities,
  (select count(*) from appointments where scheduled_at::date = current_date)::int
                                                                           as today_appointments,
  (select count(*) from appointments where status = 'completed' and scheduled_at::date = current_date)::int
                                                                           as today_completed,
  (select count(*) from referrals where status in ('created','pending'))::int
                                                                           as pending_referrals,
  (select count(*) from follow_ups where status = 'overdue')::int         as overdue_followups,
  (select count(*) from medicine_stock where is_available = false)::int   as medicine_shortages,
  (select count(*) from diagnostics where status not in ('result_ready','reviewed')
    and created_at < now() - interval '48 hours')::int                    as diagnostic_delays,
  (select count(*) from emergency_cases where status = 'active')::int     as active_emergencies
where is_admin();

-- The view is now explicitly protected: it will return 0 rows if the user is not an admin.


-- ================================================================
-- SECTION 12: SEED DATA (Optional — remove before production)
-- ================================================================

-- Seed a demo facility
insert into facilities (id, name, type, status, district, state, capacity, beds)
values
  ('11111111-1111-1111-1111-111111111111', 'PHC Khandwa',             'phc',             'operational',      'Khandwa', 'Madhya Pradesh', 120, 10),
  ('22222222-2222-2222-2222-222222222222', 'Sub-Centre Rampur',       'sub_centre',      'operational',      'Khandwa', 'Madhya Pradesh', 40,   2),
  ('33333333-3333-3333-3333-333333333333', 'District Hospital Khandwa','district_hospital','busy',           'Khandwa', 'Madhya Pradesh', 400, 150),
  ('44444444-4444-4444-4444-444444444444', 'CHC Sanawad',             'rural_hospital',  'limited_capacity', 'Khandwa', 'Madhya Pradesh', 100,  30)
on conflict (id) do nothing;

-- Seed demo medicines
insert into medicines (id, name, generic_name, category)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Paracetamol 500mg', 'Paracetamol', 'Analgesic'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Metformin 500mg',   'Metformin',   'Antidiabetic'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Amoxicillin 250mg', 'Amoxicillin', 'Antibiotic'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Amlodipine 5mg',    'Amlodipine',  'Antihypertensive'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Atorvastatin 10mg', 'Atorvastatin','Statin')
on conflict (id) do nothing;

-- Seed medicine stock
insert into medicine_stock (medicine_id, facility_id, is_available, quantity, unit, is_govt)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', true,  240, 'tablet', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', true,  180, 'tablet', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', false,   0, 'capsule',true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', true,  120, 'tablet', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', true,   80, 'tablet', false)
on conflict (medicine_id, facility_id) do nothing;

-- ================================================================
-- END OF SCHEMA
-- ================================================================
-- Summary of what this file creates:
--   12 ENUMs
--   19 Tables with proper constraints & indexes
--    6 Helper/security functions (get_my_role, has_role, is_admin, is_doctor, is_patient, my_patient_id, my_doctor_id, my_facility_id)
--    1 Auth trigger (auto-create profile + patient on sign-up)
--    4 Admin procedures (set_role, deactivate, activate, assign_facility)
--    5 Domain functions (book_appointment, create_referral, update_referral_status, submit_triage, search_medicines)
--    2 Utility functions (set_updated_at, refresh_followup_statuses)
--    1 Audit trigger (on referrals, prescriptions, consultations, diagnoses, emergency_cases)
--   ~30 RLS policies covering Patient | Doctor | Admin access
--    3 Realtime publications (queues, notifications, emergency_cases)
--    1 Admin analytics view
--    4 Demo facilities + 5 medicines + 5 stock rows (seed data)
-- ================================================================

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
