-- Documentation items: a flat, manually ordered list of links, commands and notes per project.
-- Same sync contract as tasks: last write wins on `updated_at`, `synced_at` is the pull cursor.

create table public.doc_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  project_id text not null,
  type text not null check (type in ('link', 'command', 'info')),
  content text not null,
  description text,
  "order" double precision not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create index doc_items_user_synced_at_idx on public.doc_items (user_id, synced_at);
create index doc_items_user_project_idx on public.doc_items (user_id, project_id);

create trigger doc_items_sync_guard
  before insert or update on public.doc_items
  for each row execute function public.shipyard_sync_guard();

alter table public.doc_items enable row level security;

create policy "Users manage their own doc items"
  on public.doc_items for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.doc_items to authenticated;

-- Realtime notifications so other devices pull changes immediately.
alter publication supabase_realtime add table public.doc_items;
