create table if not exists roadmap_topics (
  id serial primary key,
  subject_id int references subjects,
  grade int check (grade between 9 and 12),
  unit text not null,
  topic text not null,
  day_number int not null,
  topic_order int default 0,
  estimated_minutes int default 15,
  created_at timestamptz default now()
);

create table if not exists roadmap_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles,
  topic_id int references roadmap_topics,
  status text check (status in ('fully_understand', 'medium', 'needs_attention')),
  score int,
  total int,
  completed_at timestamptz default now(),
  unique (user_id, topic_id)
);

alter table roadmap_topics enable row level security;
drop policy if exists "Authenticated read roadmap" on roadmap_topics;
create policy "Authenticated read roadmap" on roadmap_topics
  for select using (auth.role() = 'authenticated');

alter table roadmap_progress enable row level security;
drop policy if exists "Own roadmap progress" on roadmap_progress;
create policy "Own roadmap progress" on roadmap_progress
  for all using (auth.uid() = user_id);
