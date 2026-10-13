-- Existing projects: run this in Supabase SQL Editor before deploying the app update.
-- Existing prayers keep a NULL name and display as Anonymous.
begin;

alter table public.prayer_requests
  add column if not exists name varchar(80)
  check (name is null or char_length(btrim(name)) > 0);

grant insert (name) on public.prayer_requests to anon, authenticated;

commit;
