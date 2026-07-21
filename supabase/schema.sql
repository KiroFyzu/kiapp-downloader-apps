-- =============================================================
-- Social Media Downloader — Supabase schema
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
-- =============================================================

-- 1. Tabel downloads (riwayat unduhan)
create table if not exists public.downloads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  url         text not null,
  platform    text not null, -- tiktok, instagram, facebook, dll
  title       text default '',
  thumbnail   text default '',
  media       jsonb default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists downloads_user_id_idx     on public.downloads (user_id);
create index if not exists downloads_platform_idx    on public.downloads (platform);
create index if not exists downloads_created_at_idx  on public.downloads (created_at desc);

-- 3. Tabel api_keys (API key per user) — HARUS sebelum function handle_new_user
create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  api_key     text not null unique,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);
create index if not exists api_keys_api_key_idx on public.api_keys (api_key);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own"
  on public.api_keys for select
  using (auth.uid() = user_id);

drop policy if exists "api_keys_insert_own" on public.api_keys;
create policy "api_keys_insert_own"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

drop policy if exists "api_keys_delete_own" on public.api_keys;
create policy "api_keys_delete_own"
  on public.api_keys for delete
  using (auth.uid() = user_id);

-- 2. Tabel profiles (profil user)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =============================================================
-- Row Level Security
-- =============================================================

alter table public.downloads  enable row level security;
alter table public.profiles   enable row level security;

-- downloads: user hanya bisa baca/tulis miliknya sendiri
drop policy if exists "downloads_select_own" on public.downloads;
create policy "downloads_select_own"
  on public.downloads for select
  using (auth.uid() = user_id);

drop policy if exists "downloads_insert_own" on public.downloads;
create policy "downloads_insert_own"
  on public.downloads for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "downloads_delete_own" on public.downloads;
create policy "downloads_delete_own"
  on public.downloads for delete
  using (auth.uid() = user_id);

-- profiles: user hanya bisa baca/tulis profilnya sendiri
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: auto-create profile + api_key saat user baru sign up
-- NOTE: Function ini HARUS dibuat setelah tabel api_keys & profiles sudah ada
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Auto-generate API key untuk user baru
  insert into public.api_keys (user_id, api_key)
  values (
    new.id,
    'sdm_' || encode(sha256((new.id::text || '-' || gen_random_uuid()::text)::bytea), 'hex')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Catatan: service role key (yang dipakai backend) bypass RLS,
-- jadi backend bisa mengelola history lintas user jika diperlukan.
