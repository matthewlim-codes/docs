create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text not null default '',
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_.]{3,30}$'),
  constraint profiles_username_lowercase check (username = lower(username)),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 80),
  constraint profiles_bio_length check (char_length(bio) <= 280)
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable when public or owned" on public.profiles;
create policy "Profiles are readable when public or owned"
  on public.profiles
  for select
  using (is_private = false or auth.uid() = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles
  for delete
  using (auth.uid() = id);
