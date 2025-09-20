-- Tabelas básicas
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  banner_url text,
  role text default 'user',
  created_at timestamp with time zone default now()
);
alter table profiles enable row level security;
