-- Apply after add-events.sql (or after schema.sql for a new database).
begin;
create table if not exists public.event_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.event_admins enable row level security;
revoke all on public.event_admins from anon, authenticated;
grant select on public.event_admins to authenticated;
drop policy if exists "Admins can see their membership" on public.event_admins;
create policy "Admins can see their membership" on public.event_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Event changes are exposed only through the checked function below.
revoke insert, update, delete on public.fellowship_events from anon, authenticated;
create or replace function public.save_fellowship_event(
  p_id uuid, p_title text, p_date date, p_current boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.event_admins where user_id = auth.uid()
  ) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 100
     or p_date is null or p_current is null then
    raise exception 'Provide an event title and date' using errcode = '22023';
  end if;
  -- Serialise switches so two organisers cannot produce two current events.
  perform pg_catalog.pg_advisory_xact_lock(83628491);
  if p_id is not null and not exists (select 1 from public.fellowship_events where id = p_id) then
    raise exception 'Event no longer exists' using errcode = '22023';
  end if;
  if p_current then
    update public.fellowship_events set is_current = false where is_current;
  end if;
  if p_id is null then
    insert into public.fellowship_events (title, event_date, is_current)
      values (btrim(p_title), p_date, p_current) returning id into result_id;
  else
    update public.fellowship_events set title = btrim(p_title), event_date = p_date, is_current = p_current
      where id = p_id returning id into result_id;
  end if;
  return result_id;
end;
$$;
revoke all on function public.save_fellowship_event(uuid, text, date, boolean) from public, anon, authenticated;
grant execute on function public.save_fellowship_event(uuid, text, date, boolean) to authenticated;
notify pgrst, 'reload schema';
commit;

-- Add an organiser using their ID from Authentication > Users:
-- insert into public.event_admins (user_id) values ('USER_UUID_HERE');
-- Remove access by deleting their row in event_admins from the dashboard.
