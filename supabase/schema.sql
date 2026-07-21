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

-- 2. Tabel profiles (profil user)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger: auto-create profile saat user baru sign up
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

-- Catatan: service role key (yang dipakai backend) bypass RLS,
-- jadi backend bisa mengelola history lintas user jika diperlukan.
