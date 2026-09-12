-- Transactional integration test: all test writes are rolled back, including alerts.
begin;
do $$
declare
  v_doctor_profile uuid;
  v_patient uuid;
  v_patient_profile uuid;
  v_rx public.prescriptions;
  v_before bigint;
begin
  select d.profile_id,a.patient_id,p.profile_id into v_doctor_profile,v_patient,v_patient_profile
    from public.appointments a join public.doctors d on d.id=a.doctor_id
    join public.profiles dp on dp.id=d.profile_id join public.patients p on p.id=a.patient_id
    where d.account_status='approved' and dp.is_active and p.profile_id is not null limit 1;
  if v_doctor_profile is null then raise exception 'No approved doctor/patient appointment available for verification.'; end if;
  perform set_config('request.jwt.claim.sub',v_doctor_profile::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',v_doctor_profile,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select * into v_rx from public.issue_prescription(v_patient,null,
    '[{"medicine_name":"INTEGRATION TEST - NOT FOR CLINICAL USE","dosage":"test","frequency":"test","duration":"test"}]'::jsonb);
  execute 'reset role';
  if (select count(*) from public.prescription_items where prescription_id=v_rx.id)<>1 then raise exception 'Prescription items not saved.'; end if;
  if (select count(*) from public.notifications where user_id=v_patient_profile and action_url='/patient/diagnostics?prescription='||v_rx.id::text)<>1 then raise exception 'Patient notification missing or duplicated.'; end if;
  select count(*) into v_before from public.prescriptions;
  begin
    perform public.issue_prescription(v_patient,null,'[{"medicine_name":"invalid"}]'::jsonb);
    raise exception 'Expected validation failure.';
  exception when others then
    if sqlerrm='Expected validation failure.' then raise; end if;
  end;
  if (select count(*) from public.prescriptions)<>v_before then raise exception 'Validation left an orphan prescription.'; end if;
  perform set_config('request.jwt.claim.sub',v_patient_profile::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',v_patient_profile,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not exists(select 1 from public.prescriptions where id=v_rx.id) then raise exception 'Patient cannot read their prescription.'; end if;
  if not exists(select 1 from public.prescription_items where prescription_id=v_rx.id) then raise exception 'Patient cannot read their medicines.'; end if;
  if exists(select 1 from public.notifications where user_id<>v_patient_profile) then raise exception 'Notification isolation failed.'; end if;
  update public.notifications set is_read=true where action_url='/patient/diagnostics?prescription='||v_rx.id::text;
  if not exists(select 1 from public.notifications where action_url='/patient/diagnostics?prescription='||v_rx.id::text and is_read) then raise exception 'Read state did not persist.'; end if;
  begin
    perform public.issue_prescription(v_patient,null,'[]'::jsonb);
    raise exception 'Patient was allowed to prescribe.';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
end $$;
select 'PASS: prescription, items, notification, patient read access, read state, validation and role isolation' as result;
rollback;
