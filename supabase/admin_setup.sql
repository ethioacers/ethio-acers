-- ========== EthioAcers admin panel — run in Supabase SQL Editor ==========
-- Adds is_admin / is_pro, profile email for admin user list, notes table, RLS for admins.
-- After running: set yourself admin (replace YOUR_USER_UUID):
--   update public.profiles set is_admin = true where id = 'YOUR_USER_UUID';
-- Backfill emails from auth (run as postgres / dashboard):
--   update public.profiles p set email = u.email from auth.users u where p.id = u.id;

-- ---- Profiles: email, pro, admin ----
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists is_pro boolean not null default false;
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Keep new signups in sync (email + name)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- ---- Notes table ----
create table if not exists public.notes (
  id serial primary key,
  subject_id int not null references public.subjects(id),
  grade int not null check (grade between 9 and 12),
  topic text not null,
  unit text,
  content text,
  file_url text,
  is_ai_generated boolean not null default false,
  created_at timestamptz default now()
);

alter table public.notes enable row level security;

-- ---- is_admin() — security definer so it can read profiles ----
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- ---- Block removing own admin flag (DB + app) ----
create or replace function public.prevent_self_admin_revoke()
returns trigger as $$
begin
  if tg_op = 'UPDATE'
     and old.is_admin is true
     and coalesce(new.is_admin, false) is false
     and new.id = auth.uid()
  then
    raise exception 'Cannot remove your own admin status';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_prevent_self_admin_revoke on public.profiles;
create trigger profiles_prevent_self_admin_revoke
  before update on public.profiles
  for each row execute function public.prevent_self_admin_revoke();

-- ---- Profiles RLS ----
alter table public.profiles enable row level security;

drop policy if exists "Own profile only" on public.profiles;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- ---- Subjects ----
drop policy if exists "Authenticated read subjects" on public.subjects;
drop policy if exists "subjects_select" on public.subjects;
drop policy if exists "subjects_admin_insert" on public.subjects;
drop policy if exists "subjects_admin_update" on public.subjects;
drop policy if exists "subjects_admin_delete" on public.subjects;

create policy "subjects_select" on public.subjects
  for select using (auth.role() = 'authenticated');

create policy "subjects_admin_insert" on public.subjects
  for insert with check (public.is_admin());

create policy "subjects_admin_update" on public.subjects
  for update using (public.is_admin()) with check (public.is_admin());

create policy "subjects_admin_delete" on public.subjects
  for delete using (public.is_admin());

-- ---- Questions ----
drop policy if exists "Authenticated read" on public.questions;
drop policy if exists "questions_select" on public.questions;
drop policy if exists "questions_admin_insert" on public.questions;
drop policy if exists "questions_admin_update" on public.questions;
drop policy if exists "questions_admin_delete" on public.questions;

create policy "questions_select" on public.questions
  for select using (auth.role() = 'authenticated');

create policy "questions_admin_insert" on public.questions
  for insert with check (public.is_admin());

create policy "questions_admin_update" on public.questions
  for update using (public.is_admin()) with check (public.is_admin());

create policy "questions_admin_delete" on public.questions
  for delete using (public.is_admin());

-- ---- Sessions (admin stats) ----
drop policy if exists "sessions_admin_select" on public.sessions;
create policy "sessions_admin_select" on public.sessions
  for select using (public.is_admin());

-- ---- Weekly exams ----
drop policy if exists "Authenticated read weekly exams" on public.weekly_exams;
drop policy if exists "weekly_exams_select" on public.weekly_exams;
drop policy if exists "weekly_exams_admin_insert" on public.weekly_exams;
drop policy if exists "weekly_exams_admin_update" on public.weekly_exams;
drop policy if exists "weekly_exams_admin_delete" on public.weekly_exams;

create policy "weekly_exams_select" on public.weekly_exams
  for select using (auth.role() = 'authenticated');

create policy "weekly_exams_admin_insert" on public.weekly_exams
  for insert with check (public.is_admin());

create policy "weekly_exams_admin_update" on public.weekly_exams
  for update using (public.is_admin()) with check (public.is_admin());

create policy "weekly_exams_admin_delete" on public.weekly_exams
  for delete using (public.is_admin());

drop policy if exists "Authenticated read weekly exam questions" on public.weekly_exam_questions;
drop policy if exists "weekly_exam_questions_select" on public.weekly_exam_questions;
drop policy if exists "weekly_exam_questions_admin_insert" on public.weekly_exam_questions;
drop policy if exists "weekly_exam_questions_admin_update" on public.weekly_exam_questions;
drop policy if exists "weekly_exam_questions_admin_delete" on public.weekly_exam_questions;

create policy "weekly_exam_questions_select" on public.weekly_exam_questions
  for select using (auth.role() = 'authenticated');

create policy "weekly_exam_questions_admin_insert" on public.weekly_exam_questions
  for insert with check (public.is_admin());

create policy "weekly_exam_questions_admin_update" on public.weekly_exam_questions
  for update using (public.is_admin()) with check (public.is_admin());

create policy "weekly_exam_questions_admin_delete" on public.weekly_exam_questions
  for delete using (public.is_admin());

-- ---- Notes policies ----
drop policy if exists "notes_select" on public.notes;
drop policy if exists "notes_insert" on public.notes;
drop policy if exists "notes_update" on public.notes;
drop policy if exists "notes_delete" on public.notes;

create policy "notes_select" on public.notes
  for select using (auth.role() = 'authenticated');

create policy "notes_insert" on public.notes
  for insert with check (auth.role() = 'authenticated');

create policy "notes_update" on public.notes
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "notes_delete" on public.notes
  for delete using (public.is_admin());
