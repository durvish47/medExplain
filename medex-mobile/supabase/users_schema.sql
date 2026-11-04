-- Schema for signup and login using public.users table

-- 1. Create custom user_role enum if it does not already exist
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('patient', 'doctor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create public.users table
create table if not exists public.users (
  id serial not null,
  email character varying(100) not null,
  password_hash character varying(255) null,
  role public.user_role not null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email)
) TABLESPACE pg_default;

-- 3. Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- 4. Policies for public / anonymous client access via Supabase Client
-- Allows registering new users
create policy "Allow insert for new users" on public.users
  for insert with check (true);

-- Allows looking up user by email for login verification
create policy "Allow select for login verification" on public.users
  for select using (true);

-- Allows updating user role or details
create policy "Allow update of users" on public.users
  for update using (true);
