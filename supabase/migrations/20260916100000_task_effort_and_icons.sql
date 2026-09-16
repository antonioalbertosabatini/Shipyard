-- Optional t-shirt-size effort on tasks and an optional icon on projects and tasks.
-- `icon` has no check constraint on purpose: the curated set grows client-side and an unknown
-- key must never reject a row coming from a newer client (it simply renders no icon).

alter table public.projects add column icon text;

alter table public.tasks add column icon text;
alter table public.tasks add column effort text
  check (effort is null or effort in ('xs', 's', 'm', 'l', 'xl'));
