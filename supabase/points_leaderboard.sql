-- Points, history, and leaderboard — run in Supabase SQL Editor after admin_setup.sql (needs public.is_admin).

-- ---- Profiles: points columns ----
alter table public.profiles
  add column if not exists total_points int not null default 0,
  add column if not exists weekly_points int not null default 0,
  add column if not exists weekly_points_reset date default current_date;

-- ---- Points history ----
create table if not exists public.points_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  points int not null,
  reason text,
  created_at timestamptz default now()
);

create index if not exists points_history_user_created_idx
  on public.points_history (user_id, created_at desc);

alter table public.points_history enable row level security;

drop policy if exists "Own points history" on public.points_history;
drop policy if exists "points_history_insert_own" on public.points_history;
drop policy if exists "points_history_select_own" on public.points_history;
drop policy if exists "Admin read points" on public.points_history;
drop policy if exists "points_history_admin_read" on public.points_history;

create policy "points_history_insert_own" on public.points_history
  for insert with check (auth.uid() = user_id);

create policy "points_history_select_own" on public.points_history
  for select using (auth.uid() = user_id);

create policy "points_history_admin_read" on public.points_history
  for select using (public.is_admin());

-- ---- Leaderboard & summary (safe columns; bypasses restrictive profile RLS) ----

create or replace function public.leaderboard_top(p_weekly boolean default false)
returns table (
  rank bigint,
  user_id uuid,
  student_name text,
  grade int,
  points int,
  streak int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (
      order by
        case when p_weekly then coalesce(p.weekly_points, 0) else coalesce(p.total_points, 0) end desc,
        p.id
    )::bigint as rank,
    p.id as user_id,
    coalesce(p.full_name, 'Student') as student_name,
    p.grade as grade,
    case when p_weekly
      then coalesce(p.weekly_points, 0)
      else coalesce(p.total_points, 0)
    end::int as points,
    coalesce(p.current_streak, 0)::int as streak
  from public.profiles p
  order by
    case when p_weekly then coalesce(p.weekly_points, 0) else coalesce(p.total_points, 0) end desc,
    p.id
  limit 50;
$$;

create or replace function public.my_points_summary()
returns table (
  total_points int,
  weekly_points int,
  rank_all bigint,
  rank_weekly bigint,
  streak int
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked_total as (
    select
      id,
      rank() over (order by coalesce(total_points, 0) desc, id) as rnk
    from public.profiles
  ),
  ranked_weekly as (
    select
      id,
      rank() over (order by coalesce(weekly_points, 0) desc, id) as rnk
    from public.profiles
  )
  select
    coalesce(p.total_points, 0)::int,
    coalesce(p.weekly_points, 0)::int,
    coalesce((select rnk from ranked_total where id = auth.uid()), 1::bigint),
    coalesce((select rnk from ranked_weekly where id = auth.uid()), 1::bigint),
    coalesce(p.current_streak, 0)::int
  from public.profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.leaderboard_top(boolean) to authenticated;
grant execute on function public.my_points_summary() to authenticated;
