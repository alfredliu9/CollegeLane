-- CollegeLane — Supabase schema.
-- Run once in the Supabase dashboard → SQL Editor → New query → paste → Run.
-- Application data is keyed by the Supabase Auth user id (auth.users.id).

-- Account-scoped key/value store. Holds the athlete profile, saved schools,
-- plan progress, outreach records, notes, and assistant chat as JSON strings.
create table if not exists public.user_state (
  user_id    uuid not null references auth.users(id) on delete cascade,
  state_key  text not null,
  value_json text not null,
  updated_at bigint not null,
  primary key (user_id, state_key)
);

-- Verified coach cache (per school, refreshed every ~30 days by the coach lookup).
create table if not exists public.coaches (
  id          text primary key,
  school_id   text not null,
  name        text not null,
  role        text not null,
  email       text not null default '',
  source_url  text not null,
  verified_at bigint not null
);
create index if not exists coaches_school_id_idx on public.coaches (school_id);

-- Metadata for athlete uploads (the files live in Supabase Storage).
create table if not exists public.user_uploads (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null,
  filename     text not null,
  content_type text not null,
  size         bigint not null,
  object_key   text not null,
  created_at   bigint not null
);
create index if not exists user_uploads_user_id_idx on public.user_uploads (user_id);

-- The app reaches these tables only through the server-side service-role key,
-- which bypasses RLS. Enabling RLS with no policies denies all anon/public
-- access, so a leaked publishable/anon key still cannot read user data.
alter table public.user_state   enable row level security;
alter table public.coaches      enable row level security;
alter table public.user_uploads enable row level security;
