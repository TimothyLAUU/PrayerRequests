-- Run once in the SQL Editor for an existing database, after add-name.sql.
begin;
create table if not exists public.fellowship_events (
  id uuid primary key default gen_random_uuid(),
  title varchar(100) not null check (char_length(btrim(title)) > 0),
  event_date date not null,
  is_current boolean not null default false
);
create unique index if not exists fellowship_events_one_current
  on public.fellowship_events (is_current) where is_current;
alter table public.fellowship_events enable row level security;
revoke all on public.fellowship_events from anon, authenticated;
grant select on public.fellowship_events to anon, authenticated;
drop policy if exists "Anyone can read events" on public.fellowship_events;
create policy "Anyone can read events" on public.fellowship_events
  for select to anon, authenticated using (true);

alter table public.prayer_requests add column if not exists event_id uuid references public.fellowship_events(id);
create index if not exists prayer_requests_event_date on public.prayer_requests (event_id, created_at desc);
grant insert (message, name, event_id) on public.prayer_requests to anon, authenticated;
drop policy if exists "Anyone can submit a prayer" on public.prayer_requests;
create policy "Anyone can submit a prayer" on public.prayer_requests
  for insert to anon, authenticated
  with check (char_length(btrim(message)) between 1 and 1000
    and (event_id is null or exists (select 1 from public.fellowship_events e where e.id = event_id and e.is_current)));
notify pgrst, 'reload schema';
commit;

-- Existing prayers keep a null event_id and appear under Earlier prayers.
-- Organisers manage events in the Supabase Table Editor or SQL Editor.
