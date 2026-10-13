-- Run as the SQL Editor's postgres role after add-event-admins.sql.
-- All test changes, including current-event changes, are rolled back.
begin;
do $$
declare
  test_admin uuid := gen_random_uuid();
  first_event uuid;
  second_event uuid;
begin
  if has_table_privilege('anon', 'public.fellowship_events', 'INSERT')
     or has_table_privilege('authenticated', 'public.fellowship_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.event_admins', 'INSERT')
     or has_function_privilege('anon', 'public.save_fellowship_event(uuid,text,date,boolean)', 'EXECUTE') then
    raise exception 'Public event or membership write privileges are too broad';
  end if;
  if not has_function_privilege('authenticated', 'public.save_fellowship_event(uuid,text,date,boolean)', 'EXECUTE') then
    raise exception 'Authenticated organisers cannot call the event function';
  end if;

  insert into auth.users (id, email) values (test_admin, test_admin::text || '@example.invalid');
  perform set_config('request.jwt.claim.sub', test_admin::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', test_admin)::text, true);
  -- A signed-in account without membership must be rejected.
  begin
    perform public.save_fellowship_event(null, 'Denied test', current_date, false);
    raise exception 'Non-admin was allowed to write an event';
  exception when insufficient_privilege then null;
  end;

  insert into public.event_admins (user_id) values (test_admin);
  first_event := public.save_fellowship_event(null, 'First test gathering', current_date, true);
  second_event := public.save_fellowship_event(null, 'Second test gathering', current_date, true);
  if (select count(*) from public.fellowship_events where is_current) <> 1
     or not (select is_current from public.fellowship_events where id = second_event)
     or (select is_current from public.fellowship_events where id = first_event) then
    raise exception 'Switching the current event did not preserve exactly one current event';
  end if;
  perform public.save_fellowship_event(first_event, 'Edited gathering', current_date, false);
  if (select title from public.fellowship_events where id = first_event) <> 'Edited gathering' then
    raise exception 'Event edit failed';
  end if;
  begin
    perform public.save_fellowship_event(null, '   ', current_date, true);
    raise exception 'Blank event title was accepted';
  exception when invalid_parameter_value then null;
  end;
  delete from public.event_admins where user_id = test_admin;
  begin
    perform public.save_fellowship_event(first_event, 'Revoked test', current_date, true);
    raise exception 'Revoked admin was allowed to write an event';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform public.save_fellowship_event(null, 'Anonymous test', current_date, false);
    raise exception 'Unauthenticated caller was allowed to write an event';
  exception when insufficient_privilege then null;
  end;
  raise notice 'Event admin permission, validation, switching, editing and revocation checks passed.';
end;
$$;
rollback;
