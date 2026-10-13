-- Run in the Supabase SQL Editor for an existing prayer_requests table.
-- Existing prayers remain anonymous; no stored messages are changed.
alter table public.prayer_requests
  add column if not exists name text
  check (name is null or char_length(btrim(name)) between 1 and 60);

grant insert (message, name) on public.prayer_requests to anon, authenticated;
notify pgrst, 'reload schema';
