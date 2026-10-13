-- Apply after add-events.sql. Safe if event_name was already added manually.
begin;
alter table public.prayer_requests add column if not exists event_name text;
grant insert (event_name) on public.prayer_requests to anon, authenticated;

-- Derive the stored name from the linked event, overriding stale client text.
create or replace function public.set_prayer_event_name()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.event_id is null then
    new.event_name := null;
  else
    select e.title into new.event_name from public.fellowship_events e where e.id = new.event_id;
  end if;
  return new;
end;
$$;
revoke all on function public.set_prayer_event_name() from public, anon, authenticated;
drop trigger if exists prayer_event_name on public.prayer_requests;
create trigger prayer_event_name before insert or update of event_id, event_name
  on public.prayer_requests for each row execute function public.set_prayer_event_name();

-- Fill existing linked prayers. Unassigned prayers retain their existing text.
update public.prayer_requests p set event_name = e.title
  from public.fellowship_events e
  where p.event_id = e.id and (p.event_name is null or btrim(p.event_name) = '');
notify pgrst, 'reload schema';
commit;
