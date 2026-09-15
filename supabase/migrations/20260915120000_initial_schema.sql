-- Shipyard cloud schema.
-- Clients keep a local IndexedDB copy and sync it here with last-write-wins on `updated_at`.
-- `synced_at` is assigned by the server and used as the pull cursor, so client clocks never hide changes.
-- Run with the Supabase CLI (`supabase db push`) or paste into the dashboard SQL Editor.

create table public.projects (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  description text,
  color text not null,
  repo_url text,
  live_url text,
  archived boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table public.tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  project_id text not null,
  title text not null,
  description text,
  type text not null check (type in ('feature', 'bugfix', 'improvement', 'chore', 'other')),
  status text not null check (status in ('backlog', 'todo', 'in_progress', 'done')),
  priority text not null check (priority in ('low', 'medium', 'high', 'critical')),
  due_date date,
  "order" double precision not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create index projects_user_synced_at_idx on public.projects (user_id, synced_at);
create index tasks_user_synced_at_idx on public.tasks (user_id, synced_at);
create index tasks_user_project_idx on public.tasks (user_id, project_id);

-- Last write wins: an update that is not newer than the stored row is silently skipped.
create function public.shipyard_sync_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at <= old.updated_at then
      return null;
    end if;
    new.user_id := old.user_id;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

create trigger projects_sync_guard
  before insert or update on public.projects
  for each row execute function public.shipyard_sync_guard();

create trigger tasks_sync_guard
  before insert or update on public.tasks
  for each row execute function public.shipyard_sync_guard();

-- Row Level Security: every user only sees and writes their own rows.
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

create policy "Users manage their own projects"
  on public.projects for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own tasks"
  on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.projects, public.tasks to authenticated;

-- Realtime notifications so other devices pull changes immediately.
alter publication supabase_realtime add table public.projects, public.tasks;
