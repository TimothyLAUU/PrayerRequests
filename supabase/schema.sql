-- Run once in the SQL Editor for a new Supabase project.
create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  name text check (name is null or char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
alter table public.prayer_requests enable row level security;
revoke all on public.prayer_requests from anon, authenticated;
grant select on public.prayer_requests to anon, authenticated;
grant insert (message, name) on public.prayer_requests to anon, authenticated;
create policy "Anyone can read prayers"
on public.prayer_requests for select to anon, authenticated using (true);
create policy "Anyone can submit a prayer"
on public.prayer_requests for insert to anon, authenticated
with check (char_length(btrim(message)) between 1 and 1000);
-- Visitors cannot update or delete requests. Administrators can use the dashboard.
