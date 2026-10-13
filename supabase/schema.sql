-- Run once in the SQL Editor for a new Supabase project.
create table public.fellowship_events (
  id uuid primary key default gen_random_uuid(),
  title varchar(100) not null check (char_length(btrim(title)) > 0),
  event_date date not null,
  is_current boolean not null default false
);
create unique index fellowship_events_one_current on public.fellowship_events (is_current) where is_current;
alter table public.fellowship_events enable row level security;
revoke all on public.fellowship_events from anon, authenticated;
grant select on public.fellowship_events to anon, authenticated;
create policy "Anyone can read events" on public.fellowship_events for select to anon, authenticated using (true);

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  name varchar(80) check (name is null or char_length(btrim(name)) > 0),
  event_id uuid references public.fellowship_events(id),
  event_name text,
  created_at timestamptz not null default now()
);
alter table public.prayer_requests enable row level security;
revoke all on public.prayer_requests from anon, authenticated;
grant select on public.prayer_requests to anon, authenticated;
grant insert (message, name, event_id, event_name) on public.prayer_requests to anon, authenticated;
create index prayer_requests_event_date on public.prayer_requests (event_id, created_at desc);
create policy "Anyone can read prayers"
on public.prayer_requests for select to anon, authenticated using (true);
create policy "Anyone can submit a prayer"
on public.prayer_requests for insert to anon, authenticated
with check (char_length(btrim(message)) between 1 and 1000
  and (event_id is null or exists (select 1 from public.fellowship_events e where e.id = event_id and e.is_current)));
-- Visitors cannot update or delete requests. Administrators can use the dashboard.
