-- Run this in Supabase SQL editor (Dashboard → SQL Editor).

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users primary key,
  full_name text,
  grade int check (grade between 9 and 12),
  current_streak int default 0,
  last_session_date date,
  created_at timestamptz default now(),
  ai_requests_today int default 0,
  ai_last_reset date default current_date
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Subjects
create table if not exists subjects (
  id serial primary key,
  name text not null,
  grade int check (grade between 9 and 12)
);

-- Questions
create table if not exists questions (
  id serial primary key,
  subject_id int references subjects,
  grade int check (grade between 9 and 12),
  question_text text not null,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text check (correct_answer in ('A','B','C','D')),
  explanation text,
  year int
);

-- Sessions
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles,
  subject_id int references subjects,
  score int,
  total int,
  session_date date default current_date,
  created_at timestamptz default now()
);

-- Attempts
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles,
  question_id int references questions,
  selected_answer text,
  is_correct boolean,
  attempted_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
drop policy if exists "Own profile only" on public.profiles;
create policy "Own profile only" on public.profiles
  for all using (auth.uid() = id);

alter table subjects enable row level security;
drop policy if exists "Authenticated read subjects" on subjects;
create policy "Authenticated read subjects" on subjects
  for select using (auth.role() = 'authenticated');

alter table questions enable row level security;
drop policy if exists "Authenticated read" on questions;
create policy "Authenticated read" on questions
  for select using (auth.role() = 'authenticated');

alter table sessions enable row level security;
drop policy if exists "Own sessions" on sessions;
create policy "Own sessions" on sessions
  for all using (auth.uid() = user_id);

alter table attempts enable row level security;
drop policy if exists "Own attempts" on attempts;
create policy "Own attempts" on attempts
  for all using (auth.uid() = user_id);

-- AI tutor: daily limit tracking (run on existing DBs)
alter table public.profiles add column if not exists ai_requests_today int default 0;
alter table public.profiles add column if not exists ai_last_reset date default current_date;

-- Profile: school name (run in Supabase SQL Editor)
alter table public.profiles add column if not exists school_name text;
